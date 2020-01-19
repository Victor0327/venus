import axios from 'axios'

import {
  handleAxiosResponse,
  handleAxiosErrorResponse
} from '../utils/handleAxiosResponse'

export default class ShopifyClient {
  static extractEdgeNodes = node => {
    if (node && node.edges) {
      return node.edges.map(
        edge => edge.node
      )
    }

    return []
  }

  /* --------------------------------- */

  extractEdgeNodes(...args) {
    return ShopifyClient.extractEdgeNodes(...args)
  }

  constructor(options) {
    this.client = this.createShopifyClient(options)
  }

  useResponseInterceptor(...args) {
    return this.client.interceptors.response.use(...args)
  }

  extractResponseError(resData) {
    let message

    if (resData.error) {
      message = resData.error.message
    } else if (resData.errors) {
      message = resData.errors.map(error => error.message).join('|')
    }

    if (message) {
      return {
        errorMessage: message
      }
    }

    return null
  }

  handleShopifyResponse(res) {
    return handleAxiosResponse(
      res,
      res => this.extractResponseError(res)
    )
  }

  handleHttpErrorResponse(err) {
    return handleAxiosErrorResponse(err)
  }

  createShopifyClient(options) {
    let timeout = parseInt(options.shopifyTimeout, 10)
    if (isNaN(timeout)) {
      timeout = 5000
    }

    const $shopifyHttp = axios.create({
      proxy: false,
      baseURL: options.shopifyBaseURL,
      timeout: timeout,
      headers: {
        'Content-type': 'application/json',
        'X-Shopify-Storefront-Access-Token': options.shopifyToken
      }
    })

    $shopifyHttp.interceptors.response.use(
      res => this.handleShopifyResponse(res),
      err => this.handleHttpErrorResponse(err)
    )

    return $shopifyHttp
  }

  query(query, variables, options = {}) {
    return this.client.post('', { // always send to base entry which has been setup via baseURL
      query,
      variables
    }, options)
  }

}