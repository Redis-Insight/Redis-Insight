import { IRoute, Pages } from 'uiSrc/constants'
import { Maybe, Nullable } from 'uiSrc/utils'
import DEFAULT_ROUTES from 'uiSrc/components/main-router/constants/defaultRoutes'

const CURRENT_PAGE_URL_SYNTAX = '/_'

export const findRouteByPathname = (routes: IRoute[], pathname: string): Maybe<IRoute> => {
  let findRoute

  // eslint-disable-next-line no-restricted-syntax
  for (const route of routes) {
    if (new RegExp(`${pathname}$`).test(route.path)) {
      return route
    }

    if (route.routes) {
      findRoute = findRouteByPathname(route.routes, pathname)
      if (findRoute) {
        return findRoute
      }
    }
  }

  return findRoute
}

// undefined - route was not found
// null - route found but private
export const getRedirectionPage = (
  pageInput: string,
  databaseId?: string,
  currentPathname?: string
): Nullable<Maybe<string>> => {
  let page = pageInput.replace(/^\//, '')
  try {
    const { pathname, searchParams } = new URL(page, window.location.origin)

    if (currentPathname && pathname === CURRENT_PAGE_URL_SYNTAX) {
      return `${currentPathname}?${searchParams.toString()}`
    }

    if (searchParams.has('guidePath') || searchParams.has('tutorialId')) {
      page += '&insights=open'
    }

    // old page - temp redirection
    if (page === 'workbench' && databaseId) {
      return `${Pages.keys(databaseId)}/${page}`
    }

    const foundRoute = findRouteByPathname(DEFAULT_ROUTES, pathname)
    if (!foundRoute) return undefined

    if (foundRoute.path.includes(':instanceId')) {
      if (databaseId) {
        return `/${databaseId}/${page}`
      }
      return null
    }

    return `/${page}`
  } catch (_e) {
    return undefined
  }
}

export const getPageName = (databaseId: string, path: string) => path?.replace(`/${databaseId}`, '')
