import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import cx from 'classnames'
import {
  EuiResizableContainer,
  EuiButton,
} from '@elastic/eui'

import { isNumber } from 'lodash'
import {
  formatLongName,
  getDbIndex,
  isEqualBuffers,
  Nullable,
  setTitle,
} from 'uiSrc/utils'
import {
  sendPageViewTelemetry,
  TelemetryPageView,
} from 'uiSrc/telemetry'
import {
  fetchKeys,
  keysSelector,
  resetKeyInfo,
  selectedKeyDataSelector,
  setInitialStateByType,
  toggleBrowserFullScreen,
} from 'uiSrc/slices/browser/keys'
import {
  setBrowserSelectedKey,
  appContextBrowser,
  setBrowserPanelSizes,
  setBrowserBulkActionOpen,
} from 'uiSrc/slices/app/context'
import { resetErrors } from 'uiSrc/slices/app/notifications'
import { RedisResponseBuffer } from 'uiSrc/slices/interfaces'
import { connectedInstanceSelector } from 'uiSrc/slices/instances/instances'

import { KeyViewType } from 'uiSrc/slices/interfaces/keys'
import { SCAN_COUNT_DEFAULT, SCAN_TREE_COUNT_DEFAULT } from 'uiSrc/constants/api'
import OnboardingStartPopover from 'uiSrc/pages/browser/components/onboarding-start-popover'
import { sidePanelsSelector } from 'uiSrc/slices/panels/sidePanels'
import BrowserSearchPanel from './components/browser-search-panel'
import BrowserLeftPanel from './components/browser-left-panel'
import BrowserRightPanel from './components/browser-right-panel'

import styles from './styles.module.scss'

const widthResponsiveSize = 1280
const widthExplorePanel = 460

export const firstPanelId = 'keys'
export const secondPanelId = 'keyDetails'

const isOneSideMode = (isInsightsOpen: boolean) =>
  globalThis.innerWidth < widthResponsiveSize + (isInsightsOpen ? widthExplorePanel : 0)

const BrowserPage = () => {
  const { instanceId } = useParams<{ instanceId: string }>()

  const { name: connectedInstanceName, db = 0 } = useSelector(connectedInstanceSelector)
  const {
    panelSizes,
    keyList: { selectedKey: selectedKeyContext },
    bulkActions: { opened: bulkActionOpenContext },
  } = useSelector(appContextBrowser)
  const { isBrowserFullScreen } = useSelector(keysSelector)
  const { type } = useSelector(selectedKeyDataSelector) ?? { type: '', length: 0 }
  const { viewType, searchMode } = useSelector(keysSelector)
  const { openedPanel: openedSidePanel } = useSelector(sidePanelsSelector)

  const [isPageViewSent, setIsPageViewSent] = useState(false)
  const [arePanelsCollapsed, setArePanelsCollapsed] = useState(isOneSideMode(!!openedSidePanel))
  const [selectedKey, setSelectedKey] = useState<Nullable<RedisResponseBuffer>>(selectedKeyContext)
  const [isAddKeyPanelOpen, setIsAddKeyPanelOpen] = useState(false)
  const [isCreateIndexPanelOpen, setIsCreateIndexPanelOpen] = useState(false)
  const [isBulkActionsPanelOpen, setIsBulkActionsPanelOpen] = useState(bulkActionOpenContext)

  const [sizes, setSizes] = useState(panelSizes)

  const prevSelectedType = useRef<string>(type)
  const prevDbIndex = useRef(db)
  const selectedKeyRef = useRef<Nullable<RedisResponseBuffer>>(selectedKey)
  const isBulkActionsPanelOpenRef = useRef<boolean>(isBulkActionsPanelOpen)
  const isSidePanelOpenRef = useRef<boolean>(!!openedSidePanel)

  const dispatch = useDispatch()

  const dbName = `${formatLongName(connectedInstanceName, 33, 0, '...')} ${getDbIndex(db)}`
  setTitle(`${dbName} - Browser`)

  useEffect(() => {
    dispatch(resetErrors())
    updateWindowDimensions()
    globalThis.addEventListener('resize', updateWindowDimensions)

    // componentWillUnmount
    return () => {
      globalThis.removeEventListener('resize', updateWindowDimensions)
      setSizes((prevSizes: any) => {
        dispatch(setBrowserPanelSizes(prevSizes))
        return {}
      })
      dispatch(setBrowserBulkActionOpen(isBulkActionsPanelOpenRef.current))
      dispatch(setBrowserSelectedKey(selectedKeyRef.current))

      if (!selectedKeyRef.current) {
        dispatch(toggleBrowserFullScreen(false))
      }
    }
  }, [])

  useEffect(() => {
    isBulkActionsPanelOpenRef.current = isBulkActionsPanelOpen
  }, [isBulkActionsPanelOpen])

  useEffect(() => {
    setSelectedKey(selectedKeyContext)
  }, [selectedKeyContext])

  useEffect(() => {
    selectedKeyRef.current = selectedKey
  }, [selectedKey])

  useEffect(() => {
    setArePanelsCollapsed(() => isOneSideMode(!!openedSidePanel))
    isSidePanelOpenRef.current = !!openedSidePanel
  }, [openedSidePanel])

  useEffect(() => {
    if (connectedInstanceName && !isPageViewSent) {
      sendPageView(instanceId)
    }
  }, [connectedInstanceName, isPageViewSent])

  const updateWindowDimensions = () => {
    setArePanelsCollapsed(isOneSideMode(isSidePanelOpenRef.current))
  }

  const onPanelWidthChange = useCallback((newSizes: any) => {
    setSizes((prevSizes: any) => ({
      ...prevSizes,
      ...newSizes,
    }))
  }, [])

  const sendPageView = (instanceId: string) => {
    sendPageViewTelemetry({
      name: TelemetryPageView.BROWSER_PAGE,
      databaseId: instanceId
    })
    setIsPageViewSent(true)
  }

  const handlePanel = (value: boolean, keyName?: RedisResponseBuffer) => {
    if (value && !isAddKeyPanelOpen && !isBulkActionsPanelOpen && !isCreateIndexPanelOpen) {
      dispatch(resetKeyInfo())
    }

    dispatch(toggleBrowserFullScreen(false))
    setSelectedKey(keyName ?? null)
    closeRightPanels()
  }

  const handleAddKeyPanel = useCallback((value: boolean, keyName?: RedisResponseBuffer) => {
    handlePanel(value, keyName)
    setIsAddKeyPanelOpen(value)
  }, [])

  const handleBulkActionsPanel = useCallback((value: boolean) => {
    handlePanel(value)
    setIsBulkActionsPanelOpen(value)
  }, [])

  const handleRemoveSelectedKey = useCallback(() => {
    handlePanel(true)
  }, [])

  const handleCreateIndexPanel = useCallback((value: boolean) => {
    handlePanel(value)
    setIsCreateIndexPanelOpen(value)
  }, [])

  const closeRightPanels = useCallback(() => {
    setIsAddKeyPanelOpen(false)
    setIsBulkActionsPanelOpen(false)
    setIsCreateIndexPanelOpen(false)
  }, [])

  useEffect(() => {
    if (isNumber(db) && db !== prevDbIndex.current) {
      onChangeDbIndex()
    }
    prevDbIndex.current = db
  }, [db])

  const onChangeDbIndex = () => {
    if (selectedKey) {
      dispatch(toggleBrowserFullScreen(true))
      setSelectedKey(null)
    }

    dispatch(fetchKeys({
      searchMode,
      cursor: '0',
      count: viewType === KeyViewType.Browser ? SCAN_COUNT_DEFAULT : SCAN_TREE_COUNT_DEFAULT
    }))
  }

  const selectKey = useCallback(({ rowData }: { rowData: any }) => {
    if (!isEqualBuffers(rowData.name, selectedKeyRef.current)) {
      dispatch(toggleBrowserFullScreen(false))

      dispatch(setInitialStateByType(prevSelectedType.current))
      setSelectedKey(rowData.name)
      closeRightPanels()
      prevSelectedType.current = rowData.type
    }
  }, [])

  const closePanel = () => {
    dispatch(toggleBrowserFullScreen(true))

    setSelectedKey(null)
    closeRightPanels()
  }

  const isRightPanelOpen = selectedKey !== null || isAddKeyPanelOpen || isBulkActionsPanelOpen || isCreateIndexPanelOpen
  const isRightPanelFullScreen = (isBrowserFullScreen && isRightPanelOpen) || (arePanelsCollapsed && isRightPanelOpen)

  return (
    <div className={`browserPage ${styles.container}`}>
      {arePanelsCollapsed && isRightPanelOpen && !isBrowserFullScreen && (
        <EuiButton
          color="secondary"
          iconType="arrowLeft"
          size="s"
          onClick={closePanel}
          className={styles.backBtn}
          data-testid="back-right-panel-btn"
        >
          Back
        </EuiButton>
      )}
      <div className={cx({
        [styles.hidden]: isRightPanelFullScreen })}
      >
        <BrowserSearchPanel
          handleAddKeyPanel={handleAddKeyPanel}
          handleBulkActionsPanel={handleBulkActionsPanel}
          handleCreateIndexPanel={handleCreateIndexPanel}
        />
      </div>
      <div
        className={cx(
          styles.main,
          { [styles.mainWithBackBtn]: arePanelsCollapsed && isRightPanelOpen && !isBrowserFullScreen },
        )}
      >
        <div className={styles.resizableContainer}>
          <EuiResizableContainer
            onPanelWidthChange={onPanelWidthChange}
            style={{ height: '100%' }}
          >
            {(EuiResizablePanel, EuiResizableButton) => (
              <>
                <EuiResizablePanel
                  id={firstPanelId}
                  scrollable={false}
                  initialSize={sizes[firstPanelId] ?? 50}
                  minSize="600px"
                  paddingSize="none"
                  wrapperProps={{
                    className: cx(styles.resizePanelLeft, {
                      [styles.fullWidth]: arePanelsCollapsed || (isBrowserFullScreen && !isRightPanelOpen)
                    }),
                  }}
                >
                  <BrowserLeftPanel
                    selectedKey={selectedKey}
                    selectKey={selectKey}
                    removeSelectedKey={handleRemoveSelectedKey}
                    handleAddKeyPanel={handleAddKeyPanel}
                  />
                </EuiResizablePanel>

                <EuiResizableButton
                  className={cx(styles.resizableButton, {
                    [styles.hidden]: arePanelsCollapsed || isBrowserFullScreen,
                  })}
                  data-test-subj="resize-btn-keyList-keyDetails"
                />

                <EuiResizablePanel
                  id={secondPanelId}
                  scrollable={false}
                  initialSize={sizes[secondPanelId] ?? 50}
                  minSize="600px"
                  paddingSize="none"
                  data-testid="key-details"
                  wrapperProps={{
                    className: cx(styles.resizePanelRight, {
                      [styles.noVisible]: isBrowserFullScreen && !isRightPanelOpen,
                      [styles.fullWidth]: arePanelsCollapsed || (isBrowserFullScreen && isRightPanelOpen),
                      [styles.keyDetails]: arePanelsCollapsed || (isBrowserFullScreen && isRightPanelOpen),
                      [styles.keyDetailsOpen]: isRightPanelOpen,
                    }),
                  }}
                >
                  <BrowserRightPanel
                    arePanelsCollapsed={arePanelsCollapsed}
                    setSelectedKey={setSelectedKey}
                    selectedKey={selectedKey}
                    isAddKeyPanelOpen={isAddKeyPanelOpen}
                    isCreateIndexPanelOpen={isCreateIndexPanelOpen}
                    isBulkActionsPanelOpen={isBulkActionsPanelOpen}
                    handleAddKeyPanel={handleAddKeyPanel}
                    handleBulkActionsPanel={handleBulkActionsPanel}
                    closeRightPanels={closeRightPanels}
                  />
                </EuiResizablePanel>
              </>
            )}
          </EuiResizableContainer>
        </div>
        <OnboardingStartPopover />
      </div>
    </div>
  )
}

export default BrowserPage
