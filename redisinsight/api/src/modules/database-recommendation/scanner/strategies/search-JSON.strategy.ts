import { AbstractRecommendationStrategy }
  from 'src/modules/database-recommendation/scanner/strategies/abstract.recommendation.strategy';
import { IDatabaseRecommendationStrategyData }
  from 'src/modules/database-recommendation/scanner/recommendation.strategy.interface';
import { RedisDataType, GetKeyInfoResponse } from 'src/modules/browser/keys/dto';
import { SearchJSON } from 'src/modules/database-recommendation/models';

export class SearchJSONStrategy extends AbstractRecommendationStrategy {
  /**
   * Check redis JSON recommendation
   * @param data
   */

  async isRecommendationReached(
    data: SearchJSON,
  ): Promise<IDatabaseRecommendationStrategyData> {
    const jsonKey = data.keys.find((key: GetKeyInfoResponse) => key.type === RedisDataType.JSON);

    if (jsonKey) {
      // todo:improve decision mechanism when store Recommendations to avoid infinite checks when isReached:false
      try {
        const indexes = await data.client.sendCommand(
          ['FT._LIST'],
          { replyEncoding: 'utf8' },
        ) as string[];

        if (indexes.length) {
          return { isReached: false };
        }
      } catch (e) {
        // ignore error
      }

      return { isReached: true, params: { keys: [jsonKey.name] } };
    }

    return { isReached: false };
  }
}
