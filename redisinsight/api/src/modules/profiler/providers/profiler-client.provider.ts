import { get } from 'lodash';
import { Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { ProfilerClient } from 'src/modules/profiler/models/profiler.client';
import { ClientLogsEmitter } from 'src/modules/profiler/emitters/client.logs-emitter';
import { MonitorSettings } from 'src/modules/profiler/models/monitor-settings';
import { LogFileProvider } from 'src/modules/profiler/providers/log-file.provider';
import { DatabaseService } from 'src/modules/database/database.service';
import { SessionMetadata } from 'src/common/models';

@Injectable()
export class ProfilerClientProvider {
  private profilerClients: Map<string, ProfilerClient> = new Map();

  constructor(
    private logFileProvider: LogFileProvider,
    private databaseService: DatabaseService,
  ) {}

  async getOrCreateClient(
    sessionMetadata: SessionMetadata,
    instanceId: string,
    socket: Socket,
    settings: MonitorSettings,
  ): Promise<ProfilerClient> {
    if (!this.profilerClients.has(socket.id)) {
      const clientObserver = new ProfilerClient(socket.id, socket);
      this.profilerClients.set(socket.id, clientObserver);

      clientObserver.addLogsEmitter(new ClientLogsEmitter(socket));

      if (settings?.logFileId) {
        const profilerLogFile = this.logFileProvider.getOrCreate(instanceId, settings.logFileId);

        // set database alias as part of the log file name
        const alias = (await this.databaseService.get(
          sessionMetadata,
          get(socket, 'handshake.query.instanceId') as string,
        )).name;
        profilerLogFile.setAlias(alias);

        clientObserver.addLogsEmitter(await profilerLogFile.getEmitter());
      }

      this.profilerClients.set(socket.id, clientObserver);
    }

    return this.profilerClients.get(socket.id);
  }

  async getClient(id: string) {
    return this.profilerClients.get(id);
  }
}
