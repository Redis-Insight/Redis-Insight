import React from 'react'
import { EuiText } from '@elastic/eui'
import { isUndefined } from 'lodash'
import cx from 'classnames'
import { useSelector } from 'react-redux'

import { getApproximatePercentage, Maybe, Nullable } from 'uiSrc/utils'
import Divider from 'uiSrc/components/divider/Divider'
import { BulkActionsStatus, KeyTypes } from 'uiSrc/constants'
import GroupBadge from 'uiSrc/components/group-badge/GroupBadge'
import { overviewBulkActionsSelector } from 'uiSrc/slices/browser/bulkActions'
import styles from './styles.module.scss'

export interface Props {
  title?: string
  loading: boolean
  filter: Nullable<KeyTypes>
  status: Maybe<BulkActionsStatus>
  search: string
  children?: React.ReactElement
}

const BulkActionsInfo = (props: Props) => {
  const { children, loading, filter, search, status, title = 'Delete Keys with' } = props

  const { progress: { total = 0, scanned = 0 } = {} } = useSelector(overviewBulkActionsSelector) ?? {}

  return (
    <div className={styles.container} data-testid="bulk-actions-info">
      <div className={styles.header}>
        <EuiText color="subdued" className={styles.title}>{title}</EuiText>
        <EuiText color="subdued" className={styles.subTitle}>
          {filter && (
            <div className={styles.filter} data-testid="bulk-actions-info-filter">
              <span style={{ paddingRight: 6 }}>Key type:</span>
              <GroupBadge type={filter} className={styles.badge} />
            </div>
          )}
          <div className={styles.search} data-testid="bulk-actions-info-search">
            Pattern:
            <span className={styles.match}>{` ${search}`}</span>
          </div>
        </EuiText>
        {!isUndefined(status) && status !== BulkActionsStatus.Completed && status !== BulkActionsStatus.Aborted && (
          <EuiText color="subdued" className={styles.progress} data-testid="bulk-status-progress">
            In progress:
            <span>{` ${getApproximatePercentage(total, scanned)}`}</span>
          </EuiText>
        )}
        {status === BulkActionsStatus.Aborted && (
          <EuiText color="danger" className={styles.progress} data-testid="bulk-status-stopped">
            Stopped: {getApproximatePercentage(total, scanned)}
          </EuiText>
        )}
        {status === BulkActionsStatus.Completed && (
          <EuiText className={cx(styles.progress, styles.progressCompleted)} data-testid="bulk-status-completed">
            Action completed
          </EuiText>
        )}
      </div>
      <Divider colorVariable="separatorColor" className={styles.divider} />
      {loading && (
        <div className={styles.progressLine} data-testid="progress-line"><div style={{ width: `${(total ? scanned / total : 0) * 100}%` }} /></div>
      )}
      <div className={styles.children}>
        {children}
      </div>
    </div>
  )
}

export default BulkActionsInfo
