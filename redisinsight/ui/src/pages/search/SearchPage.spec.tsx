import React from 'react'
import { render, screen } from 'uiSrc/utils/test-utils'

import SearchPage from './SearchPage'

describe('SearchPage', () => {
  it('should render', () => {
    expect(render(<SearchPage />)).toBeTruthy()
  })
})
