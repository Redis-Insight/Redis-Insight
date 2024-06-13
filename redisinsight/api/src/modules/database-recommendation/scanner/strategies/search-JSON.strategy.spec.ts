import { when } from 'jest-when';
import { mockStandaloneRedisClient } from 'src/__mocks__';
import { GetKeyInfoResponse } from 'src/modules/browser/keys/dto';
import { SearchJSONStrategy } from 'src/modules/database-recommendation/scanner/strategies';

const mockDatabaseId = 'id';

const mockJSONInfo: GetKeyInfoResponse = {
  name: Buffer.from('testString_1'),
  type: 'ReJSON-RL',
  ttl: -1,
  size: 1,
};

const mockHashInfo: GetKeyInfoResponse = {
  name: Buffer.from('testString_2'),
  type: 'hash',
  ttl: -1,
  size: 512 * 1024 + 1,
};

const mockEmptyIndexes = [];
const mockIndexes = ['foo'];

describe('SearchJSONStrategy', () => {
  const client = mockStandaloneRedisClient;
  let strategy: SearchJSONStrategy;

  beforeEach(async () => {
    strategy = new SearchJSONStrategy();
  });

  describe('isRecommendationReached', () => {
    describe('with search module', () => {
      it('should return true when there is JSON key', async () => {
        when(client.sendCommand)
          .calledWith(jasmine.arrayContaining(['FT._LIST']), expect.anything())
          .mockResolvedValue(mockEmptyIndexes);

        expect(await strategy.isRecommendationReached({
          client,
          databaseId: mockDatabaseId,
          keys: [mockJSONInfo, mockHashInfo],
        })).toEqual({ isReached: true, params: { keys: [mockJSONInfo.name] } });
      });

      it('should return false when there is not JSON key', async () => {
        expect(await strategy.isRecommendationReached({
          client,
          databaseId: mockDatabaseId,
          keys: [mockHashInfo],
        })).toEqual({ isReached: false });
      });

      it('should return false when FT._LIST return indexes', async () => {
        when(client.sendCommand)
          .calledWith(jasmine.arrayContaining(['FT._LIST']), expect.anything())
          .mockResolvedValue(mockIndexes);

        expect(await strategy.isRecommendationReached({
          client,
          databaseId: mockDatabaseId,
          keys: [mockJSONInfo, mockHashInfo],
        })).toEqual({ isReached: false });
      });
    });

    describe('without search module', () => {
      beforeEach(() => {
        when(client.sendCommand)
          .calledWith(jasmine.arrayContaining(['FT._LIST']), expect.anything())
          .mockReturnValue(new Error('Unsupported command'));
      });

      it('should return true when there is JSON key', async () => {
        expect(await strategy.isRecommendationReached({
          client,
          databaseId: mockDatabaseId,
          keys: [mockJSONInfo, mockHashInfo],
        })).toEqual({ isReached: true, params: { keys: [mockJSONInfo.name] } });
      });

      it('should return false when there is not JSON key', async () => {
        expect(await strategy.isRecommendationReached({
          client,
          databaseId: mockDatabaseId,
          keys: [mockHashInfo],
        })).toEqual({ isReached: false });
      });
    });
  });
});
