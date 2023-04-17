import React, { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useHistory } from 'react-router-dom'
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiLink,
  EuiTitle,
  EuiLoadingContent,
  EuiText,
  EuiIcon,
  EuiToolTip,
} from '@elastic/eui'
import cx from 'classnames'

import { Pages } from 'uiSrc/constants'
import {
  recommendationsSelector,
  fetchRecommendationsAction,
  readRecommendationsAction,
  setIsContentVisible
} from 'uiSrc/slices/recommendations/recommendations'
import { connectedInstanceSelector } from 'uiSrc/slices/instances/instances'
import { sendEventTelemetry, TelemetryEvent } from 'uiSrc/telemetry'
import { workbenchGuidesSelector } from 'uiSrc/slices/workbench/wb-guides'

import { workbenchTutorialsSelector } from 'uiSrc/slices/workbench/wb-tutorials'
import { IRecommendation, IRecommendationsStatic } from 'uiSrc/slices/interfaces/recommendations'

import _content from 'uiSrc/constants/dbAnalysisRecommendations.json'
import { ReactComponent as TriggerIcon } from 'uiSrc/assets/img/bulb.svg'
import { ReactComponent as TriggerActiveIcon } from 'uiSrc/assets/img/bulb-active.svg'
import InfoIcon from 'uiSrc/assets/img/icons/help_illus.svg'

import Recommendation from './components/recommendation'
import WelcomeScreen from './components/welcome-screen'
import styles from './styles.module.scss'

const recommendationsContent = _content as IRecommendationsStatic

const LiveTimeRecommendations = () => {
  const { id: connectedInstanceId = '', } = useSelector(connectedInstanceSelector)
  const {
    loading,
    data: { recommendations, totalUnread },
    isContentVisible,
    isHighlighted
  } = useSelector(recommendationsSelector)
  const { items: guides } = useSelector(workbenchGuidesSelector)
  const { items: tutorials } = useSelector(workbenchTutorialsSelector)

  // To prevent duplication emit for FlyOut close event
  // https://github.com/elastic/eui/issues/3437
  const isCloseEventSent = useRef<boolean>(false)

  const dispatch = useDispatch()
  const history = useHistory()

  useEffect(() => {
    if (!connectedInstanceId) return

    // initial loading
    dispatch(fetchRecommendationsAction(connectedInstanceId))
  }, [connectedInstanceId])

  const toggleContent = () => {
    if (!isContentVisible) {
      dispatch(fetchRecommendationsAction(
        connectedInstanceId,
        onSuccessAction,
      ))
      isCloseEventSent.current = false
    } else {
      sendEventTelemetry({
        event: TelemetryEvent.INSIGHTS_RECOMMENDATIONS_CLOSED,
        eventData: getTelemetryData(recommendations),
      })
    }
    dispatch(setIsContentVisible(!isContentVisible))
  }

  const onSuccessAction = (recommendationsData: IRecommendation[]) => {
    if (totalUnread) {
      dispatch(readRecommendationsAction(connectedInstanceId))
    }
    sendEventTelemetry({
      event: TelemetryEvent.INSIGHTS_RECOMMENDATIONS_OPENED,
      eventData: getTelemetryData(recommendationsData),
    })
  }

  const handleClickDbAnalysisLink = () => {
    dispatch(setIsContentVisible(false))
    history.push(Pages.databaseAnalysis(connectedInstanceId))
    sendEventTelemetry({
      event: TelemetryEvent.INSIGHTS_RECOMMENDATION_DATABASE_ANALYSIS_CLICKED,
      eventData: {
        databaseId: connectedInstanceId,
        total: recommendations?.length,
      },
    })
  }

  const handleClose = () => {
    if (isCloseEventSent.current) {
      return
    }

    dispatch(setIsContentVisible(false))
    sendEventTelemetry({
      event: TelemetryEvent.INSIGHTS_RECOMMENDATIONS_CLOSED,
      eventData: getTelemetryData(recommendations),
    })
    isCloseEventSent.current = true
  }

  const getTelemetryData = (recommendationsData: IRecommendation[]) => ({
    databaseId: connectedInstanceId,
    total: recommendationsData?.length,
    list: recommendationsData?.map(({ name }) => recommendationsContent[name]?.telemetryEvent ?? name),
  })

  const renderBody = () => {
    if (!recommendations?.length) {
      return <WelcomeScreen />
    }

    return recommendations?.map(({ id, name, read, vote }) => (
      <Recommendation
        id={id}
        key={name}
        name={name}
        isRead={read}
        vote={vote}
        instanceId={connectedInstanceId}
        guides={guides}
        tutorials={tutorials}
        tutorial={recommendationsContent[name]?.tutorial ?? ''}
      />
    ))
  }

  return (
    <div className={styles.wrapper}>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={() => {}}
        onClick={toggleContent}
        className={cx(styles.trigger, { [styles.isOpen]: isContentVisible })}
        data-testid="recommendations-trigger"
      >
        {isHighlighted && !isContentVisible
          ? <TriggerActiveIcon className={styles.triggerIcon} />
          : <TriggerIcon className={styles.triggerIcon} />}
        <EuiText className={cx(
          styles.triggerText,
          { [styles.triggerHighlighted]: isHighlighted && !isContentVisible }
        )}
        >
          Insights
        </EuiText>
      </div>
      {isContentVisible && (
        <EuiFlyout
          paddingSize="none"
          className={styles.content}
          ownFocus
          size="476px"
          onClose={handleClose}
          data-testid="insights-panel"
        >
          <EuiFlyoutHeader className={styles.header}>
            <EuiTitle className={styles.title}>
              <span>Insights</span>
            </EuiTitle>
            {!!recommendations.length && (
              <div className={styles.actions}>
                <EuiText className={styles.boldText}>Our Recommendations</EuiText>
                <EuiToolTip
                  position="bottom"
                  anchorClassName={styles.tooltipAnchor}
                  className={styles.tooltip}
                  content={(
                    <>
                      Recommendations will help you improve your database.
                      <br />
                      Work in the database to see new recommendations appeared on how to improve performance,
                      optimize memory usage, and enhance the performance of your database.
                      <br />
                      Eager to see more recommendations right now?
                      Go to Database Analysis and click on the new report in order to see the magic happens.
                    </>
                  )}
                >
                  <EuiIcon
                    className={styles.infoIcon}
                    type="iInCircle"
                    size="s"
                    data-testid="recommendations-info-icon"
                  />
                </EuiToolTip>
              </div>
            )}
          </EuiFlyoutHeader>
          <EuiFlyoutBody className={styles.body}>
            {loading ? (<EuiLoadingContent className={styles.loading} lines={4} />) : renderBody()}
          </EuiFlyoutBody>
          <EuiFlyoutFooter className={styles.footer}>
            <EuiIcon className={styles.footerIcon} size="m" type={InfoIcon} />
            <EuiText className={styles.text}>
              {'Run '}
              <EuiLink
                className={styles.text}
                onClick={handleClickDbAnalysisLink}
                data-testid="footer-db-analysis-link"
              >
                Database Analysis
              </EuiLink>
              {' to get more recommendations'}
            </EuiText>
          </EuiFlyoutFooter>
        </EuiFlyout>
      )}
    </div>
  )
}

export default LiveTimeRecommendations
