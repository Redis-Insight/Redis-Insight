import React, { Ref, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { decode } from 'html-entities'
import { useParams } from 'react-router-dom'
import * as monacoEditor from 'monaco-editor/esm/vs/editor/editor.api'
import { chunk, reverse, without } from 'lodash'

import {
  Nullable,
  removeMonacoComments,
  splitMonacoValuePerLines,
  getMultiCommands,
  scrollIntoView,
} from 'uiSrc/utils'
import { localStorageService } from 'uiSrc/services'
import {
  sendWBCommandAction,
  workbenchResultsSelector,
  fetchWBHistoryAction,
  deleteWBCommandAction,
  sendWBCommandClusterAction,
  resetWBHistoryItems,
  fetchWBCommandAction,
} from 'uiSrc/slices/workbench/wb-results'
import { ConnectionType, Instance, IPluginVisualization } from 'uiSrc/slices/interfaces'
import { initialState as instanceInitState, connectedInstanceSelector } from 'uiSrc/slices/instances/instances'
import { ClusterNodeRole } from 'uiSrc/slices/interfaces/cli'
import { cliSettingsSelector, fetchBlockingCliCommandsAction } from 'uiSrc/slices/cli/cli-settings'
import { appContextWorkbench, setWorkbenchScript } from 'uiSrc/slices/app/context'
import { appPluginsSelector } from 'uiSrc/slices/app/plugins'
import { userSettingsConfigSelector } from 'uiSrc/slices/user/user-settings'
import { BrowserStorageItem } from 'uiSrc/constants'
import { PIPELINE_COUNT_DEFAULT } from 'uiSrc/constants/api'

import { SendClusterCommandDto } from 'apiSrc/modules/cli/dto/cli.dto'
import WBView from './WBView'

interface IState {
  loading: boolean,
  instance: Instance,
  batchSize: number
  unsupportedCommands: string[],
  blockingCommands: string[],
  visualizations: IPluginVisualization[],
  scriptEl: Nullable<monacoEditor.editor.IStandaloneCodeEditor>,
}

let state: IState = {
  loading: false,
  batchSize: PIPELINE_COUNT_DEFAULT,
  instance: instanceInitState.connectedInstance,
  unsupportedCommands: [],
  blockingCommands: [],
  visualizations: [],
  scriptEl: null,
}

const WBViewWrapper = () => {
  const { instanceId } = useParams<{ instanceId: string }>()

  const { loading, items } = useSelector(workbenchResultsSelector)
  const { unsupportedCommands, blockingCommands } = useSelector(cliSettingsSelector)
  const { batchSize = PIPELINE_COUNT_DEFAULT } = useSelector(userSettingsConfigSelector) ?? {}
  const { script: scriptContext } = useSelector(appContextWorkbench)

  const [script, setScript] = useState(scriptContext)
  const [multiCommands, setMultiCommands] = useState<string[]>([])
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
    batchSize,
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
    if (!blockingCommands.length) {
      dispatch(fetchBlockingCliCommandsAction())
    }
  }, [blockingCommands])

  useEffect(() => {
    if (multiCommands?.length) {
      handleSubmit(multiCommands.join('\n'))
    }
  }, [multiCommands])

  const handleSubmit = (
    commandInit: string = script,
    commandId?: Nullable<string>,
  ) => {
    const { loading, batchSize } = state
    const isNewCommand = () => !commandId
    const [commands, ...rest] = chunk(splitMonacoValuePerLines(commandInit), batchSize > 1 ? batchSize : 1)
    const multiCommands = rest.map((command) => getMultiCommands(command))
    const commandLine = without(
      commands.map((command) => removeMonacoComments(decode(command).trim())),
      ''
    )

    if (!commandLine.length || loading) {
      setMultiCommands(multiCommands)
      return
    }

    isNewCommand() && scrollResults('start')

    sendCommand(reverse(commandLine), multiCommands)
  }

  const sendCommand = (
    commands: string[],
    multiCommands: string[] = [],
  ) => {
    const { connectionType, host, port } = state.instance
    const mode = localStorageService.get(BrowserStorageItem.workbenchMode)
    if (connectionType !== ConnectionType.Cluster) {
      dispatch(sendWBCommandAction({
        commands,
        multiCommands,
        mode,
        onSuccessAction: (multiCommands) => onSuccess(multiCommands),
      }))
      return
    }

    const options: SendClusterCommandDto = {
      commands,
      nodeOptions: {
        host,
        port,
        enableRedirection: true,
      },
      role: ClusterNodeRole.All,
    }
    dispatch(
      sendWBCommandClusterAction({
        commands,
        options,
        mode,
        multiCommands,
        onSuccessAction: (multiCommands) => onSuccess(multiCommands),
      })
    )
  }

  const onSuccess = (multiCommands: string[] = []) => {
    setMultiCommands(multiCommands)
  }

  const scrollResults = (inline: ScrollLogicalPosition = 'start') => {
    scrollIntoView(scrollDivRef?.current, {
      behavior: 'smooth',
      block: 'nearest',
      inline,
    })
  }

  const handleQueryDelete = (commandId: string) => {
    dispatch(deleteWBCommandAction(commandId, onSuccess))
  }

  const handleQueryOpen = (commandId: string = '') => {
    dispatch(fetchWBCommandAction(commandId))
  }

  const resetCommand = () => {
    state?.scriptEl?.getAction('editor.action.insertLineAfter')?.run() // HACK: to reset completion snippets
    setScript('')
  }

  const sourceValueSubmit = (value?: string, commandId?: Nullable<string>) => {
    if (state.loading || (!value && !script)) return

    handleSubmit(value, commandId)
    setTimeout(() => {
      resetCommand()
    }, 0)
  }

  return (
    <WBView
      items={items}
      script={script}
      setScript={setScript}
      setScriptEl={setScriptEl}
      scriptEl={scriptEl}
      scrollDivRef={scrollDivRef}
      onSubmit={sourceValueSubmit}
      onQueryOpen={handleQueryOpen}
      onQueryDelete={handleQueryDelete}
    />
  )
}

export default WBViewWrapper
