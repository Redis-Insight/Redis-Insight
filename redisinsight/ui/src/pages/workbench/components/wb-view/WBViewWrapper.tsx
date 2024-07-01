import React, { Ref, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams } from 'react-router-dom'
import { monaco as monacoEditor } from 'react-monaco-editor'

import { getMonacoLines, getParsedParamsInQuery, isGroupMode, Maybe, Nullable, scrollIntoView, } from 'uiSrc/utils'
import {
  changeActiveRunQueryMode,
  changeResultsMode,
  clearWbResultsAction,
  deleteWBCommandAction,
  fetchWBCommandAction,
  fetchWBHistoryAction,
  resetWBHistoryItems,
  sendWbQueryAction,
  workbenchResultsSelector,
} from 'uiSrc/slices/workbench/wb-results'
import { Instance, IPluginVisualization } from 'uiSrc/slices/interfaces'
import { connectedInstanceSelector, initialState as instanceInitState } from 'uiSrc/slices/instances/instances'
import { ResultsMode, RunQueryMode } from 'uiSrc/slices/interfaces/workbench'
import { cliSettingsSelector, fetchBlockingCliCommandsAction } from 'uiSrc/slices/cli/cli-settings'
import { appContextWorkbench, setWorkbenchScript } from 'uiSrc/slices/app/context'
import { appPluginsSelector } from 'uiSrc/slices/app/plugins'
import { userSettingsWBSelector } from 'uiSrc/slices/user/user-settings'
import { CodeButtonParams } from 'uiSrc/constants'
import { sendEventTelemetry, TelemetryEvent } from 'uiSrc/telemetry'

import { incrementOnboardStepAction } from 'uiSrc/slices/app/features'

import { OnboardingStepName, OnboardingSteps } from 'uiSrc/constants/onboarding'

import { changeSelectedTab, changeSidePanel } from 'uiSrc/slices/panels/sidePanels'
import { InsightsPanelTabs, SidePanels } from 'uiSrc/slices/interfaces/insights'
import WBView from './WBView'

interface IState {
  loading: boolean
  instance: Instance
  unsupportedCommands: string[]
  blockingCommands: string[]
  visualizations: IPluginVisualization[]
  scriptEl: Nullable<monacoEditor.editor.IStandaloneCodeEditor>
}

let state: IState = {
  loading: false,
  instance: instanceInitState?.connectedInstance,
  unsupportedCommands: [],
  blockingCommands: [],
  visualizations: [],
  scriptEl: null,
}

const WBViewWrapper = () => {
  const { instanceId } = useParams<{ instanceId: string }>()

  const {
    isLoaded,
    loading,
    items,
    clearing,
    processing,
    activeRunQueryMode,
    resultsMode
  } = useSelector(workbenchResultsSelector)
  const { unsupportedCommands, blockingCommands } = useSelector(cliSettingsSelector)
  const { cleanup: cleanupWB } = useSelector(userSettingsWBSelector)
  const { script: scriptContext } = useSelector(appContextWorkbench)

  const [script, setScript] = useState(scriptContext)
  const [scriptEl, setScriptEl] = useState<Nullable<monacoEditor.editor.IStandaloneCodeEditor>>(null)

  const instance = useSelector(connectedInstanceSelector)
  const { visualizations = [] } = useSelector(appPluginsSelector)
  state = {
    scriptEl,
    loading,
    instance,
    blockingCommands,
    unsupportedCommands,
    visualizations,
  }
  const scrollDivRef: Ref<HTMLDivElement> = useRef(null)
  const scriptRef = useRef(script)

  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(fetchWBHistoryAction(instanceId))

    return () => {
      dispatch(resetWBHistoryItems())
      dispatch(setWorkbenchScript(scriptRef.current))
    }
  }, [])

  useEffect(() => {
    scriptRef.current = script
  }, [script])

  useEffect(() => {
    if (scriptContext) {
      setScript(scriptContext)
      setTimeout(() => {
        scriptEl?.setSelection(new monacoEditor.Selection(0, 0, 0, 0))
      }, 0)
      dispatch(setWorkbenchScript(''))
    }
  }, [scriptContext])

  useEffect(() => {
    if (!blockingCommands.length) {
      dispatch(fetchBlockingCliCommandsAction())
    }
  }, [blockingCommands])

  const handleChangeQueryRunMode = () => {
    dispatch(changeActiveRunQueryMode(
      activeRunQueryMode === RunQueryMode.ASCII
        ? RunQueryMode.Raw
        : RunQueryMode.ASCII
    ))
    sendEventTelemetry({
      event: TelemetryEvent.WORKBENCH_MODE_CHANGED,
      eventData: {
        databaseId: instanceId,
        changedFromMode: activeRunQueryMode,
        changedToMode: activeRunQueryMode === RunQueryMode.ASCII
          ? RunQueryMode.Raw
          : RunQueryMode.ASCII
      }
    })
  }

  const handleChangeGroupMode = () => {
    dispatch(changeResultsMode(isGroupMode(resultsMode) ? ResultsMode.Default : ResultsMode.GroupMode))
  }

  const updateOnboardingOnSubmit = () => dispatch(
    incrementOnboardStepAction(
      OnboardingSteps.WorkbenchPage,
      undefined,
      () => {
        dispatch(changeSelectedTab(InsightsPanelTabs.Explore))
        dispatch(changeSidePanel(SidePanels.Insights))
        sendEventTelemetry({
          event: TelemetryEvent.ONBOARDING_TOUR_ACTION_MADE,
          eventData: {
            databaseId: instanceId,
            step: OnboardingStepName.WorkbenchIntro,
          }
        })
      }
    )
  )

  const handleSubmit = (
    commandInit: string = script,
    commandId?: Nullable<string>,
    executeParams: CodeButtonParams = {}
  ) => {
    if (!commandInit?.length) return

    dispatch(sendWbQueryAction(commandInit, commandId, executeParams, {
      afterEach: () => {
        const isNewCommand = !commandId
        isNewCommand && scrollResults('start')
      },
      afterAll: updateOnboardingOnSubmit
    }))
  }

  const scrollResults = (inline: ScrollLogicalPosition = 'start') => {
    requestAnimationFrame(() => {
      scrollIntoView(scrollDivRef?.current, {
        behavior: 'smooth',
        block: 'nearest',
        inline,
      })
    })
  }

  const handleQueryDelete = (commandId: string) => {
    dispatch(deleteWBCommandAction(commandId))
  }

  const handleAllQueriesDelete = () => {
    dispatch(clearWbResultsAction())
    sendEventTelemetry({
      event: TelemetryEvent.WORKBENCH_CLEAR_ALL_RESULTS_CLICKED,
      eventData: {
        databaseId: instanceId,
      }
    })
  }

  const handleQueryOpen = (commandId: string = '') => {
    dispatch(fetchWBCommandAction(commandId))
  }

  const resetCommand = () => {
    state?.scriptEl?.getAction('editor.action.insertLineAfter')?.run() // HACK: to reset completion snippets
    setScript('')
  }

  const sourceValueSubmit = (
    value: string = script,
    commandId?: Nullable<string>,
    executeParams: CodeButtonParams = { clearEditor: true }
  ) => {
    if (state.loading || (!value && !script)) return

    const lines = getMonacoLines(value)
    const parsedParams: Maybe<CodeButtonParams> = getParsedParamsInQuery(value)

    const { clearEditor } = executeParams
    handleSubmit(value, commandId, { ...executeParams, ...parsedParams })

    if (cleanupWB && clearEditor && lines.length) {
      resetCommand()
    }
  }

  return (
    <WBView
      items={items}
      clearing={clearing}
      processing={processing}
      isResultsLoaded={isLoaded}
      script={script}
      setScript={setScript}
      setScriptEl={setScriptEl}
      scrollDivRef={scrollDivRef}
      activeMode={activeRunQueryMode}
      onSubmit={sourceValueSubmit}
      onQueryOpen={handleQueryOpen}
      onQueryDelete={handleQueryDelete}
      onAllQueriesDelete={handleAllQueriesDelete}
      onQueryChangeMode={handleChangeQueryRunMode}
      resultsMode={resultsMode}
      onChangeGroupMode={handleChangeGroupMode}
    />
  )
}

export default WBViewWrapper
