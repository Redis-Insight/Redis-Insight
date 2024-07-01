import React, { useEffect, useRef } from 'react'
import { Switch, useHistory, useLocation, useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { IRoute, Pages } from 'uiSrc/constants'
import { appContextSelector, setLastPageContext } from 'uiSrc/slices/app/context'
import RouteWithSubRoutes from 'uiSrc/utils/routerWithSubRoutes'

import BrowserTabs from './components/browser-tabs'

export interface Props {
  routes: IRoute[]
}

const KeysPage = (props: Props) => {
  const { routes } = props

  const { lastBrowserPage } = useSelector(appContextSelector)
  const { instanceId } = useParams<{ instanceId: string }>()
  const { pathname } = useLocation()
  const pathnameRef = useRef<string>('')

  const history = useHistory()
  const dispatch = useDispatch()

  useEffect(() => () => {
    dispatch(setLastPageContext(pathnameRef.current))
  }, [])

  useEffect(() => {
    if (pathname === Pages.keys(instanceId)) {
      // restore current inner page and ignore context (as we store context on unmount)
      if (pathnameRef.current && pathnameRef.current !== lastBrowserPage) {
        history.push(pathnameRef.current)
        return
      }

      // restore from context
      if (lastBrowserPage) {
        history.push(lastBrowserPage)
        return
      }

      history.push(Pages.browser(instanceId))
    }

    pathnameRef.current = pathname === Pages.keys(instanceId) ? '' : pathname
  }, [pathname])

  return (
    <>
      <BrowserTabs instanceId={instanceId} pathname={pathname} />
      <Switch>
        {routes.map((route, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <RouteWithSubRoutes key={i} {...route} />
        ))}
      </Switch>
    </>
  )
}

export default KeysPage
