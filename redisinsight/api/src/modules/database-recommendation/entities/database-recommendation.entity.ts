import {
  Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, JoinColumn, Index,
} from 'typeorm';
import { Expose } from 'class-transformer';
import { DatabaseEntity } from 'src/modules/database/entities/database.entity';

@Entity('database_recommendations')
export class DatabaseRecommendationEntity {
  @PrimaryGeneratedColumn('uuid')
  @Expose()
  id: string;

  @Column({ nullable: false })
  @Index()
  @Expose()
  databaseId: string;

  @ManyToOne(
    () => DatabaseEntity,
    {
      nullable: false,
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'databaseId' })
  database: DatabaseEntity;

  @Expose()
  @Column({ nullable: false, default: 'luaScript' })
  name: string;

  @Column({ nullable: false, default: false })
  read?: boolean = false;

  @Expose()
  @Column({ nullable: false, default: false })
  disabled?: boolean = false;

  @CreateDateColumn()
  @Index()
  @Expose()
  createdAt: Date;

  constructor(entity: Partial<DatabaseRecommendationEntity>) {
    Object.assign(this, entity);
  }
}
