<template>
  <div class="vendor-model-page" ref="pageLayout">
    <el-card class="layout-card">
      <div class="split-layout">
        <div class="left-panel" :class="{ collapsed: leftCollapsed }" :style="leftCollapsed ? {} : { width: panelWidth + 'px' }">
          <div class="panel-header">
            <span class="panel-title">Vendors</span>
            <div class="header-actions">
              <el-button size="small" circle @click="handleOpenMergeDialog" title="Merge vendors">M</el-button>
              <el-button size="small" circle @click="handleAddVendor" title="Add vendor">
                <el-icon><Plus /></el-icon>
              </el-button>
            </div>
          </div>
          <div class="panel-search">
            <el-input
              v-model="vendorSearch"
              placeholder="Search vendor..."
              clearable
              size="small"
              @input="handleVendorSearch"
              @clear="handleVendorSearchClear"
            >
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
          </div>
          <div ref="panelListRef" class="panel-list" v-loading="vendorLoading">
            <div
              v-for="v in filteredVendors"
              :key="v.id"
              class="list-item"
              :class="{ active: selectedVendor?.id === v.id, flash: flashVendorId === v.id }"
              @click="handleSelectVendor(v)"
            >
              <div class="item-main">
                <span class="item-name" v-html="highlight(v.name)"></span>
                <span v-if="v.englishName" class="item-name-sub" v-html="highlight(v.englishName)"></span>
                <span v-else-if="v.fullName" class="item-name-sub" v-html="highlight(v.fullName)"></span>
                <span v-if="v.country" class="item-tag">{{ v.country }}</span>
              </div>
              <div class="item-actions">
                <span class="item-actions-btns">
                  <el-button size="small" link @click.stop="handleEditVendor(v)" title="Edit">
                    <el-icon><Edit /></el-icon>
                  </el-button>
                  <el-button size="small" link type="danger" @click.stop="handleDeleteVendor(v)" title="Delete">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </span>
                <el-tag size="small" type="info" effect="plain" class="model-count-tag">{{ v.modelCount }}</el-tag>
              </div>
            </div>
            <el-empty v-if="!vendorLoading && filteredVendors.length === 0" description="No vendors" :image-size="60" />
          </div>
        </div>

        <div class="resizer" :class="{ 'resizer-collapsed': leftCollapsed }" @mousedown.left="startResize">
          <div class="resizer-btn" @mousedown.stop @click="leftCollapsed = !leftCollapsed">{{ leftCollapsed ? '›' : '‹' }}</div>
        </div>

        <div class="right-panel">
          <template v-if="selectedVendor">
            <div class="panel-header">
              <span class="panel-title">{{ selectedVendor.name }} — EQP Models</span>
              <div class="header-actions">
                <el-button size="small" circle @click="handleEditVendor(selectedVendor)" title="Edit vendor">
                  <el-icon><Edit /></el-icon>
                </el-button>
                <el-button size="small" circle @click="handleAddModel" title="Add EQP Model">
                  <el-icon><Plus /></el-icon>
                </el-button>
              </div>
            </div>

            <div class="vendor-info">
              <el-descriptions :column="2" size="small" border>
                <el-descriptions-item label="English Name">{{ selectedVendor.englishName || '-' }}</el-descriptions-item>
                <el-descriptions-item label="Full Name">{{ selectedVendor.fullName || '-' }}</el-descriptions-item>
                <el-descriptions-item label="Country">{{ selectedVendor.country || '-' }}</el-descriptions-item>
                <el-descriptions-item label="Website">
                  <a v-if="selectedVendor.website" :href="selectedVendor.website" target="_blank">{{ selectedVendor.website }}</a>
                  <span v-else>-</span>
                </el-descriptions-item>
                <el-descriptions-item label="Description" :span="2">{{ selectedVendor.description || '-' }}</el-descriptions-item>
              </el-descriptions>
            </div>

            <div class="model-filters">
              <el-input v-model="modelSearchName" placeholder="Filter EQP Model" clearable size="small" class="model-filter-item" />
              <el-select v-model="modelSearchCategory" placeholder="All categories" clearable filterable allow-create default-first-option size="small" class="model-filter-item">
                <el-option v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
              </el-select>
            </div>

            <el-table border :data="filteredModels" style="width: 100%" v-loading="modelLoading" class="data-table" size="small">
              <el-table-column prop="name" label="EQP Model" min-width="140" />
              <el-table-column prop="category" label="Category" width="100" />
              <el-table-column prop="description" label="Description" min-width="160" show-overflow-tooltip />
              <el-table-column prop="createTime" label="Created" min-width="165" />
              <el-table-column label="Actions" min-width="120" fixed="right" align="center">
                <template #default="{ row }">
                  <div class="row-actions">
                    <el-button text type="primary" @click="handleEditModel(row)" title="Edit EQP Model">
                      <el-icon><Edit /></el-icon>
                    </el-button>
                    <el-button text type="danger" @click="handleDeleteModel(row)" title="Delete">
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </template>
          <template v-else>
            <div class="empty-state">
              <el-empty description="Select a vendor on the left, or create a new vendor." :image-size="80" />
            </div>
          </template>
        </div>
      </div>
    </el-card>

    <el-dialog v-model="vendorDialogVisible" :title="isEditVendor ? 'Edit Vendor' : 'Add Vendor'" width="480px" :destroy-on-close="true">
      <el-form ref="vendorFormRef" :model="vendorForm" :rules="vendorRules" label-width="90px">
        <el-form-item label="Name" prop="name">
          <el-input v-model="vendorForm.name" placeholder="Vendor name" maxlength="100" />
        </el-form-item>
        <el-form-item label="English" prop="englishName">
          <el-input v-model="vendorForm.englishName" placeholder="English short name" maxlength="100" />
        </el-form-item>
        <el-form-item label="Full Name" prop="fullName">
          <el-input v-model="vendorForm.fullName" placeholder="Company full legal name" maxlength="200" />
        </el-form-item>
        <el-form-item label="Country" prop="country">
          <el-input v-model="vendorForm.country" placeholder="e.g. Japan, USA" />
        </el-form-item>
        <el-form-item label="Website" prop="website">
          <el-input v-model="vendorForm.website" placeholder="https://..." />
        </el-form-item>
        <el-form-item label="Description">
          <el-input v-model="vendorForm.description" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="vendorDialogVisible = false">Cancel</el-button>
        <el-button type="primary" @click="handleSubmitVendor" :loading="submitting">{{ isEditVendor ? 'Save' : 'Create' }}</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="modelDialogVisible" :title="isEditModel ? 'Edit EQP Model' : 'Add EQP Model'" width="480px" :destroy-on-close="true">
      <el-form ref="modelFormRef" :model="modelForm" :rules="modelRules" label-width="120px">
        <el-form-item label="Vendor" prop="vendorId">
          <el-select v-model="modelForm.vendorId" placeholder="Select vendor" filterable style="width: 100%">
            <el-option v-for="v in vendors" :key="v.id" :label="v.name" :value="v.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="EQP Model" prop="name">
          <el-input v-model="modelForm.name" placeholder="EQP Model" maxlength="100" />
        </el-form-item>
        <el-form-item label="Category" prop="category">
          <el-select v-model="modelForm.category" placeholder="Select or type category" filterable allow-create default-first-option style="width: 100%">
            <el-option v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
          </el-select>
        </el-form-item>
        <el-form-item label="Description">
          <el-input v-model="modelForm.description" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="modelDialogVisible = false">Cancel</el-button>
        <el-button type="primary" @click="handleSubmitModel" :loading="submitting">{{ isEditModel ? 'Save' : 'Create' }}</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="mergeDialogVisible" title="Merge Vendors" width="520px" :destroy-on-close="true">
      <el-form :model="mergeForm" label-width="120px">
        <el-form-item label="Source Vendor">
          <el-select v-model="mergeForm.sourceVendorId" filterable placeholder="Select source vendor" style="width: 100%">
            <el-option v-for="v in vendors" :key="v.id" :label="v.name" :value="v.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="Target Vendor">
          <el-select v-model="mergeForm.targetVendorId" filterable placeholder="Select target vendor" style="width: 100%">
            <el-option v-for="v in mergeTargetOptions" :key="v.id" :label="v.name" :value="v.id" />
          </el-select>
        </el-form-item>
      </el-form>

      <el-alert
        v-if="mergeSourceVendor"
        type="warning"
        :closable="false"
        :title="`Source vendor will be removed. ${mergeSourceVendor.modelCount} model(s) will be migrated.`"
      />
      <div v-if="mergeTargetVendor" class="merge-note">
        Target vendor: <b>{{ mergeTargetVendor.name }}</b>
      </div>

      <div v-if="mergePreview" class="merge-preview">
        <div class="merge-preview-summary">
          <el-tag type="info">Move: {{ mergePreview.movedModels }}</el-tag>
          <el-tag :type="mergePreview.renamedModels > 0 ? 'warning' : 'success'">Renamed: {{ mergePreview.renamedModels }}</el-tag>
        </div>
        <el-table border v-if="mergePreview.renamedItems.length > 0" :data="mergePreview.renamedItems" size="small" max-height="200">
          <el-table-column prop="oldName" label="Original Name" min-width="180" />
          <el-table-column prop="newName" label="Merged Name" min-width="220" />
        </el-table>
      </div>

      <template #footer>
        <el-button @click="mergeDialogVisible = false">Cancel</el-button>
        <el-button :loading="mergePreviewLoading" @click="handlePreviewMerge">Preview</el-button>
        <el-button type="primary" :disabled="!canSubmitMerge" :loading="mergeSubmitting" @click="handleSubmitMerge">Merge</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete, Search } from '@element-plus/icons-vue'
import { vendorApi } from '../api/vendor'
import type { Vendor, EquipmentModel, VendorMergePreviewResult } from '../types'

const categories = ref<string[]>(['量测', '检测', '光刻', '刻蚀', '薄膜', '离子注入', 'CMP', '清洗', '其他'])

const pageLayout = ref<HTMLElement>()
const panelListRef = ref<HTMLElement>()
const panelWidth = ref(320)
const panelWidthKey = 'vendor-model-panel-width'
const PANEL_MIN = 200
let isResizing = false
let startX = 0
let startWidth = 0
let flashTimer: number | null = null
const leftCollapsed = ref(false)

const vendors = ref<Vendor[]>([])
const models = ref<EquipmentModel[]>([])
const selectedVendor = ref<Vendor | null>(null)
const flashVendorId = ref<number | null>(null)
const vendorSearch = ref('')
const modelSearchName = ref('')
const modelSearchCategory = ref('')
const vendorLoading = ref(false)
const modelLoading = ref(false)
const submitting = ref(false)

const vendorDialogVisible = ref(false)
const modelDialogVisible = ref(false)
const mergeDialogVisible = ref(false)
const mergeSubmitting = ref(false)
const mergePreviewLoading = ref(false)
const mergePreview = ref<VendorMergePreviewResult | null>(null)
const isEditVendor = ref(false)
const isEditModel = ref(false)
const vendorFormRef = ref()
const modelFormRef = ref()

const vendorForm = reactive({
  id: null as number | null,
  name: '',
  englishName: '',
  fullName: '',
  country: '',
  website: '',
  description: '',
})

const modelForm = reactive({
  id: null as number | null,
  vendorId: null as number | null,
  name: '',
  category: '',
  description: '',
})

const mergeForm = reactive({
  sourceVendorId: null as number | null,
  targetVendorId: null as number | null,
})

const vendorRules = {
  name: [{ required: true, message: 'EQP Model is required', trigger: 'blur' }],
  englishName: [{ pattern: /^[A-Za-z0-9 .,&()\-_/]*$/, message: 'English name supports letters/numbers/common symbols', trigger: 'blur' }],
  website: [{ pattern: /^$|^https?:\/\/\S+$/i, message: 'Website must start with http:// or https://', trigger: 'blur' }],
}

const modelRules = {
  vendorId: [{ required: true, message: 'Vendor is required', trigger: 'change' }],
  name: [{ required: true, message: 'Name is required', trigger: 'blur' }],
  category: [{ required: true, message: 'Category is required', trigger: 'change' }],
}

const filteredVendors = computed(() => {
  if (!vendorSearch.value) return vendors.value
  const q = vendorSearch.value.toLowerCase()
  return vendors.value.filter(v =>
    v.name.toLowerCase().includes(q) ||
    (v.englishName && v.englishName.toLowerCase().includes(q)) ||
    (v.fullName && v.fullName.toLowerCase().includes(q)) ||
    (v.country && v.country.toLowerCase().includes(q))
  )
})

const filteredModels = computed(() => {
  const nameQ = modelSearchName.value.trim().toLowerCase()
  const catQ = modelSearchCategory.value
  return models.value.filter(m => {
    const nameOk = !nameQ || m.name.toLowerCase().includes(nameQ)
    const catOk = !catQ || m.category === catQ
    return nameOk && catOk
  })
})

const mergeTargetOptions = computed(() => {
  if (!mergeForm.sourceVendorId) return vendors.value
  return vendors.value.filter(v => v.id !== mergeForm.sourceVendorId)
})
const mergeSourceVendor = computed(() => vendors.value.find(v => v.id === mergeForm.sourceVendorId) || null)
const mergeTargetVendor = computed(() => vendors.value.find(v => v.id === mergeForm.targetVendorId) || null)
const mergePreviewMatched = computed(() =>
  !!mergePreview.value &&
  mergePreview.value.sourceVendorId === mergeForm.sourceVendorId &&
  mergePreview.value.targetVendorId === mergeForm.targetVendorId
)
const canSubmitMerge = computed(() => !!mergePreviewMatched.value && !mergeSubmitting.value)

const sanitizeSpaces = (value: string) => value.replace(/\s+/g, ' ').trim()
const escapeHtml = (text: string) => text
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const highlight = (raw: string) => {
  const safe = escapeHtml(raw || '')
  const q = sanitizeSpaces(vendorSearch.value)
  if (!q) return safe
  const re = new RegExp(`(${escapeRegExp(escapeHtml(q))})`, 'ig')
  return safe.replace(re, '<mark>$1</mark>')
}

const flashVendor = (id: number) => {
  flashVendorId.value = id
  if (flashTimer) window.clearTimeout(flashTimer)
  flashTimer = window.setTimeout(() => {
    flashVendorId.value = null
  }, 1600)
}

const loadVendors = async () => {
  vendorLoading.value = true
  const selectedID = selectedVendor.value?.id
  const currentScrollTop = panelListRef.value?.scrollTop ?? 0
  try {
    const resp = await vendorApi.getAll({ pageSize: 999 })
    vendors.value = resp.data?.data?.data || []
    if (selectedID) {
      const found = vendors.value.find(v => v.id === selectedID)
      selectedVendor.value = found || null
    }
    // Auto-select first vendor on initial load
    if (!selectedVendor.value && vendors.value.length > 0) {
      handleSelectVendor(vendors.value[0])
    }
    await nextTick()
    if (panelListRef.value) panelListRef.value.scrollTop = currentScrollTop
  } catch {
    ElMessage.error('Failed to load vendors')
  } finally {
    vendorLoading.value = false
  }
}

const loadModels = async (vendorId: number) => {
  modelLoading.value = true
  try {
    const resp = await vendorApi.getModels(vendorId)
    models.value = resp.data?.data || []
  } catch {
    ElMessage.error('Failed to load models')
  } finally {
    modelLoading.value = false
  }
}

const handleSelectVendor = (v: Vendor) => {
  selectedVendor.value = v
  loadModels(v.id)
}

const handleVendorSearch = () => {}
const handleVendorSearchClear = () => {
  vendorSearch.value = ''
}

const handleAddVendor = () => {
  isEditVendor.value = false
  vendorForm.id = null
  vendorForm.name = ''
  vendorForm.englishName = ''
  vendorForm.fullName = ''
  vendorForm.country = ''
  vendorForm.website = ''
  vendorForm.description = ''
  vendorDialogVisible.value = true
}

const handleOpenMergeDialog = () => {
  mergeForm.sourceVendorId = selectedVendor.value?.id || (vendors.value[0]?.id ?? null)
  mergeForm.targetVendorId = null
  mergePreview.value = null
  mergeDialogVisible.value = true
}

const handleEditVendor = (row: Vendor) => {
  isEditVendor.value = true
  vendorForm.id = row.id
  vendorForm.name = row.name
  vendorForm.englishName = row.englishName
  vendorForm.fullName = row.fullName
  vendorForm.country = row.country
  vendorForm.website = row.website
  vendorForm.description = row.description
  vendorDialogVisible.value = true
}

const handleSubmitVendor = async () => {
  try {
    await vendorFormRef.value.validate()
    submitting.value = true
    const payload = {
      name: sanitizeSpaces(vendorForm.name),
      englishName: sanitizeSpaces(vendorForm.englishName),
      fullName: sanitizeSpaces(vendorForm.fullName),
      country: sanitizeSpaces(vendorForm.country),
      website: vendorForm.website.trim(),
      description: vendorForm.description.trim(),
    }
    if (isEditVendor.value && vendorForm.id) {
      await vendorApi.update(vendorForm.id, payload)
      ElMessage.success('Updated')
      flashVendor(vendorForm.id)
    } else {
      const resp = await vendorApi.create(payload)
      const newID = Number(resp?.data?.data?.id || 0)
      ElMessage.success('Created')
      if (newID > 0) flashVendor(newID)
    }
    vendorDialogVisible.value = false
    await loadVendors()
    if (selectedVendor.value && isEditVendor.value) {
      const updated = vendors.value.find(v => v.id === selectedVendor.value!.id)
      if (updated) selectedVendor.value = updated
    }
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.error || 'Operation failed')
  } finally {
    submitting.value = false
  }
}

const handleDeleteVendor = (row: Vendor) => {
  if (row.modelCount > 0) {
    ElMessage.warning(`Cannot delete vendor "${row.name}" because ${row.modelCount} model(s) are associated.`)
    return
  }
  ElMessageBox.confirm(
    `Delete vendor "${row.name}"?`,
    'Confirm Delete',
    { confirmButtonText: 'Delete', cancelButtonText: 'Cancel', type: 'warning' }
  ).then(async () => {
    await vendorApi.delete(row.id)
    ElMessage.success('Deleted')
    if (selectedVendor.value?.id === row.id) {
      selectedVendor.value = null
      models.value = []
    }
    await loadVendors()
  }).catch(() => {})
}

const handleSubmitMerge = async () => {
  if (!mergeForm.sourceVendorId || !mergeForm.targetVendorId) {
    ElMessage.warning('Please select both source and target vendors')
    return
  }
  if (mergeForm.sourceVendorId === mergeForm.targetVendorId) {
    ElMessage.warning('Source and target vendors cannot be the same')
    return
  }
  if (!mergePreviewMatched.value) {
    ElMessage.warning('Please preview merge result before submitting')
    return
  }

  mergeSubmitting.value = true
  try {
    const resp = await vendorApi.merge({
      sourceVendorId: mergeForm.sourceVendorId,
      targetVendorId: mergeForm.targetVendorId,
    })
    const result = resp?.data?.data
    const moved = Number(result?.movedModels || 0)
    const renamed = Number(result?.renamedModels || 0)
    ElMessage.success(`Merged successfully. ${moved} model(s) moved, ${renamed} renamed.`)

    mergeDialogVisible.value = false
    mergePreview.value = null
    await loadVendors()
    const target = vendors.value.find(v => v.id === mergeForm.targetVendorId)
    if (target) {
      selectedVendor.value = target
      await loadModels(target.id)
      flashVendor(target.id)
    } else {
      selectedVendor.value = null
      models.value = []
    }
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.error || 'Merge failed')
  } finally {
    mergeSubmitting.value = false
  }
}

const handlePreviewMerge = async () => {
  if (!mergeForm.sourceVendorId || !mergeForm.targetVendorId) {
    ElMessage.warning('Please select both source and target vendors')
    return
  }
  if (mergeForm.sourceVendorId === mergeForm.targetVendorId) {
    ElMessage.warning('Source and target vendors cannot be the same')
    return
  }
  mergePreviewLoading.value = true
  try {
    const resp = await vendorApi.mergePreview({
      sourceVendorId: mergeForm.sourceVendorId,
      targetVendorId: mergeForm.targetVendorId,
    })
    mergePreview.value = resp?.data?.data || null
  } catch (e: any) {
    mergePreview.value = null
    ElMessage.error(e?.response?.data?.error || 'Preview failed')
  } finally {
    mergePreviewLoading.value = false
  }
}

watch(
  () => [mergeForm.sourceVendorId, mergeForm.targetVendorId],
  () => {
    mergePreview.value = null
  }
)

const handleAddModel = () => {
  isEditModel.value = false
  modelForm.id = null
  modelForm.vendorId = selectedVendor.value?.id || null
  modelForm.name = ''
  modelForm.category = ''
  modelForm.description = ''
  modelDialogVisible.value = true
}

const handleEditModel = (row: EquipmentModel) => {
  isEditModel.value = true
  modelForm.id = row.id
  modelForm.vendorId = row.vendorId
  modelForm.name = row.name
  modelForm.category = row.category
  modelForm.description = row.description
  modelDialogVisible.value = true
}

const handleSubmitModel = async () => {
  try {
    await modelFormRef.value.validate()
    submitting.value = true
    if (isEditModel.value && modelForm.id) {
      await vendorApi.updateModel(modelForm.id, {
        vendorId: modelForm.vendorId,
        name: modelForm.name,
        category: modelForm.category,
        description: modelForm.description,
      })
      ElMessage.success('Updated')
    } else {
      await vendorApi.createModel({
        vendorId: modelForm.vendorId,
        name: modelForm.name,
        category: modelForm.category,
        description: modelForm.description,
      })
      ElMessage.success('Created')
    }
    modelDialogVisible.value = false
    if (selectedVendor.value) {
      await loadModels(selectedVendor.value.id)
      await loadVendors()
      const updated = vendors.value.find(v => v.id === selectedVendor.value!.id)
      if (updated) selectedVendor.value = updated
    }
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.error || 'Operation failed')
  } finally {
    submitting.value = false
  }
}

const handleDeleteModel = (row: EquipmentModel) => {
  ElMessageBox.confirm(
    `Delete model "${row.name}"?`,
    'Confirm Delete',
    { confirmButtonText: 'Delete', cancelButtonText: 'Cancel', type: 'warning' }
  ).then(async () => {
    await vendorApi.deleteModel(row.id)
    ElMessage.success('Deleted')
    if (selectedVendor.value) {
      await loadModels(selectedVendor.value.id)
      await loadVendors()
      const updated = vendors.value.find(v => v.id === selectedVendor.value!.id)
      if (updated) selectedVendor.value = updated
    }
  }).catch(() => {})
}

const startResize = (e: MouseEvent) => {
  if (leftCollapsed.value) return
  isResizing = true
  startX = e.clientX
  startWidth = panelWidth.value
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

const onResize = (e: MouseEvent) => {
  if (!isResizing) return
  const layoutEl = pageLayout.value
  if (!layoutEl) return
  const maxWidth = Math.floor(layoutEl.clientWidth * 0.5)
  const newWidth = Math.max(PANEL_MIN, Math.min(maxWidth, startWidth + (e.clientX - startX)))
  panelWidth.value = newWidth
}

const stopResize = () => {
  isResizing = false
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  window.localStorage.setItem(panelWidthKey, String(panelWidth.value))
}

const loadCategories = async () => {
  try {
    const resp = await vendorApi.getCategories()
    const data = resp.data?.data || []
    const merged = new Set([...categories.value, ...data])
    categories.value = Array.from(merged).sort()
  } catch { /* ignore */ }
}

onMounted(() => {
  const savedWidth = Number(window.localStorage.getItem(panelWidthKey) || 0)
  if (savedWidth > PANEL_MIN) panelWidth.value = savedWidth
  loadVendors()
  loadCategories()
})

onUnmounted(() => {
  if (flashTimer) window.clearTimeout(flashTimer)
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
})
</script>

<style scoped>
.vendor-model-page {
  padding: 4px 4px 16px 4px;
  height: calc(100vh - 85px);
  min-height: 400px;
  box-sizing: border-box;
}

.vendor-model-page :deep(.el-card) { height: 100%; }
.vendor-model-page :deep(.el-card__body) {
  height: 100%;
  padding: 0;
  overflow: hidden;
}

.split-layout {
  display: flex;
  height: 100%;
}

.left-panel {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  border-right: none;
  height: 100%;
  transition: width 0.2s ease;
}
.left-panel.collapsed {
  width: 0 !important;
  overflow: hidden;
  min-width: 0;
}

.resizer {
  width: 6px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: col-resize;
  background-color: #f5f7fa;
  transition: background-color 0.15s;
}

.resizer:hover {
  background-color: #dcdfe6;
}

.resizer.resizer-collapsed {
  cursor: default;
}

.resizer.resizer-collapsed:hover {
  background-color: #f5f7fa;
}

.resizer-btn {
  position: relative;
  z-index: 2;
  width: 14px;
  height: 32px;
  border-radius: 3px;
  background: #dcdfe6;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
  color: #909399;
  transition: background-color 0.15s, color 0.15s;
  user-select: none;
}

.resizer-btn:hover {
  background: #409eff;
  color: #fff;
}

.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 12px;
  height: 44px;
  box-sizing: border-box;
  border-bottom: 1px solid #dcdfe6;
  background-color: #f5f7fa;
  flex-shrink: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.header-actions :deep(.el-button.is-circle) {
  --el-button-bg-color: #f5f5f5;
  --el-button-border-color: #d5d5d5;
  --el-button-hover-bg-color: #e8e8e8;
  --el-button-hover-border-color: #c0c0c0;
  --el-button-hover-text-color: #333;
  color: #606266;
}

.panel-title {
  font-weight: 500;
  font-size: 15px;
  color: #303133;
}

.panel-search {
  padding: 8px 12px;
  border-bottom: 1px solid #ebeef5;
  flex-shrink: 0;
}

.panel-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.15s;
  border-bottom: 1px solid #f0f2f5;
}

.list-item:hover {
  background-color: #f5f7fa;
}

.list-item.active {
  background-color: #ecf5ff;
  border-left: 3px solid #409EFF;
  padding-left: 9px;
  box-shadow: inset 0 0 0 1px rgba(64, 158, 255, 0.12);
}

.item-main {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  min-width: 0;
}

.item-name {
  font-size: 13px;
  color: #303133;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-name-sub {
  font-size: 11px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.item-tag {
  font-size: 11px;
  color: #909399;
  background-color: #f0f2f5;
  padding: 1px 6px;
  border-radius: 3px;
  flex-shrink: 0;
}

.item-count {
  font-size: 11px;
  color: #909399;
  flex-shrink: 0;
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.item-actions-btns {
  display: flex;
  align-items: center;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s;
}

.list-item:hover .item-actions-btns {
  opacity: 1;
}

.model-count-tag {
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  border-radius: 999px;
  min-width: 22px;
  text-align: center;
  padding: 0 5px;
  height: 18px;
  line-height: 18px;
  font-size: 10px;
}

.item-actions-btns {
  display: flex;
  align-items: center;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s;
}

.list-item:hover .item-actions-btns {
  opacity: 1;
}

.list-item.flash {
  animation: vendorFlash 1.6s ease;
}

.vendor-info {
  padding: 8px 12px;
  border-bottom: 1px solid #ebeef5;
  flex-shrink: 0;
}

.model-filters {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #ebeef5;
  flex-shrink: 0;
}

.model-filter-item {
  width: 220px;
  max-width: 48%;
}

.merge-note {
  margin-top: 10px;
  color: #606266;
  font-size: 12px;
}

.merge-preview {
  margin-top: 10px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 8px;
}

.merge-preview-summary {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.data-table {
  flex: 1;
  min-height: 0;
  padding: 0 12px;
}
.data-table :deep(.el-table) { height: 100%; }

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
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

:deep(.el-table .cell) { white-space: nowrap; }
:deep(mark) {
  background-color: #fde68a;
  color: inherit;
  padding: 0 1px;
}

@keyframes vendorFlash {
  0% { background-color: #fff8d8; }
  100% { background-color: transparent; }
}
</style>
