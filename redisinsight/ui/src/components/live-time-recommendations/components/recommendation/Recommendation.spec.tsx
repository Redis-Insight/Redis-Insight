import React from 'react'
import { mock, instance } from 'ts-mockito'
import reactRouterDom from 'react-router-dom'
import { cloneDeep } from 'lodash'
import { fireEvent, screen, render, mockedStore, cleanup, act } from 'uiSrc/utils/test-utils'
import { sendEventTelemetry, TelemetryEvent } from 'uiSrc/telemetry'
import { MOCK_GUIDES_ITEMS, MOCK_TUTORIALS_ITEMS, Pages } from 'uiSrc/constants'

import { updateRecommendation } from 'uiSrc/slices/recommendations/recommendations'
import Recommendation, { IProps } from './Recommendation'

const mockedProps = mock<IProps>()

jest.mock('uiSrc/telemetry', () => ({
  ...jest.requireActual('uiSrc/telemetry'),
  sendEventTelemetry: jest.fn(),
}))

let store: typeof mockedStore
beforeEach(() => {
  cleanup()
  store = cloneDeep(mockedStore)
  store.clearActions()
})

describe('Recommendation', () => {
  it('should render', () => {
    expect(render(<Recommendation {...instance(mockedProps)} />)).toBeTruthy()
  })

  it('should render content if recommendation is not read', () => {
    render(<Recommendation
      {...instance(mockedProps)}
      name="searchJSON"
      tutorial=""
      isRead={false}
    />)

    expect(screen.getByTestId('recommendation-voting')).toBeInTheDocument()
    expect(screen.getByTestId('searchJSON-to-tutorial-btn')).toBeInTheDocument()
  })

  it('should render RecommendationVoting', () => {
    const { container } = render(<Recommendation {...instance(mockedProps)} name="searchJSON" />)
    fireEvent.click(container.querySelector('[data-test-subj="searchJSON-button"]') as HTMLButtonElement)
    expect(screen.getByTestId('recommendation-voting')).toBeInTheDocument()
  })

  it('should properly push history on workbench page', () => {
    // will be improved
    const pushMock = jest.fn()
    reactRouterDom.useHistory = jest.fn().mockReturnValue({ push: pushMock })

    const { container } = render(
      <Recommendation
        {...instance(mockedProps)}
        isRead={false}
        name="searchJSON"
        instanceId="id"
        tutorial=""
      />
    )

    fireEvent.click(container.querySelector('[data-test-subj="searchJSON-button"]') as HTMLButtonElement)
    fireEvent.click(screen.getByTestId('searchJSON-to-tutorial-btn'))

    expect(pushMock).toHaveBeenCalledWith(Pages.workbench('id'))
    expect(sendEventTelemetry).toBeCalledWith({
      event: TelemetryEvent.INSIGHTS_RECOMMENDATION_TUTORIAL_CLICKED,
      eventData: {
        databaseId: 'id',
        name: 'searchJSON',
      }
    })
    sendEventTelemetry.mockRestore()
  })

  it('should properly push history on workbench page to specific guide', () => {
    // will be improved
    const pushMock = jest.fn()
    reactRouterDom.useHistory = jest.fn().mockReturnValue({ push: pushMock })

    const { container } = render(
      <Recommendation
        {...instance(mockedProps)}
        isRead={false}
        name="searchJSON"
        instanceId="id"
        tutorial="quick-guides/working-with-hash.html"
        guides={MOCK_GUIDES_ITEMS}
        tutorials={MOCK_TUTORIALS_ITEMS}
      />
    )

    fireEvent.click(container.querySelector('[data-test-subj="searchJSON-button"]') as HTMLButtonElement)
    fireEvent.click(screen.getByTestId('searchJSON-to-tutorial-btn'))

    expect(pushMock).toHaveBeenCalledWith(`${Pages.workbench('id')}?path=quick-guides/0/2`)
    expect(sendEventTelemetry).toBeCalledWith({
      event: TelemetryEvent.INSIGHTS_RECOMMENDATION_TUTORIAL_CLICKED,
      eventData: {
        databaseId: 'id',
        name: 'searchJSON',
      }
    })
    sendEventTelemetry.mockRestore()
  })

  it('should properly push history on workbench page to specific tutorial', () => {
    // will be improved
    const pushMock = jest.fn()
    reactRouterDom.useHistory = jest.fn().mockReturnValue({ push: pushMock })

    const { container } = render(
      <Recommendation
        {...instance(mockedProps)}
        isRead={false}
        name="searchJSON"
        instanceId="id"
        tutorial="/redis_stack/working_with_json.md"
        guides={MOCK_GUIDES_ITEMS}
        tutorials={MOCK_TUTORIALS_ITEMS}
      />
    )

    fireEvent.click(container.querySelector('[data-test-subj="searchJSON-button"]') as HTMLButtonElement)
    fireEvent.click(screen.getByTestId('searchJSON-to-tutorial-btn'))

    expect(pushMock).toHaveBeenCalledWith(`${Pages.workbench('id')}?path=tutorials/4`)
    expect(sendEventTelemetry).toBeCalledWith({
      event: TelemetryEvent.INSIGHTS_RECOMMENDATION_TUTORIAL_CLICKED,
      eventData: {
        databaseId: 'id',
        name: 'searchJSON',
      }
    })
    sendEventTelemetry.mockRestore()
  })

  it('should hide/unhide button', () => {
    const name = 'searchJSON'
    render(<Recommendation {...instance(mockedProps)} name={name} />)

    expect(screen.getByTestId('toggle-hide-searchJSON-btn')).toBeInTheDocument()
  })

  it('click on hide/unhide button should call updateLiveRecommendation', async () => {
    const idMock = 'id'
    const nameMock = 'searchJSON'
    const { queryByTestId } = render(
      <Recommendation
        {...instance(mockedProps)}
        id={idMock}
        name={nameMock}
      />
    )

    await act(() => {
      fireEvent.click(queryByTestId('toggle-hide-searchJSON-btn') as HTMLButtonElement)
    })

    const expectedActions = [updateRecommendation()]

    expect(store.getActions()).toEqual(expectedActions)
    expect(screen.getByTestId('toggle-hide-searchJSON-btn')).toBeInTheDocument()
  })
})
