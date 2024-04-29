import React, { useState } from 'react'
import {
  EuiIcon,
  EuiModal,
  EuiModalBody,
  EuiText,
  EuiTitle,
  keys,
} from '@elastic/eui'
import { useDispatch, useSelector } from 'react-redux'
import { useParams } from 'react-router-dom'

import { TelemetryEvent, sendEventTelemetry } from 'uiSrc/telemetry'
import { fetchRdiPipeline, setPipeline } from 'uiSrc/slices/rdi/pipeline'
import { appContextPipelineManagement, setPipelineDialogState } from 'uiSrc/slices/app/context'
import UploadModal from 'uiSrc/pages/rdi/pipeline-management/components/upload-modal/UploadModal'
import UploadIcon from 'uiSrc/assets/img/rdi/upload_from_server.svg?react'

import styles from './styles.module.scss'

export const EMPTY_PIPELINE = {
  config: '',
  jobs: []
}

export enum PipelineSourceOptions {
  SERVER = 'download from server',
  FILE = 'upload from file',
  NEW = 'new pipeline',
}

const SourcePipelineDialog = () => {
  const [isShowDownloadDialog, setIsShowDownloadDialog] = useState(false)
  const { rdiInstanceId } = useParams<{ rdiInstanceId: string }>()

  const { isOpenDialog } = useSelector(appContextPipelineManagement)

  const dispatch = useDispatch()

  const onSelect = (option: PipelineSourceOptions) => {
    sendEventTelemetry({
      event: TelemetryEvent.RDI_START_OPTION_SELECTED,
      eventData: {
        id: rdiInstanceId,
        option,
      },
    })
  }

  const onLoadPipeline = () => {
    dispatch(fetchRdiPipeline(rdiInstanceId))
    onSelect(PipelineSourceOptions.SERVER)
    dispatch(setPipelineDialogState(false))
  }

  const onStartNewPipeline = () => {
    dispatch(setPipeline(EMPTY_PIPELINE))
    onSelect(PipelineSourceOptions.NEW)
    dispatch(setPipelineDialogState(false))
  }

  const handleCloseDialog = () => {
    dispatch(setPipeline(EMPTY_PIPELINE))
    dispatch(setPipelineDialogState(false))
  }

  const onUploadClick = () => {
    setIsShowDownloadDialog(true)
    onSelect(PipelineSourceOptions.FILE)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, callback: () => void) => {
    if (event.key === keys.ENTER) callback()
  }

  if (isShowDownloadDialog) {
    return (
      <UploadModal
        onClose={() => dispatch(setPipelineDialogState(false))}
        visible={isShowDownloadDialog}
      />
    )
  }

  if (!isOpenDialog) {
    return null
  }

  return (
    <EuiModal className={styles.container} onClose={handleCloseDialog} data-testid="rdi-pipeline-source-dialog">
      <EuiModalBody>
        <div className={styles.content}>
          <EuiTitle size="s">
            <h3 className={styles.title}>Start with your pipeline</h3>
          </EuiTitle>
          <div className={styles.actions}>
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(event) => onKeyDown(event, onLoadPipeline)}
              onClick={onLoadPipeline}
              className={styles.action}
              data-testid="server-source-pipeline-dialog"
            >
              <EuiIcon type={UploadIcon} size="xl" className={styles.icon} />
              <EuiText className={styles.text}>Upload from server</EuiText>
            </div>
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(event) => onKeyDown(event, onUploadClick)}
              onClick={onUploadClick}
              className={styles.action}
              data-testid="file-source-pipeline-dialog"
            >
              <EuiIcon type="exportAction" size="xl" className={styles.icon} />
              <EuiText className={styles.text}>Upload from file</EuiText>
            </div>
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(event) => onKeyDown(event, onStartNewPipeline)}
              onClick={onStartNewPipeline}
              className={styles.action}
              data-testid="new-source-pipeline-dialog"
            >
              <EuiIcon type="document" size="xl" className={styles.icon} />
              <EuiText className={styles.text}>Create new pipeline</EuiText>
            </div>
          </div>
        </div>
      </EuiModalBody>
    </EuiModal>
  )
}

export default SourcePipelineDialog
