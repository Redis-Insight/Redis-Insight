import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConnectionType, HostingProvider } from 'src/modules/database/entities/database.entity';
import { catchRedisConnectionError, getHostingProvider } from 'src/utils';
import { Database } from 'src/modules/database/models/database';
import { ClientContext, SessionMetadata } from 'src/common/models';
import ERROR_MESSAGES from 'src/constants/error-messages';
import { DatabaseInfoProvider } from 'src/modules/database/providers/database-info.provider';
import { RedisErrorCodes } from 'src/constants';
import { CaCertificateService } from 'src/modules/certificate/ca-certificate.service';
import { ClientCertificateService } from 'src/modules/certificate/client-certificate.service';
import { RedisClientFactory } from 'src/modules/redis/redis.client.factory';
import {
  discoverClusterNodes, discoverSentinelMasterGroups, isCluster, isSentinel,
} from 'src/modules/redis/utils';
import { RedisClient } from 'src/modules/redis/client';

@Injectable()
export class DatabaseFactory {
  private readonly logger = new Logger('DatabaseFactory');

  constructor(
    private redisClientFactory: RedisClientFactory,
    private databaseInfoProvider: DatabaseInfoProvider,
    private caCertificateService: CaCertificateService,
    private clientCertificateService: ClientCertificateService,
  ) {}

  /**
   * Create model
   * @param database
   */
  async createDatabaseModel(sessionMetadata: SessionMetadata, database: Database): Promise<Database> {
    let model = await this.createStandaloneDatabaseModel(database);

    const client = await this.redisClientFactory.getConnectionStrategy().createStandaloneClient(
      {
        sessionMetadata,
        databaseId: database.id || 'new', // we assume that if no database id defined we are in creation process
        context: ClientContext.Common,
      },
      database,
      { useRetry: true },
    );

    if (!HostingProvider[model.provider]) {
      model.provider = await getHostingProvider(client, model.host);
    }

    if (await isSentinel(client)) {
      if (!database.sentinelMaster) {
        throw new Error(RedisErrorCodes.SentinelParamsRequired);
      }
      model = await this.createSentinelDatabaseModel(sessionMetadata, database, client);
    } else if (await isCluster(client)) {
      model = await this.createClusterDatabaseModel(sessionMetadata, database, client);
    }

    model.modules = await this.databaseInfoProvider.determineDatabaseModules(client);
    model.version = await this.databaseInfoProvider.determineDatabaseServer(client);
    model.lastConnection = new Date();

    await client.disconnect();

    return model;
  }

  /**
   * Determines provider and creates or fetches certificates
   * Creates database model for standalone connection type
   * This method is a parent one for other databases types (CLUSTER, SENTINEL)
   * @param database
   * @private
   */
  async createStandaloneDatabaseModel(database: Database): Promise<Database> {
    const model = database;

    model.connectionType = ConnectionType.STANDALONE;

    // fetch ca cert if needed to be able to connect
    if (model.caCert?.id) {
      model.caCert = await this.caCertificateService.get(model.caCert?.id);
    }

    // fetch client cert if needed to be able to connect
    if (model.clientCert?.id) {
      model.clientCert = await this.clientCertificateService.get(model.clientCert?.id);
    }

    return model;
  }

  /**
   * Fetches cluster nodes
   * Creates cluster client to validate connection. Disconnect after check
   * Creates database model for cluster connection type
   * @param database
   * @param client
   * @private
   */
  async createClusterDatabaseModel(
    sessionMetadata: SessionMetadata,
    database: Database,
    client: RedisClient,
  ): Promise<Database> {
    try {
      const model = database;

      model.nodes = await discoverClusterNodes(client);

      const clusterClient = await this.redisClientFactory.getConnectionStrategy().createClusterClient(
        {
          sessionMetadata,
          databaseId: model.id || 'new', // we assume that if no database id defined we are in creation process
          context: ClientContext.Common,
        },
        model,
        { useRetry: true },
      );

      model.connectionType = ConnectionType.CLUSTER;

      await clusterClient.disconnect();

      return model;
    } catch (error) {
      this.logger.error('Failed to add oss cluster.', error);
      throw catchRedisConnectionError(error, database);
    }
  }

  /**
   * Fetches sentinel masters and align with defined one
   * Creates sentinel client to validate connection. Disconnect after check
   * Creates database model for cluster connection type
   * @param database
   * @param client
   * @private
   */
  async createSentinelDatabaseModel(
    sessionMetadata: SessionMetadata,
    database: Database,
    client: RedisClient,
  ): Promise<Database> {
    try {
      const model = database;
      const masterGroups = await discoverSentinelMasterGroups(client);
      const selectedMaster = masterGroups.find(
        (master) => master.name === model.sentinelMaster.name,
      );

      if (!selectedMaster) {
        return Promise.reject(
          new NotFoundException(ERROR_MESSAGES.MASTER_GROUP_NOT_EXIST),
        );
      }

      const sentinelClient = await this.redisClientFactory.getConnectionStrategy().createSentinelClient(
        {
          sessionMetadata,
          databaseId: model.id || 'new', // we assume that if no database id defined we are in creation process
          context: ClientContext.Common,
        },
        model,
        { useRetry: true },
      );

      model.connectionType = ConnectionType.SENTINEL;
      model.nodes = selectedMaster.nodes;
      await sentinelClient.disconnect();

      return model;
    } catch (error) {
      this.logger.error('Failed to create database sentinel model.', error);
      throw catchRedisConnectionError(error, database);
    }
  }
}
