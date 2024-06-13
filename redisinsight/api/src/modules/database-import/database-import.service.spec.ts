import { pick } from 'lodash';
import { DatabaseImportService } from 'src/modules/database-import/database-import.service';
import {
  mockCertificateImportService,
  mockDatabase,
  mockDatabaseImportAnalytics,
  mockDatabaseImportFile,
  mockDatabaseImportResponse,
  mockSessionMetadata,
  mockSshImportService,
  MockType,
} from 'src/__mocks__';
import { DatabaseRepository } from 'src/modules/database/repositories/database.repository';
import { DatabaseImportAnalytics } from 'src/modules/database-import/database-import.analytics';
import { Test, TestingModule } from '@nestjs/testing';
import { ConnectionType, Compressor } from 'src/modules/database/entities/database.entity';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import {
  InvalidCaCertificateBodyException, InvalidCertificateNameException, InvalidClientCertificateBodyException,
  NoDatabaseImportFileProvidedException,
  SizeLimitExceededDatabaseImportFileException,
  UnableToParseDatabaseImportFileException,
} from 'src/modules/database-import/exceptions';
import { CertificateImportService } from 'src/modules/database-import/certificate-import.service';
import { SshImportService } from 'src/modules/database-import/ssh-import.service';

describe('DatabaseImportService', () => {
  let service: DatabaseImportService;
  let certificateImportService: MockType<CertificateImportService>;
  let databaseRepository: MockType<DatabaseRepository>;
  let analytics: MockType<DatabaseImportAnalytics>;
  let validatoSpy;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseImportService,
        {
          provide: DatabaseRepository,
          useFactory: jest.fn(() => ({
            create: jest.fn().mockResolvedValue(mockDatabase),
          })),
        },
        {
          provide: CertificateImportService,
          useFactory: mockCertificateImportService,
        },
        {
          provide: SshImportService,
          useFactory: mockSshImportService,
        },
        {
          provide: DatabaseImportAnalytics,
          useFactory: mockDatabaseImportAnalytics,
        },
      ],
    }).compile();

    service = await module.get(DatabaseImportService);
    databaseRepository = await module.get(DatabaseRepository);
    certificateImportService = await module.get(CertificateImportService);
    analytics = await module.get(DatabaseImportAnalytics);
    validatoSpy = jest.spyOn(service['validator'], 'validateOrReject');
  });

  describe('importDatabase', () => {
    beforeEach(() => {
      databaseRepository.create.mockRejectedValueOnce(new BadRequestException());
      databaseRepository.create.mockRejectedValueOnce(new ForbiddenException());
      validatoSpy.mockRejectedValueOnce([new ValidationError()]);
      certificateImportService.processCaCertificate
        .mockRejectedValueOnce(new InvalidCaCertificateBodyException())
        .mockRejectedValueOnce(new InvalidCaCertificateBodyException())
        .mockRejectedValueOnce(new InvalidCaCertificateBodyException())
        .mockRejectedValueOnce(new InvalidCaCertificateBodyException())
        .mockRejectedValueOnce(new InvalidCertificateNameException());
      certificateImportService.processClientCertificate
        .mockRejectedValueOnce(new InvalidClientCertificateBodyException())
        .mockRejectedValueOnce(new InvalidClientCertificateBodyException())
        .mockRejectedValueOnce(new InvalidClientCertificateBodyException())
        .mockRejectedValueOnce(new InvalidCertificateNameException());
    });

    it('should import databases from json', async () => {
      const response = await service.import(mockSessionMetadata, mockDatabaseImportFile);

      expect(response).toEqual(mockDatabaseImportResponse);
      expect(analytics.sendImportResults).toHaveBeenCalledWith(mockDatabaseImportResponse);
    });

    it('should import databases from base64', async () => {
      const response = await service.import(
        mockSessionMetadata,
        {
          ...mockDatabaseImportFile,
          mimetype: 'binary/octet-stream',
          buffer: Buffer.from(mockDatabaseImportFile.buffer.toString('base64')),
        },
      );

      expect(response).toEqual({
        ...mockDatabaseImportResponse,
      });
      expect(analytics.sendImportResults).toHaveBeenCalledWith(mockDatabaseImportResponse);
    });

    it('should fail due to file was not provided', async () => {
      try {
        await service.import(mockSessionMetadata, undefined);
        fail();
      } catch (e) {
        expect(e).toBeInstanceOf(NoDatabaseImportFileProvidedException);
        expect(e.message).toEqual('No import file provided');
        expect(analytics.sendImportFailed)
          .toHaveBeenCalledWith(new NoDatabaseImportFileProvidedException('No import file provided'));
      }
    });

    it('should fail due to file exceeded size limitations', async () => {
      try {
        await service.import(
          mockSessionMetadata,
          {
            ...mockDatabaseImportFile,
            size: 10 * 1024 * 1024 + 1,
          },
        );
        fail();
      } catch (e) {
        expect(e).toBeInstanceOf(SizeLimitExceededDatabaseImportFileException);
        expect(e.message).toEqual('Import file is too big. Maximum 10mb allowed');
      }
    });

    it('should fail due to incorrect json', async () => {
      try {
        await service.import(
          mockSessionMetadata,
          {
            ...mockDatabaseImportFile,
            buffer: Buffer.from([0, 21]),
          },
        );
        fail();
      } catch (e) {
        expect(e).toBeInstanceOf(UnableToParseDatabaseImportFileException);
        expect(e.message).toEqual(`Unable to parse ${mockDatabaseImportFile.originalname}`);
      }
    });

    it('should fail due to incorrect base64 + truncate filename', async () => {
      try {
        await service.import(
          mockSessionMetadata,
          {
            ...mockDatabaseImportFile,
            originalname: (new Array(1_000).fill(1)).join(''),
            mimetype: 'binary/octet-stream',
            buffer: Buffer.from([0, 21]),
          },
        );
        fail();
      } catch (e) {
        expect(e).toBeInstanceOf(UnableToParseDatabaseImportFileException);
        expect(e.message).toEqual(`Unable to parse ${(new Array(50).fill(1)).join('')}...`);
      }
    });
  });

  describe('createDatabase', () => {
    it('should create standalone database', async () => {
      await service['createDatabase'](
        mockSessionMetadata,
        {
          ...mockDatabase,
          provider: 'RE_CLOUD',
        },
        0,
      );

      expect(databaseRepository.create).toHaveBeenCalledWith(
        mockSessionMetadata,
        {
          ...pick(mockDatabase, ['host', 'port', 'name', 'connectionType', 'compressor', 'modules']),
          provider: 'RE_CLOUD',
          new: true,
        },
        false,
      );
    });
    it('should create standalone with created name', async () => {
      await service['createDatabase'](
        mockSessionMetadata,
        {
          ...mockDatabase,
          name: undefined,
        },
        0,
      );

      expect(databaseRepository.create).toHaveBeenCalledWith(
        mockSessionMetadata,
        {
          ...pick(mockDatabase, ['host', 'port', 'name', 'connectionType', 'compressor', 'modules']),
          name: `${mockDatabase.host}:${mockDatabase.port}`,
          new: true,
        },
        false,
      );
    });
    it('should create standalone with none compressor', async () => {
      await service['createDatabase'](
        mockSessionMetadata,
        {
          ...mockDatabase,
          compressor: 'custom',
        },
        0,
      );

      expect(databaseRepository.create).toHaveBeenCalledWith(
        mockSessionMetadata,
        {
          ...pick(mockDatabase, ['host', 'port', 'name', 'connectionType', 'compressor', 'modules']),
          compressor: Compressor.NONE,
          new: true,
        },
        false,
      );
    });
    it('should create standalone with compressor', async () => {
      await service['createDatabase'](
        mockSessionMetadata,
        {
          ...mockDatabase,
          compressor: Compressor.GZIP,
        },
        0,
      );

      expect(databaseRepository.create).toHaveBeenCalledWith(
        mockSessionMetadata,
        {
          ...pick(mockDatabase, ['host', 'port', 'name', 'connectionType', 'compressor', 'modules']),
          compressor: Compressor.GZIP,
          new: true,
        },
        false,
      );
    });
    it('should create cluster database', async () => {
      await service['createDatabase'](
        mockSessionMetadata,
        {
          ...mockDatabase,
          connectionType: undefined,
          cluster: true,
        },
        0,
      );

      expect(databaseRepository.create).toHaveBeenCalledWith(
        mockSessionMetadata,
        {
          ...pick(mockDatabase, ['host', 'port', 'name', 'compressor', 'modules']),
          connectionType: ConnectionType.CLUSTER,
          new: true,
        },
        false,
      );
    });
  });

  describe('determineConnectionType', () => {
    const tcs = [
      // common
      { input: {}, output: ConnectionType.NOT_CONNECTED },
      // isCluster
      { input: { isCluster: true }, output: ConnectionType.CLUSTER },
      { input: { isCluster: false }, output: ConnectionType.NOT_CONNECTED },
      { input: { isCluster: undefined }, output: ConnectionType.NOT_CONNECTED },
      // sentinelMasterName
      { input: { sentinelMasterName: 'some name' }, output: ConnectionType.SENTINEL },
      // connectionType
      { input: { connectionType: ConnectionType.STANDALONE }, output: ConnectionType.STANDALONE },
      { input: { connectionType: ConnectionType.CLUSTER }, output: ConnectionType.CLUSTER },
      { input: { connectionType: ConnectionType.SENTINEL }, output: ConnectionType.SENTINEL },
      { input: { connectionType: 'something not supported' }, output: ConnectionType.NOT_CONNECTED },
      // type
      { input: { type: 'standalone' }, output: ConnectionType.STANDALONE },
      { input: { type: 'cluster' }, output: ConnectionType.CLUSTER },
      { input: { type: 'sentinel' }, output: ConnectionType.SENTINEL },
      { input: { type: 'something not supported' }, output: ConnectionType.NOT_CONNECTED },
      // priority tests
      {
        input: {
          connectionType: ConnectionType.SENTINEL,
          type: 'standalone',
          isCluster: true,
          sentinelMasterName: 'some name',
        },
        output: ConnectionType.SENTINEL,
      },
      {
        input: {
          type: 'standalone',
          isCluster: true,
          sentinelMasterName: 'some name',
        },
        output: ConnectionType.STANDALONE,
      },
      {
        input: {
          isCluster: true,
          sentinelMasterName: 'some name',
        },
        output: ConnectionType.CLUSTER,
      },
      {
        input: {
          sentinelMasterName: 'some name',
        },
        output: ConnectionType.SENTINEL,
      },
    ];

    tcs.forEach((tc) => {
      it(`should return ${tc.output} when called with ${JSON.stringify(tc.input)}`, () => {
        expect(DatabaseImportService.determineConnectionType(tc.input)).toEqual(tc.output);
      });
    });
  });
});
