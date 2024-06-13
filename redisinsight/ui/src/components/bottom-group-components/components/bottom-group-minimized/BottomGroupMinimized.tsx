import React, { useEffect } from 'react'
import cx from 'classnames'
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiHideFor, EuiShowFor } from '@elastic/eui'
import { useDispatch, useSelector } from 'react-redux'
import { useParams } from 'react-router-dom'
import { EXTERNAL_LINKS } from 'uiSrc/constants/links'

import {
  clearSearchingCommand,
  cliSettingsSelector,
  setCliEnteringCommand,
  toggleCli,
  toggleCliHelper,
  toggleHideCliHelper,
} from 'uiSrc/slices/cli/cli-settings'
import { sendEventTelemetry, TelemetryEvent } from 'uiSrc/telemetry'
import { monitorSelector, toggleHideMonitor, toggleMonitor } from 'uiSrc/slices/cli/monitor'
import SurveyIcon from 'uiSrc/assets/img/survey_icon.svg'
import FeatureFlagComponent from 'uiSrc/components/feature-flag-component'
import { FeatureFlags } from 'uiSrc/constants'

import styles from '../../styles.module.scss'

const BottomGroupMinimized = () => {
  const { instanceId = '' } = useParams<{ instanceId: string }>()
  const {
    isShowCli,
    cliClientUuid,
    isShowHelper,
    isMinimizedHelper,
  } = useSelector(cliSettingsSelector)
  const {
    isShowMonitor,
    isMinimizedMonitor,
  } = useSelector(monitorSelector)
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
    isMinimizedHelper && dispatch(toggleHideCliHelper())
    dispatch(toggleCliHelper())
  }

  const handleExpandMonitor = () => {
    sendEventTelemetry({
      event: isShowMonitor ? TelemetryEvent.PROFILER_MINIMIZED : TelemetryEvent.PROFILER_OPENED,
      eventData: { databaseId: instanceId }
    })
    isMinimizedMonitor && dispatch(toggleHideMonitor())
    dispatch(toggleMonitor())
  }

  const onClickSurvey = () => {
    sendEventTelemetry({
      event: TelemetryEvent.USER_SURVEY_LINK_CLICKED
    })
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
          <EuiBadge className={cx(styles.componentBadge, { [styles.active]: isShowCli || cliClientUuid })}>
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
          <EuiBadge className={cx(
            styles.componentBadge,
            { [styles.active]: isShowHelper || isMinimizedHelper }
          )}
          >
            <EuiIcon type="documents" size="m" />
            <span>Command Helper</span>
          </EuiBadge>
        </EuiFlexItem>
        <FeatureFlagComponent name={FeatureFlags.profiler}>
          <EuiFlexItem
            className={styles.componentBadgeItem}
            grow={false}
            onClick={handleExpandMonitor}
            data-testid="expand-monitor"
          >
            <EuiBadge className={cx(
              styles.componentBadge,
              { [styles.active]: isShowMonitor || isMinimizedMonitor }
            )}
            >
              <EuiIcon type="inspect" size="m" />
              <span>Profiler</span>
            </EuiBadge>
          </EuiFlexItem>
        </FeatureFlagComponent>
      </EuiFlexGroup>
      <a
        className={styles.surveyLink}
        target="_blank"
        rel="noreferrer"
        href={EXTERNAL_LINKS.userSurvey}
        onClick={onClickSurvey}
        data-testid="user-survey-link"
      >
        <>
          <EuiIcon type={SurveyIcon} className={styles.surveyIcon} />
          <EuiHideFor sizes={['xs', 's']}>
            <span>Let us know what you think</span>
          </EuiHideFor>
          <EuiShowFor sizes={['xs', 's']}>
            <span>Survey</span>
          </EuiShowFor>
        </>
      </a>
    </div>
  )
}

export default BottomGroupMinimized
