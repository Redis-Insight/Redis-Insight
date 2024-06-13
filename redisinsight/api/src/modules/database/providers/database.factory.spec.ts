import {
  mockRedisSentinelUtilModule,
  mockRedisClusterUtilModule,
  mockRedisClusterUtil, mockRedisSentinelUtil,
} from 'src/__mocks__/redis-utils';

jest.doMock('src/modules/redis/utils/cluster.util', mockRedisClusterUtilModule);
jest.doMock('src/modules/redis/utils/sentinel.util', mockRedisSentinelUtilModule);

import { Test, TestingModule } from '@nestjs/testing';
import {
  mockCaCertificateService,
  mockClientCertificateService,
  mockClusterDatabaseWithTlsAuth,
  mockClusterRedisClient,
  mockDatabase,
  mockDatabaseInfoProvider,
  mockDatabaseWithTlsAuth,
  mockRedisClientFactory,
  mockRedisNoPermError,
  mockSentinelDatabaseWithTlsAuth,
  mockSentinelRedisClient,
  mockSessionMetadata,
  mockStandaloneRedisClient,
} from 'src/__mocks__';
import { DatabaseFactory } from 'src/modules/database/providers/database.factory';
import { DatabaseInfoProvider } from 'src/modules/database/providers/database-info.provider';
import { CaCertificateService } from 'src/modules/certificate/ca-certificate.service';
import { ClientCertificateService } from 'src/modules/certificate/client-certificate.service';
import { ConnectionType } from 'src/modules/database/entities/database.entity';
import ERROR_MESSAGES from 'src/constants/error-messages';
import { NotFoundException } from '@nestjs/common';
import { RedisErrorCodes } from 'src/constants';
import { RedisClientFactory } from 'src/modules/redis/redis.client.factory';

describe('DatabaseFactory', () => {
  let service: DatabaseFactory;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseFactory,
        {
          provide: RedisClientFactory,
          useFactory: mockRedisClientFactory,
        },
        {
          provide: DatabaseInfoProvider,
          useFactory: mockDatabaseInfoProvider,
        },
        {
          provide: CaCertificateService,
          useFactory: mockCaCertificateService,
        },
        {
          provide: ClientCertificateService,
          useFactory: mockClientCertificateService,
        },
      ],
    }).compile();

    service = await module.get(DatabaseFactory);
  });

  describe('createDatabaseModel', () => {
    it('should create standalone database model', async () => {
      mockRedisSentinelUtil.isSentinel.mockResolvedValue(false);
      mockRedisClusterUtil.isCluster.mockResolvedValue(false);

      const result = await service.createDatabaseModel(mockSessionMetadata, mockDatabase);

      expect(result).toEqual(mockDatabase);
    });
    it('should create sentinel database model', async () => {
      mockRedisSentinelUtil.isSentinel.mockResolvedValue(true);
      mockRedisClusterUtil.isCluster.mockResolvedValue(false);

      const result = await service.createDatabaseModel(mockSessionMetadata, mockSentinelDatabaseWithTlsAuth);

      expect(result).toEqual(mockSentinelDatabaseWithTlsAuth);
    });
    it('should throw an error for sentinel without sentinelMaster field provided', async () => {
      mockRedisSentinelUtil.isSentinel.mockResolvedValue(true);
      mockRedisClusterUtil.isCluster.mockResolvedValue(false);
      try {
        await service.createDatabaseModel(mockSessionMetadata, mockDatabase);
        fail();
      } catch (e) {
        expect(e.message).toEqual(RedisErrorCodes.SentinelParamsRequired);
      }
    });
    it('should create cluster database model', async () => {
      mockRedisSentinelUtil.isSentinel.mockResolvedValue(false);
      mockRedisClusterUtil.isCluster.mockResolvedValue(true);

      const result = await service.createDatabaseModel(mockSessionMetadata, mockClusterDatabaseWithTlsAuth);

      expect(result).toEqual(mockClusterDatabaseWithTlsAuth);
    });
  });

  describe('createStandaloneDatabaseModel', () => {
    it('should create standalone database model without certs', async () => {
      const result = await service.createStandaloneDatabaseModel(mockDatabase);

      expect(result).toEqual(mockDatabase);
    });
    it('should create standalone database model and fetch existing certs', async () => {
      const result = await service.createStandaloneDatabaseModel(mockDatabaseWithTlsAuth);

      expect(result).toEqual(mockDatabaseWithTlsAuth);
    });
  });

  describe('createClusterDatabaseModel', () => {
    it('should create cluster database model', async () => {
      const result = await service.createClusterDatabaseModel(
        mockSessionMetadata,
        {
          ...mockClusterDatabaseWithTlsAuth,
          connectionType: ConnectionType.STANDALONE,
        },
        mockStandaloneRedisClient,
      );

      expect(result).toEqual(mockClusterDatabaseWithTlsAuth);
      expect(mockClusterRedisClient.disconnect).toHaveBeenCalled();
    });

    it('should throw ACL error if no permissions', async () => {
      mockRedisClusterUtil.discoverClusterNodes.mockRejectedValueOnce(mockRedisNoPermError);

      try {
        await service.createClusterDatabaseModel(
          mockSessionMetadata,
          {
            ...mockSentinelDatabaseWithTlsAuth,
            connectionType: ConnectionType.STANDALONE,
          },
          mockStandaloneRedisClient,
        );
        fail();
      } catch (e) {
        // todo: returned BadRequest. why not Forbidden?
        // expect(e).toBeInstanceOf(ForbiddenException);
        expect(e.message).toEqual(mockRedisNoPermError.message);
      }
    });
  });

  describe('createSentinelDatabaseModel', () => {
    it('should create sentinel database model', async () => {
      const result = await service.createSentinelDatabaseModel(
        mockSessionMetadata,
        {
          ...mockSentinelDatabaseWithTlsAuth,
          connectionType: ConnectionType.STANDALONE,
        },
        mockStandaloneRedisClient,
      );

      expect(result).toEqual(mockSentinelDatabaseWithTlsAuth);
      expect(mockSentinelRedisClient.disconnect).toHaveBeenCalled();
    });

    it('should throw NotFound error if no such master group', async () => {
      try {
        await service.createSentinelDatabaseModel(
          mockSessionMetadata,
          {
            ...mockSentinelDatabaseWithTlsAuth,
            connectionType: ConnectionType.STANDALONE,
            sentinelMaster: {
              ...mockSentinelDatabaseWithTlsAuth.sentinelMaster,
              name: 'not existing master group',
            },
          },
          mockStandaloneRedisClient,
        );
        fail();
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
        expect(e.message).toEqual(ERROR_MESSAGES.MASTER_GROUP_NOT_EXIST);
      }
    });

    it('should throw ACL error if no permissions', async () => {
      mockRedisSentinelUtil.discoverSentinelMasterGroups.mockRejectedValueOnce(mockRedisNoPermError);

      try {
        await service.createSentinelDatabaseModel(
          mockSessionMetadata,
          {
            ...mockSentinelDatabaseWithTlsAuth,
            connectionType: ConnectionType.STANDALONE,
            sentinelMaster: {
              ...mockSentinelDatabaseWithTlsAuth.sentinelMaster,
              name: 'not existing master group',
            },
          },
          mockStandaloneRedisClient,
        );
        fail();
      } catch (e) {
        // todo: returned BadRequest. why not Forbidden?
        // expect(e).toBeInstanceOf(ForbiddenException);
        expect(e.message).toEqual(mockRedisNoPermError.message);
      }
    });
  });
});
