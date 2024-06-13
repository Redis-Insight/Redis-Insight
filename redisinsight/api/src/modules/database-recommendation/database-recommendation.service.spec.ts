import { Test, TestingModule } from '@nestjs/testing';
import {
  MockType,
  mockDatabase,
  mockDatabaseRecommendationAnalytics,
  mockDatabaseRecommendationRepository,
  mockDatabaseService,
  mockRecommendationScanner,
} from 'src/__mocks__';
import { ClientContext, ClientMetadata } from 'src/common/models';
import { DatabaseService } from '../database/database.service';
import { DatabaseRecommendationAnalytics } from './database-recommendation.analytics';
import { DatabaseRecommendationService } from './database-recommendation.service';
import { ModifyDatabaseRecommendationDto } from './dto';
import { DatabaseRecommendation } from './models';
import { DatabaseRecommendationRepository } from './repositories/database-recommendation.repository';
import { RecommendationScanner } from './scanner/recommendations.scanner';

describe('DatabaseRecommendationService', () => {
  const clientMetadata: ClientMetadata = {
    sessionMetadata: { userId: '1', sessionId: '1' },
    databaseId: '1',
    context: ClientContext.Browser,
    db: 1,
  };

  let service: DatabaseRecommendationService;
  let databaseRecommendationRepository: MockType<DatabaseRecommendationRepository>;
  let scanner: MockType<RecommendationScanner>;
  let databaseService: MockType<DatabaseService>;
  let analytics: MockType<DatabaseRecommendationAnalytics>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: DatabaseRecommendationRepository,
          useFactory: mockDatabaseRecommendationRepository,
        },
        {
          provide: RecommendationScanner,
          useFactory: mockRecommendationScanner,
        },
        {
          provide: DatabaseService,
          useFactory: mockDatabaseService,
        },
        {
          provide: DatabaseRecommendationAnalytics,
          useFactory: mockDatabaseRecommendationAnalytics,
        },
        DatabaseRecommendationService,
      ],
    }).compile();

    databaseRecommendationRepository = await module.get(DatabaseRecommendationRepository);
    scanner = await module.get(RecommendationScanner);
    databaseService = await module.get(DatabaseService);
    analytics = await module.get(DatabaseRecommendationAnalytics);
    service = module.get(DatabaseRecommendationService);
  });

  describe('create', () => {
    it('should create a new recommendation', async () => {
      const recommendationEntity: DatabaseRecommendation = {
        id: '1',
        databaseId: '1',
        name: 'testDb',
      };
      databaseRecommendationRepository.create.mockResolvedValueOnce(recommendationEntity);

      await service.create(clientMetadata, recommendationEntity);

      expect(databaseRecommendationRepository.create)
        .toHaveBeenCalledWith(clientMetadata.sessionMetadata, recommendationEntity);
      expect(databaseService.get).toHaveBeenCalledWith(clientMetadata.sessionMetadata, clientMetadata.databaseId);
      expect(analytics.sendCreatedRecommendationEvent).toHaveBeenCalledWith(recommendationEntity, mockDatabase);
    });
  });

  describe('list', () => {
    it('should return a list of recommendations for client metadata db', async () => {
      await service.list(clientMetadata);

      expect(databaseRecommendationRepository.list).toHaveBeenLastCalledWith({ ...clientMetadata });
    });

    it('should return a list of recommendations for database fetched by session metadata', async () => {
      databaseService.get.mockResolvedValueOnce({ ...mockDatabase, db: 66 });
      const clientMetadataWithoutDb = { ...clientMetadata, db: undefined };
      await service.list(clientMetadataWithoutDb);
      expect(databaseRecommendationRepository.list).toHaveBeenCalledWith({ ...clientMetadataWithoutDb, db: 66 });
    });

    it('should return a list of recommendations - default db to 0 if not passed in or retrieved from service',
      async () => {
        const clientMetadataWithoutDb = { ...clientMetadata, db: undefined };
        await service.list(clientMetadataWithoutDb);
        expect(databaseRecommendationRepository.list).toHaveBeenCalledWith({ ...clientMetadataWithoutDb, db: 0 });
      });
  });

  describe('read', () => {
    it('should mark recommendations as read', async () => {
      await service.read(clientMetadata);
      expect(databaseRecommendationRepository.read).toHaveBeenCalledWith(clientMetadata);
    });
  });

  describe('update', () => {
    it('should update a recommendation', async () => {
      const id = '55';
      const dto: ModifyDatabaseRecommendationDto = {} as unknown as ModifyDatabaseRecommendationDto;

      await service.update(clientMetadata, id, dto);

      expect(databaseRecommendationRepository.update).toHaveBeenCalledWith(clientMetadata, id, dto);
    });
  });

  describe('sync', () => {
    it('should sync recommendations', async () => {
      const recommendation = {} as unknown as DatabaseRecommendation;
      const recommendations = [recommendation];

      await service.sync(clientMetadata, recommendations);

      expect(databaseRecommendationRepository.sync).toHaveBeenCalledWith(clientMetadata, recommendations);
    });
  });

  describe('delete', () => {
    it('should delete a recommendation', async () => {
      const id = '55';

      await service.delete(clientMetadata, id);

      expect(databaseRecommendationRepository.delete).toHaveBeenCalledWith(clientMetadata, id);
    });
  });

  describe('bulk delete', () => {
    it('should delete multiple recommendations, all succeed', async () => {
      const ids = ['1', '2', '3'];

      const result = await service.bulkDelete(clientMetadata, ids);

      expect(databaseRecommendationRepository.delete).toHaveBeenCalledWith(clientMetadata, '1');
      expect(databaseRecommendationRepository.delete).toHaveBeenCalledWith(clientMetadata, '2');
      expect(databaseRecommendationRepository.delete).toHaveBeenCalledWith(clientMetadata, '3');

      expect(result.affected).toBe(3);
    });

    it('should delete multiple recommendations, some fail', async () => {
      const ids = ['1', '2', '3'];

      databaseRecommendationRepository.delete.mockRejectedValueOnce(new Error('Failed to delete'));

      const result = await service.bulkDelete(clientMetadata, ids);

      expect(databaseRecommendationRepository.delete).toHaveBeenCalledWith(clientMetadata, '1');
      expect(databaseRecommendationRepository.delete).toHaveBeenCalledWith(clientMetadata, '2');
      expect(databaseRecommendationRepository.delete).toHaveBeenCalledWith(clientMetadata, '3');

      expect(result.affected).toBe(2);
    });
  });
});
