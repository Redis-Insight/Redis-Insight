import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  mockDatabase,
  MockType,
  mockDatabaseId,
  mockBrowserHistoryRepository,
  mockBrowserHistory,
  mockClientMetadata,
  mockSessionMetadata,
  mockCreateBrowserHistoryDto,
} from 'src/__mocks__';
import { BrowserHistoryMode } from 'src/common/constants';
import { BrowserHistoryService } from 'src/modules/browser/browser-history/browser-history.service';
import { BrowserHistoryRepository } from './repositories/browser-history.repository';

describe('BrowserHistoryService', () => {
  let service: BrowserHistoryService;
  let browserHistoryRepository: MockType<BrowserHistoryRepository>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrowserHistoryService,
        {
          provide: BrowserHistoryRepository,
          useFactory: mockBrowserHistoryRepository,
        },
      ],
    }).compile();

    service = await module.get(BrowserHistoryService);
    browserHistoryRepository = await module.get(BrowserHistoryRepository);
  });

  describe('create', () => {
    it('should create new database and send analytics event', async () => {
      browserHistoryRepository.create.mockResolvedValue(mockBrowserHistory);
      expect(await service.create(mockClientMetadata, mockBrowserHistory)).toEqual(mockBrowserHistory);
    });
    it('should throw NotFound if no browser history?', async () => {
      browserHistoryRepository.create.mockRejectedValueOnce(new Error());
      await expect(service.create(mockClientMetadata, mockBrowserHistory))
        .rejects.toThrow(new Error());
    });
  });

  describe('get', () => {
    it('should return browser history by id', async () => {
      browserHistoryRepository.get.mockResolvedValue(mockCreateBrowserHistoryDto);
      expect(await service.get(mockSessionMetadata, mockDatabase.id)).toEqual(mockCreateBrowserHistoryDto);
    });
  });

  describe('list', () => {
    it('should return browser history items', async () => {
      browserHistoryRepository.list.mockResolvedValue([mockBrowserHistory, mockBrowserHistory]);
      expect(await service.list(mockSessionMetadata, mockDatabaseId, BrowserHistoryMode.Pattern))
        .toEqual([mockBrowserHistory, mockBrowserHistory]);
    });
    it('should throw Error?', async () => {
      browserHistoryRepository.list.mockRejectedValueOnce(new Error());
      await expect(service.list(
        mockSessionMetadata,
        mockDatabaseId,
        BrowserHistoryMode.Pattern,
      )).rejects.toThrow(Error);
    });
  });

  describe('delete', () => {
    it('should remove existing browser history item', async () => {
      browserHistoryRepository.delete.mockResolvedValue(mockBrowserHistory);
      expect(await service.delete(mockSessionMetadata, mockBrowserHistory.databaseId, BrowserHistoryMode.Pattern))
        .toEqual(mockBrowserHistory);
    });
    it('should throw NotFoundException? on any error during deletion', async () => {
      browserHistoryRepository.delete.mockRejectedValueOnce(new NotFoundException());
      await expect(service.delete(mockSessionMetadata, mockBrowserHistory.databaseId, BrowserHistoryMode.Pattern))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('bulkDelete', () => {
    it('should remove multiple browser history items', async () => {
      expect(await service.bulkDelete(
        mockSessionMetadata,
        mockBrowserHistory.databaseId,
        [mockDatabase.id],
      ))
        .toEqual({ affected: 1 });
    });
    it('should ignore errors and do not count affected', async () => {
      browserHistoryRepository.delete.mockRejectedValueOnce(new NotFoundException());
      expect(await service.bulkDelete(mockSessionMetadata, mockBrowserHistory.databaseId, [mockDatabase.id]))
        .toEqual({ affected: 0 });
    });
  });
});
