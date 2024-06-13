import { Injectable, Logger } from '@nestjs/common';
import { UserSession } from 'src/modules/pub-sub/model/user-session';
import { UserClient } from 'src/modules/pub-sub/model/user-client';
import { RedisClientProvider } from 'src/modules/pub-sub/providers/redis-client.provider';
import { ClientContext, SessionMetadata } from 'src/common/models';

@Injectable()
export class UserSessionProvider {
  private readonly logger: Logger = new Logger('UserSessionProvider');

  private sessions: Map<string, UserSession> = new Map();

  constructor(private readonly redisClientProvider: RedisClientProvider) {}

  getOrCreateUserSession(sessionMetadata: SessionMetadata, userClient: UserClient) {
    let session = this.getUserSession(userClient.getId());

    if (!session) {
      session = new UserSession(
        userClient,
        this.redisClientProvider.createClient({
          sessionMetadata,
          databaseId: userClient.getDatabaseId(),
          context: ClientContext.Common,
        }),
      );
      this.sessions.set(session.getId(), session);
      this.logger.debug(`New session was added ${this}`);
    }

    return session;
  }

  getUserSession(id: string): UserSession {
    return this.sessions.get(id);
  }

  removeUserSession(id: string) {
    this.logger.debug(`Removing user session ${id}`);

    this.sessions.delete(id);

    this.logger.debug(`User session was removed ${this}`);
  }

  toString() {
    return `UserSessionProvider:${
      JSON.stringify({
        sessionsSize: this.sessions.size,
        sessions: [...this.sessions.keys()],
      })
    }`;
  }
}
