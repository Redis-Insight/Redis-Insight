import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiEndpoint } from 'src/decorators/api-endpoint.decorator';
import { ApiRedisParams } from 'src/decorators/api-redis-params.decorator';
import { WorkbenchService } from 'src/modules/workbench/workbench.service';
import { CommandExecution } from 'src/modules/workbench/models/command-execution';
import { CreateCommandExecutionsDto } from 'src/modules/workbench/dto/create-command-executions.dto';
import { ShortCommandExecution } from 'src/modules/workbench/models/short-command-execution';
import { ClientMetadata } from 'src/common/models';
import { WorkbenchClientMetadata } from 'src/modules/workbench/decorators/workbench-client-metadata.decorator';

@ApiTags('Workbench')
@UsePipes(new ValidationPipe({ transform: true }))
@Controller('workbench/command-executions')
export class WorkbenchController {
  constructor(private service: WorkbenchService) { }

  @ApiEndpoint({
    description: 'Send Redis Batch Commands from the Workbench',
    statusCode: 200,
    responses: [
      {
        status: 200,
        type: CommandExecution,
      },
    ],
  })
  @Post()
  @UseInterceptors(ClassSerializerInterceptor)
  @ApiRedisParams()
  async sendCommands(
    @WorkbenchClientMetadata() clientMetadata: ClientMetadata,
      @Body() dto: CreateCommandExecutionsDto,
  ): Promise<CommandExecution[]> {
    return this.service.createCommandExecutions(clientMetadata, dto);
  }

  @ApiEndpoint({
    description: 'List of command executions',
    statusCode: 200,
    responses: [
      {
        status: 200,
        type: ShortCommandExecution,
        isArray: true,
      },
    ],
  })
  @Get()
  @UseInterceptors(ClassSerializerInterceptor)
  @ApiRedisParams()
  async listCommandExecutions(
    @WorkbenchClientMetadata() clientMetadata: ClientMetadata,
  ): Promise<ShortCommandExecution[]> {
    return this.service.listCommandExecutions(clientMetadata);
  }

  @ApiEndpoint({
    description: 'Get command execution details',
    statusCode: 200,
    responses: [
      {
        status: 200,
        type: CommandExecution,
      },
    ],
  })
  @Get('/:id')
  @UseInterceptors(ClassSerializerInterceptor)
  @ApiRedisParams()
  async getCommandExecution(
    @WorkbenchClientMetadata() clientMetadata: ClientMetadata,
      @Param('id') id: string,
  ): Promise<CommandExecution> {
    return this.service.getCommandExecution(clientMetadata, id);
  }

  @ApiEndpoint({
    description: 'Delete command execution',
    statusCode: 200,
  })
  @Delete('/:id')
  @ApiRedisParams()
  async deleteCommandExecution(
    @WorkbenchClientMetadata() clientMetadata: ClientMetadata,
      @Param('id') id: string,
  ): Promise<void> {
    return this.service.deleteCommandExecution(clientMetadata, id);
  }

  @ApiEndpoint({
    description: 'Delete command executions',
    statusCode: 200,
  })
  @Delete()
  @ApiRedisParams()
  async deleteCommandExecutions(
    @WorkbenchClientMetadata() clientMetadata: ClientMetadata,
  ): Promise<void> {
    return this.service.deleteCommandExecutions(clientMetadata);
  }
}
