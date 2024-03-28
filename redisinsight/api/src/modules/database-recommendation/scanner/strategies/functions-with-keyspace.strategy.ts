import { AbstractRecommendationStrategy }
  from 'src/modules/database-recommendation/scanner/strategies/abstract.recommendation.strategy';
import { IDatabaseRecommendationStrategyData }
  from 'src/modules/database-recommendation/scanner/recommendation.strategy.interface';
import { DatabaseService } from 'src/modules/database/database.service';
import { isTriggeredAndFunctionsModule, checkKeyspaceNotification } from 'src/utils';
import { SessionMetadata } from 'src/common/models';

export class FunctionsWithKeyspaceStrategy extends AbstractRecommendationStrategy {
  private databaseService: DatabaseService;

  constructor(
    databaseService: DatabaseService,
  ) {
    super();
    this.databaseService = databaseService;
  }

  /**
   * Check functions with keyspace recommendation
   * @param data
   */

  async isRecommendationReached(
    data,
  ): Promise<IDatabaseRecommendationStrategyData> {
    // TODO: [USER_CONTEXT] defer passing sessionMetadata to another PR
    const { modules } = await this.databaseService.get({} as SessionMetadata, data.databaseId);

    if (isTriggeredAndFunctionsModule(modules)) {
      const libraries = await data.client.sendCommand(
        ['TFUNCTION', 'LIST'],
        { replyEncoding: 'utf8' },
      ) as string[];

      if (libraries.length) {
        return { isReached: false };
      }
    }

    const reply = await data.client.sendCommand(
      ['CONFIG', 'GET', 'notify-keyspace-events'],
      { replyEncoding: 'utf8' },
    ) as string[];

    return { isReached: checkKeyspaceNotification(reply[1]) };
  }
}
