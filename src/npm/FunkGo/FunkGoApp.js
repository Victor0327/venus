import React from 'react'

import 'destyle.css'
import polyfill from './polyfill'

import { createTransportContext } from './utils/transportContext'
import { createRouter } from './FunkGoRouter'
import FunkGoContext from './FunkGoContext'
import HttpPlugin from './plugins/HttpPlugin'
import RouterPlugin from './plugins/RouterPlugin'

import { createPluginHub } from './PluginHub'
import connectPlugins from './connectPlugins'

const PLUGINS = {
  http: HttpPlugin,
  router: RouterPlugin
}

class FunkGo {
  plugins = {}
  pluginHub = null
  routerConfig = null
  component = null

  constructor({ name, version, component, router, plugins } = {}) {

    polyfill.install()

    this.isServer = (
      typeof window === 'undefined'
      || typeof window.document === 'undefined'
      || typeof window.document.createElement === 'undefined'
    )

    this.appInfo = {
      name,
      version,
      isServer: this.isServer
    }

    this.pluginHub = createPluginHub()
    this.pluginOptions = plugins

    if (router) {
      this.use('router', router)
    }
  }

  use(name, options) {
    this.routerConfig = options
    this.usePlugin('router', this.routerConfig)

    return this
  }

  usePlugin(name, options) {
    const plugin = new PLUGINS[name](options, this.packageRuntimeArgs())

    if (!this.appInfo.isServer || !plugin.isClientOnly()) {
      this.plugins[name] = plugin
      this.pluginHub.registerPlugin(name, plugin)
    }
  }

  connectPlugins() {
    this.pluginHub.connect(pluginHub => {
      connectPlugins(pluginHub, this.appInfo)
    })
  }

  createAppContext() {
    return {}
  }

  packageRuntimeArgs() {
    return {
      appInfo: this.appInfo,
      pluginHub: this.pluginHub,
      isServer: this.isServer,
      pluginOptions: this.pluginOptions,
    }
  }

  getRootPageConfig() {
    return {
      config: this.routerConfig
    }
  }

  createAppComponent() {
    let AppComponent
    let RootComponent

    const {
      config
    } = this.getRootPageConfig()

    const pageConfig = this.packageRuntimeArgs()

    RootComponent = createRouter(config, pageConfig)
    AppComponent = props => (
      <FunkGoContext.Provider value={this.createAppContext()}>
        <RootComponent {...props}></RootComponent>
      </FunkGoContext.Provider>
    )

    AppComponent.RootComponent = RootComponent

    return AppComponent
  }

  factoryApp(AppComponent) {
    AppComponent.displayName = 'FunkGoApp'

    return AppComponent
  }

  createApp() {
    this.connectPlugins()
    const AppComponent = this.createAppComponent()

    return this.factoryApp(AppComponent)
  }

}

export default FunkGo