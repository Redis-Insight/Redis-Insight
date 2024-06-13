import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { cloneDeep, remove, get, isUndefined } from 'lodash'
import axios, { AxiosError, CancelTokenSource } from 'axios'
import { apiService, localStorageService } from 'uiSrc/services'
import {
  ApiEndpoints,
  BrowserStorageItem,
  KeyTypes,
  KeyValueFormat,
  EndpointBasedOnKeyType,
  ENDPOINT_BASED_ON_KEY_TYPE,
  SearchHistoryMode,
  SortOrder,
  STRING_MAX_LENGTH,
  ModulesKeyTypes
} from 'uiSrc/constants'
import {
  getApiErrorMessage,
  isStatusNotFoundError,
  Nullable,
  parseKeysListResponse,
  getUrl,
  isStatusSuccessful,
  Maybe,
  bufferToString,
  isEqualBuffers,
  isRedisearchAvailable,
} from 'uiSrc/utils'
import { DEFAULT_SEARCH_MATCH, SCAN_COUNT_DEFAULT } from 'uiSrc/constants/api'
import { getBasedOnViewTypeEvent, sendEventTelemetry, TelemetryEvent, getAdditionalAddedEventData, getMatchType } from 'uiSrc/telemetry'
import successMessages from 'uiSrc/components/notifications/success-messages'
import { IFetchKeyArgs, IKeyPropTypes } from 'uiSrc/constants/prop-types/keys'
import { resetBrowserTree } from 'uiSrc/slices/app/context'

import { CreateListWithExpireDto, } from 'apiSrc/modules/browser/list/dto'
import { SetStringWithExpireDto } from 'apiSrc/modules/browser/string/dto'
import { CreateZSetWithExpireDto, } from 'apiSrc/modules/browser/z-set/dto'
import { CreateHashWithExpireDto } from 'apiSrc/modules/browser/hash/dto'
import { CreateRejsonRlWithExpireDto } from 'apiSrc/modules/browser/rejson-rl/dto'
import { CreateSetWithExpireDto } from 'apiSrc/modules/browser/set/dto'
import { GetKeyInfoResponse, GetKeysWithDetailsResponse } from 'apiSrc/modules/browser/keys/dto'
import { CreateStreamDto } from 'apiSrc/modules/browser/stream/dto'

import { fetchString } from './string'
import { setZsetInitialState, fetchZSetMembers, refreshZsetMembersAction } from './zset'
import { fetchSetMembers, refreshSetMembersAction } from './set'
import { fetchReJSON } from './rejson'
import { setHashInitialState, fetchHashFields, refreshHashFieldsAction } from './hash'
import { setListInitialState, fetchListElements, refreshListElementsAction } from './list'
import { fetchStreamEntries, refreshStream, setStreamInitialState } from './stream'
import {
  deleteRedisearchHistoryAction,
  deleteRedisearchKeyFromList,
  editRedisearchKeyFromList,
  editRedisearchKeyTTLFromList,
  fetchMoreRedisearchKeysAction,
  fetchRedisearchHistoryAction,
  fetchRedisearchKeysAction,
  resetRedisearchKeysData,
  setLastBatchRedisearchKeys,
  setQueryRedisearch,
} from './redisearch'
import { addErrorNotification, addMessageNotification } from '../app/notifications'
import { KeysStore, KeyViewType, SearchHistoryItem, SearchMode } from '../interfaces/keys'
import { AppDispatch, RootState } from '../store'
import { StreamViewType } from '../interfaces/stream'
import { RedisResponseBuffer, RedisString } from '../interfaces'

const defaultViewFormat = KeyValueFormat.Unicode

export const initialState: KeysStore = {
  loading: false,
  deleting: false,
  error: '',
  filter: null,
  search: '',
  isSearched: false,
  isFiltered: false,
  isBrowserFullScreen: false,
  searchMode: localStorageService?.get(BrowserStorageItem.browserSearchMode) ?? SearchMode.Pattern,
  viewType: localStorageService?.get(BrowserStorageItem.browserViewType) ?? KeyViewType.Browser,
  data: {
    total: 0,
    scanned: 0,
    nextCursor: '0',
    keys: [],
    shardsMeta: {},
    previousResultCount: 0,
    lastRefreshTime: null,
  },
  selectedKey: {
    loading: false,
    refreshing: false,
    isRefreshDisabled: false,
    lastRefreshTime: null,
    error: '',
    data: null,
    length: 0,
    viewFormat: localStorageService?.get(BrowserStorageItem.viewFormat) ?? defaultViewFormat,
    compressor: null,
  },
  addKey: {
    loading: false,
    error: '',
  },
  searchHistory: {
    data: null,
    loading: false
  }
}

export const initialKeyInfo = {
  ttl: -1,
  name: null,
  nameString: null,
  type: KeyTypes.String,
  size: 1,
  length: 0,
}

const getInitialSelectedKeyState = (state: KeysStore) =>
  ({ ...initialState.selectedKey, viewFormat: state.selectedKey.viewFormat })

// A slice for recipes
const keysSlice = createSlice({
  name: 'keys',
  initialState,
  reducers: {
    // load Keys
    loadKeys: (state) => {
      state.loading = true
      state.error = ''
    },
    loadKeysSuccess: (state, { payload: { data, isSearched, isFiltered } }) => {
      state.data = {
        ...data,
        previousResultCount: data.keys?.length,
      }
      state.loading = false
      state.isSearched = isSearched
      state.isFiltered = isFiltered
      state.data.lastRefreshTime = Date.now()
    },
    loadKeysFailure: (state, { payload }) => {
      state.loading = false
      state.error = payload
    },

    // load more Keys for infinity scroll
    loadMoreKeys: (state) => {
      state.loading = true
      state.error = ''
    },
    loadMoreKeysSuccess: (state, { payload: { total, scanned, nextCursor, keys, shardsMeta } }) => {
      state.data.keys = keys
      state.data.total = total
      state.data.scanned = scanned
      state.data.nextCursor = nextCursor
      state.data.shardsMeta = shardsMeta
      state.data.previousResultCount = keys.length

      state.loading = false
    },
    loadMoreKeysFailure: (state, { payload }) => {
      state.loading = false
      state.error = payload
    },

    setLastBatchPatternKeys: (state, { payload }) => {
      const newKeys = state.data.keys
      newKeys.splice(-payload.length, payload.length, ...payload)
      state.data.keys = newKeys
    },

    loadKeyInfoSuccess: (state, { payload }) => {
      state.selectedKey = {
        ...state.selectedKey,
        loading: false,
        isRefreshDisabled: false,
        data: {
          ...payload,
          nameString: bufferToString(payload.name),
        },
      }
    },
    refreshKeyInfo: (state) => {
      state.selectedKey = {
        ...state.selectedKey,
        refreshing: true,
      }
    },
    refreshKeyInfoSuccess: (state, { payload }) => {
      state.selectedKey = {
        ...state.selectedKey,
        data: { ...state.selectedKey.data, ...payload },
        refreshing: false,
      }
    },
    refreshKeyInfoFail: (state) => {
      state.selectedKey = {
        ...state.selectedKey,
        refreshing: false,
      }
    },
    updateSelectedKeyRefreshTime: (state, { payload }) => {
      state.selectedKey.lastRefreshTime = payload
    },
    // delete selected Key
    deleteSelectedKey: (state) => {
      state.selectedKey = {
        ...state.selectedKey,
        loading: true,
        error: '',
      }
    },
    deleteSelectedKeySuccess: (state) => {
      state.selectedKey = {
        ...state.selectedKey,
        loading: false,
        data: null,
      }
    },
    deleteSelectedKeyFailure: (state, { payload }) => {
      state.selectedKey = {
        ...state.selectedKey,
        loading: false,
        error: payload,
      }
    },
    // delete Key
    deleteKey: (state) => {
      state.deleting = true
    },
    deleteKeySuccess: (state) => {
      state.deleting = false
    },
    deleteKeyFailure: (state) => {
      state.deleting = false
    },
    deletePatternKeyFromList: (state, { payload }) => {
      remove(state.data?.keys, (key) => isEqualBuffers(key.name, payload))

      state.data = {
        ...state.data,
        total: state.data.total - 1,
        scanned: state.data.scanned - 1,
      }
    },

    // edit TTL or Key actions
    defaultSelectedKeyAction: (state) => {
      state.selectedKey = {
        ...state.selectedKey,
        loading: true,
        error: '',
      }
    },
    defaultSelectedKeyActionSuccess: (state) => {
      state.selectedKey = {
        ...state.selectedKey,
        loading: false,
        // data: null,
      }
    },
    defaultSelectedKeyActionFailure: (state, { payload }) => {
      state.selectedKey = {
        ...state.selectedKey,
        loading: false,
        error: payload,
      }
    },
    editPatternKeyFromList: (state, { payload }) => {
      const keys = state.data.keys.map((key) => {
        if (isEqualBuffers(key.name, payload?.key)) {
          key.name = payload?.newKey
          key.nameString = bufferToString(payload?.newKey)
        }
        return key
      })

      state.data = {
        ...state.data,
        keys,
      }
    },

    editPatternKeyTTLFromList: (state, { payload: [key, ttl] }: PayloadAction<[RedisResponseBuffer, number]>) => {
      const keys = state.data.keys.map((keyData) => {
        if (isEqualBuffers(keyData.name, key)) {
          keyData.ttl = ttl
        }
        return keyData
      })

      state.data = {
        ...state.data,
        keys,
      }
    },

    // update length for Selected Key
    updateSelectedKeyLength: (state, { payload }) => {
      state.selectedKey = {
        ...state.selectedKey,
        data: {
          ...state.selectedKey.data,
          length: payload,
        },
      }
    },

    // Add Key
    addKey: (state) => {
      state.addKey = {
        ...state.addKey,
        loading: true,
        error: '',
      }
    },
    addKeySuccess: (state) => {
      state.addKey = {
        ...state.addKey,
        loading: false,
        error: '',
      }
    },
    updateKeyList: (state, { payload }) => {
      state.data?.keys.unshift({ name: payload.keyName })

      state.data = {
        ...state.data,
        total: state.data.total + 1,
        scanned: state.data.scanned + 1,
      }
    },
    addKeyFailure: (state, { payload }) => {
      state.addKey = {
        ...state.addKey,
        loading: false,
        error: payload,
      }
    },

    setPatternSearchMatch: (state, { payload }) => {
      state.search = payload
    },
    setFilter: (state, { payload }) => {
      state.filter = payload
    },

    changeKeyViewType: (state, { payload }:{ payload: KeyViewType }) => {
      state.viewType = payload
      localStorageService?.set(BrowserStorageItem.browserViewType, payload)
    },

    changeSearchMode: (state, { payload }:{ payload: SearchMode }) => {
      state.searchMode = payload
    },

    resetAddKey: (state) => {
      state.addKey = cloneDeep(initialState.addKey)
    },

    resetKeyInfo: (state) => {
      state.selectedKey = cloneDeep(getInitialSelectedKeyState(state as KeysStore))
    },

    // reset keys for keys slice
    resetKeys: (state) => cloneDeep(
      {
        ...initialState,
        viewType: localStorageService?.get(BrowserStorageItem.browserViewType) ?? KeyViewType.Browser,
        searchMode: localStorageService?.get(BrowserStorageItem.browserSearchMode) ?? SearchMode.Pattern,
        selectedKey: getInitialSelectedKeyState(state as KeysStore)
      }
    ),

    resetPatternKeysData: (state) => {
      // state.data.keys = []
      state.data.total = 0
      state.data.scanned = 0
      state.data.keys.length = 0
    },

    toggleBrowserFullScreen: (state, { payload }: { payload: Maybe<boolean> }) => {
      if (!isUndefined(payload)) {
        state.isBrowserFullScreen = payload
        return
      }
      state.isBrowserFullScreen = !state.isBrowserFullScreen
    },

    setViewFormat: (state, { payload }: PayloadAction<KeyValueFormat>) => {
      state.selectedKey.viewFormat = payload
      localStorageService?.set(BrowserStorageItem.viewFormat, payload)
    },
    loadSearchHistory: (state) => {
      state.searchHistory.loading = true
    },
    loadSearchHistorySuccess: (state, { payload }: PayloadAction<SearchHistoryItem[]>) => {
      state.searchHistory.loading = false
      state.searchHistory.data = payload
    },
    loadSearchHistoryFailure: (state) => {
      state.searchHistory.loading = false
    },
    deleteSearchHistory: (state) => {
      state.searchHistory.loading = true
    },
    deleteSearchHistorySuccess: (state, { payload }: { payload: string[] }) => {
      state.searchHistory.loading = false
      if (state.searchHistory.data) {
        remove(state.searchHistory.data, (item) => payload.includes(item.id))
      }
    },
    deleteSearchHistoryFailure: (state) => {
      state.searchHistory.loading = false
    },
    setSelectedKeyRefreshDisabled: (state, { payload }: PayloadAction<boolean>) => {
      state.selectedKey.isRefreshDisabled = payload
    }
  },
})

// Actions generated from the slice
export const {
  loadKeys,
  loadKeysSuccess,
  loadKeysFailure,
  loadMoreKeys,
  loadMoreKeysSuccess,
  loadMoreKeysFailure,
  loadKeyInfoSuccess,
  updateSelectedKeyRefreshTime,
  refreshKeyInfo,
  refreshKeyInfoSuccess,
  refreshKeyInfoFail,
  defaultSelectedKeyAction,
  defaultSelectedKeyActionSuccess,
  defaultSelectedKeyActionFailure,
  setLastBatchPatternKeys,
  addKey,
  updateKeyList,
  addKeyFailure,
  addKeySuccess,
  resetAddKey,
  deleteSelectedKey,
  deleteSelectedKeySuccess,
  deleteSelectedKeyFailure,
  deletePatternKeyFromList,
  deleteKey,
  deleteKeySuccess,
  deleteKeyFailure,
  editPatternKeyFromList,
  editPatternKeyTTLFromList,
  setPatternSearchMatch,
  setFilter,
  changeKeyViewType,
  resetKeyInfo,
  resetKeys,
  resetPatternKeysData,
  toggleBrowserFullScreen,
  setViewFormat,
  changeSearchMode,
  loadSearchHistory,
  loadSearchHistorySuccess,
  loadSearchHistoryFailure,
  deleteSearchHistory,
  deleteSearchHistorySuccess,
  deleteSearchHistoryFailure,
  setSelectedKeyRefreshDisabled,
} = keysSlice.actions

// A selector
export const keysSelector = (state: RootState) => state.browser.keys
export const keysDataSelector = (state: RootState) => state.browser.keys.data
export const selectedKeySelector = (state: RootState) => state.browser.keys?.selectedKey
export const selectedKeyDataSelector = (state: RootState) => state.browser.keys?.selectedKey?.data
export const addKeyStateSelector = (state: RootState) => state.browser.keys?.addKey
export const keysSearchHistorySelector = (state: RootState) => state.browser.keys.searchHistory

// The reducer
export default keysSlice.reducer

// eslint-disable-next-line import/no-mutable-exports
export let sourceKeysFetch: Nullable<CancelTokenSource> = null

export function setInitialStateByType(type: string) {
  return (dispatch: AppDispatch) => {
    if (type === KeyTypes.Hash) {
      dispatch(setHashInitialState())
    }
    if (type === KeyTypes.List) {
      dispatch(setListInitialState())
    }
    if (type === KeyTypes.ZSet) {
      dispatch(setZsetInitialState())
    }
    if (type === KeyTypes.Stream) {
      dispatch(setStreamInitialState())
    }
  }
}
// Asynchronous thunk action
export function fetchPatternKeysAction(
  scanThreshold: number,
  cursor: string,
  count: number,
  telemetryProperties: { [key: string]: any } = {},
  onSuccess?: (data: GetKeysWithDetailsResponse[]) => void,
  onFailed?: () => void
) {
  return async (dispatch: AppDispatch, stateInit: () => RootState) => {
    dispatch(loadKeys())

    try {
      sourceKeysFetch?.cancel?.()

      const { CancelToken } = axios
      sourceKeysFetch = CancelToken.source()

      const state = stateInit()
      const { search: match, filter: type } = state.browser.keys
      const { encoding } = state.app.info

      const { data, status } = await apiService.post<GetKeysWithDetailsResponse[]>(
        getUrl(
          state.connections.instances?.connectedInstance?.id ?? '',
          ApiEndpoints.KEYS
        ),
        {
          cursor, count, type, match: match || DEFAULT_SEARCH_MATCH, keysInfo: false, scanThreshold
        },
        {
          params: { encoding },
          cancelToken: sourceKeysFetch.token,
        },
      )

      sourceKeysFetch = null
      if (isStatusSuccessful(status)) {
        dispatch(
          loadKeysSuccess({
            data: parseKeysListResponse({}, data),
            isSearched: !!match,
            isFiltered: !!type,
          })
        )
        if (!!type || !!match) {
          let matchValue = '*'
          if (match !== '*' && !!match) {
            matchValue = getMatchType(match)
          }
          sendEventTelemetry({
            event: getBasedOnViewTypeEvent(
              localStorageService?.get(BrowserStorageItem.browserViewType),
              TelemetryEvent.BROWSER_KEYS_SCANNED_WITH_FILTER_ENABLED,
              TelemetryEvent.TREE_VIEW_KEYS_SCANNED_WITH_FILTER_ENABLED
            ),
            eventData: {
              databaseId: state.connections.instances?.connectedInstance?.id,
              keyType: type,
              match: matchValue,
              databaseSize: data[0].total,
              numberOfKeysScanned: data[0].scanned,
              scanCount: count,
              source: telemetryProperties.source ?? 'manual',
              ...telemetryProperties,
            }
          })
        }
        onSuccess?.(data)
      }
    } catch (error) {
      if (!axios.isCancel(error)) {
        const errorMessage = getApiErrorMessage(error)
        dispatch(addErrorNotification(error))
        dispatch(loadKeysFailure(errorMessage))
        onFailed?.()
      }
    }
  }
}

// Asynchronous thunk action
export function fetchMorePatternKeysAction(oldKeys: IKeyPropTypes[] = [], cursor: string, count: number) {
  return async (dispatch: AppDispatch, stateInit: () => RootState) => {
    dispatch(loadMoreKeys())

    try {
      sourceKeysFetch?.cancel?.()

      const { CancelToken } = axios
      sourceKeysFetch = CancelToken.source()

      const state = stateInit()
      const scanThreshold = state.user.settings.config?.scanThreshold ?? SCAN_COUNT_DEFAULT;
      const { search: match, filter: type } = state.browser.keys
      const { encoding } = state.app.info
      const { data, status } = await apiService.post(
        getUrl(
          state.connections.instances?.connectedInstance?.id ?? '',
          ApiEndpoints.KEYS
        ),
        {
          cursor, count, type, match: match || DEFAULT_SEARCH_MATCH, keysInfo: false, scanThreshold
        },
        {
          params: { encoding },
          cancelToken: sourceKeysFetch.token,
        },
      )

      sourceKeysFetch = null
      if (isStatusSuccessful(status)) {
        const newKeysData = parseKeysListResponse(state.browser.keys.data.shardsMeta, data)
        dispatch(loadMoreKeysSuccess({
          ...newKeysData,
          keys: oldKeys.concat(newKeysData.keys)
        }))
        sendEventTelemetry({
          event: getBasedOnViewTypeEvent(
            state.browser.keys?.viewType,
            TelemetryEvent.BROWSER_KEYS_ADDITIONALLY_SCANNED,
            TelemetryEvent.TREE_VIEW_KEYS_ADDITIONALLY_SCANNED
          ),
          eventData: {
            databaseId: state.connections.instances?.connectedInstance?.id,
            databaseSize: data[0].total,
            numberOfKeysScanned: state.browser.keys.data.scanned + data[0].scanned,
            scanCount: count,
          }
        })
      }
    } catch (error) {
      if (!axios.isCancel(error)) {
        const errorMessage = getApiErrorMessage(error)
        dispatch(addErrorNotification(error))
        dispatch(loadMoreKeysFailure(errorMessage))
      }
    }
  }
}

// Asynchronous thunk action
export function fetchKeyInfo(key: RedisResponseBuffer, resetData?: boolean) {
  return async (dispatch: AppDispatch, stateInit: () => RootState) => {
    dispatch(defaultSelectedKeyAction())

    try {
      const state = stateInit()
      const { encoding } = state.app.info
      const { data, status } = await apiService.post(
        getUrl(
          state.connections.instances?.connectedInstance?.id ?? '',
          ApiEndpoints.KEY_INFO
        ),
        { keyName: key },
        { params: { encoding } }
      )

      if (isStatusSuccessful(status)) {
        dispatch(loadKeyInfoSuccess(data))
        dispatch(updateSelectedKeyRefreshTime(Date.now()))
      }

      if (data.type === KeyTypes.Hash) {
        dispatch<any>(fetchHashFields(key, 0, SCAN_COUNT_DEFAULT, '*', resetData))
      }
      if (data.type === KeyTypes.List) {
        dispatch<any>(fetchListElements(key, 0, SCAN_COUNT_DEFAULT, resetData))
      }
      if (data.type === KeyTypes.String) {
        dispatch<any>(fetchString(key, {
          resetData,
          end: STRING_MAX_LENGTH
        }))
      }
      if (data.type === KeyTypes.ZSet) {
        dispatch<any>(
          fetchZSetMembers(key, 0, SCAN_COUNT_DEFAULT, SortOrder.ASC, resetData)
        )
      }
      if (data.type === KeyTypes.Set) {
        dispatch<any>(fetchSetMembers(key, 0, SCAN_COUNT_DEFAULT, '*', resetData))
      }
      if (data.type === KeyTypes.ReJSON) {
        dispatch<any>(fetchReJSON(key, '.', data.length, resetData))
      }
      if (data.type === KeyTypes.Stream) {
        const { viewType } = state.browser.stream

        if (viewType === StreamViewType.Data) {
          dispatch<any>(fetchStreamEntries(
            key,
            SCAN_COUNT_DEFAULT,
            SortOrder.DESC,
            resetData
          ))
        }
      }
    } catch (_err) {
      const error = _err as AxiosError
      const errorMessage = getApiErrorMessage(error)
      dispatch(addErrorNotification(error))
      dispatch(defaultSelectedKeyActionFailure(errorMessage))
    }
  }
}

// Asynchronous thunk action
export function refreshKeyInfoAction(key: RedisResponseBuffer) {
  return async (dispatch: AppDispatch, stateInit: () => RootState) => {
    dispatch(refreshKeyInfo())
    try {
      const state = stateInit()
      const { encoding } = state.app.info
      const { data, status } = await apiService.post(
        getUrl(
          state.connections.instances?.connectedInstance?.id ?? '',
          ApiEndpoints.KEY_INFO
        ),
        { keyName: key },
        { params: { encoding } }
      )
      if (isStatusSuccessful(status)) {
        dispatch(refreshKeyInfoSuccess(data))
        dispatch(updateSelectedKeyRefreshTime(Date.now()))
      }
    } catch (error) {
      dispatch(refreshKeyInfoFail())
      dispatch(addErrorNotification(error))
      if (isStatusNotFoundError(get(error, ['response', 'status']))) {
        dispatch(resetKeyInfo())
        dispatch(deleteKeyFromList(key))
      }
    }
  }
}

function addTypedKey(
  data: any,
  keyType: KeyTypes,
  onSuccessAction?: () => void,
  onFailAction?: () => void
) {
  return async (dispatch: AppDispatch, stateInit: () => RootState) => {
    dispatch(addKey())
    const endpoint = ENDPOINT_BASED_ON_KEY_TYPE[keyType as EndpointBasedOnKeyType]

    try {
      const state = stateInit()
      const { encoding } = state.app.info
      const { status } = await apiService.post(
        getUrl(state.connections.instances?.connectedInstance?.id ?? '', endpoint),
        data,
        { params: { encoding } },
      )
      if (isStatusSuccessful(status)) {
        const additionalData = getAdditionalAddedEventData(endpoint, data)
        if (onSuccessAction) {
          onSuccessAction()
        }
        dispatch(addKeySuccess())
        dispatch<any>(addKeyIntoList({ key: data.keyName, keyType }))
        dispatch(
          addMessageNotification(successMessages.ADDED_NEW_KEY(data.keyName))
        )
        sendEventTelemetry({
          event: getBasedOnViewTypeEvent(
            state.browser.keys?.viewType,
            TelemetryEvent.BROWSER_KEY_ADDED,
            TelemetryEvent.TREE_VIEW_KEY_ADDED
          ),
          eventData: {
            databaseId: state.connections.instances?.connectedInstance?.id,
            ...additionalData
          }
        })
      }
    } catch (error) {
      if (onFailAction) {
        onFailAction()
      }
      const errorMessage = getApiErrorMessage(error)
      dispatch(addErrorNotification(error))
      dispatch(addKeyFailure(errorMessage))
    }
  }
}

// Asynchronous thunk action
export function addHashKey(
  data: CreateHashWithExpireDto,
  onSuccessAction?: () => void,
  onFailAction?: () => void
) {
  return addTypedKey(data, KeyTypes.Hash, onSuccessAction, onFailAction)
}

// Asynchronous thunk action
export function addZsetKey(
  data: CreateZSetWithExpireDto,
  onSuccessAction?: () => void,
  onFailAction?: () => void
) {
  return addTypedKey(data, KeyTypes.ZSet, onSuccessAction, onFailAction)
}

// Asynchronous thunk action
export function addSetKey(
  data: CreateSetWithExpireDto,
  onSuccessAction?: () => void,
  onFailAction?: () => void
) {
  return addTypedKey(data, KeyTypes.Set, onSuccessAction, onFailAction)
}

// Asynchronous thunk action
export function addStringKey(
  data: SetStringWithExpireDto,
  onSuccessAction?: () => void,
  onFailAction?: () => void
) {
  return addTypedKey(data, KeyTypes.String, onSuccessAction, onFailAction)
}

// Asynchronous thunk action
export function addListKey(
  data: CreateListWithExpireDto,
  onSuccessAction?: () => void,
  onFailAction?: () => void
) {
  return addTypedKey(data, KeyTypes.List, onSuccessAction, onFailAction)
}

// Asynchronous thunk action
export function addReJSONKey(
  data: CreateRejsonRlWithExpireDto,
  onSuccessAction?: () => void,
  onFailAction?: () => void
) {
  return addTypedKey(data, KeyTypes.ReJSON, onSuccessAction, onFailAction)
}

// Asynchronous thunk action
export function addStreamKey(
  data: CreateStreamDto,
  onSuccessAction?: () => void,
  onFailAction?: () => void
) {
  return addTypedKey(data, KeyTypes.Stream, onSuccessAction, onFailAction)
}

// Asynchronous thunk action
export function deleteSelectedKeyAction(
  key: RedisResponseBuffer,
  onSuccessAction?: () => void
) {
  return async (dispatch: AppDispatch, stateInit: () => RootState) => {
    dispatch(deleteSelectedKey())

    try {
      const state = stateInit()
      const { encoding } = state.app.info
      const { status } = await apiService.delete(
        getUrl(
          state.connections.instances?.connectedInstance?.id ?? '',
          ApiEndpoints.KEYS
        ),
        {
          data: { keyNames: [key] },
          params: { encoding },
        }
      )

      if (isStatusSuccessful(status)) {
        dispatch(deleteSelectedKeySuccess())
        dispatch<any>(deleteKeyFromList(key))
        onSuccessAction?.()
        dispatch(addMessageNotification(successMessages.DELETED_KEY(key)))
      }
    } catch (error) {
      const errorMessage = getApiErrorMessage(error as AxiosError)
      dispatch(addErrorNotification(error as AxiosError))
      dispatch(deleteSelectedKeyFailure(errorMessage))
    }
  }
}

// Asynchronous thunk action
export function deleteKeyAction(
  key: RedisResponseBuffer,
  onSuccessAction?: () => void
) {
  return async (dispatch: AppDispatch, stateInit: () => RootState) => {
    dispatch(deleteKey())
    try {
      const state = stateInit()
      const { encoding } = state.app.info
      const { status } = await apiService.delete(
        getUrl(
          state.connections.instances?.connectedInstance?.id ?? '',
          ApiEndpoints.KEYS
        ),
        {
          data: { keyNames: [key] },
          params: { encoding },
        }
      )

      if (isStatusSuccessful(status)) {
        dispatch(deleteKeySuccess())
        dispatch<any>(deleteKeyFromList(key))
        onSuccessAction?.()
        dispatch(addMessageNotification(successMessages.DELETED_KEY(key)))
      }
    } catch (error) {
      dispatch(addErrorNotification(error as AxiosError))
      dispatch(deleteKeyFailure())
    }
  }
}

// Asynchronous thunk action
export function editKey(
  key: RedisResponseBuffer,
  newKey: RedisResponseBuffer,
  onSuccess?: () => void,
  onFailure?: () => void
) {
  return async (dispatch: AppDispatch, stateInit: () => RootState) => {
    dispatch(defaultSelectedKeyAction())

    try {
      const state = stateInit()
      const { encoding } = state.app.info
      const { status } = await apiService.patch(
        getUrl(
          state.connections.instances?.connectedInstance?.id ?? '',
          ApiEndpoints.KEY_NAME
        ),
        { keyName: key, newKeyName: newKey },
        { params: { encoding } },
      )

      if (isStatusSuccessful(status)) {
        dispatch<any>(editKeyFromList({ key, newKey }))
        onSuccess?.()
      }
    } catch (error) {
      const errorMessage = getApiErrorMessage(error)
      dispatch(addErrorNotification(error))
      dispatch(defaultSelectedKeyActionFailure(errorMessage))
      onFailure?.()
    }
  }
}

// Asynchronous thunk action
export function editKeyTTL(key: RedisResponseBuffer, ttl: number) {
  return async (dispatch: AppDispatch, stateInit: () => RootState) => {
    dispatch(defaultSelectedKeyAction())

    try {
      const state = stateInit()
      const { encoding } = state.app.info
      const { status } = await apiService.patch(
        getUrl(
          state.connections.instances?.connectedInstance?.id ?? '',
          ApiEndpoints.KEY_TTL
        ),
        { keyName: key, ttl },
        { params: { encoding } }
      )
      if (isStatusSuccessful(status)) {
        sendEventTelemetry({
          event: getBasedOnViewTypeEvent(
            state.browser.keys?.viewType,
            TelemetryEvent.BROWSER_KEY_TTL_CHANGED,
            TelemetryEvent.TREE_VIEW_KEY_TTL_CHANGED
          ),
          eventData: {
            databaseId: state.connections.instances?.connectedInstance?.id,
            ttl: ttl >= 0 ? ttl : -1,
            previousTTL: state.browser.keys.selectedKey?.data?.ttl,
          }
        })
        if (ttl !== 0) {
          dispatch<any>(editKeyTTLFromList([key, ttl]))
          dispatch<any>(fetchKeyInfo(key))
        } else {
          dispatch(deleteSelectedKeySuccess())
          dispatch<any>(deleteKeyFromList(key))
        }
        dispatch(defaultSelectedKeyActionSuccess())
      }
    } catch (error) {
      const errorMessage = getApiErrorMessage(error)
      dispatch(addErrorNotification(error))
      dispatch(defaultSelectedKeyActionFailure(errorMessage))
    }
  }
}

// Asynchronous thunk action
export function fetchKeysMetadata(
  keys: RedisString[],
  filter: Nullable<KeyTypes>,
  signal?: AbortSignal,
  onSuccessAction?: (data: GetKeyInfoResponse[]) => void,
  onFailAction?: () => void
) {
  return async (_dispatch: AppDispatch, stateInit: () => RootState) => {
    try {
      const state = stateInit()
      const { data } = await apiService.post<GetKeyInfoResponse[]>(
        getUrl(
          state.connections.instances?.connectedInstance?.id,
          ApiEndpoints.KEYS_METADATA
        ),
        { keys, type: filter || undefined },
        { params: { encoding: state.app.info.encoding }, signal }
      )

      onSuccessAction?.(data)
    } catch (_err) {
      if (!axios.isCancel(_err)) {
        const error = _err as AxiosError
        onFailAction?.()
        console.error(error)
      }
    }
  }
}

// Asynchronous thunk action
export function fetchKeysMetadataTree(
  keys: RedisString[],
  filter: Nullable<KeyTypes>,
  signal?: AbortSignal,
  onSuccessAction?: (data: GetKeyInfoResponse[]) => void,
  onFailAction?: () => void
) {
  return async (_dispatch: AppDispatch, stateInit: () => RootState) => {
    try {
      const state = stateInit()
      const { data } = await apiService.post<GetKeyInfoResponse[]>(
        getUrl(
          state.connections.instances?.connectedInstance?.id,
          ApiEndpoints.KEYS_METADATA
        ),
        { keys: keys.map(([,nameBuffer]) => nameBuffer), type: filter || undefined },
        { params: { encoding: state.app.info.encoding }, signal }
      )

      const newData = data.map((key, i) => ({ ...key, path: keys[i][0] }))

      onSuccessAction?.(newData)
    } catch (_err) {
      if (!axios.isCancel(_err)) {
        const error = _err as AxiosError
        onFailAction?.()
        console.error(error)
      }
    }
  }
}

export function fetchPatternHistoryAction(
  onSuccess?: () => void,
  onFailed?: () => void,
) {
  return async (dispatch: AppDispatch, stateInit: () => RootState) => {
    dispatch(loadSearchHistory())

    try {
      const state = stateInit()
      const { data, status } = await apiService.get<SearchHistoryItem[]>(
        getUrl(
          state.connections.instances.connectedInstance?.id,
          ApiEndpoints.HISTORY
        ),
        {
          params: {
            mode: SearchHistoryMode.Pattern
          }
        }
      )

      if (isStatusSuccessful(status)) {
        dispatch(loadSearchHistorySuccess(data))
        onSuccess?.()
      }
    } catch (_err) {
      dispatch(loadSearchHistoryFailure())
      onFailed?.()
    }
  }
}

export function deletePatternHistoryAction(
  ids: string[],
  onSuccess?: () => void,
  onFailed?: () => void,
) {
  return async (dispatch: AppDispatch, stateInit: () => RootState) => {
    dispatch(deleteSearchHistory())

    try {
      const state = stateInit()
      const { status } = await apiService.delete(
        getUrl(
          state.connections.instances.connectedInstance?.id,
          ApiEndpoints.HISTORY
        ),
        {
          data: {
            ids
          },
          params: {
            mode: SearchHistoryMode.Pattern
          }
        }
      )

      if (isStatusSuccessful(status)) {
        dispatch(deleteSearchHistorySuccess(ids))
        onSuccess?.()
      }
    } catch (_err) {
      dispatch(deleteSearchHistoryFailure())
      onFailed?.()
    }
  }
}

export function fetchSearchHistoryAction(
  searchMode: SearchMode,
  onSuccess?: () => void,
  onFailed?: () => void,
) {
  return async (dispatch: AppDispatch) => (searchMode === SearchMode.Pattern
    ? dispatch<any>(fetchPatternHistoryAction(onSuccess, onFailed))
    : dispatch<any>(fetchRedisearchHistoryAction(onSuccess, onFailed)))
}

export function deleteSearchHistoryAction(
  searchMode: SearchMode,
  ids: string[],
  onSuccess?: () => void,
  onFailed?: () => void,
) {
  return async (dispatch: AppDispatch) => (searchMode === SearchMode.Pattern
    ? dispatch<any>(deletePatternHistoryAction(ids, onSuccess, onFailed))
    : dispatch<any>(deleteRedisearchHistoryAction(ids, onSuccess, onFailed)))
}

// Asynchronous thunk action
export function fetchKeys(
  options: {
    searchMode: SearchMode,
    cursor: string,
    count: number,
    telemetryProperties?: {},
  },
  onSuccess?: (data: GetKeysWithDetailsResponse[] | GetKeysWithDetailsResponse) => void,
  onFailed?: () => void,
) {
  return async (dispatch: AppDispatch, stateInit: () => RootState) => {
    const state = stateInit()
    const scanThreshold  = state.user.settings.config?.scanThreshold || SCAN_COUNT_DEFAULT;
    const isRedisearchExists = isRedisearchAvailable(state.connections.instances.connectedInstance.modules)
    const { searchMode, count, cursor, telemetryProperties } = options

    return searchMode === SearchMode.Pattern || !isRedisearchExists
      ? dispatch<any>(fetchPatternKeysAction(scanThreshold, cursor, count, telemetryProperties, onSuccess, onFailed))
      : dispatch<any>(fetchRedisearchKeysAction(cursor, count, telemetryProperties, onSuccess, onFailed))
  }
}

// Asynchronous thunk action
export function fetchMoreKeys(
  searchMode: SearchMode,
  oldKeys: IKeyPropTypes[] = [],
  cursor: string,
  count: number,
) {
  return searchMode === SearchMode.Pattern
    ? fetchMorePatternKeysAction(oldKeys, cursor, count)
    : fetchMoreRedisearchKeysAction(oldKeys, cursor, count)
}

export function setLastBatchKeys(keys: GetKeyInfoResponse[], searchMode: SearchMode) {
  return searchMode === SearchMode.Pattern
    ? setLastBatchPatternKeys(keys)
    : setLastBatchRedisearchKeys(keys)
}

export function setSearchMatch(query: string, searchMode: SearchMode) {
  return searchMode === SearchMode.Pattern
    ? setPatternSearchMatch(query)
    : setQueryRedisearch(query)
}

export function resetKeysData(searchMode: SearchMode) {
  return searchMode === SearchMode.Pattern
    ? resetPatternKeysData()
    : resetRedisearchKeysData()
}

export function deleteKeyFromList(key: RedisResponseBuffer) {
  return async (dispatch: AppDispatch, stateInit: () => RootState) => {
    const state = stateInit()

    return state.browser.keys?.searchMode === SearchMode.Pattern
      ? dispatch(deletePatternKeyFromList(key))
      : dispatch(deleteRedisearchKeyFromList(key))
  }
}

export function editKeyFromList(data: { key: RedisResponseBuffer, newKey: RedisResponseBuffer }) {
  return async (dispatch: AppDispatch, stateInit: () => RootState) => {
    const state = stateInit()

    return state.browser.keys?.searchMode === SearchMode.Pattern
      ? dispatch(editPatternKeyFromList(data))
      : dispatch(editRedisearchKeyFromList(data))
  }
}

export function addKeyIntoList({ key, keyType }: { key: RedisString, keyType: KeyTypes }) {
  return async (dispatch: AppDispatch, stateInit: () => RootState) => {
    const state = stateInit()
    const { viewType, filter, search } = state.browser.keys

    if (search && search !== '*') {
      return null
    }

    if (!filter || filter === keyType) {
      if (viewType !== KeyViewType.Tree) {
        dispatch(resetBrowserTree())
      }
      return dispatch(updateKeyList({ keyName: key, keyType }))
    }
    return null
  }
}

export function editKeyTTLFromList(data: [RedisResponseBuffer, number]) {
  return async (dispatch: AppDispatch, stateInit: () => RootState) => {
    const state = stateInit()

    return state.browser.keys?.searchMode === SearchMode.Pattern
      ? dispatch(editPatternKeyTTLFromList(data))
      : dispatch(editRedisearchKeyTTLFromList(data))
  }
}

export function refreshKey(
  key: RedisResponseBuffer,
  type: KeyTypes | ModulesKeyTypes,
  args?: IFetchKeyArgs,
  length?: number
) {
  return async (dispatch: AppDispatch) => {
    const resetData = false
    dispatch(refreshKeyInfoAction(key))
    switch (type) {
      case KeyTypes.Hash: {
        dispatch(refreshHashFieldsAction(key, resetData))
        break
      }
      case KeyTypes.ZSet: {
        dispatch(refreshZsetMembersAction(key, resetData))
        break
      }
      case KeyTypes.Set: {
        dispatch(refreshSetMembersAction(key, resetData))
        break
      }
      case KeyTypes.List: {
        dispatch(refreshListElementsAction(key, resetData))
        break
      }
      case KeyTypes.String: {
        dispatch(fetchString(key, { resetData, end: args?.end || STRING_MAX_LENGTH }))
        break
      }
      case KeyTypes.ReJSON: {
        dispatch(fetchReJSON(key, '.', length, true))
        break
      }
      case KeyTypes.Stream: {
        dispatch(refreshStream(key, resetData))
        break
      }
      default:
        dispatch(fetchKeyInfo(key, resetData))
    }
  }
}
