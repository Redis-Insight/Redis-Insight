import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { plainToClass } from 'class-transformer';
import { Validator } from 'class-validator';
import {
  forEach, keyBy, orderBy, values,
} from 'lodash';
import { SessionMetadata } from 'src/common/models';
import {
  NotificationEvents,
  NotificationType,
} from 'src/modules/notification/constants';
import { CreateNotificationsDto } from 'src/modules/notification/dto';
import { Notification } from 'src/modules/notification/models/notification';
import { getFile } from 'src/utils';
import config from 'src/utils/config';
import { NotificationRepository } from '../repositories/notification.repository';

const NOTIFICATIONS_CONFIG = config.get('notifications');

@Injectable()
export class GlobalNotificationProvider {
  private logger: Logger = new Logger('GlobalNotificationProvider');

  private validator = new Validator();

  private interval: NodeJS.Timeout;

  constructor(
    private notificationRepository: NotificationRepository,
    private eventEmitter: EventEmitter2,
  ) {}

  init(sessionMetadata: SessionMetadata) {
    if (this.interval) {
      return;
    }

    this.interval = setInterval(() => {
      this.sync(sessionMetadata).catch();
    }, NOTIFICATIONS_CONFIG.syncInterval);

    this.sync(sessionMetadata).catch();
  }

  async sync(sessionMetadata: SessionMetadata) {
    try {
      const remoteNotificationsDto = await this.getNotificationsFromRemote();

      await this.validatedNotifications(remoteNotificationsDto);

      const toInsert = keyBy(
        remoteNotificationsDto.notifications.map((notification) => plainToClass(Notification, {
          ...notification,
          type: NotificationType.Global,
          read: false,
        })), 'timestamp',
      );

      const currentNotifications = keyBy(
        await this.notificationRepository.getGlobalNotifications(
          sessionMetadata,
        ),
        'timestamp',
      );

      await this.notificationRepository.deleteGlobalNotifications(
        sessionMetadata,
      );

      // process

      const newNotifications = [];

      forEach(toInsert, (notification) => {
        if (currentNotifications[notification.timestamp]) {
          toInsert[notification.timestamp].read = currentNotifications[notification.timestamp].read;
        } else {
          newNotifications.push(notification);
        }
      });

      await this.notificationRepository.insertNotifications(
        sessionMetadata,
        values(toInsert),
      );

      this.eventEmitter.emit(
        NotificationEvents.NewNotifications,
        sessionMetadata,
        orderBy(
          newNotifications,
          ['timestamp'],
          'desc',
        ),
      );
    } catch (e) {
      this.logger.error('Unable to sync notifications with remote', e);
    }
  }

  async validatedNotifications(dto: CreateNotificationsDto): Promise<void> {
    this.logger.debug('Validating notifications from remote');

    try {
      const notificationsDto: CreateNotificationsDto = plainToClass(
        CreateNotificationsDto,
        dto,
      );
      await this.validator.validateOrReject(notificationsDto, {
        whitelist: true,
      });
    } catch (e) {
      this.logger.error(`Invalid notification(s) found. ${e.message}`, e);
      throw new BadRequestException(e);
    }
  }

  async getNotificationsFromRemote(): Promise<CreateNotificationsDto> {
    this.logger.debug('Getting notifications from remote');

    try {
      const buffer = await getFile(NOTIFICATIONS_CONFIG.updateUrl);
      const serializedString = buffer.toString();
      const json = JSON.parse(serializedString);
      return plainToClass(CreateNotificationsDto, json);
    } catch (e) {
      this.logger.error(
        `Unable to download or parse notifications json. ${e.message}`,
        e,
      );
      throw new InternalServerErrorException(
        'Unable to get and parse file from remote',
      );
    }
  }
}
