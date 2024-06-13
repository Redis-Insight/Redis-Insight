import { Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AppRedisInstanceEvents } from 'src/constants';
import { MonitorSettings } from 'src/modules/profiler/models/monitor-settings';
import { LogFileProvider } from 'src/modules/profiler/providers/log-file.provider';
import { RedisObserverProvider } from 'src/modules/profiler/providers/redis-observer.provider';
import { ProfilerClientProvider } from 'src/modules/profiler/providers/profiler-client.provider';
import { SessionMetadata } from 'src/common/models';

@Injectable()
export class ProfilerService {
  private logger = new Logger('ProfilerService');

  constructor(
    private logFileProvider: LogFileProvider,
    private redisObserverProvider: RedisObserverProvider,
    private profilerClientProvider: ProfilerClientProvider,
  ) {}

  /**
   * Create or use existing user client to send monitor data from redis client to the user
   * We are storing user clients to have a possibility to "pause" logs without disconnecting
   *
   * @param sessionMetadata
   * @param instanceId
   * @param client
   * @param settings
   */
  async addListenerForInstance(
    sessionMetadata: SessionMetadata,
    instanceId: string,
    client: Socket,
    settings: MonitorSettings = null,
  ) {
    this.logger.log(`Add listener for instance: ${instanceId}.`);

    const profilerClient = await this.profilerClientProvider.getOrCreateClient(
      sessionMetadata,
      instanceId,
      client,
      settings,
    );
    const monitorObserver = await this.redisObserverProvider.getOrCreateObserver(sessionMetadata, instanceId);
    await monitorObserver.subscribe(profilerClient);
  }

  /**
   * Simply remove Profiler Client from the clients list of particular Redis Observer
   * Basically used to remove listener that triggered by user action, e.g. "pause" action
   * @param instanceId
   * @param listenerId
   */
  async removeListenerFromInstance(instanceId: string, listenerId: string) {
    this.logger.log(`Remove listener from instance: ${instanceId}.`);
    const redisObserver = await this.redisObserverProvider.getObserver(instanceId);
    if (redisObserver) {
      redisObserver.unsubscribe(listenerId);
    }
  }

  /**
   * Remove Profiler Client from clients list of the particular Redis Observer
   * Beside that under the hood will be triggered force remove of emitters, files, etc. after some time threshold
   * Used when for sme reason socket connection between frontend and backend was lost
   * @param instanceId
   * @param listenerId
   */
  async disconnectListenerFromInstance(instanceId: string, listenerId: string) {
    this.logger.log(`Disconnect listener from instance: ${instanceId}.`);
    const redisObserver = await this.redisObserverProvider.getObserver(instanceId);
    if (redisObserver) {
      redisObserver.disconnect(listenerId);
    }
  }

  /**
   * Flush all persistent logs like FileLog
   * Trigger by user action
   * @param listenerId
   */
  async flushLogs(listenerId: string) {
    this.logger.log(`Flush logs for client ${listenerId}.`);
    const profilerClient = await this.profilerClientProvider.getClient(listenerId);
    if (profilerClient) {
      await profilerClient.flushLogs();
    }
  }

  @OnEvent(AppRedisInstanceEvents.Deleted)
  async handleInstanceDeletedEvent(instanceId: string) {
    this.logger.log(`Handle instance deleted event. instance: ${instanceId}.`);
    try {
      const redisObserver = await this.redisObserverProvider.getObserver(instanceId);
      if (redisObserver) {
        redisObserver.clear();
        await this.redisObserverProvider.removeObserver(instanceId);
      }
    } catch (e) {
      // continue regardless of error
    }
  }
}
