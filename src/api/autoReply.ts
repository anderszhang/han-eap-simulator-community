import api from '../utils/api'

export const autoReplyApi = {
  getAll(params?: Record<string, any>): Promise<any> {
    return api.get('/auto-reply', { params })
  },

  getByID(id: number): Promise<any> {
    return api.get(`/auto-reply/${id}`)
  },

  create(data: Record<string, any>): Promise<any> {
    return api.post('/auto-reply', data)
  },

  update(id: number, data: Record<string, any>): Promise<any> {
    return api.put(`/auto-reply/${id}`, data)
  },

  delete(id: number): Promise<any> {
    return api.delete(`/auto-reply/${id}`)
  },

  getSmlContent(smlId: number): Promise<any> {
    return api.get(`/auto-reply/sml-content/${smlId}`)
  }
}
