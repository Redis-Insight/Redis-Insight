import { Settings } from 'src/modules/settings/models/settings';
import { SessionMetadata } from 'src/common/models';

export abstract class SettingsRepository {
  abstract getOrCreate(sessionMetadata: SessionMetadata): Promise<Settings>;
  abstract update(sessionMetadata: SessionMetadata, settings: Settings): Promise<Settings>;
}
