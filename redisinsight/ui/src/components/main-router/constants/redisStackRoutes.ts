import { PageNames, Pages, IRoute } from 'uiSrc/constants'
import {
  BrowserPage, InstancePage,
} from 'uiSrc/pages'
import KeysPage from 'uiSrc/pages/keys'
import WorkbenchPage from 'uiSrc/pages/workbench'
import SlowLogPage from 'uiSrc/pages/slow-log'
import PubSubPage from 'uiSrc/pages/pub-sub'
import EditConnection from 'uiSrc/pages/redis-stack/components/edit-connection'
import ClusterDetailsPage from 'uiSrc/pages/cluster-details'
import AnalyticsPage from 'uiSrc/pages/analytics'
import DatabaseAnalysisPage from 'uiSrc/pages/database-analysis'
import SearchPage from 'uiSrc/pages/search'
import COMMON_ROUTES from './commonRoutes'

const BROWSER_ROUTES: IRoute[] = [
  {
    pageName: PageNames.browser,
    protected: true,
    path: Pages.browser(':instanceId'),
    component: BrowserPage,
  },
  {
    pageName: PageNames.search,
    protected: true,
    path: Pages.search(':instanceId'),
    component: SearchPage,
  },
  {
    pageName: PageNames.workbench,
    protected: true,
    path: Pages.workbench(':instanceId'),
    component: WorkbenchPage,
  },
]

const ANALYTICS_ROUTES: IRoute[] = [
  {
    pageName: PageNames.slowLog,
    protected: true,
    path: Pages.slowLog(':instanceId'),
    component: SlowLogPage,
  },
  {
    pageName: PageNames.databaseAnalysis,
    protected: true,
    path: Pages.databaseAnalysis(':instanceId'),
    component: DatabaseAnalysisPage,
  },
  {
    pageName: PageNames.clusterDetails,
    protected: true,
    path: Pages.clusterDetails(':instanceId'),
    component: ClusterDetailsPage,
  },
]

const INSTANCE_ROUTES: IRoute[] = [
  {
    path: Pages.keys(':instanceId'),
    component: KeysPage,
    routes: BROWSER_ROUTES,
  },
  {
    pageName: PageNames.pubSub,
    protected: true,
    path: Pages.pubSub(':instanceId'),
    component: PubSubPage,
  },
  {
    path: Pages.analytics(':instanceId'),
    protected: true,
    component: AnalyticsPage,
    routes: ANALYTICS_ROUTES,
  },
  // redirect to the new workbench path
  {
    path: ':instanceId/workbench',
    redirect: (params) => Pages.workbench(params?.instanceId || '')
  }
]

const ROUTES: IRoute[] = [
  {
    path: Pages.home,
    exact: true,
    component: EditConnection,
  },
  ...COMMON_ROUTES,
  {
    path: '/:instanceId',
    protected: true,
    component: InstancePage,
    routes: INSTANCE_ROUTES,
  },
]

export default ROUTES
