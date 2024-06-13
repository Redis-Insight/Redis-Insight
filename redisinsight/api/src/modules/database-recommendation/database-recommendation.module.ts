import { Module, Type } from '@nestjs/common';
import { DatabaseRecommendationController }
  from 'src/modules/database-recommendation/database-recommendation.controller';
import { DatabaseRecommendationService } from 'src/modules/database-recommendation/database-recommendation.service';
import { RecommendationScanner } from 'src/modules/database-recommendation/scanner/recommendations.scanner';
import { RecommendationProvider } from 'src/modules/database-recommendation/scanner/recommendation.provider';
import { DatabaseRecommendationRepository }
  from 'src/modules/database-recommendation/repositories/database-recommendation.repository';
import { LocalDatabaseRecommendationRepository }
  from 'src/modules/database-recommendation/repositories/local.database.recommendation.repository';
import { DatabaseRecommendationGateway } from 'src/modules/database-recommendation/database-recommendation.gateway';
import {
  DatabaseRecommendationEmitter,
} from 'src/modules/database-recommendation/providers/database-recommendation.emitter';
import { DatabaseRecommendationAnalytics } from 'src/modules/database-recommendation/database-recommendation.analytics';

@Module({})
export class DatabaseRecommendationModule {
  static register(
    databaseRecommendationRepository: Type<DatabaseRecommendationRepository> = LocalDatabaseRecommendationRepository,
  ) {
    return {
      module: DatabaseRecommendationModule,
      controllers: [DatabaseRecommendationController],
      providers: [
        DatabaseRecommendationService,
        RecommendationScanner,
        RecommendationProvider,
        DatabaseRecommendationGateway,
        DatabaseRecommendationEmitter,
        DatabaseRecommendationAnalytics,
        {
          provide: DatabaseRecommendationRepository,
          useClass: databaseRecommendationRepository,
        },
      ],
      exports: [DatabaseRecommendationService, RecommendationScanner],
    };
  }
}
