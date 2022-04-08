import { cloneDeep } from 'lodash'
import React from 'react'
import { instance, mock } from 'ts-mockito'
import { DEFAULT_DELIMITER } from 'uiSrc/constants'
import { setBrowserTreeDelimiter } from 'uiSrc/slices/app/context'
import { localStorageService } from 'uiSrc/services'
import {
  cleanup,
  clearStoreActions,
  fireEvent,
  mockedStore,
  render,
  screen,
  waitFor,
} from 'uiSrc/utils/test-utils'

import KeyTreeDelimiter, { Props } from './KeyTreeDelimiter'

const mockedProps = mock<Props>()
let store: typeof mockedStore
const INLINE_ITEM_EDITOR = 'inline-item-editor'
const INLINE_EDITOR_APPLY_BTN = 'apply-btn'
const DELIMITER_TRIGGER_BTN = 'tree-view-delimiter-btn'
const DELIMITER_INPUT = 'tree-view-delimiter-input'

beforeEach(() => {
  cleanup()
  store = cloneDeep(mockedStore)
  store.clearActions()
})

jest.mock('uiSrc/services', () => ({
  localStorageService: {
    set: jest.fn(),
    get: jest.fn(),
  },
}))

describe('KeyTreeDelimiter', () => {
  it('should render', () => {
    expect(render(<KeyTreeDelimiter {...instance(mockedProps)} />)).toBeTruthy()
  })

  it('Delimiter button should be rendered', () => {
    render(<KeyTreeDelimiter {...instance(mockedProps)} />)

    expect(screen.getByTestId(DELIMITER_TRIGGER_BTN)).toBeInTheDocument()
  })

  it('Delimiter input should be rendered after click on button', async () => {
    render(<KeyTreeDelimiter {...instance(mockedProps)} />)

    await waitFor(() => {
      fireEvent.click(screen.getByTestId(DELIMITER_TRIGGER_BTN))
    })

    expect(screen.getByTestId(DELIMITER_INPUT)).toBeInTheDocument()
  })

  it('"setBrowserTreeDelimiter" should be called with value for LocalStorage after render', async () => {
    jest.useFakeTimers()
    const localStorageValue = 'test'
    localStorageService.get = jest.fn().mockReturnValue(localStorageValue)

    render(<KeyTreeDelimiter {...instance(mockedProps)} />)

    jest.advanceTimersByTime(0)

    const expectedActions = [setBrowserTreeDelimiter(localStorageValue)]

    expect(clearStoreActions(store.getActions())).toEqual(
      clearStoreActions(expectedActions)
    )
  })

  it('"setBrowserTreeDelimiter" should be called with DEFAULT_DELIMITER after render', async () => {
    jest.useFakeTimers()
    const localStorageValue = ''
    localStorageService.get = jest.fn().mockReturnValue(localStorageValue)
    render(<KeyTreeDelimiter {...instance(mockedProps)} />)

    jest.advanceTimersByTime(0)

    const expectedActions = [setBrowserTreeDelimiter(DEFAULT_DELIMITER)]

    expect(clearStoreActions(store.getActions())).toEqual(
      clearStoreActions(expectedActions)
    )
  })

  it('"setBrowserTreeDelimiter" should be called after Apply change delimiter', async () => {
    const value = 'val'
    render(<KeyTreeDelimiter {...instance(mockedProps)} />)

    await waitFor(() => {
      fireEvent.click(screen.getByTestId(DELIMITER_TRIGGER_BTN))
    })

    fireEvent.change(screen.getByTestId(INLINE_ITEM_EDITOR), { target: { value } })

    await waitFor(() => {
      fireEvent.click(screen.getByTestId(INLINE_EDITOR_APPLY_BTN))
    })

    const expectedActions = [
      setBrowserTreeDelimiter(value),
    ]

    expect(clearStoreActions(store.getActions())).toEqual(
      clearStoreActions(expectedActions)
    )
  })

  it('"setBrowserTreeDelimiter" should be called with DEFAULT_DELIMITER after Apply change with empty input', async () => {
    const value = ''
    render(<KeyTreeDelimiter {...instance(mockedProps)} />)

    await waitFor(() => {
      fireEvent.click(screen.getByTestId(DELIMITER_TRIGGER_BTN))
    })

    fireEvent.change(screen.getByTestId(INLINE_ITEM_EDITOR), { target: { value } })

    await waitFor(() => {
      fireEvent.click(screen.getByTestId(INLINE_EDITOR_APPLY_BTN))
    })

    const expectedActions = [
      setBrowserTreeDelimiter(DEFAULT_DELIMITER),
    ]

    expect(clearStoreActions(store.getActions())).toEqual(
      clearStoreActions(expectedActions)
    )
  })
})
