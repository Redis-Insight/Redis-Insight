import React from 'react'
import reactRouterDom from 'react-router-dom'
import { fireEvent, render, screen } from 'uiSrc/utils/test-utils'

import { findTutorialPath } from 'uiSrc/utils'

import { sendEventTelemetry, TelemetryEvent } from 'uiSrc/telemetry'

import QueryTutorials from './QueryTutorials'

jest.mock('uiSrc/utils', () => ({
  ...jest.requireActual('uiSrc/utils'),
  findTutorialPath: jest.fn(),
}))

jest.mock('uiSrc/telemetry', () => ({
  ...jest.requireActual('uiSrc/telemetry'),
  sendEventTelemetry: jest.fn(),
}))

describe('QueryTutorial', () => {
  it('should render', () => {
    expect(render(<QueryTutorials />)).toBeTruthy()
  })

  it('should call proper history push after click on guide with tutorial', () => {
    const pushMock = jest.fn()
    reactRouterDom.useHistory = jest.fn().mockReturnValue({ push: pushMock });
    (findTutorialPath as jest.Mock).mockImplementation(() => 'path')

    render(<QueryTutorials />)

    fireEvent.click(screen.getByTestId('wb-tutorials-link_sq-intro'))

    expect(pushMock).toHaveBeenCalledWith({
      search: 'path=tutorials/path'
    })
  })

  it('should call proper telemetry event after click on guide', () => {
    const sendEventTelemetryMock = jest.fn();
    (sendEventTelemetry as jest.Mock).mockImplementation(() => sendEventTelemetryMock);
    (findTutorialPath as jest.Mock).mockImplementation(() => 'path')

    render(<QueryTutorials />)

    fireEvent.click(screen.getByTestId('wb-tutorials-link_sq-intro'))

    expect(sendEventTelemetry).toBeCalledWith({
      event: TelemetryEvent.EXPLORE_PANEL_TUTORIAL_OPENED,
      eventData: {
        path: 'path',
        databaseId: 'instanceId',
        source: 'advanced_workbench_editor',
      }
    })
  })
})
