import { INestApplication, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { MessageMappingProperties } from '@nestjs/websockets';
import { get } from 'lodash';
import { Observable } from 'rxjs';
import { Socket } from 'socket.io';
import { API_HEADER_WINDOW_ID } from 'src/common/constants';
import ERROR_MESSAGES from 'src/constants/error-messages';
import { WindowAuthService } from '../window-auth.service';

export class WindowsAuthAdapter extends IoAdapter {
  private windowAuthService: WindowAuthService;

  private logger = new Logger('WindowsAuthAdapter');

  constructor(private app: INestApplication) {
    super(app);
    this.windowAuthService = this.app.get(WindowAuthService);
  }

  async bindMessageHandlers(
    socket: Socket,
    handlers: MessageMappingProperties[],
    transform: (data: any) => Observable<any>,
  ) {
    const windowId = (get(socket, `handshake.headers.${API_HEADER_WINDOW_ID}`) as string) || '';
    const isAuthorized = await this.windowAuthService?.isAuthorized(windowId);

    if (!isAuthorized) {
      this.logger.error(ERROR_MESSAGES.UNDEFINED_WINDOW_ID);
      return;
    }

    super.bindMessageHandlers(socket, handlers, transform);
  }
}
