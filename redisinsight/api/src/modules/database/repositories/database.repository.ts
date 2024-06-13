import { SessionMetadata } from 'src/common/models';
import { Database } from 'src/modules/database/models/database';

export abstract class DatabaseRepository {
  /**
   * Fast check if database exists by id
   * No need to retrieve any fields should return boolean only
   * @param sessionMetadata
   * @param id
   * @return boolean
   */
  abstract exists(sessionMetadata: SessionMetadata, id: string): Promise<boolean>;

  /**
   * Get single database by id with all fields
   * @param sessionMetadata
   * @param id
   * @param ignoreEncryptionErrors
   * @param omitFields
   * @return Database
   */
  abstract get(
    sessionMetadata: SessionMetadata,
    id: string,
    ignoreEncryptionErrors?: boolean,
    omitFields?: string[],
  ): Promise<Database>;

  /**
   * List of databases (limited fields only)
   * Fields: ['id', 'name', 'host', 'port', 'db', 'connectionType', 'modules', 'lastConnection]
   * @param sessionMetadata
   * @return Database[]
   */
  abstract list(sessionMetadata: SessionMetadata): Promise<Database[]>;

  /**
   * Create database
   * @param sessionMetadata
   * @param database
   * @param uniqueCheck
   */
  abstract create(sessionMetadata: SessionMetadata, database: Database, uniqueCheck: boolean): Promise<Database>;

  /**
   * Update database with new data
   * @param sessionMetadata
   * @param id
   * @param database
   */
  abstract update(sessionMetadata: SessionMetadata, id: string, database: Partial<Database>): Promise<Database>;

  /**
   * Delete database by id
   * @param sessionMetadata
   * @param id
   */
  abstract delete(sessionMetadata: SessionMetadata, id: string): Promise<void>;
}
