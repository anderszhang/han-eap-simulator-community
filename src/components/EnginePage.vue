<template>
  <div class="engine-page">
    <el-card>
      <div class="toolbar">
        <el-button type="primary" @click="handleAdd">
          <el-icon><Plus /></el-icon>
          Add Engine
        </el-button>
        <span class="toolbar-label">Engines</span>
      </div>

      <div class="search-bar">
        <el-form :model="searchForm" inline>
          <el-form-item label="Mode">
            <el-select v-model="searchForm.mode" placeholder="All" clearable style="width: 120px">
              <el-option label="Active" value="active" />
              <el-option label="Passive" value="passive" />
            </el-select>
          </el-form-item>
          <el-form-item label="Name">
            <el-input v-model="searchForm.engineName" placeholder="Engine Name" clearable style="width: 140px" />
          </el-form-item>
          <el-form-item label="User">
            <el-select v-model="searchForm.userId" placeholder="All" clearable filterable style="width: 140px">
              <el-option v-for="u in userOptions" :key="u.id" :label="u.username" :value="u.id" />
            </el-select>
          </el-form-item>
          <template v-if="searchExpanded">
            <el-form-item label="Status">
              <el-select v-model="searchForm.status" placeholder="All" clearable style="width: 120px">
                <el-option label="Running" value="running" />
                <el-option label="Stopped" value="stopped" />
                <el-option label="Starting" value="starting" />
                <el-option label="Error" value="error" />
              </el-select>
            </el-form-item>
            <el-form-item label="IP">
              <el-input v-model="searchForm.ip" placeholder="IP Address" clearable style="width: 140px" />
            </el-form-item>
            <el-form-item label="Checklist">
              <el-select v-model="searchForm.checklistId" placeholder="All" clearable filterable style="width: 160px">
                <el-option v-for="cl in checklists" :key="cl.id" :label="cl.name" :value="cl.id" />
              </el-select>
            </el-form-item>
          </template>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">
              <el-icon><Search /></el-icon>
              Search
            </el-button>
            <el-button @click="handleReset">
              <el-icon><Refresh /></el-icon>
              Reset
            </el-button>
            <el-button link type="primary" @click="searchExpanded = !searchExpanded">
              {{ searchExpanded ? 'Collapse' : 'More' }}
              <el-icon><ArrowUp v-if="searchExpanded" /><ArrowDown v-else /></el-icon>
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-table border :data="tableData" style="width: 100%" v-loading="loading" class="engine-table">
        <el-table-column prop="mode" label="Mode" width="90">
          <template #default="{ row }">
            <el-tag :type="row.mode === 'active' ? 'success' : 'warning'" size="small">
              {{ row.mode === 'active' ? 'Active' : 'Passive' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="engineName" label="Name" width="130" />
        <el-table-column label="IP:Port" width="160">
          <template #default="{ row }">
            {{ row.ip || '-' }}:{{ row.port }}
          </template>
        </el-table-column>
        <el-table-column prop="deviceId" label="Dev ID" width="80" />
        <el-table-column label="Checklist" width="140" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.checklistName">{{ row.checklistName }}</span>
            <span v-else style="color: #909399">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="Description" min-width="120" show-overflow-tooltip />
        <el-table-column prop="username" label="Creator" width="100" />
        <el-table-column label="Status" min-width="100">
          <template #default="{ row }">
            <span class="status-cell">
              <span class="status-dot" :style="{ backgroundColor: getStatusColor(row.status) }"></span>
              {{ getStatusText(row.status) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="Actions" width="160" fixed="right" align="center">
          <template #default="{ row }">
            <div class="row-actions">
              <el-button
                text
                :disabled="row.status === 'starting'"
                @click="handleStartStop(row)"
                :title="isActive(row.status) ? 'Stop' : 'Start'"
              >
                <el-icon :color="isActive(row.status) ? '#F56C6C' : '#67C23A'">
                  <VideoPlay v-if="!isActive(row.status)" />
                  <VideoPause v-else />
                </el-icon>
              </el-button>
              <el-button v-if="row.userId === currentUser?.id" text type="primary" @click="handleEdit(row)" title="Edit">
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-button text @click="handleCopy(row)" title="Copy">
                <el-icon><CopyDocument /></el-icon>
              </el-button>
              <el-dropdown trigger="click" @command="(command: string) => handleRowCommand(command, row)">
                <el-icon><MoreFilled /></el-icon>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="download-logs">
                      <el-icon><Download /></el-icon>
                      Download Logs
                    </el-dropdown-item>
                    <el-dropdown-item v-if="row.userId === currentUser?.id" command="delete" divided>
                      <el-icon><Delete /></el-icon>
                      Delete
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <el-drawer
      v-model="dialogVisible"
      :title="isEdit ? 'Edit Engine' : 'Add Engine'"
      size="420px"
      :destroy-on-close="true"
      @close="handleDialogClose"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="120px"
      >
        <el-form-item label="Name" prop="engineName">
          <el-input v-model="formData.engineName" placeholder="Enter Engine Name" />
        </el-form-item>

        <el-form-item label="Comm Mode" prop="mode">
          <el-select v-model="formData.mode" placeholder="Select Mode" style="width: 100%">
            <el-option label="Active" value="active" />
            <el-option label="Passive" value="passive" />
          </el-select>
        </el-form-item>

        <el-form-item label="IP" prop="ip">
          <el-input
            v-model="formData.ip"
            placeholder="Enter IP"
            :disabled="formData.mode === 'passive'"
          />
        </el-form-item>

        <el-form-item label="Port" prop="port">
          <el-input-number v-model="formData.port" :min="1" :max="65535" controls-position="right" style="width: 100%" />
        </el-form-item>

        <el-form-item label="Device ID" prop="deviceId">
          <el-input-number v-model="formData.deviceId" :min="0" :max="9999" controls-position="right" style="width: 100%" />
        </el-form-item>

        <el-form-item label="Checklist">
          <el-select v-model="formData.checklistId" clearable filterable placeholder="Select Checklist" style="width: 100%">
            <el-option v-for="cl in checklists" :key="cl.id" :label="cl.name" :value="cl.id" />
          </el-select>
        </el-form-item>

        <el-form-item label="Description">
          <el-input
            v-model="formData.description"
            type="textarea"
            placeholder="Enter Description"
            :rows="3"
          />
        </el-form-item>

        <el-divider content-position="left">Timeouts (sec)</el-divider>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="T3" prop="t3" label-width="50px">
              <el-input-number v-model="formData.t3" :min="0" :max="9999" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="T5" prop="t5" label-width="50px">
              <el-input-number v-model="formData.t5" :min="0" :max="9999" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="T6" prop="t6" label-width="50px">
              <el-input-number v-model="formData.t6" :min="0" :max="9999" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="T7" prop="t7" label-width="50px">
              <el-input-number v-model="formData.t7" :min="0" :max="9999" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="T8" prop="t8" label-width="50px">
              <el-input-number v-model="formData.t8" :min="0" :max="9999" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">Cancel</el-button>
        <el-button type="primary" @click="handleSubmit">Confirm</el-button>
      </template>
    </el-drawer>

    <LogDownloadDialog
      v-model="logDialogVisible"
      :engine-id="logDialogEngine?.id ?? 0"
      :engine-name="logDialogEngine?.engineName ?? ''"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onActivated, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Plus, Edit, Delete, Search, VideoPlay, VideoPause, ArrowUp, ArrowDown, Download, CopyDocument, MoreFilled } from '@element-plus/icons-vue'
import { engineApi } from '../api/engine'
import { checklistApi } from '../api/checklist'
import { userApi } from '../api/user'
import { useCurrentUser } from '../composables/useCurrentUser'
import { Engine } from '../types'
import LogDownloadDialog from './common/LogDownloadDialog.vue'


// Reactive data
const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const checklists = ref<{ id: number; name: string }[]>([])
const searchExpanded = ref(false)

const logDialogVisible = ref(false)
const logDialogEngine = ref<{ id: number; engineName: string } | null>(null)

const { currentUser } = useCurrentUser()
const userOptions = ref<{ id: number; username: string }[]>([])

const loadUsers = async () => {
  try {
    const resp = await userApi.getAll()
    userOptions.value = resp.data?.data || []
  } catch { /* ignore */ }
}

// Search form
const searchForm = reactive({
  mode: '',
  status: '',
  engineName: '',
  ip: '',
  port: null as number | null,
  checklistId: null as number | null,
  userId: null as number | null
})

// Form data
const formData = reactive({
  id: null as number | null,
  mode: 'active',
  engineName: '',
  ip: '',
  port: 5000,
  t3: 45,
  t5: 10,
  t6: 60,
  t7: 20,
  t8: 10,
  deviceId: 0,
  description: '',
  checklistId: null as number | null
})

// Pagination
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

// Table data
const tableData = ref([])

// Form validation rules
const formRules = {
  mode: [
    { required: true, message: 'Please select communication mode', trigger: 'change' }
  ],
  engineName: [
    { required: true, message: 'Please enter engine name', trigger: 'blur' },
    { min: 3, max: 20, message: 'Length should be 3 to 20 characters', trigger: 'blur' }
  ],
  ip: [
    { 
      required: true,
      validator: (_rule: any, value: string, callback: any) => {
        if (formData.mode === 'active' && !value) {
          callback(new Error('Please enter IP address for Active mode'))
        } else if (value && !/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) {
          callback(new Error('Invalid IP address format'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  port: [
    { required: true, message: 'Please enter port number', trigger: 'blur' },
    { type: 'number', min: 1, max: 65535, message: 'Port should be between 1 and 65535', trigger: 'blur' }
  ],
  t3: [
    { type: 'number', min: 0, max: 9999, message: 'T3 should be between 0 and 9999', trigger: 'blur' }
  ],
  t5: [
    { type: 'number', min: 0, max: 9999, message: 'T5 should be between 0 and 9999', trigger: 'blur' }
  ],
  t6: [
    { type: 'number', min: 0, max: 9999, message: 'T6 should be between 0 and 9999', trigger: 'blur' }
  ],
  t7: [
    { type: 'number', min: 0, max: 9999, message: 'T7 should be between 0 and 9999', trigger: 'blur' }
  ],
  t8: [
    { type: 'number', min: 0, max: 9999, message: 'T8 should be between 0 and 9999', trigger: 'blur' }
  ],
  deviceId: [
    { type: 'number', min: 0, max: 9999, message: 'Device ID should be between 0 and 9999', trigger: 'blur' }
  ]
}

// Filter and paginate data
const filterData = async () => {
  loading.value = true
  
  try {
    const params: any = {
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      mode: searchForm.mode || undefined,
      status: searchForm.status || undefined,
      engineName: searchForm.engineName || undefined,
      ip: searchForm.ip || undefined,
      checklistId: searchForm.checklistId ?? undefined,
      userId: searchForm.userId ?? undefined,
    }

    if (searchForm.port !== null && searchForm.port !== undefined) {
      params.port = searchForm.port
    }

    const response = await engineApi.getEngines(params)
    
    if (response.data) {
      tableData.value = response.data.data
      pagination.total = response.data.total
    }
  } catch (error) {
    console.error('Failed to fetch engine data:', error)
    ElMessage.error('Failed to load engine data')
  } finally {
    loading.value = false
  }
}

// Search and reset
const handleSearch = () => {
  pagination.currentPage = 1
  filterData()
}

const handleReset = () => {
  searchForm.mode = ''
  searchForm.status = ''
  searchForm.engineName = ''
  searchForm.ip = ''
  searchForm.port = null
  searchForm.checklistId = null
  searchForm.userId = null
  pagination.currentPage = 1
  filterData()
}

// Pagination handlers
const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  filterData()
}

const handleCurrentChange = (page: number) => {
  pagination.currentPage = page
  filterData()
}

// Add engine
const handleAdd = () => {
  isEdit.value = false
  formData.id = null
  formData.mode = 'active'
  formData.engineName = ''
  formData.ip = ''
  formData.port = 5000
  formData.t3 = 45
  formData.t5 = 10
  formData.t6 = 60
  formData.t7 = 20
  formData.t8 = 10
  formData.deviceId = 0
  formData.description = ''
  formData.checklistId = null
  dialogVisible.value = true
}

// Edit engine
const handleEdit = (row: Engine) => {
  isEdit.value = true
  formData.id = row.id
  formData.mode = row.mode
  formData.engineName = row.engineName
  formData.ip = row.ip
  formData.port = row.port
  formData.t3 = row.t3
  formData.t5 = row.t5
  formData.t6 = row.t6
  formData.t7 = row.t7
  formData.t8 = row.t8
  formData.deviceId = row.deviceId
  formData.description = row.description
  formData.checklistId = row.checklistId || null
  dialogVisible.value = true
}

// Delete engine
const handleDelete = (row: Engine) => {
  ElMessageBox.confirm(
    `This will permanently delete engine "${row.engineName}". Continue?`,
    'Confirm Delete',
    {
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      type: 'error',
      confirmButtonClass: 'el-button--danger',
    }
  ).then(async () => {
    try {
      await engineApi.deleteEngine(row.id)
      ElMessage.success('Delete successful')
      filterData()
    } catch (error: any) {
      console.error('Delete failed:', error)
      ElMessage.error('Delete failed: ' + (error.response?.data?.error || error.message))
    }
    }).catch(() => {
      ElMessage.info('Delete canceled')
    })
}

const handleDownloadLogs = (row: Engine) => {
  logDialogEngine.value = { id: row.id, engineName: row.engineName }
  logDialogVisible.value = true
}

const handleCopy = (row: Engine) => {
  isEdit.value = false
  formData.id = null
  formData.mode = row.mode
  formData.engineName = row.engineName + ' (copy)'
  formData.ip = row.ip
  formData.port = row.port
  formData.t3 = row.t3
  formData.t5 = row.t5
  formData.t6 = row.t6
  formData.t7 = row.t7
  formData.t8 = row.t8
  formData.deviceId = row.deviceId
  formData.description = row.description
  formData.checklistId = row.checklistId || null
  dialogVisible.value = true
}

const handleRowCommand = (command: string, row: Engine) => {
  switch (command) {
    case 'download-logs':
      handleDownloadLogs(row)
      break
    case 'delete':
      handleDelete(row)
      break
  }
}

const isActive = (status?: string) => status === 'running' || status === 'connected'

const handleStartStop = async (row: Engine) => {
  try {
    if (isActive(row.status)) {
      await engineApi.stopEngine(row.id)
      ElMessage.success('Engine stopped')
    } else {
      await engineApi.startEngine(row.id)
      ElMessage.success('Engine starting')
    }
    filterData()
  } catch (error: any) {
    console.error('Start/Stop failed:', error)
    ElMessage.error('Operation failed: ' + (error.response?.data?.error || error.message))
  }
}

const getStatusText = (status: string | undefined): string => {
  switch (status) {
    case 'starting':
      return 'Starting'
    case 'running':
    case 'connected':
      return 'Running'
    case 'error':
      return 'Error'
    default:
      return 'Stopped'
  }
}

const getStatusColor = (status: string | undefined): string => {
  switch (status) {
    case 'starting':
      return '#E6A23C'
    case 'running':
    case 'connected':
      return '#67C23A'
    case 'error':
      return '#F56C6C'
    default:
      return '#909399'
  }
}

// Submit form
const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    
    const requestData = {
      mode: formData.mode,
      engineName: formData.engineName,
      ip: formData.ip,
      port: formData.port,
      t3: formData.t3,
      t5: formData.t5,
      t6: formData.t6,
      t7: formData.t7,
      t8: formData.t8,
      deviceId: formData.deviceId,
      description: formData.description,
      checklistId: formData.checklistId
    }
    
    if (isEdit.value) {
      await engineApi.updateEngine(formData.id!, requestData)
      ElMessage.success('Update successful')
    } else {
      await engineApi.createEngine(requestData)
      ElMessage.success('Add successful')
    }
    
    dialogVisible.value = false
    filterData()
  } catch (error: any) {
    console.error('Submit failed:', error)
    if (error.response?.data?.error) {
      ElMessage.error('Operation failed: ' + error.response.data.error)
    } else {
      ElMessage.error('Operation failed: ' + error.message)
    }
  }
}

// Dialog close handler
const handleDialogClose = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

// Watch for mode changes to handle IP field
watch(() => formData.mode, (newMode) => {
  if (newMode === 'passive') {
    formData.ip = ''
  }
})

// Load checklist options
const loadChecklists = async () => {
  try {
    const resp = await checklistApi.getAllNames()
    checklists.value = resp.data?.data || []
  } catch { /* ignore */ }
}

const initData = () => {
  if (currentUser.value && currentUser.value.roleId !== 1) {
    searchForm.userId = currentUser.value.id
  }
  filterData()
  loadChecklists()
  loadUsers()
}

onMounted(initData)
onActivated(initData)
</script>

<style scoped>
.engine-page {
  padding: 4px 4px 16px 4px;
  height: calc(100vh - 85px);
  min-height: 400px;
  box-sizing: border-box;
}

.engine-page :deep(.el-card) {
  height: 100%;
}

.engine-page :deep(.el-card__body) {
  height: 100%;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 12px;
  height: 45px;
  box-sizing: border-box;
  border-bottom: 1px solid #dcdfe6;
  background-color: #f5f7fa;
  flex-shrink: 0;
}

.toolbar-label {
  font-weight: bold;
  font-size: 14px;
  color: #303133;
}

.search-bar {
  padding: 6px 12px;
  border-bottom: 1px solid #e4e7ed;
  background-color: #fafafa;
  flex-shrink: 0;
}

.search-bar :deep(.el-form-item) {
  margin-bottom: 6px;
}

.search-bar :deep(.el-form-item__label) {
  font-size: 13px;
}

.engine-table {
  flex: 1;
  min-height: 0;
}

.status-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.row-actions {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.row-actions :deep(.el-button) {
  margin-left: 0;
  padding-left: 6px;
  padding-right: 6px;
}

.pagination {
  padding: 12px;
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
  border-top: 1px solid #ebeef5;
}

:deep(.el-table .cell) {
  white-space: nowrap;
}

:deep(.el-form-item) {
  margin-bottom: 18px;
}

:deep(.el-drawer__body) {
  padding: 16px 20px;
  overflow-y: auto;
}

:deep(.el-drawer__footer) {
  padding: 12px 20px;
  border-top: 1px solid #e4e7ed;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
