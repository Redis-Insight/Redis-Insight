import { CommandExecution } from 'src/modules/workbench/models/command-execution';
import { ShortCommandExecution } from 'src/modules/workbench/models/short-command-execution';
import { SessionMetadata } from 'src/common/models';

export abstract class CommandExecutionRepository {
  abstract createMany(
    sessionMetadata: SessionMetadata,
    commandExecutions: Partial<CommandExecution>[],
  ): Promise<CommandExecution[]>;
  abstract getList(sessionMetadata: SessionMetadata, databaseId: string): Promise<ShortCommandExecution[]>;
  abstract getOne(sessionMetadata: SessionMetadata, databaseId: string, id: string): Promise<CommandExecution>;
  abstract delete(sessionMetadata: SessionMetadata, databaseId: string, id: string): Promise<void>;
  abstract deleteAll(sessionMetadata: SessionMetadata, databaseId: string): Promise<void>;
}
