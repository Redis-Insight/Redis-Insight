import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Post, Res,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiEndpoint } from 'src/decorators/api-endpoint.decorator';
import { TimeoutInterceptor } from 'src/common/interceptors/timeout.interceptor';
import { RedisEnterpriseService } from 'src/modules/redis-enterprise/redis-enterprise.service';
import {
  AddRedisEnterpriseDatabaseResponse,
  AddRedisEnterpriseDatabasesDto,
} from 'src/modules/redis-enterprise/dto/redis-enterprise-cluster.dto';
import { Response } from 'express';
import { ActionStatus, SessionMetadata } from 'src/common/models';
import { BuildType } from 'src/modules/server/models/server';
import { RequestSessionMetadata } from 'src/common/decorators';
import { ClusterConnectionDetailsDto, RedisEnterpriseDatabase } from '../dto/cluster.dto';

@ApiTags('Redis Enterprise Cluster')
@UsePipes(new ValidationPipe({ transform: true }))
@Controller('redis-enterprise/cluster')
export class ClusterController {
  constructor(private redisEnterpriseService: RedisEnterpriseService) {}

  @UseInterceptors(ClassSerializerInterceptor)
  @Post('get-databases')
  @UseInterceptors(new TimeoutInterceptor())
  @ApiEndpoint({
    description: 'Get all databases in the cluster.',
    statusCode: 200,
    excludeFor: [BuildType.RedisStack],
    responses: [
      {
        status: 200,
        description: 'All databases in the cluster.',
        isArray: true,
        type: RedisEnterpriseDatabase,
      },
    ],
  })
  async getDatabases(
    @Body() dto: ClusterConnectionDetailsDto,
  ): Promise<RedisEnterpriseDatabase[]> {
    return await this.redisEnterpriseService.getDatabases(dto);
  }

  @Post('databases')
  @ApiEndpoint({
    description: 'Add databases from Redis Enterprise cluster',
    statusCode: 201,
    excludeFor: [BuildType.RedisStack],
    responses: [
      {
        status: 201,
        description: 'Added databases list.',
        type: AddRedisEnterpriseDatabaseResponse,
        isArray: true,
      },
    ],
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async addRedisEnterpriseDatabases(
    @RequestSessionMetadata() sessionMetadata: SessionMetadata,
      @Body() dto: AddRedisEnterpriseDatabasesDto,
      @Res() res: Response,
  ): Promise<Response> {
    const { uids, ...connectionDetails } = dto;
    const result = await this.redisEnterpriseService.addRedisEnterpriseDatabases(
      sessionMetadata,
      connectionDetails,
      uids,
    );
    const hasSuccessResult = result.some(
      (addResponse: AddRedisEnterpriseDatabaseResponse) => addResponse.status === ActionStatus.Success,
    );
    if (!hasSuccessResult) {
      return res.status(200).json(result);
    }
    return res.json(result);
  }
}
