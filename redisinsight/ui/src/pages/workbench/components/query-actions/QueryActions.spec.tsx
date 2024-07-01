import React from 'react'
import { mock } from 'ts-mockito'
import { render, screen, fireEvent } from 'uiSrc/utils/test-utils'

import QueryActions, { Props } from './QueryActions'

const mockedProps = mock<Props>()

describe('QueryActions', () => {
  it('should render', () => {
    expect(render(<QueryActions {...mockedProps} />)).toBeTruthy()
  })

  it('should call props on click buttons', () => {
    const onChangeMode = jest.fn()
    const onChangeGroupMode = jest.fn()
    const onSubmit = jest.fn()

    render(
      <QueryActions
        {...mockedProps}
        onChangeMode={onChangeMode}
        onChangeGroupMode={onChangeGroupMode}
        onSubmit={onSubmit}
      />
    )

    fireEvent.click(screen.getByTestId('btn-change-mode'))
    expect(onChangeMode).toBeCalled()

    fireEvent.click(screen.getByTestId('btn-change-group-mode'))
    expect(onChangeGroupMode).toBeCalled()

    fireEvent.click(screen.getByTestId('btn-submit'))
    expect(onSubmit).toBeCalled()
  })
})
