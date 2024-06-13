import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { SessionMetadata } from 'src/common/models';
import { NotificationsDto, ReadNotificationsDto } from 'src/modules/notification/dto';
import { NotificationRepository } from './repositories/notification.repository';

@Injectable()
export class NotificationService {
  private logger: Logger = new Logger('NotificationService');

  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async getNotifications(sessionMetadata: SessionMetadata): Promise<NotificationsDto> {
    this.logger.debug('Getting notifications list.');

    try {
      const [notifications, totalUnread] = await Promise.all([
        this.notificationRepository.getNotifications(sessionMetadata),
        this.notificationRepository.getTotalUnread(sessionMetadata),
      ]);

      return plainToClass(NotificationsDto, {
        notifications,
        totalUnread,
      });
    } catch (e) {
      this.logger.error('Unable to get notifications list', e);
      throw new InternalServerErrorException('Unable to get notifications list');
    }
  }

  /**
   * Change read=true to notification(s) based on filter type and timestamp.
   * When "type" and "timestamp" defined a single notification will be modified
   * since we guarantee uniqueness by these fields
   * If no filters - all notifications
   * @param sessionMetadata
   * @param dto
   */
  async readNotifications(sessionMetadata: SessionMetadata, dto: ReadNotificationsDto): Promise<NotificationsDto> {
    try {
      this.logger.debug('Updating "read=true" status for notification(s).');
      const { type, timestamp } = dto;

      const notifications = await this.notificationRepository.readNotifications(sessionMetadata, type, timestamp);

      return plainToClass(NotificationsDto, {
        notifications,
        totalUnread: await this.notificationRepository.getTotalUnread(sessionMetadata),
      });
    } catch (e) {
      this.logger.error('Unable to "read" notification(s)', e);
      throw new InternalServerErrorException('Unable to "read" notification(s)');
    }
  }
}
