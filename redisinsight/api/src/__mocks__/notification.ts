import { NotificationEntity } from 'src/modules/notification/entities/notification.entity';
import { NotificationType } from 'src/modules/notification/constants';
import { Notification } from 'src/modules/notification/models/notification';
import { NotificationsDto } from 'src/modules/notification/dto';

export const mockGlobalNotificationsJson = {
  notifications: [
    {
      title: 'RedisGraph End of Life',
      body: 'Redis Inc. has announced the end-of-life of <b>RedisGraph</b>. '
        + 'We will carry out the process gradually, and in accordance with our commitment to our customers. '
        + '<p> If you are using RedisGraph - please read the '
        + '<a href="https://redis.com/blog/redisgraph-eol" target="_blank">following</a> carefully.',
      category: 'important',
      categoryColor: '#800D0D',
      timestamp: 1688549037,
    },
    {
      title: 'Missing a feature or found a bug?',
      body: 'Would you like to see specific features added or have a bug to report? '
        + '<p>'
        + ' <a href="https://github.com/RedisInsight/RedisInsight/issues" target="_blank">Share</a> '
        + 'it with us! <p> '
        + 'And <b>star</b> the repository if you like RedisInsight!',
      category: 'feedback',
      categoryColor: '#330D80',
      timestamp: 1662381434,
    },
  ],
};

export const mockNotification1 = Object.assign(new Notification(), {
  ...mockGlobalNotificationsJson.notifications[0],
  type: NotificationType.Global,
  read: true,
});

export const mockNotification1Entity = Object.assign(new NotificationEntity(), mockNotification1);

export const mockNotification1UPD = Object.assign(new Notification(), {
  ...mockNotification1,
  title: 'UPD RedisGraph End of Life',
});

export const mockNotification1UPDEntity = Object.assign(new NotificationEntity(), mockNotification1UPD);

export const mockNotification2 = Object.assign(new Notification(), {
  ...mockGlobalNotificationsJson.notifications[1],
  type: NotificationType.Global,
  read: false,
});
export const mockNotification2Entity = Object.assign(new NotificationEntity(), mockNotification2);

export const mockNotificationsDto = Object.assign(new NotificationsDto(), {
  notifications: [mockNotification1, mockNotification2],
  totalUnread: 1,
});

export const mockNotificationRepository = jest.fn(() => ({
  getNotifications: jest.fn().mockResolvedValue([mockNotification1Entity, mockNotification2Entity]),
  getTotalUnread: jest.fn().mockResolvedValue(mockNotificationsDto.totalUnread),
  readNotifications: jest.fn().mockResolvedValue([]),
  insertNotifications: jest.fn(),
  getGlobalNotifications: jest.fn(),
  deleteGlobalNotifications: jest.fn(),
}));
