import { cloneDeep } from 'lodash'
import { KeyTypes, SortOrder } from 'uiSrc/constants'
import { stringToBuffer } from 'uiSrc/utils'

import {
  cleanup,
  initialStateDefault,
  mockedStore,
} from 'uiSrc/utils/test-utils'
import reducer, {
  initialState,
  setAppContextInitialState,
  setAppContextConnectedInstanceId,
  setAppContextConnectedRdiInstanceId,
  setBrowserPatternKeyListDataLoaded,
  setBrowserRedisearchKeyListDataLoaded,
  setBrowserSelectedKey,
  setBrowserPatternScrollPosition,
  setBrowserPanelSizes,
  setBrowserTreeSort,
  setWorkbenchScript,
  setWorkbenchVerticalPanelSizes,
  setLastPageContext,
  appContextSelector,
  appContextBrowser,
  appContextWorkbench,
  setBrowserTreeNodesOpen,
  resetBrowserTree,
  appContextBrowserTree,
  setBrowserTreeDelimiter,
  setBrowserIsNotRendered,
  setBrowserRedisearchScrollPosition,
  updateKeyDetailsSizes,
  appContextBrowserKeyDetails,
  appContextDbConfig,
  setSlowLogUnits,
  setDbConfig,
  setDbIndexState,
  appContextDbIndex,
  setRecommendationsShowHidden,
  appContextCapability,
  setCapability,
  setPipelineDialogState,
  setLastPipelineManagementPage,
  resetPipelineManagement,
  appContextPipelineManagement,
} from '../../app/context'

jest.mock('uiSrc/services', () => ({
  ...jest.requireActual('uiSrc/services'),
}))

let store: typeof mockedStore
beforeEach(() => {
  cleanup()
  store = cloneDeep(mockedStore)
  store.clearActions()
})

describe('slices', () => {
  describe('setAppContextInitialState', () => {
    it('should properly set initial state', () => {
      const nextState = reducer(initialState, setAppContextInitialState())
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })
      expect(appContextSelector(rootState)).toEqual(initialState)
    })

    it('should properly set initial state with existing contextId and capability and contextRdiInstanceId', () => {
      // Arrange
      const contextInstanceId = '12312-3123'
      const contextRdiInstanceId = 'rdi-123'
      const capability = { source: '123123' }
      const prevState = {
        ...initialState,
        contextInstanceId,
        contextRdiInstanceId,
        capability,
        browser: {
          ...initialState.browser,
          keyList: {
            ...initialState.browser.keyList,
            isDataLoaded: true,
            scrollTopPosition: 100,
            selectedKey: stringToBuffer('some key'),
          },
          tree: {
            ...initialState.browser.tree,
            delimiter: '-',
          },
          bulkActions: {
            ...initialState.browser.bulkActions,
            opened: true,
          },
        },
        workbench: {
          ...initialState.workbench,
          script: '123123',
        },
        pubsub: {
          ...initialState.pubsub,
          channel: '123123',
          message: '123123'
        },
        analytics: {
          ...initialState.analytics,
          lastViewedPage: 'zxczxc'
        }
      }
      const state = {
        ...initialState,
        contextInstanceId,
        contextRdiInstanceId,
        capability,
      }

      // Act
      const nextState = reducer(prevState, setAppContextInitialState())

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextSelector(rootState)).toEqual(state)
    })
  })

  describe('setAppContextConnectedInstanceId', () => {
    it('should properly set id', () => {
      // Arrange
      const contextInstanceId = '12312-3123'
      const state = {
        ...initialState,
        contextInstanceId
      }

      // Act
      const nextState = reducer(initialState, setAppContextConnectedInstanceId(contextInstanceId))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextSelector(rootState)).toEqual(state)
    })
  })

  describe('setAppContextConnectedRdiInstanceId', () => {
    it('should properly set id', () => {
      // Arrange
      const contextRdiInstanceId = 'rdi-123'
      const state = {
        ...initialState,
        contextRdiInstanceId
      }

      // Act
      const nextState = reducer(initialState, setAppContextConnectedRdiInstanceId(contextRdiInstanceId))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextSelector(rootState)).toEqual(state)
    })
  })

  describe('setBrowserPatternKeyListDataLoaded', () => {
    it('should properly set context is data loaded', () => {
      // Arrange
      const isDataPatternLoaded = true
      const state = {
        ...initialState.browser,
        keyList: {
          ...initialState.browser.keyList,
          isDataPatternLoaded
        }
      }

      // Act
      const nextState = reducer(initialState, setBrowserPatternKeyListDataLoaded(isDataPatternLoaded))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextBrowser(rootState)).toEqual(state)
    })
  })

  describe('setBrowserRedisearchKeyListDataLoaded', () => {
    it('should properly set context is data loaded', () => {
      // Arrange
      const isDataRedisearchLoaded = true
      const state = {
        ...initialState.browser,
        keyList: {
          ...initialState.browser.keyList,
          isDataRedisearchLoaded
        }
      }

      // Act
      const nextState = reducer(initialState, setBrowserRedisearchKeyListDataLoaded(isDataRedisearchLoaded))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextBrowser(rootState)).toEqual(state)
    })
  })

  describe('setBrowserSelectedKey', () => {
    it('should properly set selectedKey', () => {
      // Arrange
      const selectedKey = stringToBuffer('nameOfKey')
      const state = {
        ...initialState.browser,
        keyList: {
          ...initialState.browser.keyList,
          selectedKey
        }
      }

      // Act
      const nextState = reducer(initialState, setBrowserSelectedKey(selectedKey))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextBrowser(rootState)).toEqual(state)
    })
  })

  describe('setBrowserPatternScrollPosition', () => {
    it('should properly set scroll position of keyList', () => {
      // Arrange
      const scrollPatternTopPosition = 530
      const state = {
        ...initialState.browser,
        keyList: {
          ...initialState.browser.keyList,
          scrollPatternTopPosition
        }
      }

      // Act
      const nextState = reducer(initialState, setBrowserPatternScrollPosition(scrollPatternTopPosition))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextBrowser(rootState)).toEqual(state)
    })
  })

  describe('setBrowserRedisearchScrollPosition', () => {
    it('should properly set scroll position of keyList', () => {
      // Arrange
      const scrollRedisearchTopPosition = 530
      const state = {
        ...initialState.browser,
        keyList: {
          ...initialState.browser.keyList,
          scrollRedisearchTopPosition
        }
      }

      // Act
      const nextState = reducer(
        initialState,
        setBrowserRedisearchScrollPosition(scrollRedisearchTopPosition)
      )

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextBrowser(rootState)).toEqual(state)
    })
  })

  describe('setBrowserPanelSizes', () => {
    it('should properly set browser panel widths', () => {
      // Arrange
      const panelSizes = {
        first: 100,
        second: 200
      }
      const state = {
        ...initialState.browser,
        panelSizes
      }

      // Act
      const nextState = reducer(initialState, setBrowserPanelSizes(panelSizes))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextBrowser(rootState)).toEqual(state)
    })
  })

  describe('setWorkbenchScript', () => {
    it('should properly set workbench script', () => {
      // Arrange
      const script = 'set 1 1 // 215 hset 5 21'
      const state = {
        ...initialState.workbench,
        script
      }

      // Act
      const nextState = reducer(initialState, setWorkbenchScript(script))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextWorkbench(rootState)).toEqual(state)
    })
  })

  describe('setWorkbenchVerticalPanelSizes', () => {
    it('should properly set wb panel sizes', () => {
      // Arrange
      const panelSizes = {
        first: 100,
        second: 200
      }
      const state = {
        ...initialState.workbench,
        panelSizes: {
          ...initialState.workbench.panelSizes,
          vertical: panelSizes
        }
      }

      // Act
      const nextState = reducer(initialState, setWorkbenchVerticalPanelSizes(panelSizes))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextWorkbench(rootState)).toEqual(state)
    })
  })

  describe('setLastPageContext', () => {
    it('should properly set last page', () => {
      // Arrange
      const lastPage = 'workbench'
      const state = {
        ...initialState,
        lastBrowserPage: lastPage
      }

      // Act
      const nextState = reducer(initialState, setLastPageContext(lastPage))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextSelector(rootState)).toEqual(state)
    })
  })

  describe('setBrowserTreeNodesOpen', () => {
    it('should properly set open nodes in the tree', () => {
      // Arrange
      const openNodes = {
        '1o2313': true,
        eu12313: false,
      }
      const prevState = {
        ...initialState,
        browser: {
          ...initialState.browser,
          tree: {
            ...initialState.browser.tree,
            openNodes
          }
        },
      }

      const state = {
        ...initialState.browser.tree,
        openNodes
      }

      // Act
      const nextState = reducer(prevState, setBrowserTreeNodesOpen(openNodes))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextBrowserTree(rootState)).toEqual(state)
    })
  })

  describe('setBrowserIsNotRendered', () => {
    it('should properly set browser is not rendered value', () => {
      // Arrange
      const isNotRendered = false
      const state = {
        ...initialState.browser,
        keyList: {
          ...initialState.browser.keyList,
          isNotRendered
        }
      }

      // Act
      const nextState = reducer(initialState, setBrowserIsNotRendered(isNotRendered))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextBrowser(rootState)).toEqual(state)
    })
  })

  describe('setDbConfig', () => {
    it('should properly set db config', () => {
      // Arrange
      const data = {
        slowLogDurationUnit: 'msec',
        treeViewDelimiter: ':-',
        treeViewSort: SortOrder.DESC,
        showHiddenRecommendations: true,
      }

      const state = {
        ...initialState.dbConfig,
        ...data
      }

      // Act
      const nextState = reducer(initialState, setDbConfig(data))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextDbConfig(rootState)).toEqual(state)
    })
  })

  describe('setSlowLogUnits', () => {
    it('should properly set slow log units', () => {
      // Arrange
      const slowLogDurationUnit = 'msec'

      const state = {
        ...initialState.dbConfig,
        slowLogDurationUnit
      }

      // Act
      const nextState = reducer(initialState, setSlowLogUnits(slowLogDurationUnit))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextDbConfig(rootState)).toEqual(state)
    })
  })

  describe('setBrowserTreeDelimiter', () => {
    it('should properly set browser tree delimiter', () => {
      // Arrange
      const delimiter = '_'

      const state = {
        ...initialState.dbConfig,
        treeViewDelimiter: delimiter
      }

      // Act
      const nextState = reducer(initialState, setBrowserTreeDelimiter(delimiter))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextDbConfig(rootState)).toEqual(state)
    })
  })

  describe('setBrowserTreeSort', () => {
    it('should properly set browser tree sorting', () => {
      // Arrange
      const sorting = SortOrder.DESC

      const state = {
        ...initialState.dbConfig,
        treeViewSort: sorting,
      }

      // Act
      const nextState = reducer(initialState, setBrowserTreeSort(sorting))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextDbConfig(rootState)).toEqual(state)
    })
  })

  describe('setRecommendationsShowHidden', () => {
    it('should properly set is show hidden live recommendations', () => {
      // Arrange
      const value = true

      const state = {
        ...initialState.dbConfig,
        showHiddenRecommendations: value
      }

      // Act
      const nextState = reducer(initialState, setRecommendationsShowHidden(value))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextDbConfig(rootState)).toEqual(state)
    })
  })

  describe('resetBrowserTree', () => {
    it('should properly set last page', () => {
      // Arrange
      const prevState = {
        ...initialState,
        browser: {
          ...initialState.browser,
          tree: {
            ...initialState.browser.tree,
            openNodes: {
              test: true
            },
            selectedLeaf: 'test',
          }
        },
      }
      const state = {
        ...initialState.browser.tree,
        openNodes: {},
        selectedLeaf: null
      }

      // Act
      const nextState = reducer(prevState, resetBrowserTree())

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextBrowserTree(rootState)).toEqual(state)
    })
  })

  describe('updateKeyDetailsSizes', () => {
    it('should properly update sizes', () => {
      // Arrange
      const payload = {
        type: KeyTypes.Hash,
        sizes: {
          field: 50
        }
      }

      const state = {
        ...initialState.browser.keyDetailsSizes,
        [KeyTypes.Hash]: { ...payload.sizes }
      }

      // Act
      const nextState = reducer(initialState, updateKeyDetailsSizes(payload))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextBrowserKeyDetails(rootState)).toEqual(state)
    })
  })

  describe('setDbIndexState', () => {
    it('should properly set state for db index', () => {
      // Arrange
      const state = {
        ...initialState.dbIndex,
        disabled: true
      }

      // Act
      const nextState = reducer(initialState, setDbIndexState(true))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextDbIndex(rootState)).toEqual(state)
    })
  })

  describe('setCapability', () => {
    it('should properly set db config', () => {
      // Arrange
      const data = {
        source: '123123',
        tutorialPopoverShown: false,
      }

      const state = {
        ...initialState.capability,
        source: data.source,
      }

      // Act
      const nextState = reducer(initialState, setCapability(data))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextCapability(rootState)).toEqual(state)
    })
  })

  describe('setPipelineDialogState', () => {
    it('should properly set pipeline dialog state', () => {
      // Arrange
      const state = {
        ...initialState.pipelineManagement,
        isOpenDialog: false,
      }

      // Act
      const nextState = reducer(initialState, setPipelineDialogState(false))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextPipelineManagement(rootState)).toEqual(state)
    })
  })

  describe('setLastPipelineManagementPage', () => {
    it('should properly set last viewed page', () => {
      // Arrange
      const mockLastPage = 'name'
      const state = {
        ...initialState.pipelineManagement,
        lastViewedPage: mockLastPage,
      }

      // Act
      const nextState = reducer(initialState, setLastPipelineManagementPage(mockLastPage))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextPipelineManagement(rootState)).toEqual(state)
    })
  })

  describe('resetPipelineManagement', () => {
    it('should properly set last page', () => {
      // Arrange
      const prevState = {
        ...initialState,
        pipelineManagement: {
          lastViewedPage: 'some value',
          isOpenDialog: false,
        },
      }
      const state = {
        lastViewedPage: '',
        isOpenDialog: true,
      }

      // Act
      const nextState = reducer(prevState, resetPipelineManagement())

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextPipelineManagement(rootState)).toEqual(state)
    })
  })
})
