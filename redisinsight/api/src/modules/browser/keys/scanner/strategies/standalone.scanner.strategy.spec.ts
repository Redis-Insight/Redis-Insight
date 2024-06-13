import { Test, TestingModule } from '@nestjs/testing';
import { when } from 'jest-when';
import {
  mockRedisNoPermError,
  mockStandaloneRedisClient,
} from 'src/__mocks__';
import { ReplyError } from 'src/models';
import config from 'src/utils/config';
import { GetKeyInfoResponse, GetKeysDto, RedisDataType } from 'src/modules/browser/keys/dto';
import { BrowserToolKeysCommands } from 'src/modules/browser/constants/browser-tool-commands';
import { IScannerNodeKeys } from 'src/modules/browser/keys/scanner/scanner.interface';
import * as Utils from 'src/modules/redis/utils/keys.util';
import { StandaloneScannerStrategy } from 'src/modules/browser/keys/scanner/strategies/standalone.scanner.strategy';

const REDIS_SCAN_CONFIG = config.get('redis_scan');

const getKeyInfoResponse = {
  name: 'testString',
  type: 'string',
  ttl: -1,
  size: 50,
};
const mockNodeEmptyResult: IScannerNodeKeys = {
  total: 0,
  scanned: 0,
  cursor: 0,
  keys: [],
};

const mockGetTotalResponse1: number = 1;
const mockGetTotalResponse1000000: number = 1000000;
const mockGetTotalResponse0: number = 0;
const mockGetTotalResponse10: number = 10;

const mockKeyInfo: GetKeyInfoResponse = {
  name: 'testString',
  type: 'string',
  ttl: -1,
  size: 50,
};

describe('StandaloneScannerStrategy', () => {
  let strategy: StandaloneScannerStrategy;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StandaloneScannerStrategy,
      ],
    }).compile();

    strategy = module.get(StandaloneScannerStrategy);
  });

  describe('getKeys', () => {
    const getKeysDto: GetKeysDto = { cursor: '0', count: 15, keysInfo: true, countThreshold: 1000 };
    it('should return appropriate value with filter by type', async () => {
      const args = { ...getKeysDto, type: RedisDataType.String, match: 'pattern*' };
      jest.spyOn(Utils, 'getTotalKeys').mockResolvedValue(mockGetTotalResponse1);

      when(mockStandaloneRedisClient.sendCommand)
        .calledWith(expect.arrayContaining([BrowserToolKeysCommands.Scan]))
        .mockResolvedValue(['0', [getKeyInfoResponse.name]]);

      strategy.getKeysInfo = jest.fn().mockResolvedValue([getKeyInfoResponse]);

      const result = await strategy.getKeys(mockStandaloneRedisClient, args);

      expect(result).toEqual([
        {
          ...mockNodeEmptyResult,
          total: 1,
          scanned: getKeysDto.count,
          keys: [getKeyInfoResponse],
        },
      ]);
      expect(strategy.getKeysInfo).toHaveBeenCalled();
      expect(mockStandaloneRedisClient.sendCommand).toHaveBeenNthCalledWith(
        1,
        [BrowserToolKeysCommands.Scan, '0', 'MATCH', args.match, 'COUNT', args.count, 'TYPE', args.type],
      );
    });
    it('should scan 2000 items when count provided more then 2k', async () => {
      const args = { ...getKeysDto, count: 10_000, match: '*' };
      jest.spyOn(Utils, 'getTotalKeys').mockResolvedValue(mockGetTotalResponse1);

      when(mockStandaloneRedisClient.sendCommand)
        .calledWith(expect.arrayContaining([BrowserToolKeysCommands.Scan]))
        .mockResolvedValue([0, [getKeyInfoResponse.name]]);

      strategy.getKeysInfo = jest.fn().mockResolvedValue([getKeyInfoResponse]);

      const result = await strategy.getKeys(mockStandaloneRedisClient, args);

      expect(result).toEqual([
        {
          ...mockNodeEmptyResult,
          total: 1,
          scanned: 2000,
          keys: [getKeyInfoResponse],
        },
      ]);
      expect(strategy.getKeysInfo).toHaveBeenCalled();
      expect(mockStandaloneRedisClient.sendCommand).toHaveBeenNthCalledWith(
        1,
        [BrowserToolKeysCommands.Scan, '0', 'MATCH', args.match, 'COUNT', 2000],
      );
    });
    it('should return keys names and type only', async () => {
      const args = {
        ...getKeysDto, type: RedisDataType.String, match: 'pattern*', keysInfo: false,
      };
      jest.spyOn(Utils, 'getTotalKeys').mockResolvedValue(mockGetTotalResponse1);

      when(mockStandaloneRedisClient.sendCommand)
        .calledWith(expect.arrayContaining([BrowserToolKeysCommands.Scan]))
        .mockResolvedValue([0, [getKeyInfoResponse.name]]);

      strategy.getKeysInfo = jest.fn();

      const result = await strategy.getKeys(mockStandaloneRedisClient, args);

      expect(strategy.getKeysInfo).not.toHaveBeenCalled();
      expect(result).toEqual([
        {
          ...mockNodeEmptyResult,
          total: 1,
          scanned: getKeysDto.count,
          keys: [{ name: getKeyInfoResponse.name, type: getKeyInfoResponse.type }],
        },
      ]);
    });
    it('should call scan 3 times and return appropriate value', async () => {
      jest.spyOn(Utils, 'getTotalKeys').mockResolvedValue(mockGetTotalResponse1000000);

      when(mockStandaloneRedisClient.sendCommand)
        .calledWith([
          BrowserToolKeysCommands.Scan,
          '0',
          'MATCH',
          '*',
          'COUNT',
          getKeysDto.count,
        ])
        .mockResolvedValue(['1', new Array(3).fill(getKeyInfoResponse.name)]);
      when(mockStandaloneRedisClient.sendCommand)
        .calledWith([
          BrowserToolKeysCommands.Scan,
          '1',
          'MATCH',
          '*',
          'COUNT',
          getKeysDto.count,
        ])
        .mockResolvedValue(['2', new Array(3).fill(getKeyInfoResponse.name)]);
      when(mockStandaloneRedisClient.sendCommand)
        .calledWith([
          BrowserToolKeysCommands.Scan,
          '2',
          'MATCH',
          '*',
          'COUNT',
          getKeysDto.count,
        ])
        .mockResolvedValue(['0', new Array(3).fill(getKeyInfoResponse.name)]);

      strategy.getKeysInfo = jest
        .fn()
        .mockResolvedValue(new Array(9).fill(getKeyInfoResponse));

      const result = await strategy.getKeys(mockStandaloneRedisClient, getKeysDto);

      expect(result).toEqual([
        {
          ...mockNodeEmptyResult,
          total: 1000000,
          scanned: getKeysDto.count * 3,
          keys: new Array(9).fill(getKeyInfoResponse),
        },
      ]);
      expect(strategy.getKeysInfo).toHaveBeenCalled();
      expect(mockStandaloneRedisClient.sendCommand).toBeCalledTimes(3);
      expect(mockStandaloneRedisClient.sendCommand).toHaveBeenNthCalledWith(
        1,
        [BrowserToolKeysCommands.Scan, '0', 'MATCH', '*', 'COUNT', getKeysDto.count],
      );
      expect(mockStandaloneRedisClient.sendCommand).toHaveBeenNthCalledWith(
        2,
        [BrowserToolKeysCommands.Scan, '1', 'MATCH', '*', 'COUNT', getKeysDto.count],
      );
      expect(mockStandaloneRedisClient.sendCommand).toHaveBeenNthCalledWith(
        3,
        [BrowserToolKeysCommands.Scan, '2', 'MATCH', '*', 'COUNT', getKeysDto.count],
      );
    });
    it('should call scan N times until threshold exceeds', async () => {
      jest.spyOn(Utils, 'getTotalKeys').mockResolvedValue(mockGetTotalResponse1000000);

      when(mockStandaloneRedisClient.sendCommand)
        .calledWith(expect.arrayContaining([BrowserToolKeysCommands.Scan]))
        .mockResolvedValue(['1', []]);

      strategy.getKeysInfo = jest.fn().mockResolvedValue([]);

      const result = await strategy.getKeys(mockStandaloneRedisClient, getKeysDto);

      expect(result).toEqual([
        {
          ...mockNodeEmptyResult,
          cursor: 1,
          total: 1000000,
          scanned:
            Math.trunc(getKeysDto.countThreshold / getKeysDto.count)
            * getKeysDto.count
            + getKeysDto.count,
          keys: [],
        },
      ]);
      expect(strategy.getKeysInfo).toHaveBeenCalledTimes(0);
    });
    it('should call scan N times until threshold exceeds (even when total 0)', async () => {
      jest.spyOn(Utils, 'getTotalKeys').mockResolvedValue(0);

      when(mockStandaloneRedisClient.sendCommand)
        .calledWith(expect.arrayContaining([BrowserToolKeysCommands.Scan]))
        .mockResolvedValue(['1', []]);

      strategy.getKeysInfo = jest.fn().mockResolvedValue([]);

      const result = await strategy.getKeys(mockStandaloneRedisClient, getKeysDto);

      expect(result).toEqual([
        {
          ...mockNodeEmptyResult,
          cursor: 1,
          total: null,
          scanned:
            Math.trunc(getKeysDto.countThreshold / getKeysDto.count)
            * getKeysDto.count
            + getKeysDto.count,
          keys: [],
        },
      ]);
      expect(strategy.getKeysInfo).toHaveBeenCalledTimes(0);
    });
    it('should call scan with required args', async () => {
      jest.spyOn(Utils, 'getTotalKeys').mockResolvedValue(mockGetTotalResponse0);

      strategy.getKeysInfo = jest.fn().mockResolvedValue([]);
      strategy['scan'] = jest.fn().mockResolvedValue(undefined);

      const result = await strategy.getKeys(mockStandaloneRedisClient, {
        cursor: '0',
        type: RedisDataType.String,
        countThreshold: 1000,
      });

      expect(strategy['scan']).toHaveBeenLastCalledWith(
        mockStandaloneRedisClient,
        mockNodeEmptyResult,
        '*',
        REDIS_SCAN_CONFIG.countDefault,
        1000,
        RedisDataType.String,
      );
      expect(result).toEqual([mockNodeEmptyResult]);
      expect(strategy.getKeysInfo).toBeCalledTimes(0);
    });
    it('should throw error on scan command', async () => {
      jest.spyOn(Utils, 'getTotalKeys').mockResolvedValue(mockGetTotalResponse1);

      const replyError: ReplyError = {
        ...mockRedisNoPermError,
        command: 'SCAN',
      };
      when(mockStandaloneRedisClient.sendCommand)
        .calledWith(expect.arrayContaining([BrowserToolKeysCommands.Scan]))
        .mockRejectedValue(replyError);

      try {
        await strategy.getKeys(mockStandaloneRedisClient, getKeysDto);
        fail('Should throw an error');
      } catch (err) {
        expect(err.message).toEqual(replyError.message);
      }
    });
    describe('get keys by glob patter', () => {
      beforeEach(async () => {
        jest.spyOn(Utils, 'getTotalKeys').mockResolvedValue(mockGetTotalResponse10);

        strategy['scan'] = jest.fn();
      });
      it("should call scan when math contains '?' glob", async () => {
        const dto: GetKeysDto = { ...getKeysDto, match: 'test?tring' };
        strategy.getKeysInfo = jest
          .fn()
          .mockResolvedValue([getKeyInfoResponse]);

        await strategy.getKeys(mockStandaloneRedisClient, dto);

        expect(strategy['scan']).toHaveBeenCalled();
      });
      it("should call scan when math contains '*' glob", async () => {
        const dto: GetKeysDto = { ...getKeysDto, match: 'test*' };
        strategy.getKeysInfo = jest
          .fn()
          .mockResolvedValue([getKeyInfoResponse]);

        await strategy.getKeys(mockStandaloneRedisClient, dto);

        expect(strategy['scan']).toHaveBeenCalled();
      });
      it("should call scan when math contains '[ae]' glob", async () => {
        const dto: GetKeysDto = { ...getKeysDto, match: 't[ae]stString' };
        strategy.getKeysInfo = jest
          .fn()
          .mockResolvedValue([getKeyInfoResponse]);

        await strategy.getKeys(mockStandaloneRedisClient, dto);

        expect(strategy['scan']).toHaveBeenCalled();
      });
      it("should call scan when math contains '[a-e]' glob", async () => {
        const dto: GetKeysDto = { ...getKeysDto, match: 't[a-e]stString' };
        strategy.getKeysInfo = jest
          .fn()
          .mockResolvedValue([getKeyInfoResponse]);

        await strategy.getKeys(mockStandaloneRedisClient, dto);

        expect(strategy['scan']).toHaveBeenCalled();
      });
      it("should call scan when math contains '[^e]' glob", async () => {
        const dto: GetKeysDto = { ...getKeysDto, match: 't[^e]stString' };
        strategy.getKeysInfo = jest
          .fn()
          .mockResolvedValue([getKeyInfoResponse]);

        await strategy.getKeys(mockStandaloneRedisClient, dto);

        expect(strategy['scan']).toHaveBeenCalled();
      });
      it('should not call scan when math contains escaped glob', async () => {
        const dto: GetKeysDto = { ...getKeysDto, match: 't\\[a-e\\]stString' };
        strategy.getKeysInfo = jest
          .fn()
          .mockResolvedValue([getKeyInfoResponse]);

        await strategy.getKeys(mockStandaloneRedisClient, dto);

        expect(strategy['scan']).not.toHaveBeenCalled();
      });
    });
    describe('find exact key', () => {
      const key = getKeyInfoResponse.name;
      const total = 10;
      beforeEach(async () => {
        jest.spyOn(Utils, 'getTotalKeys').mockResolvedValue(mockGetTotalResponse10);

        strategy['scan'] = jest.fn();
      });
      it('should find exact key when match is not glob patter', async () => {
        const dto: GetKeysDto = { ...getKeysDto, match: key };
        strategy.getKeysInfo = jest
          .fn()
          .mockResolvedValue([getKeyInfoResponse]);

        const result = await strategy.getKeys(mockStandaloneRedisClient, dto);

        expect(result).toEqual([
          {
            ...mockNodeEmptyResult,
            total,
            scanned: total,
            keys: [getKeyInfoResponse],
          },
        ]);
        expect(strategy.getKeysInfo).toHaveBeenCalledWith(
          mockStandaloneRedisClient,
          [Buffer.from(key)],
          dto.type,
        );
        expect(strategy['scan']).not.toHaveBeenCalled();
      });
      it('should find exact key when match is escaped glob patter', async () => {
        const dto: GetKeysDto = { ...getKeysDto, match: 'testString\\*' };
        const mockSearchPattern = 'testString*';
        strategy.getKeysInfo = jest
          .fn()
          .mockResolvedValue([{ ...getKeyInfoResponse, name: mockSearchPattern }]);

        const result = await strategy.getKeys(mockStandaloneRedisClient, dto);

        expect(result).toEqual([
          {
            ...mockNodeEmptyResult,
            total,
            scanned: total,
            keys: [{ ...getKeyInfoResponse, name: mockSearchPattern }],
          },
        ]);
        expect(strategy.getKeysInfo).toHaveBeenCalledWith(
          mockStandaloneRedisClient,
          [Buffer.from(mockSearchPattern)],
          dto.type,
        );
        expect(strategy['scan']).not.toHaveBeenCalled();
      });
      it('should find exact key with correct type', async () => {
        const dto: GetKeysDto = {
          ...getKeysDto,
          match: key,
          type: RedisDataType.String,
        };
        strategy.getKeysInfo = jest
          .fn()
          .mockResolvedValue([getKeyInfoResponse]);

        const result = await strategy.getKeys(mockStandaloneRedisClient, dto);

        expect(result).toEqual([
          {
            ...mockNodeEmptyResult,
            total,
            scanned: total,
            keys: [getKeyInfoResponse],
          },
        ]);
      });
      it('should return empty array if key not exist', async () => {
        const dto: GetKeysDto = { ...getKeysDto, match: key };
        strategy.getKeysInfo = jest.fn().mockResolvedValue([
          {
            name: 'testString',
            type: 'none',
            ttl: -2,
            size: null,
          },
        ]);

        const result = await strategy.getKeys(mockStandaloneRedisClient, dto);

        expect(result).toEqual([
          {
            ...mockNodeEmptyResult,
            total,
            scanned: total,
            keys: [],
          },
        ]);
      });
      it('should return empty array if key has wrong type', async () => {
        const dto: GetKeysDto = {
          ...getKeysDto,
          match: key,
          type: RedisDataType.Hash,
        };
        strategy.getKeysInfo = jest
          .fn()
          .mockResolvedValue([getKeyInfoResponse]);

        const result = await strategy.getKeys(mockStandaloneRedisClient, dto);

        expect(result).toEqual([
          {
            ...mockNodeEmptyResult,
            total,
            scanned: total,
            keys: [],
          },
        ]);
      });
    });
  });

  describe('getKeysInfo', () => {
    const keys = ['key1', 'key2'];
    beforeEach(() => {
      when(mockStandaloneRedisClient.sendPipeline)
        .calledWith(
          keys.map((key: string) => [BrowserToolKeysCommands.Ttl, key]),
        )
        .mockResolvedValue(Array(keys.length).fill([null, -1]));
      when(mockStandaloneRedisClient.sendPipeline)
        .calledWith(
          keys.map((key: string) => [
            BrowserToolKeysCommands.MemoryUsage,
            key,
            'samples',
            '0',
          ]),
        )
        .mockResolvedValue(Array(keys.length).fill([null, 50]));
      when(mockStandaloneRedisClient.sendPipeline)
        .calledWith(
          keys.map((key: string) => [BrowserToolKeysCommands.Type, key]),
          { replyEncoding: 'utf8' },
        )
        .mockResolvedValue(Array(keys.length).fill([null, 'string']));
    });

    it('should return correct keys info', async () => {
      const mockResult: GetKeyInfoResponse[] = keys.map((key) => ({
        ...mockKeyInfo,
        name: key,
      }));

      const result = await strategy.getKeysInfo(mockStandaloneRedisClient, keys);

      expect(result).toEqual(mockResult);
    });
    it('should not call TYPE pipeline for keys with known type', async () => {
      const mockResult: GetKeyInfoResponse[] = keys.map((key) => ({
        ...mockKeyInfo,
        name: key,
      }));

      const result = await strategy.getKeysInfo(
        mockStandaloneRedisClient,
        keys,
        RedisDataType.String,
      );

      expect(result).toEqual(mockResult);
      expect(mockStandaloneRedisClient.sendPipeline).not.toHaveBeenCalledWith(
        keys.map((key: string) => [BrowserToolKeysCommands.Type, key]),
      );
    });
  });
});
