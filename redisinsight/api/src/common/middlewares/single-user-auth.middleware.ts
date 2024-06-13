import {
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { ISessionMetadata, Session, SessionMetadata } from 'src/common/models/session';
import { DEFAULT_SESSION_ID, DEFAULT_USER_ID } from 'src/common/constants';
import { SessionService } from 'src/modules/session/session.service';
import { plainToClass } from 'class-transformer';

@Injectable()
export class SingleUserAuthMiddleware implements NestMiddleware {
  constructor(
    private readonly sessionService: SessionService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<any> {
    if (!await this.sessionService.getSession(DEFAULT_SESSION_ID)) {
      await this.sessionService.createSession(plainToClass(Session, {
        id: DEFAULT_SESSION_ID,
        userId: DEFAULT_USER_ID,
        data: {
          cloud: {
            accessToken: process.env.MOCK_AKEY || undefined,
            refreshToken: process.env.MOCK_RKEY || undefined,
            idpType: process.env.MOCK_IDP_TYPE || undefined,
          },
        },
      }));
    }

    res.locals.session = {
      data: <ISessionMetadata>Object.freeze(plainToClass(SessionMetadata, {
        userId: DEFAULT_USER_ID,
        sessionId: DEFAULT_SESSION_ID,
      })),
    };

    next();
  }
}
