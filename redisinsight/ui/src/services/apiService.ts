import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'
import { isNumber } from 'lodash'
import { sessionStorageService } from 'uiSrc/services'
import { BrowserStorageItem } from 'uiSrc/constants'
import { CLOUD_AUTH_API_ENDPOINTS, CustomHeaders } from 'uiSrc/constants/api'
import { store } from 'uiSrc/slices/store'
import { logoutUserAction } from 'uiSrc/slices/oauth/cloud'

const { apiPort } = window.app?.config || { apiPort: process.env.RI_APP_PORT }
const baseApiUrl = process.env.RI_BASE_API_URL
const isDevelopment = process.env.NODE_ENV === 'development'
const isWebApp = process.env.RI_APP_TYPE === 'web'
const hostedApiBaseUrl = process.env.RI_HOSTED_API_BASE_URL

let apiPrefix = process.env.RI_API_PREFIX

if (window.__RI_PROXY_PATH__) {
  apiPrefix = `${window.__RI_PROXY_PATH__}/${apiPrefix}`
}

export const getBaseUrl = () => (!isDevelopment && isWebApp
  ? `${window.location.origin}/${apiPrefix}/`
  : `${baseApiUrl}:${apiPort}/${apiPrefix}/`)

const mutableAxiosInstance: AxiosInstance = axios.create({
  baseURL: hostedApiBaseUrl || getBaseUrl(),
})

export const requestInterceptor = (config: InternalAxiosRequestConfig) => {
  if (config?.headers) {
    const instanceId = /databases\/([\w-]+)\/?.*/.exec(config.url || '')?.[1]

    if (instanceId) {
      const dbIndex = sessionStorageService.get(`${BrowserStorageItem.dbIndex}${instanceId}`)

      if (isNumber(dbIndex)) {
        config.headers[CustomHeaders.DbIndex] = dbIndex
      }
    }

    if (window.windowId) {
      config.headers[CustomHeaders.WindowId] = window.windowId
    }
  }

  return config
}

export const cloudAuthInterceptor = (error: AxiosError) => {
  const { response, config } = error
  if (response?.status === 401 && config?.url && CLOUD_AUTH_API_ENDPOINTS.includes(config.url as any)) {
    store?.dispatch<any>(logoutUserAction?.())
  }

  return Promise.reject(error)
}

mutableAxiosInstance.interceptors.request.use(
  requestInterceptor,
  (error) => Promise.reject(error)
)

mutableAxiosInstance.interceptors.response.use(
  undefined,
  cloudAuthInterceptor
)

export default mutableAxiosInstance
