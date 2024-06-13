import { Agreements } from 'src/modules/settings/models/agreements';
import { SessionMetadata } from 'src/common/models';

export abstract class AgreementsRepository {
  abstract getOrCreate(sessionMetadata: SessionMetadata): Promise<Agreements>;
  abstract update(sessionMetadata: SessionMetadata, agreements: Agreements): Promise<Agreements>;
}
