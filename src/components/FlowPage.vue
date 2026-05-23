<template>
  <div class="flow-page">
    <el-card>
      <el-tabs v-model="activeTab" class="flow-tabs" @tab-change="onTabChange">
        <!-- Flow Tab -->
        <el-tab-pane label="Flow" name="flow">
          <div class="toolbar">
            <el-button type="primary" @click="handleAdd">
              <el-icon><Plus /></el-icon> Add Flow
            </el-button>
          </div>

          <div class="search-bar">
            <el-form :model="searchForm" inline>
              <el-form-item label="Name">
                <el-input v-model="searchForm.name" placeholder="Flow Name" clearable style="width: 160px" />
              </el-form-item>
              <el-form-item label="User">
                <el-select v-model="searchForm.userId" placeholder="All" clearable filterable style="width: 140px">
                  <el-option v-for="u in userOptions" :key="u.id" :label="u.username" :value="u.id" />
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="handleSearch">
                  <el-icon><Search /></el-icon> Search
                </el-button>
                <el-button @click="handleReset">
                  <el-icon><Refresh /></el-icon> Reset
                </el-button>
              </el-form-item>
            </el-form>
          </div>

          <el-table border :data="tableData" style="width: 100%" v-loading="loading" class="data-table">
            <el-table-column type="index" label="#" width="50" />
            <el-table-column prop="name" label="Name" width="180">
              <template #default="{ row }">
                <el-link type="primary" @click="handleEdit(row)">{{ row.name }}</el-link>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="Description" min-width="200" show-overflow-tooltip />
            <el-table-column label="Interval" width="90">
              <template #default="{ row }">{{ row.stepInterval || 0 }}ms</template>
            </el-table-column>
            <el-table-column label="Mode" width="80">
              <template #default="{ row }">
                <el-tag :type="row.commMode === 'passive' ? 'warning' : ''" size="small">{{ row.commMode === 'passive' ? 'Passive' : 'Active' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="Steps" width="70">
              <template #default="{ row }">{{ row.steps?.length || 0 }}</template>
            </el-table-column>
            <el-table-column label="Status" width="100">
              <template #default="{ row }">
                <el-tag v-if="row.published" type="success" size="small">Published</el-tag>
                <el-tag v-else type="info" size="small">Draft</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="username" label="Creator" width="100" />
            <el-table-column prop="createTime" label="Created" width="165" />
            <el-table-column label="Actions" min-width="140" fixed="right">
              <template #default="{ row }">
                <el-button text type="success" :disabled="!row.published" @click="handleRun(row)" title="Run in Auto SECS"><el-icon><VideoPlay /></el-icon></el-button>
                <el-button v-if="row.userId === currentUser?.id" text type="primary" @click="handleEdit(row)" title="Edit Flow"><el-icon><Edit /></el-icon></el-button>
                <el-button v-if="row.userId === currentUser?.id" text @click="handleEditProps(row)" title="Edit Properties"><el-icon><SetUp /></el-icon></el-button>
                <el-button text @click="handleCopy(row)" title="Copy"><el-icon><CopyDocument /></el-icon></el-button>
                <el-button v-if="row.userId === currentUser?.id" text type="danger" @click="handleDelete(row)" title="Delete"><el-icon><Delete /></el-icon></el-button>
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
              @size-change="loadData"
              @current-change="loadData"
            />
          </div>
        </el-tab-pane>

        <!-- Flow Template Tab -->
        <el-tab-pane label="Flow Template" name="template">
          <div class="toolbar">
            <span />
          </div>

          <div class="search-bar">
            <el-form :model="templateSearchForm" inline>
              <el-form-item label="Name">
                <el-input v-model="templateSearchForm.name" placeholder="Template Name" clearable style="width: 160px" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="handleTemplateSearch">
                  <el-icon><Search /></el-icon> Search
                </el-button>
                <el-button @click="handleTemplateReset">
                  <el-icon><Refresh /></el-icon> Reset
                </el-button>
              </el-form-item>
            </el-form>
          </div>

          <el-table border :data="templateTableData" style="width: 100%" v-loading="templateLoading" class="data-table">
            <el-table-column type="index" label="#" width="50" />
            <el-table-column prop="name" label="Name" width="180" />
            <el-table-column prop="description" label="Description" min-width="200" show-overflow-tooltip />
            <el-table-column label="Interval" width="90">
              <template #default="{ row }">{{ row.stepInterval || 0 }}ms</template>
            </el-table-column>
            <el-table-column label="Mode" width="80">
              <template #default="{ row }">
                <el-tag :type="row.commMode === 'passive' ? 'warning' : ''" size="small">{{ row.commMode === 'passive' ? 'Passive' : 'Active' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="Steps" width="70">
              <template #default="{ row }">{{ row.steps ? JSON.parse(row.steps).length : 0 }}</template>
            </el-table-column>
            <el-table-column prop="username" label="Creator" width="100" />
            <el-table-column prop="createTime" label="Created" width="165" />
              <el-table-column label="Actions" width="120" fixed="right">
                <template #default="{ row }">
                  <el-button text @click="handleUseTemplate(row)" title="Use Template"><el-icon><CopyDocument /></el-icon></el-button>
                  <el-button v-if="row.userId === currentUser?.id" text type="danger" @click="handleDeleteTemplate(row)" title="Delete"><el-icon><Delete /></el-icon></el-button>
                </template>
              </el-table-column>
          </el-table>

          <div class="pagination">
            <el-pagination
              v-model:current-page="templatePagination.currentPage"
              v-model:page-size="templatePagination.pageSize"
              :page-sizes="[10, 20, 50, 100]"
              :total="templatePagination.total"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="loadTemplates"
              @current-change="loadTemplates"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- Create Flow Dialog -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="480px" :destroy-on-close="true">
      <el-form :model="formData" label-width="100px">
        <el-form-item label="Name" required>
          <el-input v-model="formData.name" placeholder="Flow name" maxlength="100" />
        </el-form-item>
        <el-form-item label="Description">
          <el-input v-model="formData.description" placeholder="Description" />
        </el-form-item>
        <el-form-item v-if="dialogMode === 'create'" label="Template">
          <el-select v-model="formData.templateId" placeholder="Select template (optional)" clearable style="width: 100%" @change="onTemplateChange">
            <el-option v-for="t in allTemplates" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="Interval">
          <el-input-number v-model="formData.stepInterval" :min="0" :max="60000" :step="100" controls-position="right" />
          <span style="margin-left: 6px; color: #909399; font-size: 13px">ms (between steps)</span>
        </el-form-item>
        <el-form-item label="Comm Mode">
          <el-radio-group v-model="formData.commMode">
            <el-radio value="active">Active</el-radio>
            <el-radio value="passive">Passive</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">Cancel</el-button>
        <el-button type="primary" @click="handleCreate">{{ dialogMode === 'copy' ? 'Copy & Edit' : 'Create & Edit' }}</el-button>
      </template>
    </el-dialog>

    <!-- Edit Properties Dialog -->
    <el-dialog v-model="editPropsVisible" title="Edit Properties" width="480px" :destroy-on-close="true">
      <el-form :model="editPropsData" label-width="100px">
        <el-form-item label="Name" required>
          <el-input v-model="editPropsData.name" placeholder="Flow name" maxlength="100" />
        </el-form-item>
        <el-form-item label="Description">
          <el-input v-model="editPropsData.description" placeholder="Description" />
        </el-form-item>
        <el-form-item label="Interval">
          <el-input-number v-model="editPropsData.stepInterval" :min="0" :max="60000" :step="100" controls-position="right" />
          <span style="margin-left: 6px; color: #909399; font-size: 13px">ms (between steps)</span>
        </el-form-item>
        <el-form-item label="Comm Mode">
          <el-radio-group v-model="editPropsData.commMode">
            <el-radio value="active">Active</el-radio>
            <el-radio value="passive">Passive</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editPropsVisible = false">Cancel</el-button>
        <el-button type="primary" @click="handleSaveProps">Save</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete, Search, Refresh, CopyDocument, SetUp, VideoPlay } from '@element-plus/icons-vue'
import { flowApi } from '../api/flow'
import { flowTemplateApi } from '../api/flow-template'
import { userApi } from '../api/user'
import { useCurrentUser } from '../composables/useCurrentUser'
import type { Flow, FlowTemplate } from '../types'

const router = useRouter()
const activeTab = ref('flow')

const { currentUser } = useCurrentUser()
const userOptions = ref<{ id: number; username: string }[]>([])

const loadUsers = async () => {
  try {
    const resp = await userApi.getAll()
    userOptions.value = resp.data?.data || []
  } catch { /* ignore */ }
}

// ===== Flow Tab =====
const loading = ref(false)
const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'copy'>('create')
const editPropsVisible = ref(false)
const editPropsId = ref(0)
const tableData = ref<Flow[]>([])
const searchForm = reactive({ name: '', userId: null as number | null })
const pagination = reactive({ currentPage: 1, pageSize: 10, total: 0 })
const copySource = ref<{ steps: any[]; edges: string } | null>(null)
const dialogTitle = computed(() => dialogMode.value === 'copy' ? 'Copy Flow' : 'Add Flow')

// ===== Template Tab =====
const templateLoading = ref(false)
const templateTableData = ref<FlowTemplate[]>([])
const templateSearchForm = reactive({ name: '' })
const templatePagination = reactive({ currentPage: 1, pageSize: 10, total: 0 })
const allTemplates = ref<FlowTemplate[]>([])

const formData = reactive({
  name: '',
  description: '',
  stepInterval: 1000,
  commMode: 'active' as 'active' | 'passive',
  templateId: null as number | null,
})

const editPropsData = reactive({
  name: '',
  description: '',
  stepInterval: 1000,
  commMode: 'active' as 'active' | 'passive',
})

const loadData = async () => {
  loading.value = true
  try {
    const params: Record<string, unknown> = {
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      name: searchForm.name || undefined,
      userId: searchForm.userId ?? undefined,
    }
    const resp = await flowApi.getAll(params)
    if (resp.data?.data) {
      tableData.value = resp.data.data.data || []
      pagination.total = resp.data.data.total || 0
    }
  } catch {
    ElMessage.error('Failed to load flows')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => { pagination.currentPage = 1; loadData() }
const handleReset = () => {
  searchForm.name = ''
  searchForm.userId = null
  pagination.currentPage = 1
  loadData()
}

const loadTemplates = async () => {
  templateLoading.value = true
  try {
    const resp = await flowTemplateApi.getAll({
      page: templatePagination.currentPage,
      pageSize: templatePagination.pageSize,
      name: templateSearchForm.name || undefined,
    })
    if (resp.data?.data) {
      templateTableData.value = resp.data.data.data || []
      templatePagination.total = resp.data.data.total || 0
    }
  } catch {
    ElMessage.error('Failed to load templates')
  } finally {
    templateLoading.value = false
  }
}

const handleTemplateSearch = () => { templatePagination.currentPage = 1; loadTemplates() }
const handleTemplateReset = () => {
  templateSearchForm.name = ''
  templatePagination.currentPage = 1
  loadTemplates()
}

const loadAllTemplates = async () => {
  try {
    const resp = await flowTemplateApi.getAll({ page: 1, pageSize: 1000 })
    allTemplates.value = resp.data?.data?.data || []
  } catch {
    /* ignore */
  }
}

const onTabChange = (tab: string) => {
  if (tab === 'template') {
    loadTemplates()
  }
}

const handleAdd = () => {
  dialogMode.value = 'create'
  copySource.value = null
  formData.name = ''
  formData.description = ''
  formData.stepInterval = 1000
  formData.commMode = 'active'
  formData.templateId = null
  dialogVisible.value = true
  loadAllTemplates()
}

const onTemplateChange = async (id: number) => {
  if (!id) return
  try {
    const resp = await flowTemplateApi.getByID(id)
    const t = resp.data?.data || resp.data
    if (t) {
      formData.stepInterval = t.stepInterval || 1000
      formData.commMode = (t.commMode || 'active') as 'active' | 'passive'
    }
  } catch {
    /* ignore */
  }
}

const handleCreate = async () => {
  if (!formData.name.trim()) {
    ElMessage.warning('Name is required')
    return
  }
  try {
    let payload: Record<string, any> = {
      name: formData.name,
      description: formData.description,
      stepInterval: formData.stepInterval,
      commMode: formData.commMode,
      steps: [{ type: 'send', name: 'Send step', config: '{"sml":""}' }],
    }
    if (dialogMode.value === 'copy' && copySource.value) {
      payload = {
        name: formData.name,
        description: formData.description,
        stepInterval: formData.stepInterval,
        commMode: formData.commMode,
        edges: copySource.value.edges,
        steps: copySource.value.steps,
      }
    } else if (formData.templateId) {
      const resp = await flowTemplateApi.getByID(formData.templateId)
      const t = resp.data?.data || resp.data
      if (t) {
        const steps = JSON.parse(t.steps || '[]')
        payload = {
          name: formData.name,
          description: formData.description || t.description,
          stepInterval: formData.stepInterval,
          commMode: formData.commMode,
          edges: t.edges || '',
          steps: Array.isArray(steps) ? steps : [{ type: 'send', name: 'Send step', config: '{"sml":""}' }],
        }
      }
    }
    const resp = await flowApi.create(payload)
    const id = resp.data?.data?.id
    dialogVisible.value = false
    if (id) {
      router.push(`/flow/${id}/edit`)
    } else {
      loadData()
    }
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Create failed'
    ElMessage.error(msg)
  }
}

const handleEdit = (row: Flow) => {
  router.push(`/flow/${row.id}/edit`)
}

const handleRun = (row: Flow) => {
  router.push({ path: '/auto-secs', query: { flowId: String(row.id) } })
}

const handleEditProps = (row: Flow) => {
  editPropsId.value = row.id
  editPropsData.name = row.name
  editPropsData.description = row.description || ''
  editPropsData.stepInterval = row.stepInterval || 0
  editPropsData.commMode = row.commMode || 'active'
  editPropsVisible.value = true
}

const handleSaveProps = async () => {
  if (!editPropsData.name.trim()) {
    ElMessage.warning('Name is required')
    return
  }
  try {
    const resp = await flowApi.getByID(editPropsId.value)
    const flow = resp.data?.data || resp.data
    await flowApi.update(editPropsId.value, {
      name: editPropsData.name,
      description: editPropsData.description,
      stepInterval: editPropsData.stepInterval,
      commMode: editPropsData.commMode,
      steps: (flow?.steps || []).map((s: any) => ({
        type: s.type,
        name: s.name,
        config: typeof s.config === 'string' ? s.config : JSON.stringify(s.config),
      })),
    })
    editPropsVisible.value = false
    ElMessage.success('Updated')
    loadData()
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Update failed'
    ElMessage.error(msg)
  }
}

const handleCopy = async (row: Flow) => {
  try {
    const resp = await flowApi.getByID(row.id)
    const flow = resp.data?.data || resp.data
    const steps = (flow?.steps || []).map((s: any) => ({
      type: s.type,
      name: s.name,
      config: typeof s.config === 'string' ? s.config : JSON.stringify(s.config),
    }))
    dialogMode.value = 'copy'
    copySource.value = {
      steps,
      edges: flow?.edges || '',
    }
    formData.name = row.name + ' (copy)'
    formData.description = row.description || ''
    formData.stepInterval = row.stepInterval || 0
    formData.commMode = row.commMode || 'active'
    formData.templateId = null
    dialogVisible.value = true
  } catch {
    ElMessage.error('Failed to load flow for copy')
  }
}

const handleDelete = (row: Flow) => {
  ElMessageBox.confirm(
    `This will permanently delete flow "${row.name}". Continue?`,
    'Confirm Delete',
    { confirmButtonText: 'Delete', cancelButtonText: 'Cancel', type: 'error', confirmButtonClass: 'el-button--danger' }
  ).then(async () => {
    await flowApi.delete(row.id)
    ElMessage.success('Deleted')
    loadData()
  }).catch(() => { /* cancelled */ })
}

const handleUseTemplate = async (row: FlowTemplate) => {
  try {
    const resp = await flowTemplateApi.getByID(row.id)
    const t = resp.data?.data || resp.data
    if (!t) {
      ElMessage.error('Template not found')
      return
    }
    const steps = JSON.parse(t.steps || '[]')
    const createResp = await flowApi.create({
      name: t.name + ' (from template)',
      description: t.description,
      stepInterval: t.stepInterval || 1000,
      commMode: t.commMode || 'active',
      edges: t.edges || '',
      steps: Array.isArray(steps) ? steps : [{ type: 'send', name: 'Send step', config: '{"sml":""}' }],
    })
    const id = createResp.data?.data?.id
    if (id) {
      router.push(`/flow/${id}/edit`)
    } else {
      activeTab.value = 'flow'
      loadData()
    }
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Create from template failed'
    ElMessage.error(msg)
  }
}

const handleDeleteTemplate = (row: FlowTemplate) => {
  ElMessageBox.confirm(
    `This will permanently delete template "${row.name}". Continue?`,
    'Confirm Delete',
    { confirmButtonText: 'Delete', cancelButtonText: 'Cancel', type: 'error', confirmButtonClass: 'el-button--danger' }
  ).then(async () => {
    await flowTemplateApi.delete(row.id)
    ElMessage.success('Deleted')
    loadTemplates()
  }).catch(() => { /* cancelled */ })
}

onMounted(() => {
  if (currentUser.value && currentUser.value.roleId !== 1) {
    searchForm.userId = currentUser.value.id
  }
  loadData()
  loadUsers()
})
</script>

<style scoped>
.flow-page {
  padding: 4px 4px 16px 4px;
  height: calc(100vh - 85px);
  min-height: 400px;
  box-sizing: border-box;
}

.flow-page :deep(.el-card) { height: 100%; }
.flow-page :deep(.el-card__body) {
  height: 100%;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.flow-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.flow-tabs :deep(.el-tabs__header) {
  margin: 0;
  padding: 0 12px;
  background: #f5f7fa;
  border-bottom: 1px solid #dcdfe6;
  flex-shrink: 0;
}

.flow-tabs :deep(.el-tabs__nav-wrap::after) { height: 1px; }

.flow-tabs :deep(.el-tabs__item) {
  height: 44px;
  line-height: 44px;
  font-size: 14px;
}

.flow-tabs :deep(.el-tabs__content) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.flow-tabs :deep(.el-tab-pane) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  box-sizing: border-box;
  border-bottom: 1px solid #e4e7ed;
  background-color: #fafafa;
  flex-shrink: 0;
}

.search-bar {
  padding: 6px 12px;
  border-bottom: 1px solid #e4e7ed;
  background-color: #fafafa;
  flex-shrink: 0;
}

.search-bar :deep(.el-form-item) { margin-bottom: 6px; }
.search-bar :deep(.el-form-item__label) { font-size: 13px; }

.data-table { flex: 1; min-height: 0; }

.pagination {
  padding: 12px;
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
  border-top: 1px solid #ebeef5;
}

:deep(.el-table .cell) { white-space: nowrap; }
</style>
