import api from '../utils/api'

export const checklistApi = {
  getAll(params?: Record<string, any>): Promise<any> {
    return api.get('/checklist', { params })
  },

  getAllNames(): Promise<any> {
    return api.get('/checklist-options')
  },

  getByID(id: number): Promise<any> {
    return api.get(`/checklist/${id}`)
  },

  create(data: Record<string, any>): Promise<any> {
    return api.post('/checklist', data)
  },

  update(id: number, data: Record<string, any>): Promise<any> {
    return api.put(`/checklist/${id}`, data)
  },

  delete(id: number): Promise<any> {
    return api.delete(`/checklist/${id}`)
  },

  importExcel(id: number, file: File): Promise<any> {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/checklist/${id}/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  exportExcel(id: number): Promise<any> {
    return api.get(`/checklist/${id}/export`, { responseType: 'blob' })
  },

  getEngines(id: number): Promise<any> {
    return api.get(`/checklist/${id}/engines`)
  },

  setEngines(id: number, engineIds: number[]): Promise<any> {
    return api.put(`/checklist/${id}/engines`, { engineIds })
  },

  getVIDs(id: number): Promise<any> {
    return api.get(`/checklist/${id}/vids`)
  },

  createVID(id: number, data: Record<string, any>): Promise<any> {
    return api.post(`/checklist/${id}/vids`, data)
  },

  batchCreateVIDs(id: number, items: Record<string, any>[]): Promise<any> {
    return api.post(`/checklist/${id}/vids/batch`, items)
  },

  updateVID(id: number, vidId: number, data: Record<string, any>): Promise<any> {
    return api.put(`/checklist/${id}/vids/${vidId}`, data)
  },

  deleteVID(id: number, vidId: number): Promise<any> {
    return api.delete(`/checklist/${id}/vids/${vidId}`)
  },

  getRPTIDs(id: number): Promise<any> {
    return api.get(`/checklist/${id}/rptids`)
  },

  createRPTID(id: number, data: Record<string, any>): Promise<any> {
    return api.post(`/checklist/${id}/rptids`, data)
  },

  updateRPTID(id: number, rptidId: number, data: Record<string, any>): Promise<any> {
    return api.put(`/checklist/${id}/rptids/${rptidId}`, data)
  },

  deleteRPTID(id: number, rptidId: number): Promise<any> {
    return api.delete(`/checklist/${id}/rptids/${rptidId}`)
  },

  getCEIDs(id: number): Promise<any> {
    return api.get(`/checklist/${id}/ceids`)
  },

  createCEID(id: number, data: Record<string, any>): Promise<any> {
    return api.post(`/checklist/${id}/ceids`, data)
  },

  updateCEID(id: number, ceidId: number, data: Record<string, any>): Promise<any> {
    return api.put(`/checklist/${id}/ceids/${ceidId}`, data)
  },

  deleteCEID(id: number, ceidId: number): Promise<any> {
    return api.delete(`/checklist/${id}/ceids/${ceidId}`)
  },

  getValueMaps(id: number): Promise<any> {
    return api.get(`/checklist/${id}/value-maps`)
  },

  createValueMap(id: number, data: Record<string, any>): Promise<any> {
    return api.post(`/checklist/${id}/value-maps`, data)
  },

  updateValueMap(id: number, vmId: number, data: Record<string, any>): Promise<any> {
    return api.put(`/checklist/${id}/value-maps/${vmId}`, data)
  },

  deleteValueMap(id: number, vmId: number): Promise<any> {
    return api.delete(`/checklist/${id}/value-maps/${vmId}`)
  },

  generateSML(id: number, data: { folderName: string; sourceFolder?: string; force?: boolean }): Promise<any> {
    return api.post(`/checklist/${id}/generate-sml`, data)
  },

  generateFlow(id: number, data: { templateId: number; flowName: string; folderName?: string; sourceFolder?: string; force?: boolean; publish?: boolean }): Promise<any> {
    return api.post(`/checklist/${id}/generate-flow`, data)
  }
}
