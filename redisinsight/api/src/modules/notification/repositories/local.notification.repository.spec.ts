import { Test, TestingModule } from '@nestjs/testing';
import {
  mockNotification1,
  mockNotification1Entity,
  mockNotification2,
  mockNotification2Entity,
  mockRepository,
  mockSessionMetadata,
  MockType,
} from 'src/__mocks__';
import { LocalNotificationRepository } from 'src/modules/notification/repositories/local.notification.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationEntity } from 'src/modules/notification/entities/notification.entity';
import { NotificationType } from 'src/modules/notification/constants';

describe('LocalNotificationRepository', () => {
  let service: LocalNotificationRepository;
  let repository: MockType<Repository<NotificationEntity>>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalNotificationRepository,
        {
          provide: getRepositoryToken(NotificationEntity),
          useFactory: mockRepository,
        },
      ],
    }).compile();

    service = await module.get(LocalNotificationRepository);
    repository = await module.get(getRepositoryToken(NotificationEntity));
  });

  describe('getNotifications', () => {
    it('should return list of notifications', async () => {
      repository.createQueryBuilder().getMany
        .mockResolvedValueOnce([mockNotification1Entity, mockNotification2Entity]);

      expect(await service.getNotifications()).toEqual([
        mockNotification1,
        mockNotification2,
      ]);
    });
  });
  describe('getTotalUnread', () => {
    it('should return number of unread messages', async () => {
      repository.createQueryBuilder().getCount.mockResolvedValueOnce(3);

      expect(await service.getTotalUnread()).toEqual(3);
    });
  });
  describe('readNotifications', () => {
    it('should read all notifications', async () => {
      repository.createQueryBuilder().execute
        .mockResolvedValueOnce(undefined);

      expect(await service.readNotifications(mockSessionMetadata)).toEqual([]);
      expect(repository.createQueryBuilder().where).toHaveBeenCalledWith({});
    });
    it('should read particular notification by timestamp', async () => {
      repository.createQueryBuilder().execute
        .mockResolvedValueOnce(undefined);

      expect(
        await service.readNotifications(mockSessionMetadata, undefined, mockNotification1.timestamp),
      ).toEqual([]);
      expect(repository.createQueryBuilder().where)
        .toHaveBeenCalledWith({ timestamp: mockNotification1.timestamp });
    });
    it('should read notifications by type', async () => {
      repository.createQueryBuilder().execute
        .mockResolvedValueOnce(undefined);

      expect(
        await service.readNotifications(mockSessionMetadata, mockNotification1.type),
      ).toEqual([]);
      expect(repository.createQueryBuilder().where)
        .toHaveBeenCalledWith({ type: mockNotification1.type });
    });
  });
  describe('insertNotifications', () => {
    it('should insert multiple notifications', async () => {
      repository.createQueryBuilder().execute
        .mockResolvedValueOnce(undefined);

      expect(await service.insertNotifications(mockSessionMetadata, [mockNotification1, mockNotification2]))
        .toEqual(undefined);
      expect(repository.insert).toHaveBeenCalledWith([
        mockNotification1Entity, mockNotification2Entity,
      ]);
    });
  });
  describe('getGlobalNotifications', () => {
    it('should query global notifications particular fields only', async () => {
      repository.createQueryBuilder().getMany
        .mockResolvedValueOnce([{
          timestamp: mockNotification1Entity.timestamp,
          read: mockNotification1Entity.read,
        }]);

      expect(await service.getGlobalNotifications()).toEqual([
        {
          timestamp: mockNotification1.timestamp,
          read: mockNotification1.read,
        },
      ]);
      expect(repository.createQueryBuilder().where).toHaveBeenCalledWith({ type: NotificationType.Global });
      expect(repository.createQueryBuilder().select).toHaveBeenCalledWith(['n.timestamp', 'n.read']);
    });
  });
  describe('deleteGlobalNotifications', () => {
    it('should remove only global notifications', async () => {
      repository.createQueryBuilder().execute.mockResolvedValueOnce(undefined);

      expect(await service.deleteGlobalNotifications()).toEqual(undefined);
      expect(repository.createQueryBuilder().where).toHaveBeenCalledWith({ type: NotificationType.Global });
    });
  });
});
