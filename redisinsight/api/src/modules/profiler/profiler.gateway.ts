import { get } from 'lodash';
import { Socket, Server } from 'socket.io';
import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Body, Logger } from '@nestjs/common';
import { MonitorSettings } from 'src/modules/profiler/models/monitor-settings';
import { ProfilerClientEvents } from 'src/modules/profiler/constants';
import { ProfilerService } from 'src/modules/profiler/profiler.service';
import { WSSessionMetadata } from 'src/modules/auth/session-metadata/decorators/ws-session-metadata.decorator';
import config, { Config } from 'src/utils/config';
import { SessionMetadata } from 'src/common/models';

const SOCKETS_CONFIG = config.get('sockets') as Config['sockets'];

@WebSocketGateway({
  path: SOCKETS_CONFIG.path,
  namespace: 'monitor',
  cors: SOCKETS_CONFIG.cors,
  serveClient: SOCKETS_CONFIG.serveClient,
})
export class ProfilerGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() wss: Server;

  private logger: Logger = new Logger('MonitorGateway');

  constructor(
    private service: ProfilerService,
  ) {}

  @SubscribeMessage(ProfilerClientEvents.Monitor)
  async monitor(
    @WSSessionMetadata() sessionMetadata: SessionMetadata,
      @ConnectedSocket() client: Socket,
      @Body() settings: MonitorSettings = null,
  ): Promise<any> {
    try {
      await this.service.addListenerForInstance(
        sessionMetadata,
        ProfilerGateway.getInstanceId(client),
        client,
        settings,
      );
      return { status: 'ok' };
    } catch (error) {
      this.logger.error('Unable to add listener', error);
      throw new WsException(error);
    }
  }

  @SubscribeMessage(ProfilerClientEvents.Pause)
  async pause(@WSSessionMetadata() sessionMetadata: SessionMetadata, @ConnectedSocket() client: Socket): Promise<any> {
    try {
      await this.service.removeListenerFromInstance(ProfilerGateway.getInstanceId(client), client.id);
      return { status: 'ok' };
    } catch (error) {
      this.logger.error('Unable to pause monitor', error);
      throw new WsException(error);
    }
  }

  @SubscribeMessage(ProfilerClientEvents.FlushLogs)
  async flushLogs(
    @WSSessionMetadata() sessionMetadata: SessionMetadata, @ConnectedSocket() client: Socket,
  ): Promise<any> {
    try {
      await this.service.flushLogs(client.id);
      return { status: 'ok' };
    } catch (error) {
      this.logger.error('Unable to flush logs', error);
      throw new WsException(error);
    }
  }

  async handleConnection(client: Socket): Promise<void> {
    const instanceId = ProfilerGateway.getInstanceId(client);
    this.logger.log(`Client connected: ${client.id}, instanceId: ${instanceId}`);
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const instanceId = ProfilerGateway.getInstanceId(client);
    await this.service.disconnectListenerFromInstance(instanceId, client.id);
    this.logger.log(`Client disconnected: ${client.id}, instanceId: ${instanceId}`);
  }

  static getInstanceId(client: Socket): string {
    return get(client, 'handshake.query.instanceId') as string;
  }
}
