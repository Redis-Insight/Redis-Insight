import {
  IsNotEmpty, IsObject, IsOptional, IsString,
} from 'class-validator';
import { BadRequestException } from '@nestjs/common';

export interface ISessionMetadata {
  userId: string;
  sessionId: string;
  uniqueId?: string;
}

export class SessionMetadata implements ISessionMetadata {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  sessionId: string;

  @IsOptional()
  @IsString()
  uniqueId?: string;

  /**
   * Validates session metadata required properties to be defined
   * Must be used in all the places that works with clients
   * @param sessionMetadata
   */
  static validate(sessionMetadata: SessionMetadata) {
    if (
      !sessionMetadata?.sessionId
      || !sessionMetadata?.userId
    ) {
      throw new BadRequestException('Session metadata missed required properties');
    }
  }
}

export class Session {
  @IsNotEmpty()
  @IsString()
  id: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, any> = {};
}
