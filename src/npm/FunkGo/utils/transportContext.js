import { createLocation } from 'history'


// we need parse location / match / etc props from FunkGoPage to plugins
// so keep it format in here


// it may be called from below situations:
//    1. FunkGoPage - after mount,  do the client side fetching / rendering
//    2. FunkGoApp - server side fetching / rendering

const createTransportContext = ({ location, match, history }) => {
  if (!location) {
    throw new Error(`[FunkGoApp] must specific location on createTransportContext`)
  }

  const parsedLocation = createLocation(location)

  if (!parsedLocation.pathname) {
    throw new Error(`[FunkGoApp] location dose not contain "pathname"`)
  }

  if (!parsedLocation.origin) {
    if (!parsedLocation.protocol || !parsedLocation.hostname) {
      if (typeof window === 'undefined') {
        throw new Error(`[FunkGoApp] location does not contain "protocol" or "hostname"`)
      }
    }

    const protocol = parsedLocation.protocol || document.location.protocol
    const hostname = parsedLocation.hostname || document.location.hostname

    parsedLocation.origin = `${protocol}//${hostname}`
  }


  return {
    location: parsedLocation,
    match: match || null,
    history: history || null
  }
}

export {
  createTransportContext
}