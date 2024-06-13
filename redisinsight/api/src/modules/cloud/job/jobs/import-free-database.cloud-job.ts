import { CloudJob, CloudJobOptions } from 'src/modules/cloud/job/jobs';
import { CloudTaskCapiService } from 'src/modules/cloud/task/cloud-task.capi.service';
import { CloudSubscriptionType } from 'src/modules/cloud/subscription/models';
import { CloudSubscriptionCapiService } from 'src/modules/cloud/subscription/cloud-subscription.capi.service';
import { CloudDatabase } from 'src/modules/cloud/database/models';
import { CloudDatabaseCapiService } from 'src/modules/cloud/database/cloud-database.capi.service';
import { WaitForActiveDatabaseCloudJob } from 'src/modules/cloud/job/jobs/wait-for-active-database.cloud-job';
import { CloudJobName } from 'src/modules/cloud/job/constants';
import { CloudJobStatus, CloudJobStep } from 'src/modules/cloud/job/models';
import { DatabaseService } from 'src/modules/database/database.service';
import { HostingProvider } from 'src/modules/database/entities/database.entity';
import { Database } from 'src/modules/database/models/database';
import config from 'src/utils/config';
import { CloudDatabaseAnalytics } from 'src/modules/cloud/database/cloud-database.analytics';
import { CloudCapiKeyService } from 'src/modules/cloud/capi-key/cloud-capi-key.service';

const cloudConfig = config.get('cloud');

export class ImportFreeDatabaseCloudJob extends CloudJob {
  protected name = CloudJobName.ImportFreeDatabase;

  constructor(
    readonly options: CloudJobOptions,
    private readonly data: {
      subscriptionId: number,
      databaseId: number,
      region: string,
      provider: string,
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
    this.logger.log('Importing free database');

    this.checkSignal();

    this.changeState({ step: CloudJobStep.Import });

    this.logger.debug('Getting database metadata');

    const cloudDatabase: CloudDatabase = await this.runChildJob(
      WaitForActiveDatabaseCloudJob,
      {
        databaseId: this.data.databaseId,
        subscriptionId: this.data.subscriptionId,
        subscriptionType: CloudSubscriptionType.Fixed,
      },
      this.options,
    );

    if (!cloudDatabase) {
      // todo: throw
    }

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
      region: this.data?.region,
      provider: this.data?.provider,
    };

    this.changeState({ status: CloudJobStatus.Finished });

    return database;
  }
}
