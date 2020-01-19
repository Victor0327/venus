class PluginHub {
  plugins = {}
  connected = false

  connect(cb) {
    if (!this.connected) {
      cb(this)
      this.connect = true
      return this
    } else {
      throw new Error(`[PluginHub] connect multi times`)
    }
  }

  registerPlugin(name, plugin) {
    this.plugins[name] = plugin
  }

  getInjectProps(context, { ignoreClientOnlyPlugins = false } = {}) {
    const injectPluginProps = {}

    Object.keys(this.plugins).forEach(key => {
      const plugin = this.plugins[key]
      if (!ignoreClientOnlyPlugins || !plugin.isClientOnly()) {
        Object.assign(injectPluginProps, plugin.getInjectProps(context))
      }
    })

    return injectPluginProps
  }

  hasPlugin(...keys) {
    for (let i = 0; i < keys.length; i += 1) {
      if (!this.plugins[keys[i]]) {
        return false
      }
    }

    return true
  }

  getPlugin(key) {
    return this.plugins[key]
  }

  tryCall(key, method, ...args) {
    const plugin = this.getPlugin(key)
    if (!plugin) {
      return
    }

    if (typeof plugin[method] !== 'function') {
      throw new Error(`${key}.${method} is not a function`)
    }

    return plugin[method](...args)
  }
}

const createPluginHub = options => new PluginHub(options)

export {
  createPluginHub,
}