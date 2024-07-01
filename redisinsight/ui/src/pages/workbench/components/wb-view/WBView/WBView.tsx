import React, { Ref, useCallback, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import cx from 'classnames'
import { isEmpty } from 'lodash'
import { useParams } from 'react-router-dom'
import { EuiResizableContainer } from '@elastic/eui'

import {
  Maybe,
  Nullable,
  getParsedParamsInQuery,
  getCommandsFromQuery
} from 'uiSrc/utils'
import {
  setWorkbenchVerticalPanelSizes,
  appContextWorkbench,
} from 'uiSrc/slices/app/context'
import { CommandExecutionUI } from 'uiSrc/slices/interfaces'
import { RunQueryMode, ResultsMode } from 'uiSrc/slices/interfaces/workbench'

import { TelemetryEvent, sendEventTelemetry } from 'uiSrc/telemetry'
import { appRedisCommandsSelector } from 'uiSrc/slices/app/redis-commands'
import { userSettingsConfigSelector } from 'uiSrc/slices/user/user-settings'
import { PIPELINE_COUNT_DEFAULT } from 'uiSrc/constants/api'
import { CodeButtonParams } from 'uiSrc/constants'

import QueryWrapper from '../../query'
import WBResultsWrapper from '../../wb-results'

import styles from './styles.module.scss'

const verticalPanelIds = {
  firstPanelId: 'scriptingArea',
  secondPanelId: 'resultsArea'
}

export interface Props {
  script: string
  items: CommandExecutionUI[]
  clearing: boolean
  processing: boolean
  isResultsLoaded: boolean
  setScript: (script: string) => void
  setScriptEl: Function
  scrollDivRef: Ref<HTMLDivElement>
  activeMode: RunQueryMode
  resultsMode: ResultsMode
  onSubmit: (query?: string, commandId?: Nullable<string>, executeParams?: CodeButtonParams) => void
  onQueryOpen: (commandId?: string) => void
  onQueryDelete: (commandId: string) => void
  onAllQueriesDelete: () => void
  onQueryChangeMode: () => void
  onChangeGroupMode: () => void
}

interface IState {
  activeMode: RunQueryMode
  resultsMode?: ResultsMode
}

let state: IState = {
  activeMode: RunQueryMode.ASCII,
  resultsMode: ResultsMode.Default
}

const WBView = (props: Props) => {
  const {
    script = '',
    items,
    clearing,
    processing,
    setScript,
    setScriptEl,
    activeMode,
    resultsMode,
    isResultsLoaded,
    onSubmit,
    onQueryOpen,
    onQueryDelete,
    onAllQueriesDelete,
    onQueryChangeMode,
    onChangeGroupMode,
    scrollDivRef,
  } = props

  state = {
    activeMode,
    resultsMode
  }

  const { instanceId = '' } = useParams<{ instanceId: string }>()
  const { panelSizes: { vertical } } = useSelector(appContextWorkbench)
  const { commandsArray: REDIS_COMMANDS_ARRAY } = useSelector(appRedisCommandsSelector)
  const { batchSize = PIPELINE_COUNT_DEFAULT } = useSelector(userSettingsConfigSelector) ?? {}

  const verticalSizesRef = useRef(vertical)

  const dispatch = useDispatch()

  useEffect(() => () => {
    dispatch(setWorkbenchVerticalPanelSizes(verticalSizesRef.current))
  }, [])

  const onVerticalPanelWidthChange = useCallback((newSizes: any) => {
    verticalSizesRef.current = newSizes
  }, [])

  const handleSubmit = (value?: string) => {
    sendEventSubmitTelemetry(TelemetryEvent.WORKBENCH_COMMAND_SUBMITTED, value)
    onSubmit(value)
  }

  const handleReRun = (query?: string, commandId?: Nullable<string>, executeParams: CodeButtonParams = {}) => {
    sendEventSubmitTelemetry(TelemetryEvent.WORKBENCH_COMMAND_RUN_AGAIN, query, executeParams)
    onSubmit(query, commandId, executeParams)
  }

  const handleProfile = (query?: string, commandId?: Nullable<string>, executeParams: CodeButtonParams = {}) => {
    sendEventSubmitTelemetry(TelemetryEvent.WORKBENCH_COMMAND_PROFILE, query, executeParams)
    onSubmit(query, commandId, executeParams)
  }

  const sendEventSubmitTelemetry = (
    event: TelemetryEvent,
    commandInit = script,
    executeParams?: CodeButtonParams,
  ) => {
    const eventData = (() => {
      const parsedParams: Maybe<CodeButtonParams> = isEmpty(executeParams)
        ? getParsedParamsInQuery(commandInit)
        : executeParams

      const command = getCommandsFromQuery(commandInit, REDIS_COMMANDS_ARRAY) || ''
      const pipeline = TelemetryEvent.WORKBENCH_COMMAND_RUN_AGAIN !== event
        ? (parsedParams?.pipeline || batchSize) > 1
        : undefined
      const isMultiple = command.includes(';')

      return {
        command: command?.toUpperCase(),
        pipeline,
        databaseId: instanceId,
        multiple: isMultiple ? 'Multiple' : 'Single',
        rawMode: (parsedParams?.mode?.toUpperCase() || state.activeMode) === RunQueryMode.Raw,
        results:
          ResultsMode.GroupMode.startsWith?.(
            parsedParams?.results?.toUpperCase()
            || state.resultsMode
            || 'GROUP'
          )
            ? 'group'
            : (parsedParams?.results?.toLowerCase() === 'silent' ? 'silent' : 'single'),
      }
    })()

    if (eventData.command) {
      sendEventTelemetry({
        event,
        eventData
      })
    }
  }

  return (
    <div className={cx('workbenchPage', styles.container)}>
      <div className={styles.main}>
        <div className={styles.content}>
          <EuiResizableContainer onPanelWidthChange={onVerticalPanelWidthChange} direction="vertical" style={{ height: '100%' }}>
            {(EuiResizablePanel, EuiResizableButton) => (
              <>
                <EuiResizablePanel
                  id={verticalPanelIds.firstPanelId}
                  minSize="140px"
                  paddingSize="none"
                  scrollable={false}
                  className={styles.queryPanel}
                  initialSize={vertical[verticalPanelIds.firstPanelId] ?? 20}
                  style={{ minHeight: '240px', zIndex: '8' }}
                >
                  <QueryWrapper
                    query={script}
                    activeMode={activeMode}
                    resultsMode={resultsMode}
                    setQuery={setScript}
                    setQueryEl={setScriptEl}
                    onSubmit={handleSubmit}
                    onQueryChangeMode={onQueryChangeMode}
                    onChangeGroupMode={onChangeGroupMode}
                  />
                </EuiResizablePanel>

                <EuiResizableButton
                  className={styles.resizeButton}
                  data-test-subj="resize-btn-scripting-area-and-results"
                />

                <EuiResizablePanel
                  id={verticalPanelIds.secondPanelId}
                  minSize="60px"
                  paddingSize="none"
                  scrollable={false}
                  initialSize={vertical[verticalPanelIds.secondPanelId] ?? 80}
                  className={cx(styles.queryResults, styles.queryResultsPanel)}
                    // Fix scroll on low height - 140px (queryPanel)
                  style={{ maxHeight: 'calc(100% - 240px)' }}
                >
                  <WBResultsWrapper
                    items={items}
                    clearing={clearing}
                    processing={processing}
                    isResultsLoaded={isResultsLoaded}
                    activeMode={activeMode}
                    activeResultsMode={resultsMode}
                    scrollDivRef={scrollDivRef}
                    onQueryReRun={handleReRun}
                    onQueryProfile={handleProfile}
                    onQueryOpen={onQueryOpen}
                    onQueryDelete={onQueryDelete}
                    onAllQueriesDelete={onAllQueriesDelete}
                  />
                </EuiResizablePanel>
              </>
            )}
          </EuiResizableContainer>
        </div>
      </div>
    </div>
  )
}

export default WBView
