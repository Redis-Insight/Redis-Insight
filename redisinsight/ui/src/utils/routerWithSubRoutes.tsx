import React from 'react'
import { Redirect, Route } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { userSettingsSelector } from 'uiSrc/slices/user/user-settings'
import { appFeatureFlagsFeaturesSelector } from 'uiSrc/slices/app/features'
import { IRoute, FeatureFlags } from 'uiSrc/constants'

const PrivateRoute = (route: IRoute) => {
  const { path, exact, routes, featureFlag, redirect } = route
  const {
    [featureFlag as FeatureFlags]: feature,
  } = useSelector(appFeatureFlagsFeaturesSelector)
  const { isShowConceptsPopup: haveToAcceptAgreements } = useSelector(userSettingsSelector)

  return (
    <Route
      path={path}
      exact={exact}
      render={(props) => {
        if (redirect) {
          return (
            <Redirect
              to={{
                search: props.location.search,
                pathname: redirect(props?.match?.params)
              }}
            />
          )
        }

        return haveToAcceptAgreements || feature?.flag === false
          ? <Redirect to="/" />
          : (
            // pass the sub-routes down to keep nesting
            // @ts-ignore
            <route.component {...props} routes={routes} />
          )
      }}
    />
  )
}

const RouteWithSubRoutes = (route: IRoute) => {
  const { isAvailableWithoutAgreements, featureFlag, path, exact, routes } = route

  return ((!isAvailableWithoutAgreements || featureFlag) ? PrivateRoute(route)
    : (
      <Route
        path={path}
        exact={exact}
        render={(props) => (
          // pass the sub-routes down to keep nesting
          // @ts-ignore
          <route.component {...props} routes={routes} />
        )}
      />
    ))
}

export default RouteWithSubRoutes
