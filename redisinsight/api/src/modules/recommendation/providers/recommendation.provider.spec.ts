import { when, resetAllWhenMocks } from 'jest-when';
import { RECOMMENDATION_NAMES } from 'src/constants';
import { mockRedisNoAuthError, mockRedisNoPasswordError, mockStandaloneRedisClient } from 'src/__mocks__';
import { RecommendationProvider } from 'src/modules/recommendation/providers/recommendation.provider';
import { RedisClientConnectionType } from 'src/modules/redis/client';

const mockRedisMemoryInfoResponse1: string = '# Memory\r\nnumber_of_cached_scripts:10\r\n';
const mockRedisMemoryInfoResponse2: string = '# Memory\r\nnumber_of_cached_scripts:11\r\n';

const mockRedisKeyspaceInfoResponse1: string = '# Keyspace\r\ndb0:keys=2,expires=0,avg_ttl=0\r\n';
const mockRedisKeyspaceInfoResponse2: string = `# Keyspace\r\ndb0:keys=2,expires=0,avg_ttl=0\r\n
  db1:keys=0,expires=0,avg_ttl=0\r\n`;
const mockRedisKeyspaceInfoResponse3: string = `# Keyspace\r\ndb0:keys=2,expires=0,avg_ttl=0\r\n
  db2:keys=20,expires=0,avg_ttl=0\r\n`;

const mockRedisConfigResponse = ['name', '512'];

const mockRedisClientsResponse1: string = '# Clients\r\nconnected_clients:100\r\n';
const mockRedisClientsResponse2: string = '# Clients\r\nconnected_clients:101\r\n';

const mockRedisServerResponse1: string = '# Server\r\nredis_version:7.4.0\r\n';
const mockRedisServerResponse2: string = '# Server\r\nredis_version:6.0.0\r\n';

const mockRedisAclListResponse1: string[] = [
  'user <pass off resetchannels -@all',
  'user default on #d74ff0ee8da3b9806b18c877dbf29bbde50b5bd8e4dad7a3a725000feb82e8f1 ~* &* +@all',
];
const mockRedisAclListResponse2: string[] = [
  ...mockRedisAclListResponse1,
  'user test_2 on nopass ~* &* +@all',
];

const mockFTListResponse1 = [];
const mockFTListResponse2 = ['idx'];

const mockKeys = [
  {
    name: Buffer.from('name'), type: 'string', length: 10, memory: 10, ttl: -1,
  },
  {
    name: Buffer.from('name'), type: 'hash', length: 10, memory: 10, ttl: -1,
  },
  {
    name: Buffer.from('name'), type: 'stream', length: 10, memory: 10, ttl: -1,
  },
  {
    name: Buffer.from('name'), type: 'set', length: 10, memory: 10, ttl: -1,
  },
  {
    name: Buffer.from('name'), type: 'zset', length: 10, memory: 10, ttl: -1,
  },
  {
    name: Buffer.from('name'), type: 'ReJSON-RL', length: 10, memory: 10, ttl: -1,
  },
  {
    name: Buffer.from('name'), type: 'graphdata', length: 10, memory: 10, ttl: -1,
  },
  {
    name: Buffer.from('name'), type: 'TSDB-TYPE', length: 10, memory: 10, ttl: -1,
  },
];

const mockBigHashKey = {
  name: Buffer.from('name'), type: 'hash', length: 5001, memory: 10, ttl: -1,
};

const mockBigHashKey3 = {
  name: Buffer.from('name'), type: 'hash', length: 513, memory: 10, ttl: -1,
};

const mockBigStringKey = {
  name: Buffer.from('name'), type: 'string', length: 10, memory: 201, ttl: -1,
};

const mockHugeStringKey = {
  name: Buffer.from('name'), type: 'string', length: 10, memory: 100_001, ttl: -1,
};

const mockBigSet = {
  name: Buffer.from('name'), type: 'set', length: 513, memory: 10, ttl: -1,
};

const mockHugeSet = {
  name: Buffer.from('name'), type: 'set', length: 1_001, memory: 10, ttl: -1,
};

const mockBigZSetKey = {
  name: Buffer.from('name'), type: 'zset', length: 513, memory: 10, ttl: -1,
};

const mockBigListKey = {
  name: Buffer.from('name'), type: 'list', length: 1001, memory: 10, ttl: -1,
};

const mockSmallStringKey = {
  name: Buffer.from('name'), type: 'string', length: 10, memory: 199, ttl: -1,
};

const mockStreamKey = {
  name: Buffer.from('name'), type: 'stream', length: 1, memory: 1, ttl: -1,
};

const mockSearchHashes = new Array(51).fill(mockBigHashKey);

const generateRTSRecommendationTests = [
  { input: ['0', ['123', 123]], expected: null },
  { input: ['0', ['1234567891', 3]], expected: { name: RECOMMENDATION_NAMES.RTS, params: { keys: [Buffer.from('name')] } } },
  { input: ['0', ['1234567891', 1234567891]], expected: { name: RECOMMENDATION_NAMES.RTS, params: { keys: [Buffer.from('name')] } } },
  { input: ['0', ['123', 1234567891]], expected: { name: RECOMMENDATION_NAMES.RTS, params: { keys: [Buffer.from('name')] } } },
  { input: ['0', ['123', 12345678911]], expected: null },
  { input: ['0', ['123', 1234567891234]], expected: { name: RECOMMENDATION_NAMES.RTS, params: { keys: [Buffer.from('name')] } } },
  { input: ['0', ['123', 12345678912345]], expected: null },
  { input: ['0', ['123', 1234567891234567]], expected: { name: RECOMMENDATION_NAMES.RTS, params: { keys: [Buffer.from('name')] } } },
  { input: ['0', ['12345678912345678', 1]], expected: null },
  { input: ['0', ['1234567891234567891', 1]], expected: { name: RECOMMENDATION_NAMES.RTS, params: { keys: [Buffer.from('name')] } } },
  { input: ['0', ['1', 1234567891.2]], expected: { name: RECOMMENDATION_NAMES.RTS, params: { keys: [Buffer.from('name')] } } },
  { input: ['0', ['1234567891.2', 1]], expected: { name: RECOMMENDATION_NAMES.RTS, params: { keys: [Buffer.from('name')] } } },
  { input: ['0', ['1234567891:12', 1]], expected: { name: RECOMMENDATION_NAMES.RTS, params: { keys: [Buffer.from('name')] } } },
  { input: ['0', ['1234567891a12', 1]], expected: { name: RECOMMENDATION_NAMES.RTS, params: { keys: [Buffer.from('name')] } } },
  { input: ['0', ['1234567891.2.2', 1]], expected: null },
  { input: ['0', ['1234567891asd', 1]], expected: null },
  { input: ['0', ['10-10-2020', 1]], expected: { name: RECOMMENDATION_NAMES.RTS, params: { keys: [Buffer.from('name')] } } },
  { input: ['0', ['', 1]], expected: null },
  { input: ['0', ['1', -12]], expected: null },
  { input: ['0', ['1', -1234567891]], expected: null },
  { input: ['0', ['1', -1234567891.123]], expected: null },
  { input: ['0', ['1', -1234567891.123]], expected: null },
  { input: ['0', ['1234567891.-123', 1]], expected: null },
];

const mockSortedSets = new Array(101).fill(
  {
    name: Buffer.from('name'), type: 'zset', length: 10, memory: 10, ttl: -1,
  },
);

const mockZScanResponse2 = [
  '0',
  ['12345678910', 12345678910, 1, 1],
];

const mockZScanResponse1 = [
  '0',
  ['1', 1, '12345678910', 12345678910],
];

describe('RecommendationProvider', () => {
  const client = mockStandaloneRedisClient;
  const service = new RecommendationProvider();

  describe('determineLuaScriptRecommendation', () => {
    it('should not return luaScript recommendation', async () => {
      when(client.sendCommand)
        .calledWith(jasmine.arrayContaining(['info']), expect.anything())
        .mockResolvedValue(mockRedisMemoryInfoResponse1);

      const luaScriptRecommendation = await service.determineLuaScriptRecommendation(client);
      expect(luaScriptRecommendation).toEqual(null);
    });

    it('should return luaScript recommendation', async () => {
      when(client.sendCommand)
        .calledWith(jasmine.arrayContaining(['info']), expect.anything())
        .mockResolvedValue(mockRedisMemoryInfoResponse2);

      const luaScriptRecommendation = await service.determineLuaScriptRecommendation(client);
      expect(luaScriptRecommendation).toEqual({ name: RECOMMENDATION_NAMES.LUA_SCRIPT });
    });

    it('should not return luaScript recommendation when info command executed with error', async () => {
      when(client.sendCommand)
        .calledWith(jasmine.arrayContaining(['info']), expect.anything())
        .mockRejectedValue('some error');

      const luaScriptRecommendation = await service.determineLuaScriptRecommendation(client);
      expect(luaScriptRecommendation).toEqual(null);
    });
  });

  describe('determineBigHashesRecommendation', () => {
    it('should not return bigHashes recommendation', async () => {
      const bigHashesRecommendation = await service.determineBigHashesRecommendation(mockKeys);
      expect(bigHashesRecommendation).toEqual(null);
    });
    it('should return bigHashes recommendation', async () => {
      const bigHashesRecommendation = await service.determineBigHashesRecommendation(
        [...mockKeys, mockBigHashKey],
      );
      expect(bigHashesRecommendation)
        .toEqual({ name: RECOMMENDATION_NAMES.BIG_HASHES, params: { keys: [mockBigHashKey.name] } });
    });
  });

  describe('determineBigTotalRecommendation', () => {
    it('should not return useSmallerKeys recommendation', async () => {
      const bigTotalRecommendation = await service.determineBigTotalRecommendation(1);
      expect(bigTotalRecommendation).toEqual(null);
    });
    it('should return useSmallerKeys recommendation', async () => {
      const bigTotalRecommendation = await service.determineBigTotalRecommendation(1_000_001);
      expect(bigTotalRecommendation).toEqual({ name: RECOMMENDATION_NAMES.USE_SMALLER_KEYS });
    });
  });

  describe('determineLogicalDatabasesRecommendation', () => {
    it('should not return avoidLogicalDatabases recommendation when only one logical db', async () => {
      when(client.sendCommand)
        .calledWith(jasmine.arrayContaining(['info']), expect.anything())
        .mockResolvedValue(mockRedisKeyspaceInfoResponse1);

      const avoidLogicalDatabasesRecommendation = await service.determineLogicalDatabasesRecommendation(client);
      expect(avoidLogicalDatabasesRecommendation).toEqual(null);
    });

    it('should not return avoidLogicalDatabases recommendation when only on logical db with keys', async () => {
      when(client.sendCommand)
        .calledWith(jasmine.arrayContaining(['info']), expect.anything())
        .mockResolvedValue(mockRedisKeyspaceInfoResponse2);

      const avoidLogicalDatabasesRecommendation = await service.determineLogicalDatabasesRecommendation(client);
      expect(avoidLogicalDatabasesRecommendation).toEqual(null);
    });

    it('should return avoidLogicalDatabases recommendation', async () => {
      when(client.sendCommand)
        .calledWith(jasmine.arrayContaining(['info']), expect.anything())
        .mockResolvedValue(mockRedisKeyspaceInfoResponse3);

      const avoidLogicalDatabasesRecommendation = await service.determineLogicalDatabasesRecommendation(client);
      expect(avoidLogicalDatabasesRecommendation).toEqual({ name: 'avoidLogicalDatabases' });
    });

    it('should not return avoidLogicalDatabases recommendation when info command executed with error', async () => {
      when(client.sendCommand)
        .calledWith(jasmine.arrayContaining(['info']), expect.anything())
        .mockRejectedValue('some error');

      const avoidLogicalDatabasesRecommendation = await service.determineLogicalDatabasesRecommendation(client);
      expect(avoidLogicalDatabasesRecommendation).toEqual(null);
    });

    it('should not return avoidLogicalDatabases recommendation when isCluster', async () => {
      client.getConnectionType = jest.fn().mockReturnValueOnce(RedisClientConnectionType.CLUSTER);
      when(client.sendCommand)
        .calledWith(jasmine.arrayContaining(['info']), expect.anything())
        .mockResolvedValue(mockRedisKeyspaceInfoResponse3);

      const avoidLogicalDatabasesRecommendation = await service.determineLogicalDatabasesRecommendation(client);
      expect(avoidLogicalDatabasesRecommendation).toEqual(null);
      // nodeClient.isCluster = false;
    });
  });

  describe('determineCombineSmallStringsToHashesRecommendation', () => {
    it('should not return combineSmallStringsToHashes recommendation', async () => {
      const smallStringRecommendation = await service.determineCombineSmallStringsToHashesRecommendation(
        new Array(9).fill(mockSmallStringKey),
      );
      expect(smallStringRecommendation).toEqual(null);
    });
    it('should not return combineSmallStringsToHashes recommendation when strings are big', async () => {
      const smallStringRecommendation = await service.determineCombineSmallStringsToHashesRecommendation(
        new Array(10).fill(mockBigStringKey),
      );
      expect(smallStringRecommendation).toEqual(null);
    });
    it('should return combineSmallStringsToHashes recommendation', async () => {
      const smallStringRecommendation = await service
        .determineCombineSmallStringsToHashesRecommendation(new Array(10).fill(mockSmallStringKey));
      expect(smallStringRecommendation)
        .toEqual({
          name: RECOMMENDATION_NAMES.COMBINE_SMALL_STRINGS_TO_HASHES,
          params: { keys: [Buffer.from('name')] },
        });
    });
  });

  describe('determineIncreaseSetMaxIntsetEntriesRecommendation', () => {
    it('should not return increaseSetMaxIntsetEntries', async () => {
      when(client.sendCommand)
        .calledWith(jasmine.arrayContaining(['config']), expect.anything())
        .mockResolvedValue(mockRedisConfigResponse);

      const increaseSetMaxIntsetEntriesRecommendation = await service
        .determineIncreaseSetMaxIntsetEntriesRecommendation(client, mockKeys);
      expect(increaseSetMaxIntsetEntriesRecommendation).toEqual(null);
    });

    it('should return increaseSetMaxIntsetEntries recommendation', async () => {
      when(client.sendCommand)
        .calledWith(jasmine.arrayContaining(['config']), expect.anything())
        .mockResolvedValue(mockRedisConfigResponse);

      const increaseSetMaxIntsetEntriesRecommendation = await service
        .determineIncreaseSetMaxIntsetEntriesRecommendation(client, [...mockKeys, mockBigSet]);
      expect(increaseSetMaxIntsetEntriesRecommendation)
        .toEqual({
          name: RECOMMENDATION_NAMES.INCREASE_SET_MAX_INTSET_ENTRIES,
          params: { keys: [mockBigSet.name] },
        });
    });

    it('should not return increaseSetMaxIntsetEntries recommendation when config command executed with error',
      async () => {
        when(client.sendCommand)
          .calledWith(jasmine.arrayContaining(['config']), expect.anything())
          .mockRejectedValue('some error');

        const increaseSetMaxIntsetEntriesRecommendation = await service
          .determineIncreaseSetMaxIntsetEntriesRecommendation(client, mockKeys);
        expect(increaseSetMaxIntsetEntriesRecommendation).toEqual(null);
      });
  });

  describe('determineHashHashtableToZiplistRecommendation', () => {
    it('should not return hashHashtableToZiplist recommendation', async () => {
      when(client.sendCommand)
        .calledWith(jasmine.arrayContaining(['config']), expect.anything())
        .mockResolvedValue(mockRedisConfigResponse);

      const convertHashtableToZiplistRecommendation = await service
        .determineHashHashtableToZiplistRecommendation(client, mockKeys);
      expect(convertHashtableToZiplistRecommendation).toEqual(null);
    });

    it('should return hashHashtableToZiplist recommendation', async () => {
      when(client.sendCommand)
        .calledWith(jasmine.arrayContaining(['config']), expect.anything())
        .mockResolvedValue(mockRedisConfigResponse);

      const convertHashtableToZiplistRecommendation = await service
        .determineHashHashtableToZiplistRecommendation(client, [...mockKeys, mockBigHashKey3]);
      expect(convertHashtableToZiplistRecommendation)
        .toEqual(
          {
            name: RECOMMENDATION_NAMES.HASH_HASHTABLE_TO_ZIPLIST,
            params: { keys: [mockBigHashKey3.name] },
          },
        );
    });

    it('should not return hashHashtableToZiplist recommendation when config command executed with error',
      async () => {
        when(client.sendCommand)
          .calledWith(jasmine.arrayContaining(['config']), expect.anything())
          .mockRejectedValue('some error');

        const convertHashtableToZiplistRecommendation = await service
          .determineHashHashtableToZiplistRecommendation(client, mockKeys);
        expect(convertHashtableToZiplistRecommendation).toEqual(null);
      });
  });

  describe('determineCompressionForListRecommendation', () => {
    it('should not return compressionForList recommendation', async () => {
      const compressHashFieldNamesRecommendation = await service
        .determineCompressionForListRecommendation(mockKeys);
      expect(compressHashFieldNamesRecommendation).toEqual(null);
    });
    it('should return compressionForList recommendation', async () => {
      const compressHashFieldNamesRecommendation = await service
        .determineCompressionForListRecommendation([mockBigListKey]);
      expect(compressHashFieldNamesRecommendation)
        .toEqual({
          name: RECOMMENDATION_NAMES.COMPRESSION_FOR_LIST,
          params: { keys: [mockBigListKey.name] },
        });
    });
  });

  describe('determineBigStringsRecommendation', () => {
    it('should not return bigStrings recommendation', async () => {
      const bigStringsRecommendation = await service
        .determineBigStringsRecommendation(mockKeys);
      expect(bigStringsRecommendation).toEqual(null);
    });
    it('should return bigStrings recommendation', async () => {
      const bigStringsRecommendation = await service
        .determineBigStringsRecommendation([mockHugeStringKey]);
      expect(bigStringsRecommendation)
        .toEqual({
          name: RECOMMENDATION_NAMES.BIG_STRINGS,
          params: { keys: [mockHugeStringKey.name] },
        });
    });
  });

  describe('determineZSetHashtableToZiplistRecommendation', () => {
    it('should not return zSetHashtableToZiplist recommendation', async () => {
      when(client.sendCommand)
        .calledWith(jasmine.arrayContaining(['config']), expect.anything())
        .mockResolvedValue(mockRedisConfigResponse);

      const zSetHashtableToZiplistRecommendation = await service
        .determineZSetHashtableToZiplistRecommendation(client, mockKeys);
      expect(zSetHashtableToZiplistRecommendation).toEqual(null);
    });

    it('should return zSetHashtableToZiplist recommendation', async () => {
      when(client.sendCommand)
        .calledWith(jasmine.arrayContaining(['config']), expect.anything())
        .mockResolvedValue(mockRedisConfigResponse);

      const zSetHashtableToZiplistRecommendation = await service
        .determineZSetHashtableToZiplistRecommendation(client, [...mockKeys, mockBigZSetKey]);
      expect(zSetHashtableToZiplistRecommendation)
        .toEqual({
          name: RECOMMENDATION_NAMES.ZSET_HASHTABLE_TO_ZIPLIST,
          params: { keys: [mockBigZSetKey.name] },
        });
    });

    it('should not return zSetHashtableToZiplist recommendation when config command executed with error',
      async () => {
        when(client.sendCommand)
          .calledWith(jasmine.arrayContaining(['config']), expect.anything())
          .mockRejectedValue('some error');

        const zSetHashtableToZiplistRecommendation = await service
          .determineZSetHashtableToZiplistRecommendation(client, mockKeys);
        expect(zSetHashtableToZiplistRecommendation).toEqual(null);
      });
  });

  describe('determineBigSetsRecommendation', () => {
    it('should not return bigSets recommendation', async () => {
      const bigSetsRecommendation = await service
        .determineBigSetsRecommendation(mockKeys);
      expect(bigSetsRecommendation).toEqual(null);
    });
    it('should return bigSets recommendation', async () => {
      const bigSetsRecommendation = await service
        .determineBigSetsRecommendation([mockHugeSet]);
      expect(bigSetsRecommendation)
        .toEqual({
          name: RECOMMENDATION_NAMES.BIG_SETS,
          params: { keys: [mockHugeSet.name] },
        });
    });
  });

  describe('determineConnectionClientsRecommendation', () => {
    it('should not return connectionClients recommendation', async () => {
      when(client.sendCommand)
        .calledWith(jasmine.arrayContaining(['info']), expect.anything())
        .mockResolvedValue(mockRedisClientsResponse1);

      const connectionClientsRecommendation = await service
        .determineConnectionClientsRecommendation(client);
      expect(connectionClientsRecommendation).toEqual(null);
    });

    it('should return connectionClients recommendation', async () => {
      when(client.sendCommand)
        .calledWith(jasmine.arrayContaining(['info']), expect.anything())
        .mockResolvedValue(mockRedisClientsResponse2);

      const connectionClientsRecommendation = await service
        .determineConnectionClientsRecommendation(client);
      expect(connectionClientsRecommendation)
        .toEqual({ name: RECOMMENDATION_NAMES.BIG_AMOUNT_OF_CONNECTED_CLIENTS });
    });

    it('should not return connectionClients recommendation when info command executed with error',
      async () => {
        when(client.sendCommand)
          .calledWith(jasmine.arrayContaining(['info']), expect.anything())
          .mockRejectedValue('some error');

        const connectionClientsRecommendation = await service
          .determineConnectionClientsRecommendation(client);
        expect(connectionClientsRecommendation).toEqual(null);
      });
  });

  describe('determineSetPasswordRecommendation', () => {
    it('should not return setPassword recommendation', async () => {
      when(client.sendCommand)
        .calledWith(jasmine.arrayContaining(['acl']), expect.anything())
        .mockResolvedValue(mockRedisAclListResponse1);

      const setPasswordRecommendation = await service
        .determineSetPasswordRecommendation(client);
      expect(setPasswordRecommendation).toEqual(null);
    });

    it('should return setPassword recommendation', async () => {
      when(client.sendCommand)
        .calledWith(jasmine.arrayContaining(['acl']), expect.anything())
        .mockResolvedValue(mockRedisAclListResponse2);

      const setPasswordRecommendation = await service
        .determineSetPasswordRecommendation(client);
      expect(setPasswordRecommendation).toEqual({ name: RECOMMENDATION_NAMES.SET_PASSWORD });
    });

    it('should not return setPassword recommendation when acl command executed with error',
      async () => {
        when(client.sendCommand)
          .calledWith(jasmine.arrayContaining(['acl']), expect.anything())
          .mockRejectedValue('some error');

        const setPasswordRecommendation = await service
          .determineSetPasswordRecommendation(client);
        expect(setPasswordRecommendation).toEqual(null);
      });

    it('should not return setPassword recommendation when acl command executed with error',
      async () => {
        when(client.sendCommand)
          .calledWith(jasmine.arrayContaining(['auth']))
          .mockRejectedValue(mockRedisNoAuthError);

        const setPasswordRecommendation = await service
          .determineSetPasswordRecommendation(client);
        expect(setPasswordRecommendation).toEqual(null);
      });

    it('should return setPassword recommendation when acl command executed with no password error',
      async () => {
        when(client.sendCommand)
          .calledWith(jasmine.arrayContaining(['auth']))
          .mockRejectedValue(mockRedisNoPasswordError);

        const setPasswordRecommendation = await service
          .determineSetPasswordRecommendation(client);
        expect(setPasswordRecommendation).toEqual({ name: RECOMMENDATION_NAMES.SET_PASSWORD });
      });
  });

  describe('determineRedisVersionRecommendation', () => {
    it('should not return redis version recommendation', async () => {
      when(client.sendCommand)
        .calledWith(jasmine.arrayContaining(['info']), expect.anything())
        .mockResolvedValue(mockRedisServerResponse1);

      const redisVersionRecommendation = await service
        .determineRedisVersionRecommendation(client);
      expect(redisVersionRecommendation).toEqual(null);
    });

    it('should return redis version recommendation', async () => {
      when(client.sendCommand)
        .calledWith(jasmine.arrayContaining(['info']), expect.anything())
        .mockResolvedValueOnce(mockRedisServerResponse2);

      const redisVersionRecommendation = await service
        .determineRedisVersionRecommendation(client);
      expect(redisVersionRecommendation).toEqual({ name: RECOMMENDATION_NAMES.REDIS_VERSION });
    });

    it('should not return redis version recommendation when info command executed with error',
      async () => {
        resetAllWhenMocks();
        when(client.sendCommand)
          .calledWith(jasmine.arrayContaining(['info']), expect.anything())
          .mockRejectedValue('some error');

        const redisVersionRecommendation = await service
          .determineRedisVersionRecommendation(client);
        expect(redisVersionRecommendation).toEqual(null);
      });
  });

  describe('determineSearchJSONRecommendation', () => {
    it('should not return searchJSON', async () => {
      const searchJSONRecommendation = await service
        .determineSearchJSONRecommendation(mockKeys, mockFTListResponse2);
      expect(searchJSONRecommendation).toEqual(null);
    });

    it('should return searchJSON recommendation', async () => {
      const searchJSONRecommendation = await service
        .determineSearchJSONRecommendation(mockKeys, mockFTListResponse1);
      expect(searchJSONRecommendation)
        .toEqual({
          name: RECOMMENDATION_NAMES.SEARCH_JSON,
          params: { keys: [Buffer.from('name')] },
        });
    });

    it('should return not searchJSON recommendation when there is no JSON key', async () => {
      const searchJSONRecommendation = await service
        .determineSearchJSONRecommendation([mockBigSet], mockFTListResponse1);
      expect(searchJSONRecommendation)
        .toEqual(null);
    });

    it('should return searchJSON recommendation when indexes is undefined',
      async () => {
        const searchJSONRecommendation = await service
          .determineSearchJSONRecommendation(mockKeys, undefined);
        expect(searchJSONRecommendation)
          .toEqual({
            name: RECOMMENDATION_NAMES.SEARCH_JSON,
            params: { keys: [Buffer.from('name')] },
          });
      });
  });

  describe('determineSearchHashRecommendation', () => {
    it('should return searchHash recommendation', async () => {
      const bigHashesRecommendation = await service.determineSearchHashRecommendation(mockSearchHashes);
      expect(bigHashesRecommendation)
        .toEqual({ name: RECOMMENDATION_NAMES.SEARCH_HASH });
    });

    it('should not return searchHash recommendation', async () => {
      const searchHashRecommendation = await service.determineSearchHashRecommendation(mockKeys);
      expect(searchHashRecommendation).toEqual(null);
    });

    it('should not return searchHash recommendation if indexes exists', async () => {
      const searchHashRecommendationWithIndex = await service
        .determineSearchHashRecommendation(mockSearchHashes, ['idx']);
      expect(searchHashRecommendationWithIndex).toEqual(null);
    });
  });

  describe('determineRTSRecommendation', () => {
    test.each(generateRTSRecommendationTests)('%j', async ({ input, expected }) => {
      when(client.sendCommand)
        .calledWith(jasmine.arrayContaining(['zscan']), expect.anything())
        .mockResolvedValue(input);

      const RTSRecommendation = await service
        .determineRTSRecommendation(client, mockKeys);
      expect(RTSRecommendation).toEqual(expected);
    });

    it('should not return RTS recommendation when only 101 sorted set contain timestamp', async () => {
      let counter = 0;
      while (counter <= 100) {
        when(client.sendCommand)
          .calledWith(jasmine.arrayContaining(['zscan']), expect.anything())
          .mockResolvedValueOnce(mockZScanResponse1);
        counter += 1;
      }

      when(client.sendCommand)
        .calledWith(jasmine.arrayContaining(['zscan']), expect.anything())
        .mockResolvedValueOnce(mockZScanResponse2);

      const RTSRecommendation = await service
        .determineRTSRecommendation(client, mockSortedSets);
      expect(RTSRecommendation).toEqual(null);
    });

    it('should not return RTS recommendation when zscan command executed with error',
      async () => {
        resetAllWhenMocks();
        when(client.sendCommand)
          .calledWith(jasmine.arrayContaining(['zscan']), expect.anything())
          .mockRejectedValue('some error');

        const RTSRecommendation = await service
          .determineRTSRecommendation(client, mockKeys);
        expect(RTSRecommendation).toEqual(null);
      });
  });
});
