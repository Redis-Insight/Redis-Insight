import React, { useContext, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { compact, first } from 'lodash'
import cx from 'classnames'
import MonacoEditor, { monaco as monacoEditor } from 'react-monaco-editor'
import { useParams } from 'react-router-dom'

import {
  Theme,
  MonacoLanguage,
  DSLNaming,
} from 'uiSrc/constants'
import {
  actionTriggerParameterHints,
  createSyntaxWidget,
  decoration,
  findArgIndexByCursor,
  findCompleteQuery,
  getMonacoAction,
  getRedisCompletionProvider,
  getRedisSignatureHelpProvider,
  isParamsLine,
  MonacoAction,
  Nullable,
  toModelDeltaDecoration
} from 'uiSrc/utils'
import { ThemeContext } from 'uiSrc/contexts/themeContext'
import { appRedisCommandsSelector } from 'uiSrc/slices/app/redis-commands'
import { IEditorMount, ISnippetController } from 'uiSrc/pages/workbench/interfaces'
import { CommandExecutionUI } from 'uiSrc/slices/interfaces'
import { RunQueryMode, ResultsMode } from 'uiSrc/slices/interfaces/workbench'
import { sendEventTelemetry, TelemetryEvent } from 'uiSrc/telemetry'
import { stopProcessing, workbenchResultsSelector } from 'uiSrc/slices/workbench/wb-results'
import DedicatedEditor from 'uiSrc/components/monaco-editor/components/dedicated-editor'

import QueryActions from '../../query-actions'
import QueryTutorials from '../../query-tutorials'
import styles from './styles.module.scss'

export interface Props {
  query: string
  activeMode: RunQueryMode
  resultsMode?: ResultsMode
  setQueryEl: Function
  setQuery: (script: string) => void
  onSubmit: (query?: string) => void
  onKeyDown?: (e: React.KeyboardEvent, script: string) => void
  onQueryChangeMode: () => void
  onChangeGroupMode: () => void
}

const SYNTAX_CONTEXT_ID = 'syntaxWidgetContext'
const SYNTAX_WIDGET_ID = 'syntax.content.widget'

const argInQuotesRegExp = /^['"](.|[\r\n])*['"]$/
const aroundQuotesRegExp = /(^["']|["']$)/g

let execHistoryPos: number = 0
let execHistory: CommandExecutionUI[] = []
let decorationCollection: Nullable<monacoEditor.editor.IEditorDecorationsCollection> = null

const Query = (props: Props) => {
  const {
    query = '',
    activeMode,
    resultsMode,
    setQuery = () => {},
    onKeyDown = () => {},
    onSubmit = () => {},
    setQueryEl = () => {},
    onQueryChangeMode = () => {},
    onChangeGroupMode = () => {}
  } = props
  let contribution: Nullable<ISnippetController> = null
  const [isDedicatedEditorOpen, setIsDedicatedEditorOpen] = useState(false)
  const isWidgetOpen = useRef(false)
  const input = useRef<HTMLDivElement>(null)
  const isWidgetEscaped = useRef(false)
  const selectedArg = useRef('')
  const syntaxCommand = useRef<any>(null)
  const isDedicatedEditorOpenRef = useRef<boolean>(isDedicatedEditorOpen)
  let syntaxWidgetContext: Nullable<monacoEditor.editor.IContextKey<boolean>> = null

  const { commandsArray: REDIS_COMMANDS_ARRAY, spec: REDIS_COMMANDS_SPEC } = useSelector(appRedisCommandsSelector)
  const { items: execHistoryItems, loading, processing } = useSelector(workbenchResultsSelector)
  const { theme } = useContext(ThemeContext)
  const monacoObjects = useRef<Nullable<IEditorMount>>(null)

  const { instanceId = '' } = useParams<{ instanceId: string }>()

  const dispatch = useDispatch()

  let disposeCompletionItemProvider = () => {}
  let disposeSignatureHelpProvider = () => {}

  useEffect(() =>
    // componentWillUnmount
    () => {
      dispatch(stopProcessing())
      contribution?.dispose?.()
      disposeCompletionItemProvider()
      disposeSignatureHelpProvider()
    }, [])

  useEffect(() => {
    // HACK: The Monaco editor memoize the state and ignores updates to it
    execHistory = execHistoryItems
    execHistoryPos = 0
  }, [execHistoryItems])

  useEffect(() => {
    if (!monacoObjects.current) return
    const commands = query.split('\n')
    const firstLine = first(commands) ?? ''
    const { monaco } = monacoObjects.current
    const notCommandRegEx = /^[\s|//]/

    const newDecorations = compact(commands.map((command, index) => {
      if (!command || notCommandRegEx.test(command) || (index === 0 && isParamsLine(command))) return null
      const lineNumber = index + 1

      return toModelDeltaDecoration(
        decoration(monaco, `decoration_${lineNumber}`, lineNumber, 1, lineNumber, 1)
      )
    }))

    // highlight the first line with params
    if (isParamsLine(firstLine)) {
      newDecorations.push({
        range: new monaco.Range(1, 1, 1, firstLine.indexOf(']') + 2),
        options: { inlineClassName: 'monaco-params-line' }
      })
    }

    decorationCollection?.set(newDecorations)
  }, [query])

  useEffect(() => {
    isDedicatedEditorOpenRef.current = isDedicatedEditorOpen
  }, [isDedicatedEditorOpen])

  const triggerUpdateCursorPosition = (editor: monacoEditor.editor.IStandaloneCodeEditor) => {
    const position = editor.getPosition()
    isDedicatedEditorOpenRef.current = false
    editor.trigger('mouse', '_moveTo', { position: { lineNumber: 1, column: 1 } })
    editor.trigger('mouse', '_moveTo', { position })
    editor.focus()
  }

  const onPressWidget = () => {
    if (!monacoObjects.current) return
    const { editor } = monacoObjects?.current

    setIsDedicatedEditorOpen(true)
    editor.updateOptions({ readOnly: true })
    hideSyntaxWidget(editor)
    sendEventTelemetry({
      event: TelemetryEvent.WORKBENCH_NON_REDIS_EDITOR_OPENED,
      eventData: {
        databaseId: instanceId,
        lang: syntaxCommand.current.lang,
      }
    })
  }

  const onChange = (value: string = '') => {
    setQuery(value)

    // clear history position after scrolling all list with empty value
    if (value === '' && execHistoryPos >= execHistory.length) {
      execHistoryPos = 0
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    onKeyDown?.(e, query)
  }

  const handleSubmit = (value?: string) => {
    execHistoryPos = 0
    onSubmit(value)
  }

  const onTriggerParameterHints = () => {
    if (!monacoObjects.current) return

    const { editor } = monacoObjects?.current
    const model = editor.getModel()
    const { lineNumber = 0 } = editor.getPosition() ?? {}
    const lineContent = model?.getLineContent(lineNumber)?.trim() ?? ''
    const matchedCommand = REDIS_COMMANDS_ARRAY.find((command) => lineContent?.trim().startsWith(command)) ?? ''
    // trigger parameter hints only ones between command and arguments in the same line
    const isTriggerHints = lineContent.split(' ').length < (2 + matchedCommand.split(' ').length)

    if (isTriggerHints && !isWidgetOpen.current) {
      actionTriggerParameterHints(editor)
    }
  }

  const onTriggerContentWidget = (position: Nullable<monacoEditor.Position>, language: string = ''): monacoEditor.editor.IContentWidget => ({
    getId: () => SYNTAX_WIDGET_ID,
    getDomNode: () => createSyntaxWidget(`Use ${language} Editor`, 'Shift+Space'),
    getPosition: () => ({
      position,
      preference: [
        monacoEditor.editor.ContentWidgetPositionPreference.BELOW
      ]
    })
  })

  const onQuickHistoryAccess = () => {
    if (!monacoObjects.current) return
    const { editor } = monacoObjects?.current

    const position = editor.getPosition()
    if (
      position?.column !== 1
      || position?.lineNumber !== 1
      // @ts-ignore
      || editor.getContribution('editor.contrib.suggestController')?.model?.state
    ) return

    if (execHistory[execHistoryPos]) {
      const command = execHistory[execHistoryPos].command || ''
      editor.setValue(command)
      execHistoryPos++
    }
  }

  const onKeyDownMonaco = (e: monacoEditor.IKeyboardEvent) => {
    // trigger parameter hints
    if (
      e.keyCode === monacoEditor.KeyCode.Tab
      || e.keyCode === monacoEditor.KeyCode.Enter
      || (e.keyCode === monacoEditor.KeyCode.Space && e.ctrlKey && e.shiftKey)
      || (e.keyCode === monacoEditor.KeyCode.Space && !e.ctrlKey && !e.shiftKey)
    ) {
      onTriggerParameterHints()
    }

    if (
      e.keyCode === monacoEditor.KeyCode.UpArrow
    ) {
      onQuickHistoryAccess()
    }

    if (e.keyCode === monacoEditor.KeyCode.Enter || e.keyCode === monacoEditor.KeyCode.Space) {
      onExitSnippetMode()
    }
  }

  const onKeyChangeCursorMonaco = (e: monacoEditor.editor.ICursorPositionChangedEvent) => {
    if (!monacoObjects.current) return
    const { editor } = monacoObjects?.current
    const model = editor.getModel()

    isWidgetOpen.current && hideSyntaxWidget(editor)

    if (!model || isDedicatedEditorOpenRef.current) {
      return
    }

    const command = findCompleteQuery(model, e.position, REDIS_COMMANDS_SPEC, REDIS_COMMANDS_ARRAY)
    if (!command) {
      isWidgetEscaped.current = false
      return
    }

    const queryArgIndex = command.info?.arguments?.findIndex((arg) => arg.dsl) || -1
    const cursorPosition = command.commandCursorPosition || 0
    if (!command.args?.length || queryArgIndex < 0) {
      isWidgetEscaped.current = false
      return
    }

    const argIndex = findArgIndexByCursor(command.args, command.fullQuery, cursorPosition)
    if (argIndex === null) {
      isWidgetEscaped.current = false
      return
    }

    const queryArg = command.args[argIndex]
    const argDSL = command.info?.arguments?.[argIndex]?.dsl || ''

    if (queryArgIndex === argIndex && argInQuotesRegExp.test(queryArg)) {
      if (isWidgetEscaped.current) return
      const lang = DSLNaming[argDSL] ?? null
      lang && showSyntaxWidget(editor, e.position, lang)
      selectedArg.current = queryArg
      syntaxCommand.current = {
        ...command,
        lang: argDSL,
        argToReplace: queryArg
      }
    }
  }

  const onExitSnippetMode = () => {
    if (!monacoObjects.current) return
    const { editor } = monacoObjects?.current

    if (contribution?.isInSnippet?.()) {
      const { lineNumber = 0, column = 0 } = editor?.getPosition() ?? {}
      editor.setSelection(new monacoEditor.Selection(lineNumber, column, lineNumber, column))
      contribution?.cancel?.()
    }
  }

  const hideSyntaxWidget = (editor: monacoEditor.editor.IStandaloneCodeEditor) => {
    editor.removeContentWidget(onTriggerContentWidget(null))
    syntaxWidgetContext?.set(false)
    isWidgetOpen.current = false
  }

  const showSyntaxWidget = (
    editor: monacoEditor.editor.IStandaloneCodeEditor,
    position: monacoEditor.Position,
    language: string
  ) => {
    editor.addContentWidget(onTriggerContentWidget(position, language))
    isWidgetOpen.current = true
    syntaxWidgetContext?.set(true)
  }

  const onCancelDedicatedEditor = () => {
    setIsDedicatedEditorOpen(false)
    if (!monacoObjects.current) return
    const { editor } = monacoObjects?.current

    editor.updateOptions({ readOnly: false })
    triggerUpdateCursorPosition(editor)

    sendEventTelemetry({
      event: TelemetryEvent.WORKBENCH_NON_REDIS_EDITOR_CANCELLED,
      eventData: {
        databaseId: instanceId,
        lang: syntaxCommand.current.lang,
      }
    })
  }

  const updateArgFromDedicatedEditor = (value: string = '') => {
    if (!syntaxCommand.current || !monacoObjects.current) return
    const { editor } = monacoObjects?.current

    const model = editor.getModel()
    if (!model) return

    const wrapQuote = syntaxCommand.current.argToReplace[0]
    const replaceCommand = syntaxCommand.current.fullQuery.replace(
      syntaxCommand.current.argToReplace,
      `${wrapQuote}${value}${wrapQuote}`
    )
    editor.updateOptions({ readOnly: false })
    editor.executeEdits(null, [
      {
        range: new monacoEditor.Range(
          syntaxCommand.current.commandPosition.startLine,
          0,
          syntaxCommand.current.commandPosition.endLine,
          model.getLineLength(syntaxCommand.current.commandPosition.endLine) + 1
        ),
        text: replaceCommand
      }
    ])
    setIsDedicatedEditorOpen(false)
    triggerUpdateCursorPosition(editor)
    sendEventTelemetry({
      event: TelemetryEvent.WORKBENCH_NON_REDIS_EDITOR_SAVED,
      eventData: {
        databaseId: instanceId,
        lang: syntaxCommand.current.lang,
      }
    })
  }

  const editorDidMount = (
    editor: monacoEditor.editor.IStandaloneCodeEditor,
    monaco: typeof monacoEditor
  ) => {
    monacoObjects.current = { editor, monaco }

    // hack for exit from snippet mode after click Enter until no answer from monaco authors
    // https://github.com/microsoft/monaco-editor/issues/2756
    contribution = editor.getContribution<ISnippetController>('snippetController2')

    syntaxWidgetContext = editor.createContextKey(SYNTAX_CONTEXT_ID, false)
    editor.focus()
    setQueryEl(editor)

    editor.onKeyDown(onKeyDownMonaco)
    editor.onDidChangeCursorPosition(onKeyChangeCursorMonaco)

    setupMonacoRedisLang(monaco)
    editor.addAction(
      getMonacoAction(MonacoAction.Submit, (editor) => handleSubmit(editor.getValue()), monaco)
    )

    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Space, () => {
      onPressWidget()
    }, SYNTAX_CONTEXT_ID)

    editor.onMouseDown((e: monacoEditor.editor.IEditorMouseEvent) => {
      if ((e.target as monacoEditor.editor.IMouseTargetContentWidget)?.detail === SYNTAX_WIDGET_ID) {
        onPressWidget()
      }
    })

    editor.addCommand(monaco.KeyCode.Escape, () => {
      hideSyntaxWidget(editor)
      isWidgetEscaped.current = true
    }, SYNTAX_CONTEXT_ID)

    decorationCollection = editor.createDecorationsCollection()
  }

  const setupMonacoRedisLang = (monaco: typeof monacoEditor) => {
    disposeCompletionItemProvider = monaco.languages.registerCompletionItemProvider(
      MonacoLanguage.Redis,
      getRedisCompletionProvider(REDIS_COMMANDS_SPEC)
    ).dispose

    disposeSignatureHelpProvider = monaco.languages.registerSignatureHelpProvider(
      MonacoLanguage.Redis,
      getRedisSignatureHelpProvider(REDIS_COMMANDS_SPEC, REDIS_COMMANDS_ARRAY, isWidgetOpen)
    ).dispose
  }

  const options: monacoEditor.editor.IStandaloneEditorConstructionOptions = {
    tabCompletion: 'on',
    wordWrap: 'on',
    padding: { top: 10 },
    automaticLayout: true,
    formatOnPaste: false,
    glyphMargin: true,
    stickyScroll: {
      enabled: true,
      defaultModel: 'indentationModel'
    },
    suggest: {
      preview: true,
      showStatusBar: true,
      showIcons: false,
    },
    lineNumbersMinChars: 4
  }

  const isLoading = loading || processing

  return (
    <div className={styles.wrapper}>
      <div
        className={cx(styles.container, { [styles.disabled]: isDedicatedEditorOpen })}
        onKeyDown={handleKeyDown}
        role="textbox"
        tabIndex={0}
        data-testid="main-input-container-area"
      >
        <div className={styles.input} data-testid="query-input-container" ref={input}>
          <MonacoEditor
            language={MonacoLanguage.Redis as string}
            theme={theme === Theme.Dark ? 'dark' : 'light'}
            value={query}
            options={options}
            className={`${MonacoLanguage.Redis}-editor`}
            onChange={onChange}
            editorDidMount={editorDidMount}
          />
        </div>
        <div className={styles.queryFooter}>
          <QueryTutorials />
          <QueryActions
            isDisabled={isDedicatedEditorOpen}
            isLoading={isLoading}
            activeMode={activeMode}
            resultsMode={resultsMode}
            onChangeGroupMode={onChangeGroupMode}
            onChangeMode={onQueryChangeMode}
            onSubmit={handleSubmit}
          />
        </div>

      </div>
      {isDedicatedEditorOpen && (
        <DedicatedEditor
          initialHeight={input?.current?.scrollHeight || 0}
          langId={syntaxCommand.current.lang}
          query={selectedArg.current.replace(aroundQuotesRegExp, '')}
          onSubmit={updateArgFromDedicatedEditor}
          onCancel={onCancelDedicatedEditor}
        />
      )}
    </div>
  )
}

export default React.memo(Query)
