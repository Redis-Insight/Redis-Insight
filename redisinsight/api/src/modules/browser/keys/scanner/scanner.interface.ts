import { GetKeyInfoResponse, RedisDataType } from 'src/modules/browser/keys/dto';
import { RedisString } from 'src/common/constants';
import { RedisClient } from 'src/modules/redis/client';

export interface IScannerGetKeysArgs {
  cursor: string;
  count?: number;
  match?: string;
  type?: RedisDataType;
  keysInfo?: boolean;
  countThreshold: number;
}

export interface IScannerNodeKeys {
  total: number;
  scanned: number;
  cursor: number;
  keys: any[];
  node?: RedisClient,
  host?: string;
  port?: number;
}

export interface IScannerStrategy {
  /**
   * Scan database starting from provided cursor.
   * For Cluster databases will scan each node
   * For cluster database used custom cursor composed of each cursor per node (172.17.0.1:7001@-1||172.17.0.1:7002@33)
   * @param client
   * @param args
   */
  getKeys(client: RedisClient, args: IScannerGetKeysArgs): Promise<IScannerNodeKeys[]>;

  getKeysInfo(client: RedisClient, keys: RedisString[], type?: RedisDataType): Promise<GetKeyInfoResponse[]>;
}
