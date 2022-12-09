import { Session } from 'src/common/models/session';
import { Type } from 'class-transformer';
import {
  IsEnum, IsNotEmpty, IsOptional, IsString,
} from 'class-validator';

export enum ClientContext {
  Common = 'Common',
  Browser = 'Browser',
  CLI = 'CLI',
  Workbench = 'Workbench',
}

export class ClientMetadata {
  @IsNotEmpty()
  @Type(() => Session)
  session: Session;

  @IsNotEmpty()
  @IsString()
  databaseId: string;

  @IsNotEmpty()
  @IsEnum(ClientContext)
  context: ClientContext;

  @IsOptional()
  @IsString()
  uniqueId?: string;
}
