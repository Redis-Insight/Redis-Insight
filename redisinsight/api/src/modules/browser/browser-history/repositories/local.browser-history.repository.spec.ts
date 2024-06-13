import { Test, TestingModule } from '@nestjs/testing';
import { when } from 'jest-when';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import {
  mockEncryptionService,
  mockEncryptResult,
  mockRepository,
  mockDatabase,
  MockType,
  mockQueryBuilderGetMany,
  mockQueryBuilderGetManyRaw,
  mockBrowserHistory,
  mockBrowserHistoryEntity,
  mockBrowserHistoryPartial,
  mockSessionMetadata,
} from 'src/__mocks__';
import { EncryptionService } from 'src/modules/encryption/encryption.service';
import { BrowserHistoryEntity } from 'src/modules/browser/browser-history/entities/browser-history.entity';
import ERROR_MESSAGES from 'src/constants/error-messages';
import { KeytarDecryptionErrorException } from 'src/modules/encryption/exceptions';
import { BrowserHistory } from 'src/modules/browser/browser-history/dto';
import { BrowserHistoryMode } from 'src/common/constants';
import { LocalBrowserHistoryRepository } from './local.browser-history.repository';

describe('LocalBrowserHistoryRepository', () => {
  let browserHistoryRepository: LocalBrowserHistoryRepository;
  let repository: MockType<Repository<BrowserHistory>>;
  let encryptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalBrowserHistoryRepository,
        {
          provide: getRepositoryToken(BrowserHistoryEntity),
          useFactory: mockRepository,
        },
        {
          provide: EncryptionService,
          useFactory: mockEncryptionService,
        },
      ],
    }).compile();

    browserHistoryRepository = module.get<LocalBrowserHistoryRepository>(LocalBrowserHistoryRepository);
    repository = module.get(getRepositoryToken(BrowserHistoryEntity));
    encryptionService = module.get<EncryptionService>(EncryptionService);

    // encryption mocks
    ['filter'].forEach((field) => {
      when(encryptionService.encrypt)
        .calledWith(JSON.stringify(mockBrowserHistory[field]))
        .mockReturnValue({
          ...mockEncryptResult,
          data: mockBrowserHistoryEntity[field],
        });
      when(encryptionService.decrypt)
        .calledWith(mockBrowserHistoryEntity[field], mockEncryptResult.encryption)
        .mockReturnValue(JSON.stringify(mockBrowserHistory[field]));
    });
  });

  describe('create', () => {
    it('should process new entity', async () => {
      repository.save.mockReturnValueOnce(mockBrowserHistoryEntity);
      expect(await browserHistoryRepository.create(
        mockSessionMetadata,
        mockBrowserHistoryPartial,
      )).toEqual(mockBrowserHistory);
    });
  });

  describe('get', () => {
    it('should get browser history item', async () => {
      repository.findOneBy.mockReturnValueOnce(mockBrowserHistoryEntity);

      expect(await browserHistoryRepository.get(
        mockSessionMetadata,
        mockBrowserHistory.id,
      )).toEqual(mockBrowserHistory);
    });
    it('should return null fields in case of decryption errors', async () => {
      when(encryptionService.decrypt)
        .calledWith(mockBrowserHistoryEntity['filter'], mockEncryptResult.encryption)
        .mockRejectedValueOnce(new KeytarDecryptionErrorException());
      repository.findOneBy.mockReturnValueOnce(mockBrowserHistoryEntity);

      expect(await browserHistoryRepository.get(mockSessionMetadata, mockBrowserHistory.id)).toEqual({
        ...mockBrowserHistory,
        filter: null,
      });
    });
    it('should throw an error', async () => {
      repository.findOneBy.mockReturnValueOnce(null);

      try {
        await browserHistoryRepository.get(mockSessionMetadata, mockBrowserHistory.id);
        fail();
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
        expect(e.message).toEqual(ERROR_MESSAGES.BROWSER_HISTORY_ITEM_NOT_FOUND);
      }
    });
  });

  describe('list', () => {
    it('should get list of browser history', async () => {
      mockQueryBuilderGetMany.mockReturnValueOnce([mockBrowserHistoryEntity]);
      expect(await browserHistoryRepository.list(
        mockSessionMetadata,
        mockBrowserHistory.databaseId,
        BrowserHistoryMode.Pattern,
      )).toMatchObject([{
        id: mockBrowserHistoryEntity.id,
        createdAt: mockBrowserHistoryEntity.createdAt,
        mode: mockBrowserHistoryEntity.mode,
        filter: {
          type: mockBrowserHistory.filter.type,
          match: mockBrowserHistory.filter.match,
        },
      }]);
    });
  });

  describe('delete', () => {
    it('Should not return anything on cleanup', async () => {
      repository.delete.mockReturnValueOnce(mockBrowserHistoryEntity);
      expect(await browserHistoryRepository.delete(
        mockSessionMetadata,
        mockBrowserHistory.databaseId,
        mockBrowserHistory.id,
      )).toEqual(undefined);
    });
    it('Should throw InternalServerErrorException when error during delete', async () => {
      repository.delete.mockRejectedValueOnce(new Error());
      await expect(browserHistoryRepository.delete(
        mockSessionMetadata,
        mockBrowserHistory.databaseId,
        mockBrowserHistory.id,
      )).rejects.toThrowError(InternalServerErrorException);
    });
  });

  describe('cleanupDatabaseHistory', () => {
    it('Should not return anything on cleanup', async () => {
      mockQueryBuilderGetManyRaw.mockReturnValue([
        { id: mockBrowserHistoryEntity.id },
        { id: mockBrowserHistoryEntity.id },
      ]);

      expect(await browserHistoryRepository.cleanupDatabaseHistory(
        mockSessionMetadata,
        mockDatabase.id,
        BrowserHistoryMode.Pattern,
      )).toEqual(undefined);
    });
  });
});
