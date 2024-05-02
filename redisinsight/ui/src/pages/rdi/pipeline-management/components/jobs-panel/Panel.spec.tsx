import React from 'react'
import { instance, mock } from 'ts-mockito'
import { cloneDeep } from 'lodash'
import { act, cleanup, fireEvent, mockedStore, render, screen } from 'uiSrc/utils/test-utils'

import { sendEventTelemetry, TelemetryEvent } from 'uiSrc/telemetry'
import { dryRunJob, rdiDryRunJobSelector } from 'uiSrc/slices/rdi/dryRun'
import JobsPanel, { Props } from './Panel'

const mockedProps = mock<Props>()

jest.mock('uiSrc/telemetry', () => ({
  ...jest.requireActual('uiSrc/telemetry'),
  sendEventTelemetry: jest.fn(),
}))

jest.mock('uiSrc/slices/rdi/dryRun', () => ({
  ...jest.requireActual('uiSrc/slices/rdi/dryRun'),
  rdiDryRunJobSelector: jest.fn().mockReturnValue({
    loading: false,
    results: null
  })
}))

let store: typeof mockedStore
beforeEach(() => {
  cleanup()
  store = cloneDeep(mockedStore)
  store.clearActions()
})

describe('JobsPanel', () => {
  it('should render', () => {
    expect(render(<JobsPanel {...instance(mockedProps)} />)).toBeTruthy()
  })

  it('should call onClose', () => {
    const mockOnClose = jest.fn()
    render(<JobsPanel {...instance(mockedProps)} onClose={mockOnClose} />)

    fireEvent.click(screen.getByTestId('close-dry-run-btn'))
    expect(mockOnClose).toBeCalled()
  })

  it('should render run btn with proper properties', () => {
    render(<JobsPanel {...instance(mockedProps)} />)

    expect(screen.getByTestId('dry-run-btn')).toBeDisabled()

    // set invalid json value
    fireEvent.change(screen.getByTestId('input-value'), { target: { value: 'test' } })

    expect(screen.getByTestId('dry-run-btn')).toBeDisabled()

    // set valid json value
    fireEvent.change(screen.getByTestId('input-value'), { target: { value: 1 } })

    expect(screen.getByTestId('dry-run-btn')).not.toBeDisabled()
  })

  it('should call proper telemetry events', () => {
    render(<JobsPanel {...instance(mockedProps)} />)

    fireEvent.change(screen.getByTestId('input-value'), { target: { value: 1 } })
    fireEvent.click(screen.getByTestId('dry-run-btn'))

    expect(sendEventTelemetry).toBeCalledWith({
      event: TelemetryEvent.RDI_TEST_JOB_RUN,
      eventData: {
        id: 'rdiInstanceId',
      }
    })
  })

  it('should render proper tab', () => {
    const { queryByTestId } = render(<JobsPanel {...instance(mockedProps)} />)

    expect(queryByTestId('transformations-output')).toBeInTheDocument()
    expect(queryByTestId('commands-output')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('output-tab'))

    expect(queryByTestId('transformations-output')).not.toBeInTheDocument()
    expect(queryByTestId('commands-output')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('transformations-tab'))

    expect(queryByTestId('transformations-output')).toBeInTheDocument()
    expect(queryByTestId('commands-output')).not.toBeInTheDocument()
  })

  it('should fetch dry run job results', () => {
    render(<JobsPanel {...instance(mockedProps)} />)

    fireEvent.change(screen.getByTestId('input-value'), { target: { value: 1 } })
    fireEvent.click(screen.getByTestId('dry-run-btn'))

    const expectedActions = [
      dryRunJob(),
    ]

    expect(store.getActions()).toEqual(expectedActions)
  })

  it('should not render target select if there is no results', async () => {
    const { queryByTestId } = render(<JobsPanel {...instance(mockedProps)} />)

    expect(queryByTestId('target-select')).not.toBeInTheDocument()

    await act(() => {
      fireEvent.click(screen.getByTestId('output-tab'))
    })

    expect(queryByTestId('target-select')).not.toBeInTheDocument()
  })

  it('should render target select if there is results', async () => {
    (rdiDryRunJobSelector as jest.Mock).mockImplementation(() => ({
      loading: false,
      results: {
        transformation: {},
        output: [{ connection: 'target', commands: ['some command'] }]
      }
    }))
    const { queryByTestId } = render(<JobsPanel {...instance(mockedProps)} />)

    expect(queryByTestId('target-select')).not.toBeInTheDocument()

    await act(() => {
      fireEvent.click(screen.getByTestId('output-tab'))
    })

    expect(queryByTestId('target-select')).toBeInTheDocument()
  })
})