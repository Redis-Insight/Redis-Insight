import { createSlice } from '@reduxjs/toolkit'

import { IMonitorDataPayload, StateMonitor } from '../interfaces'
import { RootState } from '../store'

export const initialState: StateMonitor = {
  isShowMonitor: false,
  isRunning: false,
  isStarted: false,
  isMinimizedMonitor: false,
  socket: null,
  error: '',
  items: [],
}

export const MONITOR_ITEMS_MAX_COUNT = 5_000

// A slice for recipes
const monitorSlice = createSlice({
  name: 'monitor',
  initialState,
  reducers: {
    setMonitorInitialState: (state) => {
      state.socket?.removeAllListeners()
      state.socket?.disconnect()
      return { ...initialState }
    },
    // collapse / uncollapse Monitor
    toggleMonitor: (state) => {
      state.isShowMonitor = !state.isShowMonitor
      state.isMinimizedMonitor = !state.isMinimizedMonitor
    },

    // uncollapse Monitor
    showMonitor: (state) => {
      state.isShowMonitor = true
    },

    // hide / unhide CLI Helper
    toggleHideMonitor: (state) => {
      state.isMinimizedMonitor = !state.isMinimizedMonitor
    },

    setSocket: (state, { payload }) => {
      state.socket = payload
      state.isStarted = true
    },

    toggleRunMonitor: (state) => {
      state.isRunning = !state.isRunning
    },

    stopMonitor: (state) => {
      state.isRunning = false
    },

    concatMonitorItems: (state, { payload }: { payload: IMonitorDataPayload[] }) => {
      // small optimization to not unnecessary concat big arrays since we know max logs to show limitations
      if (payload.length >= MONITOR_ITEMS_MAX_COUNT) {
        state.items = [...payload.slice(-MONITOR_ITEMS_MAX_COUNT)]
        return
      }

      let newItems = [...state.items, ...payload]

      if (newItems.length > MONITOR_ITEMS_MAX_COUNT) {
        newItems = newItems.slice(newItems.length - MONITOR_ITEMS_MAX_COUNT)
      }

      state.items = newItems
    },

    resetMonitorItems: (state) => {
      state.items = []
    },
  },
})

// Actions generated from the slice
export const {
  setMonitorInitialState,
  showMonitor,
  toggleMonitor,
  toggleHideMonitor,
  setSocket,
  toggleRunMonitor,
  stopMonitor,
  concatMonitorItems,
  resetMonitorItems,
} = monitorSlice.actions

// A selector
export const monitorSelector = (state: RootState) => state.cli.monitor

// The reducer
export default monitorSlice.reducer
