export default () => {
  if (typeof window === 'undefined') { return }

  const vendors = ['ms', 'moz', 'webkit', 'o']
  for (let i = 0; i < vendors.length && !window.requestAnimationFrame; i = i + 1) {
      window.requestAnimationFrame = window[`${vendors[i]}RequestAnimationFrame`];
      window.cancelAnimationFrame = window[`${vendors[i]}CancelAnimationFrame`]
                                 || window[`${vendors[i]}CancelRequestAnimationFrame`];
  }

  if (!window.requestAnimationFrame) {
    let lastTime = 0;
    window.requestAnimationFrame = (callback, element) => {
      const currTime = new Date().getTime()
      const timeToCall = Math.max(0, 16 - (currTime - lastTime))
      const id = window.setTimeout(() => { callback(currTime + timeToCall) }, timeToCall)

      lastTime = currTime + timeToCall;
      return id
    }
  }

  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = (id) => {
      clearTimeout(id)
    }
  }
}