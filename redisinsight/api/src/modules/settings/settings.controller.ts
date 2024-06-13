import {
  Body,
  Controller,
  Get,
  Patch,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiEndpoint } from 'src/decorators/api-endpoint.decorator';
import { SettingsService } from 'src/modules/settings/settings.service';
import { SessionMetadata } from 'src/common/models';
import { RequestSessionMetadata } from 'src/common/decorators';
import {
  GetAgreementsSpecResponse,
  GetAppSettingsResponse,
  UpdateSettingsDto,
} from './dto/settings.dto';

@ApiTags('Settings')
@Controller('settings')
@UsePipes(new ValidationPipe({ transform: true }))
export class SettingsController {
  constructor(
    private settingsService: SettingsService,
  ) {}

  @Get('')
  @ApiEndpoint({
    description: 'Get info about application settings',
    statusCode: 200,
    responses: [
      {
        status: 200,
        description: 'Application settings',
        type: GetAppSettingsResponse,
      },
    ],
  })
  async getAppSettings(
    @RequestSessionMetadata() sessionMetadata: SessionMetadata,
  ): Promise<GetAppSettingsResponse> {
    return this.settingsService.getAppSettings(sessionMetadata);
  }

  @Get('/agreements/spec')
  @ApiEndpoint({
    description: 'Get json with agreements specification',
    statusCode: 200,
    responses: [
      {
        status: 200,
        description: 'Agreements specification',
        type: GetAgreementsSpecResponse,
      },
    ],
  })
  async getAgreementsSpec(): Promise<GetAgreementsSpecResponse> {
    return this.settingsService.getAgreementsSpec();
  }

  @Patch('')
  @ApiEndpoint({
    description: 'Update user application settings and agreements',
    statusCode: 200,
    responses: [
      {
        status: 200,
        description: 'Application settings',
        type: GetAppSettingsResponse,
      },
    ],
  })
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  )
  async update(
    @RequestSessionMetadata() sessionMetadata: SessionMetadata,
      @Body() dto: UpdateSettingsDto,
  ): Promise<GetAppSettingsResponse> {
    return this.settingsService.updateAppSettings(sessionMetadata, dto);
  }
}
