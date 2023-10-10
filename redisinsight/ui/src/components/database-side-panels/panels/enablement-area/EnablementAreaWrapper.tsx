import { EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader, EuiSpacer } from '@elastic/eui'
import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useHistory, useParams } from 'react-router-dom'
import { IInternalPage } from 'uiSrc/pages/workbench/contexts/enablementAreaContext'
import { workbenchGuidesSelector } from 'uiSrc/slices/workbench/wb-guides'
import { workbenchTutorialsSelector } from 'uiSrc/slices/workbench/wb-tutorials'
import { fetchCustomTutorials, workbenchCustomTutorialsSelector } from 'uiSrc/slices/workbench/wb-custom-tutorials'
import { sendEventTelemetry, TelemetryEvent } from 'uiSrc/telemetry'
import { setWorkbenchEAOpened, setWorkbenchScript } from 'uiSrc/slices/app/context'
import { ANIMATION_INSIGHT_PANEL_MS } from 'uiSrc/constants/recommendations'
import { Pages, CodeButtonParams, ExecuteButtonMode } from 'uiSrc/constants'
import { sendWbQueryAction } from 'uiSrc/slices/workbench/wb-results'
import { getTutorialSection } from './EnablementArea/utils'
import EnablementArea from './EnablementArea'

import styles from './styles.module.scss'

export interface Props {
  // scriptEl: Nullable<monacoEditor.editor.IStandaloneCodeEditor>
  // setScript: (script: string) => void
  // onSubmit: (query: string, commandId?: Nullable<string>, executeParams?: CodeButtonParams) => void
  // isCodeBtnDisabled?: boolean
}

const EnablementAreaWrapper = (props: Props) => {
  // const { scriptEl, setScript, isCodeBtnDisabled, onSubmit } = props

  const { loading: loadingGuides, items: guides } = useSelector(workbenchGuidesSelector)
  const { loading: loadingTutorials, items: tutorials } = useSelector(workbenchTutorialsSelector)
  const { loading: loadingCustomTutorials, items: customTutorials } = useSelector(workbenchCustomTutorialsSelector)

  const [isOpenInProgress, setIsOpenInProgress] = useState<boolean>(false)

  const { instanceId = '' } = useParams<{ instanceId: string }>()
  const dispatch = useDispatch()
  const history = useHistory()

  useEffect(() => {
    if (ANIMATION_INSIGHT_PANEL_MS > 0) {
      setIsOpenInProgress(true)
      setTimeout(() => setIsOpenInProgress(false), ANIMATION_INSIGHT_PANEL_MS)
    }

    dispatch(fetchCustomTutorials())
  }, [])

  const sendEventButtonClickedTelemetry = (data?: Record<string, any>) => {
    sendEventTelemetry({
      event: TelemetryEvent.EXPLORE_PANEL_COMMAND_CLICKED,
      eventData: {
        databaseId: instanceId,
        ...data,
      }
    })
  }

  const openScript = (
    script: string,
    execute: { mode?: ExecuteButtonMode, params?: CodeButtonParams } = { mode: ExecuteButtonMode.Manual },
    file?: { path?: string, name?: string, source?: string, sectionTitle?: string }
  ) => {
    sendEventButtonClickedTelemetry(file)

    if (execute.mode === ExecuteButtonMode.Auto) {
      dispatch(sendWbQueryAction(script, null, execute.params))
      return
    }

    dispatch(setWorkbenchScript(script))
    history.push({ pathname: Pages.workbench(instanceId), search: globalThis.location.search })

    // setScript(script)
    // setTimeout(() => {
    //   scriptEl?.focus()
    //   scriptEl?.setSelection(new monaco.Selection(0, 0, 0, 0))
    // }, 0)
  }

  const onOpenInternalPage = ({ path, manifestPath }: IInternalPage) => {
    sendEventTelemetry({
      event: TelemetryEvent.WORKBENCH_ENABLEMENT_AREA_GUIDE_OPENED,
      eventData: {
        path,
        section: getTutorialSection(manifestPath),
        databaseId: instanceId,
        source: 'Workbench',
      }
    })
  }

  return (
    <EuiFlyout
      paddingSize="none"
      className={styles.content}
      ownFocus
      size="476px"
      onClose={() => dispatch(setWorkbenchEAOpened(false))}
      data-testid="insights-panel"
    >
      <EuiFlyoutHeader className={styles.header}>
        <EuiSpacer size="xxl" />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EnablementArea
          guides={guides}
          tutorials={tutorials}
          customTutorials={customTutorials}
          loading={loadingGuides || loadingTutorials || loadingCustomTutorials || isOpenInProgress}
          openScript={openScript}
          onOpenInternalPage={onOpenInternalPage}
          isCodeBtnDisabled={false}
        />
      </EuiFlyoutBody>
    </EuiFlyout>
  )
}

export default React.memo(EnablementAreaWrapper)
