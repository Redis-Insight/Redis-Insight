import { BrowserHistoryMode } from 'src/common/constants';
import { SessionMetadata } from 'src/common/models';
import { BrowserHistory } from '../dto';

export abstract class BrowserHistoryRepository {
  abstract create(
    sessionMetadata: SessionMetadata,
    history: Partial<BrowserHistory>
  ): Promise<BrowserHistory>;
  abstract get(sessionMetadata: SessionMetadata, id: string): Promise<BrowserHistory>;
  abstract list(
    sessionMetadata: SessionMetadata,
    databaseId: string,
    mode: BrowserHistoryMode
  ): Promise<BrowserHistory[]>;
  abstract delete(sessionMetadata: SessionMetadata, databaseId: string, id: string): Promise<void>;
  abstract cleanupDatabaseHistory(sessionMetadata: SessionMetadata, databaseId: string, mode: string): Promise<void>;
}
