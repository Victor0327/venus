export default class BasePlugin {
  clientOnly = false

  constructor(options = {}, { appInfo, pluginHub, pluginOptions }) {
    this.options = options
    this.pluginHub = pluginHub
    this.pluginOptions = pluginOptions
    this.isServer = appInfo.isServer
    this.appInfo = appInfo
  }

  tryCallOtherPlugin(...args) {
    return this.pluginHub.tryCall(...args)
  }

  getInjectProps() {
    return {}
  }

  isClientOnly() {
    return this.clientOnly
  }
}