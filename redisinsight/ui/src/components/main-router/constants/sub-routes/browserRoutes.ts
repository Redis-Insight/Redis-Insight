import { IRoute, PageNames, Pages } from 'uiSrc/constants'
import BrowserPage from 'uiSrc/pages/browser'
import SearchPage from 'uiSrc/pages/search'
import WorkbenchPage from 'uiSrc/pages/workbench'

export const BROWSER_ROUTES: IRoute[] = [
  {
    pageName: PageNames.browser,
    path: Pages.browser(':instanceId'),
    component: BrowserPage,
  },
  {
    pageName: PageNames.search,
    path: Pages.search(':instanceId'),
    component: SearchPage,
  },
  {
    pageName: PageNames.workbench,
    path: Pages.workbench(':instanceId'),
    component: WorkbenchPage,
  }
]
