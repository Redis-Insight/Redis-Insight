import { Test, TestingModule } from '@nestjs/testing';
import { when } from 'jest-when';
import {
  mockRedisNoPermError,
  mockBrowserClientMetadata,
  mockClusterRedisClient,
  generateMockRedisClient,
  MockRedisClient,
} from 'src/__mocks__';
import { ReplyError } from 'src/models';
import ERROR_MESSAGES from 'src/constants/error-messages';
import { GetKeyInfoResponse, GetKeysDto, RedisDataType } from 'src/modules/browser/keys/dto';
import { BrowserToolKeysCommands } from 'src/modules/browser/constants/browser-tool-commands';
import { IScannerNodeKeys } from 'src/modules/browser/keys/scanner/scanner.interface';
import * as Utils from 'src/modules/redis/utils/keys.util';
import { ClusterScannerStrategy } from 'src/modules/browser/keys/scanner/strategies/cluster.scanner.strategy';

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
const mockClusterNodes = [
  { host: '172.1.0.1', port: 7000 },
  { host: '172.1.0.1', port: 7001 },
  { host: '172.1.0.1', port: 7002 },
];

const mockClusterNodesEmptyResult: IScannerNodeKeys[] = [
  { ...mockNodeEmptyResult, ...mockClusterNodes[0] },
  { ...mockNodeEmptyResult, ...mockClusterNodes[1] },
  { ...mockNodeEmptyResult, ...mockClusterNodes[2] },
];

const mockGetTotalResponse0: number = 0;
const mockGetTotalResponse1: number = 1;
const mockGetTotalResponse10: number = 10;
const mockGetTotalResponse1000: number = 1000;
const mockGetTotalResponse2000: number = 2000;
const mockGetTotalResponse3000: number = 3000;
const mockGetTotalResponse1000000: number = 1000000;

const mockGetKeysInfoFn = jest.fn().mockImplementation(async (_, keys) => {
  if (keys.length < 1) {
    return [];
  }
  return new Array(keys.length).fill(getKeyInfoResponse);
});

const mockKeyInfo: GetKeyInfoResponse = {
  name: 'testString',
  type: 'string',
  ttl: -1,
  size: 50,
};

describe('Cluster Scanner Strategy', () => {
  let strategy: ClusterScannerStrategy;
  let mockNode1: MockRedisClient;
  let mockNode2: MockRedisClient;
  let mockNode3: MockRedisClient;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClusterScannerStrategy,
      ],
    }).compile();

    strategy = module.get(ClusterScannerStrategy);
    mockGetKeysInfoFn.mockClear();

    mockNode1 = generateMockRedisClient(mockBrowserClientMetadata, jest.fn(), mockClusterNodes[0]);
    mockNode2 = generateMockRedisClient(mockBrowserClientMetadata, jest.fn(), mockClusterNodes[1]);
    mockNode3 = generateMockRedisClient(mockBrowserClientMetadata, jest.fn(), mockClusterNodes[2]);

    mockClusterRedisClient.nodes.mockResolvedValue([mockNode1, mockNode2, mockNode3]);
  });

  describe('getKeys', () => {
    const getKeysDto: GetKeysDto = { cursor: '0', count: 15, keysInfo: true, countThreshold: 1000 };

    it('should return appropriate value with filter by type', async () => {
      const args = { ...getKeysDto, type: RedisDataType.String, match: 'pattern*' };
      jest.spyOn(Utils, 'getTotalKeys').mockResolvedValue(mockGetTotalResponse1);

      when(mockNode1.sendCommand)
        .calledWith(expect.arrayContaining([BrowserToolKeysCommands.Scan]))
        .mockResolvedValue([0, [Buffer.from(getKeyInfoResponse.name)]]);
      when(mockNode2.sendCommand)
        .calledWith(expect.arrayContaining([BrowserToolKeysCommands.Scan]))
        .mockResolvedValue([0, [Buffer.from(getKeyInfoResponse.name)]]);
      when(mockNode3.sendCommand)
        .calledWith(expect.arrayContaining([BrowserToolKeysCommands.Scan]))
        .mockResolvedValue([0, [Buffer.from(getKeyInfoResponse.name)]]);

      strategy.getKeysInfo = jest.fn().mockResolvedValue([getKeyInfoResponse]);

      const result = await strategy.getKeys(mockClusterRedisClient, args);

      expect(result).toEqual([
        {
          ...mockClusterNodesEmptyResult[0],
          total: mockGetTotalResponse1,
          scanned: getKeysDto.count,
          keys: [getKeyInfoResponse],
        },
        {
          ...mockClusterNodesEmptyResult[1],
          total: mockGetTotalResponse1,
          scanned: getKeysDto.count,
          keys: [getKeyInfoResponse],
        },
        {
          ...mockClusterNodesEmptyResult[2],
          total: mockGetTotalResponse1,
          scanned: getKeysDto.count,
          keys: [getKeyInfoResponse],
        },
      ]);
      expect(strategy.getKeysInfo).toHaveBeenCalled();
      expect(mockNode1.sendCommand).toHaveBeenNthCalledWith(
        1,
        [BrowserToolKeysCommands.Scan, '0', 'MATCH', args.match, 'COUNT', args.count, 'TYPE', args.type],
      );
      expect(mockNode2.sendCommand).toHaveBeenNthCalledWith(
        1,
        [BrowserToolKeysCommands.Scan, '0', 'MATCH', args.match, 'COUNT', args.count, 'TYPE', args.type],
      );
      expect(mockNode3.sendCommand).toHaveBeenNthCalledWith(
        1,
        [BrowserToolKeysCommands.Scan, '0', 'MATCH', args.match, 'COUNT', args.count, 'TYPE', args.type],
      );
    });
    it('should work with custom cursor', async () => {
      const args = {
        ...getKeysDto,
        type: RedisDataType.String,
        match: 'pattern*',
        cursor: '172.1.0.1:7000@11||172.1.0.1:7001@22||172.1.0.1:7002@33',
      };
      jest.spyOn(Utils, 'getTotalKeys').mockResolvedValue(mockGetTotalResponse1);

      when(mockNode1.sendCommand)
        .calledWith(expect.arrayContaining([BrowserToolKeysCommands.Scan]))
        .mockResolvedValue([0, [Buffer.from(getKeyInfoResponse.name)]]);
      when(mockNode2.sendCommand)
        .calledWith(expect.arrayContaining([BrowserToolKeysCommands.Scan]))
        .mockResolvedValue([0, [Buffer.from(getKeyInfoResponse.name)]]);
      when(mockNode3.sendCommand)
        .calledWith(expect.arrayContaining([BrowserToolKeysCommands.Scan]))
        .mockResolvedValue([0, [Buffer.from(getKeyInfoResponse.name)]]);

      strategy.getKeysInfo = jest.fn().mockResolvedValue([getKeyInfoResponse]);

      const result = await strategy.getKeys(mockClusterRedisClient, args);

      expect(result).toEqual([
        {
          ...mockClusterNodesEmptyResult[0],
          total: mockGetTotalResponse1,
          scanned: getKeysDto.count,
          keys: [getKeyInfoResponse],
        },
        {
          ...mockClusterNodesEmptyResult[1],
          total: mockGetTotalResponse1,
          scanned: getKeysDto.count,
          keys: [getKeyInfoResponse],
        },
        {
          ...mockClusterNodesEmptyResult[2],
          total: mockGetTotalResponse1,
          scanned: getKeysDto.count,
          keys: [getKeyInfoResponse],
        },
      ]);
      expect(strategy.getKeysInfo).toHaveBeenCalled();
      expect(mockNode1.sendCommand).toHaveBeenNthCalledWith(
        1,
        [BrowserToolKeysCommands.Scan, '11', 'MATCH', args.match, 'COUNT', args.count, 'TYPE', args.type],
      );
      expect(mockNode2.sendCommand).toHaveBeenNthCalledWith(
        1,
        [BrowserToolKeysCommands.Scan, '22', 'MATCH', args.match, 'COUNT', args.count, 'TYPE', args.type],
      );
      expect(mockNode3.sendCommand).toHaveBeenNthCalledWith(
        1,
        [BrowserToolKeysCommands.Scan, '33', 'MATCH', args.match, 'COUNT', args.count, 'TYPE', args.type],
      );
    });
    it('should skip nodes with negative cursors custom cursor', async () => {
      const args = {
        ...getKeysDto,
        cursor: '172.1.0.1:7000@0||172.1.0.1:7001@-1||172.1.0.1:7002@-22',
      };
      jest.spyOn(Utils, 'getTotalKeys').mockResolvedValueOnce(mockGetTotalResponse1);

      when(mockNode1.sendCommand)
        .calledWith(expect.arrayContaining([BrowserToolKeysCommands.Scan]))
        .mockResolvedValue([0, [Buffer.from(getKeyInfoResponse.name)]]);

      strategy.getKeysInfo = mockGetKeysInfoFn;

      const result = await strategy.getKeys(mockClusterRedisClient, args);

      expect(result).toEqual([
        {
          ...mockClusterNodesEmptyResult[0],
          total: mockGetTotalResponse1,
          scanned: getKeysDto.count,
          keys: [getKeyInfoResponse],
        },
      ]);
      expect(strategy.getKeysInfo).toBeCalledTimes(1);
      expect(mockNode1.sendCommand).toBeCalledTimes(1);
      expect(mockNode1.sendCommand).toBeCalledWith(
        [BrowserToolKeysCommands.Scan, '0', 'MATCH', '*', 'COUNT', args.count],
      );
      expect(mockNode2.sendCommand).toBeCalledTimes(0);
      expect(mockNode3.sendCommand).toBeCalledTimes(0);
    });
    it('should call scan 3,2,1 times per nodes and return appropriate value', async () => {
      const args = { ...getKeysDto };
      jest.spyOn(Utils, 'getTotalKeys').mockResolvedValueOnce(mockGetTotalResponse3000);
      jest.spyOn(Utils, 'getTotalKeys').mockResolvedValueOnce(mockGetTotalResponse2000);
      jest.spyOn(Utils, 'getTotalKeys').mockResolvedValueOnce(mockGetTotalResponse1000);

      // Node1 mocks (3 iterations)
      when(mockNode1.sendCommand)
        .calledWith(
          [BrowserToolKeysCommands.Scan, '0', 'MATCH', '*', 'COUNT', args.count],
        )
        .mockResolvedValue(['1', [Buffer.from(getKeyInfoResponse.name)]]);
      when(mockNode1.sendCommand)
        .calledWith(
          [BrowserToolKeysCommands.Scan, '1', 'MATCH', '*', 'COUNT', args.count],
        )
        .mockResolvedValue(['2', [Buffer.from(getKeyInfoResponse.name)]]);
      when(mockNode1.sendCommand)
        .calledWith(
          [BrowserToolKeysCommands.Scan, '2', 'MATCH', '*', 'COUNT', args.count],
        )
        .mockResolvedValue(['0', [Buffer.from(getKeyInfoResponse.name)]]);
      // Node2 mocks (2 iterations)
      when(mockNode2.sendCommand)
        .calledWith(
          [BrowserToolKeysCommands.Scan, '0', 'MATCH', '*', 'COUNT', args.count],
        )
        .mockResolvedValue(['1', [Buffer.from(getKeyInfoResponse.name)]]);
      when(mockNode2.sendCommand)
        .calledWith(
          [BrowserToolKeysCommands.Scan, '1', 'MATCH', '*', 'COUNT', args.count],
        )
        .mockResolvedValue(['0', [Buffer.from(getKeyInfoResponse.name)]]);
      // Node3 mocks (1 iteration)
      when(mockNode3.sendCommand)
        .calledWith(
          expect.arrayContaining([BrowserToolKeysCommands.Scan]),
        )
        .mockResolvedValue(['0', [Buffer.from(getKeyInfoResponse.name)]]);

      strategy.getKeysInfo = mockGetKeysInfoFn;

      const result = await strategy.getKeys(mockClusterRedisClient, args);

      expect(result).toEqual([
        {
          ...mockClusterNodesEmptyResult[0],
          total: mockGetTotalResponse3000,
          scanned: getKeysDto.count * 3,
          keys: new Array(3).fill(getKeyInfoResponse),
        },
        {
          ...mockClusterNodesEmptyResult[1],
          total: mockGetTotalResponse2000,
          scanned: getKeysDto.count * 2,
          keys: new Array(2).fill(getKeyInfoResponse),
        },
        {
          ...mockClusterNodesEmptyResult[2],
          total: mockGetTotalResponse1000,
          scanned: getKeysDto.count,
          keys: [getKeyInfoResponse],
        },
      ]);
      expect(strategy.getKeysInfo).toHaveBeenCalled();

      expect(mockNode1.sendCommand).toBeCalledTimes(3);
      expect(mockNode1.sendCommand).toHaveBeenNthCalledWith(
        1,
        [BrowserToolKeysCommands.Scan, '0', 'MATCH', '*', 'COUNT', args.count],
      );
      expect(mockNode1.sendCommand).toHaveBeenNthCalledWith(
        2,
        [BrowserToolKeysCommands.Scan, '1', 'MATCH', '*', 'COUNT', args.count],
      );
      expect(mockNode1.sendCommand).toHaveBeenNthCalledWith(
        3,
        [BrowserToolKeysCommands.Scan, '2', 'MATCH', '*', 'COUNT', args.count],
      );

      expect(mockNode2.sendCommand).toBeCalledTimes(2);
      expect(mockNode2.sendCommand).toHaveBeenNthCalledWith(
        1,
        [BrowserToolKeysCommands.Scan, '0', 'MATCH', '*', 'COUNT', args.count],
      );
      expect(mockNode2.sendCommand).toHaveBeenNthCalledWith(
        2,
        [BrowserToolKeysCommands.Scan, '1', 'MATCH', '*', 'COUNT', args.count],
      );

      expect(mockNode3.sendCommand).toBeCalledTimes(1);
      expect(mockNode3.sendCommand).toHaveBeenNthCalledWith(
        1,
        [BrowserToolKeysCommands.Scan, '0', 'MATCH', '*', 'COUNT', args.count],
      );
    });
    it.only('should call scan 3,2,N times per nodes until threshold exceeds', async () => {
      const args = { ...getKeysDto, count: 100 };
      const expectedNode3CallsBeforeThreshold = Math.trunc(
        // -5 is number of scans for node1 (3) and node2 (2)
        // since threshold applied for sum of all nodes scanned
        getKeysDto.countThreshold / args.count - 5,
      );

      jest.spyOn(Utils, 'getTotalKeys').mockResolvedValueOnce(mockGetTotalResponse3000);
      jest.spyOn(Utils, 'getTotalKeys').mockResolvedValueOnce(mockGetTotalResponse2000);
      jest.spyOn(Utils, 'getTotalKeys').mockResolvedValueOnce(mockGetTotalResponse1000000);

      // Node1 mocks (3 iterations)
      when(mockNode1.sendCommand)
        .calledWith(
          [BrowserToolKeysCommands.Scan, '0', 'MATCH', '*', 'COUNT', args.count],
        )
        .mockResolvedValue(['1', [Buffer.from(getKeyInfoResponse.name)]]);
      when(mockNode1.sendCommand)
        .calledWith(
          [BrowserToolKeysCommands.Scan, '1', 'MATCH', '*', 'COUNT', args.count],
        )
        .mockResolvedValue(['2', [Buffer.from(getKeyInfoResponse.name)]]);
      when(mockNode1.sendCommand)
        .calledWith(
          [BrowserToolKeysCommands.Scan, '2', 'MATCH', '*', 'COUNT', args.count],
        )
        .mockResolvedValue(['0', [Buffer.from(getKeyInfoResponse.name)]]);
      // Node2 mocks (2 iterations)
      when(mockNode2.sendCommand)
        .calledWith(
          [BrowserToolKeysCommands.Scan, '0', 'MATCH', '*', 'COUNT', args.count],
        )
        .mockResolvedValue(['1', [Buffer.from(getKeyInfoResponse.name)]]);
      when(mockNode2.sendCommand)
        .calledWith(
          [BrowserToolKeysCommands.Scan, '1', 'MATCH', '*', 'COUNT', args.count],
        )
        .mockResolvedValue(['0', [Buffer.from(getKeyInfoResponse.name)]]);
      // Node3 mocks (infinite number of iterations limited by threshold)
      when(mockNode3.sendCommand)
        .calledWith(
          expect.arrayContaining([BrowserToolKeysCommands.Scan]),
        )
        .mockResolvedValue(['1', []]);

      strategy.getKeysInfo = mockGetKeysInfoFn;

      const result = await strategy.getKeys(mockClusterRedisClient, args);

      expect(result).toEqual([
        {
          ...mockClusterNodesEmptyResult[0],
          total: mockGetTotalResponse3000,
          scanned: args.count * 3,
          keys: new Array(3).fill(getKeyInfoResponse),
        },
        {
          ...mockClusterNodesEmptyResult[1],
          total: mockGetTotalResponse2000,
          scanned: args.count * 2,
          keys: new Array(2).fill(getKeyInfoResponse),
        },
        {
          ...mockClusterNodesEmptyResult[2],
          total: mockGetTotalResponse1000000,
          cursor: 1,
          scanned:
            Math.trunc(getKeysDto.countThreshold / args.count)
              * args.count
              - 5 * args.count, // 5 = scan for other shards (3 and 2)
          keys: [],
        },
      ]);

      expect(strategy.getKeysInfo).toHaveBeenCalled();

      expect(mockNode1.sendCommand).toBeCalledTimes(3);
      expect(mockNode1.sendCommand).toHaveBeenNthCalledWith(
        1,
        [BrowserToolKeysCommands.Scan, '0', 'MATCH', '*', 'COUNT', args.count],
      );
      expect(mockNode1.sendCommand).toHaveBeenNthCalledWith(
        2,
        [BrowserToolKeysCommands.Scan, '1', 'MATCH', '*', 'COUNT', args.count],
      );
      expect(mockNode1.sendCommand).toHaveBeenNthCalledWith(
        3,
        [BrowserToolKeysCommands.Scan, '2', 'MATCH', '*', 'COUNT', args.count],
      );

      expect(mockNode2.sendCommand).toBeCalledTimes(2);
      expect(mockNode2.sendCommand).toHaveBeenNthCalledWith(
        1,
        [BrowserToolKeysCommands.Scan, '0', 'MATCH', '*', 'COUNT', args.count],
      );
      expect(mockNode2.sendCommand).toHaveBeenNthCalledWith(
        2,
        [BrowserToolKeysCommands.Scan, '1', 'MATCH', '*', 'COUNT', args.count],
      );

      expect(mockNode3.sendCommand).toBeCalledTimes(expectedNode3CallsBeforeThreshold);
      expect(mockNode3.sendCommand).toHaveBeenNthCalledWith(
        1,
        [BrowserToolKeysCommands.Scan, '0', 'MATCH', '*', 'COUNT', args.count],
      );
      expect(mockNode3.sendCommand).toHaveBeenNthCalledWith(
        2,
        [BrowserToolKeysCommands.Scan, '1', 'MATCH', '*', 'COUNT', args.count],
      );
      expect(mockNode3.sendCommand).toHaveBeenNthCalledWith(
        3,
        [BrowserToolKeysCommands.Scan, '1', 'MATCH', '*', 'COUNT', args.count],
      );
      expect(mockNode3.sendCommand).toHaveBeenNthCalledWith(
        4,
        [BrowserToolKeysCommands.Scan, '1', 'MATCH', '*', 'COUNT', args.count],
      );
      expect(mockNode3.sendCommand).toHaveBeenNthCalledWith(
        expectedNode3CallsBeforeThreshold,
        [BrowserToolKeysCommands.Scan, '1', 'MATCH', '*', 'COUNT', args.count],
      );
    });
    it('should not call scan when total is 0', async () => {
      const args = { ...getKeysDto, count: undefined };
      jest.spyOn(Utils, 'getTotalKeys').mockResolvedValue(mockGetTotalResponse0);

      strategy.getKeysInfo = mockGetKeysInfoFn;

      const result = await strategy.getKeys(mockClusterRedisClient, args);

      expect(result).toEqual([
        {
          ...mockClusterNodesEmptyResult[0],
          total: 0,
          scanned: 0,
          keys: [],
        },
        {
          ...mockClusterNodesEmptyResult[1],
          total: 0,
          scanned: 0,
          keys: [],
        },
        {
          ...mockClusterNodesEmptyResult[2],
          total: 0,
          scanned: 0,
          keys: [],
        },
      ]);
      expect(strategy.getKeysInfo).toBeCalledTimes(0);
      expect(mockNode1.sendCommand).toBeCalledTimes(0);
      expect(mockNode2.sendCommand).toBeCalledTimes(0);
      expect(mockNode3.sendCommand).toBeCalledTimes(0);
    });
    it('should throw error if incorrect cursor passed', async () => {
      try {
        const args = {
          ...getKeysDto,
          cursor: '172.1.0.1asd00@0||172.1.0.1:7001@0||172.1.0.1:7002@0',
        };
        await strategy.getKeys(mockClusterRedisClient, args);
        fail();
      } catch (err) {
        expect(err.message).toEqual(
          ERROR_MESSAGES.INCORRECT_CLUSTER_CURSOR_FORMAT,
        );
      }
    });
    it('should throw error on scan command', async () => {
      const args = { ...getKeysDto };
      jest.spyOn(Utils, 'getTotalKeys').mockResolvedValue(mockGetTotalResponse1);

      const replyError: ReplyError = {
        ...mockRedisNoPermError,
        command: 'SCAN',
      };

      when(mockNode1.sendCommand)
        .calledWith(
          expect.arrayContaining([BrowserToolKeysCommands.Scan]),
        )
        .mockRejectedValue(replyError);

      try {
        await strategy.getKeys(mockClusterRedisClient, args);
        fail();
      } catch (err) {
        expect(err.message).toEqual(replyError.message);
      }
    });
    describe('get keys by glob patter', () => {
      beforeEach(async () => {
        jest.spyOn(Utils, 'getTotalKeys').mockResolvedValue(mockGetTotalResponse10);

        strategy['scanNodes'] = jest.fn();
      });
      it("should call scan when math contains '?' glob", async () => {
        const dto: GetKeysDto = { ...getKeysDto, match: 'test?tring' };
        strategy.getKeysInfo = jest
          .fn()
          .mockResolvedValue([getKeyInfoResponse]);

        await strategy.getKeys(mockClusterRedisClient, dto);

        expect(strategy['scanNodes']).toHaveBeenCalled();
      });
      it("should call scan when math contains '*' glob", async () => {
        const dto: GetKeysDto = { ...getKeysDto, match: 'test*' };
        strategy.getKeysInfo = jest
          .fn()
          .mockResolvedValue([getKeyInfoResponse]);

        await strategy.getKeys(mockClusterRedisClient, dto);

        expect(strategy['scanNodes']).toHaveBeenCalled();
      });
      it("should call scan when math contains '[ae]' glob", async () => {
        const dto: GetKeysDto = { ...getKeysDto, match: 't[ae]stString' };
        strategy.getKeysInfo = jest
          .fn()
          .mockResolvedValue([getKeyInfoResponse]);

        await strategy.getKeys(mockClusterRedisClient, dto);

        expect(strategy['scanNodes']).toHaveBeenCalled();
      });
      it("should call scan when math contains '[a-e]' glob", async () => {
        const dto: GetKeysDto = { ...getKeysDto, match: 't[a-e]stString' };
        strategy.getKeysInfo = jest
          .fn()
          .mockResolvedValue([getKeyInfoResponse]);

        await strategy.getKeys(mockClusterRedisClient, dto);

        expect(strategy['scanNodes']).toHaveBeenCalled();
      });
      it("should call scan when math contains '[^e]' glob", async () => {
        const dto: GetKeysDto = { ...getKeysDto, match: 't[^e]stString' };
        strategy.getKeysInfo = jest
          .fn()
          .mockResolvedValue([getKeyInfoResponse]);

        await strategy.getKeys(mockClusterRedisClient, dto);

        expect(strategy['scanNodes']).toHaveBeenCalled();
      });
      it('should not call scan when math contains escaped glob', async () => {
        const dto: GetKeysDto = { ...getKeysDto, match: 't\\[a-e\\]stString' };
        strategy.getKeysInfo = jest
          .fn()
          .mockResolvedValue([getKeyInfoResponse]);

        await strategy.getKeys(mockClusterRedisClient, dto);

        expect(strategy['scanNodes']).not.toHaveBeenCalled();
      });
    });
    describe('find exact key', () => {
      const key = getKeyInfoResponse.name;
      beforeEach(async () => {
        jest.spyOn(Utils, 'getTotalKeys').mockResolvedValue(mockGetTotalResponse10);

        strategy['scanNodes'] = jest.fn();
        strategy.getKeysInfo = jest.fn()
          .mockResolvedValue([getKeyInfoResponse]);
      });
      it('should find exact key when match is not glob patter', async () => {
        const dto: GetKeysDto = { ...getKeysDto, match: key };
        strategy.getKeysInfo = jest
          .fn()
          .mockResolvedValue([getKeyInfoResponse]);

        const result = await strategy.getKeys(mockClusterRedisClient, dto);

        expect(result).toEqual([
          {
            ...mockClusterNodesEmptyResult[0],
            total: 10,
            scanned: 10,
            keys: [getKeyInfoResponse],
          },
          {
            ...mockClusterNodesEmptyResult[1],
            total: 10,
            scanned: 10,
          },
          {
            ...mockClusterNodesEmptyResult[2],
            total: 10,
            scanned: 10,
          },
        ]);
        expect(strategy.getKeysInfo).toHaveBeenCalledWith(mockClusterRedisClient, [Buffer.from(key)], dto.type);
        expect(strategy['scanNodes']).not.toHaveBeenCalled();
      });
      it('should find exact key when match is escaped glob patter', async () => {
        const dto: GetKeysDto = { ...getKeysDto, match: 'testString\\*' };
        const searchPattern = 'testString*';
        strategy.getKeysInfo = jest
          .fn()
          .mockResolvedValue([{ ...getKeyInfoResponse, name: searchPattern }]);

        const result = await strategy.getKeys(mockClusterRedisClient, dto);

        expect(result).toEqual([
          {
            ...mockClusterNodesEmptyResult[0],
            total: 10,
            scanned: 10,
            keys: [{ ...getKeyInfoResponse, name: searchPattern }],
          },
          {
            ...mockClusterNodesEmptyResult[1],
            total: 10,
            scanned: 10,
          },
          {
            ...mockClusterNodesEmptyResult[2],
            total: 10,
            scanned: 10,
          },
        ]);
        expect(strategy.getKeysInfo).toHaveBeenCalledWith(
          mockClusterRedisClient,
          [Buffer.from(searchPattern)],
          dto.type,
        );
        expect(strategy['scanNodes']).not.toHaveBeenCalled();
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

        const result = await strategy.getKeys(mockClusterRedisClient, dto);

        expect(result).toEqual([
          {
            ...mockClusterNodesEmptyResult[0],
            total: 10,
            scanned: 10,
            keys: [getKeyInfoResponse],
          },
          {
            ...mockClusterNodesEmptyResult[1],
            total: 10,
            scanned: 10,
          },
          {
            ...mockClusterNodesEmptyResult[2],
            total: 10,
            scanned: 10,
          },
        ]);

        expect(strategy.getKeysInfo).toHaveBeenCalledWith(
          mockClusterRedisClient,
          [Buffer.from(key)],
          dto.type,
        );
        expect(strategy['scanNodes']).not.toHaveBeenCalled();
      });
      it('should return empty array if key not exist', async () => {
        const dto: GetKeysDto = { ...getKeysDto, match: key };
        strategy.getKeysInfo = jest.fn().mockResolvedValue([{
          name: 'testString',
          type: 'none',
          ttl: -2,
          size: null,
        }]);

        const result = await strategy.getKeys(mockClusterRedisClient, dto);

        expect(result).toEqual([
          {
            ...mockClusterNodesEmptyResult[0],
            total: 10,
            scanned: 10,
            keys: [],
          },
          {
            ...mockClusterNodesEmptyResult[1],
            total: 10,
            scanned: 10,
          },
          {
            ...mockClusterNodesEmptyResult[2],
            total: 10,
            scanned: 10,
          },
        ]);

        expect(strategy.getKeysInfo).toHaveBeenCalledWith(
          mockClusterRedisClient,
          [Buffer.from(key)],
          dto.type,
        );
        expect(strategy['scanNodes']).not.toHaveBeenCalled();
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

        const result = await strategy.getKeys(mockClusterRedisClient, dto);

        expect(result).toEqual([
          {
            ...mockClusterNodesEmptyResult[0],
            total: 10,
            scanned: 10,
            keys: [],
          },
          {
            ...mockClusterNodesEmptyResult[1],
            total: 10,
            scanned: 10,
          },
          {
            ...mockClusterNodesEmptyResult[2],
            total: 10,
            scanned: 10,
          },
        ]);

        expect(strategy.getKeysInfo).toHaveBeenCalledWith(
          mockClusterRedisClient,
          [Buffer.from(key)],
          dto.type,
        );
        expect(strategy['scanNodes']).not.toHaveBeenCalled();
      });
    });
  });

  describe('getKeysInfo', () => {
    const keys = ['key1', 'key2'];

    beforeEach(() => {
      when(mockClusterRedisClient.sendPipeline)
        .calledWith([
          jasmine.arrayContaining([BrowserToolKeysCommands.Ttl]),
          jasmine.arrayContaining(['memory', 'usage']),
          jasmine.arrayContaining([BrowserToolKeysCommands.Type]),
        ],
        { replyEncoding: 'utf8' })
        .mockResolvedValue([[null, -1], [null, 50], [null, 'string']]);
      when(mockClusterRedisClient.sendPipeline)
        .calledWith([
          jasmine.arrayContaining([BrowserToolKeysCommands.Ttl]),
          jasmine.arrayContaining(['memory', 'usage']),
        ],
        { replyEncoding: 'utf8' })
        .mockResolvedValue([[null, 999], [null, 555]]);
    });
    it('should return correct keys info (cluster)', async () => {
      const mockResult: GetKeyInfoResponse[] = keys.map((key) => ({
        ...mockKeyInfo,
        name: key,
      }));

      const result = await strategy.getKeysInfo(mockClusterRedisClient, keys);

      expect(result).toEqual(mockResult);
    });
    it('should not call TYPE pipeline for keys with known type', async () => {
      const mockResult: GetKeyInfoResponse[] = keys.map((key) => ({
        ...mockKeyInfo,
        ttl: 999,
        size: 555,
        name: key,
      }));

      const result = await strategy.getKeysInfo(
        mockClusterRedisClient,
        keys,
        RedisDataType.String,
      );

      expect(result).toEqual(mockResult);
    });
  });
});
