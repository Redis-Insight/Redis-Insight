import { Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { BulkActionsProvider } from 'src/modules/bulk-actions/providers/bulk-actions.provider';
import { CreateBulkActionDto } from 'src/modules/bulk-actions/dto/create-bulk-action.dto';
import { BulkActionIdDto } from 'src/modules/bulk-actions/dto/bulk-action-id.dto';
import { BulkActionsAnalytics } from 'src/modules/bulk-actions/bulk-actions.analytics';
import { SessionMetadata } from 'src/common/models';

@Injectable()
export class BulkActionsService {
  constructor(
    private readonly bulkActionsProvider: BulkActionsProvider,
    private readonly analytics: BulkActionsAnalytics,
  ) {}

  async create(sessionMetadata: SessionMetadata, dto: CreateBulkActionDto, socket: Socket) {
    const bulkAction = await this.bulkActionsProvider.create(sessionMetadata, dto, socket);
    const overview = bulkAction.getOverview();

    this.analytics.sendActionStarted(overview);

    return overview;
  }

  async get(dto: BulkActionIdDto) {
    const bulkAction = await this.bulkActionsProvider.get(dto.id);
    return bulkAction.getOverview();
  }

  async abort(dto: BulkActionIdDto) {
    const bulkAction = await this.bulkActionsProvider.abort(dto.id);

    return bulkAction.getOverview();
  }

  disconnect(socketId: string) {
    this.bulkActionsProvider.abortUsersBulkActions(socketId);
  }
}
