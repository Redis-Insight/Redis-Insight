import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { SessionMetadata } from 'src/common/models';

export const WSSessionMetadata = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): SessionMetadata => {
    const socket = ctx.switchToWs().getClient();
    return socket.data.sessionMetadata;
  },
);
