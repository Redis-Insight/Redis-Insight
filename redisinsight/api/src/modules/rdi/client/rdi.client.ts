import {
  RdiClientMetadata, RdiJob, RdiPipeline, RdiType, RdiDryRunJobResult,
} from 'src/modules/rdi/models';
import { DryRunJobDto, DryRunJobResponseDto } from 'src/modules/rdi/dto';

export abstract class RdiClient {
  abstract type: RdiType;

  public readonly id: string;

  public lastUsed: number = Date.now();

  constructor(
    protected readonly metadata: RdiClientMetadata,
    protected readonly client: unknown,
  ) {
    this.id = RdiClient.generateId(this.metadata);
  }

  abstract isConnected(): Promise<boolean>;

  abstract getSchema(): Promise<object>;

  abstract getPipeline(): Promise<RdiPipeline>;

  abstract deploy(pipeline: RdiPipeline): Promise<RdiPipeline>;

  abstract deployJob(job: RdiJob): Promise<RdiJob>;

  abstract getDryRunJobTransformations(data: DryRunJobDto): Promise<RdiDryRunJobResult>;

  abstract getDryRunJobCommands(data: DryRunJobDto): Promise<RdiDryRunJobResult>;

  abstract dryRunJob(data: DryRunJobDto): Promise<DryRunJobResponseDto>;

  abstract disconnect(): Promise<void>;

  public setLastUsed(): void {
    this.lastUsed = Date.now();
  }

  static generateId(cm: RdiClientMetadata): string {
    const empty = '(nil)';
    const separator = '_';

    const id = [
      cm.id,
    ].join(separator);

    const uId = [
      cm.sessionMetadata?.userId || empty,
      cm.sessionMetadata?.sessionId || empty,
      cm.sessionMetadata?.uniqueId || empty,
    ].join(separator);

    return [
      id,
      uId,
    ].join(separator);
  }
}
