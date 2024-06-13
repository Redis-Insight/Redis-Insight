import { SessionMetadata } from 'src/common/models';
import { NotificationType } from '../constants';
import { Notification } from '../models/notification';

export abstract class NotificationRepository {
  /**
   * Get all notifications ordered (DESC) by timestamp field
   * @param sessionMetadata
   */
  abstract getNotifications(sessionMetadata: SessionMetadata): Promise<Notification[]>;

  /**
   * Get number of total unread notifications
   * @param sessionMetadata
   */
  abstract getTotalUnread(sessionMetadata: SessionMetadata): Promise<number>;

  /**
   * Mark notifications by type or timestamp as read
   * Should always return empty array
   * @param sessionMetadata
   * @param notificationType
   * @param timestamp
   */
  abstract readNotifications(
    sessionMetadata: SessionMetadata,
    notificationType?: NotificationType,
    timestamp?: number,
  ): Promise<Notification[]>;

  /**
   * Simply insert notifications
   * Might fail due to constraint error. Make sure to remove duplicates before
   * @param sessionMetadata
   * @param notifications
   */
  abstract insertNotifications(sessionMetadata: SessionMetadata, notifications: Notification[]): Promise<void>;

  /**
   * Special function to get only "global" type of notifications
   * Used for auto update notifications from remote
   * @param sessionMetadata
   */
  abstract getGlobalNotifications(sessionMetadata: SessionMetadata): Promise<Partial<Notification>[]>;

  /**
   * Deletes all "global" notification
   * Used during auto update from remote
   * @param sessionMetadata
   */
  abstract deleteGlobalNotifications(sessionMetadata: SessionMetadata): Promise<void>;
}
