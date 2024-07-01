import React from 'react'

import apiService, { setCSRFHeader } from 'uiSrc/services/apiService'
import { render, screen, waitFor } from 'uiSrc/utils/test-utils'
import Csrf from './Csrf'

jest.mock('uiSrc/services/apiService', () => ({
  setCSRFHeader: jest.fn(),
  get: jest.fn(() => ({ data: { token: 'csrf-token' } })),
}))

describe('Csrf', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...OLD_ENV }
  })
  afterAll(() => {
    process.env = OLD_ENV
  })

  it('should render children', () => {
    render(
      <Csrf>
        <div>children</div>
      </Csrf>
    )

    expect(screen.getByText('children')).toBeInTheDocument()
  })

  it('should not fetch CSRF token when endpoint is not provided', () => {
    render(<Csrf />)

    expect(apiService.get).not.toHaveBeenCalled()

    expect(screen.queryByTestId('page-placeholder')).not.toBeInTheDocument()
  })

  it('should render PagePlaceholder when loading', () => {
    process.env.RI_CSRF_ENDPOINT = 'csrf-endpoint'

    render(<Csrf />)

    expect(screen.getByTestId('page-placeholder')).toBeInTheDocument()
  })

  it('should fetch CSRF token', async () => {
    process.env.RI_CSRF_ENDPOINT = 'csrf-endpoint'

    render(
      <Csrf>
        <div>children</div>
      </Csrf>
    )

    await waitFor(() => {
      expect(apiService.get).toHaveBeenCalledWith('csrf-endpoint')
      expect(setCSRFHeader).toHaveBeenCalledWith('csrf-token')

      expect(screen.getByText('children')).toBeInTheDocument()
    })
  })

  it('should handle error while fetching CSRF token', async () => {
    process.env.RI_CSRF_ENDPOINT = 'csrf-endpoint'
    jest.spyOn(apiService, 'get').mockImplementationOnce(() => { throw new Error('error') })
    jest.spyOn(console, 'error').mockImplementationOnce(() => {})

    render(
      <Csrf>
        <div>children</div>
      </Csrf>
    )

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith('Error fetching CSRF token: ', new Error('error'))

      expect(screen.getByText('children')).toBeInTheDocument()
    })
  })
})
