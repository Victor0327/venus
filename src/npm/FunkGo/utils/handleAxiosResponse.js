const defaultExtractData = resData => resData.data

const handleAxiosResponse = (res, extractError, extractData = defaultExtractData) => {
  let err

  if (res.status !== 200) {
    err = new Error(res.statusText)
    err.statusCode = res.status
    err.errorCode = res.status
  }

  const config = res.config
  const resData = res.data

  const { errorMessage, errorCode } = extractError(resData) || {}

  if (errorMessage) {
    err = new Error(errorMessage)
    err.statusCode = 200
    err.errorCode = errorCode || 'N/A'
    err.config = config
    err.data = resData

    throw err
  }

  return extractData(resData)
}

const handleAxiosErrorResponse = err => {
  const res = err.response

  // res will be undefined, if network error
  if (res && res.status && res.status !== 200) {
    err.statusCode = res.status
    err.errorCode = res.status
  } else if (err.code === 'ECONNABORTED') {
    err.statusCode = 408
    err.errorCode = err.code
  } else {
    err.statusCode = -1
    err.errorCode = err.code
  }

  throw err
}

export default handleAxiosResponse

export {
  handleAxiosResponse,
  handleAxiosErrorResponse,
}