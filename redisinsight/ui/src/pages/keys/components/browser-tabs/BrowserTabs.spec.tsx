import React from 'react'
import reactRouterDom from 'react-router-dom'
import { render, screen, fireEvent } from 'uiSrc/utils/test-utils'

import BrowserTabs from './BrowserTabs'

jest.mock('uiSrc/telemetry', () => ({
  ...jest.requireActual('uiSrc/telemetry'),
  sendEventTelemetry: jest.fn(),
}))

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({
    push: jest.fn,
  }),
}))

const MOCKED_INSTANCE_ID = 'instanceId'

describe('BrowserTabs', () => {
  it('should render', () => {
    expect(render(<BrowserTabs instanceId={MOCKED_INSTANCE_ID} pathname="" />)).toBeTruthy()
  })

  it('should call proper history push after click on tabs', () => {
    const pushMock = jest.fn()
    reactRouterDom.useHistory = jest.fn().mockReturnValue({ push: pushMock })

    render(<BrowserTabs instanceId={MOCKED_INSTANCE_ID} pathname="" />)

    fireEvent.click(screen.getByTestId('browser-tab-workbench'))
    expect(pushMock).toBeCalledWith('/instanceId/browser/workbench')

    pushMock.mockRestore()

    fireEvent.click(screen.getByTestId('browser-tab-browser'))
    expect(pushMock).toBeCalledWith('/instanceId/browser/browser')
  })
})
