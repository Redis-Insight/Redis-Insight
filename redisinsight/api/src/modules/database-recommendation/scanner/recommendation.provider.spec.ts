import { Test } from '@nestjs/testing';
import { RecommendationProvider } from 'src/modules/database-recommendation/scanner/recommendation.provider';
import { RECOMMENDATION_NAMES } from 'src/constants';
import {
  DefaultRecommendationStrategy,
  RedisVersionStrategy,
  SearchJSONStrategy,
  BigSetStrategy,
  RTSStrategy,
  AvoidLogicalDatabasesStrategy,
  ShardHashStrategy,
  StringToJsonStrategy,
  UseSmallerKeysStrategy,
  AvoidLuaScriptsStrategy,
  BigStringStrategy,
  CompressionForListStrategy,
  BigAmountConnectedClientsStrategy,
} from 'src/modules/database-recommendation/scanner/strategies';

describe('RecommendationProvider', () => {
  beforeAll(async () => {
    await Test.createTestingModule({
      providers: [
        RecommendationProvider,
      ],
    }).compile();
  });
  const service = new RecommendationProvider();

  describe('getStrategy', () => {
    [
      [RECOMMENDATION_NAMES.SEARCH_JSON, new SearchJSONStrategy()],
      [RECOMMENDATION_NAMES.REDIS_VERSION, new RedisVersionStrategy()],
      [RECOMMENDATION_NAMES.BIG_SETS, new BigSetStrategy()],
      [RECOMMENDATION_NAMES.RTS, new RTSStrategy()],
      [RECOMMENDATION_NAMES.AVOID_LOGICAL_DATABASES, new AvoidLogicalDatabasesStrategy()],
      [RECOMMENDATION_NAMES.BIG_HASHES, new ShardHashStrategy()],
      [RECOMMENDATION_NAMES.STRING_TO_JSON, new StringToJsonStrategy()],
      [RECOMMENDATION_NAMES.USE_SMALLER_KEYS, new UseSmallerKeysStrategy()],
      [RECOMMENDATION_NAMES.LUA_SCRIPT, new AvoidLuaScriptsStrategy()],
      [RECOMMENDATION_NAMES.BIG_STRINGS, new BigStringStrategy()],
      [RECOMMENDATION_NAMES.COMPRESSION_FOR_LIST, new CompressionForListStrategy()],
      [RECOMMENDATION_NAMES.BIG_AMOUNT_OF_CONNECTED_CLIENTS, new BigAmountConnectedClientsStrategy()],
      ['default', new DefaultRecommendationStrategy()],
      ['unknown', new DefaultRecommendationStrategy()],
      [null, new DefaultRecommendationStrategy()],
    ].forEach((tc) => {
      it(`should return ${tc[1].constructor.name} for type: ${tc[0]}`, () => {
        expect(service.getStrategy(tc[0] as string)).toEqual(tc[1]);
      });
    });
  });
});
