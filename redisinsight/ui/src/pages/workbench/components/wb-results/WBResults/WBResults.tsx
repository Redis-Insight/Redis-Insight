import React from 'react'
import cx from 'classnames'
import {
  EuiButtonEmpty, EuiProgress,
} from '@elastic/eui'

import { CodeButtonParams } from 'uiSrc/constants'
import { ProfileQueryType } from 'uiSrc/pages/workbench/constants'
import { generateProfileQueryForCommand } from 'uiSrc/pages/workbench/utils'
import { Nullable } from 'uiSrc/utils'
import QueryCard from 'uiSrc/components/query-card'
import { CommandExecutionUI } from 'uiSrc/slices/interfaces'
import { RunQueryMode, ResultsMode } from 'uiSrc/slices/interfaces/workbench'

import WbNoResultsMessage from '../../wb-no-results-message'

import styles from './styles.module.scss'

export interface Props {
  isResultsLoaded: boolean
  items: CommandExecutionUI[]
  clearing: boolean
  processing: boolean
  activeMode: RunQueryMode
  activeResultsMode?: ResultsMode
  scrollDivRef: React.Ref<HTMLDivElement>
  onQueryReRun: (query: string, commandId?: Nullable<string>, executeParams?: CodeButtonParams) => void
  onQueryDelete: (commandId: string) => void
  onAllQueriesDelete: () => void
  onQueryOpen: (commandId: string) => void
  onQueryProfile: (query: string, commandId?: Nullable<string>, executeParams?: CodeButtonParams) => void
}
const WBResults = (props: Props) => {
  const {
    isResultsLoaded,
    items = [],
    clearing,
    processing,
    activeMode,
    activeResultsMode,
    onQueryReRun,
    onQueryProfile,
    onQueryDelete,
    onAllQueriesDelete,
    onQueryOpen,
    scrollDivRef
  } = props

  const handleQueryProfile = (
    profileType: ProfileQueryType,
    commandExecution: { command: string, mode?: RunQueryMode, resultsMode?: ResultsMode }
  ) => {
    const { command, mode, resultsMode } = commandExecution
    const profileQuery = generateProfileQueryForCommand(command, profileType)
    if (profileQuery) {
      onQueryProfile(
        profileQuery,
        null,
        { mode, results: resultsMode, clearEditor: false, },
      )
    }
  }

  return (
    <div className={styles.wrapper}>
      {!isResultsLoaded && (
        <EuiProgress
          color="primary"
          size="xs"
          position="absolute"
          data-testid="progress-wb-history"
        />
      )}
      {!!items?.length && (
        <div className={styles.header}>
          <EuiButtonEmpty
            size="s"
            iconType="trash"
            className={styles.clearAllBtn}
            onClick={() => onAllQueriesDelete?.()}
            disabled={clearing || processing}
            data-testid="clear-history-btn"
          >
            Clear Results
          </EuiButtonEmpty>
        </div>
      )}
      <div className={cx(styles.container)}>
        <div ref={scrollDivRef} />
        {items?.length ? items.map((
          {
            command = '',
            isOpen = false,
            result = undefined,
            summary = undefined,
            id = '',
            loading,
            createdAt,
            mode,
            resultsMode,
            emptyCommand,
            isNotStored,
            executionTime,
            db,
          }
        ) => (
          <QueryCard
            id={id}
            key={id}
            isOpen={isOpen}
            result={result}
            summary={summary}
            clearing={clearing}
            loading={loading}
            command={command}
            createdAt={createdAt}
            activeMode={activeMode}
            emptyCommand={emptyCommand}
            isNotStored={isNotStored}
            executionTime={executionTime}
            mode={mode}
            activeResultsMode={activeResultsMode}
            resultsMode={resultsMode}
            db={db}
            onQueryOpen={() => onQueryOpen(id)}
            onQueryProfile={(profileType) => handleQueryProfile(
              profileType,
              { command, mode, resultsMode },
            )}
            onQueryReRun={() => onQueryReRun(
              command,
              null,
              { mode, results: resultsMode, clearEditor: false, },
            )}
            onQueryDelete={() => onQueryDelete(id)}
          />
        )) : null}
        {(isResultsLoaded && !items.length) && (<WbNoResultsMessage />)}
      </div>
    </div>
  )
}

export default React.memo(WBResults)
