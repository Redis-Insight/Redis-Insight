import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { when } from 'jest-when';
import { ReplyError } from 'src/models/redis-client';
import {
  mockRedisNoPermError,
  MockType,
  mockBrowserClientMetadata,
  mockBrowserHistoryService,
  mockDatabaseRecommendationService, mockDatabaseClientFactory, mockStandaloneRedisClient, mockClusterRedisClient,
} from 'src/__mocks__';
import ERROR_MESSAGES from 'src/constants/error-messages';
import { RECOMMENDATION_NAMES } from 'src/constants';
import {
  GetKeyInfoResponse,
  GetKeysDto,
  GetKeysWithDetailsResponse,
  RedisDataType,
  RenameKeyDto,
} from 'src/modules/browser/keys/dto';
import { BrowserToolKeysCommands } from 'src/modules/browser/constants/browser-tool-commands';
import { DatabaseRecommendationService } from 'src/modules/database-recommendation/database-recommendation.service';
import { KeysService } from 'src/modules/browser/keys/keys.service';
import { BrowserHistoryService } from 'src/modules/browser/browser-history/browser-history.service';
import { Scanner } from 'src/modules/browser/keys/scanner/scanner';
import { mockScanner, mockScannerStrategy, mockTypeInfoStrategy } from 'src/modules/browser/__mocks__';
import { KeyInfoProvider } from 'src/modules/browser/keys/key-info/key-info.provider';
import { DatabaseClientFactory } from 'src/modules/database/providers/database.client.factory';

const getKeyInfoResponse: GetKeyInfoResponse = {
  name: Buffer.from('testString'),
  type: 'string',
  ttl: -1,
  size: 50,
};

const mockGetKeysWithDetailsResponse: GetKeysWithDetailsResponse = {
  cursor: 0,
  total: 1,
  scanned: 0,
  keys: [getKeyInfoResponse],
};

describe('KeysService', () => {
  let service: KeysService;
  let databaseClientFactory: MockType<DatabaseClientFactory>;
  let browserHistoryService: MockType<BrowserHistoryService>;
  let recommendationService: MockType<DatabaseRecommendationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KeysService,
        {
          provide: DatabaseClientFactory,
          useFactory: mockDatabaseClientFactory,
        },
        {
          provide: BrowserHistoryService,
          useFactory: mockBrowserHistoryService,
        },
        {
          provide: DatabaseRecommendationService,
          useFactory: mockDatabaseRecommendationService,
        },
        {
          provide: Scanner,
          useFactory: mockScanner,
        },
        {
          provide: KeyInfoProvider,
          useFactory: () => ({
            getStrategy: jest.fn().mockReturnValue(mockTypeInfoStrategy),
          }),
        },
      ],
    }).compile();

    service = module.get<KeysService>(KeysService);
    databaseClientFactory = module.get(DatabaseClientFactory);
    recommendationService = module.get(DatabaseRecommendationService);
    browserHistoryService = module.get(BrowserHistoryService);
  });

  describe('getKeyInfo', () => {
    beforeEach(() => {
      when(mockStandaloneRedisClient.sendCommand)
        .calledWith([
          BrowserToolKeysCommands.Type,
          getKeyInfoResponse.name,
        ],
        { replyEncoding: 'utf8' })
        .mockResolvedValue(RedisDataType.String);
    });

    it('should return appropriate value', async () => {
      const mockResult: GetKeyInfoResponse = {
        ...getKeyInfoResponse,
        length: 10,
      };
      mockTypeInfoStrategy.getInfo.mockResolvedValue(mockResult);

      const result = await service.getKeyInfo(
        mockBrowserClientMetadata,
        getKeyInfoResponse.name,
      );

      expect(result).toEqual(mockResult);
    });
    it('throw NotFound error when key not found for getKeyInfo', async () => {
      when(mockStandaloneRedisClient.sendCommand)
        .calledWith([
          BrowserToolKeysCommands.Type,
          getKeyInfoResponse.name,
        ],
        { replyEncoding: 'utf8' })
        .mockResolvedValue('none');

      await expect(
        service.getKeyInfo(mockBrowserClientMetadata, getKeyInfoResponse.name),
      ).rejects.toThrow(NotFoundException);
    });
    it("user don't have required permissions for getKeyInfo", async () => {
      const replyError: ReplyError = {
        ...mockRedisNoPermError,
        command: 'TYPE',
      };
      when(mockStandaloneRedisClient.sendCommand)
        .calledWith([
          BrowserToolKeysCommands.Type,
          getKeyInfoResponse.name,
        ],
        { replyEncoding: 'utf8' })
        .mockRejectedValue(replyError);

      await expect(
        service.getKeyInfo(mockBrowserClientMetadata, getKeyInfoResponse.name),
      ).rejects.toThrow(ForbiddenException);
    });
    it('should call recommendationService', async () => {
      const mockResult: GetKeyInfoResponse = {
        ...getKeyInfoResponse,
        length: 10,
      };
      mockTypeInfoStrategy.getInfo.mockResolvedValue(mockResult);

      const result = await service.getKeyInfo(
        mockBrowserClientMetadata,
        getKeyInfoResponse.name,
      );

      expect(recommendationService.check).toBeCalledWith(
        mockBrowserClientMetadata,
        RECOMMENDATION_NAMES.BIG_SETS,
        result,
      );
      expect(recommendationService.check).toBeCalledWith(
        mockBrowserClientMetadata,
        RECOMMENDATION_NAMES.BIG_STRINGS,
        result,
      );
      expect(recommendationService.check).toBeCalledWith(
        mockBrowserClientMetadata,
        RECOMMENDATION_NAMES.COMPRESSION_FOR_LIST,
        result,
      );
    });
  });

  describe('getKeysInfo', () => {
    beforeEach(() => {
      mockScannerStrategy.getKeysInfo.mockResolvedValue([getKeyInfoResponse]);
    });

    it('should return keys with info', async () => {
      const result = await service.getKeysInfo(
        mockBrowserClientMetadata,
        { keys: [getKeyInfoResponse.name] },
      );

      expect(result).toEqual([getKeyInfoResponse]);
    });
    it('should call recommendationService', async () => {
      const result = await service.getKeysInfo(
        mockBrowserClientMetadata,
        { keys: [getKeyInfoResponse.name] },
      );

      expect(recommendationService.check).toBeCalledTimes(1);
      expect(recommendationService.check).toBeCalledWith(
        mockBrowserClientMetadata,
        RECOMMENDATION_NAMES.SEARCH_JSON,
        { keys: result, client: mockStandaloneRedisClient, databaseId: mockBrowserClientMetadata.databaseId },
      );
    });
    it("user don't have required permissions for getKeyInfo", async () => {
      const replyError: ReplyError = {
        ...mockRedisNoPermError,
        command: 'TYPE',
      };

      mockScannerStrategy.getKeysInfo.mockRejectedValueOnce(replyError);

      await expect(
        service.getKeysInfo(mockBrowserClientMetadata, { keys: [getKeyInfoResponse.name] }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getKeys', () => {
    const getKeysDto: GetKeysDto = { cursor: '0', count: 15, countThreshold: 10000 };
    it('should return appropriate value for standalone database', async () => {
      mockScannerStrategy.getKeys.mockResolvedValue([mockGetKeysWithDetailsResponse]);

      const result = await service.getKeys(mockBrowserClientMetadata, getKeysDto);

      expect(mockScannerStrategy.getKeys).toHaveBeenCalled();
      expect(result).toEqual([mockGetKeysWithDetailsResponse]);
    });
    it('should return appropriate value for cluster', async () => {
      databaseClientFactory.getOrCreateClient.mockResolvedValueOnce(mockClusterRedisClient);
      mockScannerStrategy.getKeys.mockResolvedValue([mockGetKeysWithDetailsResponse]);

      const result = await service.getKeys(mockBrowserClientMetadata, getKeysDto);

      expect(mockScannerStrategy.getKeys).toHaveBeenCalled();
      expect(result).toEqual([mockGetKeysWithDetailsResponse]);
    });
    it("user don't have required permissions for getKeys", async () => {
      const replyError: ReplyError = {
        ...mockRedisNoPermError,
        command: 'SCAN',
      };
      mockScannerStrategy.getKeys.mockRejectedValue(replyError);

      await expect(
        service.getKeys(mockBrowserClientMetadata, getKeysDto),
      ).rejects.toThrow(ForbiddenException);
    });
    it('scan per type not supported', async () => {
      const dto: GetKeysDto = {
        ...getKeysDto,
        type: RedisDataType.String,
      };
      const replyError: ReplyError = {
        name: 'ReplyError',
        message: 'ERR syntax error',
        command: 'SCAN',
      };
      mockScannerStrategy.getKeys.mockRejectedValue(replyError);

      try {
        await service.getKeys(mockBrowserClientMetadata, dto);
        fail('Should throw an error');
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
        expect(err.message).toEqual(
          ERROR_MESSAGES.SCAN_PER_KEY_TYPE_NOT_SUPPORT(),
        );
      }
    });
    it('should call create browser history item if match !== "*"', async () => {
      mockScannerStrategy.getKeys.mockResolvedValue([mockGetKeysWithDetailsResponse]);

      await service.getKeys(mockBrowserClientMetadata, { ...getKeysDto, match: '1' });

      expect(mockScannerStrategy.getKeys).toHaveBeenCalled();
      expect(browserHistoryService.create).toHaveBeenCalled();
    });
    it('should do not call create browser history item if match === "*"', async () => {
      mockScannerStrategy.getKeys.mockResolvedValue([mockGetKeysWithDetailsResponse]);

      await service.getKeys(mockBrowserClientMetadata, { ...getKeysDto, match: '*' });

      expect(mockScannerStrategy.getKeys).toHaveBeenCalled();
      expect(browserHistoryService.create).not.toHaveBeenCalled();
    });
    it('should call recommendationService', async () => {
      const response = [mockGetKeysWithDetailsResponse];
      mockScannerStrategy.getKeys.mockResolvedValue(response);

      await service.getKeys(mockBrowserClientMetadata, { ...getKeysDto, match: '*' });

      expect(recommendationService.check).toBeCalledWith(
        mockBrowserClientMetadata,
        RECOMMENDATION_NAMES.USE_SMALLER_KEYS,
        response[0].total,
      );
    });
  });

  describe('deleteKeys', () => {
    const keyNames = ['testString1', 'testString2'];

    it('succeeded to delete keys', async () => {
      when(mockStandaloneRedisClient.sendCommand)
        .calledWith([
          BrowserToolKeysCommands.Del,
          ...keyNames,
        ])
        .mockResolvedValue(keyNames.length);

      const result = await service.deleteKeys(mockBrowserClientMetadata, [
        'testString1',
        'testString2',
      ]);
      expect(result).toEqual({ affected: keyNames.length });
    });
    it('keys not found', async () => {
      when(mockStandaloneRedisClient.sendCommand)
        .calledWith([
          BrowserToolKeysCommands.Del,
          ...keyNames,
        ])
        .mockResolvedValue(null);

      await expect(
        service.deleteKeys(mockBrowserClientMetadata, keyNames),
      ).rejects.toThrow(NotFoundException);
    });
    it("user don't have required permissions for deleteKeys", async () => {
      const replyError: ReplyError = {
        ...mockRedisNoPermError,
        command: 'DEL',
      };
      mockStandaloneRedisClient.sendCommand.mockRejectedValue(replyError);

      await expect(
        service.deleteKeys(mockBrowserClientMetadata, keyNames),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('renameKey', () => {
    const renameKeyDto: RenameKeyDto = {
      keyName: 'testString1',
      newKeyName: 'testString2',
    };

    it('succeeded to rename key', async () => {
      when(mockStandaloneRedisClient.sendCommand)
        .calledWith([
          BrowserToolKeysCommands.Exists,
          renameKeyDto.keyName,
        ])
        .mockResolvedValue(true);
      when(mockStandaloneRedisClient.sendCommand)
        .calledWith([
          BrowserToolKeysCommands.RenameNX,
          renameKeyDto.keyName,
          renameKeyDto.newKeyName,
        ])
        .mockResolvedValue(1);

      await expect(
        service.renameKey(mockBrowserClientMetadata, renameKeyDto),
      ).resolves.not.toThrow();
    });
    it('key with keyName not exist', async () => {
      when(mockStandaloneRedisClient.sendCommand)
        .calledWith([
          BrowserToolKeysCommands.Exists,
          renameKeyDto.keyName,
        ])
        .mockResolvedValue(false);

      await expect(
        service.renameKey(mockBrowserClientMetadata, renameKeyDto),
      ).rejects.toThrow(NotFoundException);
    });
    it('key with newKeyName already exists', async () => {
      when(mockStandaloneRedisClient.sendCommand)
        .calledWith([
          BrowserToolKeysCommands.Exists,
          renameKeyDto.keyName,
        ])
        .mockResolvedValue(true);
      when(mockStandaloneRedisClient.sendCommand)
        .calledWith([
          BrowserToolKeysCommands.RenameNX,
          renameKeyDto.keyName,
          renameKeyDto.newKeyName,
        ])
        .mockResolvedValue(0);

      await expect(
        service.renameKey(mockBrowserClientMetadata, renameKeyDto),
      ).rejects.toThrow(BadRequestException);
    });
    it("user don't have required permissions for renameKey", async () => {
      const replyError: ReplyError = {
        ...mockRedisNoPermError,
        command: 'RENAMENX',
      };
      mockStandaloneRedisClient.sendCommand.mockRejectedValue(replyError);

      await expect(
        service.renameKey(mockBrowserClientMetadata, renameKeyDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateTtl', () => {
    const keyName = 'testString';
    it('set expiration time', async () => {
      const dto = { keyName, ttl: 1000 };
      when(mockStandaloneRedisClient.sendCommand)
        .calledWith([BrowserToolKeysCommands.Ttl, keyName])
        .mockResolvedValue(-1);
      when(mockStandaloneRedisClient.sendCommand)
        .calledWith([
          BrowserToolKeysCommands.Expire,
          keyName,
          dto.ttl,
        ])
        .mockResolvedValue(1);

      const result = await service.updateTtl(mockBrowserClientMetadata, dto);

      expect(result).toEqual({ ttl: dto.ttl });
    });
    it('remove the existing timeout on key', async () => {
      const dto = { keyName, ttl: -1 };
      when(mockStandaloneRedisClient.sendCommand)
        .calledWith([BrowserToolKeysCommands.Ttl, keyName])
        .mockResolvedValue(1000);
      when(mockStandaloneRedisClient.sendCommand)
        .calledWith([
          BrowserToolKeysCommands.Persist,
          keyName,
        ])
        .mockResolvedValue(1);

      const result = await service.updateTtl(mockBrowserClientMetadata, dto);
      expect(result).toEqual({ ttl: dto.ttl });
    });
    it('key not found', async () => {
      when(mockStandaloneRedisClient.sendCommand)
        .calledWith([
          BrowserToolKeysCommands.Expire,
          keyName,
          1000,
        ])
        .mockResolvedValue(0);

      await expect(
        service.updateTtl(mockBrowserClientMetadata, { keyName, ttl: 1000 }),
      ).rejects.toThrow(NotFoundException);
    });
    it("user don't have required permissions for updateTtl", async () => {
      const replyError: ReplyError = {
        ...mockRedisNoPermError,
        command: 'EXPIRE',
      };
      mockStandaloneRedisClient.sendCommand.mockRejectedValue(replyError);

      await expect(
        service.updateTtl(mockBrowserClientMetadata, { keyName, ttl: 1000 }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('removeKeyExpiration', () => {
    const keyName = 'testString';
    it('should remove key expiration', async () => {
      when(mockStandaloneRedisClient.sendCommand)
        .calledWith([BrowserToolKeysCommands.Ttl, keyName])
        .mockResolvedValue(1000);

      const result = await service.removeKeyExpiration(mockBrowserClientMetadata, {
        keyName,
        ttl: -1,
      });
      expect(result).toEqual({ ttl: -1 });
      expect(mockStandaloneRedisClient.sendCommand).toHaveBeenCalledWith(
        [BrowserToolKeysCommands.Persist, keyName],
      );
    });
    it('key not found', async () => {
      when(mockStandaloneRedisClient.sendCommand)
        .calledWith([BrowserToolKeysCommands.Ttl, keyName])
        .mockResolvedValue(-2);

      await expect(
        service.removeKeyExpiration(mockBrowserClientMetadata, { keyName, ttl: -1 }),
      ).rejects.toThrow(NotFoundException);
    });
    it("user don't have required permissions for removeKeyExpiration", async () => {
      const replyError: ReplyError = {
        ...mockRedisNoPermError,
        command: 'TTL',
      };
      mockStandaloneRedisClient.sendCommand.mockRejectedValue(replyError);

      await expect(
        service.removeKeyExpiration(mockBrowserClientMetadata, { keyName, ttl: -1 }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
