import React from 'react'
import {
  EuiTitle,
  EuiSpacer,
  EuiImage,
  EuiButtonEmpty,
} from '@elastic/eui'
import { useDispatch, useSelector } from 'react-redux'
import { useHistory } from 'react-router-dom'
import TelescopeImg from 'uiSrc/assets/img/telescope-dark.svg'

import { findTutorialPath } from 'uiSrc/utils'
import { openTutorialByPath, sidePanelsSelector } from 'uiSrc/slices/panels/sidePanels'
import { SidePanels } from 'uiSrc/slices/interfaces/insights'
import { KeyViewType, SearchMode } from 'uiSrc/slices/interfaces/keys'
import { changeKeyViewType, fetchKeys, keysSelector } from 'uiSrc/slices/browser/keys'
import { SCAN_TREE_COUNT_DEFAULT } from 'uiSrc/constants/api'
import { TutorialsIds } from 'uiSrc/constants'

import LoadSampleData from '../load-sample-data'

import styles from './styles.module.scss'

export interface Props {
  onAddKeyPanel: (value: boolean) => void
}

const NoKeysFound = (props: Props) => {
  const { onAddKeyPanel } = props
  const { openedPanel } = useSelector(sidePanelsSelector)
  const { viewType } = useSelector(keysSelector)

  const dispatch = useDispatch()
  const history = useHistory()

  const onSuccessLoadData = () => {
    if (openedPanel !== SidePanels.AiAssistant) {
      const tutorialPath = findTutorialPath({ id: TutorialsIds.RedisUseCases })
      dispatch(openTutorialByPath(tutorialPath, history, true))
    }

    if (viewType === KeyViewType.Browser) {
      dispatch(changeKeyViewType(KeyViewType.Tree))
    }

    dispatch(fetchKeys({
      searchMode: SearchMode.Pattern,
      cursor: '0',
      count: SCAN_TREE_COUNT_DEFAULT
    }))
  }

  return (
    <div className={styles.container} data-testid="no-result-found-msg">
      <EuiImage
        className={styles.img}
        src={TelescopeImg}
        alt="no results image"
      />
      <EuiSpacer size="l" />
      <EuiTitle className={styles.title} size="s">
        <span>Let&apos;s start working</span>
      </EuiTitle>
      <EuiSpacer size="l" />
      <div className={styles.actions}>
        <LoadSampleData onSuccess={onSuccessLoadData} />
        <EuiButtonEmpty
          onClick={() => onAddKeyPanel(true)}
          className={styles.addKey}
          data-testid="add-key-msg-btn"
        >
          + Add key manually
        </EuiButtonEmpty>
      </div>
    </div>
  )
}

export default NoKeysFound
