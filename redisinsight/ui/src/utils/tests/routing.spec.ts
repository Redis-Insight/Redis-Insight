import { getPageName, getRedirectionPage } from 'uiSrc/utils/routing'

jest.mock('uiSrc/utils/routing', () => ({
  ...jest.requireActual('uiSrc/utils/routing')
}))

Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost'
  },
  writable: true
})

const databaseId = '1'
const getRedirectionPageTests = [
  { input: ['settings'], expected: '/settings' },
  { input: ['workbench', databaseId], expected: '/1/browser/workbench' },
  { input: ['/workbench', databaseId], expected: '/1/browser/workbench' },
  { input: ['browser/workbench', databaseId], expected: '/1/browser/workbench' },
  { input: ['/browser/workbench', databaseId], expected: '/1/browser/workbench' },
  { input: ['/analytics/slowlog', databaseId], expected: '/1/analytics/slowlog' },
  { input: ['/analytics/slowlog'], expected: null },
  { input: ['/analytics', databaseId], expected: '/1/analytics' },
  { input: ['/analytics/page', databaseId], expected: undefined },
  { input: ['/analytics'], expected: null },
  { input: ['some-page'], expected: undefined },
  { input: ['/workbench?guidePath=introduction.md', databaseId], expected: '/1/workbench?guidePath=introduction.md&insights=open' },
  { input: ['/_?tutorialId=tutorial'], expected: undefined },
  { input: ['/_?tutorialId=tutorial', databaseId, `/${databaseId}/workbench`], expected: '/1/workbench?tutorialId=tutorial' },
]

describe('getRedirectionPage', () => {
  test.each(getRedirectionPageTests)(
    '%j',
    ({ input, expected }) => {
      // @ts-ignore
      const result = getRedirectionPage(...input)
      expect(result).toEqual(expected)
    }
  )
})

const getPageNameTests = [
  { input: ['instanceId', '/instanceId/page1'], expected: '/page1' },
  { input: ['instanceId', '/instanceId/page1/page2'], expected: '/page1/page2' },
  { input: ['instanceId', '/page1'], expected: '/page1' },
]

describe('getPageName', () => {
  test.each(getPageNameTests)(
    '%j',
    ({ input, expected }) => {
      // @ts-ignore
      const result = getPageName(...input)
      expect(result).toEqual(expected)
    }
  )
})
