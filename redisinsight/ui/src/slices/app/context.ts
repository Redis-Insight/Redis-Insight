import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { RelativeWidthSizes } from 'uiSrc/components/virtual-table/interfaces'
import { CapabilityStorageItem, ConfigDBStorageItem } from 'uiSrc/constants/storage'
import { Maybe, Nullable } from 'uiSrc/utils'
import {
  BrowserStorageItem,
  DEFAULT_DELIMITER,
  DEFAULT_SHOW_HIDDEN_RECOMMENDATIONS,
  DEFAULT_SLOWLOG_DURATION_UNIT,
  DEFAULT_TREE_SORTING,
  KeyTypes, Pages,
  SortOrder,
} from 'uiSrc/constants'
import { localStorageService, setCapabilityStorageField, setDBConfigStorageField } from 'uiSrc/services'
import { clearExpertChatHistory } from 'uiSrc/slices/panels/aiAssistant'
import { resetKeys, resetPatternKeysData } from 'uiSrc/slices/browser/keys'
import { setMonitorInitialState } from 'uiSrc/slices/cli/monitor'
import { setInitialPubSubState } from 'uiSrc/slices/pubsub/pubsub'
import { resetBulkActions } from 'uiSrc/slices/browser/bulkActions'
import { resetCliHelperSettings } from 'uiSrc/slices/cli/cli-settings'
import { resetRedisearchKeysData, setRedisearchInitialState } from 'uiSrc/slices/browser/redisearch'
import { setClusterDetailsInitialState } from 'uiSrc/slices/analytics/clusterDetails'
import { setDatabaseAnalysisInitialState } from 'uiSrc/slices/analytics/dbAnalysis'
import { setInitialAnalyticsSettings } from 'uiSrc/slices/analytics/settings'
import { setInitialRecommendationsState } from 'uiSrc/slices/recommendations/recommendations'
import { setPipelineInitialState } from 'uiSrc/slices/rdi/pipeline'
import { resetOutput } from 'uiSrc/slices/cli/cli-output'
import { SearchMode } from '../interfaces/keys'
import { AppWorkspace, RedisResponseBuffer, StateAppContext } from '../interfaces'
import { AppDispatch, RootState } from '../store'

export const initialState: StateAppContext = {
  workspace: localStorageService.get(BrowserStorageItem.homePage) === Pages.rdi
    ? AppWorkspace.RDI
    : AppWorkspace.Databases,
  contextInstanceId: '',
  contextRdiInstanceId: '',
  lastBrowserPage: '',
  dbConfig: {
    treeViewDelimiter: DEFAULT_DELIMITER,
    treeViewSort: DEFAULT_TREE_SORTING,
    slowLogDurationUnit: DEFAULT_SLOWLOG_DURATION_UNIT,
    showHiddenRecommendations: DEFAULT_SHOW_HIDDEN_RECOMMENDATIONS,
  },
  dbIndex: {
    disabled: false
  },
  browser: {
    keyList: {
      isDataPatternLoaded: false,
      isDataRedisearchLoaded: false,
      scrollPatternTopPosition: 0,
      scrollRedisearchTopPosition: 0,
      isNotRendered: true,
      selectedKey: null,
    },
    panelSizes: {},
    tree: {
      delimiter: DEFAULT_DELIMITER,
      openNodes: {},
      selectedLeaf: null,
    },
    bulkActions: {
      opened: false,
    },
    keyDetailsSizes: {
      [KeyTypes.Hash]: localStorageService?.get(BrowserStorageItem.keyDetailSizes)?.hash ?? null,
      [KeyTypes.List]: localStorageService?.get(BrowserStorageItem.keyDetailSizes)?.list ?? null,
      [KeyTypes.ZSet]: localStorageService?.get(BrowserStorageItem.keyDetailSizes)?.zset ?? null,
    }
  },
  workbench: {
    script: '',
    panelSizes: {
      vertical: {}
    }
  },
  pubsub: {
    channel: '',
    message: ''
  },
  analytics: {
    lastViewedPage: ''
  },
  capability: {
    source: ''
  },
  pipelineManagement: {
    lastViewedPage: '',
    isOpenDialog: true,
  },
}

// A slice for recipes
const appContextSlice = createSlice({
  name: 'appContext',
  initialState,
  reducers: {
    // don't need to reset instanceId
    setAppContextInitialState: (state) => ({
      ...initialState,
      workspace: state.workspace,
      browser: {
        ...initialState.browser,
        keyDetailsSizes: state.browser.keyDetailsSizes
      },
      contextInstanceId: state.contextInstanceId,
      contextRdiInstanceId: state.contextRdiInstanceId,
      capability: state.capability,
      pipelineManagement: state.pipelineManagement,
    }),
    // set connected instance
    setAppContextConnectedInstanceId: (state, { payload }: { payload: string }) => {
      state.contextInstanceId = payload
    },
    // set connected rdi instance
    setAppContextConnectedRdiInstanceId: (state, { payload }: { payload: string }) => {
      state.contextRdiInstanceId = payload
    },
    setCurrentWorkspace: (state, { payload }: PayloadAction<Maybe<AppWorkspace>>) => {
      state.workspace = payload || AppWorkspace.Databases
    },
    setDbConfig: (state, { payload }) => {
      state.dbConfig.treeViewDelimiter = payload?.treeViewDelimiter ?? DEFAULT_DELIMITER
      state.dbConfig.treeViewSort = payload?.treeViewSort ?? DEFAULT_TREE_SORTING
      state.dbConfig.slowLogDurationUnit = payload?.slowLogDurationUnit ?? DEFAULT_SLOWLOG_DURATION_UNIT
      state.dbConfig.showHiddenRecommendations = payload?.showHiddenRecommendations
    },
    setSlowLogUnits: (state, { payload }) => {
      state.dbConfig.slowLogDurationUnit = payload
      setDBConfigStorageField(state.contextInstanceId, ConfigDBStorageItem.slowLogDurationUnit, payload)
    },
    setBrowserTreeDelimiter: (state, { payload }: { payload: string }) => {
      state.dbConfig.treeViewDelimiter = payload
      setDBConfigStorageField(state.contextInstanceId, BrowserStorageItem.treeViewDelimiter, payload)
    },
    setBrowserTreeSort: (state, { payload }: PayloadAction<SortOrder>) => {
      state.dbConfig.treeViewSort = payload
      setDBConfigStorageField(state.contextInstanceId, BrowserStorageItem.treeViewSort, payload)
    },
    setRecommendationsShowHidden: (state, { payload }: { payload: boolean }) => {
      state.dbConfig.showHiddenRecommendations = payload
      setDBConfigStorageField(state.contextInstanceId, BrowserStorageItem.showHiddenRecommendations, payload)
    },
    setBrowserSelectedKey: (state, { payload }: { payload: Nullable<RedisResponseBuffer> }) => {
      state.browser.keyList.selectedKey = payload
    },
    setBrowserPatternKeyListDataLoaded: (state, { payload }: { payload: boolean }) => {
      state.browser.keyList.isDataPatternLoaded = payload
    },
    setBrowserRedisearchKeyListDataLoaded: (state, { payload }: { payload: boolean }) => {
      state.browser.keyList.isDataRedisearchLoaded = payload
    },
    setBrowserPatternScrollPosition: (state, { payload }: { payload: number }) => {
      state.browser.keyList.scrollPatternTopPosition = payload
    },
    setBrowserRedisearchScrollPosition: (state, { payload }: { payload: number }) => {
      state.browser.keyList.scrollRedisearchTopPosition = payload
    },
    setBrowserIsNotRendered: (state, { payload }: { payload: boolean }) => {
      state.browser.keyList.isNotRendered = payload
    },
    clearBrowserKeyListData: (state) => {
      state.browser.keyList = {
        ...initialState.browser.keyList,
        selectedKey: state.browser.keyList.selectedKey
      }
    },
    setBrowserPanelSizes: (state, { payload }: { payload: any }) => {
      state.browser.panelSizes = payload
    },
    setBrowserTreeNodesOpen: (state, { payload }: { payload: { [key: string]: boolean; } }) => {
      state.browser.tree.openNodes = payload
    },
    setWorkbenchScript: (state, { payload }: { payload: string }) => {
      state.workbench.script = payload
    },
    setWorkbenchVerticalPanelSizes: (state, { payload }: { payload: any }) => {
      state.workbench.panelSizes.vertical = payload
    },
    setLastPageContext: (state, { payload }: { payload: string }) => {
      state.lastBrowserPage = payload
    },
    resetBrowserTree: (state) => {
      state.browser.tree.selectedLeaf = null
      state.browser.tree.openNodes = {}
    },
    setPubSubFieldsContext: (state, { payload }: { payload: { channel: string, message: string } }) => {
      state.pubsub.channel = payload.channel
      state.pubsub.message = payload.message
    },
    setBrowserBulkActionOpen: (state, { payload }: PayloadAction<boolean>) => {
      state.browser.bulkActions.opened = payload
    },
    setLastAnalyticsPage: (state, { payload }: { payload: string }) => {
      state.analytics.lastViewedPage = payload
    },
    updateKeyDetailsSizes: (
      state,
      { payload }: { payload: { type: KeyTypes, sizes: RelativeWidthSizes } }
    ) => {
      const { type, sizes } = payload
      state.browser.keyDetailsSizes[type] = sizes
      localStorageService?.set(BrowserStorageItem.keyDetailSizes, state.browser.keyDetailsSizes)
    },
    setDbIndexState: (state, { payload }: { payload: boolean }) => {
      state.dbIndex.disabled = payload
    },
    setCapability: (state, { payload }: PayloadAction<Maybe<{ source: string, tutorialPopoverShown: boolean }>>) => {
      const source = payload?.source ?? ''
      const tutorialPopoverShown = !!payload?.tutorialPopoverShown

      state.capability.source = source

      setCapabilityStorageField(CapabilityStorageItem.source, source)
      setCapabilityStorageField(CapabilityStorageItem.tutorialPopoverShown, tutorialPopoverShown)
    },
    setLastPipelineManagementPage: (state, { payload }: { payload: string }) => {
      state.pipelineManagement.lastViewedPage = payload
    },
    setPipelineDialogState: (state, { payload }: { payload: boolean }) => {
      state.pipelineManagement.isOpenDialog = payload
    },
    resetPipelineManagement: (state) => {
      state.pipelineManagement.lastViewedPage = ''
      state.pipelineManagement.isOpenDialog = true
    }
  },
})

// Actions generated from the slice
export const {
  setAppContextInitialState,
  setAppContextConnectedInstanceId,
  setAppContextConnectedRdiInstanceId,
  setCurrentWorkspace,
  setDbConfig,
  setSlowLogUnits,
  setBrowserPatternKeyListDataLoaded,
  setBrowserRedisearchKeyListDataLoaded,
  setBrowserSelectedKey,
  setBrowserPatternScrollPosition,
  setBrowserRedisearchScrollPosition,
  setBrowserIsNotRendered,
  setBrowserPanelSizes,
  setBrowserTreeNodesOpen,
  setBrowserTreeDelimiter,
  resetBrowserTree,
  setWorkbenchScript,
  setWorkbenchVerticalPanelSizes,
  setLastPageContext,
  setPubSubFieldsContext,
  setBrowserBulkActionOpen,
  setLastAnalyticsPage,
  updateKeyDetailsSizes,
  clearBrowserKeyListData,
  setDbIndexState,
  setRecommendationsShowHidden,
  setBrowserTreeSort,
  setCapability,
  setLastPipelineManagementPage,
  setPipelineDialogState,
  resetPipelineManagement,
} = appContextSlice.actions

// Selectors
export const appContextSelector = (state: RootState) =>
  state.app.context
export const appContextDbConfig = (state: RootState) =>
  state.app.context.dbConfig
export const appContextBrowser = (state: RootState) =>
  state.app.context.browser
export const appContextBrowserTree = (state: RootState) =>
  state.app.context.browser.tree
export const appContextBrowserKeyDetails = (state: RootState) =>
  state.app.context.browser.keyDetailsSizes
export const appContextWorkbench = (state: RootState) =>
  state.app.context.workbench
export const appContextSelectedKey = (state: RootState) =>
  state.app.context.browser.keyList.selectedKey
export const appContextPubSub = (state: RootState) =>
  state.app.context.pubsub
export const appContextAnalytics = (state: RootState) =>
  state.app.context.analytics
export const appContextDbIndex = (state: RootState) =>
  state.app.context.dbIndex
export const appContextCapability = (state: RootState) =>
  state.app.context.capability
export const appContextPipelineManagement = (state: RootState) =>
  state.app.context.pipelineManagement

// The reducer
export default appContextSlice.reducer

// Asynchronous thunk action
export function setBrowserKeyListDataLoaded(
  searchMode: SearchMode,
  value: boolean,
) {
  return searchMode === SearchMode.Pattern
    ? setBrowserPatternKeyListDataLoaded(value)
    : setBrowserRedisearchKeyListDataLoaded(value)
}

export function resetDatabaseContext() {
  return async (dispatch: AppDispatch) => {
    dispatch(resetKeys())
    dispatch(setMonitorInitialState())
    dispatch(setInitialPubSubState())
    dispatch(resetBulkActions())
    dispatch(setAppContextInitialState())
    dispatch(resetPatternKeysData())
    dispatch(resetCliHelperSettings())
    dispatch(resetRedisearchKeysData())
    dispatch(setClusterDetailsInitialState())
    dispatch(setDatabaseAnalysisInitialState())
    dispatch(setInitialAnalyticsSettings())
    dispatch(setRedisearchInitialState())
    dispatch(setInitialRecommendationsState())
    dispatch(clearExpertChatHistory())
    setTimeout(() => {
      dispatch(resetOutput())
    }, 0)
  }
}

export function resetRdiContext() {
  return async (dispatch: AppDispatch) => {
    dispatch(setAppContextConnectedRdiInstanceId(''))
    dispatch(setPipelineInitialState())
    dispatch(resetPipelineManagement())
  }
}
