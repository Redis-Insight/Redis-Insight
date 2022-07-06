import React from 'react'
import {
  render,
  screen,
  fireEvent,
} from 'uiSrc/utils/test-utils'
import AdvancedSettingsItem from './AdvancedSettingsItem'

jest.mock('uiSrc/slices/user/user-settings', () => ({
  ...jest.requireActual('uiSrc/slices/user/user-settings'),
  userSettingsSelector: jest.fn().mockReturnValue({
    config: {
      scanThreshold: 10000,
      batchSize: 5,
    },
  }),
  updateUserConfigSettingsAction: () => jest.fn
}))

const mockedProps = {
  initValue: '10000',
  onApply: jest.fn(),
  validation: jest.fn((x) => x),
  title: 'Keys to Scan in Browser',
  summary: 'Sets the amount of keys to scan per one iteration. Filtering by pattern per a large number of keys may decrease performance.',
  testid: 'keys-to-scan',
  placeholder: '10 000',
  label: 'Keys to Scan:',
}

describe('AdvancedSettingsItem', () => {
  it('should render', () => {
    expect(render(<AdvancedSettingsItem {...mockedProps} />)).toBeTruthy()
  })

  it('should render keys to scan value', () => {
    render(<AdvancedSettingsItem {...mockedProps} />)
    expect(screen.getByTestId(/keys-to-scan-value/)).toHaveTextContent('10000')
  })

  it('should render keys to scan input after click value', () => {
    render(<AdvancedSettingsItem {...mockedProps} />)
    screen.getByTestId(/keys-to-scan-value/).click()
    expect(screen.getByTestId(/keys-to-scan-input/)).toBeInTheDocument()
  })

  it('should change keys to scan input properly', () => {
    render(<AdvancedSettingsItem {...mockedProps} />)
    screen.getByTestId(/keys-to-scan-value/).click()
    fireEvent.change(
      screen.getByTestId(/keys-to-scan-input/),
      {
        target: { value: '6900' }
      }
    )
    expect(screen.getByTestId(/keys-to-scan-input/)).toHaveValue('6900')
  })

  it('should properly apply changes', () => {
    render(<AdvancedSettingsItem {...mockedProps} />)

    screen.getByTestId(/keys-to-scan-value/).click()
    fireEvent.change(
      screen.getByTestId(/keys-to-scan-input/),
      {
        target: { value: '6900' }
      }
    )
    screen.getByTestId(/apply-btn/).click()
    expect(screen.getByTestId(/keys-to-scan-value/)).toHaveTextContent('6900')
  })

  it('should properly decline changes', () => {
    render(<AdvancedSettingsItem {...mockedProps} />)
    screen.getByTestId(/keys-to-scan-value/).click()

    fireEvent.change(
      screen.getByTestId(/keys-to-scan-input/),
      {
        target: { value: '6900' }
      }
    )
    screen.getByTestId(/cancel-btn/).click()
    expect(screen.getByTestId(/keys-to-scan-value/)).toHaveTextContent('10000')
  })
})
