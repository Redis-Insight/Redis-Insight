import { cloneDeep } from 'lodash'
import React from 'react'
import { useSelector } from 'react-redux'
import { InitialStateRdiInstances, RdiInstance } from 'uiSrc/slices/interfaces'
import { RootState, store } from 'uiSrc/slices/store'
import { cleanup, fireEvent, mockedStore, render, screen, waitFor } from 'uiSrc/utils/test-utils'

import RdiPage from './RdiPage'

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn()
}))

let storeMock: typeof mockedStore
const instancesMock: RdiInstance[] = [
  {
    id: '1',
    name: 'My first integration',
    url: 'redis-12345.c253.us-central1-1.gce.cloud.redislabs.com:12345',
    lastConnection: new Date(),
    version: '1.2',
    visible: true
  }
]

const mockState = (rootState: RootState, rdiInstancesState: Partial<InitialStateRdiInstances>) => ({
  ...rootState,
  rdi: {
    ...rootState.rdi,
    instances: {
      ...rootState.rdi.instances,
      ...rdiInstancesState
    }
  }
})

describe('RdiPage', () => {
  beforeEach(() => {
    cleanup()
    storeMock = cloneDeep(mockedStore)
    storeMock.clearActions()

    const state: RootState = store.getState();
    (useSelector as jest.Mock).mockImplementation((callback: (arg0: RootState) => RootState) =>
      callback(mockState(state, { loading: false, data: instancesMock })))
  })

  it('should render', () => {
    expect(render(<RdiPage />)).toBeTruthy()
  })

  it('should render instance list when instances are found', () => {
    render(<RdiPage />)

    expect(screen.getByTestId('rdi-instance-list')).toBeInTheDocument()
    expect(screen.queryByTestId('empty-rdi-instance-list')).not.toBeInTheDocument()
  })

  it('should render empty panel when initially loading', () => {
    const state: RootState = store.getState();
    (useSelector as jest.Mock).mockImplementation((callback: (arg0: RootState) => RootState) =>
      callback(mockState(state, { data: [] })))

    render(<RdiPage />)

    expect(screen.queryByTestId('rdi-instance-list')).not.toBeInTheDocument()
    expect(screen.queryByTestId('empty-rdi-instance-list')).not.toBeInTheDocument()
  })

  it('should render empty message when no instances are found', () => {
    const state: RootState = store.getState();
    (useSelector as jest.Mock).mockImplementation((callback: (arg0: RootState) => RootState) =>
      callback(mockState(state, { data: [], loading: false })))

    render(<RdiPage />)

    expect(screen.queryByTestId('rdi-instance-list')).not.toBeInTheDocument()
    expect(screen.getByTestId('empty-rdi-instance-list')).toBeInTheDocument()
  })

  it('should open connection form when using header button', async () => {
    render(<RdiPage />)

    fireEvent.click(screen.getByRole('button', { name: 'RDI Instance' }))
    const form = await screen.findByTestId('connection-form')

    expect(form).toBeInTheDocument()
  })

  it('should open connection form when using empty message button', async () => {
    const state: RootState = store.getState();
    (useSelector as jest.Mock).mockImplementationOnce((callback: (arg0: RootState) => RootState) =>
      callback(mockState(state, { data: [], loading: false })))

    render(<RdiPage />)

    fireEvent.click(screen.getByRole('button', { name: '+ RDI Instance' }))
    const form = await screen.findByTestId('connection-form')

    expect(form).toBeInTheDocument()
  })

  it('should open connection form when using edit button', async () => {
    render(<RdiPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Edit instance' }))
    const form = await screen.findByTestId('connection-form')

    expect(form).toBeInTheDocument()
  })

  it('should close connection form when using cancel button', async () => {
    render(<RdiPage />)

    // open form
    fireEvent.click(screen.getByRole('button', { name: 'RDI Instance' }))
    await screen.findByTestId('connection-form')

    // close form
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByTestId('connection-form')).not.toBeInTheDocument()
  })

  it('should close connection form when using delete button', async () => {
    render(<RdiPage />)

    // open form
    fireEvent.click(screen.getByRole('button', { name: 'RDI Instance' }))
    await screen.findByTestId('connection-form')

    // close form
    fireEvent.click(screen.getByRole('button', { name: 'Remove field' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))

    screen.debug()

    // form isn't closing as epxected. Do I need to mock endpoints?
    // expect(screen.queryByTestId('connection-form')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.queryByTestId('connection-form')).not.toBeInTheDocument(), {
      timeout: 1000
    })
  })
  it('should populate form with existing values when using edit button', () => {})
  it('should open empty form with when using header button', () => {})

  it('should populate RDI Alias with URL when RDI Alias is not provided', () => {})
  it('should call edit instance when editInstance is provided', () => {})
  it('should call create instance when editInstance is not provided', () => {})

  it('should call proper telemetry when connection form is opened', () => {})
  it('should call proper telemetry when instance is submitted', () => {})
  it('should call proper telemetry when connection form is closed', () => {})
})