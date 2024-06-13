import { ApiProperty } from '@nestjs/swagger';
import { Notification } from 'src/modules/notification/models/notification';

export class NotificationsDto {
  @ApiProperty({
    type: () => Notification,
    isArray: true,
    description: 'Ordered notifications list',
  })
  notifications: Notification[];

  @ApiProperty({
    type: Number,
    example: 2,
    description: 'Number of unread notifications',
  })
  totalUnread: number;
}
