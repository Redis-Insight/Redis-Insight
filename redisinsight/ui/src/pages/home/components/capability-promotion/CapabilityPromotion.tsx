import React from 'react'
import { EuiIcon, EuiText } from '@elastic/eui'
import cx from 'classnames'
import { useDispatch, useSelector } from 'react-redux'
import { useHistory } from 'react-router-dom'
import { filter } from 'lodash'

import {
  changeSelectedTab,
  openTutorialByPath,
  sidePanelsSelector, toggleSidePanel,
} from 'uiSrc/slices/panels/sidePanels'
import { sendEventTelemetry, TELEMETRY_EMPTY_VALUE, TelemetryEvent } from 'uiSrc/telemetry'
import { guideLinksSelector } from 'uiSrc/slices/content/guide-links'
import GUIDE_ICONS from 'uiSrc/components/explore-guides/icons'
import { findTutorialPath } from 'uiSrc/utils'
import { InsightsPanelTabs, SidePanels } from 'uiSrc/slices/interfaces/insights'
import { TutorialsIds } from 'uiSrc/constants'
import styles from './styles.module.scss'

export interface Props {
  mode?: 'reduced' | 'wide'
  wrapperClassName?: string
  capabilityIds?: string[]
}

const displayedCapabilityIds = [TutorialsIds.IntroToSearch, TutorialsIds.IntroToJSON]

const CapabilityPromotion = (props: Props) => {
  const { mode = 'wide', wrapperClassName, capabilityIds = displayedCapabilityIds } = props
  const { data: dataInit } = useSelector(guideLinksSelector)
  const { openedPanel } = useSelector(sidePanelsSelector)
  const isInsightsOpen = openedPanel === SidePanels.Insights

  const dispatch = useDispatch()
  const history = useHistory()

  // display only RediSearch and JSON. In the future will be configured via github
  const data = filter(dataInit, ({ tutorialId }) => capabilityIds.includes(tutorialId))

  const sendTelemetry = (id?: string) => {
    sendEventTelemetry({
      event: isInsightsOpen ? TelemetryEvent.INSIGHTS_PANEL_CLOSED : TelemetryEvent.INSIGHTS_PANEL_OPENED,
      eventData: {
        databaseId: TELEMETRY_EMPTY_VALUE,
        source: 'home page',
        tutorialId: id || undefined,
        tab: id ? undefined : InsightsPanelTabs.Explore,
      },
    })
  }

  const onClickTutorial = (id: string) => {
    const tutorialPath = findTutorialPath({ id: id ?? '' })
    dispatch(openTutorialByPath(tutorialPath ?? '', history))

    if (isInsightsOpen) {
      return
    }

    sendTelemetry(id)
  }

  const onClickExplore = () => {
    sendTelemetry()
    dispatch(changeSelectedTab(InsightsPanelTabs.Explore))
    dispatch(toggleSidePanel(SidePanels.Insights))
  }

  if (!data?.length) {
    return null
  }

  return (
    <div className={cx(styles.wrapper, mode, wrapperClassName)} data-testid="capability-promotion">
      <div
        tabIndex={0}
        role="button"
        onKeyDown={() => {}}
        onClick={onClickExplore}
        className={styles.exploreItem}
        data-testid="explore-redis-btn"
      >
        <EuiText>Explore Redis</EuiText>
      </div>
      <div className={styles.guides}>
        {data.map(({ title, tutorialId, icon }) => (
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events
          <div
            key={tutorialId}
            tabIndex={0}
            role="button"
            onClick={() => onClickTutorial(tutorialId)}
            className={styles.guideItem}
            data-testid={`capability-promotion-${tutorialId}`}
          >
            {icon in GUIDE_ICONS && (
              <EuiIcon
                className={styles.guideIcon}
                type={GUIDE_ICONS[icon]}
                data-testid={`guide-icon-${icon}`}
              />
            )}
            <EuiText>{title}</EuiText>
          </div>
        ))}
      </div>
    </div>
  )
}

export { CapabilityPromotion }
