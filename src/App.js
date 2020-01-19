import FunkGo from './npm/FunkGo'

import LoginContainer from './containers/Login/LoginContainer'

import './App.css'
import pkg from '../package.json'

const corePages = [
  {
    name: 'Login',
    path: '/login',
    component: LoginContainer
  }
]

const go = new FunkGo({
  name: pkg.name,
  version: pkg.version,
  router: {
    routes: [
      ...corePages
    ],
    globalRoutes: []
  },
  plugins: {
    http: {
      timeout: process.env.REACT_APP_API_TIMEOUT,
      baseURL: process.env.REACT_APP_API_ENDPOINT,
      serverBaseURL: process.env.REACT_APP_API_SSR_ENDPOINT
    },
  }
})


export default go.createApp()