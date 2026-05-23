import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosHeaders } from 'axios'

import { apiBaseURL } from '../utils/runtimeConfig'

const api: AxiosInstance = axios.create({
  baseURL: apiBaseURL,
  timeout: 10000
})

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
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
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response: any) => {
    return response.data
  },
  (error: any) => {
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export const engineApi = {
  getEngines: (params: Record<string, any> = {}): Promise<any> => {
    return api.get('/engine', { params })
  },

  getEngine: (id: number): Promise<any> => {
    return api.get(`/engine/${id}`)
  },

  createEngine: (data: any): Promise<any> => {
    return api.post('/engine', data)
  },

  updateEngine: (id: number, data: any): Promise<any> => {
    return api.put(`/engine/${id}`, data)
  },

  deleteEngine: (id: number): Promise<any> => {
    return api.delete(`/engine/${id}`)
  },

  startEngine: (id: number): Promise<any> => {
    return api.post(`/engine/${id}/start`)
  },

  stopEngine: (id: number): Promise<any> => {
    return api.post(`/engine/${id}/stop`)
  },

  sendSML: (id: number, content: string, variables?: Record<string, string>): Promise<any> => {
    return api.post(`/engine/${id}/send`, { content, variables })
  },

  getVars: (id: number): Promise<any> => {
    return api.get(`/engine/${id}/vars`)
  },

  getLogDates: (id: number): Promise<any> => {
    return api.get(`/engine/${id}/logs/dates`)
  },

  getLogInfo: (id: number, startDate: string, endDate: string): Promise<any> => {
    return api.get(`/engine/${id}/logs/info`, { params: { startDate, endDate } })
  },

  downloadLogs: (id: number, startDate: string, endDate: string, raw: boolean): Promise<any> => {
    return api.get(`/engine/${id}/logs/download`, {
      params: { startDate, endDate, raw: raw ? 'true' : 'false' },
      responseType: 'blob'
    })
  }
}

export default api
