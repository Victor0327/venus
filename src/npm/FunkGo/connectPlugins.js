const connectPlugins = (pluginHub, appInfo) => {
  if (pluginHub.hasPlugin('http')) {
    const bridge = pluginHub.getPlugin('bridge')
    const http = pluginHub.getPlugin('http')

    let clientId = 'web'
    let clientVersion = appInfo.version

    if (bridge && bridge.isApp()) {
      clientId = bridge.isAndroid() ? 'android' : 'ios'
      clientVersion = `${bridge.getAppVersion()}:${appInfo.version}`
    }

    http.$http.interceptors.request.use(
      req => {
        if (bridge) {
          const accessToken = bridge.getAccessToken()

          if (accessToken) {
            req.headers['X-access-token'] = accessToken
          }
        }

        req.headers['X-client-id'] = clientId
        req.headers['X-client-version'] = clientVersion

        return req
      }
    )
  }

  if (pluginHub.hasPlugin('tracker')) {
    const tracker = pluginHub.getPlugin('tracker')
    const trackRequestError = err => {
      const { config = {}, message, statusCode = 'UNKNOWN' } = err
      const method = config.method ? config.method.toUpperCase() : 'UNKNOWN'
      const url = config.url || 'N/A'
      const errorMsg = `[${method}] ${message} (${statusCode})`

      tracker.error({
        isFatal: false,
        category: 'API',
        label: url,
        error: errorMsg
      })

      throw err
    }

    if (!appInfo.isServer) {
      window.addEventListener('unhandledrejection', event => {
        const error = event.reason
        if (!error || !error.message) {
          return
        }

        const message = error.config && error.config.url // if error from http
          ? `${error.message} (${error.config.url})`
          : error.message

        const stack = error.stack

        tracker.error({
          isFatal: false,
          category: 'UNHANDLED_REJECTION',
          error: {
            message,
            stack,
          },
        })
      })

      window.onerror = (errorMessage, scriptURI, lineNumber, columnNumber, errorObj) => {
        const scriptInfo = scriptURI  && window.location.href.indexOf(scriptURI) === -1
          ? `${scriptURI}`
          : 'N/A'

        let errMsg = `[${scriptInfo}] ${errorMessage}`

        if (typeof lineNumber !== 'undefined') {
          errMsg += `:(${lineNumber}-${columnNumber})`
        }

        const errStack = errorObj && errorObj.stack
          ? errorObj.stack
          : 'no_stack'

        tracker.error({
          isFatal: false,
          category: 'UNCATCHED_ERROR',
          error: errMsg,
          label: errStack
        })
      }
    }

    if (pluginHub.hasPlugin('http')) {
      pluginHub.getPlugin('http').useErrorInterceptor(
        trackRequestError
      )
    }

    if (pluginHub.hasPlugin('store')) {
      pluginHub.getPlugin('store').useErrorInterceptor(
        trackRequestError
      )
    }

    if (pluginHub.hasPlugin('bridge')) {
      pluginHub.getPlugin('bridge').useErrorInterceptor(
        trackRequestError
      )
    }

    if (pluginHub.hasPlugin('user')) {
      pluginHub.getPlugin('user').useErrorInterceptor(
        trackRequestError
      )
    }

    if (pluginHub.hasPlugin('logger')) {
      pluginHub.getPlugin('logger').useErrorInterceptor(
        msg => tracker.error({
          category: 'LOGGER',
          error: msg
        })
      )
    }
  }
}

export default connectPlugins
