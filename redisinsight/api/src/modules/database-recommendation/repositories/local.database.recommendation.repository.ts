import {
  Injectable, InternalServerErrorException, Logger, NotFoundException,
} from '@nestjs/common';
import { DatabaseRecommendationEntity }
  from 'src/modules/database-recommendation/entities/database-recommendation.entity';
import { DatabaseRecommendationRepository }
  from 'src/modules/database-recommendation/repositories/database-recommendation.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToClass } from 'class-transformer';
import { DatabaseRecommendation } from 'src/modules/database-recommendation/models';
import { ModifyDatabaseRecommendationDto } from 'src/modules/database-recommendation/dto';
import { EncryptionService } from 'src/modules/encryption/encryption.service';
import { Recommendation } from 'src/modules/database-analysis/models/recommendation';
import { ClientMetadata, SessionMetadata } from 'src/common/models';
import { sortRecommendations, classToClass } from 'src/utils';

import ERROR_MESSAGES from 'src/constants/error-messages';
import {
  DatabaseRecommendationsResponse,
} from 'src/modules/database-recommendation/dto/database-recommendations.response';
import { RecommendationEvents } from 'src/modules/database-recommendation/constants';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ModelEncryptor } from 'src/modules/encryption/model.encryptor';

@Injectable()
export class LocalDatabaseRecommendationRepository extends DatabaseRecommendationRepository {
  private readonly logger = new Logger('DatabaseRecommendationRepository');

  private readonly modelEncryptor: ModelEncryptor;

  constructor(
    @InjectRepository(DatabaseRecommendationEntity)
    private readonly repository: Repository<DatabaseRecommendationEntity>,
    private eventEmitter: EventEmitter2,
    private readonly encryptionService: EncryptionService,
  ) {
    super();
    this.modelEncryptor = new ModelEncryptor(encryptionService, ['params']);
  }

  /**
   * Save entire entity
   * @param _
   * @param entity
   */
  async create(_: SessionMetadata, entity: DatabaseRecommendation): Promise<DatabaseRecommendation> {
    this.logger.log('Creating database recommendation');

    try {
      const model = await this.repository.save(
        await this.modelEncryptor.encryptEntity(plainToClass(DatabaseRecommendationEntity, entity)),
      );

      const recommendation = classToClass(
        DatabaseRecommendation,
        await this.modelEncryptor.decryptEntity(model, true),
      );
      this.eventEmitter.emit(RecommendationEvents.NewRecommendation, [recommendation]);

      return recommendation;
    } catch (err) {
      this.logger.error('Failed to create database recommendation', err);

      return null;
    }
  }

  /**
   * Return list of database recommendations
   * @param clientMetadata
   */
  async list({ databaseId }: ClientMetadata): Promise<DatabaseRecommendationsResponse> {
    this.logger.log('Getting database recommendations list');
    const entities = await this.repository
      .createQueryBuilder('r')
      .where({ databaseId })
      .select(['r.id', 'r.name', 'r.read', 'r.vote', 'r.hide', 'r.params', 'r.encryption'])
      .orderBy('r.createdAt', 'DESC')
      .getMany();

    const totalUnread = await this.repository
      .createQueryBuilder()
      .where({ databaseId, read: false })
      .getCount();

    this.logger.log('Succeed to get recommendations');
    const decryptedEntities = await Promise.all(
      entities.map(async (entity) => {
        try {
          return await this.modelEncryptor.decryptEntity(entity, true);
        } catch (e) {
          return null;
        }
      }),
    );
    return classToClass(DatabaseRecommendationsResponse, {
      recommendations: decryptedEntities,
      totalUnread,
    });
  }

  /**
   * Read all recommendations recommendations
   * @param clientMetadata
   */
  async read({ databaseId }: ClientMetadata): Promise<void> {
    this.logger.log('Marking all recommendations as read');
    await this.repository
      .createQueryBuilder('r')
      .update()
      .where({ databaseId })
      .set({ read: true })
      .execute();
  }

  /**
   * Update and return updated DatabaseRecommendation model
   * @param clientMetadata
   * @param id
   * @param recommendation
   */
  async update(
    clientMetadata: ClientMetadata,
    id: string,
    recommendation: ModifyDatabaseRecommendationDto,
  ): Promise<DatabaseRecommendation> {
    this.logger.log(`Updating database recommendation with id:${id}`);
    const oldEntity = await this.modelEncryptor.decryptEntity(await this.repository.findOneBy({ id }));
    const newEntity = plainToClass(DatabaseRecommendationEntity, recommendation);

    if (!oldEntity) {
      this.logger.error(`Database recommendation with id:${id} was not Found`);
      throw new NotFoundException(ERROR_MESSAGES.DATABASE_RECOMMENDATION_NOT_FOUND);
    }

    const mergeResult = this.repository.merge(oldEntity, newEntity);
    await this.repository.update(id, await this.modelEncryptor.encryptEntity(mergeResult));

    this.logger.log(`Updated database recommendation with id:${id}`);

    return this.get(clientMetadata.sessionMetadata, id);
  }

  /**
   * Check is recommendation exist in database
   * @param clientMetadata
   * @param name
   */
  async isExist(
    { databaseId }: ClientMetadata,
    name: string,
  ): Promise<boolean> {
    try {
      this.logger.log(`Checking is recommendation ${name} exist`);
      const recommendation = await this.repository.findOneBy({ databaseId, name });

      this.logger.log(`Succeed to check is recommendation ${name} exist'`);
      return !!recommendation;
    } catch (err) {
      this.logger.error(`Failed to check is recommendation ${name} exist'`);
      return false;
    }
  }

  /**
   * Get recommendation by id
   * @param _
   * @param id
   */
  public async get(_: SessionMetadata, id: string): Promise<DatabaseRecommendation> {
    this.logger.log(`Getting recommendation with id: ${id}`);

    const entity = await this.repository.findOneBy({ id });
    const model = classToClass(DatabaseRecommendation, await this.modelEncryptor.decryptEntity(entity, true));

    if (!model) {
      this.logger.error(`Not found recommendation with id: ${id}'`);
      return null;
    }

    this.logger.log(`Succeed to get recommendation with id: ${id}'`);
    return model;
  }

  /**
   * Sync db analysis recommendations with live recommendations
   * @param clientMetadata
   * @param dbAnalysisRecommendations
   */
  async sync(
    clientMetadata: ClientMetadata,
    dbAnalysisRecommendations: Recommendation[],
  ): Promise<void> {
    this.logger.log('Synchronization of recommendations');
    try {
      const sortedRecommendations = sortRecommendations(dbAnalysisRecommendations);
      for (let i = 0; i < sortedRecommendations.length; i += 1) {
        if (!await this.isExist(clientMetadata, sortedRecommendations[i].name)) {
          const entity = plainToClass(
            DatabaseRecommendation,
            {
              databaseId: clientMetadata?.databaseId,
              name: sortedRecommendations[i].name,
              params: sortedRecommendations[i].params,
            },
          );
          await this.create(clientMetadata.sessionMetadata, entity);
        }
      }
    } catch (e) {
      // ignore errors
      this.logger.error(e);
    }
  }

  /**
   * Delete recommendation by id
   * @param clientMetadata,
   * @param id
   */
  public async delete({ databaseId }: ClientMetadata, id: string): Promise<void> {
    try {
      const { affected } = await this.repository.delete({ databaseId, id });

      if (!affected) {
        this.logger.error(`Recommendation with id:${id} was not Found`);
        return Promise.reject(new NotFoundException(ERROR_MESSAGES.DATABASE_RECOMMENDATION_NOT_FOUND));
      }

      this.logger.log('Succeed to delete recommendation.');
    } catch (error) {
      this.logger.error(`Failed to delete recommendation: ${id}`, error);
      throw new InternalServerErrorException(error.message);
    }
  }

  public async getTotalUnread(clientMetadata: ClientMetadata, databaseId: string): Promise<number> {
    return await this.repository
      .createQueryBuilder()
      .where({ read: false, databaseId })
      .getCount();
  }
}
