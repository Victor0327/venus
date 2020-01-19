import axios from 'axios'

import Plugin from '../base/Plugin'
import ShopifyClient from '../base/ShopifyClient'

import {
  handleAxiosResponse,
  handleAxiosErrorResponse,
} from '../utils/handleAxiosResponse'

export default class HttpPlugin extends Plugin {
  displayName = '$Http'
  $http = this.createHttpClient(this.options)
  $shopify = this.pluginOptions.store ? new ShopifyClient(this.pluginOptions.store) : null

  extractResponseError(resData) {
    const { code, message } = resData
    if (code !== 0) {
      return {
        errorMessage: message,
        errorCode: code
      }
    }

    return null
  }

  handleHttpResponse(res) {
    return handleAxiosResponse(
      res,
      resData => this.extractResponseError(resData)
    )
  }

  handleHttpErrorResponse(err) {
    return handleAxiosErrorResponse(err)
  }

  getBaseURL(options) {
    if (this.isServer) {
      if (!options.serverBaseURL) {
        throw new Error('[HttpPlugin] serverBaseURL cannot be empty')
      }
      return options.serverBaseURL
    }
    return options.baseURL
  }

  createHttpClient(options) {
    let timeout = parseInt(options.timeout, 10)
    if (isNaN(timeout)) {
      timeout = 5000
    }

    const $http = axios.create({
      proxy: false,
      baseURL: this.getBaseURL(options),
      timeout,
    })

    $http.interceptors.response.use(
      res => this.handleHttpResponse(res),
      err => this.handleHttpErrorResponse(err)
    )

    return $http
  }


  /* ------------------------------------------- */

  useResponseInterceptor(onSuccess, onError) {
    this.$http.interceptors.response.use(onSuccess, onError)
    if (this.$shopify) {
      this.$shopify.useResponseInterceptor(onSuccess, onError)
    }

  }

  useErrorInterceptor(onError) {
    this.useResponseInterceptor(
      res => res,
      onError
    )
  }

  /* ------------------------------------------- */

  getInjectProps() {
    return {
      $http: this.$http,
      $shopify: this.$shopify
    }
  }
}
