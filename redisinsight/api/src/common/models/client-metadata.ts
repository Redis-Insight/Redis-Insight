import { Session, SessionMetadata } from 'src/common/models/session';
import { Type } from 'class-transformer';
import {
  IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min,
} from 'class-validator';
import { BadRequestException } from '@nestjs/common';

export enum ClientContext {
  Common = 'Common',
  Browser = 'Browser',
  CLI = 'CLI',
  Workbench = 'Workbench',
  Profiler = 'Profiler',
  AI = 'AI',
}

export class ClientMetadata {
  @IsNotEmpty()
  @Type(() => Session)
  sessionMetadata: SessionMetadata;

  @IsNotEmpty()
  @IsString()
  databaseId: string;

  @IsNotEmpty()
  @IsEnum(ClientContext, {
    message: `context must be a valid enum value. Valid values: ${Object.values(
      ClientContext,
    )}.`,
  })
  context: ClientContext;

  @IsOptional()
  @IsString()
  uniqueId?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(2147483647)
  db?: number;

  /**
   * Validates client metadata required properties to be defined
   * Must be used in all the places that works with clients
   * @param clientMetadata
   */
  static validate(clientMetadata: ClientMetadata) {
    // validate session metadata
    SessionMetadata.validate(clientMetadata?.sessionMetadata);

    if (
      !clientMetadata?.databaseId
      || !clientMetadata?.context
    ) {
      throw new BadRequestException('Client metadata missed required properties');
    }
  }
}
