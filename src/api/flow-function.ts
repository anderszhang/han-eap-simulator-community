import api from '../utils/api'

export const flowFunctionApi = {
  list(flowId?: number): Promise<any> {
    const params: Record<string, any> = {}
    if (flowId !== undefined) params.flowId = flowId
    return api.get('/flow-function', { params })
  },

  getByID(id: number): Promise<any> {
    return api.get(`/flow-function/${id}`)
  },

  create(data: { name: string; script: string; scope: string; flowId?: number | null }): Promise<any> {
    return api.post('/flow-function', data)
  },

  update(id: number, data: { name: string; script: string; scope: string; flowId?: number | null }): Promise<any> {
    return api.put(`/flow-function/${id}`, data)
  },

  delete(id: number): Promise<any> {
    return api.delete(`/flow-function/${id}`)
  },

  test(data: { script: string; params?: Record<string, string>; sampleSml?: string; vars?: Record<string, string> }): Promise<any> {
    return api.post('/flow-function/test', data)
  }
}
