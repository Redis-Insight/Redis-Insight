import React from 'react'
import { useSelector } from 'react-redux'
import { EuiLoadingContent } from '@elastic/eui'

import { appRedisCommandsSelector } from 'uiSrc/slices/app/redis-commands'
import { RunQueryMode, ResultsMode } from 'uiSrc/slices/interfaces/workbench'
import Query from './Query'
import styles from './Query/styles.module.scss'

export interface Props {
  query: string
  activeMode: RunQueryMode
  resultsMode?: ResultsMode
  setQuery: (script: string) => void
  setQueryEl: Function
  onKeyDown?: (e: React.KeyboardEvent, script: string) => void
  onSubmit: (value?: string) => void
  onQueryChangeMode: () => void
  onChangeGroupMode: () => void
}

const QueryWrapper = (props: Props) => {
  const {
    query = '',
    activeMode,
    resultsMode,
    setQuery,
    setQueryEl,
    onKeyDown,
    onSubmit,
    onQueryChangeMode,
    onChangeGroupMode
  } = props
  const {
    loading: isCommandsLoading,
  } = useSelector(appRedisCommandsSelector)

  const Placeholder = (
    <div className={styles.containerPlaceholder}>
      <div>
        <EuiLoadingContent lines={2} className="fluid" />
      </div>
    </div>
  )
  return isCommandsLoading ? (
    Placeholder
  ) : (
    <Query
      query={query}
      activeMode={activeMode}
      resultsMode={resultsMode}
      setQuery={setQuery}
      setQueryEl={setQueryEl}
      onKeyDown={onKeyDown}
      onSubmit={onSubmit}
      onQueryChangeMode={onQueryChangeMode}
      onChangeGroupMode={onChangeGroupMode}
    />
  )
}

export default React.memo(QueryWrapper)
