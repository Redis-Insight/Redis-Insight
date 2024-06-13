import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToClass } from 'class-transformer';
import { EncryptionService } from 'src/modules/encryption/encryption.service';
import ERROR_MESSAGES from 'src/constants/error-messages';
import { classToClass } from 'src/utils';
import { PluginStateEntity } from 'src/modules/workbench/entities/plugin-state.entity';
import { PluginState } from 'src/modules/workbench/models/plugin-state';
import { PluginStateRepository } from 'src/modules/workbench/repositories/plugin-state.repository';
import { ModelEncryptor } from 'src/modules/encryption/model.encryptor';
import { SessionMetadata } from 'src/common/models';

@Injectable()
export class LocalPluginStateRepository extends PluginStateRepository {
  private logger = new Logger('LocalPluginStateRepository');

  private readonly modelEncryptor: ModelEncryptor;

  constructor(
    @InjectRepository(PluginStateEntity)
    private readonly repository: Repository<PluginStateEntity>,
    private readonly encryptionService: EncryptionService,
  ) {
    super();
    this.modelEncryptor = new ModelEncryptor(encryptionService, ['state']);
  }

  /**
   * Encrypt command execution and save entire entity
   * Should always throw and error in case when unable to encrypt for some reason
   * @param _
   * @param pluginState
   */
  async upsert(_: SessionMetadata, pluginState: Partial<PluginState>): Promise<void> {
    const entity = plainToClass(PluginStateEntity, pluginState);
    try {
      await this.repository.save(await this.modelEncryptor.encryptEntity(entity));
    } catch (e) {
      if (e.code === 'SQLITE_CONSTRAINT') {
        throw new NotFoundException(ERROR_MESSAGES.COMMAND_EXECUTION_NOT_FOUND);
      }

      throw e;
    }
  }

  /**
   * Get single command execution entity, decrypt and convert to model
   *
   * @param _
   * @param visualizationId
   * @param commandExecutionId
   */
  async getOne(_: SessionMetadata, visualizationId: string, commandExecutionId: string): Promise<PluginState> {
    this.logger.log('Getting plugin state');

    const entity = await this.repository.findOneBy({ visualizationId, commandExecutionId });

    if (!entity) {
      this.logger.error(`Plugin state ${commandExecutionId}:${visualizationId} was not Found`);
      throw new NotFoundException(ERROR_MESSAGES.PLUGIN_STATE_NOT_FOUND);
    }

    this.logger.log(`Succeed to get plugin state ${commandExecutionId}:${visualizationId}`);

    const decryptedEntity = await this.modelEncryptor.decryptEntity(entity, true);

    return classToClass(PluginState, decryptedEntity);
  }
}
