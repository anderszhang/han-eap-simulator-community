<template>
  <div class="checklist-page">
    <el-card>
      <div class="toolbar">
        <div class="toolbar-left">
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            Add Checklist
          </el-button>
          <el-button @click="handleOpenGenerateSML">
            <el-icon><DocumentAdd /></el-icon>
            Generate SML
          </el-button>
          <el-button @click="handleDownloadTemplate">
            <el-icon><Download /></el-icon>
            Download Template
          </el-button>
        </div>
        <span class="toolbar-label">Checklist</span>
      </div>

      <div class="search-bar">
        <el-form :model="searchForm" inline>
          <el-form-item label="Name">
            <el-input v-model="searchForm.name" placeholder="Checklist Name" clearable style="width: 140px" @keyup.enter="handleSearch" />
          </el-form-item>
          <el-form-item label="Vendor">
            <el-input v-model="searchForm.vendor" placeholder="Vendor" clearable style="width: 120px" @keyup.enter="handleSearch" />
          </el-form-item>
          <el-form-item label="Model">
            <el-input v-model="searchForm.model" placeholder="Model" clearable style="width: 120px" @keyup.enter="handleSearch" />
          </el-form-item>
          <el-form-item label="User">
            <el-select v-model="searchForm.userId" placeholder="All" clearable filterable style="width: 140px">
              <el-option v-for="u in userOptions" :key="u.id" :label="u.username" :value="u.id" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">
              <el-icon><Search /></el-icon>
              Search
            </el-button>
            <el-button @click="handleReset">
              <el-icon><Refresh /></el-icon>
              Reset
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-table border :data="tableData" style="width: 100%" v-loading="loading" class="data-table">
        <el-table-column type="index" label="#" width="50" />
        <el-table-column prop="name" label="Name" min-width="160">
          <template #default="{ row }">
            <el-link type="primary" @click="handleOpenDetail(row)">{{ row.name }}</el-link>
          </template>
        </el-table-column>
        <el-table-column prop="vendor" label="Vendor" min-width="120" />
        <el-table-column prop="model" label="EQP Model" min-width="120" />
        <el-table-column prop="modelDesc" label="EQP Type" min-width="160" show-overflow-tooltip />
        <el-table-column prop="vidCount" label="VIDs" width="70" align="center" />
        <el-table-column prop="ceidCount" label="CEIDs" width="70" align="center" />
        <el-table-column prop="username" label="Creator" width="100" />
        <el-table-column prop="createTime" label="Created" width="165" />
          <el-table-column label="Actions" width="160" fixed="right" align="center">
          <template #default="{ row }">
            <div class="row-actions">
              <el-button v-if="row.userId === currentUser?.id" text type="primary" @click="handleEdit(row)" title="Edit">
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-button text @click="handleCopy(row)" title="Copy">
                <el-icon><CopyDocument /></el-icon>
              </el-button>
              <el-dropdown trigger="click" @command="(command: string) => handleRowCommand(command, row)">
                 <el-icon>    <MoreFilled /> </el-icon>
                 
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="generate-sml">
                      <el-icon><DocumentAdd /></el-icon>
                      Generate SML
                    </el-dropdown-item>
                    <el-dropdown-item command="export-excel">
                      <el-icon><Download /></el-icon>
                      Export Excel
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
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>
    </el-card>

    <el-dialog
      v-model="smlDialogVisible"
      title="Generate SML Files"
      width="460px"
      :destroy-on-close="true"
    >
      <el-form label-width="120px">
        <el-form-item label="Checklist">
          <el-input :model-value="smlTargetName" readonly />
        </el-form-item>
        <el-form-item label="Source Folder">
          <el-select v-model="smlSourceFolder" filterable placeholder="Select source folder" style="width: 100%">
            <el-option v-for="s in smlRootFolders" :key="s" :label="s" :value="s" />
          </el-select>
        </el-form-item>
        <el-form-item label="Target Folder">
          <el-input v-model="smlFolderName" placeholder="New folder name" maxlength="100" @keyup.enter="handleGenerateSML" />
        </el-form-item>
        <el-form-item label="Node Type">
          <el-tag>HOST</el-tag>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="smlDialogVisible = false">Cancel</el-button>
        <el-button type="primary" @click="handleGenerateSML" :loading="smlGenerating">Generate</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? 'Edit Checklist' : 'Add Checklist'"
      width="520px"
      :destroy-on-close="true"
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="Name" prop="name">
          <el-input v-model="formData.name" placeholder="Checklist name" maxlength="100" />
        </el-form-item>
        <el-form-item label="Vendor" prop="vendor">
          <el-select v-model="formData.vendor" placeholder="Select or type vendor" filterable allow-create default-first-option style="width: 100%" @change="onVendorChange">
            <el-option v-for="v in vendorOptions" :key="v.id" :label="v.name" :value="v.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="EQP Model" prop="model">
          <el-select v-model="formData.model" placeholder="Select or type model" filterable allow-create default-first-option style="width: 100%" @change="onModelChange">
            <el-option v-for="m in modelOptions" :key="m.id" :label="m.name" :value="m.name" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="eqpType" label="EQP Type">
          <span class="eqp-type-text">{{ eqpType }}</span>
        </el-form-item>
        <el-form-item label="Description">
          <el-input v-model="formData.description" type="textarea" :rows="2" placeholder="Description" />
        </el-form-item>
        <el-form-item v-if="!isEdit" label="Excel File">
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :limit="1"
            accept=".xlsx,.xlsm"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
          >
            <el-button><el-icon><Upload /></el-icon> Select File</el-button>
            <template #tip>
              <div class="el-upload__tip">.xlsx / .xlsm file with DynamicReportDefine sheet</div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">Cancel</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">{{ isEdit ? 'Save' : 'Create' }}</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="copyDialogVisible" title="Copy Checklist" width="400px" :destroy-on-close="true">
      <el-form :model="copyForm" label-width="100px">
        <el-form-item label="Name" required>
          <el-input v-model="copyForm.name" placeholder="New checklist name" maxlength="100" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="copyDialogVisible = false">Cancel</el-button>
        <el-button type="primary" @click="handleConfirmCopy" :loading="copyLoading">Copy</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onActivated, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete, Search, Refresh, Download, CopyDocument, Upload, DocumentAdd, MoreFilled } from '@element-plus/icons-vue'
import { checklistApi } from '../api/checklist'
import { vendorApi } from '../api/vendor'
import { smlApi } from '../api/sml'
import { userApi } from '../api/user'
import { useCurrentUser } from '../composables/useCurrentUser'
import { checklistTemplateURL } from '../utils/runtimeConfig'
import type { Checklist, Vendor, EquipmentModel } from '../types'
import type { UploadFile } from 'element-plus'

const router = useRouter()
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const tableData = ref<Checklist[]>([])
const selectedFile = ref<File | null>(null)
const eqpType = ref('')
const smlDialogVisible = ref(false)
const smlFolderName = ref('')
const smlSourceFolder = ref('SML demo')
const smlTargetName = ref('')
const smlGenerating = ref(false)
const smlTargetId = ref<number | null>(null)
const smlRootFolders = ref<string[]>([])
const copyDialogVisible = ref(false)
const copyLoading = ref(false)
const copyForm = ref({ name: '' })
const copySource = ref<Checklist | null>(null)

const { currentUser } = useCurrentUser()
const userOptions = ref<{ id: number; username: string }[]>([])

const loadUsers = async () => {
  try {
    const resp = await userApi.getAll()
    userOptions.value = resp.data?.data || []
  } catch { /* ignore */ }
}

const searchForm = reactive({ name: '', vendor: '', model: '', userId: null as number | null })
const pagination = reactive({ currentPage: 1, pageSize: 10, total: 0 })
const vendorOptions = ref<Vendor[]>([])
const allModels = ref<EquipmentModel[]>([])
const modelOptions = computed(() => {
  if (!formData.vendor) return allModels.value
  const vendor = findVendorByForm()
  if (!vendor) return allModels.value
  return allModels.value.filter(m => m.vendorId === vendor.id)
})

const loadVendorOptions = async () => {
  try {
    const resp = await vendorApi.getAllSimple()
    vendorOptions.value = resp.data?.data || []
  } catch { /* ignore */ }
}

const loadModelOptions = async (vendorId?: number) => {
  try {
    if (vendorId) {
      const resp = await vendorApi.getModels(vendorId)
      allModels.value = resp.data?.data || []
    } else {
      const resp = await vendorApi.getAllModelsSimple()
      allModels.value = resp.data?.data || []
    }
  } catch { /* ignore */ }
}

const onVendorChange = () => {
  formData.model = ''
  eqpType.value = ''
  const vendor = vendorOptions.value.find(v => v.name === formData.vendor)
  formData.vendorId = vendor?.id ?? null
  if (vendor) {
    loadModelOptions(vendor.id)
  }
}

const onModelChange = () => {
  const match = (modelOptions.value as EquipmentModel[]).find(m => m.name === formData.model)
  eqpType.value = match?.description || ''
}

const formData = reactive({
  id: null as number | null,
  name: '',
  vendorId: null as number | null,
  vendor: '',
  model: '',
  description: '',
})

const findVendorByForm = () => {
  if (formData.vendorId) {
    const byId = vendorOptions.value.find(v => v.id === formData.vendorId)
    if (byId) return byId
  }
  return vendorOptions.value.find(v => v.name === formData.vendor)
}

const resolveVendorId = () => {
  return vendorOptions.value.find(v => v.name === formData.vendor)?.id ?? null
}

const formRules = {
  name: [{ required: true, message: 'Name is required', trigger: 'blur' }]
}

const loadData = async () => {
  loading.value = true
  try {
    const params: Record<string, unknown> = {
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      name: searchForm.name || undefined,
      vendor: searchForm.vendor || undefined,
      model: searchForm.model || undefined,
      userId: searchForm.userId ?? undefined,
    }
    const resp = await checklistApi.getAll(params)
    if (resp.data?.data) {
      tableData.value = resp.data.data.data || []
      pagination.total = resp.data.data.total || 0
    }
  } catch {
    ElMessage.error('Failed to load data')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => { pagination.currentPage = 1; loadData() }
const handleReset = () => {
  searchForm.name = ''
  searchForm.vendor = ''
  searchForm.model = ''
  searchForm.userId = null
  pagination.currentPage = 1
  loadData()
}

const handleAdd = () => {
  isEdit.value = false
  formData.id = null
  formData.name = ''
  formData.vendorId = null
  formData.vendor = ''
  formData.model = ''
  formData.description = ''
  eqpType.value = ''
  selectedFile.value = null
  dialogVisible.value = true
}

const handleEdit = (row: Checklist) => {
  isEdit.value = true
  formData.id = row.id
  formData.name = row.name
  formData.vendorId = row.vendorId ?? null
  formData.vendor = row.vendor
  formData.model = row.model
  formData.description = (row as any).description || ''
  eqpType.value = (row as any).modelDesc || ''
  selectedFile.value = null
  const vendor = row.vendorId
    ? vendorOptions.value.find(v => v.id === row.vendorId)
    : vendorOptions.value.find(v => v.name === row.vendor)
  if (vendor) {
    loadModelOptions(vendor.id)
  } else {
    loadModelOptions()
  }
  dialogVisible.value = true
}

const handleOpenDetail = (row: Checklist) => {
  router.push(`/checklist/${row.id}/edit`)
}

const handleCopy = async (row: Checklist) => {
  try {
    const resp = await checklistApi.getByID(row.id)
    const src = resp.data?.data
    copySource.value = src
    copyForm.value.name = src.name + ' (copy)'
    copyDialogVisible.value = true
  } catch {
    ElMessage.error('Failed to load checklist')
  }
}

const handleConfirmCopy = async () => {
  if (!copyForm.value.name.trim()) {
    ElMessage.warning('Please enter a name')
    return
  }
  const src = copySource.value
  if (!src) return
  copyLoading.value = true
  try {
    await checklistApi.create({
      name: copyForm.value.name.trim(),
      vendor: src.vendor,
      model: src.model,
      description: src.description,
    })
    ElMessage.success('Copied')
    copyDialogVisible.value = false
    loadData()
  } catch {
    ElMessage.error('Copy failed')
  } finally {
    copyLoading.value = false
  }
}

const handleDelete = (row: Checklist) => {
  ElMessageBox.confirm(
    `Delete checklist "${row.name}"?`,
    'Confirm Delete',
    { confirmButtonText: 'Delete', cancelButtonText: 'Cancel', type: 'warning' }
  ).then(async () => {
    await checklistApi.delete(row.id)
    ElMessage.success('Deleted')
    loadData()
  }).catch(() => {})
}

const handleRowCommand = (command: string, row: Checklist) => {
  switch (command) {
    case 'generate-sml':
      handleGenerateSMLForRow(row)
      break
    case 'export-excel':
      handleExportExcel(row)
      break
    case 'delete':
      handleDelete(row)
      break
  }
}

const handleFileChange = (file: UploadFile) => {
  selectedFile.value = file.raw || null
}

const handleFileRemove = () => {
  selectedFile.value = null
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    submitting.value = true

    if (isEdit.value && formData.id) {
      await checklistApi.update(formData.id, {
        name: formData.name,
        vendorId: resolveVendorId(),
        vendor: formData.vendor,
        model: formData.model,
        description: formData.description,
      })
      ElMessage.success('Updated')
      dialogVisible.value = false
      loadData()
    } else {
      const resp = await checklistApi.create({
        name: formData.name,
        vendorId: resolveVendorId(),
        vendor: formData.vendor,
        model: formData.model,
        description: formData.description,
      })
      const newId = resp.data?.data?.id

      if (selectedFile.value && newId) {
        try {
          await checklistApi.importExcel(newId, selectedFile.value)
          ElMessage.success('Created with Excel data imported')
        } catch {
          ElMessage.warning('Created but Excel import failed')
        }
      } else {
        ElMessage.success('Created')
      }
      dialogVisible.value = false
      loadData()
    }
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.error || 'Operation failed')
  } finally {
    submitting.value = false
  }
}

const handleDownloadTemplate = () => {
  if (!checklistTemplateURL) {
    ElMessage.warning('No public checklist template is currently available')
    return
  }
  const link = document.createElement('a')
  link.href = checklistTemplateURL
  link.download = 'checklist_template.xlsm'
  link.click()
}

const handleExportExcel = async (row: Checklist) => {
  try {
    const resp = await checklistApi.exportExcel(row.id)
    const blob = new Blob([resp.data], { type: 'application/vnd.ms-excel.sheet.macroEnabled.12' })
    const filename = getDownloadFilename(resp.headers?.['content-disposition']) || `${safeFilename(row.name || 'checklist')}.xlsm`
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    window.URL.revokeObjectURL(url)
    ElMessage.success('Export started')
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.error || 'Export failed')
  }
}

const getDownloadFilename = (contentDisposition?: string) => {
  if (!contentDisposition) return ''
  const encodedMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (encodedMatch?.[1]) {
    try {
      return decodeURIComponent(encodedMatch[1])
    } catch {
      return encodedMatch[1]
    }
  }
  const match = contentDisposition.match(/filename="?([^";]+)"?/i)
  return match?.[1] || ''
}

const safeFilename = (name: string) => name.trim().replace(/[\\/:*?"<>|]/g, '_') || 'checklist'

const handleOpenGenerateSML = () => {
  smlTargetId.value = null
  smlTargetName.value = ''
  smlFolderName.value = ''
  smlSourceFolder.value = 'SML demo'
  loadSMLRootFolders()
  smlDialogVisible.value = true
}

const handleGenerateSMLForRow = (row: Checklist) => {
  smlTargetId.value = row.id
  smlTargetName.value = row.name
  smlFolderName.value = row.name
  smlSourceFolder.value = 'SML demo'
  loadSMLRootFolders()
  smlDialogVisible.value = true
}

const loadSMLRootFolders = async () => {
  try {
    const resp = await smlApi.getTree()
    const data = resp.data?.data || []
    smlRootFolders.value = data
      .filter((n: any) => n.type === 'folder')
      .map((n: any) => n.name)
      .sort()
  } catch { /* ignore */ }
}

const handleGenerateSML = async () => {
  const name = smlFolderName.value.trim()
  if (!name) {
    ElMessage.warning('Folder name is required')
    return
  }
  const id = smlTargetId.value
  if (!id) {
    ElMessage.warning('Please select a checklist')
    return
  }
  smlGenerating.value = true
  const doGenerate = async (force: boolean) => {
    try {
      await checklistApi.generateSML(id, { folderName: name, sourceFolder: smlSourceFolder.value, force })
      smlDialogVisible.value = false
      ElMessageBox.confirm(`SML files generated in "${name}". View in SML page?`, 'Success',
        { confirmButtonText: 'View', cancelButtonText: 'Close', type: 'success' }
      ).then(() => { router.push('/sml') }).catch(() => {})
    } catch (e: any) {
      const msg = e?.response?.data?.error || 'Generate failed'
      if (msg.includes('already exists')) {
        smlGenerating.value = false
        ElMessageBox.confirm(
          `Folder "${name}" already exists. Delete its contents and regenerate?`,
          'Folder Exists',
          { confirmButtonText: 'Overwrite', cancelButtonText: 'Cancel', type: 'warning' }
        ).then(() => doGenerate(true)).catch(() => {})
        return
      }
      ElMessage.error(msg)
    } finally {
      smlGenerating.value = false
    }
  }
  doGenerate(false)
}

const initData = () => {
  if (currentUser.value && currentUser.value.roleId !== 1) {
    searchForm.userId = currentUser.value.id
  }
  loadData()
  loadVendorOptions()
  loadModelOptions()
  loadUsers()
}

onMounted(initData)
onActivated(initData)
</script>

<style scoped>
.checklist-page {
  padding: 4px 4px 16px 4px;
  height: calc(100vh - 85px);
  min-height: 400px;
  box-sizing: border-box;
}

.checklist-page :deep(.el-card) { height: 100%; }
.checklist-page :deep(.el-card__body) {
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

.toolbar-left {
  display: flex;
  gap: 8px;
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

.search-bar :deep(.el-form-item) { margin-bottom: 6px; }
.search-bar :deep(.el-form-item__label) { font-size: 13px; }

.data-table { flex: 1; min-height: 0; }
.data-table :deep(.el-table) { height: 100%; }

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

.eqp-type-text { color: #606266; font-size: 14px; }

:deep(.el-table .cell) { white-space: nowrap; }
</style>
