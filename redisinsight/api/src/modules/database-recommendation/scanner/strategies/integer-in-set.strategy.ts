import { isNaN, toNumber, uniq } from 'lodash';
import { AbstractRecommendationStrategy }
  from 'src/modules/database-recommendation/scanner/strategies/abstract.recommendation.strategy';
import { IDatabaseRecommendationStrategyData }
  from 'src/modules/database-recommendation/scanner/recommendation.strategy.interface';
import { IntegersInSets } from 'src/modules/database-recommendation/models';
import { getUTF8FromRedisString } from 'src/utils/cli-helper';

const maxCountMembersForCheck = 50;

export class IntegersInSetStrategy extends AbstractRecommendationStrategy {
  /**
   * Check integers in sets recommendation
   * @param data
   */

  async isRecommendationReached(
    data: IntegersInSets,
  ): Promise<IDatabaseRecommendationStrategyData> {
    const membersForCheck = data?.members?.slice(0, maxCountMembersForCheck);
    const isNotIntegerInSet = membersForCheck.some(
      (member) => isNaN(toNumber(getUTF8FromRedisString(member))),
    );

    const isAllMembersUniq = uniq(membersForCheck).length === membersForCheck.length;

    return isNotIntegerInSet && isAllMembersUniq
      ? { isReached: true, params: { keys: [data?.keyName] } }
      : { isReached: false };
  }
}
