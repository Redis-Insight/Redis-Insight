import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  mockCommonClientMetadata,
  mockDatabase,
  mockDatabaseAnalytics,
  mockDatabaseRepository,
  mockDatabaseService,
  mockRedisNoAuthError,
  MockType,
  mockRedisClientStorage,
  mockRedisClientFactory,
  mockStandaloneRedisClient,
  mockSessionMetadata,
} from 'src/__mocks__';
import { DatabaseAnalytics } from 'src/modules/database/database.analytics';
import { DatabaseService } from 'src/modules/database/database.service';
import { DatabaseRepository } from 'src/modules/database/repositories/database.repository';
import ERROR_MESSAGES from 'src/constants/error-messages';
import { DatabaseClientFactory } from 'src/modules/database/providers/database.client.factory';
import { RedisClientStorage } from 'src/modules/redis/redis.client.storage';
import { RedisClientFactory } from 'src/modules/redis/redis.client.factory';
import { ConnectionType } from 'src/modules/database/entities/database.entity';

describe('DatabaseClientFactory', () => {
  let service: DatabaseClientFactory;
  let databaseService: MockType<DatabaseService>;
  let databaseRepository: MockType<DatabaseRepository>;
  let redisClientStorage: MockType<RedisClientStorage>;
  let redisClientFactory: MockType<RedisClientFactory>;
  let analytics: MockType<DatabaseAnalytics>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseClientFactory,
        {
          provide: DatabaseService,
          useFactory: mockDatabaseService,
        },
        {
          provide: DatabaseRepository,
          useFactory: mockDatabaseRepository,
        },
        {
          provide: DatabaseAnalytics,
          useFactory: mockDatabaseAnalytics,
        },
        {
          provide: RedisClientStorage,
          useFactory: mockRedisClientStorage,
        },
        {
          provide: RedisClientFactory,
          useFactory: mockRedisClientFactory,
        },
      ],
    }).compile();

    service = await module.get(DatabaseClientFactory);
    databaseService = await module.get(DatabaseService);
    databaseRepository = await module.get(DatabaseRepository);
    redisClientStorage = await module.get(RedisClientStorage);
    redisClientFactory = await module.get(RedisClientFactory);
    analytics = await module.get(DatabaseAnalytics);
  });

  describe('getOrCreateClient', () => {
    it('should get existing client', async () => {
      expect(await service.getOrCreateClient(mockCommonClientMetadata)).toEqual(mockStandaloneRedisClient);
      expect(redisClientStorage.getByMetadata).toHaveBeenCalledWith(mockCommonClientMetadata);
      expect(redisClientStorage.set).not.toHaveBeenCalled();
    });
    it('should create new and save it client', async () => {
      redisClientStorage.getByMetadata.mockResolvedValueOnce(null);

      expect(await service.getOrCreateClient(mockCommonClientMetadata)).toEqual(mockStandaloneRedisClient);
      expect(redisClientStorage.getByMetadata).toHaveBeenCalledWith(mockCommonClientMetadata);
      expect(redisClientStorage.set).toHaveBeenCalledWith(mockStandaloneRedisClient);
    });
  });

  describe('createClient', () => {
    it('should create new client and not update connection type', async () => {
      expect(await service.createClient(mockCommonClientMetadata)).toEqual(mockStandaloneRedisClient);
      expect(databaseService.get).toHaveBeenCalledWith(mockSessionMetadata, mockCommonClientMetadata.databaseId);
      expect(databaseRepository.update).not.toHaveBeenCalled();
    });
    it('should create new client and update connection type (first connection)', async () => {
      databaseService.get.mockResolvedValueOnce({ ...mockDatabase, connectionType: ConnectionType.NOT_CONNECTED });
      expect(await service.createClient(mockCommonClientMetadata)).toEqual(mockStandaloneRedisClient);
      expect(databaseService.get).toHaveBeenCalledWith(mockSessionMetadata, mockCommonClientMetadata.databaseId);
      expect(databaseRepository.update).toHaveBeenCalledWith(
        mockSessionMetadata,
        mockCommonClientMetadata.databaseId,
        {
          connectionType: mockDatabase.connectionType,
        },
      );
    });
    it('should throw Unauthorized error in case of NOAUTH', async () => {
      redisClientFactory.createClient.mockRejectedValueOnce(mockRedisNoAuthError);
      await expect(service.createClient(mockCommonClientMetadata)).rejects.toThrow(UnauthorizedException);
      expect(analytics.sendConnectionFailedEvent).toHaveBeenCalledWith(
        mockDatabase,
        new UnauthorizedException(ERROR_MESSAGES.AUTHENTICATION_FAILED()),
      );
    });
  });
});
