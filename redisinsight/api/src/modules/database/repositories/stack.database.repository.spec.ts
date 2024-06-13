import { when } from 'jest-when';
import { pick } from 'lodash';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  mockCaCertificateRepository,
  mockClientCertificateRepository,
  mockConstantsProvider,
  mockDatabase,
  mockDatabaseEntity,
  mockDatabaseId,
  mockDatabasePasswordEncrypted,
  mockDatabasePasswordPlain,
  mockDatabaseSentinelMasterPasswordEncrypted,
  mockDatabaseSentinelMasterPasswordPlain,
  mockDatabaseWithTlsAuthEntity,
  mockEncryptionService,
  mockRepository,
  mockSessionMetadata,
  MockType,
} from 'src/__mocks__';
import { EncryptionService } from 'src/modules/encryption/encryption.service';
import { ConnectionType, DatabaseEntity } from 'src/modules/database/entities/database.entity';
import { CaCertificateRepository } from 'src/modules/certificate/repositories/ca-certificate.repository';
import { ClientCertificateRepository } from 'src/modules/certificate/repositories/client-certificate.repository';
import { StackDatabasesRepository } from 'src/modules/database/repositories/stack.databases.repository';
import config from 'src/utils/config';
import { NotImplementedException } from '@nestjs/common';
import { SshOptionsEntity } from 'src/modules/ssh/entities/ssh-options.entity';
import { ConstantsProvider } from 'src/modules/constants/providers/constants.provider';

const REDIS_STACK_CONFIG = config.get('redisStack');

const listFields = [
  'id', 'name', 'host', 'port', 'db',
  'connectionType', 'modules', 'lastConnection',
];

describe('StackDatabasesRepository', () => {
  let service: StackDatabasesRepository;
  let encryptionService: MockType<EncryptionService>;
  let repository: MockType<Repository<DatabaseEntity>>;
  let caCertRepository: MockType<CaCertificateRepository>;
  let clientCertRepository: MockType<ClientCertificateRepository>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StackDatabasesRepository,
        {
          provide: getRepositoryToken(DatabaseEntity),
          useFactory: mockRepository,
        },
        {
          provide: getRepositoryToken(SshOptionsEntity),
          useFactory: mockRepository,
        },
        {
          provide: EncryptionService,
          useFactory: mockEncryptionService,
        },
        {
          provide: CaCertificateRepository,
          useFactory: mockCaCertificateRepository,
        },
        {
          provide: ClientCertificateRepository,
          useFactory: mockClientCertificateRepository,
        },
        {
          provide: ConstantsProvider,
          useFactory: mockConstantsProvider,
        },
      ],
    }).compile();

    repository = await module.get(getRepositoryToken(DatabaseEntity));
    caCertRepository = await module.get(CaCertificateRepository);
    clientCertRepository = await module.get(ClientCertificateRepository);
    encryptionService = await module.get(EncryptionService);
    service = await module.get(StackDatabasesRepository);

    repository.findOneBy.mockResolvedValue(mockDatabaseEntity);
    repository.createQueryBuilder().getOne.mockResolvedValue(mockDatabaseEntity);
    repository.createQueryBuilder().getMany.mockResolvedValue([
      pick(mockDatabaseWithTlsAuthEntity, ...listFields),
      pick(mockDatabaseWithTlsAuthEntity, ...listFields),
    ]);
    repository.save.mockResolvedValue(mockDatabaseEntity);
    repository.update.mockResolvedValue(mockDatabaseEntity);

    when(encryptionService.decrypt)
      .calledWith(mockDatabasePasswordEncrypted, jasmine.anything())
      .mockResolvedValue(mockDatabasePasswordPlain)
      .calledWith(mockDatabaseSentinelMasterPasswordEncrypted, jasmine.anything())
      .mockResolvedValue(mockDatabaseSentinelMasterPasswordPlain);
    when(encryptionService.encrypt)
      .calledWith(mockDatabasePasswordPlain)
      .mockResolvedValue({
        data: mockDatabasePasswordEncrypted,
        encryption: mockDatabaseWithTlsAuthEntity.encryption,
      })
      .calledWith(mockDatabaseSentinelMasterPasswordPlain)
      .mockResolvedValue({
        data: mockDatabaseSentinelMasterPasswordEncrypted,
        encryption: mockDatabaseWithTlsAuthEntity.encryption,
      });
  });

  describe('onApplicationBootstrap', () => {
    it('should create stack database when it is not exist', async () => {
      repository.createQueryBuilder().getOne.mockResolvedValue(null);

      await service.onApplicationBootstrap();

      expect(repository.save).toHaveBeenCalledWith({
        id: REDIS_STACK_CONFIG.id,
        name: 'Redis Stack',
        host: 'localhost',
        port: 6379,
        connectionType: ConnectionType.STANDALONE,
        tls: false,
        verifyServerCert: false,
        lastConnection: null,
      });
    });

    it('should not fail in case of creation error', async () => {
      repository.createQueryBuilder().getOne.mockResolvedValue(null);
      repository.save.mockRejectedValueOnce(new Error());

      await service.onApplicationBootstrap();
    });

    it('should not save stack database if it is already exists', async () => {
      await service.onApplicationBootstrap();

      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('exists', () => {
    it('should return true when receive database entity', async () => {
      expect(await service.exists(mockSessionMetadata)).toEqual(true);
      expect(repository.createQueryBuilder().where).toHaveBeenCalledWith({ id: REDIS_STACK_CONFIG.id });
    });

    it('should return false when no database received', async () => {
      repository.createQueryBuilder().getOne.mockResolvedValue(null);
      expect(await service.exists(mockSessionMetadata)).toEqual(false);
      expect(repository.createQueryBuilder().where).toHaveBeenCalledWith({ id: REDIS_STACK_CONFIG.id });
    });
  });

  describe('get', () => {
    it('should return standalone database model', async () => {
      const result = await service.get(mockSessionMetadata, mockDatabaseId);

      expect(result).toEqual(mockDatabase);
      expect(repository.findOneBy).toHaveBeenCalledWith({ id: REDIS_STACK_CONFIG.id });
      expect(caCertRepository.get).not.toHaveBeenCalled();
      expect(clientCertRepository.get).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('should return list of databases with specific fields only', async () => {
      expect(await service.list(mockSessionMetadata)).toEqual([mockDatabase]);
      expect(repository.createQueryBuilder().getMany).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should create standalone database', async () => {
      await expect(service.create()).rejects.toThrow(NotImplementedException);
    });
  });

  describe('update', () => {
    it('should update standalone database', async () => {
      repository.merge.mockReturnValue(mockDatabase);

      const result = await service.update(mockSessionMetadata, mockDatabaseId, mockDatabase);

      expect(result).toEqual(mockDatabase);
    });
  });
});
