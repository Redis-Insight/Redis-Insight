import React from 'react'
import reactRouterDom, { BrowserRouter } from 'react-router-dom'
import { cleanup } from '@testing-library/react'
import { cloneDeep } from 'lodash'
import { mockedStore, render } from 'uiSrc/utils/test-utils'

import { Pages } from 'uiSrc/constants'
import { appContextSelector, setLastPageContext } from 'uiSrc/slices/app/context'
import KeysPage from './KeysPage'

jest.mock('uiSrc/slices/app/context', () => ({
  ...jest.requireActual('uiSrc/slices/app/context'),
  appContextSelector: jest.fn().mockReturnValue({
    lastBrowserPage: '',
  }),
}))

let store: typeof mockedStore
beforeEach(() => {
  cleanup()
  store = cloneDeep(mockedStore)
  store.clearActions()
})

const mockedRoutes = [
  {
    path: '/123/browser',
  },
]

describe('KeysPage', () => {
  it('should render', () => {
    expect(
      render(
        <BrowserRouter>
          <KeysPage routes={mockedRoutes} />
        </BrowserRouter>
      )
    ).toBeTruthy()
  })

  it('should redirect to the browser by default', () => {
    const pushMock = jest.fn()
    reactRouterDom.useHistory = jest.fn().mockReturnValue({ push: pushMock })
    reactRouterDom.useLocation = jest.fn().mockReturnValue({ pathname: Pages.keys('instanceId') })

    render(
      <BrowserRouter>
        <KeysPage routes={mockedRoutes} />
      </BrowserRouter>
    )

    expect(pushMock).toBeCalledWith(Pages.browser('instanceId'))
  })

  it('should redirect to the prev page from context', () => {
    (appContextSelector as jest.Mock).mockReturnValueOnce({
      lastBrowserPage: Pages.workbench('instanceId')
    })
    const pushMock = jest.fn()
    reactRouterDom.useHistory = jest.fn().mockReturnValue({ push: pushMock })
    reactRouterDom.useLocation = jest.fn().mockReturnValue({ pathname: Pages.keys('instanceId') })

    render(
      <BrowserRouter>
        <KeysPage routes={mockedRoutes} />
      </BrowserRouter>
    )

    expect(pushMock).toBeCalledWith(Pages.workbench('instanceId'))
  })

  it('should save proper page on unmount', () => {
    reactRouterDom.useLocation = jest.fn().mockReturnValue({ pathname: Pages.workbench('instanceId') })

    const { unmount } = render(
      <BrowserRouter>
        <KeysPage routes={mockedRoutes} />
      </BrowserRouter>
    )

    unmount()
    expect(store.getActions()).toEqual([setLastPageContext('/instanceId/browser/workbench')])
  })
})
