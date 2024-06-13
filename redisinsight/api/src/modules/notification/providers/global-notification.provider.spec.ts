import { Test, TestingModule } from '@nestjs/testing';
import {
  mockNotification1,
  mockNotification1UPD,
  mockNotification2,
  mockNotificationRepository,
  mockSessionMetadata,
  MockType,
} from 'src/__mocks__';
import { GlobalNotificationProvider } from 'src/modules/notification/providers/global-notification.provider';
import { EventEmitter2 } from '@nestjs/event-emitter';
import axios from 'axios';
import { CreateNotificationDto, CreateNotificationsDto } from 'src/modules/notification/dto';
import { InternalServerErrorException } from '@nestjs/common';
import { NotificationRepository } from '../repositories/notification.repository';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('GlobalNotificationProvider', () => {
  let service: GlobalNotificationProvider;
  let repository: MockType<NotificationRepository>;
  let getNotificationsFromRemoteSpy: any;

  beforeEach(async () => {
    jest.mock('axios', () => mockedAxios);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GlobalNotificationProvider,
        EventEmitter2,
        {
          provide: NotificationRepository,
          useFactory: mockNotificationRepository,
        },
      ],
    }).compile();

    service = await module.get(GlobalNotificationProvider);
    repository = await module.get(NotificationRepository);

    getNotificationsFromRemoteSpy = jest.spyOn(service, 'getNotificationsFromRemote');
  });

  afterEach(() => {
    clearInterval(service ? service['interval'] : undefined);
  });
  describe('init', () => {
    it('should should init and set interval only once', async () => {
      const syncSpy = jest.spyOn(service, 'sync');

      expect(service['interval']).toEqual(undefined);
      service.init(mockSessionMetadata);
      expect(service['interval']).not.toEqual(undefined);
      service.init(mockSessionMetadata);
      expect(syncSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('sync', () => {
    it('should add new notifications and update existing one and delete one', async () => {
      getNotificationsFromRemoteSpy.mockResolvedValueOnce({
        notifications: [
          mockNotification1UPD,
          mockNotification2,
        ],
      });

      repository.getGlobalNotifications.mockResolvedValueOnce([
        mockNotification1,
      ]);

      await service.sync(mockSessionMetadata);

      expect(repository.deleteGlobalNotifications).toHaveBeenCalledTimes(1);
      expect(repository.deleteGlobalNotifications).toHaveBeenCalledWith(mockSessionMetadata);

      expect(repository.insertNotifications).toHaveBeenCalledWith(mockSessionMetadata, [
        mockNotification2,
        mockNotification1UPD,
      ]);
    });
  });

  describe('getNotificationsFromRemote', () => {
    it('should add new notifications and update existing one and delete one', async () => {
      mockedAxios.get.mockResolvedValue({
        data: Buffer.from(JSON.stringify({
          notifications: [
            mockNotification1,
            mockNotification2,
          ],
        })),
      });

      const res = await service.getNotificationsFromRemote();

      expect(res).toEqual(new CreateNotificationsDto({
        notifications: [
          new CreateNotificationDto({ ...mockNotification1 }),
          new CreateNotificationDto({ ...mockNotification2 }),
        ],
      }));
    });
    it('should throw an error when incorrect data passed', async () => {
      mockedAxios.get.mockResolvedValue({
        data: Buffer.from('incorrect json'),
      });

      try {
        await service.getNotificationsFromRemote();
        fail();
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServerErrorException);
        expect(e.message).toEqual('Unable to get and parse file from remote');
      }
    });
  });
});
