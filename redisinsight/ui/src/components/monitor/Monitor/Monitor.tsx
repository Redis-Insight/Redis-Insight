import React from 'react'
import cx from 'classnames'
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTextColor,
  EuiToolTip,
} from '@elastic/eui'
import { AutoSizer } from 'react-virtualized'

import { IMonitorDataPayload } from 'uiSrc/slices/interfaces'
import { ReactComponent as BanIcon } from 'uiSrc/assets/img/monitor/ban.svg'

import MonitorOutputList from '../MonitorOutputList'

import styles from './styles.module.scss'

export interface Props {
  items: IMonitorDataPayload[]
  error: string
  isStarted: boolean
  isRunning: boolean
  isShowHelper: boolean
  isShowCli: boolean
  scrollViewOnAppear: boolean
  handleRunMonitor: () => void
}

const Monitor = (props: Props) => {
  const {
    items = [],
    error = '',
    isRunning = false,
    isStarted = false,
    isShowHelper = false,
    isShowCli = false,
    handleRunMonitor = () => {}
  } = props

  const MonitorNotStarted = () => (
    <div className={styles.startContainer} data-testid="monitor-not-started">
      <div className={styles.startContent}>
        <EuiToolTip
          content="Start"
          display="inlineBlock"
        >
          <EuiButtonIcon
            iconType="play"
            className={styles.startTitleIcon}
            size="m"
            onClick={handleRunMonitor}
            aria-label="start monitor"
            data-testid="start-monitor"
          />
        </EuiToolTip>
        <div className={styles.startTitle}>Start Profiler</div>
        <EuiFlexGroup responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon
              className={cx(styles.iconWarning, 'warning--light')}
              type="alert"
              size="m"
              color="warning"
              aria-label="alert icon"
              style={{ paddingTop: 2 }}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTextColor color="warning" className="warning--light" style={{ paddingLeft: 4 }} data-testid="monitor-warning-message">
              Running Profiler will decrease throughput, avoid running it in production databases
            </EuiTextColor>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </div>
  )

  const MonitorError = () => (
    <div className={styles.startContainer} data-testid="monitor-error">
      <div className={cx(styles.startContent, styles.startContentError)}>
        <EuiFlexGroup responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon
              type={BanIcon}
              size="m"
              color="danger"
              aria-label="no permissions icon"
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTextColor color="danger" style={{ paddingLeft: 4 }} data-testid="monitor-error-message">
              { error }
            </EuiTextColor>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </div>
  )

  const isMonitorStopped = !!items?.length && !isRunning

  return (
    <>
      <div className={styles.container} data-testid="monitor">
        {(error && !isRunning)
          ? (<MonitorError />)
          : (
            <>
              {(!isStarted || (!isRunning && !items?.length)) && <MonitorNotStarted />}
              {!items?.length && isRunning && (
                <div data-testid="monitor-started" style={{ paddingTop: 10 }}>Profiler is started.</div>
              )}
            </>
          )}
        {isStarted && !!items?.length && (
          <div className={styles.content}>
            <AutoSizer>
              {({ width, height }) => (
                <>
                  <MonitorOutputList
                    width={width}
                    height={isMonitorStopped ? height - 30 : height}
                    items={items}
                    compressed={isShowCli || isShowHelper}
                  />
                  {isMonitorStopped && (
                    <div data-testid="monitor-stopped" style={{ width: 140, paddingTop: 15 }}>
                      Profiler is stopped.
                    </div>
                  )}
                </>
              )}
            </AutoSizer>
          </div>
        )}
      </div>
    </>
  )
}

export default React.memo(Monitor)
