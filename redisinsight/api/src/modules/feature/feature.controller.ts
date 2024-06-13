import {
  Controller,
  Get, HttpCode, Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiEndpoint } from 'src/decorators/api-endpoint.decorator';
import { FeatureService } from 'src/modules/feature/feature.service';
import { FeaturesConfigService } from 'src/modules/feature/features-config.service';

@ApiTags('Info')
@Controller('features')
@UsePipes(new ValidationPipe({ transform: true }))
export class FeatureController {
  constructor(
    private featureService: FeatureService,
    private featuresConfigService: FeaturesConfigService,
  ) {}

  @Get('')
  @ApiEndpoint({
    description: 'Get list of features',
    statusCode: 200,
    responses: [
      {
        status: 200,
        description: 'Get list of features',
      },
    ],
  })
  async list(): Promise<any> {
    return this.featureService.list();
  }

  @Post('/sync')
  @HttpCode(200)
  async sync(): Promise<void> {
    return this.featuresConfigService.sync();
  }
}
