/* eslint-disable react/no-this-in-sfc */
import React, { useEffect, useState } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import cx from 'classnames'
import { last } from 'lodash'
import { useDispatch, useSelector } from 'react-redux'
import {
  EuiBadge,
  EuiButtonIcon,
  EuiIcon,
  EuiLink,
  EuiPageSideBar,
  EuiToolTip
} from '@elastic/eui'
import HighlightedFeature, { Props as HighlightedFeatureProps } from 'uiSrc/components/hightlighted-feature/HighlightedFeature'
import { ANALYTICS_ROUTES, BROWSER_ROUTES } from 'uiSrc/components/main-router/constants/sub-routes'

import { PageNames, Pages } from 'uiSrc/constants'
import { EXTERNAL_LINKS } from 'uiSrc/constants/links'
import { getRouterLinkProps } from 'uiSrc/services'
import { appFeaturePagesHighlightingSelector, removeFeatureFromHighlighting } from 'uiSrc/slices/app/features'
import { connectedInstanceSelector } from 'uiSrc/slices/instances/instances'
import { connectedInstanceSelector as connectedRdiInstanceSelector } from 'uiSrc/slices/rdi/instances'
import {
  appInfoSelector,
} from 'uiSrc/slices/app/info'
import LogoSVG from 'uiSrc/assets/img/logo_small.svg?react'
import SettingsSVG from 'uiSrc/assets/img/sidebar/settings.svg'
import SettingsActiveSVG from 'uiSrc/assets/img/sidebar/settings_active.svg'
import BrowserSVG from 'uiSrc/assets/img/sidebar/browser.svg'
import BrowserActiveSVG from 'uiSrc/assets/img/sidebar/browser_active.svg'
import SlowLogSVG from 'uiSrc/assets/img/sidebar/slowlog.svg'
import SlowLogActiveSVG from 'uiSrc/assets/img/sidebar/slowlog_active.svg'
import PubSubSVG from 'uiSrc/assets/img/sidebar/pubsub.svg'
import PubSubActiveSVG from 'uiSrc/assets/img/sidebar/pubsub_active.svg'
import PipelineManagementSVG from 'uiSrc/assets/img/sidebar/pipeline.svg'
import PipelineManagementActiveSVG from 'uiSrc/assets/img/sidebar/pipeline_active.svg'
import PipelineStatisticsSvg from 'uiSrc/assets/img/sidebar/pipeline_statistics.svg'
import PipelineStatisticsActiveSvg from 'uiSrc/assets/img/sidebar/pipeline_statistics_active.svg'
import GithubSVG from 'uiSrc/assets/img/sidebar/github.svg'
import Divider from 'uiSrc/components/divider/Divider'
import { BuildType } from 'uiSrc/constants/env'
import { renderOnboardingTourWithChild } from 'uiSrc/utils/onboarding'
import { ONBOARDING_FEATURES } from 'uiSrc/components/onboarding-features'
import { BUILD_FEATURES } from 'uiSrc/constants/featuresHighlighting'

import { appContextSelector } from 'uiSrc/slices/app/context'
import { AppWorkspace } from 'uiSrc/slices/interfaces'
import HelpMenu from './components/help-menu/HelpMenu'
import NotificationMenu from './components/notifications-center'

import styles from './styles.module.scss'

const pubSubPath = `/${PageNames.pubSub}`

interface INavigations {
  isActivePage: boolean
  isBeta?: boolean
  pageName: string
  tooltipText: string
  ariaLabel: string
  dataTestId: string
  connectedInstanceId?: string
  onClick: () => void
  getClassName: () => string
  getIconType: () => string
  onboard?: any
}

const NavigationMenu = () => {
  const history = useHistory()
  const location = useLocation()
  const dispatch = useDispatch()

  const [activePage, setActivePage] = useState(Pages.home)

  const { workspace } = useSelector(appContextSelector)
  const { id: connectedInstanceId = '' } = useSelector(connectedInstanceSelector)
  const { id: connectedRdiInstanceId = '' } = useSelector(connectedRdiInstanceSelector)
  const { server } = useSelector(appInfoSelector)
  const highlightedPages = useSelector(appFeaturePagesHighlightingSelector)

  const isRdiWorkspace = workspace === AppWorkspace.RDI

  useEffect(() => {
    setActivePage(`/${last(location.pathname.split('/'))}`)
  }, [location])

  const handleGoPage = (page: string) => history.push(page)

  const isAnalyticsPath = (activePage: string) => !!ANALYTICS_ROUTES.find(
    ({ path }) => (`/${last(path.split('/'))}` === activePage)
  )

  const isBrowserPath = (activePage: string) => !!BROWSER_ROUTES.find(
    ({ path }) => (`/${last(path.split('/'))}` === activePage)
  )

  const isPipelineManagementPath = () =>
    location.pathname?.startsWith(Pages.rdiPipelineManagement(connectedRdiInstanceId))

  const getAdditionPropsForHighlighting = (pageName: string): Omit<HighlightedFeatureProps, 'children'> => {
    if (BUILD_FEATURES[pageName]?.asPageFeature) {
      return ({
        hideFirstChild: true,
        onClick: () => dispatch(removeFeatureFromHighlighting(pageName)),
        ...BUILD_FEATURES[pageName]
      })
    }

    return {}
  }

  const privateRoutes: INavigations[] = [
    {
      tooltipText: 'Browser',
      pageName: PageNames.browser,
      isActivePage: isBrowserPath(activePage),
      ariaLabel: 'Browser page button',
      onClick: () => handleGoPage(Pages.keys(connectedInstanceId)),
      dataTestId: 'browser-page-btn',
      connectedInstanceId,
      getClassName() {
        return cx(styles.navigationButton, { [styles.active]: this.isActivePage })
      },
      getIconType() {
        return this.isActivePage ? BrowserSVG : BrowserActiveSVG
      },
    },
    {
      tooltipText: 'Analysis Tools',
      pageName: PageNames.analytics,
      ariaLabel: 'Analysis Tools',
      onClick: () => handleGoPage(Pages.analytics(connectedInstanceId)),
      dataTestId: 'analytics-page-btn',
      connectedInstanceId,
      isActivePage: isAnalyticsPath(activePage),
      getClassName() {
        return cx(styles.navigationButton, { [styles.active]: this.isActivePage })
      },
      getIconType() {
        return this.isActivePage ? SlowLogActiveSVG : SlowLogSVG
      },
    },
    {
      tooltipText: 'Pub/Sub',
      pageName: PageNames.pubSub,
      ariaLabel: 'Pub/Sub page button',
      onClick: () => handleGoPage(Pages.pubSub(connectedInstanceId)),
      dataTestId: 'pub-sub-page-btn',
      connectedInstanceId,
      isActivePage: activePage === pubSubPath,
      getClassName() {
        return cx(styles.navigationButton, { [styles.active]: this.isActivePage })
      },
      getIconType() {
        return this.isActivePage ? PubSubActiveSVG : PubSubSVG
      },
      onboard: ONBOARDING_FEATURES.PUB_SUB_PAGE
    },
  ]

  const privateRdiRoutes: INavigations[] = [
    {
      tooltipText: 'Pipeline Status',
      pageName: PageNames.rdiStatistics,
      ariaLabel: 'Pipeline Status page button',
      onClick: () => handleGoPage(Pages.rdiStatistics(connectedRdiInstanceId)),
      dataTestId: 'pipeline-status-page-btn',
      isActivePage: activePage === `/${PageNames.rdiStatistics}`,
      getClassName() {
        return cx(styles.navigationButton, { [styles.active]: this.isActivePage })
      },
      getIconType() {
        return this.isActivePage ? PipelineStatisticsActiveSvg : PipelineStatisticsSvg
      },
    },
    {
      tooltipText: 'Pipeline Management',
      pageName: PageNames.rdiPipelineManagement,
      ariaLabel: 'Pipeline Management page button',
      onClick: () => handleGoPage(Pages.rdiPipelineManagement(connectedRdiInstanceId)),
      dataTestId: 'pipeline-management-page-btn',
      isActivePage: isPipelineManagementPath(),
      getClassName() {
        return cx(styles.navigationButton, { [styles.active]: this.isActivePage })
      },
      getIconType() {
        return this.isActivePage ? PipelineManagementActiveSVG : PipelineManagementSVG
      },
    },
  ]

  const publicRoutes: INavigations[] = [
    {
      tooltipText: 'Settings',
      pageName: PageNames.settings,
      ariaLabel: 'Settings page button',
      onClick: () => handleGoPage(Pages.settings),
      dataTestId: 'settings-page-btn',
      isActivePage: activePage === Pages.settings,
      getClassName() {
        return cx(styles.navigationButton, { [styles.active]: this.isActivePage })
      },
      getIconType() {
        return this.isActivePage ? SettingsActiveSVG : SettingsSVG
      },
    },
  ]

  const renderNavItem = (nav: INavigations) => (
    <React.Fragment key={nav.tooltipText}>
      {renderOnboardingTourWithChild(
        (
          <HighlightedFeature
            {...getAdditionPropsForHighlighting(nav.pageName)}
            key={nav.tooltipText}
            isHighlight={!!highlightedPages[nav.pageName]?.length}
            dotClassName={cx(styles.highlightDot, { [styles.activePage]: nav.isActivePage })}
            tooltipPosition="right"
            transformOnHover
          >
            <EuiToolTip content={nav.tooltipText} position="right">
              <div className={styles.navigationButtonWrapper}>
                <EuiButtonIcon
                  className={nav.getClassName()}
                  iconType={nav.getIconType()}
                  aria-label={nav.ariaLabel}
                  onClick={nav.onClick}
                  data-testid={nav.dataTestId}
                />
                {nav.isBeta && (<EuiBadge className={styles.betaLabel}>BETA</EuiBadge>)}
              </div>
            </EuiToolTip>
          </HighlightedFeature>
        ),
        { options: nav.onboard },
        nav.isActivePage
      )}
    </React.Fragment>
  )

  return (
    <EuiPageSideBar aria-label="Main navigation" className={cx(styles.navigation, 'eui-yScroll')}>
      <div className={styles.container}>
        <EuiToolTip
          content={server?.buildType === BuildType.RedisStack ? 'Edit database' : isRdiWorkspace ? 'Redis Data Integration' : 'Redis Databases'}
          position="right"
        >
          <span className={cx(styles.iconNavItem, styles.homeIcon)}>
            <EuiLink {...getRouterLinkProps(isRdiWorkspace ? Pages.rdi : Pages.home)} className={styles.logo} data-test-subj="home-page-btn">
              <EuiIcon aria-label="redisinsight home page" type={LogoSVG} />
            </EuiLink>
          </span>
        </EuiToolTip>
        {connectedInstanceId && !isRdiWorkspace && (privateRoutes.map(renderNavItem))}
        {connectedRdiInstanceId && isRdiWorkspace && (privateRdiRoutes.map(renderNavItem))}
      </div>
      <div className={styles.bottomContainer}>
        <NotificationMenu />
        <HelpMenu />
        {publicRoutes.map((nav) => (
          <HighlightedFeature
            key={nav.tooltipText}
            isHighlight={!!highlightedPages[nav.pageName]?.length}
            dotClassName={cx(styles.highlightDot, { [styles.activePage]: nav.isActivePage })}
            transformOnHover
          >
            <EuiToolTip content={nav.tooltipText} position="right">
              <EuiButtonIcon
                className={nav.getClassName()}
                iconType={nav.getIconType()}
                aria-label={nav.ariaLabel}
                onClick={nav.onClick}
                data-testid={nav.dataTestId}
              />
            </EuiToolTip>
          </HighlightedFeature>
        ))}
        <Divider colorVariable="separatorNavigationColor" className="eui-hideFor--xs eui-hideFor--s" variant="middle" />
        <Divider
          colorVariable="separatorNavigationColor"
          className="eui-showFor--xs--flex eui-showFor--s--flex"
          variant="middle"
          orientation="vertical"
        />
        <EuiToolTip
          content="Redis Insight Repository"
          position="right"
        >
          <span className={cx(styles.iconNavItem, styles.githubLink)}>
            <EuiLink
              external={false}
              href={EXTERNAL_LINKS.githubRepo}
              target="_blank"
              data-test-subj="github-repo-btn"
            >
              <EuiIcon
                className={styles.githubIcon}
                aria-label="redis insight github repository"
                type={GithubSVG}
                data-testid="github-repo-icon"
              />
            </EuiLink>
          </span>
        </EuiToolTip>
      </div>
    </EuiPageSideBar>
  )
}

export default NavigationMenu
