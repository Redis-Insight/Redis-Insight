import React, { useRef } from 'react'

import cx from 'classnames'
import { EuiButton, EuiSpacer, EuiText, EuiToolTip } from '@elastic/eui'
import { ResultsMode, RunQueryMode } from 'uiSrc/slices/interfaces'
import { KEYBOARD_SHORTCUTS } from 'uiSrc/constants'
import { KeyboardShortcut } from 'uiSrc/components'
import { isGroupMode } from 'uiSrc/utils'

import GroupModeIcon from 'uiSrc/assets/img/icons/group_mode.svg?react'
import RawModeIcon from 'uiSrc/assets/img/icons/raw_mode.svg?react'

import Divider from 'uiSrc/components/divider/Divider'
import styles from './styles.module.scss'

export interface Props {
  onChangeMode: () => void
  onChangeGroupMode: () => void
  onSubmit: () => void
  activeMode: RunQueryMode
  resultsMode?: ResultsMode
  isLoading?: boolean
  isDisabled?: boolean
}

const QueryActions = (props: Props) => {
  const {
    isLoading,
    isDisabled,
    activeMode,
    resultsMode,
    onChangeMode,
    onChangeGroupMode,
    onSubmit,
  } = props
  const runTooltipRef = useRef<EuiToolTip>(null)

  const KeyBoardTooltipContent = KEYBOARD_SHORTCUTS?.workbench?.runQuery && (
    <>
      <EuiText
        className={styles.tooltipText}
        size="s"
      >
        {KEYBOARD_SHORTCUTS.workbench.runQuery?.label}:
      </EuiText>
      <EuiSpacer size="s" />
      <KeyboardShortcut
        badgeTextClassName={styles.tooltipText}
        separator={KEYBOARD_SHORTCUTS?._separator}
        items={KEYBOARD_SHORTCUTS.workbench.runQuery.keys}
      />
    </>
  )

  return (
    <div className={cx(styles.actions, { [styles.disabledActions]: isDisabled })}>
      <EuiToolTip
        position="left"
        content="Enables the raw output mode"
        data-testid="change-mode-tooltip"
      >
        <EuiButton
          fill
          size="s"
          color="secondary"
          onClick={() => onChangeMode()}
          iconType={RawModeIcon}
          disabled={isLoading}
          className={cx(styles.btn, styles.textBtn, { [styles.activeBtn]: activeMode === RunQueryMode.Raw })}
          data-testid="btn-change-mode"
        >
          Raw mode
        </EuiButton>
      </EuiToolTip>
      <EuiToolTip
        position="left"
        content={(
          <>
            Groups the command results into a single window.
            <br />
            When grouped, the results can be visualized only in the text format.
          </>
        )}
        data-testid="group-results-tooltip"
      >
        <EuiButton
          fill
          size="s"
          color="secondary"
          onClick={() => onChangeGroupMode()}
          disabled={isLoading}
          iconType={GroupModeIcon}
          className={cx(styles.btn, styles.textBtn, { [styles.activeBtn]: isGroupMode(resultsMode) })}
          data-testid="btn-change-group-mode"
        >
          Group results
        </EuiButton>
      </EuiToolTip>
      <Divider orientation="vertical" colorVariable="separatorColor" className={styles.divider} />
      <EuiToolTip
        ref={runTooltipRef}
        position="left"
        content={isLoading ? 'Please wait while the commands are being executed…' : KeyBoardTooltipContent}
        data-testid="run-query-tooltip"
      >
        <EuiButton
          onClick={() => {
            onSubmit()
            setTimeout(() => runTooltipRef?.current?.hideToolTip?.(), 0)
          }}
          isLoading={isLoading}
          disabled={isLoading}
          iconType="playFilled"
          className={cx(styles.btn, styles.submitButton)}
          aria-label="submit"
          data-testid="btn-submit"
        >
          Run
        </EuiButton>
      </EuiToolTip>
    </div>
  )
}

export default QueryActions
