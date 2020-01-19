import React, { PureComponent } from 'react'
import PluginContext from './PluginContext'

import queryString from 'query-string'

import internalConfig from './internalConfig'
import { createTransportContext } from './utils/transportContext'

/* ----------------------------------------- */

const MAIN_HOST = internalConfig.MAIN_HOST
const DEFAULT_SITE_NAME = 'Flamingo Shop'
const DEFAULT_APP_TITLE = 'Flamingo Shop. Shopping for fun.'
const DEFAULT_APP_IMAGE = '//s3-us-west-1.amazonaws.com/flamingos3/20190517/images/c4833ac633c743fd94d5dfbe16b3ff50.png'
const DEFAULT_APP_DESC = 'Flamingo Shop is a collection of online boutique shops. Our popular categories are dresses, athleisure, lingerie, fashion cell phone accessories and more.'

/* ----------------------------------------- */

const createPage = (PageComponent, runtimeArgs, pageConfig) => {
  const { pluginHub, isServer } = runtimeArgs
  let skipPv = false

  if (PageComponent && PageComponent.pageConfig && PageComponent.pageConfig.skipPv) {
    skipPv = true
  } else if (pageConfig && pageConfig.skipPv) {
    skipPv = true
  }

  if (!PageComponent) {
    throw new Error('must provide PageComponent arg for FunkGoPage')
  }

  /* ---------------------------------------------- */

  const getInitState = (key, props) => {
    // if running on server side single component mode, the pre-fetched data will assign props.data
    if (typeof props[key] !== 'undefined') {
      return props[key]

    // if running on server side route mode, the pre-fetched data will by pass via static context
    } else if (props.staticContext && typeof props.staticContext[key] !== 'undefined') {
      return props.staticContext[key]
    }

    // if running on client side, keep it null
    return null
  }

  const WrappedComponent = class FunkGoPage extends PureComponent {
    _isMounted = false
    static ssr = PageComponent.ssr
    static containerName = PageComponent.name || PageComponent.displayName

    state = {
      isLoading: false,
      data: getInitState('data', this.props),
      error: getInitState('error', this.props),
      ogInfo: getInitState('ogInfo', this.props),
    }

    /* static fetching methods (server-side) */
    /* -------------------------------------- */
    static getPluginProps(transportContext, ignoreClientOnlyPlugins = false) {
      return pluginHub.getInjectProps({
        location: transportContext.location,
        history: transportContext.history,
        match: transportContext.match
      }, {
        ignoreClientOnlyPlugins
      })
    }

    static getFetchingProps(transportContext) {
      return {
        ...FunkGoPage.getPluginProps(transportContext, true),
        location: transportContext.location,
        match: transportContext.match,
        isServer,
      }
    }

    static fetchPageData(
      transportContext,
      fetchingProps = FunkGoPage.getFetchingProps(transportContext)
    ) {
      if (typeof PageComponent.fetchPageData === 'function') {
        return Promise.resolve(PageComponent.fetchPageData(fetchingProps))
      }

      return Promise.resolve({})
    }

    static fetchPageDataSSR(
      transportContext,
      fetchingProps = FunkGoPage.getFetchingProps(transportContext)
    ) {
      // in some cases, we want to do all rendering after didMount
      // , but still need SSR for seo, it can specific another static method
      // e.g. home page
      //  - it will display different page for new / exists user
      //  - but still need to display content for SEO
      if (typeof PageComponent.fetchPageDataSSR === 'function') {
        return Promise.resolve(PageComponent.fetchPageDataSSR(fetchingProps))
      } else {
        return FunkGoPage.fetchPageData(transportContext, fetchingProps)
      }
    }

    static formatOpenGraphInfo(transportContext, openGraphInfo = {}) {
      const fbAppId = pluginHub.tryCall('bridge', 'getFbAppId')

      const location = transportContext.location
      const DEFAULT_URL = `https://${MAIN_HOST}${location.pathname}`

      const image = openGraphInfo.image || DEFAULT_APP_IMAGE

      return {
        fbAppId,
        siteName: DEFAULT_SITE_NAME,
        title: openGraphInfo.title || DEFAULT_APP_TITLE,
        url: openGraphInfo.url || DEFAULT_URL,
        description: openGraphInfo.description || DEFAULT_APP_DESC,
        image: image.src ? image.src : image,
        private: openGraphInfo.private === true,
        noIndex: openGraphInfo.noIndex === true,
        jsonLD: openGraphInfo.jsonLD
      }
    }

    static fetchOpenGraphInfo(
      transportContext,
      pageData,
      fetchingProps = FunkGoPage.getFetchingProps(transportContext)
    ) {
      let pageDataPromise
      let ogInfoPromise

      if (typeof PageComponent.fetchOpenGraphInfo === 'function') {
        if (PageComponent.fetchOpenGraphInfo.length === 0) {
          pageDataPromise = Promise.resolve(null)
        } else if (pageData) {
          pageDataPromise = Promise.resolve(pageData)
        } else {
          pageDataPromise = FunkGoPage.fetchPageData(transportContext, fetchingProps)
        }

        ogInfoPromise = pageDataPromise.then(
          data => PageComponent.fetchOpenGraphInfo(
            { data },
            fetchingProps
          )
        )
      } else {
        ogInfoPromise = Promise.resolve({})
      }

      return ogInfoPromise.then(
        ogInfo => FunkGoPage.formatOpenGraphInfo(transportContext, ogInfo)
      )
    }

    /* runtime fetching methods (client-side) */
    /* -------------------------------------- */
    _cachedLocation = null
    _cachedTransportContext = null
    getTransportContext() {
      // if enable router plugin, or running on server side, page will have below props
      if (this.props.location) {
        if (!this._cachedTransportContext || this._cachedLocation !== this.props.location) {
          this._cachedTransportContext = createTransportContext({
            location: this.props.location,
            history: this.props.history,
            match: this.props.match
          })
          this._cachedLocation = this.props.location
        }

        return this._cachedTransportContext
      // otherwise create it
      } else if (!isServer) {
        return createTransportContext({
          location: document.location
        })
      } else {
        throw new Error('[FunkGoPage] could not found location from context')
      }
    }

    fetchPageData() {
      return FunkGoPage.fetchPageData(
        this.getTransportContext()
      )
    }

    fetchOpenGraphInfo(data) {
      return FunkGoPage.fetchOpenGraphInfo(
        this.getTransportContext(),
        data
      )
    }

    /* -------------------------------- */
    _cachedPluginProps = null
    getPluginProps() {
      const lastCachedTransportContext = this._cachedTransportContext
      const transportContext = this.getTransportContext()

      if (!this._cachedPluginProps || transportContext !== lastCachedTransportContext) {
        this._cachedPluginProps = FunkGoPage.getPluginProps(
          transportContext
        )
      }

      return this._cachedPluginProps
    }

    getComponentProps() {
      return {
        ...this.getPluginProps(),
        ...this.props,
        error: this.state.error,
        data: this.state.data
      }
    }

    isUnderAppBridge() {
      const bridge = pluginHub.getPlugin('bridge')
      return bridge && bridge.isApp()
    }

    isUnderPwaBridge() {
      const bridge = pluginHub.getPlugin('bridge')
      return bridge && bridge.isPwa()
    }

    getPageName() {
      const { location } = this.getTransportContext()
      const query = queryString.parse(location.search)
      let pageName = location.pathname

      // trim end "/"
      if (pageName.length > 1 && pageName.charAt(pageName.length - 1) === '/') {
        pageName = pageName.substr(0, pageName.length - 1)
      }

      const pageSearch = []

      Object.keys(query).sort().forEach(key => {
        if (key.indexOf('utm') === -1
          && key.indexOf('fbclid') === -1
          && key.indexOf('mcp_token') === -1
          && key.charAt(0) !== '_'
        ) {
          const value = query[key]
          pageSearch.push(value ? `${key}=${query[key]}` : key)
        }
      })

      if (this.isUnderAppBridge()) {
        pageSearch.push('FlamingoApp=1')
      } else if (this.isUnderPwaBridge()) {
        pageSearch.push('FlamingoApp=pwa')
      }

      if (pageSearch.length) {
        return `${pageName}?${pageSearch.join('&')}`
      }

      return pageName
    }

    trackRenderError(error) {
      pluginHub.tryCall('tracker', 'error', {
        isFatal: true,
        category: 'PAGE_RENDER',
        error
      })

      if (typeof console !== 'undefined' && console.error) {
        console.error(error)
      }
    }

    trackPageView() {
      if (skipPv !== true) {
        const pageName = this.getPageName()
        pluginHub.tryCall('tracker', 'pv', pageName)
      }
    }

    setOgInfo(ogInfo) {
      this.setState({ ogInfo })

      if (this.isUnderAppBridge()) {
        pluginHub.tryCall('bridge', 'setPageInfo', {
          title: ogInfo.title,
          showShare: !ogInfo.private,
        })
      }
    }

    refreshPage(initData) {
      this.trackPageView()

      // initData may come from ssr
      const fetchData = initData
        ? () => Promise.resolve(initData)
        : () => {
          this.setState({
            isLoading: true
          })
          return this.fetchPageData()
        }

      fetchData().then(
        data => ({
          data,
          error: null
        }),
        error => ({
          data: null,
          error
        })
      ).then(({ data, error }) => {
        if (error) {
          this.trackRenderError(error)
        }

        if (this._isMounted) {
          if (data) {
            this.fetchOpenGraphInfo(data).then(
              ogInfo => this.setOgInfo(ogInfo)
            )
          }

          this.setState({
            data,
            error,
            isLoading: false
          })
        }
      })
    }

    /* ------------------------------------------------------- */
    handleAppReuseWebview = ({ url } = {}) => {
      const pluginProps = this.getPluginProps()
      if (pluginProps.$router) {
        pluginProps.$router.startReuseWebview(url)
      } else {
        document.location.href = url
      }
    }

    handleAppCallShare = () => {
      const pluginProps = this.getPluginProps()
      if (pluginProps.$bridge) {
        pluginProps.$bridge.share().catch(() => {})
      }
    }

    handleServiceWorkerUpdate = () => {
      const pluginProps = this.getPluginProps()
      if (pluginProps.$router && pluginProps.$bridge && !pluginProps.$bridge.isApp()) {
        pluginProps.$router.forceSwitchToReloadPage()
      }
    }

    /* ------------------------------------------------------- */
    componentDidMount() {
      this._isMounted = true
      if (window._INIT_DATA) {
        this.refreshPage(window._INIT_DATA)
        delete window._INIT_DATA
      } else {
        this.refreshPage(this.props.data)
      }

      if (this.isUnderAppBridge()) {
        const $bridge = pluginHub.getPlugin('bridge')

        // for reuse scene, it will receive a broadcast from app called "replace"
        $bridge.replaceEventListenerToApp('replace', this.handleAppReuseWebview)
        $bridge.replaceEventListenerToApp('callWebShare', this.handleAppCallShare)

      }

      window.addEventListener('serviceWorkerUpdated', this.handleServiceWorkerUpdate, false)
    }

    componentWillUnmount() {
      this._isMounted = false
      window.removeEventListener('serviceWorkerUpdated', this.handleServiceWorkerUpdate, false)
    }

    componentDidUpdate(prevProps) {
      const currLocation = this.props.location
      const prevLocation = prevProps.location

      // location may be null, if app not enabled router
      if (currLocation && prevLocation
        && currLocation.key !== prevLocation.key　
        && !currLocation.hash && !prevLocation.hash) {

        this.refreshPage()
      }
    }

    static getDerivedStateFromError(error) {
      return { error };
    }

    componentDidCatch(error) {
      this.trackRenderError(error)
    }

    /* -------------------------------- */
    renderComponent(Component) {
      const props = this.getComponentProps()

      return (
        <Component {...props}></Component>
      )
    }

    renderLifeCycle(name, fallback) {
      let Component = pluginHub.tryCall('lifeCycle', 'getComponent', name)

      if (!Component) {
        Component = pluginHub.tryCall('lifeCycle', 'getComponent', fallback)
      }

      if (!Component) {
        return null
      }

      return this.renderComponent(Component)
    }

    renderLoading() {
      if (typeof PageComponent.LoadingComponent === 'function') {
        return this.renderComponent(PageComponent.LoadingComponent)
      } else {
        return this.renderLifeCycle('Loading')
      }
    }

    renderError(error) {
      if (error.statusCode === 404) {
        return this.renderLifeCycle('NotFound', 'Error')
      }
      return this.renderLifeCycle('Error')
    }

    renderSEOTitle(ogInfo) {
      return (
        <h1 style={{display: 'none'}}>{ogInfo.title}</h1>
      )
    }

    renderPage() {
      return (
        <>
          {this.renderComponent(PageComponent)}
        </>
      )
    }

    /* ----------------------------------------------------- */
    getShellProps() {
      if (typeof PageComponent.shellProps === 'function') {
        return PageComponent.shellProps(this.getPluginProps())
      }
      return PageComponent.shellProps || {}
    }

    renderWithShell(element) {
      const Shell = PageComponent.Shell

      let elementWithShell

      if (Shell) {
        const shellProps = this.getShellProps()

        elementWithShell = (
          <Shell {...shellProps}>
            {element}
          </Shell>
        )
      } else {
        elementWithShell = element
      }

      return (
        <PluginContext.Provider value={this.getPluginProps()}>
          {elementWithShell}
        </PluginContext.Provider>
      )
    }

    render() {
      let element

      if (this.state.isLoading) {
        element = this.renderLoading()
      } else if (this.state.error) {
        element = this.renderError(this.state.error)
      } else if (this.state.data) {
        element = this.renderPage()
      } else {
        element = this.renderLifeCycle('Initial')
      }

      return this.renderWithShell(element)
    }
  }

  WrappedComponent.displayName = `FunkGoPage(${PageComponent.displayName || PageComponent.name})`

  return WrappedComponent
}

export {
  createPage,
}