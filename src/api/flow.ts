import api from '../utils/api'
import type { FlowRunRequest } from '../types'

export const flowApi = {
  getAll(params?: Record<string, any>): Promise<any> {
    return api.get('/flow', { params })
  },

  getByID(id: number): Promise<any> {
    return api.get(`/flow/${id}`)
  },

  create(data: Record<string, any>): Promise<any> {
    return api.post('/flow', data)
  },

  update(id: number, data: Record<string, any>): Promise<any> {
    return api.put(`/flow/${id}`, data)
  },

  delete(id: number): Promise<any> {
    return api.delete(`/flow/${id}`)
  },

  run(id: number, data: FlowRunRequest): Promise<any> {
    return api.post(`/flow/${id}/run`, data)
  },

  stop(id: number): Promise<any> {
    return api.post(`/flow/${id}/stop`)
  },

  getStatus(id: number): Promise<any> {
    return api.get(`/flow/${id}/status`)
  },

  publish(id: number): Promise<any> {
    return api.post(`/flow/${id}/publish`)
  },

  unpublish(id: number): Promise<any> {
    return api.post(`/flow/${id}/unpublish`)
  }
}
