import {
  ClassSerializerInterceptor,
  Controller, HttpCode, Post, UploadedFile,
  UseInterceptors, UsePipes, ValidationPipe
} from '@nestjs/common';
import {
  ApiBody, ApiConsumes, ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { DatabaseImportService } from 'src/modules/database-import/database-import.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { DatabaseImportResponse } from 'src/modules/database-import/dto/database-import.response';
import { RequestSessionMetadata } from 'src/common/decorators';
import { SessionMetadata } from 'src/common/models';

@UsePipes(new ValidationPipe({ transform: true }))
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Database')
@Controller('/databases')
export class DatabaseImportController {
  constructor(private readonly service: DatabaseImportService) {}

  @Post('import')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file'))
  @ApiResponse({ type: DatabaseImportResponse })
  async import(
    @RequestSessionMetadata() sessionMetadata: SessionMetadata,
      @UploadedFile() file: any,
  ): Promise<DatabaseImportResponse> {
    return this.service.import(sessionMetadata, file);
  }
}
