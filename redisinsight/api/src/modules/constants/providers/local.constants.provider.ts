import { ConstantsProvider } from 'src/modules/constants/providers/constants.provider';
import { SessionMetadata } from 'src/common/models';

export class LocalConstantsProvider extends ConstantsProvider {
  /**
   * @inheritDoc
   */
  getSystemSessionMetadata(): SessionMetadata {
    return {
      userId: '1',
      sessionId: '1',
    };
  }
}
