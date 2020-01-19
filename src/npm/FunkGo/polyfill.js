import intersectionObserverPolyfill from  './utils/polyfill/intersectionObserver'
import requestAnimationFramePolyfill from './utils/polyfill/requestAnimationFramePolyfill'
import arrayPolyfill from './utils/polyfill/arrayPolyfill'
import numberPolyfill from './utils/polyfill/numberPolyfill'
import objectPolyfill from './utils/polyfill/objectPolyfill'

let installed = false
const install = () => {
  if (installed) {
    return
  }

  if (typeof window !== 'undefined') {
    intersectionObserverPolyfill(window, window.document)
    requestAnimationFramePolyfill()
  }

  arrayPolyfill()
  numberPolyfill()
  objectPolyfill()

  installed = true
}

export default {
  install
}
