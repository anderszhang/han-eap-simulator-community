<template>
  <div class="autoreply-page">
    <el-card>
      <div class="toolbar">
        <el-button type="primary" @click="handleAdd">
          <el-icon><Plus /></el-icon>
          Add AutoReply
        </el-button>
        <span class="toolbar-label">AutoReply</span>
      </div>

      <div class="search-bar">
        <el-form :model="searchForm" inline>
          <el-form-item label="SxFy">
            <el-input v-model="searchForm.sxFy" placeholder="e.g. S6F11" clearable style="width: 140px" />
          </el-form-item>
          <el-form-item label="Engine">
            <el-select v-model="searchForm.engineId" placeholder="All" clearable style="width: 160px">
              <el-option v-for="e in engines" :key="e.id" :label="e.engineName" :value="e.id" />
            </el-select>
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
        <el-table-column prop="sxFy" label="SxFy" width="100" />
        <el-table-column prop="engineName" label="Engine" width="130">
          <template #default="{ row }">
            {{ row.engineName || 'Any' }}
          </template>
        </el-table-column>
        <el-table-column prop="match" label="Match" width="160" show-overflow-tooltip />
        <el-table-column prop="reply" label="Reply Content" min-width="200" show-overflow-tooltip />
        <el-table-column prop="username" label="Creator" width="100" />
        <el-table-column label="Actions" width="200" fixed="right">
          <template #default="{ row }">
            <el-button text @click="handleCopy(row)" title="Copy">
              <el-icon><CopyDocument /></el-icon>
            </el-button>
            <template v-if="row.userId === currentUser?.id">
              <el-button text type="primary" @click="handleEdit(row)" title="Edit">
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-button text type="danger" @click="handleDelete(row)" title="Delete">
                <el-icon><Delete /></el-icon>
              </el-button>
            </template>
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

    <el-drawer
      v-model="dialogVisible"
      :title="isEdit ? 'Edit AutoReply' : 'Add AutoReply'"
      size="560px"
      :destroy-on-close="true"
      @close="handleDialogClose"
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="120px" class="drawer-form">
        <el-form-item label="SxFy" prop="sxFy">
          <el-input v-model="formData.sxFy" placeholder="e.g. S6F11" />
        </el-form-item>

        <el-form-item label="Engine">
          <el-select v-model="formData.engineId" placeholder="All Engines" clearable style="width: 100%">
            <el-option v-for="e in engines" :key="e.id" :label="e.engineName" :value="e.id" />
          </el-select>
        </el-form-item>

        <el-form-item label="Match">
          <div class="match-editor">
            <div v-for="(m, idx) in matchList" :key="idx" class="match-row">
              <el-input v-model="m.path" placeholder="Index path" style="flex: 1" @click="openSmlPicker('match', idx)" />
              <el-tag type="info" class="match-eq-tag">=</el-tag>
              <el-input v-model="m.value" placeholder="Expected value" style="width: 120px" />
              <el-button text type="danger" :icon="Close" @click="removeMatchCondition(idx)" />
            </div>
            <el-button type="primary" link size="small" @click="addMatchCondition" class="add-match-btn">
              <el-icon><Plus /></el-icon> Add Condition
            </el-button>
          </div>
        </el-form-item>

        <el-form-item label="Variables">
          <div class="var-editor">
            <div v-for="(v, idx) in variableList" :key="idx" class="var-row">
              <el-input v-model="v.path" placeholder="Index path" style="flex: 1" @click="openSmlPicker('var', idx)" />
              <el-tag type="info" class="var-arrow-tag">></el-tag>
              <el-input v-model="v.name" placeholder="Name" style="width: 120px" />
              <el-button text type="danger" :icon="Close" @click="removeVariable(idx)" />
            </div>
            <el-button type="primary" link size="small" @click="addVariable" class="add-var-btn">
              <el-icon><Plus /></el-icon> Add Variable
            </el-button>
          </div>
        </el-form-item>

        <el-form-item label="SML Source">
          <el-tree-select
            v-model="formData.smlId"
            :data="smlTreeOptions"
            :props="{ label: 'name', value: 'id', children: 'children' }"
            placeholder="Load from SML Library..."
            check-strictly
            filterable
            clearable
            style="width: 100%"
            @change="handleSmlSelect"
          />
        </el-form-item>

        <el-form-item label="Reply" prop="reply" class="reply-item">
          <div ref="replyEditorRef" class="reply-monaco-container"></div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">Cancel</el-button>
        <el-button type="primary" @click="handleSubmit">Save</el-button>
      </template>
    </el-drawer>

    <SmlPickerDialog
      v-model="smlPickerVisible"
      :initial-path="smlPickerInitialPath"
      :initial-sml-id="smlPickerInitialSmlId"
      :sml-tree="smlTree"
      @confirm="onSmlPickerConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Close, Search, Refresh, CopyDocument } from '@element-plus/icons-vue'
import * as monaco from 'monaco-editor'
import { autoReplyApi } from '../api/autoReply'
import { engineApi } from '../api/engine'
import { smlApi } from '../api/sml'
import { userApi } from '../api/user'
import { useCurrentUser } from '../composables/useCurrentUser'
import SmlPickerDialog from './common/SmlPickerDialog.vue'
import { registerSMLLanguage } from '../utils/smlLanguage'
import type { AutoReply, SMLNode } from '../types'

const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const tableData = ref<AutoReply[]>([])
const engines = ref<any[]>([])
const smlTree = ref<SMLNode[]>([])
const replyEditorRef = ref<HTMLElement>()
let replyEditor: monaco.editor.IStandaloneCodeEditor | null = null
let replyEditorUpdating = false
// ===== Variables Editor =====
interface VarDef { name: string; path: string }
const variableList = ref<VarDef[]>([])
const smlPickerVisible = ref(false)
const smlPickerTargetType = ref<'var' | 'match'>('var')
const smlPickerTargetIndex = ref<number | null>(null)
const smlPickerInitialPath = ref('')
const smlPickerInitialSmlId = ref<number | null>(null)
const lastPickedSmlId = ref<number | null>(null)

async function initReplyEditor() {
  if (replyEditor || !replyEditorRef.value) return
  await nextTick()
  if (!replyEditorRef.value) return
  registerSMLLanguage()
  replyEditor = monaco.editor.create(replyEditorRef.value, {
    value: formData.reply,
    theme: 'sml-light',
    language: 'sml',
    automaticLayout: true,
    fontSize: 13,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    lineNumbers: 'on',
    tabSize: 2,
  })
  replyEditor.onDidChangeModelContent(() => {
    if (!replyEditorUpdating) {
      formData.reply = replyEditor!.getValue()
    }
  })
}

function disposeReplyEditor() {
  if (replyEditor) {
    replyEditor.dispose()
    replyEditor = null
  }
}

watch(() => dialogVisible.value, async (visible) => {
  if (visible) {
    await nextTick()
    await nextTick()
    await initReplyEditor()
  } else {
    disposeReplyEditor()
  }
})

function parseVariables(str: string): VarDef[] {
  if (!str.trim()) return []
  const result: VarDef[] = []
  for (const part of str.split(';')) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const name = trimmed.slice(0, eq).trim()
    const path = trimmed.slice(eq + 1).trim()
    if (name && path) result.push({ name, path })
  }
  return result
}

function serializeVariables(arr: VarDef[]): string {
  return arr.filter(v => v.name.trim() && v.path.trim()).map(v => `${v.name.trim()}=${v.path.trim()}`).join('; ')
}

function addVariable() {
  variableList.value.push({ name: '', path: '' })
}

function removeVariable(idx: number) {
  variableList.value.splice(idx, 1)
}

// ===== Match Editor =====
interface MatchCondition { path: string; value: string }
const matchList = ref<MatchCondition[]>([])

function parseMatch(str: string): MatchCondition[] {
  if (!str.trim()) return []
  const result: MatchCondition[] = []
  for (const part of str.split(';')) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const path = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    if (path && value) result.push({ path, value })
  }
  return result
}

function serializeMatch(arr: MatchCondition[]): string {
  return arr.filter(v => v.path.trim() && v.value.trim()).map(v => `${v.path.trim()}=${v.value.trim()}`).join('; ')
}

function addMatchCondition() {
  matchList.value.push({ path: '', value: '' })
}

function removeMatchCondition(idx: number) {
  matchList.value.splice(idx, 1)
}

function openSmlPicker(type: 'var' | 'match', idx: number) {
  smlPickerTargetType.value = type
  smlPickerTargetIndex.value = idx
  const list = type === 'var' ? variableList.value : matchList.value
  smlPickerInitialPath.value = list[idx]?.path || ''
  smlPickerInitialSmlId.value = lastPickedSmlId.value
  smlPickerVisible.value = true
}

function onSmlPickerConfirm(payload: { indexPath: string; smlId?: number }) {
  const idx = smlPickerTargetIndex.value
  if (idx === null) return
  if (smlPickerTargetType.value === 'var' && variableList.value[idx]) {
    variableList.value[idx].path = payload.indexPath
  } else if (smlPickerTargetType.value === 'match' && matchList.value[idx]) {
    matchList.value[idx].path = payload.indexPath
  }
  if (payload.smlId) {
    lastPickedSmlId.value = payload.smlId
  }
}

const { currentUser } = useCurrentUser()
const userOptions = ref<{ id: number; username: string }[]>([])

const loadUsers = async () => {
  try {
    const resp = await userApi.getAll()
    userOptions.value = resp.data?.data || []
  } catch { /* ignore */ }
}

const searchForm = reactive({ sxFy: '', engineId: null as number | null, userId: null as number | null })
const formData = reactive({
  id: null as number | null,
  sxFy: '',
  match: '',
  engineId: null as number | null,
  variables: '',
  smlId: null as number | null,
  reply: ''
})
const pagination = reactive({ currentPage: 1, pageSize: 10, total: 0 })

watch(() => formData.reply, (val) => {
  if (replyEditor && replyEditor.getValue() !== val) {
    replyEditorUpdating = true
    replyEditor.setValue(val)
    replyEditorUpdating = false
  }
})

const formRules = {
  sxFy: [{ required: true, message: 'SxFy is required', trigger: 'blur' }]
}

const smlTreeOptions = computed(() => {
  const filterChildren = (nodes: SMLNode[]): any[] => {
    return nodes
      .filter(n => n.type === 'folder' || n.type === 'sml')
      .map(n => ({
        id: n.id,
        name: n.name,
        children: n.children ? filterChildren(n.children) : undefined,
        disabled: n.type === 'folder'
      }))
      .filter(n => n.disabled || (n.children && n.children.length > 0) || !n.children)
  }
  const filterTop = (nodes: SMLNode[]): any[] => {
    return nodes
      .filter(n => n.type === 'folder')
      .map(n => ({
        id: n.id,
        name: n.name,
        children: n.children ? filterChildren(n.children) : undefined,
        disabled: false
      }))
      .filter(n => n.children && n.children.length > 0)
  }
  return filterTop(smlTree.value)
})

const loadData = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      sxFy: searchForm.sxFy || undefined,
      engineId: searchForm.engineId ?? undefined,
      userId: searchForm.userId ?? undefined,
    }
    const resp = await autoReplyApi.getAll(params)
    if (resp.data?.data) {
      tableData.value = resp.data.data.data || []
      pagination.total = resp.data.data.total || 0
    }
  } catch (e: any) {
    ElMessage.error('Failed to load data')
  } finally {
    loading.value = false
  }
}

const loadEngines = async () => {
  try {
    const resp = await engineApi.getEngines({ page: 1, pageSize: 100 })
    engines.value = resp.data?.data || []
  } catch {}
}

const loadSmlTree = async () => {
  try {
    const resp = await smlApi.getTree()
    smlTree.value = resp.data?.data || []
  } catch {}
}

const handleSearch = () => { pagination.currentPage = 1; loadData() }
const handleReset = () => {
  searchForm.sxFy = ''
  searchForm.engineId = null
  searchForm.userId = null
  pagination.currentPage = 1
  loadData()
}

const handleCopy = (row: AutoReply) => {
  isEdit.value = false
  formData.id = null
  formData.sxFy = ''
  formData.match = row.match
  matchList.value = parseMatch(row.match)
  formData.engineId = null
  formData.variables = row.variables
  variableList.value = parseVariables(row.variables)
  formData.smlId = row.smlId
  formData.reply = row.reply
  dialogVisible.value = true
}

const handleAdd = () => {
  isEdit.value = false
  formData.id = null
  formData.sxFy = ''
  formData.match = ''
  matchList.value = []
  formData.engineId = null
  formData.variables = ''
  variableList.value = []
  formData.smlId = null
  formData.reply = ''
  dialogVisible.value = true
}

const handleEdit = (row: AutoReply) => {
  isEdit.value = true
  formData.id = row.id
  formData.sxFy = row.sxFy
  formData.match = row.match
  matchList.value = parseMatch(row.match)
  formData.engineId = row.engineId
  formData.variables = row.variables
  variableList.value = parseVariables(row.variables)
  formData.smlId = row.smlId
  formData.reply = row.reply
  dialogVisible.value = true
}

const handleDelete = (row: AutoReply) => {
  ElMessageBox.confirm(
    `This will permanently delete AutoReply "${row.sxFy}". Continue?`,
    'Confirm Delete',
    {
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      type: 'error',
      confirmButtonClass: 'el-button--danger',
    }
  ).then(async () => {
    await autoReplyApi.delete(row.id)
    ElMessage.success('Deleted')
    loadData()
  }).catch(() => {})
}

const handleSmlSelect = async (smlId: number | null) => {
  if (!smlId) return
  try {
    const resp = await autoReplyApi.getSmlContent(smlId)
    const content = resp.data?.data?.content || ''
    if (content) {
      formData.reply = content
    }
  } catch { /* ignore */ }
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    formData.variables = serializeVariables(variableList.value)
    formData.match = serializeMatch(matchList.value)
    const data = {
      sxFy: formData.sxFy,
      match: formData.match,
      engineId: formData.engineId,
      variables: formData.variables,
      smlId: formData.smlId,
      reply: formData.reply
    }
    if (isEdit.value && formData.id) {
      await autoReplyApi.update(formData.id, data)
      ElMessage.success('Updated')
    } else {
      await autoReplyApi.create(data)
      ElMessage.success('Created')
    }
    dialogVisible.value = false
    loadData()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.error || 'Operation failed')
  }
}

const handleDialogClose = () => {
  formRef.value?.resetFields()
  variableList.value = []
  matchList.value = []
  disposeReplyEditor()
}

onMounted(() => {
  if (currentUser.value && currentUser.value.roleId !== 1) {
    searchForm.userId = currentUser.value.id
  }
  loadData()
  loadEngines()
  loadSmlTree()
  loadUsers()
})
</script>

<style scoped>
.autoreply-page {
  padding: 4px 4px 16px 4px;
  height: calc(100vh - 85px);
  min-height: 400px;
  box-sizing: border-box;
}

.autoreply-page :deep(.el-card) {
  height: 100%;
}

.autoreply-page :deep(.el-card__body) {
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

.data-table {
  flex: 1;
  min-height: 0;
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

.var-editor {
  width: 100%;
}

.var-row {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 6px;
}

.add-var-btn {
  margin-top: 2px;
}

.match-editor {
  width: 100%;
}

.match-row {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 6px;
}

.match-eq {
  color: #909399;
  font-weight: bold;
  font-size: 14px;
}

.add-match-btn {
  margin-top: 2px;
}

.match-eq-tag,
.var-arrow-tag {
  flex-shrink: 0;
}

.reply-hint {
  margin-top: 6px;
  font-size: 12px;
  color: #909399;
  display: flex;
  align-items: center;
  gap: 4px;
}

.var-chips {
  margin-top: 8px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

:deep(.el-drawer__body) {
  display: flex;
  flex-direction: column;
  padding: 16px 20px;
}

:deep(.drawer-form) {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

:deep(.drawer-form .el-form-item:not(.reply-item)) {
  flex-shrink: 0;
}

.reply-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  margin-bottom: 0 !important;
}

.reply-item :deep(.el-form-item__content) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.reply-monaco-container {
  width: 100%;
  flex: 1;
  min-height: 0;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
}
</style>
