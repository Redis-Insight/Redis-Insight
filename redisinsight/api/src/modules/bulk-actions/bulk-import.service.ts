import { join } from 'path';
import * as fs from 'fs-extra';
import {
  BadRequestException, Injectable, InternalServerErrorException, Logger,
} from '@nestjs/common';
import { Readable } from 'stream';
import * as readline from 'readline';
import { wrapHttpError } from 'src/common/utils';
import { DatabaseClientFactory } from 'src/modules/database/providers/database.client.factory';
import { ClientMetadata } from 'src/common/models';
import { splitCliCommandLine } from 'src/utils/cli-helper';
import { BulkActionSummary } from 'src/modules/bulk-actions/models/bulk-action-summary';
import { IBulkActionOverview } from 'src/modules/bulk-actions/interfaces/bulk-action-overview.interface';
import { BulkActionStatus, BulkActionType } from 'src/modules/bulk-actions/constants';
import { BulkActionsAnalytics } from 'src/modules/bulk-actions/bulk-actions.analytics';
import { UploadImportFileByPathDto } from 'src/modules/bulk-actions/dto/upload-import-file-by-path.dto';
import { RedisClient, RedisClientCommand, RedisClientConnectionType } from 'src/modules/redis/client';
import config, { Config } from 'src/utils/config';
import * as CombinedStream from 'combined-stream';
import { DatabaseService } from 'src/modules/database/database.service';
import ERROR_MESSAGES from 'src/constants/error-messages';

const BATCH_LIMIT = 10_000;
const PATH_CONFIG = config.get('dir_path') as Config['dir_path'];
const SERVER_CONFIG = config.get('server') as Config['server'];

@Injectable()
export class BulkImportService {
  private logger = new Logger('BulkImportService');

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly databaseClientFactory: DatabaseClientFactory,
    private readonly analytics: BulkActionsAnalytics,
  ) {}

  private async executeBatch(client: RedisClient, batch: RedisClientCommand[]): Promise<BulkActionSummary> {
    const result = new BulkActionSummary();
    result.addProcessed(batch.length);

    try {
      if (client.getConnectionType() === RedisClientConnectionType.CLUSTER) {
        await Promise.all(batch.map(async (command) => {
          try {
            await client.call(command);
            result.addSuccess(1);
          } catch (e) {
            result.addFailed(1);
          }
        }));
      } else {
        (await client.sendPipeline(batch, { unknownCommands: true })).forEach(([err]) => {
          if (err) {
            result.addFailed(1);
          } else {
            result.addSuccess(1);
          }
        });
      }
    } catch (e) {
      this.logger.error('Unable to execute batch of commands', e);
      result.addFailed(batch.length);
    }

    return result;
  }

  /**
   * @param clientMetadata
   * @param fileStream
   */
  public async import(clientMetadata: ClientMetadata, fileStream: Readable): Promise<IBulkActionOverview> {
    const startTime = Date.now();
    const result: IBulkActionOverview = {
      id: 'empty',
      databaseId: clientMetadata.databaseId,
      type: BulkActionType.Upload,
      summary: {
        processed: 0,
        succeed: 0,
        failed: 0,
        errors: [],
      },
      progress: null,
      filter: null,
      status: BulkActionStatus.Completed,
      duration: 0,
    };

    this.analytics.sendActionStarted(result);

    let parseErrors = 0;

    let client;

    try {
      client = await this.databaseClientFactory.createClient(clientMetadata);

      let batch = [];

      const batchResults: BulkActionSummary[] = [];

      try {
        const rl = readline.createInterface({
          input: fileStream,
        });

        for await (const line of rl) {
          try {
            const command = splitCliCommandLine((line.trim()));
            if (batch.length >= BATCH_LIMIT) {
              batchResults.push(await this.executeBatch(client, batch));
              batch = [];
            }
            if (command?.[0]) {
              batch.push(command);
            }
          } catch (e) {
            parseErrors += 1;
          }
        }
      } catch (e) {
        result.summary.errors.push(e);
        result.status = BulkActionStatus.Failed;
        this.analytics.sendActionFailed(result, e);
      }

      batchResults.push(await this.executeBatch(client, batch));

      batchResults.forEach((batchResult) => {
        result.summary.processed += batchResult.getOverview().processed;
        result.summary.succeed += batchResult.getOverview().succeed;
        result.summary.failed += batchResult.getOverview().failed;
      });

      result.duration = Date.now() - startTime;
      result.summary.processed += parseErrors;
      result.summary.failed += parseErrors;

      if (result.status === BulkActionStatus.Completed) {
        this.analytics.sendActionSucceed(result);
      }

      client.disconnect();

      return result;
    } catch (e) {
      this.logger.error('Unable to process an import file', e);
      const exception = wrapHttpError(e);
      this.analytics.sendActionFailed(result, exception);
      client?.disconnect();
      throw exception;
    }
  }

  /**
   * Upload file from tutorial by path
   * @param clientMetadata
   * @param dto
   */
  public async uploadFromTutorial(
    clientMetadata: ClientMetadata,
    dto: UploadImportFileByPathDto,
  ): Promise<IBulkActionOverview> {
    try {
      const filePath = join(dto.path);

      const staticPath = join(SERVER_CONFIG.base, SERVER_CONFIG.staticUri);

      let trimmedPath = filePath;
      if (filePath.indexOf(staticPath) === 0) {
        trimmedPath = filePath.slice(staticPath.length);
      }

      const path = join(PATH_CONFIG.homedir, trimmedPath);

      if (!path.startsWith(PATH_CONFIG.homedir) || !await fs.pathExists(path)) {
        throw new BadRequestException('Data file was not found');
      }

      return this.import(clientMetadata, fs.createReadStream(path));
    } catch (e) {
      this.logger.error('Unable to process an import file path from tutorial', e);
      throw wrapHttpError(e);
    }
  }

  /**
   * Upload data from predefined files
   * @param clientMetadata
   */
  public async importDefaultData(
    clientMetadata: ClientMetadata,
  ): Promise<IBulkActionOverview> {
    try {
      const database = await this.databaseService.get(clientMetadata.sessionMetadata, clientMetadata.databaseId);
      const databaseModules = database.modules?.map((module) => module.name.toLowerCase()) || [];

      const manifest = JSON.parse(fs.readFileSync(join(PATH_CONFIG.dataDir, 'manifest.json')).toString());

      const commandsStream = CombinedStream.create();

      manifest.files.forEach((file) => {
        if (file.modules) {
          const hasModule = file.modules.find((module) => databaseModules.includes(module));

          if (!hasModule) {
            return;
          }
        }
        commandsStream.append(fs.createReadStream(join(PATH_CONFIG.dataDir, file.path)));
        commandsStream.append('\r\n');
      });

      const result = await this.import(clientMetadata, commandsStream);

      this.analytics.sendImportSamplesUploaded(result);

      return result;
    } catch (e) {
      this.logger.error('Unable to process an import file path from tutorial', e);
      throw new InternalServerErrorException(ERROR_MESSAGES.COMMON_DEFAULT_IMPORT_ERROR);
    }
  }
}
