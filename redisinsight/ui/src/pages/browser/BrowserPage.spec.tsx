/* eslint-disable sonarjs/no-identical-functions */
import React from 'react'
import { cloneDeep } from 'lodash'
import { render, screen, fireEvent, mockedStore, cleanup } from 'uiSrc/utils/test-utils'
import { setConnectedInstanceId } from 'uiSrc/slices/instances/instances'
import { loadKeys, resetKeyInfo, toggleBrowserFullScreen } from 'uiSrc/slices/browser/keys'
import { resetErrors } from 'uiSrc/slices/app/notifications'
import {
  setBrowserBulkActionOpen,
  setBrowserPanelSizes,
  setBrowserSelectedKey,
} from 'uiSrc/slices/app/context'
import BrowserPage from './BrowserPage'
import KeyList, { Props as KeyListProps } from './components/key-list/KeyList'
import {
  Props as KeyDetailsWrapperProps
} from './modules/key-details/KeyDetails'
import { KeyDetails } from './modules'
import AddKey, { Props as AddKeyProps } from './components/add-key/AddKey'
import BrowserSearchPanel from './components/browser-search-panel'
import { Props as KeysHeaderProps } from './components/keys-header/KeysHeader'

jest.mock('./components/key-list/KeyList', () => ({
  __esModule: true,
  namedExport: jest.fn(),
  default: jest.fn(),
}))

jest.mock('./components/add-key/AddKey', () => ({
  __esModule: true,
  namedExport: jest.fn(),
  default: jest.fn(),
}))

jest.mock('uiSrc/pages/browser/modules', () => ({
  __esModule: true,
  KeyDetails: jest.fn(),
}))

jest.mock('./components/browser-search-panel', () => ({
  __esModule: true,
  namedExport: jest.fn(),
  default: jest.fn(),
}))

const mockKeyList = (props: KeyListProps) => (
  <div>
    <button
      type="button"
      data-testid="loadMoreItems-btn"
      onClick={() => props?.handleScanMoreClick?.({ startIndex: 1, stopIndex: 2 })}
    >
      loadMoreItems
    </button>
  </div>
)

const mockKeyDetailsWrapper = (props: KeyDetailsWrapperProps) => (
  <div>
    <button type="button" data-testid="onCloseKey-btn" onClick={() => props.onCloseKey()}>onCloseKey</button>
  </div>
)

const mockAddKey = (props: AddKeyProps) => (
  <div>
    <button type="button" data-testid="handleCloseKey-btn" onClick={() => props.handleCloseKey()}>handleCloseKey</button>
  </div>
)

const mockBrowserSearchPanel = (props: KeysHeaderProps) => (
  <div>
    <button
      type="button"
      data-testid="handleAddKeyPanel-btn"
      onClick={() => props?.handleAddKeyPanel?.(true)}
    >
      handleAddKeyPanel
    </button>
    <button
      type="button"
      data-testid="handleBulkActionsPanel-btn"
      onClick={() => props?.handleBulkActionsPanel?.(true)}
    >
      handleBulkActionsPanel
    </button>
  </div>
)

let store: typeof mockedStore
beforeEach(() => {
  cleanup()
  store = cloneDeep(mockedStore)
  store.clearActions()
})

/**
 * BrowserPage tests
 *
 * @group component
 */
describe('BrowserPage', () => {
  beforeAll(() => {
    KeyList.mockImplementation(mockKeyList)
    BrowserSearchPanel.mockImplementation(mockBrowserSearchPanel)
    KeyDetails.mockImplementation(mockKeyDetailsWrapper)
    AddKey.mockImplementation(mockAddKey)
  })

  it('should render', () => {
    expect(render(<BrowserPage />)).toBeTruthy()
    const afterRenderActions = [setConnectedInstanceId('instanceId'), loadKeys(), resetErrors()]
    expect(store.getActions().slice(0, afterRenderActions.length)).toEqual([...afterRenderActions])
  })

  it('should call handleAddKeyPanel', () => {
    render(<BrowserPage />)
    const afterRenderActions = [...store.getActions()]

    fireEvent.click(screen.getByTestId('handleAddKeyPanel-btn'))

    const expectedActions = [resetKeyInfo(), toggleBrowserFullScreen(false)]
    expect(store.getActions()).toEqual([...afterRenderActions, ...expectedActions])
  })

  it('should call handleBulkActionsPanel', () => {
    render(<BrowserPage />)
    const afterRenderActions = [...store.getActions()]

    fireEvent.click(screen.getByTestId('handleBulkActionsPanel-btn'))

    const expectedActions = [resetKeyInfo(), toggleBrowserFullScreen(false)]
    expect(store.getActions()).toEqual([...afterRenderActions, ...expectedActions])
  })

  it('should call loadMoreItems without nextCursor', () => {
    render(<BrowserPage />)
    const afterRenderActions = [...store.getActions()]

    fireEvent.click(screen.getByTestId('loadMoreItems-btn'))

    expect(store.getActions()).toEqual([...afterRenderActions])
  })

  it('should call onCloseKey', () => {
    render(<BrowserPage />)
    const afterRenderActions = [...store.getActions()]

    fireEvent.click(screen.getByTestId('onCloseKey-btn'))

    expect(store.getActions()).toEqual([...afterRenderActions, toggleBrowserFullScreen(true)])
  })

  it('should call proper actions on onmount', () => {
    const { unmount } = render(<BrowserPage />)
    const afterRenderActions = [...store.getActions()]

    unmount()

    const unmountActions = [
      setBrowserPanelSizes(expect.any(Object)),
      setBrowserBulkActionOpen(expect.any(Boolean)),
      setBrowserSelectedKey(null),
      toggleBrowserFullScreen(false)
    ]

    expect(store.getActions()).toEqual([...afterRenderActions, ...unmountActions])
  })
})
