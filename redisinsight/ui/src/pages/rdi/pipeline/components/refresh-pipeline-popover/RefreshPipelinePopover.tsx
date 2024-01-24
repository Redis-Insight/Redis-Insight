import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  EuiButton,
  EuiButtonIcon,
  EuiIcon,
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiOutsideClickDetector,
} from '@elastic/eui'
import { useDispatch, useSelector } from 'react-redux'

import { sendEventTelemetry, TelemetryEvent } from 'uiSrc/telemetry'
import { fetchRdiPipeline, rdiPipelineSelector } from 'uiSrc/slices/rdi/pipeline'

import styles from './styles.module.scss'

const RefreshPipelinePopover = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false)

  const { loading, data } = useSelector(rdiPipelineSelector)

  const { rdiInstanceId } = useParams<{ rdiInstanceId: string }>()
  const dispatch = useDispatch()

  const handleRefreshClick = () => {
    setIsPopoverOpen(false)
    dispatch(fetchRdiPipeline(rdiInstanceId))
  }

  const handleRefreshWarning = () => {
    setIsPopoverOpen(true)
    sendEventTelemetry({
      event: TelemetryEvent.RDI_PIPELINE_REFRESH_CLICKED,
      eventData: {
        id: rdiInstanceId,
        jobsNumber: data?.jobs?.length || 'none',
      }
    })
  }

  const handleClosePopover = () => {
    setIsPopoverOpen(false)
  }

  return (
    <EuiOutsideClickDetector
      onOutsideClick={handleClosePopover}
    >
      <EuiPopover
        id="refresh-pipeline-warning-popover"
        ownFocus
        anchorPosition="downCenter"
        isOpen={isPopoverOpen}
        closePopover={handleClosePopover}
        panelPaddingSize="m"
        display="inlineBlock"
        panelClassName={styles.panelPopover}
        button={(
          <EuiButtonIcon
            size="xs"
            iconSize="s"
            iconType="refresh"
            disabled={loading}
            onClick={handleRefreshWarning}
            className={styles.trigger}
            aria-labelledby="Refresh pipeline button"
            data-testid="refresh-pipeline-btn"
          />
        )}
      >
        <EuiFlexGroup alignItems="center" gutterSize="none">
          <EuiFlexItem grow={false}>
            <EuiIcon
              type="alert"
              className={styles.alertIcon}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText className={styles.popoverTitle}>Refresh a pipeline</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        <EuiText size="s">
          A new pipeline will be uploaded from the RDI instance,
          which may result in overwriting details displayed in RedisInsight.
        </EuiText>
        <EuiSpacer size="s" />
        <EuiText size="s">
          You can download the pipeline displayed to save it locally.
        </EuiText>
        <EuiSpacer size="m" />
        <EuiButton
          fill
          size="s"
          color="secondary"
          className={styles.popoverApproveBtn}
          onClick={handleRefreshClick}
          data-testid="refresh-pipeline-apply-btn"
        >
          Refresh
        </EuiButton>
      </EuiPopover>
    </EuiOutsideClickDetector>
  )
}

export default RefreshPipelinePopover
