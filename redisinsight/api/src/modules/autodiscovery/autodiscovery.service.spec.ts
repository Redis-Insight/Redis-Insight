import * as utils from 'src/utils';
import { when } from 'jest-when';
import { getAvailableEndpoints } from 'src/modules/autodiscovery/utils/autodiscovery.util';
import { Test, TestingModule } from '@nestjs/testing';
import {
  mockAutodiscoveryEndpoint,
  mockDatabaseService,
  mockRedisClientFactory,
  mockSessionMetadata,
  mockSettingsService,
  MockType,
} from 'src/__mocks__';
import { SettingsService } from 'src/modules/settings/settings.service';
import { AutodiscoveryService } from 'src/modules/autodiscovery/autodiscovery.service';
import { DatabaseService } from 'src/modules/database/database.service';
import { mocked } from 'ts-jest/utils';
import config, { Config } from 'src/utils/config';
import { RedisClientFactory } from 'src/modules/redis/redis.client.factory';
import { ConstantsProvider } from 'src/modules/constants/providers/constants.provider';
import { mockConstantsProvider } from 'src/__mocks__/constants';

jest.mock(
  'src/modules/autodiscovery/utils/autodiscovery.util',
  jest.fn(() => ({
    ...jest.requireActual('src/modules/autodiscovery/utils/autodiscovery.util') as object,
    __esModule: true,
    getAvailableEndpoints: jest.fn(),
  })),
);

jest.mock(
  'src/utils',
  jest.fn(() => ({
    ...jest.requireActual('src/utils') as object,
    __esModule: true,
    convertRedisInfoReplyToObject: jest.fn(),
  })),
);

jest.mock('src/utils/config', jest.fn(
  () => jest.requireActual('src/utils/config') as object,
));

const mockServerConfig = config.get('server') as Config['server'];

describe('AutodiscoveryService', () => {
  let service: AutodiscoveryService;
  let settingsService: MockType<SettingsService>;
  let databaseService: MockType<DatabaseService>;
  let redisClientFactory: MockType<RedisClientFactory>;
  let configGetSpy;

  beforeEach(async () => {
    jest.clearAllMocks();

    configGetSpy = jest.spyOn(config, 'get');

    when(configGetSpy).calledWith('server').mockReturnValue(mockServerConfig);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutodiscoveryService,
        {
          provide: SettingsService,
          useFactory: mockSettingsService,
        },
        {
          provide: DatabaseService,
          useFactory: mockDatabaseService,
        },
        {
          provide: RedisClientFactory,
          useFactory: mockRedisClientFactory,
        },
        {
          provide: ConstantsProvider,
          useFactory: mockConstantsProvider,
        },
      ],
    }).compile();

    service = module.get(AutodiscoveryService);
    settingsService = module.get(SettingsService);
    databaseService = module.get(DatabaseService);
    redisClientFactory = module.get(RedisClientFactory);

    mocked(utils.convertRedisInfoReplyToObject).mockReturnValue({
      server: {
        redis_mode: 'standalone',
      },
    });
  });

  describe('onModuleInit', () => {
    let discoverDatabasesSpy;

    beforeEach(async () => {
      mockServerConfig.buildType = 'ELECTRON';
      settingsService.getAppSettings.mockResolvedValue({});
      databaseService.list.mockResolvedValue([]);
      discoverDatabasesSpy = jest.spyOn(service as any, 'discoverDatabases');
      discoverDatabasesSpy.mockResolvedValue(undefined);
    });

    it('should not discover databases REDIS_STACK builds', async () => {
      mockServerConfig.buildType = 'REDIS_STACK';

      await service.onModuleInit();

      expect(settingsService.getAppSettings).toHaveBeenCalledTimes(0);
      expect(databaseService.list).toHaveBeenCalledTimes(0);
      expect(discoverDatabasesSpy).toHaveBeenCalledTimes(0);
    });

    it('should not discover databases if not a first start', async () => {
      settingsService.getAppSettings.mockResolvedValue({ agreements: {} });

      await service.onModuleInit();

      expect(settingsService.getAppSettings).toHaveBeenCalledTimes(1);
      expect(databaseService.list).toHaveBeenCalledTimes(0);
      expect(discoverDatabasesSpy).toHaveBeenCalledTimes(0);
    });

    it('should not discover databases if already have databases', async () => {
      databaseService.list.mockResolvedValue([{}]);

      await service.onModuleInit();

      expect(settingsService.getAppSettings).toHaveBeenCalledTimes(1);
      expect(databaseService.list).toHaveBeenCalledTimes(1);
      expect(discoverDatabasesSpy).toHaveBeenCalledTimes(0);
    });

    it('should discover databases', async () => {
      await service.onModuleInit();

      expect(settingsService.getAppSettings).toHaveBeenCalledTimes(1);
      expect(databaseService.list).toHaveBeenCalledTimes(1);
      expect(discoverDatabasesSpy).toHaveBeenCalledTimes(1);
    });

    it('should not fail in case of an error', async () => {
      discoverDatabasesSpy.mockRejectedValueOnce(new Error());

      await service.onModuleInit();

      expect(settingsService.getAppSettings).toHaveBeenCalledTimes(1);
      expect(databaseService.list).toHaveBeenCalledTimes(1);
      expect(discoverDatabasesSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('discoverDatabases', () => {
    let addRedisDatabaseSpy;

    beforeEach(async () => {
      mocked(getAvailableEndpoints).mockResolvedValue([]);
      addRedisDatabaseSpy = jest.spyOn(service as any, 'addRedisDatabase');
      addRedisDatabaseSpy.mockResolvedValue(null);
    });

    it('should should not call addRedisDatabase when no endpoints found', async () => {
      await service['discoverDatabases']();

      expect(addRedisDatabaseSpy).toHaveBeenCalledTimes(0);
    });

    it('should should call addRedisDatabase 2 times', async () => {
      mocked(getAvailableEndpoints).mockResolvedValueOnce([mockAutodiscoveryEndpoint, mockAutodiscoveryEndpoint]);
      await service['discoverDatabases']();

      expect(addRedisDatabaseSpy).toHaveBeenCalledTimes(2);
      expect(addRedisDatabaseSpy).toHaveBeenCalledWith(
        mockAutodiscoveryEndpoint,
        jasmine.anything(),
        jasmine.anything(),
      );
    });
  });

  describe('addRedisDatabase', () => {
    it('should create database if redis_mode is standalone', async () => {
      await service['addRedisDatabase'](mockSessionMetadata, mockAutodiscoveryEndpoint);

      expect(databaseService.create).toHaveBeenCalledTimes(1);
      expect(databaseService.create).toHaveBeenCalledWith(
        mockSessionMetadata,
        {
          name: `${mockAutodiscoveryEndpoint.host}:${mockAutodiscoveryEndpoint.port}`,
          ...mockAutodiscoveryEndpoint,
        },
      );
    });

    it('should not create database if redis_mode is not standalone', async () => {
      mocked(utils.convertRedisInfoReplyToObject).mockReturnValueOnce({
        server: {
          redis_mode: 'cluster',
        },
      });

      await service['addRedisDatabase'](mockSessionMetadata, mockAutodiscoveryEndpoint);

      expect(databaseService.create).toHaveBeenCalledTimes(0);
    });

    it('should not fail in case of an error', async () => {
      redisClientFactory.createClient.mockRejectedValue(new Error());

      await service['addRedisDatabase'](mockSessionMetadata, mockAutodiscoveryEndpoint);

      expect(databaseService.create).toHaveBeenCalledTimes(0);
    });
  });
});
