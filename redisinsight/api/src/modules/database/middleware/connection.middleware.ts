import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  NestMiddleware,
} from '@nestjs/common';
import * as connectTimeout from 'connect-timeout';
import { NextFunction, Request, Response } from 'express';
import ERROR_MESSAGES from 'src/constants/error-messages';
import { RedisErrorCodes } from 'src/constants';
import { DatabaseService } from 'src/modules/database/database.service';
import { plainToClass } from 'class-transformer';
import { sessionMetadataFromRequest } from 'src/common/decorators';
import { Database } from '../models/database';

@Injectable()
export class ConnectionMiddleware implements NestMiddleware {
  private logger = new Logger('ConnectionMiddleware');

  constructor(
    private databaseService: DatabaseService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<any> {
    let { timeout, instanceIdFromReq } = ConnectionMiddleware.getConnectionConfigFromReq(req);

    const sessionMetadata = sessionMetadataFromRequest(req);

    if (instanceIdFromReq) {
      timeout = plainToClass(
        Database,
        await this.databaseService.get(sessionMetadata, instanceIdFromReq),
      )?.timeout;
    }

    const cb = (err?: any) => {
      if (err?.code === RedisErrorCodes.Timeout
        || err?.message?.includes('timeout')) {
        next(
          this.returnError(req, new BadGatewayException(ERROR_MESSAGES.CONNECTION_TIMEOUT)),
        );
      } else {
        next();
      }
    };

    connectTimeout?.(timeout)?.(req, res, cb);
  }

  private static getConnectionConfigFromReq(req: Request) {
    return {
      timeout: req.body?.timeout,
      instanceIdFromReq: req.params?.id,
    };
  }

  private returnError(req: Request, err: Error) {
    const { method, url } = req;
    this.logger.error(`${err?.message} ${method} ${url}`);
    return new BadRequestException(err?.message);
  }
}
