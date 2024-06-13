import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { uniqBy } from 'lodash';
import ERROR_MESSAGES from 'src/constants/error-messages';
import {
  DiscoverCloudDatabasesDto,
  ImportCloudDatabaseDto,
  ImportCloudDatabaseResponse,
} from 'src/modules/cloud/autodiscovery/dto';
import { CloudAutodiscoveryAuthType } from 'src/modules/cloud/autodiscovery/models';
import { DatabaseService } from 'src/modules/database/database.service';
import { HostingProvider } from 'src/modules/database/entities/database.entity';
import { ActionStatus, SessionMetadata } from 'src/common/models';
import { CloudAutodiscoveryAnalytics } from 'src/modules/cloud/autodiscovery/cloud-autodiscovery.analytics';
import { CloudCapiAuthDto } from 'src/modules/cloud/common/dto';
import { CloudSubscriptionCapiService } from 'src/modules/cloud/subscription/cloud-subscription.capi.service';
import { wrapHttpError } from 'src/common/utils';
import { CloudUserCapiService } from 'src/modules/cloud/user/cloud-user.capi.service';
import { CloudDatabaseCapiService } from 'src/modules/cloud/database/cloud-database.capi.service';
import { CloudAccountInfo } from 'src/modules/cloud/user/models';
import { CloudSubscription, CloudSubscriptionType } from 'src/modules/cloud/subscription/models';
import { CloudDatabase, CloudDatabaseStatus } from 'src/modules/cloud/database/models';
import config from 'src/utils/config';

const cloudConfig = config.get('cloud');

@Injectable()
export class CloudAutodiscoveryService {
  private logger = new Logger('CloudAutodiscoveryService');

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cloudSubscriptionCapiService: CloudSubscriptionCapiService,
    private readonly cloudUserCapiService: CloudUserCapiService,
    private readonly cloudDatabaseCapiService: CloudDatabaseCapiService,
    private readonly analytics: CloudAutodiscoveryAnalytics,
  ) {}

  /**
   * Get cloud account short info
   * @param authDto
   */
  async getAccount(authDto: CloudCapiAuthDto): Promise<CloudAccountInfo> {
    try {
      return await this.cloudUserCapiService.getCurrentAccount(authDto);
    } catch (e) {
      throw wrapHttpError(e);
    }
  }

  /**
   * Get subscriptions by type
   * @param authDto
   * @param type
   * @param authType
   */
  private async getSubscriptions(
    authDto: CloudCapiAuthDto,
    type: CloudSubscriptionType,
    authType: CloudAutodiscoveryAuthType,
  ): Promise<CloudSubscription[]> {
    try {
      const subscriptions = await this.cloudSubscriptionCapiService.getSubscriptions(authDto, type);
      this.analytics.sendGetRECloudSubsSucceedEvent(subscriptions, type, authType);
      return subscriptions;
    } catch (e) {
      this.analytics.sendGetRECloudSubsFailedEvent(e, type, authType);
      throw wrapHttpError(e);
    }
  }

  /**
   * Discover all subscriptions
   * @param authDto
   * @param authType
   */
  async discoverSubscriptions(
    authDto: CloudCapiAuthDto,
    authType: CloudAutodiscoveryAuthType,
  ): Promise<CloudSubscription[]> {
    return [].concat(...await Promise.all([
      this.getSubscriptions(authDto, CloudSubscriptionType.Fixed, authType),
      this.getSubscriptions(authDto, CloudSubscriptionType.Flexible, authType),
    ]));
  }

  /**
   * Get all databases from specified multiple subscriptions
   * @param authDto
   * @param dto
   * @param authType
   */
  async discoverDatabases(
    authDto: CloudCapiAuthDto,
    dto: DiscoverCloudDatabasesDto,
    authType: CloudAutodiscoveryAuthType,
  ): Promise<CloudDatabase[]> {
    let result = [];
    try {
      this.logger.log('Discovering cloud databases from subscription(s)');

      const subscriptions = uniqBy(
        dto.subscriptions,
        ({ subscriptionId, subscriptionType }) => [subscriptionId, subscriptionType].join(),
      );

      await Promise.all(
        subscriptions.map(async (subscription) => {
          const databases = await this.cloudDatabaseCapiService.getDatabases(authDto, subscription);
          result = result.concat(databases);
        }),
      );

      this.analytics.sendGetRECloudDbsSucceedEvent(result, authType);
      return result;
    } catch (e) {
      this.analytics.sendGetRECloudDbsFailedEvent(e, authType);

      throw wrapHttpError(e);
    }
  }

  /**
   * Add database from cloud
   * @param sessionMetadata
   * @param authDto
   * @param addDatabasesDto
   */
  async addRedisCloudDatabases(
    sessionMetadata: SessionMetadata,
    authDto: CloudCapiAuthDto,
    addDatabasesDto: ImportCloudDatabaseDto[],
  ): Promise<ImportCloudDatabaseResponse[]> {
    this.logger.log('Adding Redis Cloud databases.');

    return Promise.all(
      addDatabasesDto.map(
        async (
          dto: ImportCloudDatabaseDto,
        ): Promise<ImportCloudDatabaseResponse> => {
          let database;
          try {
            database = await this.cloudDatabaseCapiService.getDatabase(authDto, dto);

            const {
              publicEndpoint, name, password, status,
            } = database;
            if (status !== CloudDatabaseStatus.Active) {
              const exception = new ServiceUnavailableException(ERROR_MESSAGES.DATABASE_IS_INACTIVE);
              return {
                ...dto,
                status: ActionStatus.Fail,
                message: exception.message,
                error: exception?.getResponse(),
                databaseDetails: database,
              };
            }
            const [host, port] = publicEndpoint.split(':');

            await this.databaseService.create(
              sessionMetadata,
              {
                host,
                port: parseInt(port, 10),
                name,
                nameFromProvider: name,
                password,
                provider: HostingProvider.RE_CLOUD,
                cloudDetails: database?.cloudDetails,
                timeout: cloudConfig.cloudDatabaseConnectionTimeout,
              },
            );

            return {
              ...dto,
              status: ActionStatus.Success,
              message: 'Added',
              databaseDetails: database,
            };
          } catch (error) {
            return {
              ...dto,
              status: ActionStatus.Fail,
              message: error.message,
              error: error?.response,
              databaseDetails: database,
            };
          }
        },
      ),
    );
  }
}
