import { cloneDeep } from 'lodash'
import { AxiosError } from 'axios'
import { AnyAction } from '@reduxjs/toolkit'
import { cleanup, clearStoreActions, initialStateDefault, mockedStore } from 'uiSrc/utils/test-utils'
import { MOCK_RDI_PIPELINE_DATA, MOCK_RDI_PIPELINE_JSON_DATA } from 'uiSrc/mocks/data/rdi'
import reducer, {
  initialState,
  getPipeline,
  getPipelineSuccess,
  getPipelineFailure,
  deployPipeline,
  deployPipelineSuccess,
  deployPipelineFailure,
  getPipelineStrategies,
  getPipelineStrategiesSuccess,
  getPipelineStrategiesFailure,
  setPipelineSchema,
  setPipeline,
  setChangedFile,
  setChangedFiles,
  deleteChangedFile,
  fetchRdiPipeline,
  deployPipelineAction,
  rdiPipelineSelector,
  fetchRdiPipelineSchema,
  fetchPipelineStrategies,
  fetchPipelineTemplate,
} from 'uiSrc/slices/rdi/pipeline'
import { apiService } from 'uiSrc/services'
import { addErrorNotification, addInfiniteNotification } from 'uiSrc/slices/app/notifications'
import { INFINITE_MESSAGES } from 'uiSrc/components/notifications/components'
import { FileChangeType } from 'uiSrc/slices/interfaces'

let store: typeof mockedStore

beforeEach(() => {
  cleanup()
  store = cloneDeep(mockedStore)
  store.clearActions()
})

describe('rdi pipe slice', () => {
  describe('reducer, actions and selectors', () => {
    it('should return the initial state', () => {
      // Arrange
      const nextState = initialState

      // Act
      const result = reducer(undefined, {} as AnyAction)

      // Assert
      expect(result).toEqual(nextState)
    })
  })

  describe('rdiPipelineSelector', () => {
    it('should properly set state', () => {
      // Arrange
      const state = {
        ...initialState,
        loading: true,
      }

      // Act
      const nextState = reducer(initialState, getPipeline())

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        rdi: {
          pipeline: nextState,
        }
      })
      expect(rdiPipelineSelector(rootState)).toEqual(state)
    })
  })

  describe('setPipeline', () => {
    it('should properly set state', () => {
      // Arrange
      const state = {
        ...initialState,
        data: MOCK_RDI_PIPELINE_DATA,
      }

      // Act
      const nextState = reducer(initialState, setPipeline(MOCK_RDI_PIPELINE_DATA))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        rdi: {
          pipeline: nextState,
        }
      })
      expect(rdiPipelineSelector(rootState)).toEqual(state)
    })
  })

  describe('getPipelineSuccess', () => {
    it('should properly set state', () => {
      // Arrange
      const state = {
        ...initialState,
        loading: false,
        data: MOCK_RDI_PIPELINE_DATA,
      }
      // Act
      const nextState = reducer(initialState, getPipelineSuccess(MOCK_RDI_PIPELINE_DATA))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        rdi: {
          pipeline: nextState,
        }
      })
      expect(rdiPipelineSelector(rootState)).toEqual(state)
    })
  })

  describe('getPipelineFailure', () => {
    it('should properly set state', () => {
      // Arrange
      const error = 'error'
      const state = {
        ...initialState,
        loading: false,
        error,
      }

      // Act
      const nextState = reducer(initialState, getPipelineFailure(error))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        rdi: {
          pipeline: nextState,
        }
      })
      expect(rdiPipelineSelector(rootState)).toEqual(state)
    })
  })

  describe('deployPipeline', () => {
    it('should set loading = true', () => {
      // Arrange
      const state = {
        ...initialState,
        loading: true,
      }

      // Act
      const nextState = reducer(initialState, deployPipeline())

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        rdi: {
          pipeline: nextState,
        }
      })
      expect(rdiPipelineSelector(rootState)).toEqual(state)
    })
  })

  describe('deployPipelineSuccess', () => {
    it('should set loading = false', () => {
      // Arrange
      const state = {
        ...initialState,
        loading: false,
      }

      // Act
      const nextState = reducer(initialState, deployPipelineSuccess())

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        rdi: {
          pipeline: nextState,
        }
      })
      expect(rdiPipelineSelector(rootState)).toEqual(state)
    })
  })

  describe('deployPipelineFailure', () => {
    it('should set loading = false', () => {
      // Arrange
      const state = {
        ...initialState,
        loading: false,
      }

      // Act
      const nextState = reducer(initialState, deployPipelineFailure())

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        rdi: {
          pipeline: nextState,
        }
      })
      expect(rdiPipelineSelector(rootState)).toEqual(state)
    })
  })

  describe('getPipelineStrategies', () => {
    it('should set loading = true', () => {
      // Arrange
      const state = {
        ...initialState,
        strategies: {
          ...initialState.strategies,
          loading: true
        },
      }

      // Act
      const nextState = reducer(initialState, getPipelineStrategies())

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        rdi: {
          pipeline: nextState,
        }
      })
      expect(rdiPipelineSelector(rootState)).toEqual(state)
    })
  })

  describe('getPipelineStrategiesSuccess', () => {
    it('should set loading = false', () => {
      const mockData = [{ strategy: 'ingest', databases: ['oracle'] }]
      // Arrange
      const state = {
        ...initialState,
        strategies: {
          ...initialState.strategies,
          data: mockData,
        },
      }

      // Act
      const nextState = reducer(initialState, getPipelineStrategiesSuccess(mockData))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        rdi: {
          pipeline: nextState,
        }
      })
      expect(rdiPipelineSelector(rootState)).toEqual(state)
    })
  })

  describe('getPipelineStrategiesFailure', () => {
    it('should set loading = false', () => {
      const mockError = 'some error'
      // Arrange
      const state = {
        ...initialState,
        strategies: {
          ...initialState.strategies,
          error: mockError,
        },
      }

      // Act
      const nextState = reducer(initialState, getPipelineStrategiesFailure(mockError))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        rdi: {
          pipeline: nextState,
        }
      })
      expect(rdiPipelineSelector(rootState)).toEqual(state)
    })
  })

  describe('setChangedFile', () => {
    it('should set change file', () => {
      const mockChangedFile = { name: 'name', status: FileChangeType.Added }
      // Arrange
      const state = {
        ...initialState,
        changes: {
          name: FileChangeType.Added,
        },
      }

      // Act
      const nextState = reducer(initialState, setChangedFile(mockChangedFile))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        rdi: {
          pipeline: nextState,
        }
      })
      expect(rdiPipelineSelector(rootState)).toEqual(state)
    })
  })

  describe('deleteChangedFile', () => {
    it('should remove changed file', () => {
      const mockChangedFile = { name: 'name', status: FileChangeType.Added }
      // Arrange
      const state = {
        ...initialState,
        changes: {
          name: FileChangeType.Added,
        },
      }

      // Act
      const nextState = reducer(state, deleteChangedFile(mockChangedFile.name))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        rdi: {
          pipeline: nextState,
        }
      })
      expect(rdiPipelineSelector(rootState)).toEqual(initialState)
    })
  })

  describe('setChangedFiles', () => {
    it('should replace changed files', () => {
      const mockChangedFiles1 = { name: FileChangeType.Modified }
      const mockChangedFiles2 = { name: FileChangeType.Removed }

      // Arrange
      const state = {
        ...initialState,
        changes: mockChangedFiles2,
      }

      // Act
      const nextState = reducer({ ...initialState, changes: mockChangedFiles1 }, setChangedFiles(mockChangedFiles2))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        rdi: {
          pipeline: nextState,
        }
      })
      expect(rdiPipelineSelector(rootState)).toEqual(state)
    })
  })

  // thunks
  describe('thunks', () => {
    describe('fetchRdiPipeline', () => {
      it('succeed to fetch data', async () => {
        const data = MOCK_RDI_PIPELINE_JSON_DATA
        const responsePayload = { data, status: 200 }

        apiService.get = jest.fn().mockResolvedValue(responsePayload)

        // Act
        await store.dispatch<any>(
          fetchRdiPipeline('123')
        )

        // Assert
        const expectedActions = [
          getPipeline(),
          getPipelineSuccess(MOCK_RDI_PIPELINE_DATA),
          setChangedFiles({})
        ]

        expect(store.getActions()).toEqual(expectedActions)
      })

      it('failed to fetch data', async () => {
        const errorMessage = 'Something was wrong!'
        const responsePayload = {
          response: {
            status: 500,
            data: { message: errorMessage },
          },
        }

        apiService.get = jest.fn().mockRejectedValue(responsePayload)

        // Act
        await store.dispatch<any>(
          fetchRdiPipeline('123')
        )

        // Assert
        const expectedActions = [
          getPipeline(),
          addErrorNotification(responsePayload as AxiosError),
          getPipelineFailure(errorMessage)
        ]

        expect(store.getActions()).toEqual(expectedActions)
      })
    })

    describe('deployPipelineAction', () => {
      it('succeed to post data', async () => {
        const mockData = { config: 'string', jobs: [] }
        const responsePayload = { status: 200 }

        apiService.post = jest.fn().mockResolvedValue(responsePayload)

        // Act
        await store.dispatch<any>(
          deployPipelineAction('123', mockData)
        )

        // Assert
        const expectedActions = [
          deployPipeline(),
          deployPipelineSuccess(),
          addInfiniteNotification(INFINITE_MESSAGES.SUCCESS_DEPLOY_PIPELINE()),
        ]

        expect(clearStoreActions(store.getActions())).toEqual(clearStoreActions(expectedActions))
      })

      it('failed to post data', async () => {
        const mockData = { config: 'string', jobs: [] }
        const errorMessage = 'Something was wrong!'
        const responsePayload = {
          response: {
            status: 500,
            data: { message: errorMessage },
          },
        }

        apiService.post = jest.fn().mockRejectedValue(responsePayload)

        // Act
        await store.dispatch<any>(
          deployPipelineAction('123', mockData)
        )

        // Assert
        const expectedActions = [
          deployPipeline(),
          addErrorNotification(responsePayload as AxiosError),
          deployPipelineFailure()
        ]

        expect(store.getActions()).toEqual(expectedActions)
      })
    })

    describe('fetchRdiPipelineSchema', () => {
      it('succeed to fetch data', async () => {
        const data = { config: 'string' }
        const responsePayload = { data, status: 200 }

        apiService.get = jest.fn().mockResolvedValue(responsePayload)

        // Act
        await store.dispatch<any>(
          fetchRdiPipelineSchema('123')
        )

        // Assert
        const expectedActions = [
          setPipelineSchema(data),
        ]

        expect(store.getActions()).toEqual(expectedActions)
      })

      it('failed to fetch data', async () => {
        const errorMessage = 'Something was wrong!'
        const responsePayload = {
          response: {
            status: 500,
            data: { message: errorMessage },
          },
        }

        apiService.get = jest.fn().mockRejectedValue(responsePayload)

        // Act
        await store.dispatch<any>(
          fetchRdiPipelineSchema('123')
        )

        // Assert
        const expectedActions = [
          setPipelineSchema(null),
        ]

        expect(store.getActions()).toEqual(expectedActions)
      })
    })

    describe('fetchPipelineStrategies', () => {
      it('succeed to fetch data', async () => {
        const data = { strategies: [{ strategy: 'ingest', databases: ['oracle'] }] }

        const responsePayload = { data, status: 200 }

        apiService.get = jest.fn().mockResolvedValue(responsePayload)

        // Act
        await store.dispatch<any>(
          fetchPipelineStrategies('123')
        )

        // Assert
        const expectedActions = [
          getPipelineStrategies(),
          getPipelineStrategiesSuccess(data.strategies),
        ]

        expect(store.getActions()).toEqual(expectedActions)
      })

      it('failed to fetch data', async () => {
        const errorMessage = 'Something was wrong!'
        const responsePayload = {
          response: {
            status: 500,
            data: { message: errorMessage },
          },
        }

        apiService.get = jest.fn().mockRejectedValue(responsePayload)

        // Act
        await store.dispatch<any>(
          fetchPipelineStrategies('123')
        )

        // Assert
        const expectedActions = [
          getPipelineStrategies(),
          getPipelineStrategiesFailure(errorMessage),
        ]

        expect(store.getActions()).toEqual(expectedActions)
      })
    })

    describe('fetchPipelineTemplate', () => {
      it('failed to fetch data', async () => {
        const mockOptions = { dbType: 'db type' }
        const errorMessage = 'Something was wrong!'
        const responsePayload = {
          response: {
            status: 500,
            data: { message: errorMessage },
          },
        }

        apiService.get = jest.fn().mockRejectedValue(responsePayload)

        // Act
        await store.dispatch<any>(
          fetchPipelineTemplate('123', mockOptions)
        )

        // Assert
        const expectedActions = [
          addErrorNotification(responsePayload as AxiosError),
        ]

        expect(store.getActions()).toEqual(expectedActions)
      })
    })
  })
})
