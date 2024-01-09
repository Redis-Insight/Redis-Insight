import { RdiJob, RdiPipeline, RdiType } from 'src/modules/rdi/models';
import { RdiClient } from 'src/modules/rdi/client/rdi.client';
import { RdiUrl } from 'src/modules/rdi/constants';
import { AxiosInstance } from 'axios';
import { DryRunJobDto, DryRunJobResponseDto } from 'src/modules/rdi/dto';
import { DyRunJobStatus, RdiDryRunJobResult } from 'src/modules/rdi/models/rdi-dry-run';

export class ApiRdiClient extends RdiClient {
  public type = RdiType.API;

  protected readonly client: AxiosInstance;

  async isConnected(): Promise<boolean> {
    // todo: check if needed and possible
    return true;
  }

  async getSchema(): Promise<object> {
    const response = await this.client.get(RdiUrl.GetSchema);
    return response.data;
  }

  async getPipeline(): Promise<RdiPipeline> {
    const response = await this.client.get(RdiUrl.GetPipeline);
    return response.data;
  }

  async deploy(pipeline: RdiPipeline): Promise<RdiPipeline> {
    return null;
  }

  async deployJob(job: RdiJob): Promise<RdiJob> {
    return null;
  }

  async dryRunJob(data: DryRunJobDto): Promise<DryRunJobResponseDto> {
    const response = await Promise.all(
      [this.getDryRunJobTransformations(data), this.getDryRunJobCommands(data)],
    );
    return ({ transformations: response[0], commands: response[1] });
  }

  async getDryRunJobTransformations(data: DryRunJobDto): Promise<RdiDryRunJobResult> {
    try {
      const transformations = await this.client.post(
        RdiUrl.DryRunJob,
        { input: data.input, job: data.job, test_output: false },
      );
      return ({ status: DyRunJobStatus.Success, data: transformations.data });
    } catch (e) {
      return ({ status: DyRunJobStatus.Fail, error: e.message });
    }
  }

  async getDryRunJobCommands(data: DryRunJobDto): Promise<RdiDryRunJobResult> {
    try {
      const commands = await this.client.post(
        RdiUrl.DryRunJob,
        { input: data.input, job: data.job, test_output: true },
      );
      return ({ status: DyRunJobStatus.Success, data: commands.data });
    } catch (e) {
      return ({ status: DyRunJobStatus.Fail, error: e.message });
    }
  }

  async disconnect(): Promise<void> {
    return undefined;
  }
}
