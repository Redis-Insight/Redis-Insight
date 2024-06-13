import { NotificationType } from 'src/modules/notification/constants';
import { Expose } from 'class-transformer';

export class Notification {
  @Expose()
  type: NotificationType;

  @Expose()
  timestamp: number;

  @Expose()
  title: string;

  @Expose()
  category?: string;

  @Expose()
  categoryColor?: string;

  @Expose()
  body: string;

  @Expose()
  read?: boolean = false;
}
