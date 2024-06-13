import { CloudJob, CloudJobOptions, WaitForTaskCloudJob } from 'src/modules/cloud/job/jobs';
import { CloudTaskCapiService } from 'src/modules/cloud/task/cloud-task.capi.service';
import {
  CloudSubscription, CloudSubscriptionType,
} from 'src/modules/cloud/subscription/models';
import { CloudSubscriptionCapiService } from 'src/modules/cloud/subscription/cloud-subscription.capi.service';
import { CloudDatabase } from 'src/modules/cloud/database/models';
import { CloudDatabaseCapiService } from 'src/modules/cloud/database/cloud-database.capi.service';
import { WaitForActiveDatabaseCloudJob } from 'src/modules/cloud/job/jobs/wait-for-active-database.cloud-job';
import { CloudJobName } from 'src/modules/cloud/job/constants';
import { CloudJobStatus, CloudJobStep } from 'src/modules/cloud/job/models';
import {
  CloudJobUnexpectedErrorException,
  CloudTaskNoResourceIdException,
} from 'src/modules/cloud/job/exceptions';
import { DatabaseService } from 'src/modules/database/database.service';
import { HostingProvider } from 'src/modules/database/entities/database.entity';
import { Database } from 'src/modules/database/models/database';
import config from 'src/utils/config';
import { CloudDatabaseAnalytics } from 'src/modules/cloud/database/cloud-database.analytics';
import { CloudCapiKeyService } from 'src/modules/cloud/capi-key/cloud-capi-key.service';

const cloudConfig = config.get('cloud');

export class CreateFreeDatabaseCloudJob extends CloudJob {
  protected name = CloudJobName.CreateFreeDatabase;

  constructor(
    readonly options: CloudJobOptions,
    private readonly data: {
      subscriptionId: number,
    },
    protected readonly dependencies: {
      cloudDatabaseCapiService: CloudDatabaseCapiService,
      cloudSubscriptionCapiService: CloudSubscriptionCapiService,
      cloudTaskCapiService: CloudTaskCapiService,
      cloudDatabaseAnalytics: CloudDatabaseAnalytics,
      databaseService: DatabaseService,
      cloudCapiKeyService: CloudCapiKeyService,
    },
  ) {
    super(options);
  }

  async iteration(): Promise<Database> {
    let freeSubscription: CloudSubscription;
    try {
      this.logger.log('Create free database');

      this.checkSignal();

      this.changeState({ step: CloudJobStep.Database });

      this.logger.debug('Getting subscription metadata');

      freeSubscription = await this.dependencies.cloudSubscriptionCapiService.getSubscription(
        this.options.capiCredentials,
        this.data.subscriptionId,
        CloudSubscriptionType.Fixed,
      );
      let cloudDatabase: CloudDatabase;

      let createFreeDatabaseTask = await this.dependencies.cloudDatabaseCapiService.createFreeDatabase(
        this.options.capiCredentials,
        {
          subscriptionId: freeSubscription.id,
          subscriptionType: freeSubscription.type,
        },
      );

      this.checkSignal();

      createFreeDatabaseTask = await this.runChildJob(
        WaitForTaskCloudJob,
        {
          taskId: createFreeDatabaseTask.taskId,
        },
        this.options,
      );

      const freeDatabaseId = createFreeDatabaseTask?.response?.resourceId;

      if (!freeDatabaseId) {
        throw new CloudTaskNoResourceIdException();
      }

      cloudDatabase = {
        databaseId: freeDatabaseId,
      } as CloudDatabase;

      if (!cloudDatabase) {
        throw new CloudJobUnexpectedErrorException('Unable to create free cloud database');
      }

      this.checkSignal();

      cloudDatabase = await this.runChildJob(
        WaitForActiveDatabaseCloudJob,
        {
          databaseId: cloudDatabase.databaseId,
          subscriptionId: this.data.subscriptionId,
          subscriptionType: CloudSubscriptionType.Fixed,
        },
        this.options,
      );

      this.checkSignal();

      const {
        publicEndpoint,
        name,
        password,
      } = cloudDatabase;

      const [host, port] = publicEndpoint.split(':');

      const database = await this.dependencies.databaseService.create(
        this.options.sessionMetadata,
        {
          host,
          port: parseInt(port, 10),
          name,
          nameFromProvider: name,
          password,
          provider: HostingProvider.RE_CLOUD,
          cloudDetails: {
            ...cloudDatabase?.cloudDetails,
            free: true,
          },
          timeout: cloudConfig.cloudDatabaseConnectionTimeout,
        },
      );

      this.result = {
        resourceId: database.id,
        region: freeSubscription?.region,
        provider: freeSubscription?.provider,
      };

      this.changeState({ status: CloudJobStatus.Finished });

      this.dependencies.cloudDatabaseAnalytics.sendCloudFreeDatabaseCreated({
        region: freeSubscription?.region || '',
        provider: freeSubscription?.provider || '',
      });

      return database;
    } catch (e) {
      this.dependencies.cloudDatabaseAnalytics.sendCloudFreeDatabaseFailed(
        e,
        {
          region: freeSubscription?.region,
          provider: freeSubscription?.provider,
        },
      );

      throw e;
    }
  }
}
