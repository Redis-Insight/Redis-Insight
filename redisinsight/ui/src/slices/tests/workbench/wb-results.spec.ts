import { cloneDeep } from 'lodash'
import { AxiosError } from 'axios'

import {
  cleanup,
  mockedStore,
  initialStateDefault,
  clearStoreActions,
} from 'uiSrc/utils/test-utils'
import { apiService } from 'uiSrc/services'
import { addErrorNotification } from 'uiSrc/slices/app/notifications'
import { ClusterNodeRole, CommandExecutionStatus } from 'uiSrc/slices/interfaces/cli'
import { SendClusterCommandDto } from 'apiSrc/modules/cli/dto/cli.dto'
import reducer, {
  initialState,
  sendWBCommand,
  sendWBCommandSuccess,
  processWBCommandFailure,
  workbenchResultsSelector,
  sendWBCommandAction,
  sendWBCommandClusterAction,
  fetchWBCommandAction,
  deleteWBCommandAction,
  loadWBHistory,
  loadWBHistorySuccess,
  loadWBHistoryFailure,
  processWBCommand,
  fetchWBCommandSuccess,
  toggleOpenWBResult,
  deleteWBCommandSuccess,
  resetWBHistoryItems,
  fetchWBHistoryAction,
} from '../../workbench/wb-results'

jest.mock('uiSrc/services', () => ({
  ...jest.requireActual('uiSrc/services'),
}))

let store: typeof mockedStore
beforeEach(() => {
  cleanup()
  store = cloneDeep(mockedStore)
  store.clearActions()
})

const mockItemId = '123'
const initialStateWithItems = {
  ...initialState,
  items: [{
    id: mockItemId + 0
  }]
}

describe('workbench results slice', () => {
  describe('sendWBCommand', () => {
    it('should properly set state', () => {
      // Arrange
      const mockPayload = {
        commands: ['command', 'command2'],
        commandId: '123'
      }
      const state = {
        ...initialState,
        loading: true,
        processing: true,
        items: mockPayload.commands.map((command, i) => ({
          command,
          id: mockPayload.commandId + i,
          loading: true,
          isOpen: true,
          error: ''
        }))
      }

      // Act
      const nextState = reducer(initialState, sendWBCommand(mockPayload))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        workbench: {
          results: nextState,
        },
      })
      expect(workbenchResultsSelector(rootState)).toEqual(state)
    })
  })

  describe('toggleOpenWBResult', () => {
    it('should properly set isOpen = true', () => {
      // Arrange

      const state = {
        ...initialStateWithItems,
        items: [
          {
            ...initialStateWithItems.items[0],
            isOpen: true
          }
        ]
      }

      // Act
      const nextState = reducer(initialStateWithItems, toggleOpenWBResult(mockItemId + 0))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        workbench: {
          results: nextState,
        },
      })
      expect(workbenchResultsSelector(rootState)).toEqual(state)
    })
  })
  describe('resetWBHistoryItems', () => {
    it('should properly remove all items', () => {
      // Arrange

      const state = {
        ...initialStateWithItems,
        items: []
      }

      // Act
      const nextState = reducer(initialStateWithItems, resetWBHistoryItems())

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        workbench: {
          results: nextState,
        },
      })
      expect(workbenchResultsSelector(rootState)).toEqual(state)
    })
  })

  describe('sendWBCommandSuccess', () => {
    it('should properly set the state with fetched data', () => {
      // Arrange

      const mockedId = '123'

      const mockCommandExecution = {
        commandId: '123',
        data: [{
          command: 'command',
          databaseId: '123',
          id: mockedId + 0,
          createdAt: new Date(),
          isOpen: true,
          error: '',
          loading: false,
          result: [{
            response: 'test',
            status: CommandExecutionStatus.Success
          }]
        }]
      }

      const state = {
        ...initialState,
        items: [...mockCommandExecution.data]
      }

      // Act
      const nextState = reducer(initialStateWithItems, sendWBCommandSuccess(mockCommandExecution))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        workbench: {
          results: nextState,
        },
      })
      expect(workbenchResultsSelector(rootState)).toEqual(state)
    })
  })

  describe('processWBCommandFailure', () => {
    it('should properly set the error', () => {
      // Arrange
      const data = 'error'
      const mockCommandExecution = {
        id: mockItemId + 0,
        error: data,
        loading: false,
      }
      const state = {
        ...initialStateWithItems,
        items: [
          {
            ...mockCommandExecution
          }
        ]
      }

      // Act
      const nextState = reducer(initialStateWithItems, processWBCommandFailure(mockCommandExecution))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        workbench: {
          results: nextState,
        },
      })
      expect(workbenchResultsSelector(rootState)).toEqual(state)
    })
  })

  describe('thunks', () => {
    describe('Standalone Cli commands', () => {
      it('call both sendWBCommandAction and sendWBCommandSuccess when response status is successed', async () => {
        // Arrange
        const commands = ['keys *', 'set 1 1']
        const commandId = `${Date.now()}`
        const data = [
          {
            command: 'keys *',
            databaseId: '123',
            id: commandId + (commands.length - 1),
            createdAt: new Date(),
            result: [{
              response: 'test',
              status: CommandExecutionStatus.Success
            }]
          },
          {
            command: 'set 1 1',
            databaseId: '123',
            id: commandId + (commands.length - 1),
            createdAt: new Date(),
            result: [{
              response: 'test',
              status: CommandExecutionStatus.Success
            }]
          }
        ]
        const responsePayload = { data, status: 200 }

        apiService.post = jest.fn().mockResolvedValue(responsePayload)

        // Act
        await store.dispatch<any>(sendWBCommandAction({ commands, commandId }))

        // Assert
        const expectedActions = [
          sendWBCommand({ commands, commandId }),
          sendWBCommandSuccess({ data, commandId })
        ]
        expect(clearStoreActions(store.getActions())).toEqual(clearStoreActions(expectedActions))
      })

      it('call both sendWBCommandAction and sendWBCommandSuccess when response status is fail', async () => {
        // Arrange
        const commands = ['keys *']
        const commandId = `${Date.now()}`
        const data = [{
          command: 'command',
          databaseId: '123',
          id: commandId,
          createdAt: new Date(),
          result: [{
            response: 'test',
            status: CommandExecutionStatus.Fail
          }]
        }]
        const responsePayload = { data, status: 200 }

        apiService.post = jest.fn().mockResolvedValue(responsePayload)

        // Act
        await store.dispatch<any>(sendWBCommandAction({ commands, commandId }))

        // Assert
        const expectedActions = [
          sendWBCommand({ commands, commandId }),
          sendWBCommandSuccess({ data, commandId })
        ]

        expect(clearStoreActions(store.getActions())).toEqual(clearStoreActions(expectedActions))
      })

      it('call both sendWBCommandAction and processWBCommandFailure when fetch is fail', async () => {
        // Arrange
        const commands = ['keys *']
        const commandId = `${Date.now()}`
        const errorMessage = 'Could not connect to aoeu:123, please check the connection details.'
        const responsePayload = {
          response: {
            status: 500,
            data: { message: errorMessage },
          },
        }

        apiService.post = jest.fn().mockRejectedValueOnce(responsePayload)

        // Act
        await store.dispatch<any>(sendWBCommandAction({ commands, commandId }))

        // Assert
        const expectedActions = [
          sendWBCommand({ commands, commandId }),
          addErrorNotification(responsePayload as AxiosError),
          processWBCommandFailure({ id: commandId, error: responsePayload.response.data.message }),
        ]
        expect(clearStoreActions(store.getActions())).toEqual(clearStoreActions(expectedActions))
      })
    })

    describe('Single Node Cluster Cli command', () => {
      const commandId = `${Date.now()}`
      const options: SendClusterCommandDto = {
        command: 'keys *',
        nodeOptions: {
          host: 'localhost',
          port: 7000,
          enableRedirection: true,
        },
        role: ClusterNodeRole.All,
      }

      it('call both sendWBCommandClusterAction and sendWBCommandSuccess when response status is successed', async () => {
        // Arrange
        const commands = ['keys *']
        const data = [{
          command: 'command',
          databaseId: '123',
          id: commandId + (commands.length - 1),
          createdAt: new Date(),
          result: [{
            response: 'test',
            status: CommandExecutionStatus.Success
          }]
        }]
        const responsePayload = { data, status: 200 }

        apiService.post = jest.fn().mockResolvedValue(responsePayload)

        // Act
        await store.dispatch<any>(sendWBCommandClusterAction({ commands, commandId, options }))

        // Assert
        const expectedActions = [
          sendWBCommand({ commands, commandId }),
          sendWBCommandSuccess({ data, commandId })
        ]
        expect(clearStoreActions(store.getActions())).toEqual(clearStoreActions(expectedActions))
      })

      it('call both sendWBCommandClusterAction and sendWBCommandSuccess when response status is fail', async () => {
        // Arrange
        const commands = ['keys *']
        const data = [{
          command: 'command',
          databaseId: '123',
          id: commandId,
          createdAt: new Date(),
          result: [{
            response: 'test',
            status: CommandExecutionStatus.Fail
          }]
        }]
        const responsePayload = { data, status: 200 }

        apiService.post = jest.fn().mockResolvedValue(responsePayload)

        // Act
        await store.dispatch<any>(sendWBCommandClusterAction({ commands, options, commandId }))

        // Assert
        const expectedActions = [
          sendWBCommand({ commands, commandId }),
          sendWBCommandSuccess({ data, commandId })
        ]
        expect(clearStoreActions(store.getActions())).toEqual(clearStoreActions(expectedActions))
      })

      it('call both sendWBCommandClusterAction and processWBCommandFailure when fetch is fail', async () => {
        // Arrange
        const commands = ['keys *']
        const errorMessage = 'Could not connect to aoeu:123, please check the connection details.'
        const responsePayload = {
          response: {
            status: 500,
            data: { message: errorMessage },
          },
        }

        apiService.post = jest.fn().mockRejectedValueOnce(responsePayload)

        // Act
        await store.dispatch<any>(sendWBCommandAction({ commands, options, commandId }))

        // Assert
        const expectedActions = [
          sendWBCommand({ commands, commandId }),
          addErrorNotification(responsePayload as AxiosError),
          processWBCommandFailure({ id: commandId, error: responsePayload.response.data.message }),
        ]
        expect(clearStoreActions(store.getActions())).toEqual(clearStoreActions(expectedActions))
      })
    })

    describe('Fetch result for command', () => {
      it('call both fetchWBCommandAction and fetchWBCommandSuccess when response status is successed', async () => {
        // Arrange
        const data = {
          command: 'command',
          databaseId: '123',
          id: mockItemId,
          createdAt: new Date(),
          result: [{
            response: 'test',
            status: CommandExecutionStatus.Success
          }]
        }
        const responsePayload = { data, status: 200 }

        apiService.get = jest.fn().mockResolvedValue(responsePayload)

        // Act
        await store.dispatch<any>(fetchWBCommandAction(mockItemId))

        // Assert
        const expectedActions = [
          processWBCommand(mockItemId),
          fetchWBCommandSuccess(data)
        ]
        expect(clearStoreActions(store.getActions())).toEqual(clearStoreActions(expectedActions))
      })

      it('call both fetchWBCommandAction and fetchWBCommandSuccess when response status is fail', async () => {
        // Arrange
        const commandId = `${Date.now()}`
        const data = {
          command: 'command',
          databaseId: '123',
          id: commandId,
          createdAt: new Date(),
          result: [{
            response: 'test',
            status: CommandExecutionStatus.Fail
          }]
        }
        const responsePayload = { data, status: 200 }

        apiService.get = jest.fn().mockResolvedValue(responsePayload)

        // Act
        await store.dispatch<any>(fetchWBCommandAction(commandId))

        // Assert
        const expectedActions = [
          processWBCommand(commandId),
          fetchWBCommandSuccess(data)
        ]

        expect(clearStoreActions(store.getActions())).toEqual(clearStoreActions(expectedActions))
      })

      it('call both fetchWBCommandAction and processWBCommandFailure when fetch is fail', async () => {
        // Arrange
        const command = 'keys *'
        const commandId = `${Date.now()}`
        const errorMessage = 'Could not connect to aoeu:123, please check the connection details.'
        const responsePayload = {
          response: {
            status: 500,
            data: { message: errorMessage },
          },
        }

        apiService.get = jest.fn().mockRejectedValueOnce(responsePayload)

        // Act
        await store.dispatch<any>(fetchWBCommandAction(commandId))

        // Assert
        const expectedActions = [
          processWBCommand(commandId),
          addErrorNotification(responsePayload as AxiosError),
          processWBCommandFailure({ command, error: responsePayload.response.data.message }),
        ]
        expect(clearStoreActions(store.getActions())).toEqual(clearStoreActions(expectedActions))
      })
    })

    describe('Delete command from the list', () => {
      it('call both deleteWBCommandAction and fetchWBCommandSuccess when response status is successed', async () => {
        // Arrange
        const data = {
          command: 'command',
          databaseId: '123',
          id: mockItemId,
          createdAt: new Date(),
          result: [{
            response: 'test',
            status: CommandExecutionStatus.Success
          }]
        }
        const responsePayload = { data, status: 200 }

        apiService.delete = jest.fn().mockResolvedValue(responsePayload)

        // Act
        await store.dispatch<any>(deleteWBCommandAction(mockItemId))

        // Assert
        const expectedActions = [
          processWBCommand(mockItemId),
          deleteWBCommandSuccess(mockItemId)
        ]
        expect(clearStoreActions(store.getActions())).toEqual(clearStoreActions(expectedActions))
      })

      it('call both deleteWBCommandAction and fetchWBCommandSuccess when response status is fail', async () => {
        // Arrange
        const commandId = `${Date.now()}`
        const data = {
          command: 'command',
          databaseId: '123',
          id: commandId,
          createdAt: new Date(),
          result: [{
            response: 'test',
            status: CommandExecutionStatus.Fail
          }]
        }
        const responsePayload = { data, status: 200 }

        apiService.delete = jest.fn().mockResolvedValue(responsePayload)

        // Act
        await store.dispatch<any>(deleteWBCommandAction(commandId))

        // Assert
        const expectedActions = [
          processWBCommand(commandId),
          deleteWBCommandSuccess(commandId),
        ]

        expect(clearStoreActions(store.getActions())).toEqual(clearStoreActions(expectedActions))
      })

      it('call both deleteWBCommandAction and processWBCommandFailure when fetch is fail', async () => {
        // Arrange
        const command = 'keys *'
        const commandId = `${Date.now()}`
        const errorMessage = 'Could not connect to aoeu:123, please check the connection details.'
        const responsePayload = {
          response: {
            status: 500,
            data: { message: errorMessage },
          },
        }

        apiService.delete = jest.fn().mockRejectedValueOnce(responsePayload)

        // Act
        await store.dispatch<any>(deleteWBCommandAction(commandId))

        // Assert
        const expectedActions = [
          processWBCommand(commandId),
          addErrorNotification(responsePayload as AxiosError),
          processWBCommandFailure({ command, error: responsePayload.response.data.message }),
        ]
        expect(clearStoreActions(store.getActions())).toEqual(clearStoreActions(expectedActions))
      })
    })

    describe('Fetch list of commands', () => {
      it('call both fetchWBHistoryAction and fetchWBCommandSuccess when response status is successed', async () => {
        // Arrange
        const data = [{
          command: 'command1',
          id: '1',
          databaseId: '1',
          createdAt: new Date(),
          result: [],
        }, {
          id: '2',
          command: 'command2',
          databaseId: '1',
          createdAt: new Date(),
          result: [],
        }]
        const responsePayload = { data, status: 200 }

        apiService.get = jest.fn().mockResolvedValue(responsePayload)

        // Act
        await store.dispatch<any>(fetchWBHistoryAction(mockItemId))

        // Assert
        const expectedActions = [
          loadWBHistory(),
          loadWBHistorySuccess(data)
        ]
        expect(clearStoreActions(store.getActions())).toEqual(clearStoreActions(expectedActions))
      })

      it('call both fetchWBHistoryAction and processWBCommandFailure when fetch is fail', async () => {
        // Arrange
        const commandId = `${Date.now()}`
        const errorMessage = 'Could not connect to aoeu:123, please check the connection details.'
        const responsePayload = {
          response: {
            status: 500,
            data: { message: errorMessage },
          },
        }

        apiService.get = jest.fn().mockRejectedValueOnce(responsePayload)

        // Act
        await store.dispatch<any>(fetchWBHistoryAction(commandId))

        // Assert
        const expectedActions = [
          loadWBHistory(),
          addErrorNotification(responsePayload as AxiosError),
          loadWBHistoryFailure(responsePayload.response.data.message),
        ]
        expect(clearStoreActions(store.getActions())).toEqual(clearStoreActions(expectedActions))
      })
    })
  })
})
