import React from 'react'
import { EuiBadge, EuiTab, EuiTabs } from '@elastic/eui'
import { useHistory } from 'react-router-dom'
import { Pages } from 'uiSrc/constants/pages'

import { renderOnboardingTourWithChild } from 'uiSrc/utils/onboarding'
import { ONBOARDING_FEATURES } from 'uiSrc/components/onboarding-features'
import styles from './styles.module.scss'

export interface Props {
  instanceId: string
  pathname: string
}

const BrowserTabs = (props: Props) => {
  const { instanceId, pathname } = props

  const history = useHistory()

  const tabs = [
    {
      id: 'browser',
      title: 'Browse and filter',
      page: Pages.browser(instanceId),
      onboard: ONBOARDING_FEATURES.BROWSER_PAGE
    },
    {
      id: 'search',
      title: 'Search and query',
      page: Pages.search(instanceId),
      isBeta: true
    },
    {
      id: 'workbench',
      title: 'Workbench',
      page: Pages.workbench(instanceId),
      onboard: ONBOARDING_FEATURES.WORKBENCH_PAGE,
    }
  ]

  const onClickTab = (page: string) => {
    history.push(page)
  }

  return (
    <EuiTabs className={styles.tabs} data-testid="browser-tabs">
      {tabs.map(({ id, title, page, onboard, isBeta }) => renderOnboardingTourWithChild(
        (
          <EuiTab
            key={id}
            className={styles.tab}
            isSelected={pathname === page}
            onClick={() => onClickTab(page)}
            data-testid={`browser-tab-${id}`}
          >
            {title}
            {isBeta && ((<EuiBadge className={styles.betaLabel}>New!</EuiBadge>))}
          </EuiTab>
        ),
        { options: onboard, anchorPosition: 'downLeft' },
        pathname === page
      ))}
    </EuiTabs>
  )
}

export default BrowserTabs
