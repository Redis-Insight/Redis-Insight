import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min, Max,
} from 'class-validator';
import config, { Config } from 'src/utils/config';
import { RedisDataType } from './key.dto';

const scanConfig = config.get('redis_scan') as Config['redis_scan'];
const { countThreshold, countThresholdMax } = scanConfig;

export class GetKeysDto {
  @ApiProperty({
    description:
      'Iteration cursor. '
      + 'An iteration starts when the cursor is set to 0, and terminates when the cursor returned by the server is 0.',
    type: String,
    default: '0',
  })
  @Type(() => String)
  @IsNotEmpty()
  cursor: string;

  @ApiPropertyOptional({
    description: 'Specifying the number of elements to return.',
    type: Number,
    minimum: 1,
    default: 15,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsNotEmpty()
  @IsOptional()
  count?: number;

  @ApiPropertyOptional({
    description: 'Iterate only elements matching a given pattern.',
    type: String,
    default: '*',
  })
  @IsString()
  @IsOptional()
  match?: string;

  @ApiPropertyOptional({
    description:
      'Iterate through the database looking for keys of a specific type.',
    enum: RedisDataType,
  })
  @IsEnum(RedisDataType, {
    message: `destination must be a valid enum value. Valid values: ${Object.values(
      RedisDataType,
    )}.`,
  })
  @IsOptional()
  type?: RedisDataType;

  @ApiPropertyOptional({
    description: 'Fetch keys info (type, size, ttl, length)',
    type: Boolean,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  @Transform((val) => val === true || val === 'true')
  keysInfo?: boolean = true;

  @ApiPropertyOptional({
    description: 'The maximum number of iterations when performing a Redis SCAN operation.',
    type: Number,
    default: true,
  })
  @IsOptional()
  @IsInt()
  @Max(countThresholdMax)
  countThreshold: number = countThreshold;
}
