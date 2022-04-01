import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import cx from 'classnames'
import { EuiResizableContainer } from '@elastic/eui'

import { formatLongName, getDbIndex, Nullable, setTitle } from 'uiSrc/utils'
import { SCAN_COUNT_DEFAULT, SCAN_TREE_COUNT_DEFAULT } from 'uiSrc/constants/api'
import { sendPageViewTelemetry, TelemetryPageView } from 'uiSrc/telemetry'
import {
  fetchKeys,
  fetchMoreKeys,
  keysDataSelector,
  keysSelector,
  resetKeyInfo,
  selectedKeyDataSelector,
  setInitialStateByType,
} from 'uiSrc/slices/keys'
import { connectedInstanceSelector, setConnectedInstanceId } from 'uiSrc/slices/instances'
import {
  setBrowserKeyListDataLoaded,
  setBrowserSelectedKey,
  appContextSelector,
  appContextBrowser,
  setBrowserPanelSizes,
  setLastPageContext,
  updateBrowserTreeSelectedLeaf,
} from 'uiSrc/slices/app/context'
import { appAnalyticsInfoSelector } from 'uiSrc/slices/app/info'
import { resetErrors } from 'uiSrc/slices/app/notifications'
import InstanceHeader from 'uiSrc/components/instance-header'
import { KeyViewType } from 'uiSrc/slices/interfaces/keys'

import AddKey from './components/add-key/AddKey'
import KeyList from './components/key-list/KeyList'
import KeyTree from './components/key-tree'
import KeysHeader from './components/keys-header'
import KeyDetailsWrapper from './components/key-details/KeyDetailsWrapper'

import styles from './styles.module.scss'

const widthResponsiveSize = 1124
export const firstPanelId = 'keys'
export const secondPanelId = 'keyDetails'

const BrowserPage = () => {
  const { identified: analyticsIdentified } = useSelector(appAnalyticsInfoSelector)
  const { name: connectedInstanceName, db } = useSelector(connectedInstanceSelector)
  const { contextInstanceId } = useSelector(appContextSelector)
  const {
    keyList: { selectedKey: selectedKeyContext, isDataLoaded },
    panelSizes
  } = useSelector(appContextBrowser)
  const keysState = useSelector(keysDataSelector)
  const { loading, viewType } = useSelector(keysSelector)
  const { type } = useSelector(selectedKeyDataSelector) ?? { type: '' }

  const [isPageViewSent, setIsPageViewSent] = useState(false)
  const [arePanelsCollapsed, setArePanelsCollapsed] = useState(false)
  const [selectedKey, setSelectedKey] = useState<Nullable<string>>(selectedKeyContext)
  const [isAddKeyPanelOpen, setIsAddKeyPanelOpen] = useState(false)
  const [sizes, setSizes] = useState(panelSizes)
  const selectedKeyRef = useRef<Nullable<string>>(selectedKey)
  const prevSelectedType = useRef<string>(type)

  const { instanceId } = useParams<{ instanceId: string }>()
  const dispatch = useDispatch()

  const dbName = `${formatLongName(connectedInstanceName, 33, 0, '...')} ${getDbIndex(db)}`
  setTitle(`${dbName} - Browser`)

  useEffect(() => {
    dispatch(resetErrors())
    updateWindowDimensions()
    globalThis.addEventListener('resize', updateWindowDimensions)

    if (!isDataLoaded || contextInstanceId !== instanceId) {
      loadKeys()
    }

    // componentWillUnmount
    return () => {
      globalThis.removeEventListener('resize', updateWindowDimensions)
      setSizes((prevSizes: any) => {
        dispatch(setBrowserPanelSizes(prevSizes))
        return {}
      })
      dispatch(setBrowserSelectedKey(selectedKeyRef.current))
      dispatch(setLastPageContext('browser'))
    }
  }, [])

  useEffect(() => {
    selectedKeyRef.current = selectedKey
  }, [selectedKey])

  useEffect(() => {
    if (connectedInstanceName && !isPageViewSent && analyticsIdentified) {
      sendPageView(instanceId)
    }
  }, [connectedInstanceName, isPageViewSent, analyticsIdentified])

  const updateWindowDimensions = () => {
    setArePanelsCollapsed(globalThis.innerWidth < widthResponsiveSize)
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

  const loadKeys = (keyViewType?: KeyViewType) => {
    dispatch(setConnectedInstanceId(instanceId))
    dispatch(fetchKeys(
      '0',
      keyViewType === KeyViewType.Browser ? SCAN_COUNT_DEFAULT : SCAN_TREE_COUNT_DEFAULT,
      () => dispatch(setBrowserKeyListDataLoaded(true)),
      () => dispatch(setBrowserKeyListDataLoaded(false))
    ))
  }

  const handleAddKeyPanel = (value: boolean) => {
    if (value && !isAddKeyPanelOpen) {
      dispatch(resetKeyInfo())
      setSelectedKey(null)
    }
    setIsAddKeyPanelOpen(value)
  }

  const selectKey = ({ rowData }: { rowData: any }) => {
    if (rowData.name !== selectedKey) {
      dispatch(setInitialStateByType(prevSelectedType.current))
      setSelectedKey(rowData.name)
      setIsAddKeyPanelOpen(false)
      prevSelectedType.current = rowData.type
    }
  }

  const closeKey = () => {
    dispatch(resetKeyInfo())

    setSelectedKey(null)
    setIsAddKeyPanelOpen(false)
  }

  const loadMoreItems = ({ startIndex, stopIndex }: { startIndex: number; stopIndex: number }) => {
    if (keysState.nextCursor !== '0') {
      dispatch(fetchMoreKeys(keysState.nextCursor, stopIndex - startIndex + 1))
    }
  }

  const handleEditKey = (key: string, newKey: string) => {
    setSelectedKey(newKey)

    if (viewType === KeyViewType.Tree) {
      dispatch(updateBrowserTreeSelectedLeaf({ key, newKey }))
    }
  }

  return (
    <div className={`browserPage ${styles.container}`}>
      <InstanceHeader />
      <div className={styles.main}>
        <div className={styles.resizableContainer}>
          <EuiResizableContainer onPanelWidthChange={onPanelWidthChange} style={{ height: '100%' }}>
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
                      [styles.fullWidth]: arePanelsCollapsed,
                    }),
                  }}
                >
                  <>

                    <KeysHeader
                      keysState={keysState}
                      loading={loading}
                      loadKeys={loadKeys}
                      sizes={sizes}
                      loadMoreItems={loadMoreItems}
                      handleAddKeyPanel={handleAddKeyPanel}
                    />
                    {viewType === KeyViewType.Browser && (
                      <KeyList
                        hideFooter
                        keysState={keysState}
                        loading={loading}
                        loadMoreItems={loadMoreItems}
                        selectKey={selectKey}
                      />
                    )}
                    {viewType === KeyViewType.Tree && (
                      <KeyTree
                        keysState={keysState}
                        loading={loading}
                        loadMoreItems={loadMoreItems}
                        selectKey={selectKey}
                      />
                    )}
                  </>
                </EuiResizablePanel>

                <EuiResizableButton
                  className={cx(styles.resizableButton, {
                    [styles.hidden]: arePanelsCollapsed,
                  })}
                  data-test-subj="resize-btn-keyList-keyDetails"
                />

                <EuiResizablePanel
                  id={secondPanelId}
                  scrollable={false}
                  initialSize={sizes[secondPanelId] ?? 50}
                  minSize="500px"
                  paddingSize="none"
                  wrapperProps={{
                    className: cx(styles.resizePanelRight, {
                      [styles.fullWidth]: arePanelsCollapsed,
                      [styles.keyDetails]: arePanelsCollapsed,
                      [styles.keyDetailsOpen]: isAddKeyPanelOpen || selectedKey !== null,
                    }),
                  }}
                >
                  {isAddKeyPanelOpen ? (
                    <AddKey
                      handleAddKeyPanel={handleAddKeyPanel}
                      handleCloseKey={closeKey}
                    />
                  ) : (
                    <KeyDetailsWrapper
                      keyProp={selectedKey}
                      onCloseKey={closeKey}
                      onEditKey={(key: string, newKey: string) => handleEditKey(key, newKey)}
                      onDeleteKey={() => setSelectedKey(null)}
                    />
                  )}
                </EuiResizablePanel>
              </>
            )}
          </EuiResizableContainer>
        </div>
      </div>
    </div>
  )
}

export default BrowserPage
