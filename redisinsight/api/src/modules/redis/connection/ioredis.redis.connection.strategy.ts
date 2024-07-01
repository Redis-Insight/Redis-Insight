import { RedisConnectionStrategy } from 'src/modules/redis/connection/redis.connection.strategy';
import serverConfig from 'src/utils/config';
import { InternalServerErrorException } from '@nestjs/common';
import { ClientMetadata } from 'src/common/models';
import { Database } from 'src/modules/database/models/database';
import Redis, { Cluster, RedisOptions } from 'ioredis';
import { isEmpty, isNumber } from 'lodash';
import { IRedisConnectionOptions } from 'src/modules/redis/redis.client.factory';
import { ClusterOptions } from 'ioredis/built/cluster/ClusterOptions';
import { ConnectionOptions } from 'tls';
import ERROR_MESSAGES from 'src/constants/error-messages';
import {
  RedisClient,
  StandaloneIoredisClient,
  SentinelIoredisClient,
  ClusterIoredisClient,
} from 'src/modules/redis/client';
import { discoverClusterNodes } from 'src/modules/redis/utils';
import { SshTunnel } from 'src/modules/ssh/models/ssh-tunnel';

const REDIS_CLIENTS_CONFIG = serverConfig.get('redis_clients');

export class IoredisRedisConnectionStrategy extends RedisConnectionStrategy {
  // common retry strategy
  private retryStrategy = (times: number): number => {
    if (times < REDIS_CLIENTS_CONFIG.retryTimes) {
      return Math.min(times * REDIS_CLIENTS_CONFIG.retryDelay, 2000);
    }
    return undefined;
  };

  // disable function such as retry or checkIdentity
  private dummyFn = () => undefined;

  /**
   * Normalize data to be compatible with used redis connection library
   * @param clientMetadata
   * @param database
   * @param options
   * @private
   */
  private async getRedisOptions(
    clientMetadata: ClientMetadata,
    database: Database,
    options: IRedisConnectionOptions,
  ): Promise<RedisOptions> {
    const {
      host, port, password, username, tls, db, timeout,
    } = database;
    const redisOptions: RedisOptions = {
      host,
      port,
      username,
      password,
      connectTimeout: timeout,
      db: isNumber(clientMetadata.db) ? clientMetadata.db : db,
      connectionName: options?.connectionName
        || RedisConnectionStrategy.generateRedisConnectionName(clientMetadata),
      showFriendlyErrorStack: true,
      maxRetriesPerRequest: REDIS_CLIENTS_CONFIG.maxRetriesPerRequest,
      retryStrategy: options?.useRetry ? this.retryStrategy.bind(this) : this.dummyFn.bind(this),
    };

    if (tls) {
      redisOptions.tls = await this.getTLSConfig(database);
    }

    return redisOptions;
  }

  /**
   * Normalize data to be compatible with redis library cluster connection options
   * @param clientMetadata
   * @param database
   * @param options
   * @private
   */
  private async getRedisClusterOptions(
    clientMetadata: ClientMetadata,
    database: Database,
    options: IRedisConnectionOptions,
  ): Promise<ClusterOptions> {
    return {
      clusterRetryStrategy: options.useRetry ? this.retryStrategy.bind(this) : this.dummyFn.bind(this),
      redisOptions: await this.getRedisOptions(clientMetadata, database, options),
    };
  }

  /**
   * Normalize data to be compatible with redis library sentinel connection options
   * @param clientMetadata
   * @param database
   * @param options
   * @private
   */
  private async getRedisSentinelOptions(
    clientMetadata: ClientMetadata,
    database: Database,
    options: IRedisConnectionOptions,
  ): Promise<RedisOptions> {
    const { sentinelMaster } = database;

    const baseOptions = await this.getRedisOptions(clientMetadata, database, options);
    return {
      ...baseOptions,
      host: undefined,
      port: undefined,
      sentinels: [{ host: database.host, port: database.port, ...(database.nodes || []) }],
      name: sentinelMaster?.name,
      sentinelUsername: database.username,
      sentinelPassword: database.password,
      username: sentinelMaster?.username,
      password: sentinelMaster?.password,
      sentinelTLS: baseOptions.tls,
      enableTLSForSentinelMode: !!baseOptions.tls, // previously was always `true` for tls connections
      sentinelRetryStrategy: options?.useRetry ? this.retryStrategy : this.dummyFn,
    };
  }

  /**
   * Normalize tls settings to be compatible with user redis connection library
   * @param database
   * @private
   */
  private async getTLSConfig(database: Database): Promise<ConnectionOptions> {
    let config: ConnectionOptions;
    config = {
      rejectUnauthorized: database.verifyServerCert,
      checkServerIdentity: this.dummyFn,
      servername: database.tlsServername || undefined,
    };
    if (database.caCert) {
      config = {
        ...config,
        ca: [database.caCert.certificate],
      };
    }
    if (database.clientCert) {
      config = {
        ...config,
        cert: database.clientCert.certificate,
        key: database.clientCert.key,
      };
    }

    return config;
  }

  /**
   * @inheritDoc
   */
  public async createStandaloneClient(
    clientMetadata: ClientMetadata,
    database: Database,
    options: IRedisConnectionOptions,
  ): Promise<RedisClient> {
    this.logger.debug('Creating ioredis standalone client');

    // Additional validation
    ClientMetadata.validate(clientMetadata);

    let tnl: SshTunnel;

    try {
      const config = await this.getRedisOptions(clientMetadata, database, options);

      if (database.ssh) {
        tnl = await this.sshTunnelProvider.createTunnel(database, database.sshOptions);
        config.host = tnl.serverAddress.host;
        config.port = tnl.serverAddress.port;
      }

      return await new Promise((resolve, reject) => {
        try {
          const connection = new Redis({
            ...config,
            // cover cases when we are connecting to sentinel as to standalone to discover master groups
            db: config.db > 0 && !database.sentinelMaster ? config.db : 0,
          });
          connection.on('error', (e): void => {
            this.logger.error('Failed connection to the redis database.', e);
            reject(e);
          });
          connection.on('end', (): void => {
            this.logger.warn(ERROR_MESSAGES.SERVER_CLOSED_CONNECTION);
            tnl?.close?.();
            reject(new InternalServerErrorException(ERROR_MESSAGES.SERVER_CLOSED_CONNECTION));
          });
          connection.on('ready', (): void => {
            this.logger.log('Successfully connected to the redis database');
            resolve(new StandaloneIoredisClient(
              clientMetadata,
              connection,
              {
                host: database.host,
                port: database.port,
              },
            ));
          });
          connection.on('reconnecting', (): void => {
            this.logger.log('Reconnecting to the redis database');
          });
        } catch (e) {
          reject(e);
        }
      });
    } catch (e) {
      tnl?.close?.();
      throw e;
    }
  }

  /**
   * @inheritDoc
   */
  public async createClusterClient(
    clientMetadata: ClientMetadata,
    database: Database,
    options: IRedisConnectionOptions,
  ): Promise<RedisClient> {
    // Additional validation
    ClientMetadata.validate(clientMetadata);

    let tnls: SshTunnel[] = [];
    let standaloneClient: RedisClient;
    let rootNodes = [{
      host: database.host,
      port: database.port,
    }];

    try {
      const config = await this.getRedisClusterOptions(clientMetadata, database, options);

      standaloneClient = await this.createStandaloneClient(clientMetadata, database, options);

      rootNodes = await discoverClusterNodes(standaloneClient);

      await standaloneClient.disconnect();

      if (database.ssh) {
        tnls = await Promise.all(
          rootNodes.map((node) => this.sshTunnelProvider.createTunnel(node, database.sshOptions)),
        );

        // create NAT map
        config.natMap = {};
        tnls.forEach((tnl) => {
          config.natMap[`${tnl.options.targetHost}:${tnl.options.targetPort}`] = {
            host: tnl.serverAddress.host,
            port: tnl.serverAddress.port,
          };
        });

        // change root nodes
        rootNodes = tnls.map((tnl) => tnl.serverAddress);
      }

      return new Promise((resolve, reject) => {
        try {
          const cluster = new Cluster(rootNodes, config);
          cluster.on('error', (e): void => {
            this.logger.error('Failed connection to the redis oss cluster', e);
            reject(!isEmpty(e.lastNodeError) ? e.lastNodeError : e);
          });
          cluster.on('end', (): void => {
            this.logger.warn(ERROR_MESSAGES.SERVER_CLOSED_CONNECTION);
            tnls.forEach((tnl) => tnl?.close?.());
            reject(new InternalServerErrorException(ERROR_MESSAGES.SERVER_CLOSED_CONNECTION));
          });
          cluster.on('ready', (): void => {
            this.logger.log('Successfully connected to the redis oss cluster.');
            resolve(new ClusterIoredisClient(
              clientMetadata,
              cluster,
              {
                host: database.host,
                port: database.port,
              },
            ));
          });
        } catch (e) {
          reject(e);
        }
      });
    } catch (e) {
      tnls.forEach((tnl) => tnl?.close?.());
      standaloneClient?.disconnect?.().catch();
      throw e;
    }
  }

  /**
   * @inheritDoc
   */
  public async createSentinelClient(
    clientMetadata: ClientMetadata,
    database: Database,
    options: IRedisConnectionOptions,
  ): Promise<RedisClient> {
    // Additional validation
    ClientMetadata.validate(clientMetadata);

    const config = await this.getRedisSentinelOptions(clientMetadata, database, options);

    return new Promise((resolve, reject) => {
      try {
        const client = new Redis(config);
        client.on('error', (e): void => {
          this.logger.error('Failed connection to the redis oss sentinel', e);
          reject(e);
        });
        client.on('end', (): void => {
          this.logger.error(ERROR_MESSAGES.SERVER_CLOSED_CONNECTION);
          reject(new InternalServerErrorException(ERROR_MESSAGES.SERVER_CLOSED_CONNECTION));
        });
        client.on('ready', (): void => {
          this.logger.log('Successfully connected to the redis oss sentinel.');
          resolve(new SentinelIoredisClient(
            clientMetadata,
            client,
            {
              host: database.host,
              port: database.port,
            },
          ));
        });
      } catch (e) {
        reject(e);
      }
    });
  }
}
