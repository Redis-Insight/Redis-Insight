import {
  Body,
  Controller,
  Post, Res,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TimeoutInterceptor } from 'src/common/interceptors/timeout.interceptor';
import ERROR_MESSAGES from 'src/constants/error-messages';
import { ApiEndpoint } from 'src/decorators/api-endpoint.decorator';
import { Database } from 'src/modules/database/models/database';
import { DiscoverSentinelMastersDto } from 'src/modules/redis-sentinel/dto/discover.sentinel-masters.dto';
import { SentinelMaster } from 'src/modules/redis-sentinel/models/sentinel-master';
import { ActionStatus, SessionMetadata } from 'src/common/models';
import { Response } from 'express';
import { RedisSentinelService } from 'src/modules/redis-sentinel/redis-sentinel.service';
import { CreateSentinelDatabasesDto } from 'src/modules/redis-sentinel/dto/create.sentinel.databases.dto';
import { CreateSentinelDatabaseResponse } from 'src/modules/redis-sentinel/dto/create.sentinel.database.response';
import { BuildType } from 'src/modules/server/models/server';
import { RequestSessionMetadata } from 'src/common/decorators';

@ApiTags('Redis OSS Sentinel')
@Controller('redis-sentinel')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class RedisSentinelController {
  constructor(
    private redisSentinelService: RedisSentinelService,
  ) {}

  @Post('get-databases')
  @UseInterceptors(new TimeoutInterceptor(ERROR_MESSAGES.CONNECTION_TIMEOUT))
  @ApiEndpoint({
    description: 'Get master groups',
    statusCode: 200,
    responses: [
      {
        status: 200,
        type: SentinelMaster,
        isArray: true,
      },
    ],
  })
  async getMasters(
    @Body() dto: DiscoverSentinelMastersDto,
  ): Promise<SentinelMaster[]> {
    return await this.redisSentinelService.getSentinelMasters(dto as Database);
  }

  @UseInterceptors(new TimeoutInterceptor(ERROR_MESSAGES.CONNECTION_TIMEOUT))
  @Post('databases')
  @ApiEndpoint({
    statusCode: 201,
    description: 'Add masters from Redis Sentinel',
    excludeFor: [BuildType.RedisStack],
    responses: [
      {
        status: 201,
        description: 'Ok',
        type: CreateSentinelDatabaseResponse,
        isArray: true,
      },
    ],
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async addSentinelMasters(
    @RequestSessionMetadata() sessionMetadata: SessionMetadata,
      @Body() dto: CreateSentinelDatabasesDto,
      @Res() res: Response,
  ): Promise<Response> {
    const result = await this.redisSentinelService.createSentinelDatabases(sessionMetadata, dto);
    const hasSuccessResult = result.some(
      (addResponse: CreateSentinelDatabaseResponse) => addResponse.status === ActionStatus.Success,
    );
    if (!hasSuccessResult) {
      return res.status(200).json(result);
    }
    return res.json(result);
  }
}
