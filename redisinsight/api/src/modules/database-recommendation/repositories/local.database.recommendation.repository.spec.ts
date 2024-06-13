import { when } from 'jest-when';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  mockEncryptionService,
  mockRepository,
  mockDatabaseRecommendationEntity,
  mockRecommendationName,
  mockClientMetadata,
  mockDatabaseRecommendation,
  MockType,
} from 'src/__mocks__';
import { EncryptionService } from 'src/modules/encryption/encryption.service';
import { LocalDatabaseRecommendationRepository }
  from 'src/modules/database-recommendation/repositories/local.database.recommendation.repository';
import { DatabaseRecommendationEntity }
  from 'src/modules/database-recommendation/entities/database-recommendation.entity';
import ERROR_MESSAGES from 'src/constants/error-messages';

describe('LocalDatabaseRecommendationRepository', () => {
  let service: LocalDatabaseRecommendationRepository;
  let encryptionService: MockType<EncryptionService>;
  let repository: MockType<Repository<DatabaseRecommendationEntity>>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalDatabaseRecommendationRepository,
        {
          provide: getRepositoryToken(DatabaseRecommendationEntity),
          useFactory: mockRepository,
        },
        {
          provide: EncryptionService,
          useFactory: mockEncryptionService,
        },
        EventEmitter2,
      ],
    }).compile();

    repository = await module.get(getRepositoryToken(DatabaseRecommendationEntity));
    encryptionService = await module.get(EncryptionService);
    service = module.get(LocalDatabaseRecommendationRepository);

    repository.findOneBy.mockResolvedValue(mockDatabaseRecommendationEntity);
    repository.save.mockResolvedValue(mockDatabaseRecommendationEntity);
    repository.update.mockResolvedValue(mockDatabaseRecommendationEntity);

    when(encryptionService.encrypt)
      .calledWith(JSON.stringify(mockDatabaseRecommendation.params))
      .mockReturnValue({
        encryption: mockDatabaseRecommendationEntity.encryption,
        data: mockDatabaseRecommendationEntity.params,
      });
    when(encryptionService.decrypt)
      .calledWith(mockDatabaseRecommendationEntity.params, jasmine.anything())
      .mockReturnValue(JSON.stringify(mockDatabaseRecommendation.params));
  });

  describe('isExist', () => {
    it('should return true when receive database entity', async () => {
      expect(await service.isExist(mockClientMetadata, mockRecommendationName)).toEqual(true);
    });

    it('should return false when no database received', async () => {
      repository.findOneBy.mockResolvedValueOnce(null);
      expect(await service.isExist(mockClientMetadata, mockRecommendationName)).toEqual(false);
    });

    it('should return false when received error', async () => {
      repository.findOneBy.mockRejectedValueOnce(new Error());
      expect(await service.isExist(mockClientMetadata, mockRecommendationName)).toEqual(false);
    });
  });

  describe('create', () => {
    it('should create recommendation', async () => {
      const result = await service.create(mockClientMetadata.sessionMetadata, mockDatabaseRecommendation);

      expect(result).toEqual(mockDatabaseRecommendation);
    });

    it('should not create recommendation', async () => {
      repository.save.mockRejectedValueOnce(new Error());

      const result = await service.create(mockClientMetadata.sessionMetadata, mockDatabaseRecommendation);

      expect(result).toEqual(null);
    });
  });

  describe('delete', () => {
    it('should delete recommendation by id', async () => {
      repository.delete.mockResolvedValueOnce({ affected: 1 });

      expect(await service.delete(mockClientMetadata, 'id')).toEqual(undefined);
    });

    it('should return NotFoundException when recommendation does not found', async () => {
      repository.delete.mockResolvedValueOnce({ affected: 0 });

      try {
        await service.delete(mockClientMetadata, 'id');
        fail();
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
        expect(e.message).toEqual(ERROR_MESSAGES.DATABASE_RECOMMENDATION_NOT_FOUND);
      }
    });
  });
});
