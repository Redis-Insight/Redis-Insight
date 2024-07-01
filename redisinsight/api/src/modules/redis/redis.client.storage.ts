import { isMatch, sum } from 'lodash';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { RedisClient } from 'src/modules/redis/client';
import { ClientMetadata } from 'src/common/models';
import apiConfig from 'src/utils/config';

const REDIS_CLIENTS_CONFIG = apiConfig.get('redis_clients');

@Injectable()
export class RedisClientStorage {
  private readonly logger = new Logger('RedisClientStorage');

  private readonly clients: Map<string, RedisClient> = new Map();

  private readonly syncInterval: NodeJS.Timeout;

  constructor() {
    this.syncInterval = setInterval(this.syncClients.bind(this), REDIS_CLIENTS_CONFIG.syncInterval);
  }

  onModuleDestroy() {
    clearInterval(this.syncInterval);
  }

  /**
   * Disconnects and removes all clients with exceeded idle threshold
   * @private
   */
  private syncClients(): void {
    try {
      this.clients.forEach((client) => {
        if (client.isIdle()) {
          client.disconnect().catch((e) => this.logger.warn('Unable to disconnect client after idle', e));
          this.clients.delete(client.id);
        }
      });
    } catch (e) {
      // ignore errors;
    }
  }

  /**
   * Finds clients by partial clientMetadata fields and returns array of ids
   * @param clientMetadata
   * @private
   */
  private findClients(clientMetadata: Partial<ClientMetadata>): string[] {
    return [...this.clients.values()]
      .filter((redisClient) => isMatch(redisClient['clientMetadata'], clientMetadata))
      .map((client) => client.id);
  }

  /**
   * Gets client by generated id
   * Will return null if client was not found
   * @param id
   */
  public async get(id: string): Promise<RedisClient> {
    const client = this.clients.get(id);

    if (client) {
      if (!client.isConnected()) {
        await this.remove(client.id);
        return null;
      }

      client.setLastUsed();
    }

    return client;
  }

  /**
   * Will generate "id" based on client metadata and invoke getClient method
   * @param clientMetadata
   */
  public async getByMetadata(clientMetadata: ClientMetadata): Promise<RedisClient> {
    return this.get(RedisClient.generateId(RedisClient.prepareClientMetadata(clientMetadata)));
  }

  /**
   * Saves client into the clients pool if there is no client with such "id"
   * When client with such "id" exists:
   * 1. If existing client has established connection - will return old client and close connection for the new one
   * 2. If existing client hasn't established connection - will replace old client with the new one
   * @param client
   */
  public async set(client: RedisClient): Promise<RedisClient> {
    // Additional validation
    ClientMetadata.validate(client.clientMetadata);

    const existingClient = this.clients.get(client.id);

    if (existingClient) {
      if (existingClient.isConnected()) {
        await client.disconnect().catch();
        return this.get(client.id);
      }

      await existingClient.disconnect().catch();
    }

    this.clients.set(client.id, client);

    return client;
  }

  /**
   * Disconnect client without waiting for pending commands
   * and removes it from the clients pool
   * @param id
   */
  public async remove(id: string): Promise<number> {
    const client = this.clients.get(id);

    if (client) {
      await client.disconnect()
        .catch((e) => this.logger.warn('Unable to disconnect client', e));

      this.clients.delete(id);

      return 1;
    }

    return 0;
  }

  /**
   * Generate id from ClientMetadata and removes client using removeClient method
   * @param clientMetadata
   */
  public async removeByMetadata(clientMetadata: ClientMetadata): Promise<number> {
    return this.remove(RedisClient.generateId(RedisClient.prepareClientMetadata(clientMetadata)));
  }

  /**
   * Closes connections and removes clients by condition
   * Useful when database was removed and there is no sense wait for "idle" before remove clients
   * @param clientMetadata
   */
  public async removeManyByMetadata(clientMetadata: Partial<ClientMetadata>): Promise<number> {
    const toRemove = this.findClients(clientMetadata);

    this.logger.debug(`Trying to remove ${toRemove.length} clients`);

    return sum(await Promise.all(toRemove.map(this.remove.bind(this))));
  }
}
