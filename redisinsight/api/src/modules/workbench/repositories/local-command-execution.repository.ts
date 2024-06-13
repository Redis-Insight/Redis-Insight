import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { filter, isNull } from 'lodash';
import { plainToClass } from 'class-transformer';
import { EncryptionService } from 'src/modules/encryption/encryption.service';
import { CommandExecutionEntity } from 'src/modules/workbench/entities/command-execution.entity';
import { CommandExecution } from 'src/modules/workbench/models/command-execution';
import { ModelEncryptor } from 'src/modules/encryption/model.encryptor';
import ERROR_MESSAGES from 'src/constants/error-messages';
import { classToClass } from 'src/utils';
import { ShortCommandExecution } from 'src/modules/workbench/models/short-command-execution';
import { CommandExecutionStatus } from 'src/modules/cli/dto/cli.dto';
import { CommandExecutionRepository } from 'src/modules/workbench/repositories/command-execution.repository';
import config from 'src/utils/config';
import { SessionMetadata } from 'src/common/models';

const WORKBENCH_CONFIG = config.get('workbench');

@Injectable()
export class LocalCommandExecutionRepository extends CommandExecutionRepository {
  private logger = new Logger('LocalCommandExecutionRepository');

  private readonly modelEncryptor: ModelEncryptor;

  constructor(
    @InjectRepository(CommandExecutionEntity)
    private readonly commandExecutionRepository: Repository<CommandExecutionEntity>,
    private readonly encryptionService: EncryptionService,
  ) {
    super();
    this.modelEncryptor = new ModelEncryptor(encryptionService, ['command', 'result']);
  }

  /**
   * Encrypt command executions and save entire entities
   * Should always throw and error in case when unable to encrypt for some reason
   * @param _
   * @param commandExecutions
   */
  async createMany(_: SessionMetadata, commandExecutions: Partial<CommandExecution>[]): Promise<CommandExecution[]> {
    // todo: limit by 30 max to insert
    let entities = await Promise.all(commandExecutions.map(async (commandExecution) => {
      const entity = plainToClass(CommandExecutionEntity, commandExecution);

      // Do not store command execution result that exceeded limitation
      if (JSON.stringify(entity.result).length > WORKBENCH_CONFIG.maxResultSize) {
        entity.result = JSON.stringify([
          {
            status: CommandExecutionStatus.Success,
            response: ERROR_MESSAGES.WORKBENCH_RESPONSE_TOO_BIG(),
          },
        ]);
        // Hack, do not store isNotStored. Send once to show warning
        entity['isNotStored'] = true;
      }

      return this.modelEncryptor.encryptEntity(entity);
    }));

    entities = await this.commandExecutionRepository.save(entities);

    const response = await Promise.all(
      entities.map((entity, idx) => classToClass(
        CommandExecution,
        {
          ...entity,
          command: commandExecutions[idx].command,
          mode: commandExecutions[idx].mode,
          result: commandExecutions[idx].result,
          summary: commandExecutions[idx].summary,
          executionTime: commandExecutions[idx].executionTime,
        },
      )),
    );

    // cleanup history and ignore error if any
    try {
      await this.cleanupDatabaseHistory(entities[0].databaseId);
    } catch (e) {
      this.logger.error('Error when trying to cleanup history after insert', e);
    }

    return response;
  }

  /**
   * Fetch only needed fields to show in list to avoid huge decryption work
   * @param _
   * @param databaseId
   */
  async getList(_: SessionMetadata, databaseId: string): Promise<ShortCommandExecution[]> {
    this.logger.log('Getting command executions');
    const entities = await this.commandExecutionRepository
      .createQueryBuilder('e')
      .where({ databaseId })
      .select([
        'e.id',
        'e.command',
        'e.databaseId',
        'e.createdAt',
        'e.encryption',
        'e.mode',
        'e.summary',
        'e.resultsMode',
        'e.executionTime',
        'e.db',
      ])
      .orderBy('e.createdAt', 'DESC')
      .limit(WORKBENCH_CONFIG.maxItemsPerDb)
      .getMany();

    this.logger.log('Succeed to get command executions');

    const decryptedEntities = await Promise.all(
      entities.map<Promise<CommandExecutionEntity>>(async (entity) => {
        try {
          return await this.modelEncryptor.decryptEntity(entity);
        } catch (e) {
          return null;
        }
      }),
    );

    return filter(decryptedEntities, (entity) => !isNull(entity))
      .map((entity) => classToClass(ShortCommandExecution, entity));
  }

  /**
   * Get single command execution entity, decrypt and convert to model
   *
   * @param _
   * @param databaseId
   * @param id
   */
  async getOne(_: SessionMetadata, databaseId: string, id: string): Promise<CommandExecution> {
    this.logger.log('Getting command executions');

    const entity = await this.commandExecutionRepository.findOneBy({ id, databaseId });

    if (!entity) {
      this.logger.error(`Command execution with id:${id} and databaseId:${databaseId} was not Found`);
      throw new NotFoundException(ERROR_MESSAGES.COMMAND_EXECUTION_NOT_FOUND);
    }

    this.logger.log(`Succeed to get command execution ${id}`);

    const decryptedEntity = await this.modelEncryptor.decryptEntity(entity, true);

    return classToClass(CommandExecution, decryptedEntity);
  }

  /**
   * Delete single item
   *
   * @param _
   * @param databaseId
   * @param id
   */
  async delete(_: SessionMetadata, databaseId: string, id: string): Promise<void> {
    this.logger.log('Delete command execution');

    await this.commandExecutionRepository.delete({ id, databaseId });

    this.logger.log('Command execution deleted');
  }

  /**
   * Delete all items
   *
   * @param _
   * @param databaseId
   */
  async deleteAll(_: SessionMetadata, databaseId: string): Promise<void> {
    this.logger.log('Delete all command executions');

    await this.commandExecutionRepository.delete({ databaseId });

    this.logger.log('Command executions deleted');
  }

  /**
   * Clean history for particular database to fit 30 items limitation
   * @param databaseId
   */
  private async cleanupDatabaseHistory(databaseId: string): Promise<void> {
    // todo: investigate why delete with sub-query doesn't works
    const idsToDelete = (await this.commandExecutionRepository
      .createQueryBuilder()
      .where({ databaseId })
      .select('id')
      .orderBy('createdAt', 'DESC')
      .offset(WORKBENCH_CONFIG.maxItemsPerDb)
      .getRawMany()).map((item) => item.id);

    await this.commandExecutionRepository
      .createQueryBuilder()
      .delete()
      .whereInIds(idsToDelete)
      .execute();
  }
}
