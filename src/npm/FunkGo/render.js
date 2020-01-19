import React from 'react'
import ReactDOM from 'react-dom'

export default (App, options = {}) => {
  const rootId = options.rootId || 'root'
  const root = document.getElementById(rootId)

  ReactDOM.render(<App />, root)
}