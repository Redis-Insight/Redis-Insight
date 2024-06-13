import { Module, Type } from '@nestjs/common';
import { NotificationGateway } from 'src/modules/notification/notification.gateway';
import { NotificationService } from 'src/modules/notification/notification.service';
import { GlobalNotificationProvider } from 'src/modules/notification/providers/global-notification.provider';
import { NotificationEmitter } from 'src/modules/notification/providers/notification.emitter';
import { NotificationController } from 'src/modules/notification/notification.controller';
import { NotificationRepository } from 'src/modules/notification/repositories/notification.repository';
import { LocalNotificationRepository } from './repositories/local.notification.repository';

@Module({})
export class NotificationModule {
  static register(notificationRepository: Type<NotificationRepository> = LocalNotificationRepository) {
    return {
      module: NotificationModule,
      providers: [
        {
          provide: NotificationRepository,
          useClass: notificationRepository,
        },
        NotificationGateway,
        NotificationService,
        GlobalNotificationProvider,
        NotificationEmitter,
      ],
      controllers: [
        NotificationController,
      ],
    };
  }
}
