import { Nullable } from 'uiSrc/utils'
import { Rdi as RdiInstanceResponse } from 'apiSrc/modules/rdi/models/rdi'

export enum PipelineJobsTabs {
  Transformations = 'transformations',
  Output = 'output'
}

export enum DryRunJobResultStatus {
  Success = 'success',
  Failed = 'failed'
}

export interface IPipeline {
  config: string
  jobs: any[]
}

export interface IDryRunJobResults {
  transformations: {
    status: DryRunJobResultStatus
    error?: string
    data?: any
  }
  commands: {
    status: DryRunJobResultStatus
    error?: string
    data?: string[]
  }
}

export interface IStateRdiPipeline {
  loading: boolean
  error: string
  data: Nullable<IDryRunJobResults>
}

export interface IStateRdiDryRunJob {
  loading: boolean
  error: string
  results: Nullable<IPipeline>
}

export interface RdiInstance extends RdiInstanceResponse {
  visible?: boolean
  loading?: boolean
  error: string,
}

export interface InitialStateRdiInstances {
  loading: boolean
  error: string
  data: RdiInstance[]
  connectedInstance: RdiInstance
  editedInstance: InitialStateEditedRdiInstances
  loadingChanging: boolean
  errorChanging: string
  changedSuccessfully: boolean
}

export interface InitialStateEditedRdiInstances {
  loading: boolean
  error: string
  data: Nullable<RdiInstance>
}
