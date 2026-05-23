import api from '../utils/api'

export const flowTemplateApi = {
  getAll(params?: Record<string, any>): Promise<any> {
    return api.get('/flow-template', { params })
  },

  getByID(id: number): Promise<any> {
    return api.get(`/flow-template/${id}`)
  },

  create(data: Record<string, any>): Promise<any> {
    return api.post('/flow-template', data)
  },

  update(id: number, data: Record<string, any>): Promise<any> {
    return api.put(`/flow-template/${id}`, data)
  },

  delete(id: number): Promise<any> {
    return api.delete(`/flow-template/${id}`)
  }
}
