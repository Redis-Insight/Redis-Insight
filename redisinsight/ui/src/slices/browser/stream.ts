import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import axios, { AxiosError, CancelTokenSource } from 'axios'

import { apiService } from 'uiSrc/services'
import { SCAN_COUNT_DEFAULT } from 'uiSrc/constants/api'
import { ApiEndpoints, SortOrder } from 'uiSrc/constants'
import { refreshKeyInfoAction, } from 'uiSrc/slices/browser/keys'
import { getApiErrorMessage, getUrl, isStatusSuccessful, Maybe, Nullable } from 'uiSrc/utils'
import { getStreamRangeStart, getStreamRangeEnd } from 'uiSrc/utils/streamUtils'
import successMessages from 'uiSrc/components/notifications/success-messages'
import {
  AddStreamEntriesDto,
  AddStreamEntriesResponse,
  ConsumerDto,
  ConsumerGroupDto,
  CreateConsumerGroupsDto,
  GetStreamEntriesResponse,
  PendingEntryDto,
  UpdateConsumerGroupDto,
  ClaimPendingEntryDto,
  ClaimPendingEntriesResponse,
  AckPendingEntriesResponse,
} from 'apiSrc/modules/browser/dto/stream.dto'
import { AppDispatch, RootState } from '../store'
import { StateStream, StreamViewType } from '../interfaces/stream'
import { addErrorNotification, addMessageNotification } from '../app/notifications'

export const initialState: StateStream = {
  loading: false,
  error: '',
  sortOrder: SortOrder.DESC,
  range: { start: '', end: '' },
  viewType: StreamViewType.Data,
  data: {
    total: 0,
    entries: [],
    keyName: '',
    lastGeneratedId: '',
    firstEntry: {
      id: '',
      fields: {}
    },
    lastEntry: {
      id: '',
      fields: {}
    },
    lastRefreshTime: null,
  },
  groups: {
    loading: false,
    error: '',
    data: [],
    selectedGroup: null,
    lastRefreshTime: null,
  }
}

// A slice for recipes
const streamSlice = createSlice({
  name: 'stream',
  initialState,
  reducers: {
    setStreamInitialState: () => initialState,
    // load stream entries
    loadEntries: (state, { payload: resetData = true }: PayloadAction<Maybe<boolean>>) => {
      state.loading = true
      state.error = ''

      if (resetData) {
        state.data = initialState.data
      }
    },
    loadEntriesSuccess: (state, { payload: [data, sortOrder] }:
    PayloadAction<[GetStreamEntriesResponse, SortOrder]>) => {
      state.data = {
        ...state.data,
        ...data,
      }
      state.data.keyName = data?.keyName
      state.data.lastRefreshTime = Date.now()
      state.sortOrder = sortOrder
      state.loading = false
    },
    loadEntriesFailure: (state, { payload }) => {
      state.loading = false
      state.error = payload
    },
    // load more stream entries
    loadMoreEntries: (state) => {
      state.loading = true
      state.error = ''
    },
    loadMoreEntriesSuccess: (state, { payload: { entries, ...rest } }: PayloadAction<GetStreamEntriesResponse>) => {
      state.data = {
        ...state.data,
        ...rest,
        entries: state.data?.entries?.concat(entries),
      }
      state.loading = false
    },
    loadMoreEntriesFailure: (state, { payload }) => {
      state.loading = false
      state.error = payload
    },
    addNewEntries: (state) => {
      state.loading = true
      state.error = ''
    },
    addNewEntriesSuccess: (state) => {
      state.loading = false
    },
    addNewEntriesFailure: (state, { payload }) => {
      state.loading = false
      state.error = payload
    },
    addNewGroup: (state) => {
      state.loading = true
      state.error = ''
    },
    addNewGroupSuccess: (state) => {
      state.loading = false
    },
    addNewGroupFailure: (state, { payload }) => {
      state.loading = false
      state.error = payload
    },
    // delete Stream entries
    removeStreamEntries: (state) => {
      state.loading = true
      state.error = ''
    },
    removeStreamEntriesSuccess: (state) => {
      state.loading = false
    },
    removeStreamEntriesFailure: (state, { payload }) => {
      state.loading = false
      state.error = payload
    },
    updateStart: (state, { payload }: PayloadAction<string>) => {
      state.range.start = payload
    },
    updateEnd: (state, { payload }: PayloadAction<string>) => {
      state.range.end = payload
    },
    cleanRangeFilter: (state) => {
      state.range = {
        start: '',
        end: '',
      }
    },

    setStreamViewType: (state, { payload }: PayloadAction<StreamViewType>) => {
      state.viewType = payload
    },

    // load stream consumer groups entries
    loadConsumerGroups: (state, { payload: resetData = true }: PayloadAction<Maybe<boolean>>) => {
      state.groups.loading = true
      state.groups.error = ''

      if (resetData) {
        state.groups.data = initialState.groups.data
      }
    },
    loadConsumerGroupsSuccess: (state, { payload }: PayloadAction<ConsumerGroupDto[]>) => {
      state.groups.loading = false
      state.groups.data = payload
      state.groups.lastRefreshTime = Date.now()
    },
    loadConsumerGroupsFailure: (state, { payload }) => {
      state.groups.loading = false
      state.groups.error = payload
    },

    deleteConsumerGroups: (state) => {
      state.groups.loading = true
      state.groups.error = ''
    },

    deleteConsumerGroupsSuccess: (state) => {
      state.groups.loading = false
    },

    deleteConsumerGroupsFailure: (state, { payload }) => {
      state.groups.loading = false
      state.groups.error = payload
    },

    setSelectedGroup: (state, { payload }) => {
      state.groups.selectedGroup = payload
    },

    modifyLastDeliveredId: (state) => {
      state.groups.loading = true
    },

    modifyLastDeliveredIdSuccess: (state) => {
      state.groups.loading = false
    },

    modifyLastDeliveredIdFailure: (state, { payload }) => {
      state.groups.loading = false
      state.groups.error = payload
    },

    setSelectedConsumer: (state, { payload }) => {
      state.groups.selectedGroup = {
        ...state.groups.selectedGroup,
        selectedConsumer: payload
      }
    },

    loadConsumersSuccess: (state, { payload }: PayloadAction<ConsumerDto[]>) => {
      state.groups.loading = false

      state.groups.selectedGroup = {
        ...state.groups.selectedGroup,
        lastRefreshTime: Date.now(),
        data: payload,
      }
    },

    loadConsumersFailure: (state, { payload }: PayloadAction<string>) => {
      state.groups.loading = false
      state.groups.error = payload
      state.viewType = StreamViewType.Groups
    },

    deleteConsumers: (state) => {
      state.groups.loading = true
      state.groups.error = ''
    },

    deleteConsumersSuccess: (state) => {
      state.groups.loading = false
    },

    deleteConsumersFailure: (state, { payload }) => {
      state.groups.loading = false
      state.groups.error = payload
    },

    loadConsumerMessagesSuccess: (state, { payload }: PayloadAction<PendingEntryDto[]>) => {
      state.groups.loading = false

      state.groups.selectedGroup = {
        ...state.groups.selectedGroup,
        selectedConsumer: {
          ...state.groups.selectedGroup?.selectedConsumer,
          lastRefreshTime: Date.now(),
          data: payload,
        }
      }
    },

    loadConsumerMessagesFailure: (state, { payload }: PayloadAction<string>) => {
      state.groups.loading = false
      state.groups.error = payload
      state.viewType = StreamViewType.Consumers
    },

    loadMoreConsumerMessagesSuccess: (state, { payload }: PayloadAction<PendingEntryDto[]>) => {
      state.groups.loading = false

      state.groups.selectedGroup = {
        ...state.groups.selectedGroup,
        selectedConsumer: {
          ...state.groups.selectedGroup?.selectedConsumer,
          lastRefreshTime: Date.now(),
          data: (state.groups.selectedGroup?.selectedConsumer?.data ?? []).concat(payload),
        }
      }
    },

    setConsumerGroupsSortOrder: (state, { payload }: PayloadAction<SortOrder>) => {
      state.groups.sortOrder = payload
    },
    loadMoreConsumerGroupsFailure: (state, { payload }) => {
      state.loading = false
      state.error = payload
    },

    claimConsumerMessages: (state) => {
      state.groups.loading = true
    },
    claimConsumerMessagesSuccess: (state) => {
      state.groups.loading = false
    },
    claimConsumerMessagesFailure: (state, { payload }) => {
      state.groups.loading = false
      state.groups.error = payload
    },
    ackPendingEntries: (state) => {
      state.loading = true
    },
    ackPendingEntriesSuccess: (state) => {
      state.loading = false
    },
    ackPendingEntriesFailure: (state, { payload }) => {
      state.loading = false
      state.groups.error = payload
    },
  },
})

// Actions generated from the slice
export const {
  setStreamInitialState,
  loadEntries,
  loadEntriesSuccess,
  loadEntriesFailure,
  loadMoreEntries,
  loadMoreEntriesSuccess,
  loadMoreEntriesFailure,
  addNewEntries,
  addNewEntriesSuccess,
  addNewEntriesFailure,
  addNewGroup,
  addNewGroupSuccess,
  addNewGroupFailure,
  removeStreamEntries,
  removeStreamEntriesSuccess,
  removeStreamEntriesFailure,
  updateStart,
  updateEnd,
  cleanRangeFilter,
  setStreamViewType,
  loadConsumerGroups,
  loadConsumerGroupsSuccess,
  loadConsumerGroupsFailure,
  deleteConsumerGroups,
  deleteConsumerGroupsSuccess,
  deleteConsumerGroupsFailure,
  modifyLastDeliveredId,
  modifyLastDeliveredIdSuccess,
  modifyLastDeliveredIdFailure,
  loadConsumersSuccess,
  loadConsumersFailure,
  deleteConsumers,
  deleteConsumersSuccess,
  deleteConsumersFailure,
  loadConsumerMessagesSuccess,
  loadConsumerMessagesFailure,
  loadMoreConsumerMessagesSuccess,
  setSelectedGroup,
  setSelectedConsumer,
  claimConsumerMessages,
  claimConsumerMessagesSuccess,
  claimConsumerMessagesFailure,
  ackPendingEntries,
  ackPendingEntriesSuccess,
  ackPendingEntriesFailure,
} = streamSlice.actions

// A selector
export const streamSelector = (state: RootState) => state.browser.stream
export const streamDataSelector = (state: RootState) => state.browser.stream?.data
export const streamRangeSelector = (state: RootState) => state.browser.stream?.range
export const streamGroupsSelector = (state: RootState) => state.browser.stream?.groups
export const streamGroupsDataSelector = (state: RootState) => state.browser.stream?.groups?.data || []
export const selectedGroupSelector = (state: RootState) => state.browser.stream?.groups?.selectedGroup
export const selectedConsumerSelector = (state: RootState) =>
  state.browser.stream?.groups?.selectedGroup?.selectedConsumer

// The reducer
export default streamSlice.reducer

// eslint-disable-next-line import/no-mutable-exports
export let sourceStreamFetch: Nullable<CancelTokenSource> = null

// Asynchronous thunk action
export function fetchStreamEntries(
  key: string,
  count: number,
  sortOrder: SortOrder,
  resetData?: boolean,
  onSuccess?: (data: GetStreamEntriesResponse) => void,
) {
  return async (dispatch: AppDispatch, stateInit: () => RootState) => {
    dispatch(loadEntries(resetData))

    try {
      sourceStreamFetch?.cancel?.()

      const { CancelToken } = axios
      sourceStreamFetch = CancelToken.source()

      const state = stateInit()
      const start = getStreamRangeStart(state.browser.stream.range.start, state.browser.stream.data.firstEntry?.id)
      const end = getStreamRangeEnd(state.browser.stream.range.end, state.browser.stream.data.lastEntry?.id)
      const { data, status } = await apiService.post<GetStreamEntriesResponse>(
        getUrl(
          state.connections.instances.connectedInstance?.id,
          ApiEndpoints.STREAMS_ENTRIES_GET
        ),
        {
          keyName: key,
          start,
          end,
          count,
          sortOrder
        },
        { cancelToken: sourceStreamFetch.token }
      )

      sourceStreamFetch = null
      if (isStatusSuccessful(status)) {
        dispatch(loadEntriesSuccess([data, sortOrder]))
        onSuccess?.(data)
      }
    } catch (_err) {
      if (!axios.isCancel(_err)) {
        const error = _err as AxiosError
        const errorMessage = getApiErrorMessage(error)
        dispatch(addErrorNotification(error))
        dispatch(loadEntriesFailure(errorMessage))
      }
    }
  }
}

// Asynchronous thunk action
export function refreshStream(
  key: string,
  resetData: boolean = false,
) {
  return async (dispatch: AppDispatch, stateInit: () => RootState) => {
    const state = stateInit()
    const streamViewType = state.browser.stream.viewType

    if (streamViewType === StreamViewType.Data) {
      dispatch(refreshStreamEntries(key, resetData))
    }
    if (streamViewType === StreamViewType.Groups) {
      dispatch<any>(fetchConsumerGroups(resetData))
    }
    if (streamViewType === StreamViewType.Consumers) {
      dispatch<any>(fetchConsumers(
        resetData,
        () => {},
        () => dispatch(setStreamViewType(StreamViewType.Groups)),
      ))
    }
    if (streamViewType === StreamViewType.Messages) {
      dispatch<any>(fetchConsumerMessages(
        resetData,
        () => {},
        () => dispatch(setStreamViewType(StreamViewType.Consumers)),
      ))
    }
  }
}

// Asynchronous thunk action
export function refreshStreamEntries(
  key: string,
  resetData?: boolean,
) {
  return async (dispatch: AppDispatch, stateInit: () => RootState) => {
    dispatch(loadEntries(resetData))

    try {
      sourceStreamFetch?.cancel?.()

      const { CancelToken } = axios
      sourceStreamFetch = CancelToken.source()

      const state = stateInit()
      const { sortOrder } = state.browser.stream
      const start = getStreamRangeStart(state.browser.stream.range.start, state.browser.stream.data.firstEntry?.id)
      const end = getStreamRangeEnd(state.browser.stream.range.end, state.browser.stream.data.lastEntry?.id)
      const { data, status } = await apiService.post<GetStreamEntriesResponse>(
        getUrl(
          state.connections.instances.connectedInstance?.id,
          ApiEndpoints.STREAMS_ENTRIES_GET
        ),
        {
          keyName: key,
          start,
          end,
          sortOrder,
          count: SCAN_COUNT_DEFAULT,
        },
        { cancelToken: sourceStreamFetch.token }
      )

      sourceStreamFetch = null
      if (isStatusSuccessful(status)) {
        dispatch(loadEntriesSuccess([data, sortOrder]))
      }
    } catch (_err) {
      if (!axios.isCancel(_err)) {
        const error = _err as AxiosError
        const errorMessage = getApiErrorMessage(error)
        dispatch(addErrorNotification(error))
        dispatch(loadEntriesFailure(errorMessage))
      }
    }
  }
}

// Asynchronous thunk action
export function fetchMoreStreamEntries(
  key: string,
  start: string,
  end: string,
  count: number,
  sortOrder: SortOrder,
  onSuccess?: (data: GetStreamEntriesResponse) => void,
) {
  return async (dispatch: AppDispatch, stateInit: () => RootState) => {
    dispatch(loadMoreEntries())

    try {
      sourceStreamFetch?.cancel?.()

      const { CancelToken } = axios
      sourceStreamFetch = CancelToken.source()
      const state = stateInit()
      const { data, status } = await apiService.post<GetStreamEntriesResponse>(
        getUrl(
          state.connections.instances.connectedInstance?.id,
          ApiEndpoints.STREAMS_ENTRIES_GET
        ),
        {
          keyName: key,
          start,
          end,
          count,
          sortOrder
        },
        { cancelToken: sourceStreamFetch.token }
      )

      sourceStreamFetch = null
      if (isStatusSuccessful(status)) {
        dispatch(loadMoreEntriesSuccess(data))
        onSuccess?.(data)
      }
    } catch (_err) {
      if (!axios.isCancel(_err)) {
        const error = _err as AxiosError
        const errorMessage = getApiErrorMessage(error)
        dispatch(addErrorNotification(error))
        dispatch(loadMoreEntriesFailure(errorMessage))
      }
    }
  }
}

// Asynchronous thunk action
export function addNewEntriesAction(
  data: AddStreamEntriesDto,
  onSuccess?: () => void,
  onFailed?: () => void
) {
  return async (dispatch: AppDispatch, stateInit: () => RootState) => {
    dispatch(addNewEntries())

    try {
      const state = stateInit()
      const { status } = await apiService.post<AddStreamEntriesResponse>(
        getUrl(
          state.connections.instances.connectedInstance?.id,
          ApiEndpoints.STREAMS_ENTRIES
        ),
        data
      )

      if (isStatusSuccessful(status)) {
        dispatch(addNewEntriesSuccess())
        dispatch<any>(refreshStreamEntries(data.keyName, false))
        dispatch<any>(refreshKeyInfoAction(data.keyName))
        onSuccess?.()
      }
    } catch (_err) {
      const error = _err as AxiosError
      const errorMessage = getApiErrorMessage(error)
      dispatch(addErrorNotification(error))
      dispatch(addNewEntriesFailure(errorMessage))
      onFailed?.()
    }
  }
}
// Asynchronous thunk actions
export function deleteStreamEntry(key: string, entries: string[], onSuccessAction?: () => void,) {
  return async (dispatch: AppDispatch, stateInit: () => RootState) => {
    dispatch(removeStreamEntries())
    try {
      const state = stateInit()
      const { status } = await apiService.delete(
        getUrl(
          state.connections.instances.connectedInstance?.id,
          ApiEndpoints.STREAMS_ENTRIES
        ),
        {
          data: {
            keyName: key,
            entries,
          },
        }
      )
      if (isStatusSuccessful(status)) {
        onSuccessAction?.()
        dispatch(removeStreamEntriesSuccess())
        dispatch<any>(refreshStreamEntries(key, false))
        dispatch<any>(refreshKeyInfoAction(key))
        dispatch(addMessageNotification(
          successMessages.REMOVED_KEY_VALUE(
            key,
            entries.join(''),
            'Entry'
          )
        ))
      }
    } catch (_err) {
      const error = _err as AxiosError
      const errorMessage = getApiErrorMessage(error)
      dispatch(addErrorNotification(error))
      dispatch(removeStreamEntriesFailure(errorMessage))
    }
  }
}

// Asynchronous thunk action
export function addNewGroupAction(
  data: CreateConsumerGroupsDto,
  onSuccess?: () => void,
  onFail?: () => void
) {
  return async (dispatch: AppDispatch, stateInit: () => RootState) => {
    dispatch(addNewGroup())

    try {
      const state = stateInit()
      const { status } = await apiService.post(
        getUrl(
          state.connections.instances.connectedInstance?.id,
          ApiEndpoints.STREAMS_CONSUMER_GROUPS
        ),
        data
      )

      if (isStatusSuccessful(status)) {
        dispatch(addNewGroupSuccess())
        dispatch<any>(fetchConsumerGroups(false))
        dispatch<any>(refreshKeyInfoAction(data.keyName))
        onSuccess?.()
      }
    } catch (_err) {
      const error = _err as AxiosError
      const errorMessage = getApiErrorMessage(error)
      dispatch(addErrorNotification(error))
      dispatch(addNewGroupFailure(errorMessage))
      onFail?.()
    }
  }
}

// Asynchronous thunk action
export function fetchConsumerGroups(
  resetData?: boolean,
  onSuccess?: () => void,
  onFailed?: () => void,
) {
  return async (dispatch: AppDispatch, stateInit: () => RootState) => {
    dispatch(loadConsumerGroups(resetData))

    try {
      const state = stateInit()
      const { data, status } = await apiService.post<ConsumerGroupDto[]>(
        getUrl(
          state.connections.instances.connectedInstance?.id,
          ApiEndpoints.STREAMS_CONSUMER_GROUPS_GET
        ),
        {
          keyName: state.browser.keys?.selectedKey?.data?.name,
        },
      )

      if (isStatusSuccessful(status)) {
        dispatch(loadConsumerGroupsSuccess(data))
        onSuccess?.()
      }
    } catch (_err) {
      if (!axios.isCancel(_err)) {
        const error = _err as AxiosError
        const errorMessage = getApiErrorMessage(error)
        dispatch(addErrorNotification(error))
        dispatch(loadConsumerGroupsFailure(errorMessage))
        onFailed?.()
      }
    }
  }
}

export function deleteConsumerGroupsAction(keyName: string, consumerGroups: string[], onSuccessAction?: () => void) {
  return async (dispatch: AppDispatch, stateInit: () => RootState) => {
    dispatch(deleteConsumerGroups())
    try {
      const state = stateInit()
      const { status } = await apiService.delete(
        getUrl(
          state.connections.instances.connectedInstance?.id,
          ApiEndpoints.STREAMS_CONSUMER_GROUPS
        ),
        {
          data: {
            keyName,
            consumerGroups,
          },
        }
      )
      if (isStatusSuccessful(status)) {
        onSuccessAction?.()
        dispatch(deleteConsumerGroupsSuccess())
        dispatch<any>(fetchConsumerGroups(false))
        dispatch<any>(refreshKeyInfoAction(keyName))
        dispatch(addMessageNotification(
          successMessages.REMOVED_KEY_VALUE(
            keyName,
            consumerGroups.join(''),
            'Group'
          )
        ))
      }
    } catch (error) {
      const errorMessage = getApiErrorMessage(error)
      dispatch(addErrorNotification(error))
      dispatch(deleteConsumerGroupsFailure(errorMessage))
    }
  }
}

// Asynchronous thunk action
export function fetchConsumers(
  resetData?: boolean,
  onSuccess?: () => void,
  onFailed?: () => void,
) {
  return async (dispatch: AppDispatch, stateInit: () => RootState) => {
    dispatch(loadConsumerGroups(resetData))

    try {
      const state = stateInit()
      const { data, status } = await apiService.post<ConsumerDto[]>(
        getUrl(
          state.connections.instances.connectedInstance?.id,
          ApiEndpoints.STREAMS_CONSUMERS_GET
        ),
        {
          keyName: state.browser.keys?.selectedKey?.data?.name,
          groupName: state.browser.stream.groups.selectedGroup?.name,
        },
      )

      if (isStatusSuccessful(status)) {
        dispatch(loadConsumersSuccess(data))
        onSuccess?.()
      }
    } catch (_err) {
      if (!axios.isCancel(_err)) {
        const error = _err as AxiosError
        const errorMessage = getApiErrorMessage(error)
        dispatch(addErrorNotification(error))
        dispatch(loadConsumersFailure(errorMessage))
        onFailed?.()
      }
    }
  }
}

// Asynchronous thunk action
export function deleteConsumersAction(
  keyName: string,
  groupName: string,
  consumerNames: string[],
  onSuccessAction?: () => void
) {
  return async (dispatch: AppDispatch, stateInit: () => RootState) => {
    dispatch(deleteConsumers())
    try {
      const state = stateInit()
      const { status } = await apiService.delete(
        getUrl(
          state.connections.instances.connectedInstance?.id,
          ApiEndpoints.STREAMS_CONSUMERS
        ),
        {
          data: {
            keyName,
            groupName,
            consumerNames,
          },
        }
      )
      if (isStatusSuccessful(status)) {
        onSuccessAction?.()
        dispatch(deleteConsumersSuccess())
        dispatch<any>(fetchConsumers(false))
        dispatch<any>(refreshKeyInfoAction(keyName))
        dispatch(addMessageNotification(
          successMessages.REMOVED_KEY_VALUE(
            keyName,
            consumerNames.join(''),
            'Consumer'
          )
        ))
      }
    } catch (error) {
      const errorMessage = getApiErrorMessage(error)
      dispatch(addErrorNotification(error))
      dispatch(deleteConsumersFailure(errorMessage))
    }
  }
}

// Asynchronous thunk action
export function fetchConsumerMessages(
  resetData?: boolean,
  onSuccess?: () => void,
  onFailed?: () => void,
) {
  return async (dispatch: AppDispatch, stateInit: () => RootState) => {
    dispatch(loadConsumerGroups(resetData))

    try {
      const state = stateInit()
      const { data, status } = await apiService.post<PendingEntryDto[]>(
        getUrl(
          state.connections.instances.connectedInstance?.id,
          ApiEndpoints.STREAMS_CONSUMERS_MESSAGES_GET
        ),
        {
          keyName: state.browser.keys?.selectedKey?.data?.name,
          groupName: state.browser.stream.groups.selectedGroup?.name,
          consumerName: state.browser.stream.groups.selectedGroup?.selectedConsumer?.name
        },
      )
      if (isStatusSuccessful(status)) {
        dispatch(loadConsumerMessagesSuccess(data))
        onSuccess?.()
      }
    } catch (_err) {
      if (!axios.isCancel(_err)) {
        const error = _err as AxiosError
        const errorMessage = getApiErrorMessage(error)
        dispatch(addErrorNotification(error))
        dispatch(loadConsumerMessagesFailure(errorMessage))
        onFailed?.()
      }
    }
  }
}

// Asynchronous thunk action
export function fetchMoreConsumerMessages(
  count: number,
  start: string = '-',
  end: string = '+',
  resetData?: boolean,
  onSuccess?: () => void,
  onFailed?: () => void,
) {
  return async (dispatch: AppDispatch, stateInit: () => RootState) => {
    dispatch(loadConsumerGroups(resetData))

    try {
      const state = stateInit()
      const { data, status } = await apiService.post<PendingEntryDto[]>(
        getUrl(
          state.connections.instances.connectedInstance?.id,
          ApiEndpoints.STREAMS_CONSUMERS_MESSAGES_GET
        ),
        {
          start,
          end,
          count,
          keyName: state.browser.keys?.selectedKey?.data?.name,
          groupName: state.browser.stream.groups.selectedGroup?.name,
          consumerName: state.browser.stream.groups.selectedGroup?.selectedConsumer?.name
        },
      )
      if (isStatusSuccessful(status)) {
        dispatch(loadMoreConsumerMessagesSuccess(data))
        onSuccess?.()
      }
    } catch (_err) {
      if (!axios.isCancel(_err)) {
        const error = _err as AxiosError
        const errorMessage = getApiErrorMessage(error)
        dispatch(addErrorNotification(error))
        dispatch(loadConsumerMessagesFailure(errorMessage))
        onFailed?.()
      }
    }
  }
}

// Asynchronous thunk action
export function modifyLastDeliveredIdAction(
  data: UpdateConsumerGroupDto,
  onSuccess?: () => void,
  onFailed?: () => void
) {
  return async (dispatch: AppDispatch, stateInit: () => RootState) => {
    dispatch(modifyLastDeliveredId())

    try {
      const state = stateInit()
      const keyName = state.browser.keys.selectedKey.data?.name
      const { status } = await apiService.patch<any>(
        getUrl(
          state.connections.instances.connectedInstance?.id,
          ApiEndpoints.STREAMS_CONSUMER_GROUPS
        ),
        data
      )

      if (isStatusSuccessful(status)) {
        dispatch(modifyLastDeliveredIdSuccess())
        dispatch<any>(fetchConsumerGroups(false))
        keyName && dispatch<any>(refreshKeyInfoAction(keyName))
        onSuccess?.()
      }
    } catch (_err) {
      const error = _err as AxiosError
      const errorMessage = getApiErrorMessage(error)
      dispatch(addErrorNotification(error))
      dispatch(modifyLastDeliveredIdFailure(errorMessage))
      onFailed?.()
    }
  }
}

// Asynchronous thunk action
export function claimPendingMessages(
  payload: Partial<ClaimPendingEntryDto>,
  onSuccess?: (data: ClaimPendingEntriesResponse) => void,
  onFailed?: () => void,
) {
  return async (dispatch: AppDispatch, stateInit: () => RootState) => {
    dispatch(claimConsumerMessages())

    try {
      const state = stateInit()
      const { data, status } = await apiService.post<ClaimPendingEntriesResponse>(
        getUrl(
          state.connections.instances.connectedInstance?.id,
          ApiEndpoints.STREAM_CLAIM_PENDING_MESSAGES
        ),
        {
          keyName: state.browser.keys.selectedKey.data?.name,
          groupName: state.browser.stream.groups.selectedGroup?.name,
          consumerName: state.browser.stream.groups.selectedGroup?.selectedConsumer?.name,
          ...payload
        },
      )
      if (isStatusSuccessful(status)) {
        dispatch(claimConsumerMessagesSuccess())
        dispatch<any>(fetchConsumerMessages())
        dispatch<any>(fetchConsumers())
        dispatch(addMessageNotification(
          successMessages.MESSAGE_ACTION(data.affected[0], 'claimed')
        ))
        onSuccess?.(data)
      }
    } catch (_err) {
      if (!axios.isCancel(_err)) {
        const error = _err as AxiosError
        const errorMessage = getApiErrorMessage(error)
        dispatch(addErrorNotification(error))
        dispatch(claimConsumerMessagesFailure(errorMessage))
        onFailed?.()
      }
    }
  }
}

// Asynchronous thunk actions
export function ackPendingEntriesAction(
  key: string,
  group: string,
  entries: string[],
  onSuccessAction?: () => void,
  onFailed?: () => void
) {
  return async (dispatch: AppDispatch, stateInit: () => RootState) => {
    dispatch(removeStreamEntries())
    try {
      const state = stateInit()
      const { status } = await apiService.post<AckPendingEntriesResponse>(
        getUrl(
          state.connections.instances.connectedInstance?.id,
          ApiEndpoints.STREAM_ACK_PENDING_ENTRIES
        ),
        {
          keyName: key,
          groupName: group,
          entries,
        }
      )
      if (isStatusSuccessful(status)) {
        onSuccessAction?.()
        dispatch(ackPendingEntriesSuccess())
        dispatch<any>(fetchConsumerMessages())
        dispatch<any>(fetchConsumers())
        dispatch(addMessageNotification(
          successMessages.MESSAGE_ACTION(entries[0], 'acknowledged')
        ))
      }
    } catch (_err) {
      if (!axios.isCancel(_err)) {
        const error = _err as AxiosError
        const errorMessage = getApiErrorMessage(error)
        dispatch(addErrorNotification(error))
        dispatch(ackPendingEntriesFailure(errorMessage))
        onFailed?.()
      }
    }
  }
}
