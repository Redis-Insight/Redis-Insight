import { PluginState } from 'src/modules/workbench/models/plugin-state';
import { SessionMetadata } from 'src/common/models';

export abstract class PluginStateRepository {
  abstract upsert(sessionMetadata: SessionMetadata, pluginState: Partial<PluginState>): Promise<void>;
  abstract getOne(
    sessionMetadata: SessionMetadata,
    visualizationId: string,
    commandExecutionId: string,
  ): Promise<PluginState>;
}
