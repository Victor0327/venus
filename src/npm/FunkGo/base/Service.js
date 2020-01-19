export default class BaseService {
  constructor($http) {
    if (!$http) {
      throw new Error('[BaseService] must provide service instance for Service')
    }
    this.$http = $http
  }

  send(args) {
    return this.$http.request(args)
  }

  get(url, args) {
    return this.send({
      url,
      ...args,
      method: 'get'
    })
  }

  post(url, data, args) {
    return this.send({
      url,
      ...args,
      data,
      method: 'post'
    })
  }

  put(url, data, args) {
    return this.send({
      url,
      ...args,
      data,
      method: 'put'
    })
  }

  del(url, data, args) {
    return this.send({
      url,
      ...args,
      data,
      method: 'delete'
    })
  }

}