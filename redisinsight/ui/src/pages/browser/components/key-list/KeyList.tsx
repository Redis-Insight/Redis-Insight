import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import cx from 'classnames'
import { useParams } from 'react-router-dom'
import { debounce, isUndefined, reject } from 'lodash'

import {
  EuiText,
  EuiToolTip,
  EuiTextColor,
  EuiLoadingContent,
} from '@elastic/eui'
import {
  formatBytes,
  truncateNumberToDuration,
  truncateNumberToFirstUnit,
  truncateTTLToSeconds,
  replaceSpaces,
  formatLongName,
  bufferToString,
  bufferFormatRangeItems,
  getUrl,
} from 'uiSrc/utils'
import {
  NoKeysToDisplayText,
  NoResultsFoundText,
  FullScanNoResultsFoundText,
  ScanNoResultsFoundText,
} from 'uiSrc/constants/texts'
import {
  keysDataSelector,
  keysSelector,
  selectedKeySelector,
  setLastBatchKeys,
  sourceKeysFetch,
} from 'uiSrc/slices/browser/keys'
import {
  appContextBrowser,
  setBrowserKeyListScrollPosition
} from 'uiSrc/slices/app/context'
import { GroupBadge } from 'uiSrc/components'
import ApiEndpoints, { SCAN_COUNT_DEFAULT } from 'uiSrc/constants/api'
import { KeysStoreData, KeyViewType } from 'uiSrc/slices/interfaces/keys'
import VirtualTable from 'uiSrc/components/virtual-table/VirtualTable'
import { ITableColumn } from 'uiSrc/components/virtual-table/interfaces'
import { Pages, TableCellAlignment, TableCellTextAlignment } from 'uiSrc/constants'
import { IKeyPropTypes } from 'uiSrc/constants/prop-types/keys'
import { getBasedOnViewTypeEvent, sendEventTelemetry, TelemetryEvent } from 'uiSrc/telemetry'
import { apiService } from 'uiSrc/services'
import { appInfoSelector } from 'uiSrc/slices/app/info'

import { GetKeyInfoResponse } from 'apiSrc/modules/browser/dto'
import styles from './styles.module.scss'

export interface Props {
  hideHeader?: boolean
  keysState: KeysStoreData
  loading: boolean
  hideFooter?: boolean
  selectKey: ({ rowData }: { rowData: any }) => void
  loadMoreItems?: (
    oldKeys: IKeyPropTypes[],
    { startIndex, stopIndex }: { startIndex: number, stopIndex: number },
  ) => void
}

const KeyList = forwardRef((props: Props, ref) => {
  let wheelTimer = 0
  const { selectKey, loadMoreItems, loading, keysState, hideFooter } = props

  const { instanceId = '' } = useParams<{ instanceId: string }>()

  const { data: selectedKey } = useSelector(selectedKeySelector)
  const { total, nextCursor, previousResultCount } = useSelector(keysDataSelector)
  const { isSearched, isFiltered, viewType } = useSelector(keysSelector)
  const { keyList: { scrollTopPosition } } = useSelector(appContextBrowser)
  const { encoding } = useSelector(appInfoSelector)

  const [, rerender] = useState({})

  const itemsRef = useRef(keysState.keys)
  const renderedRowsIndexesRef = useRef({ startIndex: 0, lastIndex: 0 })

  const dispatch = useDispatch()

  useImperativeHandle(ref, () => ({
    handleLoadMoreItems(config: { startIndex: number; stopIndex: number }) {
      onLoadMoreItems(config)
    }
  }))

  useEffect(() =>
    () => {
      if (viewType === KeyViewType.Tree) {
        return
      }
      rerender(() => {
        dispatch(setLastBatchKeys(itemsRef.current?.slice(-SCAN_COUNT_DEFAULT)))
      })
    }, [])

  useEffect(() => {
    itemsRef.current = [...keysState.keys]
    if (itemsRef.current.length === 0) {
      return
    }

    const { lastIndex, startIndex } = renderedRowsIndexesRef.current
    onRowsRendered(startIndex, lastIndex)
    rerender({})
  }, [keysState.keys])

  const onNoKeysLinkClick = () => {
    sendEventTelemetry({
      event: getBasedOnViewTypeEvent(
        viewType,
        TelemetryEvent.BROWSER_WORKBENCH_LINK_CLICKED,
        TelemetryEvent.TREE_VIEW_WORKBENCH_LINK_CLICKED
      ),
      eventData: {
        databaseId: instanceId,
      }
    })
  }

  const getNoItemsMessage = () => {
    if (total === 0) {
      return NoKeysToDisplayText(Pages.workbench(instanceId), onNoKeysLinkClick)
    }
    if (isSearched) {
      return keysState.scanned < total ? ScanNoResultsFoundText : FullScanNoResultsFoundText
    }
    if (isFiltered && keysState.scanned < total) {
      return ScanNoResultsFoundText
    }
    return NoResultsFoundText
  }

  const onLoadMoreItems = (props: { startIndex: number, stopIndex: number }) => {
    loadMoreItems?.(itemsRef.current, props)
  }

  const onWheelSearched = (event: React.WheelEvent) => {
    if (
      !loading
      && (isSearched || isFiltered)
      && event.deltaY > 0
      && !sourceKeysFetch
      && nextCursor !== '0'
      && previousResultCount === 0
    ) {
      clearTimeout(wheelTimer)
      wheelTimer = window.setTimeout(() => {
        onLoadMoreItems({ stopIndex: SCAN_COUNT_DEFAULT, startIndex: 1 })
      }, 100)
    }
  }

  const setScrollTopPosition = (position: number) => {
    dispatch(setBrowserKeyListScrollPosition(position))
  }

  const formatItem = useCallback((item: GetKeyInfoResponse): GetKeyInfoResponse => ({
    ...item,
    nameString: bufferToString(item.name)
  }), [])

  const onRowsRendered = debounce(async (startIndex: number, lastIndex: number) => {
    renderedRowsIndexesRef.current = { lastIndex, startIndex }

    const newItems = bufferFormatRows(startIndex, lastIndex)

    await uploadMetadata(startIndex, lastIndex, newItems)
  }, 100)

  const bufferFormatRows = (startIndex: number, lastIndex: number): GetKeyInfoResponse[] => {
    const newItems = bufferFormatRangeItems(
      itemsRef.current, startIndex, lastIndex, formatItem
    )
    itemsRef.current.splice(startIndex, newItems.length, ...newItems)

    return newItems
  }

  const uploadMetadata = async (
    startIndex: number,
    lastIndex: number,
    itemsInit: GetKeyInfoResponse[] = []
  ): Promise<void> => {
    const isSomeNotUndefined = ({ type, size, length }: GetKeyInfoResponse) =>
      !isUndefined(type) || !isUndefined(size) || !isUndefined(length)
    const emptyItems = reject(itemsInit, isSomeNotUndefined)

    if (!emptyItems.length) return

    try {
      const { data } = await apiService.post<GetKeyInfoResponse[]>(
        getUrl(
          instanceId,
          ApiEndpoints.KEYS_INFO
        ),
        { keys: emptyItems.map(({ name }) => name) },
        { params: { encoding } }
      )

      const loadedItems = data.map(formatItem)
      const isFirstEmpty = !isSomeNotUndefined(itemsInit[0])
      const startIndexDel = isFirstEmpty ? startIndex : lastIndex - loadedItems.length + 1

      itemsRef.current.splice(startIndexDel, loadedItems.length, ...loadedItems)

      rerender({})
    } catch (error) {
      console.error(error)
    }
  }

  const columns: ITableColumn[] = [
    {
      id: 'type',
      label: 'Type',
      absoluteWidth: 'auto',
      minWidth: 126,
      render: (cellData: any, { nameString: name }: any) => (
        isUndefined(cellData)
          ? <EuiLoadingContent lines={1} className={styles.keyInfoLoading} data-testid="type-loading" />
          : <GroupBadge type={cellData} name={name} />
      )
    },
    {
      id: 'nameString',
      label: 'Key',
      minWidth: 100,
      truncateText: true,
      render: (cellData: string) => {
        if (isUndefined(cellData)) {
          return (
            <EuiLoadingContent
              lines={1}
              className={cx(styles.keyInfoLoading, styles.keyNameLoading)}
              data-testid="name-loading"
            />
          )
        }
        // Better to cut the long string, because it could affect virtual scroll performance
        const name = cellData || ''
        const cellContent = replaceSpaces(name?.substring(0, 200))
        const tooltipContent = formatLongName(name)
        return (
          <EuiText color="subdued" size="s" style={{ maxWidth: '100%' }}>
            <div style={{ display: 'flex' }} className="truncateText" data-testid={`key-${name}`}>
              <EuiToolTip
                title="Key Name"
                className={styles.tooltip}
                anchorClassName="truncateText"
                position="bottom"
                content={tooltipContent}
              >
                <>{cellContent}</>
              </EuiToolTip>
            </div>
          </EuiText>
        )
      }
    },
    {
      id: 'ttl',
      label: 'TTL',
      absoluteWidth: 86,
      minWidth: 86,
      truncateText: true,
      alignment: TableCellAlignment.Right,
      render: (cellData: number, { nameString: name }: GetKeyInfoResponse) => {
        if (isUndefined(cellData)) {
          return <EuiLoadingContent lines={1} className={styles.keyInfoLoading} data-testid="ttl-loading" />
        }
        if (cellData === -1) {
          return (
            <EuiTextColor color="subdued" data-testid={`ttl-${name}`}>
              No limit
            </EuiTextColor>
          )
        }
        return (
          <EuiText color="subdued" size="s" style={{ maxWidth: '100%' }}>
            <div style={{ display: 'flex' }} className="truncateText" data-testid={`ttl-${name}`}>
              <EuiToolTip
                title="Time to Live"
                className={styles.tooltip}
                anchorClassName="truncateText"
                position="right"
                content={(
                  <>
                    {`${truncateTTLToSeconds(cellData)} s`}
                    <br />
                    {`(${truncateNumberToDuration(cellData)})`}
                  </>
                )}
              >
                <>{truncateNumberToFirstUnit(cellData)}</>
              </EuiToolTip>
            </div>
          </EuiText>
        )
      },
    },
    {
      id: 'size',
      label: 'Size',
      absoluteWidth: 84,
      minWidth: 84,
      alignment: TableCellAlignment.Right,
      textAlignment: TableCellTextAlignment.Right,
      render: (cellData: number, { nameString: name }: GetKeyInfoResponse) => {
        if (isUndefined(cellData)) {
          return <EuiLoadingContent lines={1} className={styles.keyInfoLoading} data-testid="size-loading" />
        }

        if (!cellData) {
          return (
            <EuiText color="subdued" size="s" style={{ maxWidth: '100%' }} data-testid={`size-${name}`}>
              -
            </EuiText>
          )
        }
        return (
          <EuiText color="subdued" size="s" style={{ maxWidth: '100%' }}>
            <div style={{ display: 'flex' }} className="truncateText" data-testid={`size-${name}`}>
              <EuiToolTip
                title="Key Size"
                className={styles.tooltip}
                anchorClassName="truncateText"
                position="right"
                content={(
                  <>
                    {formatBytes(cellData, 3)}
                  </>
                )}
              >
                <>{formatBytes(cellData, 0)}</>
              </EuiToolTip>
            </div>
          </EuiText>
        )
      }
    },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={cx(styles.table, { [styles.table__withoutFooter]: hideFooter })}>
          <div className="key-list-table" data-testid="keyList-table">
            <VirtualTable
              selectable
              onRowClick={selectKey}
              headerHeight={0}
              rowHeight={43}
              threshold={50}
              columns={columns}
              loadMoreItems={onLoadMoreItems}
              onWheel={onWheelSearched}
              loading={loading}
              // items={items}
              items={itemsRef.current}
              totalItemsCount={keysState.total ? keysState.total : Infinity}
              scanned={isSearched || isFiltered ? keysState.scanned : 0}
              noItemsMessage={getNoItemsMessage()}
              selectedKey={selectedKey}
              scrollTopProp={scrollTopPosition}
              setScrollTopPosition={setScrollTopPosition}
              hideFooter={hideFooter}
              onRowsRendered={({ overscanStartIndex, overscanStopIndex }) =>
                onRowsRendered(overscanStartIndex, overscanStopIndex)}
            />
          </div>
        </div>
      </div>
    </div>
  )
})

export default React.memo(KeyList)
