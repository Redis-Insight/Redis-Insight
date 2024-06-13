import { InjectRepository } from '@nestjs/typeorm';
import { SessionMetadata } from 'src/common/models';
import { Repository } from 'typeorm';
import { classToClass } from 'src/utils';
import { NotificationType } from '../constants';
import { NotificationEntity } from '../entities/notification.entity';
import { Notification } from '../models/notification';
import { NotificationRepository } from './notification.repository';

export class LocalNotificationRepository extends NotificationRepository {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly repository: Repository<NotificationEntity>,
  ) {
    super();
  }

  /**
   * @inheritDoc
   */
  async getNotifications(): Promise<Notification[]> {
    const notifications = await this.repository
      .createQueryBuilder('n')
      .orderBy('timestamp', 'DESC')
      // .limit(NOTIFICATIONS_CONFIG.queryLimit) // todo: do not forget when introduce "local" notifications
      .getMany();

    return notifications.map((ne) => classToClass(Notification, ne));
  }

  /**
   * @inheritDoc
   */
  async getTotalUnread(): Promise<number> {
    return this.repository
      .createQueryBuilder()
      .where({ read: false })
      .getCount();
  }

  /**
   * @inheritDoc
   */
  async readNotifications(
    _: SessionMetadata,
    notificationType?: NotificationType,
    timestamp?: number,
  ): Promise<Notification[]> {
    const query: Record<string, any> = {};

    if (notificationType) {
      query.type = notificationType;
    }

    if (timestamp) {
      query.timestamp = timestamp;
    }

    await this.repository
      .createQueryBuilder('n')
      .update()
      .where(query)
      .set({ read: true })
      .execute();

    return [];
  }

  /**
   * @inheritDoc
   */
  async insertNotifications(_: SessionMetadata, notifications: Notification[]): Promise<void> {
    await this.repository.insert(
      notifications.map((n) => classToClass(NotificationEntity, n)),
    );
  }

  /**
   * @inheritDoc
   */
  async getGlobalNotifications(): Promise<Partial<Notification>[]> {
    return this.repository
      .createQueryBuilder('n')
      .where({ type: NotificationType.Global })
      .select(['n.timestamp', 'n.read'])
      .getMany();
  }

  /**
   * @inheritDoc
   */
  async deleteGlobalNotifications(): Promise<void> {
    await this.repository
      .createQueryBuilder('n')
      .delete()
      .where({ type: NotificationType.Global })
      .execute();
  }
}
