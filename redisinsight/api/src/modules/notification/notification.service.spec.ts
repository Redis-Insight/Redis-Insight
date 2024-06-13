import { Test, TestingModule } from '@nestjs/testing';
import {
  mockNotificationRepository, mockNotificationsDto,
  mockSessionMetadata,
  MockType,
} from 'src/__mocks__';
import { NotificationType } from 'src/modules/notification/constants';
import axios from 'axios';
import { InternalServerErrorException } from '@nestjs/common';
import { NotificationService } from 'src/modules/notification/notification.service';
import { NotificationRepository } from './repositories/notification.repository';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('NotificationService', () => {
  let service: NotificationService;
  let repository: MockType<NotificationRepository>;

  beforeEach(async () => {
    jest.mock('axios', () => mockedAxios);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: NotificationRepository,
          useFactory: mockNotificationRepository,
        },
      ],
    }).compile();

    service = await module.get(NotificationService);
    repository = await module.get(NotificationRepository);
  });

  describe('getNotifications', () => {
    it('should return list of notifications with calculated unread field', async () => {
      const result = await service.getNotifications(mockSessionMetadata);

      expect(result).toEqual(mockNotificationsDto);
    });
    it('should throw an error if any', async () => {
      repository.getNotifications.mockRejectedValue(new Error('some error'));

      try {
        await service.getNotifications(mockSessionMetadata);
        fail();
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServerErrorException);
        expect(e.message).toEqual('Unable to get notifications list');
      }
    });
  });

  describe('readNotifications', () => {
    it('should update all notifications', async () => {
      repository.getTotalUnread.mockResolvedValueOnce(0);

      expect(await service.readNotifications(mockSessionMetadata, {})).toEqual({
        totalUnread: 0,
        notifications: [],
      });
    });
    it('should throw an error if any', async () => {
      repository.readNotifications.mockRejectedValue(new Error('some error'));

      try {
        await service.readNotifications(mockSessionMetadata, { timestamp: 1, type: NotificationType.Global });
        fail();
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServerErrorException);
        expect(e.message).toEqual('Unable to "read" notification(s)');
      }
    });
  });
});
