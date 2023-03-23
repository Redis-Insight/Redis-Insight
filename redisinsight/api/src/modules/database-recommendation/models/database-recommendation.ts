import { Expose } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DatabaseRecommendation {
  @ApiProperty({
    description: 'Recommendation id',
    type: String,
    example: 'id',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Recommendation name',
    type: String,
    example: 'luaScript',
  })
  @Expose()
  name: string;

  @ApiPropertyOptional({
    description: 'Determines if recommendation was shown to user',
    type: Boolean,
    example: false,
  })
  read?: boolean;

  @ApiPropertyOptional({
    description: 'Should this recommendation shown to user',
    type: Boolean,
    example: false,
  })
  @Expose()
  disabled?: boolean;
}

export class DatabaseRecommendationsResponse {
  @ApiProperty({
    type: () => DatabaseRecommendation,
    example: [{ name: 'bigSet', read: false }],
    isArray: true,
    description: 'Ordered recommendations list',
  })
  recommendations: DatabaseRecommendation[];

  @ApiProperty({
    type: Number,
    example: 2,
    description: 'Number of unread recommendations',
  })
  totalUnread: number;

  constructor(entity: Partial<DatabaseRecommendationsResponse>) {
    Object.assign(this, entity);
  }
}
