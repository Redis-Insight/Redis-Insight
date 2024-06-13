import {
  Column, Entity, PrimaryColumn,
} from 'typeorm';
import { NotificationType } from 'src/modules/notification/constants';
import { Expose } from 'class-transformer';

@Entity('notification')
export class NotificationEntity {
  @Expose()
  @PrimaryColumn({ nullable: false, type: 'varchar', enum: NotificationType })
  type: NotificationType;

  @Expose()
  @PrimaryColumn({ nullable: false })
  timestamp: number;

  @Expose()
  @Column({ nullable: false })
  title: string;

  @Expose()
  @Column({ nullable: true })
  category?: string;

  @Expose()
  @Column({ nullable: true })
  categoryColor?: string;

  @Expose()
  @Column({ nullable: false, type: 'text' })
  body: string;

  @Expose()
  @Column({ nullable: false, default: false })
  read?: boolean = false;
}
