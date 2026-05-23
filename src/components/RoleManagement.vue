<template>
  <div class="role-management">
    <el-card class="mb-4">
      <template #header>
        <div class="card-header">
          <span>Users</span>
          <el-button type="primary" size="small" @click="showAddDialog = true">
            <el-icon><Plus /></el-icon> Add User
          </el-button>
        </div>
      </template>

      <el-table border :data="users" style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="Username" />
        <el-table-column prop="roleName" label="Role" width="100" />
        <el-table-column prop="status" label="Status" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'enabled' ? 'success' : 'danger'" size="small">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Actions" min-width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              text
              :type="row.status === 'enabled' ? 'warning' : 'success'"
              @click="toggleStatus(row)"
              :disabled="row.id === currentUser?.id"
              :title="row.status === 'enabled' ? 'Disable' : 'Enable'"
            >
              <el-icon><component :is="row.status === 'enabled' ? 'CircleClose' : 'CircleCheck'" /></el-icon>
            </el-button>
            <el-button text @click="openResetPwd(row)" title="Reset Password">
              <el-icon><Key /></el-icon>
            </el-button>
            <el-button
              text
              type="danger"
              @click="handleDelete(row)"
              :disabled="row.id === currentUser?.id"
              title="Delete"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Add User Dialog -->
    <el-dialog v-model="showAddDialog" title="Add User" width="400px">
      <el-form :model="addForm" :rules="addRules" ref="addFormRef" label-width="80px">
        <el-form-item label="Username" prop="username">
          <el-input v-model="addForm.username" />
        </el-form-item>
        <el-form-item label="Password" prop="password">
          <el-input v-model="addForm.password" type="password" show-password />
        </el-form-item>
        <el-form-item label="Role" prop="roleId">
          <el-select v-model="addForm.roleId" style="width: 100%">
            <el-option v-for="r in roles" :key="r.id" :label="r.name" :value="r.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">Cancel</el-button>
        <el-button type="primary" @click="handleAddUser">Confirm</el-button>
      </template>
    </el-dialog>

    <!-- Reset Password Dialog -->
    <el-dialog v-model="showResetDialog" title="Reset Password" width="400px">
      <el-form :model="resetForm" :rules="resetRules" ref="resetFormRef" label-width="100px">
        <el-form-item label="New Password" prop="password">
          <el-input v-model="resetForm.password" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showResetDialog = false">Cancel</el-button>
        <el-button type="primary" @click="handleResetPwd">Confirm</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import api from '../utils/api'
import { userApi } from '../api/user'
import { useCurrentUser } from '../composables/useCurrentUser'
import type { Role, User } from '../types'

const { currentUser } = useCurrentUser()
const loading = ref(false)
const roles = ref<Role[]>([])
const users = ref<User[]>([])

const showAddDialog = ref(false)
const addFormRef = ref()
const addForm = ref({ username: '', password: '', roleId: 2 })
const addRules = {
  username: [{ required: true, message: 'Required', trigger: 'blur' }],
  password: [{ required: true, message: 'Required', trigger: 'blur' }],
  roleId: [{ required: true, message: 'Required', trigger: 'change' }],
}

const showResetDialog = ref(false)
const resetFormRef = ref()
const resetForm = ref({ password: '' })
const resetRules = {
  password: [{ required: true, message: 'Required', trigger: 'blur' }],
}
const resetTarget = ref<User | null>(null)

const fetchRoles = async () => {
  try {
    const response = await api.get('/roles')
    roles.value = response.data.data || []
  } catch {
    ElMessage.error('Failed to fetch roles')
  }
}

const fetchUsers = async () => {
  loading.value = true
  try {
    const response = await userApi.getAll()
    users.value = response.data.data || []
  } catch {
    ElMessage.error('Failed to fetch users')
  } finally {
    loading.value = false
  }
}

const handleAddUser = async () => {
  try {
    await addFormRef.value.validate()
    await userApi.createUser(addForm.value)
    ElMessage.success('User created')
    showAddDialog.value = false
    addForm.value = { username: '', password: '', roleId: 2 }
    fetchUsers()
  } catch (e: any) {
    ElMessage.error(e.response?.data?.error || 'Failed to create user')
  }
}

const handleDelete = (row: User) => {
  ElMessageBox.confirm(`Delete user "${row.username}"?`, 'Confirm', { type: 'warning' })
    .then(async () => {
      await userApi.deleteUser(row.id)
      ElMessage.success('Deleted')
      fetchUsers()
    })
    .catch(() => {})
}

const toggleStatus = async (row: User) => {
  const newStatus = row.status === 'enabled' ? 'disabled' : 'enabled'
  try {
    await userApi.updateStatus(row.id, newStatus)
    ElMessage.success(`User ${newStatus}`)
    fetchUsers()
  } catch {
    ElMessage.error('Failed')
  }
}

const openResetPwd = (row: User) => {
  resetTarget.value = row
  resetForm.value.password = ''
  showResetDialog.value = true
}

const handleResetPwd = async () => {
  try {
    await resetFormRef.value.validate()
    if (!resetTarget.value) return
    await userApi.resetPassword(resetTarget.value.id, resetForm.value.password)
    ElMessage.success('Password reset')
    showResetDialog.value = false
  } catch (e: any) {
    ElMessage.error(e.response?.data?.error || 'Failed')
  }
}

onMounted(() => {
  fetchRoles()
  fetchUsers()
})
</script>

<style scoped>
.role-management {
  padding: 4px 4px 16px 4px;
  height: calc(100vh - 85px);
  min-height: 400px;
  box-sizing: border-box;
}
.mb-4 {
  margin-bottom: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
