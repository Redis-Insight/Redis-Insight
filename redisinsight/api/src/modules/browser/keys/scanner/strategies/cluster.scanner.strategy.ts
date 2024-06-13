import { isNull, omit, toNumber } from 'lodash';
import config from 'src/utils/config';
import { isRedisGlob, unescapeRedisGlob } from 'src/utils';
import { BrowserToolKeysCommands } from 'src/modules/browser/constants/browser-tool-commands';
import { GetKeyInfoResponse, GetKeysWithDetailsResponse, RedisDataType } from 'src/modules/browser/keys/dto';
import { parseClusterCursor } from 'src/modules/browser/utils';
import { Injectable } from '@nestjs/common';
import { ScannerStrategy } from 'src/modules/browser/keys/scanner/strategies/scanner.strategy';
import { RedisClient, RedisClientCommand, RedisClientNodeRole } from 'src/modules/redis/client';
import { getTotalKeys } from 'src/modules/redis/utils';
import { RedisString } from 'src/common/constants';
import { IScannerGetKeysArgs, IScannerNodeKeys } from 'src/modules/browser/keys/scanner/scanner.interface';

const REDIS_SCAN_CONFIG = config.get('redis_scan');

@Injectable()
export class ClusterScannerStrategy extends ScannerStrategy {
  private async getNodesToScan(
    client: RedisClient,
    initialCursor: string,
  ): Promise<IScannerNodeKeys[]> {
    const nodesClients = await client.nodes(RedisClientNodeRole.PRIMARY);

    if (Number.isNaN(toNumber(initialCursor))) {
      // parse existing cursor
      const nodes = parseClusterCursor(initialCursor);
      // add client to each node
      nodes.forEach((node, index) => {
        nodes[index].node = nodesClients.find(
          ({
            options: {
              host,
              port,
              natHost,
              natPort,
            },
          }) => (
            host === node.host && port === node.port
          ) || (
            natHost === node.host && natPort === node.port
          ),
        );
      });

      return nodes;
    }

    return nodesClients.map((node) => ({
      node,
      host: node.options.natHost || node.options.host,
      port: node.options.natPort || node.options.port,
      cursor: 0,
      keys: [],
      total: 0,
      scanned: 0,
    }) as any);
  }

  private async calculateNodesTotalKeys(
    nodes: IScannerNodeKeys[],
  ): Promise<void> {
    await Promise.all(
      nodes.map(async (node) => {
        // eslint-disable-next-line no-param-reassign
        node.total = await getTotalKeys(node?.node);
      }),
    );
  }

  /**
   * Scan keys for each node and mutates input data
   */
  private async scanNodes(
    nodes: IScannerNodeKeys[],
    match: string,
    count: number,
    type?: RedisDataType,
  ): Promise<void> {
    await Promise.all(
      nodes.map(async (node) => {
        // ignore full scanned nodes or nodes with no items
        if ((node.cursor === 0 && node.scanned !== 0) || node.total === 0) {
          return;
        }

        const commandArgs = [`${node.cursor}`, 'MATCH', match, 'COUNT', count];
        if (type) {
          commandArgs.push('TYPE', type);
        }

        const result = await node.node.sendCommand([
          BrowserToolKeysCommands.Scan,
          ...commandArgs,
        ]);

        // eslint-disable-next-line no-param-reassign
        node.cursor = parseInt(result[0], 10);
        node.keys.push(...result[1]);
        // eslint-disable-next-line no-param-reassign
        node.scanned += count;
      }),
    );
  }

  /**
   * @inheritDoc
   */
  public async getKeys(client: RedisClient, args: IScannerGetKeysArgs): Promise<GetKeysWithDetailsResponse[]> {
    const match = args.match !== undefined ? args.match : '*';
    const count = args.count || REDIS_SCAN_CONFIG.countDefault;
    const scanThreshold = args.countThreshold || REDIS_SCAN_CONFIG.countThreshold;
    const nodes = await this.getNodesToScan(client, args.cursor);

    await this.calculateNodesTotalKeys(nodes);

    if (!isRedisGlob(match)) {
      const keyName = Buffer.from(unescapeRedisGlob(match));
      nodes.forEach((node) => {
        // eslint-disable-next-line no-param-reassign
        node.cursor = 0;
        // eslint-disable-next-line no-param-reassign
        node.scanned = isNull(node.total) ? 1 : node.total;
      });
      nodes[0].keys = await this.getKeysInfo(client, [keyName], args.type);
      nodes[0].keys = nodes[0].keys.filter((key: GetKeyInfoResponse) => {
        if (key.ttl === -2) {
          return false;
        }
        if (args.type) {
          return key.type === args.type;
        }
        return true;
      });
      return nodes.map((node) => omit(node, 'node'));
    }

    let allNodesScanned = false;
    while (
      !allNodesScanned
      && nodes.reduce((prev, cur) => prev + cur.keys.length, 0) < count
      && (
        (
          nodes.reduce((prev, cur) => prev + cur.total, 0) < scanThreshold
          && nodes.find((node) => !!node.cursor)
        )
        || nodes.reduce((prev, cur) => prev + cur.scanned, 0)
        < scanThreshold
      )
    ) {
      await this.scanNodes(nodes, match, count, args.type);
      allNodesScanned = !nodes.some((node) => node.cursor !== 0);
    }

    await Promise.all(
      nodes.map(async (node) => {
        if (node.keys.length && args.keysInfo) {
          // eslint-disable-next-line no-param-reassign
          node.keys = await this.getKeysInfo(
            node.node,
            node.keys,
            args.type,
          );
        } else {
          // eslint-disable-next-line no-param-reassign
          node.keys = node.keys.map((name) => ({
            name,
            type: args.type || undefined,
          }));
        }
      }),
    );

    return nodes.map((node) => omit(node, 'node'));
  }

  /**
   * @inheritDoc
   */
  public async getKeysInfo(
    client: RedisClient,
    keys: RedisString[],
    filterType?: RedisDataType,
  ): Promise<GetKeyInfoResponse[]> {
    return Promise.all(keys.map(async (key) => {
      const commands: RedisClientCommand[] = [
        [BrowserToolKeysCommands.Ttl, key],
        ['memory', 'usage', key, 'samples', '0'],
      ];

      if (!filterType) {
        commands.push([BrowserToolKeysCommands.Type, key]);
      }

      const result = await client.sendPipeline(commands, { replyEncoding: 'utf8' }) as any[];

      if (filterType) {
        result.push([null, filterType]);
      }

      const [
        [, ttl = null],
        [, size = null],
        [, type = null],
      ] = result;

      return {
        name: key,
        type,
        ttl,
        size,
      };
    }));
  }
}
