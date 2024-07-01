import { cloneDeep } from 'lodash'
import React from 'react'

import {
  cleanup,
  clearStoreActions,
  fireEvent,
  mockedStore,
  render,
  screen,
  act,
} from 'uiSrc/utils/test-utils'
import QueryWrapper from 'uiSrc/pages/workbench/components/query'
import { Props as QueryProps } from 'uiSrc/pages/workbench/components/query/QueryWrapper'
import { connectedInstanceSelector } from 'uiSrc/slices/instances/instances'
import {
  clearWbResults,
  loadWBHistory,
  processWBCommand,
  sendWBCommandAction,
  workbenchResultsSelector
} from 'uiSrc/slices/workbench/wb-results'

import WBViewWrapper from './WBViewWrapper'

let store: typeof mockedStore
beforeEach(() => {
  cleanup()
  store = cloneDeep(mockedStore)
  store.clearActions()
})

jest.mock('uiSrc/pages/workbench/components/query', () => ({
  __esModule: true,
  namedExport: jest.fn(),
  default: jest.fn(),
}))

const QueryWrapperMock = (props: QueryProps) => (
  <div
    onKeyDown={(e: any) => props.onKeyDown?.(e, 'get')}
    data-testid="query"
    aria-label="query"
    role="textbox"
    tabIndex={0}
  />
)

jest.mock('uiSrc/services', () => ({
  ...jest.requireActual('uiSrc/services'),
  localStorageService: {
    set: jest.fn(),
    get: jest.fn(),
  },
}))

jest.mock('uiSrc/slices/instances/instances', () => ({
  ...jest.requireActual('uiSrc/slices/instances/instances'),
  connectedInstanceSelector: jest.fn().mockReturnValue({
    id: '123',
    connectionType: 'STANDALONE',
  }),
}))

jest.mock('uiSrc/slices/app/plugins', () => ({
  ...jest.requireActual('uiSrc/slices/app/plugins'),
  appPluginsSelector: jest.fn().mockReturnValue({
    visualizations: []
  }),
}))

jest.mock('uiSrc/slices/workbench/wb-results', () => ({
  ...jest.requireActual('uiSrc/slices/workbench/wb-results'),
  sendWBCommandClusterAction: jest.fn(),
  processUnsupportedCommand: jest.fn(),
  updateCliCommandHistory: jest.fn,
  workbenchResultsSelector: jest.fn().mockReturnValue({
    loading: false,
    items: []
  })
}))

jest.mock('uiSrc/slices/workbench/wb-tutorials', () => {
  const defaultState = jest.requireActual('uiSrc/slices/workbench/wb-tutorials').initialState
  return {
    ...jest.requireActual('uiSrc/slices/workbench/wb-tutorials'),
    workbenchTutorialsSelector: jest.fn().mockReturnValue({
      ...defaultState,
    }),
  }
})

describe('WBViewWrapper', () => {
  beforeAll(() => {
    QueryWrapper.mockImplementation(QueryWrapperMock)
  })

  it('should render', () => {
    expect(render(<WBViewWrapper />)).toBeTruthy()
  })

  it('should render with SessionStorage', () => {
    render(<WBViewWrapper />)

    const expectedActions = [loadWBHistory()]
    expect(clearStoreActions(store.getActions().slice(0, expectedActions.length))).toEqual(
      clearStoreActions(expectedActions)
    )
  })

  it('should call delete command', () => {
    (workbenchResultsSelector as jest.Mock).mockImplementation(() => ({
      items: [
        { id: '1' },
      ],
    }))
    render(<WBViewWrapper />)

    fireEvent.click(screen.getByTestId('delete-command'))
    expect(clearStoreActions(store.getActions().slice(-1))).toEqual(clearStoreActions([processWBCommand('1')]))
  })

  it('should call delete all command', () => {
    (workbenchResultsSelector as jest.Mock).mockImplementation(() => ({
      items: [
        { id: '1' },
      ],
    }))
    render(<WBViewWrapper />)

    fireEvent.click(screen.getByTestId('clear-history-btn'))
    expect(clearStoreActions(store.getActions().slice(-1))).toEqual(clearStoreActions([clearWbResults()]))
  })

  it('should be disabled button when commands are processing', () => {
    (workbenchResultsSelector as jest.Mock).mockImplementation(() => ({
      items: [
        { id: '1' },
      ],
      processing: true
    }))
    render(<WBViewWrapper />)

    expect(screen.getByTestId('clear-history-btn')).toBeDisabled()
  })

  it('should not display clear results when with empty history', () => {
    (workbenchResultsSelector as jest.Mock).mockImplementation(() => ({
      items: [],
    }))
    render(<WBViewWrapper />)

    expect(screen.queryByTestId('clear-history-btn')).not.toBeInTheDocument()
  })

  it.skip('"onSubmit" for Cluster connection should call "sendWBCommandClusterAction"', async () => {
    (connectedInstanceSelector as jest.Mock).mockImplementation(() => ({
      id: '123',
      connectionType: 'CLUSTER',
    }))

    const sendWBCommandClusterActionMock = jest.fn();

    (sendWBCommandAction as jest.Mock).mockImplementation(() => sendWBCommandClusterActionMock)

    const { queryAllByTestId } = render(<WBViewWrapper />)

    // Act
    await act(() => {
      fireEvent.click(queryAllByTestId(/preselect-/)[0])
    })

    const monacoEl = screen.getByTestId('query')

    fireEvent.keyDown(monacoEl, {
      code: 'Enter',
      ctrlKey: true,
    })

    expect(sendWBCommandClusterActionMock).toBeCalled()
  })
})
