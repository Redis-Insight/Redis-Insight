import { Nullable } from 'uiSrc/utils'
import { Rdi as RdiInstanceResponse } from 'apiSrc/modules/rdi/models/rdi'

export interface IPipeline {
  config: string
  jobs: any[]
}

export interface IStateRdi {
  loading: boolean
  error: string
  data: Nullable<IPipeline>
}
export interface RdiInstance extends RdiInstanceResponse {
  visible?: boolean
  loading?: boolean
}

export interface InitialStateRdiInstances {
  loading: boolean
  error: string
  data: RdiInstance[]
  connectedInstance: RdiInstance
  loadingChanging: boolean
  errorChanging: string
  changedSuccessfully: boolean
}