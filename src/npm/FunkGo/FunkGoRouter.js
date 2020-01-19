import React from 'react'
import {
  Route,
  Switch,
  Router,
  StaticRouter,
  withRouter,
  matchPath,
} from 'react-router-dom'

import { createBrowserHistory } from 'history'
import { createPage } from './FunkGoPage'


/* --------------------------------------- */

const DefaultNotFound = props => null

const createRoutes = ({ routes: originalRoutes, NotFound }, appRuntimeArgs) => {
  const routes = originalRoutes.map(route => ({
    ...route,
    component: createPage(route.component, appRuntimeArgs)
  }))

  const notFoundRoute = {
    path: null,
    component: createPage(NotFound || DefaultNotFound, appRuntimeArgs)
  }

  return {
    routes,
    notFoundRoute
  }
}

/* --------------------------------------- */

const getRouterConfig = props => {
  let RouterComponent
  let routerProps

  if (typeof window !== 'undefined') {
    const browserHistory = createBrowserHistory()

    browserHistory.listen((location, action) => {
      setTimeout(() => {
        if (action === 'POP') {
          return
        }
        window.scrollTo(0, 2) // if move to top=0, user may easy to close window at instagram webview
      })
    })

    RouterComponent = Router
    routerProps = {
      history: browserHistory
    }

  } else {
    const { location, routerContext = {} } = props

    if (!location || !routerContext) {
      throw new Error(`[FunkGoRouter] invalid parameters`)
    }

    RouterComponent = StaticRouter
    routerProps = {
      location,
      context: routerContext
    }
  }

  return {
    RouterComponent,
    routerProps
  }
}

/* --------------------------------------- */

const createRouter = (routerConfig, pageConfig) => {
  const { routes, notFoundRoute } = createRoutes(routerConfig, pageConfig)

  const routeElements = routes.map(route => (
    <Route {...route} key={route.path}></Route>
  ))

  routeElements.push((
    <Route {...notFoundRoute} key='not_found'></Route>
  ))

  const FunkGoRouter = props => {
    const { RouterComponent, routerProps } = getRouterConfig(props)
    return (
      <RouterComponent {...routerProps}>
        <Switch>
          {routeElements}
        </Switch>
      </RouterComponent>
    )
  }

  FunkGoRouter.routerMode = true
  FunkGoRouter.routes = routes
  FunkGoRouter.NotFound = notFoundRoute.component

  return FunkGoRouter
}

export {
  createRouter,
  withRouter,
  matchPath,
}