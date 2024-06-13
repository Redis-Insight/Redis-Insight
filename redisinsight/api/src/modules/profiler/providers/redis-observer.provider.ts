import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { RedisObserver } from 'src/modules/profiler/models/redis.observer';
import { RedisObserverStatus } from 'src/modules/profiler/constants';
import { withTimeout } from 'src/utils/promise-with-timeout';
import ERROR_MESSAGES from 'src/constants/error-messages';
import config, { Config } from 'src/utils/config';
import { ClientContext, ClientMetadata, SessionMetadata } from 'src/common/models';
import { DatabaseClientFactory } from 'src/modules/database/providers/database.client.factory';
import { RedisClient } from 'src/modules/redis/client';
import { RedisClientLib } from 'src/modules/redis/redis.client.factory';

const serverConfig = config.get('server') as Config['server'];

@Injectable()
export class RedisObserverProvider {
  private logger = new Logger('RedisObserverProvider');

  private redisObservers: Map<string, RedisObserver> = new Map();

  constructor(
    private databaseClientFactory: DatabaseClientFactory,
  ) {}

  /**
   * Get existing redis observer or create a new one
   * @param sessionMetadata
   * @param instanceId
   */
  async getOrCreateObserver(sessionMetadata: SessionMetadata, instanceId: string): Promise<RedisObserver> {
    this.logger.log('Getting redis observer...');

    let redisObserver = this.redisObservers.get(instanceId);

    try {
      if (!redisObserver) {
        this.logger.debug('Creating new RedisObserver');
        redisObserver = new RedisObserver();
        this.redisObservers.set(instanceId, redisObserver);

        // todo: add multi user support
        // initialize redis observer
        redisObserver.init(this.getRedisClientFn({
          sessionMetadata,
          databaseId: instanceId,
          context: ClientContext.Profiler,
        })).catch();
      } else {
        switch (redisObserver.status) {
          case RedisObserverStatus.Ready:
            this.logger.debug(`Using existing RedisObserver with status: ${redisObserver.status}`);
            return redisObserver;
          case RedisObserverStatus.Empty:
          case RedisObserverStatus.End:
          case RedisObserverStatus.Error:
            this.logger.debug(`Trying to reconnect. Current status: ${redisObserver.status}`);
            // todo: add multiuser support
            // try to reconnect
            redisObserver.init(this.getRedisClientFn({
              sessionMetadata,
              databaseId: instanceId,
              context: ClientContext.Profiler,
            })).catch();
            break;
          case RedisObserverStatus.Initializing:
          case RedisObserverStatus.Wait:
          case RedisObserverStatus.Connected:
          default:
            // wait until connect or error
            this.logger.debug(`Waiting for ready. Current status: ${redisObserver.status}`);
        }
      }

      return new Promise((resolve, reject) => {
        redisObserver.once('connect', () => {
          resolve(redisObserver);
        });
        redisObserver.once('connect_error', (e) => {
          reject(e);
        });
      });
    } catch (error) {
      this.logger.error(`Failed to get monitor observer. ${error.message}.`, JSON.stringify(error));
      throw error;
    }
  }

  /**
   * Get Redis Observer from existing ones
   * @param instanceId
   */
  async getObserver(instanceId: string) {
    return this.redisObservers.get(instanceId);
  }

  /**
   * Remove Redis Observer
   * @param instanceId
   */
  async removeObserver(instanceId: string) {
    this.redisObservers.delete(instanceId);
  }

  /**
   * Get Redis existing common IORedis client for instance or create a new common connection
   * @param clientMetadata
   * @private
   */
  private getRedisClientFn(clientMetadata: ClientMetadata): () => Promise<RedisClient> {
    return async () => withTimeout(
      // workaround: use ioredis client for profiler until node-redis lib add support for "monitor" command
      this.databaseClientFactory.createClient(clientMetadata, { clientLib: RedisClientLib.IOREDIS }),
      serverConfig.requestTimeout,
      new ServiceUnavailableException(ERROR_MESSAGES.NO_CONNECTION_TO_REDIS_DB),
    );
  }
}
