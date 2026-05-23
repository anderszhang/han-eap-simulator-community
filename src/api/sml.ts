import api from '../utils/api'

 export const smlApi = {
   getTree(userId?: number): Promise<any> {
     const params = userId ? { userId } : {}
     return api.get('/sml/tree', { params })
   },

   getNode(id: number): Promise<any> {
     return api.get(`/sml/${id}`)
   },

   createNode(data: any): Promise<any> {
     return api.post('/sml', data)
   },

   updateNode(id: number, data: any): Promise<any> {
     return api.put(`/sml/${id}`, data)
   },

   deleteNode(id: number): Promise<any> {
     return api.delete(`/sml/${id}`)
   },

    countChildren(id: number): Promise<number> {
      return api.get(`/sml/${id}/children`)
    },

    downloadFolder(id: number): Promise<void> {
      return api.get(`/sml/download/${id}`, {
        responseType: 'blob'
      }).then((response: any) => {
        const blob = new Blob([response.data], { type: 'application/zip' })
        const url = window.URL.createObjectURL(blob)
        const contentDisposition = response.headers['content-disposition']
        let filename = 'download.zip'
        if (contentDisposition) {
          const match = contentDisposition.match(/filename="(.+?)"/)
          if (match) filename = match[1]
        }
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      })
    }
  }

export default smlApi
