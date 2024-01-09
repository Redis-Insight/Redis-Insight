import React from 'react'
import reactRouterDom from 'react-router-dom'
import { rdiPipelineSelector } from 'uiSrc/slices/rdi/pipeline'
import { fireEvent, render, screen } from 'uiSrc/utils/test-utils'

import { sendPageViewTelemetry, TelemetryPageView, sendEventTelemetry, TelemetryEvent } from 'uiSrc/telemetry'
import Jobs from './Jobs'

jest.mock('uiSrc/telemetry', () => ({
  ...jest.requireActual('uiSrc/telemetry'),
  sendPageViewTelemetry: jest.fn(),
  sendEventTelemetry: jest.fn(),
}))

jest.mock('uiSrc/slices/rdi/pipeline', () => ({
  ...jest.requireActual('uiSrc/slices/rdi/pipeline'),
  rdiPipelineSelector: jest.fn().mockReturnValue({
    loading: false,
    error: '',
    data: null,
  }),
}))

describe('Jobs', () => {
  it('should render', () => {
    expect(render(<Jobs />)).toBeTruthy()
  })

  it('should call proper sendPageViewTelemetry', () => {
    const sendPageViewTelemetryMock = jest.fn()
    sendPageViewTelemetry.mockImplementation(() => sendPageViewTelemetryMock)

    render(<Jobs />)

    expect(sendPageViewTelemetry).toBeCalledWith({
      name: TelemetryPageView.RDI_JOBS,
    })
  })

  it('should render loading spinner', () => {
    const rdiPipelineSelectorMock = jest.fn().mockReturnValue({
      loading: true,
    })
    rdiPipelineSelector.mockImplementation(rdiPipelineSelectorMock)

    render(<Jobs />)

    expect(screen.getByTestId('rdi-jobs-loading')).toBeInTheDocument()
  })

  it('should push to config page', () => {
    const rdiPipelineSelectorMock = jest.fn().mockReturnValue({
      loading: false,
      error: '',
      data: { jobs: [{ name: 'job1' }, { name: 'job2' }] },
    })
    rdiPipelineSelector.mockImplementation(rdiPipelineSelectorMock)
    const pushMock = jest.fn()
    reactRouterDom.useHistory = jest.fn().mockReturnValueOnce({ push: pushMock })

    render(<Jobs />)

    expect(pushMock).toBeCalledWith('/integrate/rdiInstanceId/pipeline/config')
  })

  it('should not push to config page', () => {
    const rdiPipelineSelectorMock = jest.fn().mockReturnValue({
      loading: false,
      error: '',
      data: { jobs: [{ name: 'jobName' }, { name: 'job2' }] },
    })
    rdiPipelineSelector.mockImplementation(rdiPipelineSelectorMock)
    const pushMock = jest.fn()
    reactRouterDom.useHistory = jest.fn().mockReturnValueOnce({ push: pushMock })

    render(<Jobs />)

    expect(pushMock).not.toBeCalled()
  })

  it('should render proper link', () => {
    render(<Jobs />)

    expect(screen.getByTestId('rdi-pipeline-transformation-link')).toHaveAttribute('href', 'https://docs.redis.com/latest/rdi/data-transformation/data-transformation-pipeline/')
  })

  it('should send telemetry event with proper data', () => {
    render(<Jobs />)

    fireEvent.click(screen.getByTestId('rdi-jobs-dry-run'))

    expect(sendEventTelemetry).toBeCalledWith({
      event: TelemetryEvent.RDI_TEST_JOB_OPENED,
      eventData: {
        id: 'rdiInstanceId',
      }
    })
  })

  it('should render Panel and disable dry run btn', () => {
    const { queryByTestId } = render(<Jobs />)

    expect(screen.getByTestId('rdi-jobs-dry-run')).not.toBeDisabled()
    expect(queryByTestId('dry-run-panel')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('rdi-jobs-dry-run'))

    expect(screen.getByTestId('rdi-jobs-dry-run')).toBeDisabled()
    expect(queryByTestId('dry-run-panel')).toBeInTheDocument()
  })
})
