import { DatabaseRecommendation } from 'src/modules/database-recommendation/models';
import {
  DatabaseRecommendationsResponse,
} from 'src/modules/database-recommendation/dto/database-recommendations.response';
import { ModifyDatabaseRecommendationDto } from 'src/modules/database-recommendation/dto';
import { Recommendation } from 'src/modules/database-analysis/models/recommendation';
import { ClientMetadata, SessionMetadata } from 'src/common/models';

export abstract class DatabaseRecommendationRepository {
  /**
   * Create new recommendation
   * @param sessionMetadata
   * @param entity
   * @return DatabaseRecommendation
   */
  abstract create(sessionMetadata: SessionMetadata, entity: DatabaseRecommendation): Promise<DatabaseRecommendation>;

  /**
   * Get all recommendations from database
   * Fields: [r.id', 'r.name', 'r.read', 'r.vote', 'r.hide', 'r.params']
   * @param clientMetadata
   * @return DatabaseRecommendationsResponse
   */
  abstract list(clientMetadata: ClientMetadata): Promise<DatabaseRecommendationsResponse>;

  /**
   * Mark all recommendations as read by database id
   * @param clientMetadata
   */
  abstract read(clientMetadata: ClientMetadata): Promise<void>;

  /**
   * Update single recommendation and return updated
   * @param clientMetadata
   * @param id
   * @param recommendation
   * @return DatabaseRecommendation
   */
  abstract update(
    clientMetadata: ClientMetadata,
    id: string, recommendation: ModifyDatabaseRecommendationDto
  ): Promise<DatabaseRecommendation>;

  /**
   * Check is recommendation already exist in repository
   * @param clientMetadata
   * @param name
   * @return Boolean
   */
  abstract isExist(clientMetadata: ClientMetadata, name: string): Promise<boolean>;

  /**
   * Get database recommendation by id
   * @param sessionMetadata
   * @param id
   * @return DatabaseRecommendation
   */
  abstract get(sessionMetadata: SessionMetadata, id: string): Promise<DatabaseRecommendation>;

  /**
   * Sync db analysis recommendations with insights recommendations
   * @param clientMetadata
   * @param dbAnalysisRecommendations
   */
  abstract sync(clientMetadata: ClientMetadata, dbAnalysisRecommendations: Recommendation[]): Promise<void>;

  /**
   * Delete database recommendation by id
   * @param clientMetadata
   * @param id
   */
  abstract delete(clientMetadata: ClientMetadata, id: string): Promise<void>;

  /**
   * Get total unread recommendations
   */
  abstract getTotalUnread(clientMetadata: ClientMetadata, databaseId: string): Promise<number>;
}
