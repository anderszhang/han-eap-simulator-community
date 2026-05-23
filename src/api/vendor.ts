import api from '../utils/api'

export const vendorApi = {
  getAll(params?: Record<string, any>): Promise<any> {
    return api.get('/vendors', { params })
  },

  getAllSimple(): Promise<any> {
    return api.get('/vendor-options')
  },

  getByID(id: number): Promise<any> {
    return api.get(`/vendors/${id}`)
  },

  create(data: Record<string, any>): Promise<any> {
    return api.post('/vendors', data)
  },

  merge(data: Record<string, any>): Promise<any> {
    return api.post('/vendors/merge', data)
  },

  mergePreview(data: Record<string, any>): Promise<any> {
    return api.post('/vendors/merge-preview', data)
  },

  update(id: number, data: Record<string, any>): Promise<any> {
    return api.put(`/vendors/${id}`, data)
  },

  delete(id: number): Promise<any> {
    return api.delete(`/vendors/${id}`)
  },

  getModels(vendorId: number): Promise<any> {
    return api.get(`/vendors/${vendorId}/models`)
  },

  getAllModels(params?: Record<string, any>): Promise<any> {
    return api.get('/equipment-models', { params })
  },

  getAllModelsSimple(): Promise<any> {
    return api.get('/model-options')
  },

  getModelByID(id: number): Promise<any> {
    return api.get(`/equipment-models/${id}`)
  },

  getCategories(): Promise<any> {
    return api.get('/equipment-model-categories')
  },

  createModel(data: Record<string, any>): Promise<any> {
    return api.post('/equipment-models', data)
  },

  updateModel(id: number, data: Record<string, any>): Promise<any> {
    return api.put(`/equipment-models/${id}`, data)
  },

  deleteModel(id: number): Promise<any> {
    return api.delete(`/equipment-models/${id}`)
  }
}
