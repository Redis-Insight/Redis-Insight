import {
  Injectable,
} from '@nestjs/common';
import {
  DiscoverCloudDatabasesDto,
  ImportCloudDatabaseDto,
  ImportCloudDatabaseResponse,
} from 'src/modules/cloud/autodiscovery/dto';
import { CloudAutodiscoveryAuthType } from 'src/modules/cloud/autodiscovery/models';
import { SessionMetadata } from 'src/common/models';
import { CloudCapiAuthDto } from 'src/modules/cloud/common/dto';
import { wrapHttpError } from 'src/common/utils';
import { CloudAccountInfo } from 'src/modules/cloud/user/models';
import { CloudSubscription } from 'src/modules/cloud/subscription/models';
import { CloudDatabase } from 'src/modules/cloud/database/models';
import { CloudAutodiscoveryService } from 'src/modules/cloud/autodiscovery/cloud-autodiscovery.service';
import { CloudRequestUtm } from 'src/modules/cloud/common/models';
import { CloudCapiKeyService } from 'src/modules/cloud/capi-key/cloud-capi-key.service';
import { CloudCapiKeyApiProvider } from 'src/modules/cloud/capi-key/cloud-capi-key.api.provider';

@Injectable()
export class MeCloudAutodiscoveryService {
  constructor(
    private readonly cloudAutodiscoveryService: CloudAutodiscoveryService,
    private readonly cloudCapiKeyService: CloudCapiKeyService,
    private readonly api: CloudCapiKeyApiProvider,
  ) {}

  private async getCapiCredentials(sessionMetadata: SessionMetadata, utm?: CloudRequestUtm): Promise<CloudCapiAuthDto> {
    return this.cloudCapiKeyService.getCapiCredentials(sessionMetadata, utm);
  }

  /**
   * Get cloud account short info
   * @param sessionMetadata
   * @param utm
   */
  async getAccount(sessionMetadata: SessionMetadata, utm?: CloudRequestUtm): Promise<CloudAccountInfo> {
    return this.api.callWithAuthRetry(sessionMetadata.sessionId, async () => {
      try {
        return await this.cloudAutodiscoveryService.getAccount(
          await this.getCapiCredentials(sessionMetadata, utm),
        );
      } catch (e) {
        throw wrapHttpError(await this.cloudCapiKeyService.handleCapiKeyUnauthorizedError(e, sessionMetadata));
      }
    });
  }

  /**
   * Discover all subscriptions
   * @param sessionMetadata
   * @param utm
   */
  async discoverSubscriptions(sessionMetadata: SessionMetadata, utm?: CloudRequestUtm): Promise<CloudSubscription[]> {
    return this.api.callWithAuthRetry(sessionMetadata.sessionId, async () => {
      try {
        return await this.cloudAutodiscoveryService.discoverSubscriptions(
          await this.getCapiCredentials(sessionMetadata, utm),
          CloudAutodiscoveryAuthType.Sso,
        );
      } catch (e) {
        throw wrapHttpError(await this.cloudCapiKeyService.handleCapiKeyUnauthorizedError(e, sessionMetadata));
      }
    });
  }

  /**
   * Get all databases from specified multiple subscriptions
   * @param sessionMetadata
   * @param dto
   * @param utm
   */
  async discoverDatabases(
    sessionMetadata: SessionMetadata,
    dto: DiscoverCloudDatabasesDto,
    utm?: CloudRequestUtm,
  ): Promise<CloudDatabase[]> {
    return this.api.callWithAuthRetry(sessionMetadata.sessionId, async () => {
      try {
        return await this.cloudAutodiscoveryService.discoverDatabases(
          await this.getCapiCredentials(sessionMetadata, utm),
          dto,
          CloudAutodiscoveryAuthType.Sso,
        );
      } catch (e) {
        throw wrapHttpError(await this.cloudCapiKeyService.handleCapiKeyUnauthorizedError(e, sessionMetadata));
      }
    });
  }

  /**
   * Add database from cloud
   * @param sessionMetadata
   * @param addDatabasesDto
   * @param utm
   */
  async addRedisCloudDatabases(
    sessionMetadata: SessionMetadata,
    addDatabasesDto: ImportCloudDatabaseDto[],
    utm?: CloudRequestUtm,
  ): Promise<ImportCloudDatabaseResponse[]> {
    return this.api.callWithAuthRetry(sessionMetadata.sessionId, async () => {
      try {
        return await this.cloudAutodiscoveryService.addRedisCloudDatabases(
          sessionMetadata,
          await this.getCapiCredentials(sessionMetadata, utm),
          addDatabasesDto,
        );
      } catch (e) {
        throw wrapHttpError(await this.cloudCapiKeyService.handleCapiKeyUnauthorizedError(e, sessionMetadata));
      }
    });
  }
}
