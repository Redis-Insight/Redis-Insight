import React from 'react'

import { EuiLink, EuiText } from '@elastic/eui'
import { useDispatch } from 'react-redux'
import { useHistory, useParams } from 'react-router-dom'
import { findTutorialPath } from 'uiSrc/utils'
import { TutorialsIds } from 'uiSrc/constants'
import { openTutorialByPath } from 'uiSrc/slices/panels/sidePanels'
import { sendEventTelemetry, TELEMETRY_EMPTY_VALUE, TelemetryEvent } from 'uiSrc/telemetry'

import styles from './styles.module.scss'

const TUTORIALS = [
  {
    id: TutorialsIds.IntroToSearch,
    title: 'Intro to search'
  },
  {
    id: TutorialsIds.BasicRedisUseCases,
    title: 'Basic use cases'
  },
  {
    id: TutorialsIds.IntroVectorSearch,
    title: 'Intro to vector search'
  },
]

const QueryTutorials = () => {
  const dispatch = useDispatch()
  const history = useHistory()
  const { instanceId } = useParams<{ instanceId: string }>()

  const handleClickTutorial = (id: string) => {
    const tutorialPath = findTutorialPath({ id })
    dispatch(openTutorialByPath(tutorialPath, history, true))

    sendEventTelemetry({
      event: TelemetryEvent.EXPLORE_PANEL_TUTORIAL_OPENED,
      eventData: {
        path: tutorialPath,
        databaseId: instanceId || TELEMETRY_EMPTY_VALUE,
        source: 'advanced_workbench_editor',
      }
    })
  }

  return (
    <div className={styles.container}>
      <EuiText className={styles.title}>
        Tutorials:
      </EuiText>
      {TUTORIALS.map(({ id, title }) => (
        <EuiLink
          role="button"
          key={id}
          className={styles.tutorialLink}
          onClick={() => handleClickTutorial(id)}
          data-testid={`wb-tutorials-link_${id}`}
        >
          {title}
        </EuiLink>
      ))}
    </div>
  )
}

export default QueryTutorials
