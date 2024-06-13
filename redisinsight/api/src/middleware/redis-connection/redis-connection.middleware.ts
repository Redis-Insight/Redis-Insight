import {
  BadRequestException,
  Injectable,
  Logger,
  NestMiddleware,
  NotFoundException,
} from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import ERROR_MESSAGES from 'src/constants/error-messages';
import { DatabaseService } from 'src/modules/database/database.service';
import { sessionMetadataFromRequest } from 'src/common/decorators';

@Injectable()
export class RedisConnectionMiddleware implements NestMiddleware {
  private logger = new Logger('RedisConnectionMiddleware');

  constructor(
    private databaseService: DatabaseService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<any> {
    const { instanceIdFromReq } = RedisConnectionMiddleware.getConnectionConfigFromReq(req);
    if (!instanceIdFromReq) {
      this.throwError(req, ERROR_MESSAGES.UNDEFINED_INSTANCE_ID);
    }

    const sessionMetadata = sessionMetadataFromRequest(req);

    const existDatabaseInstance = await this.databaseService.exists(sessionMetadata, instanceIdFromReq);
    if (!existDatabaseInstance) {
      throw new NotFoundException(ERROR_MESSAGES.INVALID_DATABASE_INSTANCE_ID);
    }

    next();
  }

  private static getConnectionConfigFromReq(req: Request) {
    return { instanceIdFromReq: req.params.dbInstance };
  }

  private throwError(req: Request, message: string) {
    const { method, url } = req;
    this.logger.error(`${message} ${method} ${url}`);
    throw new BadRequestException(message);
  }
}
