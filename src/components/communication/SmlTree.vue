<template>
  <div class="sml-section panel-section">
    <div class="section-header">
      <span>SML Files</span>
      <span class="header-actions">
        <el-button size="small" circle :type="showFilter ? 'primary' : ''" @click="toggleFilter" title="Filter">
          <el-icon><Filter /></el-icon>
        </el-button>
        <el-button size="small" circle :type="showSearch ? 'primary' : ''" @click="toggleSearch" title="Search">
          <el-icon><Search /></el-icon>
        </el-button>
        <el-button size="small" circle @click="openAddDialog" title="Add SML">
          <el-icon><Plus /></el-icon>
        </el-button>
        <el-button size="small" circle @click="handleRefresh" title="Refresh">
          <el-icon><Refresh /></el-icon>
        </el-button>
      </span>
    </div>
    <div v-if="showSearch" class="search-bar">
      <el-input
        v-model="searchQuery"
        placeholder="Search files..."
        clearable
        size="small"
        @input="handleSearch"
        ref="searchInputRef"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
    </div>
    <div v-if="showFilter" class="filter-bar">
      <el-select
        :model-value="selectedUserId ?? null"
        placeholder="My Files"
        clearable
        size="small"
        class="user-filter-select"
        @change="handleUserFilterChange"
      >
        <el-option label="All Users" :value="null" />
        <el-option v-for="user in userOptions" :key="user.id" :label="user.username" :value="user.id" />
      </el-select>
      <el-radio-group v-model="nodeTypeFilter" size="small" @change="handleNodeTypeFilterChange">
        <el-radio-button value="">All</el-radio-button>
        <el-radio-button value="EQP">EQP</el-radio-button>
        <el-radio-button value="HOST">HOST</el-radio-button>
      </el-radio-group>
    </div>
    <div class="sml-tree-container" :key="treeKey">
      <el-tree
        ref="treeRef"
        :key="treeKey"
        :data="displayData"
        node-key="id"
        :props="treeProps"
        :expand-on-click-node="false"
        :highlight-current="true"
        :default-expanded-keys="searchExpandedKeys"
        @node-click="handleNodeClick"
        @node-expand="handleNodeExpand"
        @node-collapse="handleNodeCollapse"
      >
        <template #default="{ node, data }">
          <span class="tree-node" @dblclick.stop="handleDblClick(data)">
            <el-icon v-if="data.type === 'folder'"><Folder /></el-icon>
            <el-icon v-else><Document /></el-icon>
            <span class="node-label">{{ node.label }}</span>
            <el-tag v-if="data.isProtected" size="small" type="danger" class="node-type-tag">模板</el-tag>
            <el-tag v-else-if="data.nodeType && !data.parentId" size="small" :type="data.nodeType === 'EQP' ? 'warning' : ''" class="node-type-tag">{{ data.nodeType }}</el-tag>
          </span>
        </template>
      </el-tree>
    </div>

    <el-dialog v-model="addDialogVisible" title="Add SML Node" width="480px" destroy-on-close>
      <el-form :model="addForm" :rules="addFormRules" ref="addFormRef" label-width="80px">
        <el-form-item label="Type" prop="type">
          <el-select v-model="addForm.type" placeholder="Select Type" style="width: 100%" @change="addForm.content = ''">
            <el-option label="Folder" value="folder" />
            <el-option label="SML" value="sml" />
          </el-select>
        </el-form-item>
        <el-form-item label="Parent" prop="parentId">
          <el-tree-select
            v-model="addForm.parentId"
            :data="folderTreeData"
            node-key="id"
            :props="{ children: 'children', label: 'name' }"
            clearable
            placeholder="Root (Optional)"
            style="width: 100%"
            check-strictly
          />
        </el-form-item>
        <el-form-item label="Name" prop="name">
          <el-input v-model="addForm.name" placeholder="Enter name" maxlength="30" show-word-limit clearable />
        </el-form-item>
        <el-form-item v-if="addForm.type === 'sml'" label="Content" prop="content">
          <el-input v-model="addForm.content" type="textarea" :rows="6" placeholder="SML content" />
        </el-form-item>
        <el-form-item v-if="addForm.type === 'folder' && !addForm.parentId" label="Type">
          <el-select v-model="addForm.nodeType" placeholder="Type" clearable style="width: 100%">
            <el-option label="EQP" value="EQP" />
            <el-option label="HOST" value="HOST" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addDialogVisible = false">Cancel</el-button>
        <el-button type="primary" @click="handleAddSubmit" :loading="addSubmitting">Add</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Folder, Document, Search, Plus, Filter } from '@element-plus/icons-vue'
import { smlApi } from '../../api/sml'
import type { SMLNode, SMLNodeRequest } from '../../types'

interface Props {
  treeData: SMLNode[]
  selectedFile: SMLNode | null
  expandedKeys?: number[]
  userOptions?: { id: number; username: string }[]
  selectedUserId?: number | null
}

interface Emits {
  (e: 'node-click', node: SMLNode): void
  (e: 'node-dblclick', node: SMLNode): void
  (e: 'refresh'): void
  (e: 'update:expandedKeys', keys: number[]): void
  (e: 'update:selectedUserId', value: number | null): void
  (e: 'user-change', value: number | null): void
}

const props = withDefaults(defineProps<Props>(), {
  expandedKeys: () => [],
  userOptions: () => [],
  selectedUserId: null
})

const emit = defineEmits<Emits>()

const treeKey = ref(0)
const searchInputRef = ref()

const showSearch = ref(false)
const showFilter = ref(false)
const searchQuery = ref('')
const searchExpandedKeys = ref<number[]>([])
const nodeTypeFilter = ref('')

const addDialogVisible = ref(false)
const addSubmitting = ref(false)
const addFormRef = ref()

const addForm = ref<SMLNodeRequest>({
  type: 'folder',
  name: '',
  parentId: undefined,
  content: ''
})

const addFormRules = {
  type: [{ required: true, message: 'Please select type', trigger: 'change' }],
  name: [
    { required: true, message: 'Please enter name', trigger: 'blur' },
    { min: 1, max: 30, message: 'Name length should be 1 to 30 characters', trigger: 'blur' }
  ]
}

const treeProps = {
  children: 'children',
  label: 'name'
}

const folderTreeData = computed(() => {
  const filterFolders = (nodes: SMLNode[]): SMLNode[] => {
    const result: SMLNode[] = []
    for (const node of nodes) {
      if (node.type === 'folder') {
        result.push({
          ...node,
          children: node.children?.length ? filterFolders(node.children) : []
        })
      }
    }
    return result
  }
  return filterFolders(props.treeData)
})

const displayData = computed(() => {
  let source = props.treeData
  if (nodeTypeFilter.value) {
    source = source.filter(n => n.nodeType === nodeTypeFilter.value)
  }
  if (!searchQuery.value.trim()) {
    searchExpandedKeys.value = [...props.expandedKeys]
    return source
  }
  const query = searchQuery.value.toLowerCase().trim()
  const matches = new Set<number>()
  const parentMap = new Map<number, number>()

  const buildParentMap = (nodes: SMLNode[], parentId?: number) => {
    for (const node of nodes) {
      if (parentId !== undefined) parentMap.set(node.id, parentId)
      if (node.children?.length) buildParentMap(node.children, node.id)
    }
  }
  buildParentMap(props.treeData)

  const findMatches = (nodes: SMLNode[]) => {
    for (const node of nodes) {
      if (node.name.toLowerCase().includes(query)) {
        matches.add(node.id)
        let pid = parentMap.get(node.id)
        while (pid !== undefined) {
          matches.add(pid)
          pid = parentMap.get(pid)
        }
      }
      if (node.children?.length) findMatches(node.children)
    }
  }
  findMatches(source)

  const filter = (nodes: SMLNode[]): SMLNode[] => {
    const result: SMLNode[] = []
    for (const node of nodes) {
      if (matches.has(node.id)) {
        const filtered: SMLNode = { ...node }
        if (node.children?.length) {
          filtered.children = filter(node.children)
        }
        result.push(filtered)
      }
    }
    return result
  }

  const expanded = new Set<number>()
  const collectIds = (nodes: SMLNode[]) => {
    for (const node of nodes) {
      if (node.children?.length) {
        expanded.add(node.id)
        collectIds(node.children)
      }
    }
  }
  const filtered = filter(props.treeData)
  collectIds(filtered)
  searchExpandedKeys.value = [...expanded]

  return filtered
})

const toggleSearch = () => {
  showSearch.value = !showSearch.value
  if (!showSearch.value) {
    searchQuery.value = ''
  } else {
    nextTick(() => {
      searchInputRef.value?.focus()
    })
  }
}

const toggleFilter = () => {
  showFilter.value = !showFilter.value
  if (!showFilter.value) {
    nodeTypeFilter.value = ''
    treeKey.value++
  }
}

const handleSearch = () => {
  // displayData is reactive, auto-updates
}

const handleNodeExpand = (data: SMLNode) => {
  if (!props.expandedKeys.includes(data.id)) {
    emit('update:expandedKeys', [...props.expandedKeys, data.id])
  }
}

const handleNodeCollapse = (data: SMLNode) => {
  emit('update:expandedKeys', props.expandedKeys.filter(k => k !== data.id))
}

const handleNodeClick = (data: SMLNode) => {
  emit('node-click', data)
}

const handleDblClick = (data: SMLNode) => {
  if (data.type === 'sml') {
    emit('node-dblclick', data)
  }
}

const handleRefresh = () => {
  treeKey.value++
  emit('refresh')
}

const openAddDialog = () => {
  addForm.value = {
    type: 'sml',
    name: '',
    parentId: undefined,
    content: '',
    nodeType: ''
  }
  addDialogVisible.value = true
}

const handleNodeTypeFilterChange = () => {
  treeKey.value++
}

const handleUserFilterChange = (value: number | null | '') => {
  const userId = value === '' ? null : value
  emit('update:selectedUserId', userId)
  emit('user-change', userId)
}

const handleAddSubmit = async () => {
  try {
    await addFormRef.value.validate()
  } catch {
    return
  }

  addSubmitting.value = true
  try {
    await smlApi.createNode(addForm.value)
    ElMessage.success('Added successfully')
    addDialogVisible.value = false
    emit('refresh')
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || 'Failed to add')
  } finally {
    addSubmitting.value = false
  }
}

watch(() => props.expandedKeys, (keys) => {
  if (!searchQuery.value.trim()) {
    searchExpandedKeys.value = [...keys]
  }
}, { immediate: true })
</script>

<style scoped>
.sml-section {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background-color: #f5f7fa;
  font-weight: bold;
  border-bottom: 1px solid #dcdfe6;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.search-bar {
  padding: 6px 12px;
  border-bottom: 1px solid #e4e7ed;
  background-color: #fafafa;
}

.filter-bar {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 6px 12px;
  border-bottom: 1px solid #e4e7ed;
  background-color: #fafafa;
}

.user-filter-select {
  width: 120px;
  flex-shrink: 0;
}

.node-type-tag {
  margin-left: 4px;
}

.sml-tree-container {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}

.tree-node .el-icon {
  font-size: 16px;
}

.node-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sml-tree-container {
  scrollbar-width: thin;
  scrollbar-color: #c1c1c1 transparent;
}

.sml-tree-container::-webkit-scrollbar {
  width: 6px;
}

.sml-tree-container::-webkit-scrollbar-track {
  background: transparent;
}

.sml-tree-container::-webkit-scrollbar-thumb {
  background-color: #c1c1c1;
  border-radius: 3px;
}

.sml-tree-container::-webkit-scrollbar-thumb:hover {
  background-color: #a8a8a8;
}
</style>
