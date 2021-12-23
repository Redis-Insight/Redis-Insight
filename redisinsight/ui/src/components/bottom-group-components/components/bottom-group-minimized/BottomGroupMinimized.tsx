import React, { useEffect } from 'react'
import cx from 'classnames'
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui'
import { useDispatch, useSelector } from 'react-redux'
import { useParams } from 'react-router-dom'

import {
  toggleCli,
  toggleCliHelper,
  cliSettingsSelector,
  clearSearchingCommand,
  setCliEnteringCommand,
} from 'uiSrc/slices/cli/cli-settings'
import { sendEventTelemetry, TelemetryEvent } from 'uiSrc/telemetry'

import styles from '../../styles.module.scss'

const BottomGroupMinimized = () => {
  const { isShowHelper, isShowCli } = useSelector(cliSettingsSelector)
  const { instanceId = '' } = useParams<{ instanceId: string }>()
  const dispatch = useDispatch()

  useEffect(() =>
    () => {
      dispatch(clearSearchingCommand())
      dispatch(setCliEnteringCommand())
    }, [])

  const handleExpandCli = () => {
    sendEventTelemetry({
      event: isShowCli ? TelemetryEvent.CLI_MINIMIZED : TelemetryEvent.CLI_OPENED,
      eventData: {
        databaseId: instanceId
      }
    })
    dispatch(toggleCli())
  }

  const handleExpandHelper = () => {
    sendEventTelemetry({
      event: isShowHelper ? TelemetryEvent.COMMAND_HELPER_MINIMIZED : TelemetryEvent.COMMAND_HELPER_OPENED,
      eventData: {
        databaseId: instanceId
      }
    })
    dispatch(toggleCliHelper())
  }

  return (
    <div className={styles.containerMinimized}>
      <EuiFlexGroup
        gutterSize="none"
        alignItems="center"
        responsive={false}
        style={{ height: '100%' }}
      >
        <EuiFlexItem
          className={styles.componentBadgeItem}
          grow={false}
          onClick={handleExpandCli}
          data-testid="expand-cli"
        >
          <EuiBadge className={cx(styles.componentBadge, { [styles.active]: isShowCli })}>
            <EuiIcon type="console" size="m" />
            <span>CLI</span>
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem
          className={styles.componentBadgeItem}
          grow={false}
          onClick={handleExpandHelper}
          data-testid="expand-command-helper"
        >
          <EuiBadge className={cx(styles.componentBadge, { [styles.active]: isShowHelper })}>
            <EuiIcon type="documents" size="m" />
            <span>Command Helper</span>
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  )
}

export default BottomGroupMinimized
