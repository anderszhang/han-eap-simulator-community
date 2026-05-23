import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig, AxiosHeaders } from 'axios'

import { apiBaseURL } from './runtimeConfig'

const api: AxiosInstance = axios.create({
  baseURL: apiBaseURL,
  timeout: 10000
})

let isRedirectingToLogin = false

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const configUrl = config.url as string | undefined
    if (configUrl && !configUrl.includes('/api/login')) {
      const token = localStorage.getItem('token')
      if (token) {
        const headers = new AxiosHeaders()
        headers.set('Authorization', `Bearer ${token}`)
        if (config.headers) {
          Object.entries(config.headers).forEach(([key, value]) => {
            headers.set(key, value as string)
          })
        }
        config.headers = headers
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error: any) => {
    if (error.response && error.response.status === 401) {
      if (!isRedirectingToLogin) {
        isRedirectingToLogin = true
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.replace('/')
      }
    }
    return Promise.reject(error)
  }
)

export default api

export const apiGet = (url: string, config?: AxiosRequestConfig): Promise<AxiosResponse> => {
  return api.get(url, config)
}

export const apiPost = (url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse> => {
  return api.post(url, data, config)
}

export const apiPut = (url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse> => {
  return api.put(url, data, config)
}

export const apiDelete = (url: string, config?: AxiosRequestConfig): Promise<AxiosResponse> => {
  return api.delete(url, config)
}
