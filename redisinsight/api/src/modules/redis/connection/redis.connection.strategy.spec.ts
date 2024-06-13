import { ClientContext, ClientMetadata } from 'src/common/models';
import { RedisConnectionStrategy } from './redis.connection.strategy';

describe('RedisConnectionStrategy', () => {
  it('should generate a client name with all fields separated by dashes', () => {
    const clientMetadata: ClientMetadata = {
      databaseId: 'db123',
      context: ClientContext.Browser,
      db: 2,
      uniqueId: 'uniqueCM',
      sessionMetadata: {
        userId: 'userSM',
        sessionId: 'sessionSM',
        uniqueId: 'uniqueSM',
      },
    };

    const result = RedisConnectionStrategy.generateRedisConnectionName(clientMetadata);

    expect(result).toBe('redisinsight-browser-db123-2-uniquecm-usersm-sessionsm-uniquesm');
  });

  // type system should prevent this from ever happening,
  // but in case it does, we should have a default client name
  it.each([
    {},
    null,
    undefined,
  ])('should generate a default client name if all fields are missing', (input) => {
    const clientMetadata = input as ClientMetadata;

    const result = RedisConnectionStrategy.generateRedisConnectionName(clientMetadata);

    expect(result).toBe('redisinsight-custom------');
  });
});
