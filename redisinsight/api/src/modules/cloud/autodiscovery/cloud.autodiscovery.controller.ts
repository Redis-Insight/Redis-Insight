import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Post,
  Res,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { TimeoutInterceptor } from 'src/common/interceptors/timeout.interceptor';
import { ApiHeaders, ApiTags } from '@nestjs/swagger';
import { ApiEndpoint } from 'src/decorators/api-endpoint.decorator';
import { Response } from 'express';
import { ActionStatus } from 'src/common/models';
import { BuildType } from 'src/modules/server/models/server';
import { CloudAutodiscoveryService } from 'src/modules/cloud/autodiscovery/cloud-autodiscovery.service';
import { CloudAuthHeaders } from 'src/modules/cloud/common/decorators/cloud-auth.decorator';
import config from 'src/utils/config';
import { CloudCapiAuthDto } from 'src/modules/cloud/common/dto';
import { CloudAccountInfo } from 'src/modules/cloud/user/models';
import { CloudSubscription } from 'src/modules/cloud/subscription/models';
import { CloudAutodiscoveryAuthType } from 'src/modules/cloud/autodiscovery/models';
import { CloudDatabase } from 'src/modules/cloud/database/models';
import {
  DiscoverCloudDatabasesDto,
  ImportCloudDatabaseResponse,
  ImportCloudDatabasesDto,
} from 'src/modules/cloud/autodiscovery/dto';
import { RequestSessionMetadata } from 'src/common/decorators';

const cloudConf = config.get('cloud');

@ApiTags('Cloud Autodiscovery')
@ApiHeaders([{
  name: 'x-cloud-api-key',
}, {
  name: 'x-cloud-api-secret',
}])
@UsePipes(new ValidationPipe({ transform: true }))
@UseInterceptors(new TimeoutInterceptor(undefined, cloudConf.discoveryTimeout))
@Controller('cloud/autodiscovery')
export class CloudAutodiscoveryController {
  constructor(private service: CloudAutodiscoveryService) {}

  @Get('account')
  @ApiEndpoint({
    description: 'Get current account',
    statusCode: 200,
    excludeFor: [BuildType.RedisStack],
    responses: [
      {
        status: 200,
        description: 'Account Details.',
        type: CloudAccountInfo,
      },
    ],
  })
  async getAccount(@CloudAuthHeaders() authDto: CloudCapiAuthDto): Promise<CloudAccountInfo> {
    return await this.service.getAccount(authDto);
  }

  @Get('subscriptions')
  @ApiEndpoint({
    description: 'Get information about current account’s subscriptions.',
    statusCode: 200,
    excludeFor: [BuildType.RedisStack],
    responses: [
      {
        status: 200,
        description: 'Redis cloud subscription list.',
        type: CloudSubscription,
        isArray: true,
      },
    ],
  })
  async discoverSubscriptions(@CloudAuthHeaders() authDto: CloudCapiAuthDto): Promise<CloudSubscription[]> {
    return await this.service.discoverSubscriptions(authDto, CloudAutodiscoveryAuthType.Credentials);
  }

  @Post('get-databases')
  @UseInterceptors(ClassSerializerInterceptor)
  @ApiEndpoint({
    description: 'Get databases belonging to subscriptions',
    statusCode: 200,
    excludeFor: [BuildType.RedisStack],
    responses: [
      {
        status: 200,
        description: 'Databases list.',
        type: CloudDatabase,
        isArray: true,
      },
    ],
  })
  async discoverDatabases(
    @CloudAuthHeaders() authDto: CloudCapiAuthDto,
      @Body() dto: DiscoverCloudDatabasesDto,
  ): Promise<CloudDatabase[]> {
    return await this.service.discoverDatabases(authDto, dto, CloudAutodiscoveryAuthType.Credentials);
  }

  @Post('databases')
  @ApiEndpoint({
    description: 'Add databases from Redis Enterprise Cloud Pro account.',
    statusCode: 201,
    excludeFor: [BuildType.RedisStack],
    responses: [
      {
        status: 201,
        description: 'Added databases list.',
        type: ImportCloudDatabaseResponse,
        isArray: true,
      },
    ],
  })
  async addDiscoveredDatabases(
    @RequestSessionMetadata() sessionMetadata,
      @CloudAuthHeaders() authDto: CloudCapiAuthDto,
      @Body() dto: ImportCloudDatabasesDto,
      @Res() res: Response,
  ): Promise<Response> {
    const result = await this.service.addRedisCloudDatabases(sessionMetadata, authDto, dto.databases);
    const hasSuccessResult = result.some(
      (addResponse: ImportCloudDatabaseResponse) => addResponse.status === ActionStatus.Success,
    );
    if (!hasSuccessResult) {
      return res.status(200).json(result);
    }
    return res.json(result);
  }
}
