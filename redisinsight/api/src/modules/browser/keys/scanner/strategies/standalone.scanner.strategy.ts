import { isNull } from 'lodash';
import config from 'src/utils/config';
import { isRedisGlob, unescapeRedisGlob } from 'src/utils';
import {
  GetKeyInfoResponse,
  GetKeysWithDetailsResponse,
  RedisDataType,
} from 'src/modules/browser/keys/dto';
import { BrowserToolKeysCommands } from 'src/modules/browser/constants/browser-tool-commands';
import { IScannerNodeKeys, IScannerGetKeysArgs } from 'src/modules/browser/keys/scanner/scanner.interface';
import { Injectable } from '@nestjs/common';
import { ScannerStrategy } from 'src/modules/browser/keys/scanner/strategies/scanner.strategy';
import { RedisClient, RedisClientCommandReply } from 'src/modules/redis/client';
import { getTotalKeys } from 'src/modules/redis/utils';
import { RedisString } from 'src/common/constants';
import { ReplyError } from 'src/models';

const REDIS_SCAN_CONFIG = config.get('redis_scan');

@Injectable()
export class StandaloneScannerStrategy extends ScannerStrategy {
  /**
   * Get bulk keys ttl values
   * @param client
   * @param keys
   * @protected
   */
  private async getKeysTtl(client: RedisClient, keys: RedisString[]): Promise<number[]> {
    const result = await client.sendPipeline(
      keys.map((key: string) => [BrowserToolKeysCommands.Ttl, key]),
    );

    return result.map((item: [ReplyError, any]) => (item[0] ? null : item[1]));
  }

  /**
   * Get bulk keys types
   * @param client
   * @param keys
   * @protected
   */
  private async getKeysType(client: RedisClient, keys: RedisString[]): Promise<string[]> {
    const result = await client.sendPipeline(
      keys.map((key: string) => [BrowserToolKeysCommands.Type, key]),
      { replyEncoding: 'utf8' },
    ) as [any, string][];

    return result.map((item: [ReplyError, any]) => (item[0] ? null : item[1]));
  }

  /**
   * Get bulk keys sizes
   * @param client
   * @param keys
   * @private
   */
  private async getKeysSize(client: RedisClient, keys: RedisString[]): Promise<number[]> {
    const result = await client.sendPipeline(
      keys.map((key) => [
        BrowserToolKeysCommands.MemoryUsage,
        key,
        'samples',
        '0',
      ]),
    ) as [any, number][];

    return result.map((item: [ReplyError, any]) => (item[0] ? null : item[1]));
  }

  private async scan(
    client: RedisClient,
    node: IScannerNodeKeys,
    match: string,
    count: number,
    scanThreshold: number,
    type?: RedisDataType,
  ): Promise<void> {
    const COUNT = Math.min(2000, count);

    let fullScanned = false;
    while (
      (node.total >= 0 || isNull(node.total))
      && !fullScanned
      && node.keys.length < count
      && (
        node.scanned < scanThreshold
      )
    ) {
      let commandArgs = [`${node.cursor}`, 'MATCH', match, 'COUNT', COUNT];
      if (type) {
        commandArgs = [...commandArgs, 'TYPE', type];
      }
      const execResult = await client.sendCommand([
        BrowserToolKeysCommands.Scan,
        ...commandArgs,
      ]) as [string, RedisClientCommandReply[]];

      const [nextCursor, keys] = execResult;
      // eslint-disable-next-line no-param-reassign
      node.cursor = parseInt(nextCursor, 10);
      // eslint-disable-next-line no-param-reassign
      node.scanned += COUNT;
      node.keys.push(...keys);
      fullScanned = node.cursor === 0;
    }
  }

  /**
   * @inheritDoc
   */
  public async getKeys(client: RedisClient, args: IScannerGetKeysArgs): Promise<GetKeysWithDetailsResponse[]> {
    const match = args.match !== undefined ? args.match : '*';
    const count = args.count || REDIS_SCAN_CONFIG.countDefault;

    const node = {
      total: 0,
      scanned: 0,
      keys: [],
      cursor: parseInt(args.cursor, 10),
    };

    node.total = await getTotalKeys(client);

    if (!isRedisGlob(match)) {
      const keyName = Buffer.from(unescapeRedisGlob(match));
      node.cursor = 0;
      node.scanned = isNull(node.total) ? 1 : node.total;
      node.keys = await this.getKeysInfo(client, [keyName], args.type);
      node.keys = node.keys.filter((key: GetKeyInfoResponse) => {
        if (key.ttl === -2) {
          return false;
        }
        if (args.type) {
          return key.type === args.type;
        }
        return true;
      });
      return [node];
    }

    await this.scan(client, node, match, count, args.countThreshold, args.type);

    if (node.keys.length && args.keysInfo) {
      node.keys = await this.getKeysInfo(client, node.keys, args.type);
    } else {
      node.keys = node.keys.map((name) => ({ name, type: args.type || undefined }));
    }

    // workaround for "pika" databases
    if (!node.total && (node.cursor > 0 || node.keys?.length)) {
      node.total = null;
    }

    return [node];
  }

  /**
   * @inheritDoc
   */
  public async getKeysInfo(
    client: RedisClient,
    keys: RedisString[],
    filterType?: RedisDataType,
  ): Promise<GetKeyInfoResponse[]> {
    const sizeResults = await this.getKeysSize(client, keys);
    const typeResults = filterType
      ? Array(keys.length).fill(filterType)
      : await this.getKeysType(client, keys);
    const ttlResults = await this.getKeysTtl(client, keys);
    return keys.map(
      (key: string, index: number): GetKeyInfoResponse => ({
        name: key,
        type: typeResults[index],
        ttl: ttlResults[index],
        size: sizeResults[index],
      }),
    );
  }
}
