import { createLocation, createPath } from 'history'
import queryString from 'query-string'
import interConfig from '../internalConfig'

const getQueryStringFromParams = (params = {}) => {
  return Object.keys(params).map(
    key => {
      const value = params[key]
      return typeof value !== 'undefined'
        ? `${key}=${encodeURIComponent(value)}`
        : key
    }
  ).filter(s => s).join('&')
}

const getParamsFromQueryString = (queryString) => {
  let result = {}

  queryString.split('&').forEach((item) => {
    const key = item.split('=')[0]
    const value = decodeURIComponent(item.split('=')[1])
    result[key] = value
  })

  return result
}

const hasBrowserLocation = () => (
  typeof window !== 'undefined'
  && typeof window.document !== 'undefined'
  && typeof window.document.location !== 'undefined'
)

const getCurrentOrigin = () => {
  if (hasBrowserLocation()) {
    if (document.location.origin) {
      return document.location.origin
    } else {
      return `${document.location.protocol}//${document.location.host}`
    }
  }
  return interConfig.MAIN_ORIGIN
}


const getCurrentPlainUrl = () => {
  const origin = getCurrentOrigin()

  if (hasBrowserLocation()) {
    return `${origin}${document.location.pathname}`
  }

  return origin
}

const makeFullUrl = (pathname, params) => {
  if (isAbsolutePath(pathname)) {
    return makeUrl(pathname, params)
  }

  const origin = getCurrentOrigin()

  return makeUrl(`${origin}${pathname}`, params)
}

const makeUrlWithDefaultParams = (baseUri, params = {}) => {
  const location = createLocation(baseUri)
  const searchMap = {
    ...params,
    ...queryString.parse(location.search),
  }

  const url = createPath({
    ...location,
    search: queryString.stringify(searchMap)
  })

  return url
}

const makeUrl = (baseUri, params = {}) => {
  const location = createLocation(baseUri)
  const searchMap = {
    ...queryString.parse(location.search),
    ...params
  }

  const url = createPath({
    ...location,
    search: queryString.stringify(searchMap)
  })

  return url
}

const isAbsolutePath = path => /^((https?):\/\/|\/\/)/.test(path)

const parseSearch = obj => {
  let str

  if (typeof obj === 'string') {
    str = obj
  } else if (typeof obj === 'object') {
    str = Object.keys(obj).map(key => {
      const value = obj[key]
      if (value !== undefined) {
        return `${key}=${encodeURIComponent(value)}`
      }
      return key
    }).join('&')
  }

  if (str) {
    return str.charAt(0) === '?' ? str : `?${str}`
  }

  return undefined
}

const parseHash = str => {
  if (str) {
    return str.charAt(0) === '#' ? str : `#${str}`
  }

  return undefined
}

/* ---------------------------------- */

const APP_SCHEME_REG = /flamingo:\/\/flamingo\.shop\/([^?]+)/
const APP_PAGE_ID_WEBVIEW = 'BaseWebView'
const APP_WEBVIEW_URL_PARAMS_NAME = 'urlString'
const APP_PAGE_ID_SALES_EVENT = 'Activity'
const APP_PAGE_ID_COUPON_CENTER = 'CouponCenter'
const APP_PAGE_ID_PRODUCT_DETAIL = 'CommodityDetails'

const isAppScheme = scheme => typeof scheme === 'string' && APP_SCHEME_REG.test(scheme)
const parseAppScheme = scheme => {
  const matched = APP_SCHEME_REG.exec(scheme)
  if (matched) {
    const path = matched[0]
    const name = matched[1]
    const query = scheme.substr(path.length)
    const params = queryString.parse(query)

    return {
      name,
      params
    }
  }

  return undefined
}

// TODO: herman
// a workaround to parse page id here, the correct way is defined on route
// , and covert it automatically
const parseAppSchemeToWebRoute = scheme => {
  const appScheme = parseAppScheme(scheme)

  if (appScheme) {
    if (appScheme.name === APP_PAGE_ID_WEBVIEW) {
      return appScheme.params[APP_WEBVIEW_URL_PARAMS_NAME]
    } else if (appScheme.name === APP_PAGE_ID_SALES_EVENT) {
      return { name: 'SalesEvent', params: appScheme.params }
    } else if (appScheme.name === APP_PAGE_ID_PRODUCT_DETAIL) {
      return { name: 'Product', params: { handle: appScheme.params.productId }}
    } else if (appScheme.name === APP_PAGE_ID_COUPON_CENTER) {
      return { name: 'CouponCenter' }
    }
  }

  return ''
}


export {
  makeFullUrl,
  isAbsolutePath,
  parseSearch,
  parseHash,
  getCurrentOrigin,
  getCurrentPlainUrl,
  getQueryStringFromParams,
  getParamsFromQueryString,

  makeUrl,
  makeUrlWithDefaultParams,

  isAppScheme,
  parseAppSchemeToWebRoute,
}

