import * as MockedSocket from 'socket.io-mock';
import { Test, TestingModule } from '@nestjs/testing';
import {
  mockBulkActionsAnalytics,
  mockDatabaseClientFactory,
  mockSessionMetadata,
} from 'src/__mocks__';
import { BulkActionsProvider } from 'src/modules/bulk-actions/providers/bulk-actions.provider';
import { RedisDataType } from 'src/modules/browser/keys/dto';
import { BulkActionType } from 'src/modules/bulk-actions/constants';
import { CreateBulkActionDto } from 'src/modules/bulk-actions/dto/create-bulk-action.dto';
import { BulkActionFilter } from 'src/modules/bulk-actions/models/bulk-action-filter';
import { BulkAction } from 'src/modules/bulk-actions/models/bulk-action';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BulkActionsAnalytics } from 'src/modules/bulk-actions/bulk-actions.analytics';
import { DatabaseClientFactory } from 'src/modules/database/providers/database.client.factory';

export const mockSocket1 = new MockedSocket();
mockSocket1.id = '1';
mockSocket1['emit'] = jest.fn();

export const mockSocket2 = new MockedSocket();
mockSocket2.id = '2';
mockSocket2['emit'] = jest.fn();

const mockBulkActionFilter = Object.assign(new BulkActionFilter(), {
  count: 10_000,
  match: '*',
  type: RedisDataType.Set,
});

const mockCreateBulkActionDto = Object.assign(new CreateBulkActionDto(), {
  id: 'bulk-action-id',
  databaseId: 'database-id',
  type: BulkActionType.Delete,
  filter: mockBulkActionFilter,
});

describe('BulkActionsProvider', () => {
  let service: BulkActionsProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BulkActionsProvider,
        {
          provide: DatabaseClientFactory,
          useFactory: mockDatabaseClientFactory,
        },
        {
          provide: BulkActionsAnalytics,
          useFactory: mockBulkActionsAnalytics,
        },
      ],
    }).compile();

    service = module.get(BulkActionsProvider);
  });

  describe('create', () => {
    it('should create only once with the same id', async () => {
      expect(service['bulkActions'].size).toEqual(0);

      const bulkAction = await service.create(mockSessionMetadata, mockCreateBulkActionDto, mockSocket1);

      expect(bulkAction).toBeInstanceOf(BulkAction);
      expect(service['bulkActions'].size).toEqual(1);

      try {
        await service.create(mockSessionMetadata, mockCreateBulkActionDto, mockSocket1);
        fail();
      } catch (e) {
        expect(e.message).toEqual('You already have bulk action with such id');
      }

      expect(service['bulkActions'].size).toEqual(1);

      await service.create(mockSessionMetadata, { ...mockCreateBulkActionDto, id: 'new one' }, mockSocket1);

      expect(service['bulkActions'].size).toEqual(2);
    });
    it('should fail when unsupported runner class', async () => {
      try {
        await service.create(mockSessionMetadata, {
          ...mockCreateBulkActionDto,
          type: undefined,
        }, mockSocket1);
        fail();
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
      }
    });
  });
  describe('get', () => {
    it('should get by id', async () => {
      const bulkAction = await service.create(mockSessionMetadata, mockCreateBulkActionDto, mockSocket1);
      await service.create(mockSessionMetadata, { ...mockCreateBulkActionDto, id: 'new one' }, mockSocket1);

      expect(service['bulkActions'].size).toEqual(2);

      expect(service.get(mockCreateBulkActionDto.id)).toEqual(bulkAction);
    });
    it('should throw not found error', async () => {
      try {
        expect(service['bulkActions'].size).toEqual(0);

        service.get(mockCreateBulkActionDto.id);

        fail();
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
      }
    });
  });
  describe('abort', () => {
    it('should abort by id and remove', async () => {
      const bulkAction = await service.create(mockSessionMetadata, mockCreateBulkActionDto, mockSocket1);
      await service.create(mockSessionMetadata, { ...mockCreateBulkActionDto, id: 'new one' }, mockSocket1);

      expect(service['bulkActions'].size).toEqual(2);

      expect(service.abort(mockCreateBulkActionDto.id)).toEqual(bulkAction);

      expect(service['bulkActions'].size).toEqual(1);
    });
    it('should throw not found error', async () => {
      try {
        expect(service['bulkActions'].size).toEqual(0);

        service.abort(mockCreateBulkActionDto.id);

        fail();
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
      }
    });
  });
  describe('abortUsersBulkActions', () => {
    it('should abort all users bulk actions', async () => {
      await service.create(mockSessionMetadata, mockCreateBulkActionDto, mockSocket1);
      await service.create(mockSessionMetadata, { ...mockCreateBulkActionDto, id: 'new one' }, mockSocket1);
      await service.create(mockSessionMetadata, { ...mockCreateBulkActionDto, id: 'new one 2' }, mockSocket2);

      expect(service['bulkActions'].size).toEqual(3);

      expect(service.abortUsersBulkActions(mockSocket1.id)).toEqual(2);
      expect(service.abortUsersBulkActions(mockSocket1.id)).toEqual(0);

      expect(service['bulkActions'].size).toEqual(1);
      const bulkAction3 = service.get('new one 2');

      expect(bulkAction3['socket']['id']).toEqual('2');
    });
  });
});
