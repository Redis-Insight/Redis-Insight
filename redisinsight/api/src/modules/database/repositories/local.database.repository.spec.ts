import { when } from 'jest-when';
import { pick, omit } from 'lodash';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  mockCaCertificateRepository,
  mockClientCertificateRepository,
  mockClusterDatabaseWithTlsAuth,
  mockClusterDatabaseWithTlsAuthEntity,
  mockDatabase,
  mockDatabaseEntity, mockDatabaseEntityWithCloudDetails,
  mockDatabaseId,
  mockDatabasePasswordEncrypted,
  mockDatabasePasswordPlain,
  mockDatabaseSentinelMasterPasswordEncrypted,
  mockDatabaseSentinelMasterPasswordPlain, mockDatabaseWithCloudDetails,
  mockDatabaseWithSshBasic,
  mockDatabaseWithSshBasicEntity,
  mockDatabaseWithSshPrivateKey,
  mockDatabaseWithSshPrivateKeyEntity,
  mockDatabaseWithTls,
  mockDatabaseWithTlsAuth,
  mockDatabaseWithTlsAuthEntity,
  mockDatabaseWithTlsEntity,
  mockEncryptionService,
  mockRepository,
  mockSentinelDatabaseWithTlsAuth,
  mockSentinelDatabaseWithTlsAuthEntity,
  mockSessionMetadata,
  mockSshOptionsBasicEntity,
  mockSshOptionsPassphraseEncrypted,
  mockSshOptionsPassphrasePlain,
  mockSshOptionsPasswordEncrypted,
  mockSshOptionsPasswordPlain,
  mockSshOptionsPrivateKeyEncrypted, mockSshOptionsPrivateKeyEntity,
  mockSshOptionsPrivateKeyPlain,
  mockSshOptionsUsernameEncrypted,
  mockSshOptionsUsernamePlain,
  MockType,
} from 'src/__mocks__';
import { EncryptionService } from 'src/modules/encryption/encryption.service';
import { LocalDatabaseRepository } from 'src/modules/database/repositories/local.database.repository';
import { DatabaseEntity } from 'src/modules/database/entities/database.entity';
import { CaCertificateRepository } from 'src/modules/certificate/repositories/ca-certificate.repository';
import { ClientCertificateRepository } from 'src/modules/certificate/repositories/client-certificate.repository';
import { cloneClassInstance } from 'src/utils';
import { SshOptionsEntity } from 'src/modules/ssh/entities/ssh-options.entity';
import ERROR_MESSAGES from 'src/constants/error-messages';
import { DatabaseAlreadyExistsException } from 'src/modules/database/exeptions';

const listFields = [
  'id', 'name', 'host', 'port', 'db', 'timeout',
  'connectionType', 'modules', 'lastConnection', 'version', 'cloudDetails',
];

describe('LocalDatabaseRepository', () => {
  let service: LocalDatabaseRepository;
  let encryptionService: MockType<EncryptionService>;
  let repository: MockType<Repository<DatabaseEntity>>;
  let sshOptionsRepository: MockType<Repository<SshOptionsEntity>>;
  let caCertRepository: MockType<CaCertificateRepository>;
  let clientCertRepository: MockType<ClientCertificateRepository>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalDatabaseRepository,
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
      ],
    }).compile();

    repository = await module.get(getRepositoryToken(DatabaseEntity));
    sshOptionsRepository = await module.get(getRepositoryToken(SshOptionsEntity));
    caCertRepository = await module.get(CaCertificateRepository);
    clientCertRepository = await module.get(ClientCertificateRepository);
    encryptionService = await module.get(EncryptionService);
    service = await module.get(LocalDatabaseRepository);

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
      .mockResolvedValue(mockDatabaseSentinelMasterPasswordPlain)
      .calledWith(mockSshOptionsUsernameEncrypted, jasmine.anything())
      .mockResolvedValue(mockSshOptionsUsernamePlain)
      .calledWith(mockSshOptionsPasswordEncrypted, jasmine.anything())
      .mockResolvedValue(mockSshOptionsPasswordPlain)
      .calledWith(mockSshOptionsPrivateKeyEncrypted, jasmine.anything())
      .mockResolvedValue(mockSshOptionsPrivateKeyPlain)
      .calledWith(mockSshOptionsPassphraseEncrypted, jasmine.anything())
      .mockResolvedValue(mockSshOptionsPassphrasePlain);
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
      })
      .calledWith(mockSshOptionsUsernamePlain)
      .mockResolvedValue({
        data: mockSshOptionsUsernameEncrypted,
        encryption: mockSshOptionsBasicEntity.encryption,
      })
      .calledWith(mockSshOptionsPasswordPlain)
      .mockResolvedValue({
        data: mockSshOptionsPasswordEncrypted,
        encryption: mockSshOptionsBasicEntity.encryption,
      })
      .calledWith(mockSshOptionsPrivateKeyPlain)
      .mockResolvedValue({
        data: mockSshOptionsPrivateKeyEncrypted,
        encryption: mockSshOptionsPrivateKeyEntity.encryption,
      })
      .calledWith(mockSshOptionsPassphrasePlain)
      .mockResolvedValue({
        data: mockSshOptionsPassphraseEncrypted,
        encryption: mockSshOptionsPrivateKeyEntity.encryption,
      });
  });

  describe('exists', () => {
    it('should return true when receive database entity', async () => {
      expect(await service.exists(mockSessionMetadata, mockDatabaseId)).toEqual(true);
    });

    it('should return false when no database received', async () => {
      repository.createQueryBuilder().getOne.mockResolvedValue(null);
      expect(await service.exists(mockSessionMetadata, mockDatabaseId)).toEqual(false);
    });
  });

  describe('get', () => {
    it('should return standalone database model', async () => {
      const result = await service.get(mockSessionMetadata, mockDatabaseId);

      expect(result).toEqual(mockDatabase);
      expect(caCertRepository.get).not.toHaveBeenCalled();
      expect(clientCertRepository.get).not.toHaveBeenCalled();
    });

    it('should return standalone database model with ssh enabled (basic)', async () => {
      repository.findOneBy.mockResolvedValue(mockDatabaseWithSshBasicEntity);
      const result = await service.get(mockSessionMetadata, mockDatabaseWithSshBasic.id);

      expect(result).toEqual(mockDatabaseWithSshBasic);
      expect(caCertRepository.get).not.toHaveBeenCalled();
      expect(clientCertRepository.get).not.toHaveBeenCalled();
    });

    it('should return standalone database model with ssh enabled (privateKey + passphrase)', async () => {
      repository.findOneBy.mockResolvedValue(mockDatabaseWithSshPrivateKeyEntity);
      const result = await service.get(mockSessionMetadata, mockDatabaseWithSshPrivateKey.id);

      expect(result).toEqual(mockDatabaseWithSshPrivateKey);
      expect(caCertRepository.get).not.toHaveBeenCalled();
      expect(clientCertRepository.get).not.toHaveBeenCalled();
    });

    it('should return standalone model with ca tls', async () => {
      repository.findOneBy.mockResolvedValue(mockDatabaseWithTlsEntity);

      const result = await service.get(mockSessionMetadata, mockDatabaseId);

      expect(result).toEqual(mockDatabaseWithTls);
      expect(caCertRepository.get).toHaveBeenCalled();
      expect(clientCertRepository.get).not.toHaveBeenCalled();
    });

    it('should return sentinel tls database model (with fields decryption)', async () => {
      repository.findOneBy.mockResolvedValue(mockSentinelDatabaseWithTlsAuthEntity);

      const result = await service.get(mockSessionMetadata, mockDatabaseId);

      expect(result).toEqual(mockSentinelDatabaseWithTlsAuth);
      expect(caCertRepository.get).toHaveBeenCalled();
      expect(clientCertRepository.get).toHaveBeenCalled();
    });

    it('should return cluster database model (with fields decryption)', async () => {
      repository.findOneBy.mockResolvedValue(mockClusterDatabaseWithTlsAuthEntity);

      const result = await service.get(mockSessionMetadata, mockDatabaseId);

      expect(result).toEqual(mockClusterDatabaseWithTlsAuth);
      expect(caCertRepository.get).toHaveBeenCalled();
      expect(clientCertRepository.get).toHaveBeenCalled();
    });

    it('should return null when database was not found', async () => {
      repository.findOneBy.mockResolvedValue(undefined);

      const result = await service.get(mockSessionMetadata, mockDatabaseId);

      expect(result).toEqual(null);
      expect(caCertRepository.get).not.toHaveBeenCalled();
      expect(clientCertRepository.get).not.toHaveBeenCalled();
    });

    it('should return standalone database model without omit fields', async () => {
      const omitFields = ['compressor', 'connectionType'];
      const result = await service.get(mockSessionMetadata, mockDatabaseId, false, omitFields);

      expect(result).toEqual(omit(mockDatabase, omitFields));
    });

    it('should return standalone database model without nested fields', async () => {
      const omitFields = ['compressor', 'sshOptions.passphrase', 'sshOptions.privateKey'];

      repository.findOneBy.mockResolvedValueOnce(mockDatabaseWithSshPrivateKeyEntity);
      const result = await service.get(mockSessionMetadata, mockDatabaseWithSshPrivateKey.id, false, omitFields);

      expect(result).toEqual(omit(cloneClassInstance(mockDatabaseWithSshPrivateKey), omitFields));
      expect(caCertRepository.get).not.toHaveBeenCalled();
      expect(clientCertRepository.get).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('should return list of databases with specific fields only', async () => {
      expect(await service.list(mockSessionMetadata)).toEqual([
        pick(mockDatabaseWithTlsAuth, ...listFields),
        pick(mockDatabaseWithTlsAuth, ...listFields),
      ]);
    });
    it('should return list with cloud details', async () => {
      repository.createQueryBuilder().getMany.mockResolvedValue([
        pick(mockDatabaseEntityWithCloudDetails, ...listFields),
        pick(mockDatabaseEntityWithCloudDetails, ...listFields),
      ]);

      expect(await service.list(mockSessionMetadata)).toEqual([
        pick(mockDatabaseWithCloudDetails, ...listFields),
        pick(mockDatabaseWithCloudDetails, ...listFields),
      ]);
    });
  });

  describe('create', () => {
    it('should create standalone database', async () => {
      const result = await service.create(mockSessionMetadata, mockDatabase, false);

      expect(result).toEqual(mockDatabase);
      expect(caCertRepository.create).not.toHaveBeenCalled();
      expect(clientCertRepository.create).not.toHaveBeenCalled();
    });

    it('should create standalone database with cloud details', async () => {
      repository.save.mockResolvedValue(mockDatabaseEntityWithCloudDetails);

      const result = await service.create(mockSessionMetadata, mockDatabaseWithCloudDetails, false);

      expect(result).toEqual(mockDatabaseWithCloudDetails);
      expect(caCertRepository.create).not.toHaveBeenCalled();
      expect(clientCertRepository.create).not.toHaveBeenCalled();
    });

    it('should create standalone database (with existing certificates)', async () => {
      repository.save.mockResolvedValueOnce(mockDatabaseWithTlsAuthEntity);

      const result = await service.create(mockSessionMetadata, mockDatabaseWithTlsAuth, false);

      expect(result).toEqual(mockDatabaseWithTlsAuth);
      expect(caCertRepository.create).not.toHaveBeenCalled();
      expect(clientCertRepository.create).not.toHaveBeenCalled();
    });

    it('should create standalone database (and certificates)', async () => {
      repository.save.mockResolvedValueOnce(mockDatabaseWithTlsAuthEntity);

      const result = await service.create(
        mockSessionMetadata,
        omit(cloneClassInstance(mockDatabaseWithTlsAuth), 'caCert.id', 'clientCert.id'),
        false,
      );

      expect(result).toEqual(mockDatabaseWithTlsAuth);
      expect(caCertRepository.create).toHaveBeenCalled();
      expect(clientCertRepository.create).toHaveBeenCalled();
    });

    it('should throw an error if create called with cloud details and have the same entity', async () => {
      repository.findOneBy.mockResolvedValueOnce(mockDatabaseEntity);
      try {
        await service.create(mockSessionMetadata, mockDatabaseEntityWithCloudDetails, true);
        fail();
      } catch (e) {
        expect(e).toBeInstanceOf(DatabaseAlreadyExistsException);
        expect(e.message).toEqual(ERROR_MESSAGES.DATABASE_ALREADY_EXISTS);
        expect(e.response?.resource?.databaseId).toEqual(mockDatabaseEntity.id);
        expect(repository.save).not.toHaveBeenCalled();
      }
    });
  });

  describe('update', () => {
    it('should update standalone database', async () => {
      repository.merge.mockReturnValue(mockDatabaseEntity);

      const result = await service.update(
        mockSessionMetadata,
        mockDatabaseId,
        {
          ...mockDatabase,
          caCert: null,
          clientCert: null,
          sshOptions: null,
        },
      );

      expect(result).toEqual({
        ...mockDatabase,
        caCert: null,
        clientCert: null,
        sshOptions: null,
      });
      expect(caCertRepository.create).not.toHaveBeenCalled();
      expect(clientCertRepository.create).not.toHaveBeenCalled();
      expect(sshOptionsRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should update standalone database with ssh enabled (basic)', async () => {
      repository.findOneBy.mockResolvedValue(mockDatabaseWithSshBasicEntity);
      repository.merge.mockReturnValue(mockDatabaseWithSshBasic);

      const result = await service.update(mockSessionMetadata, mockDatabaseId, mockDatabaseWithSshBasic);

      expect(result).toEqual(mockDatabaseWithSshBasic);
      expect(caCertRepository.create).not.toHaveBeenCalled();
      expect(clientCertRepository.create).not.toHaveBeenCalled();
    });

    it('should update standalone database with ssh enabled (privateKey)', async () => {
      repository.findOneBy.mockResolvedValue(mockDatabaseWithSshPrivateKeyEntity);
      repository.merge.mockReturnValue(mockDatabaseWithSshPrivateKey);

      const result = await service.update(mockSessionMetadata, mockDatabaseId, mockDatabaseWithSshPrivateKey);

      expect(result).toEqual(mockDatabaseWithSshPrivateKey);
      expect(caCertRepository.create).not.toHaveBeenCalled();
      expect(clientCertRepository.create).not.toHaveBeenCalled();
    });

    it('should update standalone database (with existing certificates)', async () => {
      repository.merge.mockReturnValue(mockDatabaseWithTlsAuth);
      repository.findOneBy.mockResolvedValueOnce(mockDatabaseWithTlsAuthEntity);
      repository.findOneBy.mockResolvedValueOnce(mockDatabaseWithTlsAuthEntity);

      const result = await service.update(mockSessionMetadata, mockDatabaseId, mockDatabaseWithTlsAuth);

      expect(result).toEqual(mockDatabaseWithTlsAuth);
      expect(caCertRepository.create).not.toHaveBeenCalled();
      expect(clientCertRepository.create).not.toHaveBeenCalled();
    });

    it('should update standalone database (and certificates)', async () => {
      repository.merge.mockReturnValue(mockDatabaseWithTlsAuth);
      repository.findOneBy.mockResolvedValueOnce(mockDatabaseWithTlsAuthEntity);
      repository.findOneBy.mockResolvedValueOnce(mockDatabaseWithTlsAuthEntity);

      const result = await service.update(
        mockSessionMetadata,
        mockDatabaseId,
        omit(mockDatabaseWithTlsAuth, 'caCert.id', 'clientCert.id'),
      );

      expect(result).toEqual(mockDatabaseWithTlsAuth);
      expect(caCertRepository.create).toHaveBeenCalled();
      expect(clientCertRepository.create).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete database by id', async () => {
      expect(await service.delete(mockSessionMetadata, mockDatabaseId)).toEqual(undefined);
    });
  });
});
