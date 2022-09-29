import React, { useEffect, useState } from 'react'
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, EuiToolTip } from '@elastic/eui'
import { useSelector } from 'react-redux'
import { isUndefined } from 'lodash'

import { millisecondsFormat } from 'uiSrc/utils'
import { numberWithSpaces, nullableNumberWithSpaces } from 'uiSrc/utils/numbers'
import { keysDataSelector } from 'uiSrc/slices/browser/keys'
import { getApproximatePercentage } from 'uiSrc/utils/validations'
import { overviewBulkActionsSelector, summaryBulkActionsSelector } from 'uiSrc/slices/browser/bulkActions'
import styles from './styles.module.scss'

const BulkDeleteSummary = () => {
  const [title, setTitle] = useState<string>('')
  const { scanned = 0, total = 0, keys } = useSelector(keysDataSelector)
  const { processed, succeed, failed } = useSelector(summaryBulkActionsSelector) ?? {}
  const { duration = 0, status } = useSelector(overviewBulkActionsSelector) ?? {}

  useEffect(() => {
    if (scanned < total && !keys.length) {
      setTitle('Expected amount: N/A')
      return
    }

    const approximateCount = scanned < total ? (keys.length * total) / scanned : keys.length
    setTitle(`Expected amount: ${scanned < total ? '~' : ''}${nullableNumberWithSpaces(Math.round(approximateCount))} keys`)
  }, [scanned, total, keys])

  return (
    <div className={styles.container}>
      {isUndefined(status) && (
        <>
          <EuiText className={styles.title}>
            <span>{title}</span>
            <EuiToolTip
              position="right"
              anchorClassName={styles.tooltipAnchor}
              content="Expected amount is estimated based on
              the number of keys scanned and the scan percentage.
              The final number may be different."
            >
              <EuiIcon color="subdued" type="iInCircle" data-testid="bulk-delete-tooltip" />
            </EuiToolTip>
          </EuiText>
          <EuiText color="subdued" className={styles.summaryApproximate} data-testid="bulk-delete-summary">
            {`Scanned ${getApproximatePercentage(total, scanned)} `}
            {`(${numberWithSpaces(scanned)}/${nullableNumberWithSpaces(total)}) `}
            {`and found ${numberWithSpaces(keys.length)} keys`}
          </EuiText>
        </>
      )}
      {!isUndefined(status) && (
        <EuiFlexGroup alignItems="flexStart" direction="row" gutterSize="none" responsive={false} className={styles.summary} data-testid="bulk-delete-completed-summary">
          <EuiFlexItem grow={false}>
            <EuiText className={styles.summaryValue}>{numberWithSpaces(processed)}</EuiText>
            <EuiText color="subdued" className={styles.summaryLabel}>Keys Processed</EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText className={styles.summaryValue}>{numberWithSpaces(succeed)}</EuiText>
            <EuiText color="subdued" className={styles.summaryLabel}>Success</EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText className={styles.summaryValue}>{numberWithSpaces(failed)}</EuiText>
            <EuiText color="subdued" className={styles.summaryLabel}>Errors</EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText className={styles.summaryValue}>{millisecondsFormat(duration, 'H:mm:ss.SSS')}</EuiText>
            <EuiText color="subdued" className={styles.summaryLabel}>Time Taken</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </div>
  )
}

export default BulkDeleteSummary
