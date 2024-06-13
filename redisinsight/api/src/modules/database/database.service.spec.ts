import { InternalServerErrorException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { omit, get, update } from 'lodash';

import { classToClass } from 'src/utils';
import {
  mockDatabase,
  mockDatabaseAnalytics,
  mockDatabaseFactory,
  mockDatabaseInfoProvider,
  mockDatabaseRepository,
  mockCaCertificate,
  mockClientCertificate,
  MockType,
  mockRedisGeneralInfo,
  mockDatabaseWithTls,
  mockDatabaseWithTlsAuth,
  mockDatabaseWithSshPrivateKey,
  mockSentinelDatabaseWithTlsAuth,
  mockDatabaseWithCloudDetails, mockRedisClientFactory, mockRedisClientStorage, mockSessionMetadata,
} from 'src/__mocks__';
import { DatabaseAnalytics } from 'src/modules/database/database.analytics';
import { DatabaseService } from 'src/modules/database/database.service';
import { DatabaseRepository } from 'src/modules/database/repositories/database.repository';
import { DatabaseInfoProvider } from 'src/modules/database/providers/database-info.provider';
import { DatabaseFactory } from 'src/modules/database/providers/database.factory';
import { UpdateDatabaseDto } from 'src/modules/database/dto/update.database.dto';
import { RedisErrorCodes } from 'src/constants';
import ERROR_MESSAGES from 'src/constants/error-messages';
import { Compressor } from 'src/modules/database/entities/database.entity';
import { RedisClientFactory } from 'src/modules/redis/redis.client.factory';
import { RedisClientStorage } from 'src/modules/redis/redis.client.storage';
import { ExportDatabase } from './models/export-database';

const updateDatabaseTests = [
  { input: {}, expected: 0 },
  { input: { name: 'new name' }, expected: 0 },
  { input: { port: 6379 }, expected: 1 },
  { input: { host: 'new host' }, expected: 1 },
  { input: { username: 'user' }, expected: 1 },
  { input: { password: 'pass' }, expected: 1 },
  { input: { ssh: true }, expected: 1 },
  { input: { sshOptions: { password: 'pass' } }, expected: 1 },
  { input: { sentinelMaster: 'master' }, expected: 1 },
  { input: { caCert: mockCaCertificate }, expected: 1 },
  { input: { clientCert: mockClientCertificate }, expected: 1 },
  { input: { compressor: Compressor.NONE }, expected: 0 },
  { input: { timeout: 45_000 }, expected: 0 },
  { input: { port: 6379, timeout: 45_000 }, expected: 1 },
];

describe('DatabaseService', () => {
  let service: DatabaseService;
  let databaseRepository: MockType<DatabaseRepository>;
  let databaseFactory: MockType<DatabaseFactory>;
  let redisClientFactory: MockType<RedisClientFactory>;
  let analytics: MockType<DatabaseAnalytics>;
  const exportSecurityFields: string[] = [
    'password',
    'clientCert.key',
    'sshOptions.password',
    'sshOptions.passphrase',
    'sshOptions.privateKey',
    'sentinelMaster.password',
  ];

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventEmitter2,
        DatabaseService,
        {
          provide: DatabaseRepository,
          useFactory: mockDatabaseRepository,
        },
        {
          provide: RedisClientFactory,
          useFactory: mockRedisClientFactory,
        },
        {
          provide: RedisClientStorage,
          useFactory: mockRedisClientStorage,
        },
        {
          provide: DatabaseInfoProvider,
          useFactory: mockDatabaseInfoProvider,
        },
        {
          provide: DatabaseFactory,
          useFactory: mockDatabaseFactory,
        },
        {
          provide: DatabaseAnalytics,
          useFactory: mockDatabaseAnalytics,
        },
      ],
    }).compile();

    service = await module.get(DatabaseService);
    databaseRepository = await module.get(DatabaseRepository);
    databaseFactory = await module.get(DatabaseFactory);
    redisClientFactory = await module.get(RedisClientFactory);
    analytics = await module.get(DatabaseAnalytics);
  });

  describe('exists', () => {
    it('should return true if database exists', async () => {
      expect(await service.exists(mockSessionMetadata, mockDatabase.id)).toEqual(true);
    });
  });

  describe('list', () => {
    it('should return databases and send analytics event', async () => {
      databaseRepository.list.mockResolvedValue([mockDatabase, mockDatabase]);
      expect(await service.list(mockSessionMetadata)).toEqual([mockDatabase, mockDatabase]);
    });
    it('should throw InternalServerErrorException?', async () => {
      databaseRepository.list.mockRejectedValueOnce(new Error());
      await expect(service.list(mockSessionMetadata)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('get', () => {
    it('should return database by id', async () => {
      expect(await service.get(mockSessionMetadata, mockDatabase.id)).toEqual(mockDatabase);
    });
    it('should throw NotFound if no database found', async () => {
      databaseRepository.get.mockResolvedValueOnce(null);
      await expect(service.get(mockSessionMetadata, mockDatabase.id)).rejects.toThrow(NotFoundException);
    });
    it('should throw NotFound if no database id was provided', async () => {
      await expect(service.get(mockSessionMetadata, '')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create new database and send analytics event', async () => {
      expect(await service.create(mockSessionMetadata, mockDatabase)).toEqual(mockDatabase);
      expect(analytics.sendInstanceAddedEvent).toHaveBeenCalledWith(mockDatabase, mockRedisGeneralInfo);
      expect(analytics.sendInstanceAddFailedEvent).not.toHaveBeenCalled();
    });
    it('should create new database with cloud details and send analytics event', async () => {
      databaseRepository.create.mockResolvedValueOnce(mockDatabaseWithCloudDetails);
      expect(await service.create(mockSessionMetadata, mockDatabaseWithCloudDetails))
        .toEqual(mockDatabaseWithCloudDetails);
      expect(analytics.sendInstanceAddedEvent).toHaveBeenCalledWith(mockDatabaseWithCloudDetails, mockRedisGeneralInfo);
      expect(analytics.sendInstanceAddFailedEvent).not.toHaveBeenCalled();
    });
    it('should not fail when collecting data for analytics event', async () => {
      redisClientFactory.createClient.mockRejectedValueOnce(new Error());
      expect(await service.create(mockSessionMetadata, mockDatabase)).toEqual(mockDatabase);
      expect(analytics.sendInstanceAddedEvent).not.toHaveBeenCalled();
      expect(analytics.sendInstanceAddFailedEvent).not.toHaveBeenCalled();
    });
    it('should throw NotFound if no database?', async () => {
      databaseRepository.create.mockRejectedValueOnce(new NotFoundException());
      await expect(service.create(mockSessionMetadata, mockDatabase)).rejects.toThrow(NotFoundException);
      expect(analytics.sendInstanceAddFailedEvent).toHaveBeenCalledWith(new NotFoundException());
    });
  });

  describe('update', () => {
    it('should update existing database and send analytics event', async () => {
      databaseRepository.update.mockReturnValue({
        ...mockDatabase,
        port: 6380,
        password: 'password',
      });

      expect(await service.update(
        mockSessionMetadata,
        mockDatabase.id,
        classToClass(UpdateDatabaseDto, { password: 'password', port: 6380 }),
        true,
      )).toEqual({ ...mockDatabase, port: 6380, password: 'password' });
      expect(analytics.sendInstanceEditedEvent).toHaveBeenCalledWith(
        mockDatabase,
        { ...mockDatabase, port: 6380, password: 'password' },
        true,
      );
    });

    it('should update existing database with merged ssh options', async () => {
      databaseRepository.get.mockResolvedValueOnce(mockDatabaseWithSshPrivateKey);

      await service.update(
        mockSessionMetadata,
        mockDatabase.id,
        classToClass(UpdateDatabaseDto, { password: 'pass', sshOptions: { password: 'new password' } }),
        true,
      );
      expect(databaseFactory.createDatabaseModel).toBeCalledWith(
        mockSessionMetadata,
        {
          timeout: 30000,
          compressor: Compressor.NONE,
          id: 'a77b23c1-7816-4ea4-b61f-d37795a0f805-db-id',
          name: 'database-name',
          host: '127.0.100.1',
          port: 6379,
          connectionType: 'STANDALONE',
          new: false,
          version: '7.0',
          ssh: true,
          sshOptions: {
            id: 'a77b23c1-7816-4ea4-b61f-d37795a0f805-ssh-id',
            host: 'ssh.host.test',
            port: 22,
            username: 'ssh-username',
            password: 'new password',
            privateKey: '-----BEGIN OPENSSH PRIVATE KEY-----\nssh-private-key',
            passphrase: 'ssh-passphrase',
          },
          password: 'pass',
        },
      );
    });

    it('should update existing database with new ssh options', async () => {
      await service.update(
        mockSessionMetadata,
        mockDatabase.id,
        classToClass(UpdateDatabaseDto, {
          ssh: true,
          sshOptions: {
            id: 'a77b23c1-7816-4ea4-b61f-d37795a0f805-ssh-id',
            host: 'ssh.host.test',
            port: 22,
            username: 'ssh-username',
            password: null,
            privateKey: '-----BEGIN OPENSSH PRIVATE KEY-----\nssh-private-key',
            passphrase: 'ssh-passphrase',
          },
        }),
        true,
      );
      expect(databaseFactory.createDatabaseModel).toBeCalledWith(
        mockSessionMetadata,
        {
          timeout: 30000,
          compressor: Compressor.NONE,
          name: 'database-name',
          id: 'a77b23c1-7816-4ea4-b61f-d37795a0f805-db-id',
          host: '127.0.100.1',
          port: 6380,
          password: 'password',
          connectionType: 'STANDALONE',
          new: false,
          version: '7.0',
          ssh: true,
          sshOptions: {
            host: 'ssh.host.test',
            port: 22,
            username: 'ssh-username',
            password: null,
            privateKey: '-----BEGIN OPENSSH PRIVATE KEY-----\nssh-private-key',
            passphrase: 'ssh-passphrase',
          },
        },
      );
    });

    describe('test connection', () => {
      test.each(updateDatabaseTests)(
        '%j',
        async ({ input, expected }) => {
          databaseRepository.update.mockReturnValue(null);
          await service.update(
            mockSessionMetadata,
            mockDatabase.id,
            input as UpdateDatabaseDto,
            true,
          );
          expect(databaseFactory.createDatabaseModel).toBeCalledTimes(expected);
        },
      );
    });
    it('should throw NotFound if no database?', async () => {
      databaseRepository.update.mockRejectedValueOnce(new NotFoundException());
      await expect(service.update(
        mockSessionMetadata,
        mockDatabase.id,
        classToClass(UpdateDatabaseDto, { password: 'password' }),
        true,
      )).rejects.toThrow(NotFoundException);
    });
  });

  describe('test', () => {
    describe('new connection', () => {
      it('should successfully test valid connection config', async () => {
        expect(await service.testConnection(mockSessionMetadata, mockDatabase)).toEqual(undefined);
      });
      it('should successfully test valid sentinel config (without sentinelMaster)', async () => {
        databaseFactory.createDatabaseModel.mockRejectedValueOnce(new Error(RedisErrorCodes.SentinelParamsRequired));
        expect(await service.testConnection(mockSessionMetadata, mockDatabase)).toEqual(undefined);
      });
      it('should throw connection error', async () => {
        databaseFactory.createDatabaseModel.mockRejectedValueOnce(new Error(RedisErrorCodes.ConnectionRefused));

        await expect(service.testConnection(mockSessionMetadata, mockDatabase))
          .rejects.toThrow(ServiceUnavailableException);
      });
      it('should not call get database by id', async () => {
        const spy = jest.spyOn(service as any, 'get');

        await service.testConnection(mockSessionMetadata, mockDatabase);
        expect(spy).not.toBeCalled();
      });
    });

    describe('exist connection', () => {
      it('should get database by id', async () => {
        const spy = jest.spyOn(service as any, 'get').mockResolvedValueOnce(mockDatabase);

        await service.testConnection(mockSessionMetadata, classToClass(UpdateDatabaseDto, {}), mockDatabase.id);

        expect(spy).toBeCalledWith(mockSessionMetadata, mockDatabase.id, false);
      });

      it('should test database connection with merged ssh options', async () => {
        databaseRepository.get.mockResolvedValueOnce(mockDatabaseWithSshPrivateKey);

        await service.testConnection(
          mockSessionMetadata,
          classToClass(UpdateDatabaseDto, { password: 'pass', sshOptions: { passphrase: 'new passphrase' } }),
          mockDatabase.id,
        );
        expect(databaseFactory.createDatabaseModel).toBeCalledWith(
          mockSessionMetadata,
          {
            ...mockDatabaseWithSshPrivateKey,
            password: 'pass',
            sshOptions: { ...mockDatabaseWithSshPrivateKey.sshOptions, passphrase: 'new passphrase' },
          },
        );
      });

      it('should test connection with new tls', async () => {
        databaseRepository.get.mockResolvedValueOnce(mockDatabaseWithTlsAuth);

        await service.testConnection(
          mockSessionMetadata,
          classToClass(
            UpdateDatabaseDto,
            {
              compressor: Compressor.GZIP,
              tls: true,
              caCert: {
                name: 'name',
                certificate: '-----BEGIN CERTIFICATE-----\ncertificate',
              },
            },
          ),
          mockDatabase.id,
        );
        expect(databaseFactory.createDatabaseModel).toBeCalledWith(
          mockSessionMetadata,
          {
            ...mockDatabaseWithTlsAuth,
            compressor: Compressor.GZIP,
            caCert: {
              certificate: '-----BEGIN CERTIFICATE-----\ncertificate',
              name: 'name',
            },
          },
        );
      });

      it('should test connection with exist tls', async () => {
        databaseRepository.get.mockResolvedValueOnce(mockDatabaseWithTlsAuth);

        await service.testConnection(
          mockSessionMetadata,
          classToClass(
            UpdateDatabaseDto,
            {
              compressor: Compressor.GZIP,
              tls: true,
              caCert: {
                id: 'new id',
              },
            },
          ),
          mockDatabase.id,
        );
        expect(databaseFactory.createDatabaseModel).toBeCalledWith(
          mockSessionMetadata,
          {
            ...mockDatabaseWithTlsAuth,
            compressor: Compressor.GZIP,
            caCert: {
              id: 'new id',
            },
          },
        );
      });
    });
  });

  describe('delete', () => {
    it('should remove existing database', async () => {
      expect(await service.delete(mockSessionMetadata, mockDatabase.id)).toEqual(undefined);
      expect(analytics.sendInstanceDeletedEvent).toHaveBeenCalledWith(mockDatabase);
    });
    it('should throw NotFound if no database', async () => {
      databaseRepository.get.mockResolvedValueOnce(null);
      await expect(service.delete(mockSessionMetadata, mockDatabase.id)).rejects.toThrow(NotFoundException);
    });
    it('should throw InternalServerErrorException? on any error during deletion', async () => {
      databaseRepository.delete.mockRejectedValueOnce(new NotFoundException());
      await expect(service.delete(mockSessionMetadata, mockDatabase.id)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('bulkDelete', () => {
    it('should remove multiple databases', async () => {
      expect(await service.bulkDelete(mockSessionMetadata, [mockDatabase.id])).toEqual({ affected: 1 });
    });
    it('should ignore errors and do not count affected', async () => {
      databaseRepository.delete.mockRejectedValueOnce(new NotFoundException());
      expect(await service.bulkDelete(mockSessionMetadata, [mockDatabase.id])).toEqual({ affected: 0 });
    });
  });

  describe('export', () => {
    it('should return multiple databases without Standalone secrets', async () => {
      databaseRepository.get.mockResolvedValueOnce(mockDatabaseWithTlsAuth);

      expect(await service.export(
        mockSessionMetadata,
        [mockDatabaseWithTlsAuth.id],
        false,
      )).toEqual([classToClass(ExportDatabase, omit(mockDatabaseWithTlsAuth, 'password'))]);
    });

    it('should return multiple databases without SSH secrets', async () => {
      // remove SSH secrets
      const mockDatabaseWithSshPrivateKeyTemp = { ...mockDatabaseWithSshPrivateKey };
      exportSecurityFields.forEach((field) => {
        if (get(mockDatabaseWithSshPrivateKeyTemp, field)) {
          update(mockDatabaseWithSshPrivateKeyTemp, field, () => undefined);
        }
      });

      databaseRepository.get.mockResolvedValueOnce(mockDatabaseWithSshPrivateKey);
      expect(await service.export(
        mockSessionMetadata,
        [mockDatabaseWithSshPrivateKey.id],
        false,
      )).toEqual([classToClass(ExportDatabase, mockDatabaseWithSshPrivateKeyTemp)]);
    });

    it('should return multiple databases without Sentinel secrets', async () => {
      // remove secrets
      const mockSentinelDatabaseWithTlsAuthTemp = { ...mockSentinelDatabaseWithTlsAuth };
      exportSecurityFields.forEach((field) => {
        if (get(mockSentinelDatabaseWithTlsAuthTemp, field)) {
          update(mockSentinelDatabaseWithTlsAuthTemp, field, () => null);
        }
      });

      databaseRepository.get.mockResolvedValue(mockSentinelDatabaseWithTlsAuth);

      expect(await service.export(
        mockSessionMetadata,
        [mockSentinelDatabaseWithTlsAuth.id],
        false,
      )).toEqual([classToClass(ExportDatabase, omit(mockSentinelDatabaseWithTlsAuthTemp, 'password'))]);
    });

    it('should return multiple databases with secrets', async () => {
      // Standalone
      databaseRepository.get.mockResolvedValueOnce(mockDatabaseWithTls);
      expect(await service.export(
        mockSessionMetadata,
        [mockDatabaseWithTls.id],
        true,
      )).toEqual([classToClass(ExportDatabase, mockDatabaseWithTls)]);

      // SSH
      databaseRepository.get.mockResolvedValueOnce(mockDatabaseWithSshPrivateKey);
      expect(await service.export(
        mockSessionMetadata,
        [mockDatabaseWithSshPrivateKey.id],
        true,
      )).toEqual([classToClass(ExportDatabase, mockDatabaseWithSshPrivateKey)]);

      // Sentinel
      databaseRepository.get.mockResolvedValueOnce(mockSentinelDatabaseWithTlsAuth);
      expect(await service.export(
        mockSessionMetadata,
        [mockSentinelDatabaseWithTlsAuth.id],
        true,
      )).toEqual([classToClass(ExportDatabase, mockSentinelDatabaseWithTlsAuth)]);
    });

    it('should ignore errors', async () => {
      databaseRepository.get.mockRejectedValueOnce(new NotFoundException());
      expect(await service.export(mockSessionMetadata, [mockDatabase.id])).toEqual([]);
    });

    it('should throw NotFoundException', async () => {
      await expect(service.export(mockSessionMetadata, [])).rejects.toThrow(NotFoundException);
      try {
        await service.export(mockSessionMetadata, []);
        fail();
      } catch (err) {
        expect(err).toBeInstanceOf(NotFoundException);
        expect(err.message).toEqual(ERROR_MESSAGES.INVALID_DATABASE_INSTANCE_ID);
      }
    });
  });

  describe('clone', () => {
    it('should create new database', async () => {
      const spy = jest.spyOn(service as any, 'create');
      await service.clone(
        mockSessionMetadata,
        mockDatabase.id,
        classToClass(UpdateDatabaseDto, {
          username: 'new-name',
          timeout: 40_000,
        }),
      );
      expect(spy).toBeCalledWith(
        mockSessionMetadata,
        omit({ ...mockDatabase, username: 'new-name', timeout: 40_000 }, ['sshOptions.id']),
      );
    });

    it('should create new database with merged ssh options', async () => {
      databaseRepository.get.mockResolvedValueOnce(mockDatabaseWithSshPrivateKey);

      await service.clone(
        mockSessionMetadata,
        mockDatabase.id,
        classToClass(
          UpdateDatabaseDto,
          { password: 'pass', sshOptions: { password: 'new password', passphrase: null, privateKey: null } },
        ),
      );
      expect(databaseFactory.createDatabaseModel).toBeCalledWith(
        mockSessionMetadata,
        {
          ...omit(mockDatabaseWithSshPrivateKey),
          password: 'pass',
          sshOptions: {
            ...mockDatabaseWithSshPrivateKey.sshOptions,
            password: 'new password',
            passphrase: null,
            privateKey: null,
          },
        },
      );
    });

    it('should update existing database with new ssh options', async () => {
      databaseRepository.get.mockResolvedValue(mockDatabase);

      await service.clone(
        mockSessionMetadata,
        mockDatabase.id,
        classToClass(UpdateDatabaseDto, {
          ssh: true,
          sshOptions: {
            host: 'ssh.host.test',
            port: 22,
            username: 'ssh-username',
            password: null,
            privateKey: '-----BEGIN OPENSSH PRIVATE KEY-----\nssh-private-key',
            passphrase: 'ssh-passphrase',
          },
        }),
      );
      expect(databaseFactory.createDatabaseModel).toBeCalledWith(
        mockSessionMetadata,
        {
          ...mockDatabase,
          ssh: true,
          sshOptions: {
            host: 'ssh.host.test',
            port: 22,
            username: 'ssh-username',
            password: null,
            privateKey: '-----BEGIN OPENSSH PRIVATE KEY-----\nssh-private-key',
            passphrase: 'ssh-passphrase',
          },
        },
      );
    });

    it('should create new database with new tls', async () => {
      databaseRepository.get.mockResolvedValueOnce(mockDatabaseWithTlsAuth);

      await service.clone(
        mockSessionMetadata,
        mockDatabase.id,
        classToClass(
          UpdateDatabaseDto,
          {
            compressor: Compressor.GZIP,
            tls: true,
            caCert: {
              name: 'name',
              certificate: '-----BEGIN CERTIFICATE-----\ncertificate',
            },
          },
        ),
      );
      expect(databaseFactory.createDatabaseModel).toBeCalledWith(
        mockSessionMetadata,
        {
          ...mockDatabaseWithTlsAuth,
          compressor: Compressor.GZIP,
          caCert: {
            certificate: '-----BEGIN CERTIFICATE-----\ncertificate',
            name: 'name',
          },
        },
      );
    });

    it('should create new database with exist tls', async () => {
      databaseRepository.get.mockResolvedValueOnce(mockDatabaseWithTlsAuth);

      await service.clone(
        mockSessionMetadata,
        mockDatabase.id,
        classToClass(
          UpdateDatabaseDto,
          {
            compressor: Compressor.GZIP,
            tls: true,
            caCert: {
              id: 'new id',
            },
          },
        ),
      );
      expect(databaseFactory.createDatabaseModel).toBeCalledWith(
        mockSessionMetadata,
        {
          ...mockDatabaseWithTlsAuth,
          compressor: Compressor.GZIP,
          caCert: {
            id: 'new id',
          },
        },
      );
    });

    describe('create database model', () => {
      test.each(updateDatabaseTests)(
        '%j',
        async ({ input, expected }) => {
          const spy = jest.spyOn(service as any, 'create');

          databaseRepository.update.mockReturnValue(null);
          await service.clone(
            mockSessionMetadata,
            mockDatabase.id,
            input as UpdateDatabaseDto,
          );
          expect(spy).toBeCalledTimes(expected);
          expect(analytics.sendInstanceAddedEvent).toBeCalled();
        },
      );
    });
  });
});
