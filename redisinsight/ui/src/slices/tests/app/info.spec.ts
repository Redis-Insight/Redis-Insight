import { cloneDeep } from 'lodash'

import {
  cleanup,
  initialStateDefault,
  mockedStore,
} from 'uiSrc/utils/test-utils'

import { apiService } from 'uiSrc/services'
import reducer, {
  initialState,
  setAnalyticsIdentified,
  setElectronInfo,
  setReleaseNotesViewed,
  getServerInfo,
  getServerInfoSuccess,
  getServerInfoFailure,
  appInfoSelector, fetchServerInfo,
} from '../../app/info'

jest.mock('uiSrc/services')

let store: typeof mockedStore
beforeEach(() => {
  cleanup()
  store = cloneDeep(mockedStore)
  store.clearActions()
})

describe('slices', () => {
  describe('reducer, actions and selectors', () => {
    it('should return the initial state on first run', () => {
      // Arrange
      const nextState = initialState

      // Act
      const result = reducer(undefined, {})

      // Assert
      expect(result).toEqual(nextState)
    })
  })

  describe('setAnalyticsIdentified', () => {
    it('should properly set analytics identified', () => {
      // Arrange
      const identified = true
      const state = {
        ...initialState,
        analytics: {
          ...initialState.analytics,
          identified
        }
      }

      // Act
      const nextState = reducer(initialState, setAnalyticsIdentified(identified))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { info: nextState },
      })

      expect(appInfoSelector(rootState)).toEqual(state)
    })
  })

  describe('setElectronInfo', () => {
    it('should properly set electron info', () => {
      // Arrange
      const data = {
        isUpdateAvailable: true,
        updateDownloadedVersion: '1.2.0'
      }
      const state = {
        ...initialState,
        electron: {
          ...initialState.electron,
          ...data
        }
      }

      // Act
      const nextState = reducer(initialState, setElectronInfo(data))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { info: nextState },
      })

      expect(appInfoSelector(rootState)).toEqual(state)
    })
  })

  describe('setReleaseNotesViewed', () => {
    it('should properly set state', () => {
      // Arrange
      const isReleaseNotesViewed = true
      const state = {
        ...initialState,
        electron: {
          ...initialState.electron,
          isReleaseNotesViewed
        }
      }

      // Act
      const nextState = reducer(initialState, setReleaseNotesViewed(isReleaseNotesViewed))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { info: nextState },
      })

      expect(appInfoSelector(rootState)).toEqual(state)
    })
  })

  describe('getServerInfo', () => {
    it('should properly set loading', () => {
      // Arrange
      const loading = true
      const state = {
        ...initialState,
        loading
      }

      // Act
      const nextState = reducer(initialState, getServerInfo())

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { info: nextState },
      })

      expect(appInfoSelector(rootState)).toEqual(state)
    })
  })

  describe('getServerInfoSuccess', () => {
    it('should properly set state after success', () => {
      // Arrange
      const data = {
        id: 'id1',
        createDateTime: '2000-01-01T00:00:00.000Z',
        appVersion: '2.0.0',
        osPlatform: 'win32',
        buildType: 'ELECTRON'
      }
      const state = {
        ...initialState,
        loading: false,
        server: data
      }

      // Act
      const nextState = reducer(initialState, getServerInfoSuccess(data))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { info: nextState },
      })

      expect(appInfoSelector(rootState)).toEqual(state)
    })
  })

  describe('getServerInfoFailure', () => {
    it('should properly set error', () => {
      // Arrange
      const error = 'error'
      const state = {
        ...initialState,
        loading: false,
        error
      }

      // Act
      const nextState = reducer(initialState, getServerInfoFailure(error))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { info: nextState },
      })

      expect(appInfoSelector(rootState)).toEqual(state)
    })
  })

  // thunks
  describe('fetchServerInfo', () => {
    it('succeed to fetch server info', async () => {
      // Arrange
      const data = {
        id: 'id1',
        createDateTime: '2000-01-01T00:00:00.000Z',
        appVersion: '2.0.0',
        osPlatform: 'win32',
        buildType: 'ELECTRON'
      }
      const responsePayload = { status: 200, data }

      apiService.get = jest.fn().mockResolvedValue(responsePayload)

      // Act
      await store.dispatch<any>(fetchServerInfo(jest.fn()))

      // Assert
      const expectedActions = [
        getServerInfo(),
        getServerInfoSuccess(data),
      ]

      expect(mockedStore.getActions()).toEqual(expectedActions)
    })

    it('failed to fetch server info', async () => {
      // Arrange
      const errorMessage = 'Something was wrong!'
      const responsePayload = {
        response: {
          status: 500,
          data: { message: errorMessage },
        },
      }
      apiService.get = jest.fn().mockRejectedValue(responsePayload)

      // Act
      await store.dispatch<any>(fetchServerInfo(jest.fn(), jest.fn()))

      // Assert
      const expectedActions = [
        getServerInfo(),
        getServerInfoFailure(errorMessage),
      ]

      expect(mockedStore.getActions()).toEqual(expectedActions)
    })
  })
})
