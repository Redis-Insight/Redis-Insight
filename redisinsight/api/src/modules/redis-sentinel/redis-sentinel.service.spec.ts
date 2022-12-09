import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import ERROR_MESSAGES from 'src/constants/error-messages';
import { RedisService } from 'src/modules/redis/redis.service';
import {
  mockDatabaseInfoProvider,
  mockDatabaseService,
  mockIORedisClient,
  mockRedisSentinelAnalytics,
  mockRedisSentinelMasterResponse, mockRedisService, mockSentinelDatabaseWithTlsAuth,
  mockSentinelMasterDto,
  MockType,
} from 'src/__mocks__';
import { RedisSentinelService } from 'src/modules/redis-sentinel/redis-sentinel.service';
import { RedisSentinelAnalytics } from 'src/modules/redis-sentinel/redis-sentinel.analytics';
import { DatabaseService } from 'src/modules/database/database.service';
import { DatabaseInfoProvider } from 'src/modules/database/providers/database-info.provider';

describe('RedisSentinelService', () => {
  let service: RedisSentinelService;
  let redisService: MockType<RedisService>;
  let databaseService: MockType<DatabaseService>;
  let databaseInfoProvider: MockType<DatabaseInfoProvider>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisSentinelService,
        {
          provide: RedisSentinelAnalytics,
          useFactory: mockRedisSentinelAnalytics,
        },
        {
          provide: RedisService,
          useFactory: mockRedisService,
        },
        {
          provide: DatabaseService,
          useFactory: mockDatabaseService,
        },
        {
          provide: DatabaseInfoProvider,
          useFactory: mockDatabaseInfoProvider,
        },
      ],
    }).compile();

    service = module.get(RedisSentinelService);
    redisService = module.get(RedisService);
    databaseService = module.get(DatabaseService);
    databaseInfoProvider = module.get(DatabaseInfoProvider);
  });

  describe('getSentinelMasters', () => {
    it('connect and get sentinel masters', async () => {
      redisService.createStandaloneClient.mockResolvedValue(mockIORedisClient);
      mockIORedisClient.call.mockResolvedValue(mockRedisSentinelMasterResponse);
      databaseInfoProvider.determineSentinelMasterGroups.mockResolvedValue([mockSentinelMasterDto]);

      const result = await service.getSentinelMasters(mockSentinelDatabaseWithTlsAuth);

      expect(result).toEqual([mockSentinelMasterDto]);
      expect(mockIORedisClient.disconnect).toHaveBeenCalled();
    });

    it('failed connection to the redis database', async () => {
      redisService.createStandaloneClient.mockRejectedValue(
        new Error(ERROR_MESSAGES.NO_CONNECTION_TO_REDIS_DB),
      );

      await expect(
        service.getSentinelMasters(mockSentinelDatabaseWithTlsAuth),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
