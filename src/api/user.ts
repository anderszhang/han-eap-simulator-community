import api from '../utils/api'

export const userApi = {
  getAll() {
    return api.get('/users')
  },

  createUser(data: { username: string; password: string; roleId: number }) {
    return api.post('/users', data)
  },

  deleteUser(id: number) {
    return api.delete(`/users/${id}`)
  },

  updateStatus(id: number, status: string) {
    return api.put(`/users/${id}/status`, { status })
  },

  resetPassword(id: number, password: string) {
    return api.put(`/users/${id}/password`, { password })
  },

  changePassword(data: { oldPassword: string; newPassword: string }) {
    return api.post('/users/change-password', data)
  },
}

export default userApi
