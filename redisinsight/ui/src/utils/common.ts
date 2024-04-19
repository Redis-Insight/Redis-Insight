import { IpcInvokeEvent } from 'uiSrc/electron/constants'

const baseApiUrl = process.env.RI_BASE_API_URL
const isDevelopment = process.env.NODE_ENV === 'development'
const isWebApp = process.env.RI_APP_TYPE === 'web'
// eslint-disable-next-line prefer-destructuring
const apiPort = window.app.config.apiPort

export const getBaseApiUrl = () => (!isDevelopment && isWebApp
  ? window.location.origin
  : `${baseApiUrl}:${apiPort}`)

export const getProxyPath = () => {
  if (window.__RIPROXYPATH__) {
    return `/${window.__RIPROXYPATH__}/socket.io`
  }
  return '/socket.io'
}

type Node = number | string | JSX.Element

export const getNodeText = (node: Node | Node[]): string => {
  if (['string', 'number'].includes(typeof node)) return node?.toString()
  if (node instanceof Array) return node.map(getNodeText).join('')
  if (typeof node === 'object' && node) return getNodeText(node.props.children)
  return ''
}

export const removeSymbolsFromStart = (str = '', symbol = ''): string => {
  if (str.startsWith(symbol)) {
    return str.slice(symbol.length)
  }
  return str
}

export const openNewWindowDatabase = (location: string) => {
  if (isWebApp) {
    window.open(window.location.origin + location)
    return
  }

  window.app?.ipc?.invoke(
    IpcInvokeEvent.windowOpen,
    { location },
  )
}
