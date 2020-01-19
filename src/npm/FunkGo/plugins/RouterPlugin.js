import queryString from 'query-string'
import Plugin from '../base/Plugin'
import { createLocation as createLocationFromRelativePath } from "history"

import {
  getCurrentOrigin,
  getCurrentPlainUrl,
  makeFullUrl,
  parseSearch,
  parseHash,
  isAbsolutePath,

  isAppScheme,
  parseAppSchemeToWebRoute,
} from '../utils/url'
import interConfig from '../internalConfig'

/* ------------------------------------------- */


const MAIN_HOST_REG = interConfig.MAIN_HOST_REG

const createLocationFromPath = (path, ...args) => {
  const currentOrigin = getCurrentOrigin()

  // if path is undefined, the compute with current location
  if (!path) {
    return createLocationFromRelativePath(path, ...args)

  // if path is relative, then format it
  } else if (!isAbsolutePath(path)) {
    return createLocationFromRelativePath(path, ...args)

  // if path is defined as absolute, and under main host, then extract the pathname
  //   , for case the url is defined on storefront api data
  } else if (MAIN_HOST_REG.test(path)) {
    const relativePath = MAIN_HOST_REG.exec(path)[1]
    return createLocationFromRelativePath(relativePath, ...args)

  // if path is defined as absolute, and relative from current origin, then extract the pathname
  //   , for case the url is generate from runtime code (e.g. game center in app)
  } else if (path.startsWith(currentOrigin)) {
    const relativePath = path.slice(currentOrigin.length)
    return createLocationFromRelativePath(relativePath, ...args)

  // if the path is absolute, the return it directly, it will be mark as absolute
  //    , and skip the spa navigation
  } else {
    return {
      pathname: path,
    }
  }
}

/* ------------------------------------------- */

const mixArrayParamsToPath = (path, params) => {
  let index = 0

  return path.replace(/:([\w\d_]+)/g, (match, group) => {
    const value = params[index++]

    if (!value) {
      return match
    }
    return value
  })
}

const mixParamsToPath = (path, params) => {
  if (!params) {
    return path
  }

  if (Array.isArray(params)) {
    return mixArrayParamsToPath(path, params)
  }

  return path.replace(/:([\w\d_]+)/g, (match, group) => {
    const value = params[group]
    if (!value) {
      return match
    }
    return value
  })

}

const appendParamsToPath = (path, params) => {
  if (!params) {
    return path
  }

  return `${path}?${queryString.stringify(params)}`
}

const generateFinalPath = (pathname, { params, search, hash }) => {
  let path = pathname || '/'

  if (search && search !== '?') {
    path += search.charAt(0) === '?' ? search : `?${search}`
  }

  if (hash && hash !== '#') {
    path += hash.charAt(0) === '#' ? hash : `#${hash}`
  }

  return params ? mixParamsToPath(path, params) : path
}

/* ------------------------------------------- */

const NAVIGATE_TYPE = {
  DEFAULT: 'DEFAULT',
  FORCE_OPEN_NEW_PAGE: 'FORCE_OPEN_NEW_PAGE', // for activity page on app, force to open new webview on every navigation
  FORCE_RELOAD_PAGE: 'FORCE_RELOAD_PAGE',
}

export default class RouterPlugin extends Plugin {
  displayName = '$Router'

  appRoutes = []
  appRoutesMapping = {}

  globalRoutes = []
  globalRoutesMapping = {}

  constructor(...args) {
    super(...args)

    const options = this.options

    this.appRoutes = options.routes || []
    this.appRoutesMapping = this.parseRoutes(this.appRoutes)

    this.globalRoutes = options.globalRoutes
    this.globalRoutesMapping = this.parseRoutes(this.globalRoutes, true)
  }

  parseRoutes(routes, strict) {
    const mapping = {}

    routes.forEach(route => {
      const { name, ...rest } = route
      if (!name && strict) {
        throw new Error('route must specific name prop')
      }

      mapping[name] = rest
    })

    return mapping
  }

  /* ---------------------------------------- */
  getRouteByName(name) {
    let route

    if (this.appRoutesMapping[name]) {
      route = {
        ...this.appRoutesMapping[name],
        isGlobal: false
      }
    } else if (this.globalRoutesMapping[name]) {
      route = {
        ...this.globalRoutesMapping[name],
        isGlobal: true
      }
    }

    if (route) {
      if (Array.isArray(route.path)) {
        route = {
          ...route,
          path: route.path[0]
        }
      }
    }

    if (route && route.path) {
      return route
    }

    throw new Error(`${name} is not defined on routes`)
  }

  getRouteName(to) {
    if (typeof to === 'object') {
      return to.name
    } else if (typeof to === 'string' && /^[A-Z]/.test(to)) {
      return to
    }

    return ''
  }

  /* ------------------------------------------- */
  createLocationByName(context, name) {
    const route = this.getRouteByName(name)
    const location = createLocationFromPath(route.path, undefined, undefined, context.location)

    return {
      ...location,
      isGlobal: route.isGlobal
    }
  }

  createLocationByObject(context, obj) {
    const location = createLocationFromPath(obj.pathname, undefined, undefined, context.location)

    return {
      ...obj,

      // if not provided pathname, then keep original pathname and search
      // , the new search will be mixin to this object at next steps
      search: obj.pathname ? '' : context.location.search,
      pathname: location.pathname,
      isGlobal: isAbsolutePath(location.pathname)
    }
  }

  createLocationByPath(context, path) {
    const location =  createLocationFromPath(path, undefined, undefined, context.location)

    return {
      ...location,
      isGlobal: isAbsolutePath(location.pathname)
    }
  }

  computeLocation(location, options = {}) {
    const params = options.params
    const search = parseSearch(
      typeof options === 'object'
      ? options.search || location.search
      : location.search
    )

    const hash = parseHash(
      typeof options === 'object'
      ? options.hash || location.hash
      : location.hash
    )

    const state = options.state || undefined

    const finalPath = generateFinalPath(location.pathname, { params, search, hash })
    const pathname = mixParamsToPath(location.pathname, params)

    return {
      ...location,
      pathname,
      finalPath,
      params,
      search,
      hash,
      state,
    }
  }

  createLocation(context, _to) {
    let location
    let to = _to

    if (isAppScheme(_to)) {
      const urlString = parseAppSchemeToWebRoute(_to)

      if (urlString) {
        to = urlString
      } else {
        to = `/store/not_found?scheme=${encodeURIComponent(_to)}`
        this.pluginHub.tryCall('logger', 'error', `[RouterPlugin] receive invalid to: ${_to}`)
      }
    }

    const routeName = this.getRouteName(to)

    if (routeName) {
      location = this.createLocationByName(context, routeName)
    } else if (typeof to === 'string') {
      location = this.createLocationByPath(context, to)
    } else if (typeof to === 'object') {
      location = this.createLocationByObject(context, to)
    } else {
      throw new Error(`non-supported navigate "to" = ${typeof to}`)
    }

    return this.computeLocation(location, to)

  }

  /* ---------------------------------------- */
  navigateType = NAVIGATE_TYPE.DEFAULT

  forceSwitchToOpenNewPage() {
    if (this.isUnderReuseWebview()) {
      this.navigateType = NAVIGATE_TYPE.DEFAULT
    } else {
      this.navigateType = NAVIGATE_TYPE.FORCE_OPEN_NEW_PAGE
    }
  }

  forceSwitchToReloadPage() {
    this.navigateType = NAVIGATE_TYPE.FORCE_RELOAD_PAGE
  }

  /* ---------------------------------------- */

  navigateToHomePage(context) {
    const bridgePlugin = this.pluginHub.getPlugin('bridge')
    if (bridgePlugin && bridgePlugin.isApp() && bridgePlugin.isAppWebHomeEnabled()) {
      bridgePlugin.closeWindow()
    } else {
      this.navigate(context, { name: 'Home'})
    }
  }

  /* ---------------------------------------- */

  navigateToProductPage(context, product, toExtraInfo = {}) {
    const bridgePlugin = this.pluginHub.getPlugin('bridge')

    if (bridgePlugin && bridgePlugin.isApp() && !bridgePlugin.isAppWebHomeEnabled()) {
      bridgePlugin.callAppSdk('jumpToProductDetails', product)
    } else {
      const to = {
        name: 'Product',
        params: {
          handle: product.handle
        },
        state: {
          product
        },
        ...toExtraInfo
      }

      this.navigate(context, to)
    }
  }

  /* ---------------------------------------- */

  navigate(context, to, { replace, mode } = {}) {
    const isApp = this.tryCallOtherPlugin('bridge', 'isApp')
    const isAppWebHomeEnabled = this.tryCallOtherPlugin('bridge', 'isAppWebHomeEnabled')
    const navigateType = mode || this.navigateType
    let navigatedToApp = false

    // if preferNative defined, and it running on app, then navigate to app first
    if (isApp && !isAppWebHomeEnabled) {
      const routeName = this.getRouteName(to)

      if (routeName) {
        const route = this.getRouteByName(routeName)
        if (route.scheme && route.preferNative) {
          this.navigateToApp(context, to)
          navigatedToApp = true
        }
      }
    }

    // otherwise, we still use web navigation
    if (!navigatedToApp) {
      const location = this.createLocation(context, to)
      if (navigateType === NAVIGATE_TYPE.FORCE_OPEN_NEW_PAGE) {
        if (isApp) {
          this.navigateToAppWebview(context, location.finalPath)
        } else {
          window.open(location.finalPath)
        }
      } else if (navigateType === NAVIGATE_TYPE.FORCE_RELOAD_PAGE) {
        document.location.href = location.finalPath
      } else if (location.isGlobal) {
        document.location.href = location.finalPath
      } else if (context && context.history) {
        if (replace) {
          context.history.replace(location)
        } else {
          context.history.push(location)
        }
      } else {
        document.location.href = location.finalPath
      }
    }

    if (this.isUnderReuseWebview()) {
      this.pushReuseWebviewHistory(to)
    }
  }

  validLink(context, to) {
    try {
      this.createLocation(context, to)
      return true
    } catch (ex) {
      return false
    }
  }

  getFinalPath(context, to) {
    const location = this.createLocation(context, to)
    return location.finalPath
  }

  replace(context, to, options) {
    return this.navigate(context, to, { replace: true, ...options })
  }

  reload(context, { force } = {}) {
    if (force && typeof window !== 'undefined') {
      window.location.reload()
    } else {
      context.history.replace(context.location)
    }
  }

  /* ---------------------------------------- */
  reuseWebviewHistory = []
  underReuseWebview = false

  isUnderReuseWebview() {
    return this.underReuseWebview
  }

  getReuseWebviewHistory() {
    return this.reuseWebviewHistory
  }

  pushReuseWebviewHistory(to) {
    this.reuseWebviewHistory.push(to)
  }

  startReuseWebview(context, to) {
    this.reuseWebviewHistory = []
    this.underReuseWebview = true

    this.navigate(context, to, {
      replace: true,
      mode: NAVIGATE_TYPE.DEFAULT,
    })
  }

  goBack(context) {
    const { history } = context
    const $bridge = this.pluginHub.getPlugin('bridge')

    if ($bridge && $bridge.isApp() && this.isUnderReuseWebview()) {
      const reuseWebviewHistory = this.getReuseWebviewHistory()
      if (reuseWebviewHistory.length > 1) {
        reuseWebviewHistory.pop()
        history.goBack()
      } else {
        $bridge.closeWindow()
      }

    } else {
      if (history) {
        history.goBack()
      } else if (window && window.history) {
        window.history.back()
      }
    }
  }

  /* ---------------------------------------- */
  makeTrackingUrl(targetUrl) {
    return new Promise(resolve => {
      let parsedUrl = targetUrl
      const $tracker = this.pluginHub.getPlugin('tracker')

      if ($tracker && $tracker.hasGa()) {
        let timer = setTimeout(() => {
          if (timer) {
            resolve(parsedUrl)
          }
        }, 2000)

        $tracker.ga(tracker => {
          clearTimeout(timer)
          timer = null
          const linkerParam = tracker.get('linkerParam')

          parsedUrl += parsedUrl.indexOf('?') > -1
            ? `&${linkerParam}`
            : `?${linkerParam}`

          resolve(parsedUrl)
        })


      } else {
        resolve(parsedUrl)
      }
    })
  }

  navigateToApp(context, to = {}) {
    let toObj

    if (typeof to === 'object') {
      toObj = to
    } else if (typeof to === 'string') {
      toObj = {
        name: to
      }
    } else {
      throw new Error('[RouterPlugin] invalid parameter')
    }

    const {
      name,
      params,
      scheme,
      ...rest
    } = toObj

    let schemePath

    if (name) {
      const route = this.getRouteByName(name)

      if (!route) {
        throw new Error(`[RouterPlugin] "${name}" is not a valid route name`)
      } else if (!route.scheme) {
        throw new Error(`[RouterPlugin] "${name}" has not defined app scheme`)
      }

      schemePath = route.scheme
    } else if (scheme) {
      schemePath = scheme
    }

    if (!schemePath) {
      schemePath = '/'
    }

    schemePath = appendParamsToPath(schemePath, params)

    this.tryCallOtherPlugin('bridge', 'navigateToApp', {
      ...rest,
      schemePath
    })
  }

  navigateToAppWebview(context, url = getCurrentPlainUrl(), useReuseWebview = true) {
    let reuseFlag = useReuseWebview ? 1 : undefined

    if (
      useReuseWebview
      && this.tryCallOtherPlugin('bridge', 'isAppSupportedStandaloneWebview')
      && this.tryCallOtherPlugin('bridge', 'isAppWebHomeEnabled')
    ) {
      reuseFlag = 'standalone'
    }

    const urlString = makeFullUrl(url, {
      '_reuse': reuseFlag, // TODO, use standalone once our navigation ui implemented
      'utm_source': 'FlamingoApp',
    })

    return this.navigateToApp(context, {
      scheme: '/BaseWebView',
      params: {
        urlString
      }
    })
  }

  navigateToMessengerBot(context, ref, payload, fallback) {
    const bridgePlugin = this.pluginHub.getPlugin('bridge')

    if (bridgePlugin && bridgePlugin.isApp()) {
      return bridgePlugin.callAppSdk('jumpToMessenger', `${ref}--${payload}`).catch(error => {

        if (fallback && typeof fallback === 'function') {
          fallback()
        } else {
          const dialogPlugin = this.pluginHub.getPlugin('dialog')

          if (dialogPlugin) {
            // use general confirm dialog by default
            dialogPlugin.alert({
              title: 'Contact Us',
              content: 'Please email us at support@flamingo.shop for any help.'
            })
          }

          throw error
        }
      })
    } else if (ref) {
      window.open(`https://m.me/official.flamingo.shop?ref=${ref}--${payload}`)
      return Promise.resolve()
    } else {
      window.open('https://m.me/official.flamingo.shop')
      return Promise.resolve()
    }
  }


  /* ---------------------------------------- */

  getInjectProps(context) {
    const { location, history, match } = context

    return {
      $router: {
        // transport from react-router
        location,
        history,
        match,

        replace: this.replace.bind(this, context),
        reload: this.reload.bind(this, context),
        navigate: this.navigate.bind(this, context),
        goBack: this.goBack.bind(this, context),

        navigateToProductPage: this.navigateToProductPage.bind(this, context),
        navigateToHomePage: this.navigateToHomePage.bind(this, context),

        navigateToApp: this.navigateToApp.bind(this, context),
        navigateToAppWebview: this.navigateToAppWebview.bind(this, context),
        navigateToMessengerBot: this.navigateToMessengerBot.bind(this, context),

        getFinalPath: this.getFinalPath.bind(this, context),
        validLink: this.validLink.bind(this, context),

        forceSwitchToOpenNewPage: this.forceSwitchToOpenNewPage.bind(this, context),
        forceSwitchToReloadPage: this.forceSwitchToReloadPage.bind(this, context),

        startReuseWebview: this.startReuseWebview.bind(this, context),
      }
    }
  }
}
