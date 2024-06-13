import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger, NotFoundException,
} from '@nestjs/common';
import axios from 'axios';
import * as https from 'https';
import ERROR_MESSAGES from 'src/constants/error-messages';
import {
  IRedisEnterpriseDatabase,
  IRedisEnterpriseEndpoint,
  IRedisEnterpriseModule,
  IRedisEnterpriseReplicaSource,
  RedisEnterpriseDatabaseAofPolicy,
  RedisEnterpriseDatabasePersistence,
  RedisEnterprisePersistencePolicy,
} from 'src/modules/redis-enterprise/models/redis-enterprise-database';
import {
  ClusterConnectionDetailsDto,
  RedisEnterpriseDatabase,
} from 'src/modules/redis-enterprise/dto/cluster.dto';
import { convertREClusterModuleName } from 'src/modules/redis-enterprise/utils/redis-enterprise-converter';
import { RedisEnterpriseAnalytics } from 'src/modules/redis-enterprise/redis-enterprise.analytics';
import {
  AddRedisEnterpriseDatabaseResponse,
} from 'src/modules/redis-enterprise/dto/redis-enterprise-cluster.dto';
import { HostingProvider } from 'src/modules/database/entities/database.entity';
import { DatabaseService } from 'src/modules/database/database.service';
import { ActionStatus, SessionMetadata } from 'src/common/models';

@Injectable()
export class RedisEnterpriseService {
  private logger = new Logger('RedisEnterpriseBusinessService');

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly analytics: RedisEnterpriseAnalytics,
  ) {}

  // TODO: maybe find a workaround without Disabling certificate validation.
  private api = axios.create({
    httpsAgent: new https.Agent({
      rejectUnauthorized: false, // lgtm[js/disabling-certificate-validation]
    }),
  });

  async getDatabases(
    dto: ClusterConnectionDetailsDto,
  ): Promise<RedisEnterpriseDatabase[]> {
    this.logger.log('Getting RE cluster databases.');
    const {
      host, port, username, password,
    } = dto;
    const auth = { username, password };
    try {
      const { data } = await this.api.get(`https://${host}:${port}/v1/bdbs`, {
        auth,
      });
      this.logger.log('Succeed to get RE cluster databases.');
      const result = this.parseClusterDbsResponse(data);
      this.analytics.sendGetREClusterDbsSucceedEvent(result);
      return result;
    } catch (error) {
      const { response } = error;
      let exception;
      this.logger.error(`Failed to get RE cluster databases. ${error.message}`);
      if (response?.status === 401 || response?.status === 403) {
        exception = new ForbiddenException(
          ERROR_MESSAGES.INCORRECT_CREDENTIALS(`${host}:${port}`),
        );
      } else {
        exception = new BadRequestException(
          ERROR_MESSAGES.INCORRECT_DATABASE_URL(`${host}:${port}`),
        );
      }
      this.analytics.sendGetREClusterDbsFailedEvent(exception);
      throw exception;
    }
  }

  private parseClusterDbsResponse(
    databases: IRedisEnterpriseDatabase[],
  ): RedisEnterpriseDatabase[] {
    const result: RedisEnterpriseDatabase[] = [];
    databases.forEach((database) => {
      const {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        uid, name, crdt, tls_mode, crdt_replica_id,
      } = database;
      // Get all external endpoint, ignore others
      const externalEndpoint = this.getDatabaseExternalEndpoint(database);
      // Skip this database is there are no external endpoints
      if (!externalEndpoint) {
        return;
      }
      // For Active-Active (CRDT) databases, append the replica ID to the name
      // so the name doesn't clash when the other replicas are added.
      const dbName = crdt ? `${name}-${crdt_replica_id}` : name;
      const dnsName = externalEndpoint.dns_name;
      const address = externalEndpoint.addr[0];
      result.push(
        new RedisEnterpriseDatabase({
          uid,
          name: dbName,
          dnsName,
          address,
          port: externalEndpoint.port,
          password: database.authentication_redis_pass,
          status: database.status,
          tls: tls_mode === 'enabled',
          modules: database.module_list.map(
            (module: IRedisEnterpriseModule) => convertREClusterModuleName(module.module_name),
          ),
          options: {
            enabledDataPersistence:
              database.data_persistence
              !== RedisEnterpriseDatabasePersistence.Disabled,
            persistencePolicy: this.getDatabasePersistencePolicy(database),
            enabledRedisFlash: database.bigstore,
            enabledReplication: database.replication,
            enabledBackup: database.backup,
            enabledActiveActive: database.crdt,
            enabledClustering: database.shards_count > 1,
            isReplicaDestination: !!database?.replica_sources?.length,
            isReplicaSource: !!this.findReplicasForDatabase(databases, database)
              .length,
          },
        }),
      );
    });
    return result;
  }

  public getDatabaseExternalEndpoint(
    database: IRedisEnterpriseDatabase,
  ): IRedisEnterpriseEndpoint {
    return database.endpoints?.filter((endpoint: { addr_type: string }) => endpoint.addr_type === 'external')[0];
  }

  private getDatabasePersistencePolicy(
    database: IRedisEnterpriseDatabase,
  ): RedisEnterprisePersistencePolicy {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { data_persistence, aof_policy, snapshot_policy } = database;
    if (data_persistence === RedisEnterpriseDatabasePersistence.Aof) {
      return aof_policy === RedisEnterpriseDatabaseAofPolicy.AofEveryOneSecond
        ? RedisEnterprisePersistencePolicy.AofEveryOneSecond
        : RedisEnterprisePersistencePolicy.AofEveryWrite;
    }
    if (data_persistence === RedisEnterpriseDatabasePersistence.Snapshot) {
      const { secs } = snapshot_policy.pop();
      if (secs === 3600) {
        return RedisEnterprisePersistencePolicy.SnapshotEveryOneHour;
      }
      if (secs === 21600) {
        return RedisEnterprisePersistencePolicy.SnapshotEverySixHours;
      }
      if (secs === 43200) {
        return RedisEnterprisePersistencePolicy.SnapshotEveryTwelveHours;
      }
    }
    return RedisEnterprisePersistencePolicy.None;
  }

  private findReplicasForDatabase(
    databases: IRedisEnterpriseDatabase[],
    sourceDatabase: IRedisEnterpriseDatabase,
  ): IRedisEnterpriseDatabase[] {
    const sourceEndpoint = this.getDatabaseExternalEndpoint(sourceDatabase);
    if (!sourceEndpoint) {
      return [];
    }
    return databases.filter((replica: IRedisEnterpriseDatabase): boolean => {
      const replicaSources = replica.replica_sources;
      if (replica.uid === sourceDatabase.uid || !replicaSources?.length) {
        return false;
      }
      return replicaSources.some(
        (source: IRedisEnterpriseReplicaSource): boolean => source.uri.includes(
          `${sourceEndpoint.dns_name}:${sourceEndpoint.port}`,
        ),
      );
    });
  }

  public async addRedisEnterpriseDatabases(
    sessionMetadata: SessionMetadata,
    connectionDetails: ClusterConnectionDetailsDto,
    uids: number[],
  ): Promise<AddRedisEnterpriseDatabaseResponse[]> {
    this.logger.log('Adding Redis Enterprise databases.');
    let result: AddRedisEnterpriseDatabaseResponse[];
    try {
      const databases: RedisEnterpriseDatabase[] = await this.getDatabases(
        connectionDetails,
      );
      result = await Promise.all(
        uids.map(
          async (uid): Promise<AddRedisEnterpriseDatabaseResponse> => {
            const database = databases.find(
              (db: RedisEnterpriseDatabase) => db.uid === uid,
            );
            if (!database) {
              const exception = new NotFoundException();
              return {
                uid,
                status: ActionStatus.Fail,
                message: exception.message,
                error: exception?.getResponse(),
              };
            }
            try {
              const {
                port, name, dnsName, password,
              } = database;
              const host = connectionDetails.host === 'localhost' ? 'localhost' : dnsName;
              delete database.password;
              await this.databaseService.create(
                sessionMetadata,
                {
                  host,
                  port,
                  name,
                  nameFromProvider: name,
                  password,
                  provider: HostingProvider.RE_CLUSTER,
                },
              );
              return {
                uid,
                status: ActionStatus.Success,
                message: 'Added',
                databaseDetails: database,
              };
            } catch (error) {
              return {
                uid,
                status: ActionStatus.Fail,
                message: error.message,
                databaseDetails: database,
                error: error?.response,
              };
            }
          },
        ),
      );
    } catch (error) {
      this.logger.error('Failed to add Redis Enterprise databases', error);
      throw error;
    }
    return result;
  }
}
