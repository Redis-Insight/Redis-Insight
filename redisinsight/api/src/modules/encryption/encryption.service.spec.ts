import { Test, TestingModule } from '@nestjs/testing';
import {
  mockAppSettings,
  mockAppSettingsInitial,
  mockAppSettingsWithoutPermissions,
  mockEncryptionStrategyInstance,
  mockEncryptResult,
  mockKeyEncryptionStrategyInstance,
  mockKeyEncryptResult,
  mockSettingsService,
  MockType,
  mockConstantsProvider,
} from 'src/__mocks__';
import { EncryptionService } from 'src/modules/encryption/encryption.service';
import { PlainEncryptionStrategy } from 'src/modules/encryption/strategies/plain-encryption.strategy';
import { KeytarEncryptionStrategy } from 'src/modules/encryption/strategies/keytar-encryption.strategy';
import { EncryptionStrategy } from 'src/modules/encryption/models';
import { UnsupportedEncryptionStrategyException } from 'src/modules/encryption/exceptions';
import { SettingsService } from 'src/modules/settings/settings.service';
import { KeyEncryptionStrategy } from 'src/modules/encryption/strategies/key-encryption.strategy';
import { ConstantsProvider } from 'src/modules/constants/providers/constants.provider';

describe('EncryptionService', () => {
  let service: EncryptionService;
  let plainEncryptionStrategy: MockType<PlainEncryptionStrategy>;
  let keytarEncryptionStrategy: MockType<KeytarEncryptionStrategy>;
  let keyEncryptionStrategy: MockType<KeyEncryptionStrategy>;
  let settingsService: MockType<SettingsService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: PlainEncryptionStrategy,
          useFactory: mockEncryptionStrategyInstance,
        },
        {
          provide: KeytarEncryptionStrategy,
          useFactory: mockEncryptionStrategyInstance,
        },
        {
          provide: KeyEncryptionStrategy,
          useFactory: mockKeyEncryptionStrategyInstance,
        },
        {
          provide: SettingsService,
          useFactory: mockSettingsService,
        },
        {
          provide: ConstantsProvider,
          useFactory: mockConstantsProvider,
        },
      ],
    }).compile();

    service = module.get(EncryptionService);
    plainEncryptionStrategy = module.get(PlainEncryptionStrategy);
    keytarEncryptionStrategy = module.get(KeytarEncryptionStrategy);
    keyEncryptionStrategy = module.get(KeyEncryptionStrategy);
    settingsService = module.get(SettingsService);

    settingsService.getAppSettings.mockResolvedValue(mockAppSettings);
  });

  describe('getAvailableEncryptionStrategies', () => {
    it('Should return list 2 strategies available (KEYTAR and PLAIN)', async () => {
      keytarEncryptionStrategy.isAvailable.mockResolvedValueOnce(true);
      keyEncryptionStrategy.isAvailable.mockResolvedValueOnce(false);

      expect(await service.getAvailableEncryptionStrategies()).toEqual([
        EncryptionStrategy.PLAIN,
        EncryptionStrategy.KEYTAR,
      ]);
    });
    it('Should return list 2 strategies available (KEY and PLAIN)', async () => {
      keytarEncryptionStrategy.isAvailable.mockResolvedValueOnce(false);
      keyEncryptionStrategy.isAvailable.mockResolvedValueOnce(true);

      expect(await service.getAvailableEncryptionStrategies()).toEqual([
        EncryptionStrategy.PLAIN,
        EncryptionStrategy.KEY,
      ]);
    });
    it('Should return list 2 strategies available (KEY and PLAIN) even when KEYTAR available', async () => {
      keytarEncryptionStrategy.isAvailable.mockResolvedValueOnce(true);
      keyEncryptionStrategy.isAvailable.mockResolvedValueOnce(true);

      expect(await service.getAvailableEncryptionStrategies()).toEqual([
        EncryptionStrategy.PLAIN,
        EncryptionStrategy.KEY,
      ]);
    });
    it('Should return list with one strategy available', async () => {
      keytarEncryptionStrategy.isAvailable.mockResolvedValueOnce(false);
      keyEncryptionStrategy.isAvailable.mockResolvedValueOnce(false);

      expect(await service.getAvailableEncryptionStrategies()).toEqual([
        EncryptionStrategy.PLAIN,
      ]);
    });
  });

  describe('getEncryptionStrategy', () => {
    it('Should return KEYTAR strategy based on app agreements', async () => {
      expect(await service.getEncryptionStrategy()).toEqual(keytarEncryptionStrategy);
    });
    it('Should return KEY strategy based on app agreements even when KEYTAR available', async () => {
      keytarEncryptionStrategy.isAvailable.mockResolvedValueOnce(true);
      keyEncryptionStrategy.isAvailable.mockResolvedValueOnce(true);

      expect(await service.getEncryptionStrategy()).toEqual(keyEncryptionStrategy);
    });
    it('Should return PLAIN strategy based on app agreements even when KEY available', async () => {
      keyEncryptionStrategy.isAvailable.mockResolvedValueOnce(true);

      settingsService.getAppSettings.mockResolvedValueOnce(mockAppSettingsWithoutPermissions);

      expect(await service.getEncryptionStrategy()).toEqual(plainEncryptionStrategy);
    });
    it('Should throw an error if encryption strategy was not set by user', async () => {
      settingsService.getAppSettings.mockResolvedValueOnce(mockAppSettingsInitial);

      await expect(service.getEncryptionStrategy()).rejects.toThrow(UnsupportedEncryptionStrategyException);
    });
  });

  describe('encrypt', () => {
    it('Should encrypt data and return proper response (KEYTAR)', async () => {
      keyEncryptionStrategy.isAvailable.mockResolvedValueOnce(false);

      keytarEncryptionStrategy.encrypt.mockResolvedValueOnce(mockEncryptResult);

      expect(await service.encrypt('string')).toEqual(mockEncryptResult);
    });
    it('Should encrypt data and return proper response (KEY)', async () => {
      keyEncryptionStrategy.isAvailable.mockResolvedValueOnce(true);

      keyEncryptionStrategy.encrypt.mockResolvedValueOnce(mockKeyEncryptResult);

      expect(await service.encrypt('string')).toEqual(mockKeyEncryptResult);
    });
  });

  describe('decrypt', () => {
    it('Should return decrypted string (KEYTAR)', async () => {
      keyEncryptionStrategy.isAvailable.mockResolvedValueOnce(false);

      keytarEncryptionStrategy.decrypt.mockResolvedValueOnce(mockEncryptResult.data);

      expect(await service.decrypt('string', EncryptionStrategy.KEYTAR)).toEqual(mockEncryptResult.data);
    });
    it('Should return decrypted string (KEY)', async () => {
      keyEncryptionStrategy.isAvailable.mockResolvedValueOnce(true);

      keyEncryptionStrategy.decrypt.mockResolvedValueOnce(mockKeyEncryptResult.data);

      expect(await service.decrypt('string', EncryptionStrategy.KEY)).toEqual(mockKeyEncryptResult.data);
    });
    it('Should return null when no data passed', async () => {
      expect(await service.decrypt(null, EncryptionStrategy.KEYTAR)).toEqual(null);
    });
  });
});
