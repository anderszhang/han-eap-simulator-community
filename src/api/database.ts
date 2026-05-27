import api from '../utils/api'
import type { DatabaseExecuteRequest, DatabaseQueryRequest } from '../types'

export const databaseApi = {
  listTables(): Promise<any> {
    return api.get('/db/tables')
  },

  getTableDetail(name: string, params?: { limit?: number }): Promise<any> {
    return api.get(`/db/tables/${encodeURIComponent(name)}`, { params })
  },

  query(data: DatabaseQueryRequest): Promise<any> {
    return api.post('/db/query', data)
  },

  execute(data: DatabaseExecuteRequest): Promise<any> {
    return api.post('/db/execute', data)
  },
}

export default databaseApi
