import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import {
  mockNotification1, mockNotification2,
  mockNotificationRepository,
  mockNotificationsDto,
  mockSessionMetadata,
  MockType,
} from 'src/__mocks__';
import {
  NotificationServerEvents,
} from 'src/modules/notification/constants';
import { NotificationEmitter } from 'src/modules/notification/providers/notification.emitter';
import { NotificationRepository } from '../repositories/notification.repository';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockEventEmitter = {
  emit: jest.fn(),
};

describe('NotificationEmitter', () => {
  let service: NotificationEmitter;
  let repository: MockType<NotificationRepository>;
  let emitter: MockType<EventEmitter2>;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.mock('axios', () => mockedAxios);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationEmitter,
        EventEmitter2,
        {
          provide: EventEmitter2,
          useFactory: () => mockEventEmitter,
        },
        {
          provide: NotificationRepository,
          useFactory: mockNotificationRepository,
        },
      ],
    }).compile();

    service = await module.get(NotificationEmitter);
    repository = await module.get(NotificationRepository);
    emitter = await module.get(EventEmitter2);
    emitter.emit.mockReset();
  });

  describe('notification', () => {
    it('should return undefined if no notifications', async () => {
      await service.notification(mockSessionMetadata, []);
      expect(emitter.emit).toHaveBeenCalledTimes(0);
    });
    it('should should init and set interval only once', async () => {
      await service.notification(mockSessionMetadata, [
        mockNotification1,
        mockNotification2,
      ]);
      expect(emitter.emit).toHaveBeenCalledTimes(1);
      expect(emitter.emit).toHaveBeenCalledWith(
        NotificationServerEvents.Notification,
        mockNotificationsDto,
      );
    });
    it('should log an error but not fail', async () => {
      repository.getTotalUnread.mockRejectedValueOnce(
        new Error('some error'),
      );

      await service.notification(mockSessionMetadata, [mockNotification1]);

      expect(emitter.emit).toHaveBeenCalledTimes(0);
    });
  });
});
