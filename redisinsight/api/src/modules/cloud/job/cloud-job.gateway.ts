import { Socket, Server } from 'socket.io';
import {
  ConnectedSocket,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer, WsException,
} from '@nestjs/websockets';
import {
  Body,
  Logger, ValidationPipe,
} from '@nestjs/common';
import config from 'src/utils/config';
import { CloudJobEvents } from 'src/modules/cloud/common/constants';
import { CloudJobService } from 'src/modules/cloud/job/cloud-job.service';
import { MonitorCloudJobDto } from 'src/modules/cloud/job/dto/monitor.cloud-job.dto';
import { Validator } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { CloudJobInfo } from 'src/modules/cloud/job/models';
import { SessionMetadata } from 'src/common/models';
import { WSSessionMetadata } from 'src/modules/auth/session-metadata/decorators/ws-session-metadata.decorator';

const SOCKETS_CONFIG = config.get('sockets');

@WebSocketGateway({ path: SOCKETS_CONFIG.path, cors: SOCKETS_CONFIG.cors, serveClient: SOCKETS_CONFIG.serveClient })
export class CloudJobGateway {
  @WebSocketServer() wss: Server;

  private readonly validator = new Validator();

  private exceptionFactory = (new ValidationPipe()).createExceptionFactory();

  private logger: Logger = new Logger('CloudJobGateway');

  constructor(
    private readonly cloudJobService: CloudJobService,
  ) {}

  @SubscribeMessage(CloudJobEvents.Monitor)
  async monitor(
    @WSSessionMetadata() sessionMetadata: SessionMetadata,
      @ConnectedSocket() client: Socket,
      @Body() data: MonitorCloudJobDto,
  ): Promise<CloudJobInfo> {
    try {
      const dto = plainToClass(MonitorCloudJobDto, data);

      const errors = await this.validator.validate(
        dto,
        { whitelist: true },
      );

      if (errors?.length) {
        throw this.exceptionFactory(errors);
      }

      return await this.cloudJobService.monitorJob(sessionMetadata, dto, client);
    } catch (error) {
      this.logger.error('Unable to add listener', error);
      throw new WsException(error);
    }
  }
}
