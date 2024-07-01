import { RedisConnectionStrategy } from 'src/modules/redis/connection/redis.connection.strategy';
import serverConfig from 'src/utils/config';
import { ClientMetadata, Endpoint } from 'src/common/models';
import { Database } from 'src/modules/database/models/database';
import {
  RedisClientOptions, createClient, createCluster, RedisClusterOptions,
} from 'redis';
import { isNumber } from 'lodash';
import { IRedisConnectionOptions } from 'src/modules/redis/redis.client.factory';
import { ConnectionOptions } from 'tls';
import { ClusterNodeRedisClient, RedisClient } from 'src/modules/redis/client';
import { StandaloneNodeRedisClient } from 'src/modules/redis/client/node-redis/standalone.node-redis.client';
import { SshTunnel } from 'src/modules/ssh/models/ssh-tunnel';
import { discoverClusterNodes } from 'src/modules/redis/utils';

const REDIS_CLIENTS_CONFIG = serverConfig.get('redis_clients');

export class NodeRedisConnectionStrategy extends RedisConnectionStrategy {
  // common retry strategy
  private retryStrategy = (times: number): number | boolean => {
    if (times < REDIS_CLIENTS_CONFIG.retryTimes) {
      return Math.min(times * REDIS_CLIENTS_CONFIG.retryDelay, 2000);
    }

    return false;
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
  ): Promise<RedisClientOptions> {
    const {
      host, port, password, username, tls, db, timeout,
    } = database;

    let tlsOptions = { };
    if (tls) {
      tlsOptions = {
        tls: true,
        ...await this.getTLSConfig(database),
      };
    }

    return {
      socket: {
        host,
        port,
        connectTimeout: timeout,
        ...tlsOptions,
        reconnectStrategy: options?.useRetry ? this.retryStrategy.bind(this) : false,
      },
      username,
      password,
      database: isNumber(clientMetadata.db) ? clientMetadata.db : db,
      name: options?.connectionName
        || RedisConnectionStrategy.generateRedisConnectionName(clientMetadata),
      // maxRetriesPerRequest: REDIS_CLIENTS_CONFIG.maxRetriesPerRequest,
    };
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
  ): Promise<RedisClusterOptions> {
    const config = await this.getRedisOptions(clientMetadata, database, options);

    return {
      rootNodes: [{
        socket: {
          host: database.host,
          port: database.port,
        },
      }],
      // TODO: node-redis issue
      // create a bug. reconnectStrategy has no effect (both in defaults.socket or rootNodes[].socket)
      defaults: { ...config },
      maxCommandRedirections: database.nodes ? (database.nodes.length * 16) : 16, // TODO: Temporary solution
    };
  }

  // /**
  //  * Normalize data to be compatible with redis library sentinel connection options
  //  * @param clientMetadata
  //  * @param database
  //  * @param options
  //  * @private
  //  */
  // private async getRedisSentinelOptions(
  //   clientMetadata: ClientMetadata,
  //   database: Database,
  //   options: IRedisConnectionOptions,
  // ): Promise<RedisOptions> {
  //   const { sentinelMaster } = database;
  //
  //   const baseOptions = await this.getRedisOptions(clientMetadata, database, options);
  //   return {
  //     ...baseOptions,
  //     host: undefined,
  //     port: undefined,
  //     sentinels: database.nodes?.length ? database.nodes : [{ host: database.host, port: database.port }],
  //     name: sentinelMaster?.name,
  //     sentinelUsername: database.username,
  //     sentinelPassword: database.password,
  //     username: sentinelMaster?.username,
  //     password: sentinelMaster?.password,
  //     sentinelTLS: baseOptions.tls,
  //     enableTLSForSentinelMode: !!baseOptions.tls, // previously was always `true` for tls connections
  //     sentinelRetryStrategy: options?.useRetry ? this.retryStrategy : this.dummyFn,
  //   };
  // }

  /**
   * Normalize tls settings to be compatible with user redis connection library
   * @param database
   * @private
   */
  private async getTLSConfig(database: Database): Promise<ConnectionOptions> {
    let config: ConnectionOptions;
    config = {
      rejectUnauthorized: database.verifyServerCert,
      checkServerIdentity: this.dummyFn.bind(this),
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
    this.logger.debug('Creating node-redis standalone client');

    // Additional validation
    ClientMetadata.validate(clientMetadata);

    let tnl: SshTunnel;

    try {
      const config = await this.getRedisOptions(clientMetadata, database, options);

      if (database.ssh) {
        tnl = await this.sshTunnelProvider.createTunnel(database, database.sshOptions);
        config.socket = {
          ...config.socket,
          host: tnl.serverAddress.host,
          port: tnl.serverAddress.port,
        };
      }

      const client = await createClient({
        ...config,
        // cover cases when we are connecting to sentinel as to standalone to discover master groups
        database: config.database > 0 && !database.sentinelMaster ? config.database : 0,
      })
        .on('error', (e): void => {
          this.logger.error('Failed to connect to the redis database.', e);
        })
        .on('end', () => {
          tnl?.close?.();
        })
        .connect();

      return new StandaloneNodeRedisClient(
        clientMetadata,
        client,
        {
          host: database.host,
          port: database.port,
          connectTimeout: database.timeout,
        },
      );
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

    try {
      const config = await this.getRedisClusterOptions(clientMetadata, database, options);

      standaloneClient = await this.createStandaloneClient(clientMetadata, database, options);

      config.rootNodes = (await discoverClusterNodes(standaloneClient)).map((rootNode) => ({
        socket: rootNode,
      }));

      await standaloneClient.disconnect();

      if (database.ssh) {
        tnls = await Promise.all(
          config.rootNodes.map((node) => this.sshTunnelProvider.createTunnel(
            node.socket as Endpoint,
            database.sshOptions,
          )),
        );

        // create NAT map
        config.nodeAddressMap = {};
        tnls.forEach((tnl) => {
          config.nodeAddressMap[`${tnl.options.targetHost}:${tnl.options.targetPort}`] = {
            host: tnl.serverAddress.host,
            port: tnl.serverAddress.port,
          };
        });

        // change root nodes
        config.rootNodes = tnls.map((tnl) => ({ socket: tnl.serverAddress }));
      }

      const client = createCluster(config);
      client.on('error', (e): void => {
        this.logger.error('Failed connection to the redis oss cluster', e);
      });
      // TODO: node-redis issue
      // currently is not supported. https://github.com/redis/node-redis/issues/1855
      // client.on('end', (): void => {
      //   this.logger.warn(ERROR_MESSAGES.SERVER_CLOSED_CONNECTION);
      // });

      // TODO: node-redis issue
      // connect() doesn't return the client instance
      await client.connect();

      return new ClusterNodeRedisClient(
        clientMetadata,
        client,
        {
          host: database.host,
          port: database.port,
          connectTimeout: database.timeout,
        },
      );
    } catch (e) {
      tnls?.forEach((tnl) => tnl?.close?.());
      // TODO: node-redis issue
      // Comment until resolved unhandled error during disconnection
      // standaloneClient?.disconnect().catch();
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

    // const config = await this.getRedisSentinelOptions(clientMetadata, database, options);

    throw new Error('TDB sentinel client');
    // return new Promise((resolve, reject) => {
    //   try {
    //     const client = new Redis(config);
    //     client.on('error', (e): void => {
    //       this.logger.error('Failed connection to the redis oss sentinel', e);
    //       reject(e);
    //     });
    //     client.on('end', (): void => {
    //       this.logger.error(ERROR_MESSAGES.SERVER_CLOSED_CONNECTION);
    //       reject(new InternalServerErrorException(ERROR_MESSAGES.SERVER_CLOSED_CONNECTION));
    //     });
    //     client.on('ready', (): void => {
    //       this.logger.log('Successfully connected to the redis oss sentinel.');
    //       resolve(new IoredisClient(clientMetadata, client));
    //     });
    //   } catch (e) {
    //     reject(e);
    //   }
    // });
  }
}
