import React, { useMemo, useRef, useEffect } from 'react'
import {
  EuiFlyoutHeader,
  EuiText,
  EuiButtonEmpty,
  EuiLoadingContent,
  EuiHorizontalRule,
} from '@elastic/eui'
import JsxParser from 'react-jsx-parser'
import cx from 'classnames'
import { debounce } from 'lodash'
import { useParams } from 'react-router-dom'

import {
  LazyCodeButton,
  InternalLink,
  Image,
  Code,
  EmptyPrompt,
  Pagination
} from 'uiSrc/pages/workbench/components/enablament-area/EnablementArea/components'
import { IEnablementAreaItem } from 'uiSrc/slices/interfaces'
import { sendEventTelemetry, TelemetryEvent } from 'uiSrc/telemetry'

import styles from './styles.module.scss'
import './styles.scss'

export interface Props {
  onClose: () => void;
  title: string;
  backTitle: string;
  content: string;
  isLoading?: boolean;
  error?: string;
  scrollTop?: number;
  onScroll?: (top: number) => void;
  id: string;
  path: string;
  pagination?: IEnablementAreaItem[]
}
const InternalPage = (props: Props) => {
  const {
    onClose,
    title,
    backTitle,
    isLoading,
    error,
    content,
    onScroll,
    scrollTop,
    pagination,
    id,
    path,
  } = props
  const components: any = { LazyCodeButton, InternalLink, Image, Code }
  const containerRef = useRef<HTMLDivElement>(null)
  const { instanceId = '' } = useParams<{ instanceId: string }>()
  const handleScroll = debounce(() => {
    if (containerRef.current && onScroll) {
      onScroll(containerRef.current.scrollTop)
    }
  }, 500)

  const sendEventClickExternalLinkTelemetry = (link: string = '') => {
    sendEventTelemetry({
      event: TelemetryEvent.WORKBENCH_ENABLEMENT_AREA_LINK_CLICKED,
      eventData: {
        path,
        link,
        databaseId: instanceId,
      }
    })
  }

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement

    // send telemetry event after click on an external link
    if (target?.getAttribute('href') && target?.getAttribute('target')) {
      sendEventClickExternalLinkTelemetry(target?.innerText)
    }
  }

  useEffect(() => {
    if (!isLoading && !error && scrollTop && containerRef.current) {
      setTimeout(() => {
        containerRef?.current?.scroll(0, scrollTop)
      }, 0)
    }
  }, [isLoading, scrollTop])

  const contentComponent = useMemo(() => (
    <JsxParser
      components={components}
      autoCloseVoidElements
      jsx={content}
      onError={(e) => console.error(e)}
    />
  ), [content])

  return (
    <div className={styles.container} data-test-subj="internal-page">
      <EuiFlyoutHeader className={styles.header}>
        <div style={{ padding: 0 }}>
          <EuiButtonEmpty
            data-testid="enablement-area__page-close"
            iconType="arrowLeft"
            onClick={onClose}
            className={styles.backButton}
            aria-label="Back"
          >
            {backTitle}
          </EuiButtonEmpty>
        </div>
        <div>
          <EuiHorizontalRule margin="xs" />
        </div>
        <div>
          <EuiText className={styles.pageTitle} color="default">{title?.toUpperCase()}</EuiText>
        </div>
      </EuiFlyoutHeader>
      <div
        ref={containerRef}
        className={cx(styles.content, 'enablement-area__page')}
        onScroll={handleScroll}
        onClick={handleClick}
        role="none"
      >
        { isLoading && <EuiLoadingContent data-testid="enablement-area__page-loader" lines={3} /> }
        { !isLoading && error && <EmptyPrompt /> }
        { !isLoading && !error && contentComponent }
      </div>
      {!!pagination?.length && (
        <>
          <div className={cx(styles.footer, 'eui-showFor--xl')}>
            <Pagination items={pagination} activePageId={id} />
          </div>
          <div className={cx(styles.footer, 'eui-hideFor--xl')}>
            <Pagination items={pagination} activePageId={id} compressed />
          </div>
        </>
      )}
    </div>
  )
}

export default InternalPage
