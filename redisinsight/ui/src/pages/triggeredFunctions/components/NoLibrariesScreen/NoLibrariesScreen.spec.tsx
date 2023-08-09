import React from 'react'
import reactRouterDom from 'react-router-dom'
import { cloneDeep } from 'lodash'
import { instance, mock } from 'ts-mockito'
import { cleanup, clearStoreActions, render, fireEvent, screen, mockedStore } from 'uiSrc/utils/test-utils'
import { resetWorkbenchEASearch, setWorkbenchEAMinimized } from 'uiSrc/slices/app/context'
import { freeInstanceSelector, resetConnectedInstance, setDefaultInstance } from 'uiSrc/slices/instances/instances'
import { workbenchGuidesSelector } from 'uiSrc/slices/workbench/wb-guides'

import NoLibrariesScreen, { IProps } from './NoLibrariesScreen'

const mockedProps = mock<IProps>()

let store: typeof mockedStore
beforeEach(() => {
  cleanup()
  store = cloneDeep(mockedStore)
  store.clearActions()
})

jest.mock('uiSrc/slices/workbench/wb-guides', () => ({
  ...jest.requireActual('uiSrc/slices/workbench/wb-guides'),
  workbenchGuidesSelector: jest.fn().mockReturnValue({
    items: [{
      label: 'Quick guides',
      type: 'group',
      children: [
        {
          label: 'Quick guides',
          type: 'group',
          children: [
            {
              type: 'internal-link',
              id: 'document-capabilities',
              label: 'Triggers and Functions',
              args: {
                path: '/quick-guides/triggers-and-functions/introduction.md',
              },
            },
          ]
        }
      ]
    }],
  }),
}))

jest.mock('uiSrc/slices/instances/instances', () => ({
  ...jest.requireActual('uiSrc/slices/instances/instances'),
  freeInstanceSelector: jest.fn().mockReturnValue(null),
}))

describe('NoLibrariesScreen', () => {
  it('should render', () => {
    expect(render(<NoLibrariesScreen {...instance(mockedProps)} />)).toBeTruthy()
  })

  it('should call proper actions and push to quick guides page ', () => {
    const pushMock = jest.fn()
    reactRouterDom.useHistory = jest.fn().mockReturnValue({ push: pushMock })

    render(<NoLibrariesScreen {...instance(mockedProps)} />)

    fireEvent.click(screen.getByTestId('no-libraries-tutorial-link'))

    const expectedActions = [setWorkbenchEAMinimized(false), resetWorkbenchEASearch()]
    expect(clearStoreActions(store.getActions())).toEqual(clearStoreActions(expectedActions))
    expect(pushMock).toBeCalledWith('/instanceId/workbench?path=quick-guides/0/0/0')
  })

  it('should call proper actions and push to workbench page', () => {
    (workbenchGuidesSelector as jest.Mock).mockImplementation(() => ({
      items: []
    }))

    const pushMock = jest.fn()
    reactRouterDom.useHistory = jest.fn().mockReturnValue({ push: pushMock })

    render(<NoLibrariesScreen {...instance(mockedProps)} />)

    fireEvent.click(screen.getByTestId('no-libraries-tutorial-link'))

    const expectedActions = [setWorkbenchEAMinimized(false), resetWorkbenchEASearch()]
    expect(clearStoreActions(store.getActions())).toEqual(clearStoreActions(expectedActions))
    expect(pushMock).toBeCalledWith('/instanceId/workbench')
  })

  it('should have proper text when module is loaded', () => {
    render(<NoLibrariesScreen {...instance(mockedProps)} isModuleLoaded />)

    expect(screen.getByTestId('no-libraries-title')).toHaveTextContent('Triggers and functions')
    expect(screen.getByTestId('no-libraries-action-text')).toHaveTextContent('Upload a new library to start working with triggers and functions or try the interactive tutorial to learn more.')
  })

  it('should have proper text when module is not loaded', () => {
    render(<NoLibrariesScreen {...instance(mockedProps)} />)

    expect(screen.getByTestId('no-libraries-title')).toHaveTextContent('triggers and functions are not available for this database')
    expect(screen.getByTestId('no-libraries-action-text')).toHaveTextContent('Create a free Redis Stack database with Triggers and Functions which extends the core capabilities of open-source Redis')
  })

  it('should call proper actions and push to workbench page', () => {
    (workbenchGuidesSelector as jest.Mock).mockImplementation(() => ({
      items: []
    }))

    const pushMock = jest.fn()
    reactRouterDom.useHistory = jest.fn().mockReturnValue({ push: pushMock })

    render(<NoLibrariesScreen {...instance(mockedProps)} />)

    fireEvent.click(screen.getByTestId('no-libraries-tutorial-link'))

    const expectedActions = [setWorkbenchEAMinimized(false), resetWorkbenchEASearch()]
    expect(clearStoreActions(store.getActions())).toEqual(clearStoreActions(expectedActions))
    expect(pushMock).toBeCalledWith('/instanceId/workbench')
  })

  it('should render OAuthConnectFreeDb when there is freeInstance', () => {
    (freeInstanceSelector as jest.Mock).mockImplementation(() => ({
      id: 'instanceId',
    }))

    render(<NoLibrariesScreen {...instance(mockedProps)} />)

    expect(screen.getByTestId('connect-free-db-btn')).toBeInTheDocument()
    expect(screen.getByTestId('no-libraries-action-text')).toHaveTextContent('Use your Redis Stack database in Redis Enterprise Cloud to start exploring these capabilities.')
  })

  it('should render proper components and text when module is loaded', () => {
    (freeInstanceSelector as jest.Mock).mockImplementation(() => ({
      id: 'instanceId',
    }))

    const { queryByTestId } = render(<NoLibrariesScreen {...instance(mockedProps)} isModuleLoaded />)

    expect(queryByTestId('no-libraries-title')).toHaveTextContent('Triggers and functions')
    expect(queryByTestId('no-libraries-action-text')).toHaveTextContent('Upload a new library to start working with triggers and functions or try the interactive tutorial to learn more.')
    expect(queryByTestId('connect-free-db-btn')).not.toBeInTheDocument()
  })
})
