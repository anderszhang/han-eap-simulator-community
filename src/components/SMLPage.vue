<template>
  <div class="sml-page">
    <el-card>
      <div class="sml-layout" ref="layoutRef">
        <div class="left-panel" :style="{ width: leftWidth + 'px' }">
          <div class="panel-header">
            <span>SML Explorer</span>
            <span class="header-actions">
              <el-button size="small" circle @click="loadTree" title="Refresh">
                <el-icon><Refresh /></el-icon>
              </el-button>
              <el-button size="small" circle :type="showSearch ? 'primary' : ''" @click="toggleSearch" title="Search">
                <el-icon><Search /></el-icon>
              </el-button>
              <el-button size="small" circle @click="startCreateInContext('folder')" title="Add Folder">
                <el-icon><FolderAdd /></el-icon>
              </el-button>
              <el-button size="small" circle @click="startCreateInContext('sml')" title="Add SML">
                <el-icon><Plus /></el-icon>
              </el-button>
              <el-button size="small" circle @click="toggleExpand" :title="allExpanded ? 'Collapse All' : 'Expand All'">
                <el-icon><ArrowUp v-if="allExpanded" /><ArrowDown v-else /></el-icon>
              </el-button>
            </span>
          </div>
          <div v-if="showSearch" class="search-bar">
            <el-input
              v-model="searchQuery"
              placeholder="Search files..."
              clearable
              size="small"
              ref="searchInputRef"
            >
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
          </div>
          <div class="filter-bar">
            <el-select v-model="selectedUserId" placeholder="My Files" clearable size="small" style="width: 120px; flex-shrink: 0;" @change="loadTree">
              <el-option label="All Users" :value="null" />
              <el-option v-for="u in userOptions" :key="u.id" :label="u.username" :value="u.id" />
            </el-select>
            <el-radio-group v-model="nodeTypeFilter" size="small" @change="onFilterChange">
              <el-radio-button value="">All</el-radio-button>
              <el-radio-button value="EQP">EQP</el-radio-button>
              <el-radio-button value="HOST">HOST</el-radio-button>
            </el-radio-group>
          </div>
          <div class="tree-container" @contextmenu.prevent="onTreeContextMenu">
            <el-tree
              ref="treeRef"
              :data="displayData"
              node-key="id"
              :props="treeProps"
              :default-expanded-keys="expandedKeys"
              :expand-on-click-node="false"
              :highlight-current="true"
              @node-click="handleNodeClick"
              @node-expand="handleNodeExpand"
              @node-collapse="handleNodeCollapse"
              @node-contextmenu="onNodeContextMenu"
            >
              <template #default="{ node, data }">
                <span class="tree-node" @dblclick.stop="handleDblClick(data)">
                  <el-icon v-if="data.type === 'folder'"><Folder /></el-icon>
                  <el-icon v-else><Document /></el-icon>
                  <template v-if="renamingNodeId === data.id">
                    <input
                      ref="renameInputRef"
                      v-model="renamingName"
                      class="rename-input"
                      @keydown.enter="confirmRename"
                      @keydown.escape="cancelRename"
                      @blur="confirmRename"
                      @click.stop
                    />
                  </template>
                  <template v-else>
                    <span class="node-label">{{ node.label }}</span>
                    <el-tag v-if="data.isProtected" size="small" type="danger" class="node-type-tag">模板</el-tag>
                    <el-tag v-else-if="data.nodeType && !data.parentId" size="small" :type="data.nodeType === 'EQP' ? 'warning' : ''" class="node-type-tag">{{ data.nodeType }}</el-tag>
                    <el-tag v-if="data.type === 'folder' && data.username" size="small" type="info" class="node-creator-tag">{{ data.username }}</el-tag>
                  </template>
                  <span class="node-actions">
                    <el-dropdown trigger="click" @command="(cmd: string) => onNodeAction(cmd, data)" @click.stop>
                      <el-button size="small" link @click.stop>
                        <el-icon><MoreFilled /></el-icon>
                      </el-button>
                      <template #dropdown>
                        <el-dropdown-menu>
                          <el-dropdown-item command="addFolder">
                            <el-icon><FolderAdd /></el-icon> Add Folder
                          </el-dropdown-item>
                          <el-dropdown-item command="addSml">
                            <el-icon><DocumentAdd /></el-icon> Add SML
                          </el-dropdown-item>
                          <el-dropdown-item v-if="data.userId === currentUser?.id" command="rename" divided>
                            <el-icon><Edit /></el-icon> Rename
                          </el-dropdown-item>
                          <el-dropdown-item command="copy">
                            <el-icon><CopyDocument /></el-icon> Copy
                          </el-dropdown-item>
                          <el-dropdown-item v-if="data.type === 'folder'" command="download" divided>
                            <el-icon><Download /></el-icon> Download
                          </el-dropdown-item>
                          <el-dropdown-item v-if="!data.template && !data.isProtected && data.userId === currentUser?.id" command="delete" divided>
                            <el-icon><Delete /></el-icon> Delete
                          </el-dropdown-item>
                        </el-dropdown-menu>
                      </template>
                    </el-dropdown>
                  </span>
                </span>
              </template>
            </el-tree>
          </div>
        </div>

        <div class="resizer" @mousedown.left="onResizerDown">
          <div class="resizer-handle"></div>
        </div>

        <div class="right-panel">
          <div v-show="mode === 'idle'" class="editor-placeholder">
            <el-empty description="Select a node to edit, or click + to create" />
          </div>
          <div v-show="mode !== 'idle'" class="editor-content">
            <div class="toolbar">
              <el-tag :type="formData.type === 'folder' ? 'warning' : 'success'" disable-transitions>
                {{ formData.type === 'folder' ? 'Folder' : 'SML' }}
              </el-tag>
              <el-input
                v-model="formData.name"
                placeholder="Enter file name"
                maxlength="40"
                clearable
                class="name-input"
                :disabled="readonlyMode"
              />
              <el-tree-select
                v-model="formData.parentId"
                :data="folderTreeData"
                node-key="id"
                :props="{ children: 'children', label: 'name' }"
                clearable
                placeholder="Parent folder"
                style="width: 180px"
                check-strictly
                :disabled="readonlyMode"
              />
              <el-select v-if="!formData.parentId && formData.type === 'folder'" v-model="formData.nodeType" placeholder="Type" clearable size="default" style="width: 90px" :disabled="readonlyMode">
                <el-option label="EQP" value="EQP" />
                <el-option label="HOST" value="HOST" />
              </el-select>
              <template v-if="!readonlyMode">
                <el-button type="primary" @click="handleSubmit" :loading="submitting">
                  {{ mode === 'edit' ? 'Save' : 'Create' }}
                </el-button>
                <el-button @click="cancelEdit">Cancel</el-button>
              </template>
              <template v-else>
                <el-button @click="cancelEdit">Close</el-button>
              </template>
            </div>
            <div class="editor-area" ref="editorContainer" v-show="formData.type === 'sml'"></div>
            <div class="folder-placeholder" v-show="formData.type !== 'sml'">
              <el-empty description="Folder has no content" :image-size="60" />
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <teleport to="body">
      <ul
        v-if="contextMenu.visible"
        class="context-menu"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
        @click="contextMenu.visible = false"
      >
        <li @click="handleContextAdd('folder')">
          <el-icon><FolderAdd /></el-icon> Add Folder
        </li>
        <li @click="handleContextAdd('sml')">
          <el-icon><DocumentAdd /></el-icon> Add SML
        </li>
        <li v-if="contextMenu.node?.userId === currentUser?.id" @click="startRename">
          <el-icon><Edit /></el-icon> Rename
        </li>
        <li @click="handleContextCopy">
          <el-icon><CopyDocument /></el-icon> Copy
        </li>
        <li v-if="contextMenu.node?.type === 'folder'" @click="handleContextDownload">
          <el-icon><Download /></el-icon> Download
        </li>
        <li class="divider" v-if="contextMenu.node?.userId === currentUser?.id"></li>
        <li v-if="contextMenu.node?.userId === currentUser?.id" class="danger" @click="handleContextDelete">
          <el-icon><Delete /></el-icon> Delete
        </li>
      </ul>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, onUnmounted, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search, Plus, Folder, Document,
  CopyDocument, Delete, Edit, FolderAdd, DocumentAdd,
  ArrowDown, ArrowUp, MoreFilled, Refresh, Download
} from '@element-plus/icons-vue'
import * as monaco from 'monaco-editor'
import { smlApi } from '../api/sml'
import { registerSMLLanguage } from '../utils/smlLanguage'
import type { SMLNode, SMLNodeRequest } from '../types'
import { userApi } from '../api/user'
import { useCurrentUser } from '../composables/useCurrentUser'

let editor: monaco.editor.IStandaloneCodeEditor | null = null
const editorContainer = ref<HTMLElement>()
const treeRef = ref()
const renameInputRef = ref<HTMLInputElement[]>()
const searchInputRef = ref()
const layoutRef = ref<HTMLElement>()

const leftWidth = ref(450)
const MIN_WIDTH = 200
const MAX_RATIO = 0.5
let resizing = false
let resizeStartX = 0
let resizeStartWidth = 0

const onResizerDown = (e: MouseEvent) => {
  e.preventDefault()
  resizing = true
  resizeStartX = e.clientX
  resizeStartWidth = leftWidth.value
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

const onMouseMove = (e: MouseEvent) => {
  if (!resizing || !layoutRef.value) return
  const maxW = layoutRef.value.offsetWidth * MAX_RATIO
  const delta = e.clientX - resizeStartX
  leftWidth.value = Math.min(maxW, Math.max(MIN_WIDTH, resizeStartWidth + delta))
}

const onMouseUp = () => {
  if (!resizing) return
  resizing = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

const treeData = ref<SMLNode[]>([])
const expandedKeys = ref<number[]>([])

const showSearch = ref(false)
const searchQuery = ref('')
const nodeTypeFilter = ref('')

const mode = ref<'idle' | 'edit' | 'create'>('idle')
const selectedNode = ref<SMLNode | null>(null)
const activeTreeNode = ref<SMLNode | null>(null)
const submitting = ref(false)
const readonlyMode = ref(false)

const renamingNodeId = ref<number | null>(null)
const renamingName = ref('')

const { currentUser } = useCurrentUser()
const userOptions = ref<{ id: number; username: string }[]>([])
const selectedUserId = ref<number | null>(null)

const loadUsers = async () => {
  try {
    const resp = await userApi.getAll()
    userOptions.value = resp.data?.data || []
  } catch { /* ignore */ }
}

const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  node: null as SMLNode | null
})

const formData = reactive<SMLNodeRequest>({
  type: 'sml',
  name: '',
  parentId: undefined,
  content: '',
  nodeType: ''
})

const treeProps = { children: 'children', label: 'name' }

const folderTreeData = computed(() => {
  const filterFolders = (nodes: SMLNode[]): SMLNode[] => {
    const result: SMLNode[] = []
    for (const node of nodes) {
      if (node.type === 'folder') {
        const children = node.children?.length ? filterFolders(node.children) : []
        result.push({ ...node, children })
      }
    }
    return result
  }
  return filterFolders(treeData.value)
})

const sortTree = (nodes: SMLNode[]): SMLNode[] => {
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  for (const n of nodes) {
    if (n.children?.length) sortTree(n.children)
  }
  return nodes
}

const displayData = computed(() => {
  let source = treeData.value
  if (nodeTypeFilter.value) {
    source = source.filter(n => n.nodeType === nodeTypeFilter.value)
  }
  if (!searchQuery.value.trim()) return source

  const query = searchQuery.value.toLowerCase().trim()
  const matches = new Set<number>()
  const parentMap = new Map<number, number>()

  const buildParentMap = (nodes: SMLNode[], parentId?: number) => {
    for (const node of nodes) {
      if (parentId !== undefined) parentMap.set(node.id, parentId)
      if (node.children?.length) buildParentMap(node.children, node.id)
    }
  }
  buildParentMap(treeData.value)

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
  findMatches(treeData.value)

  const filter = (nodes: SMLNode[]): SMLNode[] => {
    const result: SMLNode[] = []
    for (const node of nodes) {
      if (matches.has(node.id)) {
        const filtered: SMLNode = { ...node }
        if (node.children?.length) filtered.children = filter(node.children)
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
  const filtered = filter(treeData.value)
  collectIds(filtered)
  if (query) {
    expandedKeys.value = [...expanded]
    nextTick(() => {
      expanded.forEach(id => {
        const node = (treeRef.value as any)?.getNode(id)
        if (node && !node.expanded) node.expand()
      })
    })
  }

  return filtered
})

const onFilterChange = () => {}

const toggleSearch = () => {
  showSearch.value = !showSearch.value
  if (!showSearch.value) {
    searchQuery.value = ''
  } else {
    nextTick(() => searchInputRef.value?.focus())
  }
}

const handleNodeExpand = (data: SMLNode) => {
  if (!expandedKeys.value.includes(data.id)) {
    expandedKeys.value = [...expandedKeys.value, data.id]
  }
}

const collectDescendantFolderIds = (node: SMLNode): number[] => {
  const ids: number[] = []
  const walk = (nodes?: SMLNode[]) => {
    if (!nodes?.length) return
    for (const child of nodes) {
      if (child.type === 'folder') {
        ids.push(child.id)
      }
      walk(child.children)
    }
  }
  walk(node.children)
  return ids
}

const collectAllFolderIds = (nodes: SMLNode[]): number[] => {
  let ids: number[] = []
  for (const node of nodes) {
    if (node.type === 'folder' && node.children?.length) {
      ids.push(node.id)
      ids = ids.concat(collectAllFolderIds(node.children))
    }
  }
  return ids
}

const allExpanded = computed(() => {
  const allFolderIds = collectAllFolderIds(treeData.value)
  return allFolderIds.length > 0 && allFolderIds.every(id => expandedKeys.value.includes(id))
})

const toggleExpand = () => {
  if (allExpanded.value) {
    collapseAll()
  } else {
    expandAll()
  }
}

const expandAll = () => {
  const ids = collectAllFolderIds(treeData.value)
  expandedKeys.value = ids
  nextTick(() => {
    ids.forEach(id => {
      const node = (treeRef.value as any)?.getNode(id)
      if (node && !node.expanded) node.expand()
    })
  })
}

const collapseAll = () => {
  const keys = [...expandedKeys.value]
  expandedKeys.value = []
  nextTick(() => {
    keys.forEach(id => {
      const node = (treeRef.value as any)?.getNode(id)
      if (node && node.expanded) node.collapse()
    })
  })
}

const handleNodeCollapse = (data: SMLNode) => {
  const collapsedIds = new Set([data.id, ...collectDescendantFolderIds(data)])
  expandedKeys.value = expandedKeys.value.filter(k => !collapsedIds.has(k))
}

const loadTree = async () => {
  try {
    const response = await smlApi.getTree(selectedUserId.value ?? undefined)
    if (response.data?.data) {
      treeData.value = sortTree(JSON.parse(JSON.stringify(response.data.data)))
    }
  } catch {
    ElMessage.error('Failed to load SML tree')
  }
}

const initEditor = async () => {
  await nextTick()
  if (!editorContainer.value) return

  registerSMLLanguage()

  editor = monaco.editor.create(editorContainer.value, {
    value: '',
    theme: 'sml-light',
    language: 'sml',
    automaticLayout: true,
    fontSize: 14,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    folding: true,
    showFoldingControls: 'always'
  })

  editor.onDidChangeModelContent(() => {
    if (editor) formData.content = editor.getValue()
  })
}

const syncEditor = () => {
  if (!editor) return
  const target = formData.content || ''
  if (editor.getValue() !== target) {
    editor.setValue(target)
  }
}

const handleNodeClick = (data: SMLNode) => {
  if (renamingNodeId.value) return

  // Toggle expand/collapse for folder nodes
  if (data.type === 'folder' && treeRef.value && data.id) {
    const node = (treeRef.value as any)?.getNode(data.id)
    const isExpanded = node?.expanded ?? expandedKeys.value.includes(data.id)
    if (isExpanded) {
      if (node && node.expanded) node.collapse()
      handleNodeCollapse(data)
    } else {
      if (!expandedKeys.value.includes(data.id)) {
        expandedKeys.value = [...expandedKeys.value, data.id]
      }
      if (node && !node.expanded) node.expand()
    }
  }

  readonlyMode.value = data.userId !== currentUser.value?.id

  activeTreeNode.value = data
  mode.value = 'edit'
  selectedNode.value = data
  formData.type = data.type
  formData.name = data.name
  formData.parentId = data.parentId
  formData.content = data.content || ''
  formData.nodeType = (data as any).nodeType || ''

  nextTick(() => {
    syncEditor()
    if (editor) {
      editor.updateOptions({ readOnly: readonlyMode.value })
    }
  })
}

const handleDblClick = (data: SMLNode) => {
  handleNodeClick(data)
}

const startCreate = () => {
  mode.value = 'create'
  selectedNode.value = null
  formData.type = 'sml'
  formData.name = ''
  formData.parentId = undefined
  formData.content = ''

  nextTick(() => syncEditor())
}

const startCreateInContext = (type: 'sml' | 'folder') => {
  mode.value = 'create'
  selectedNode.value = null
  formData.type = type
  formData.name = ''
  if (activeTreeNode.value) {
    formData.parentId = activeTreeNode.value.type === 'folder'
      ? activeTreeNode.value.id
      : activeTreeNode.value.parentId
  } else {
    formData.parentId = undefined
  }
  formData.content = ''

  nextTick(() => syncEditor())
}

const cancelEdit = () => {
  mode.value = 'idle'
  selectedNode.value = null
  formData.type = 'sml'
  formData.name = ''
  formData.parentId = undefined
  formData.content = ''
}

const handleSubmit = async () => {
  if (!formData.name.trim()) {
    ElMessage.warning('Name is required')
    return
  }

  submitting.value = true
  try {
    if (mode.value === 'edit' && selectedNode.value) {
      await smlApi.updateNode(selectedNode.value.id, formData)
      ElMessage.success('Saved')
    } else {
      await smlApi.createNode(formData)
      ElMessage.success('Created')
    }

    await loadTree()

    if (formData.parentId && !expandedKeys.value.includes(formData.parentId)) {
      expandedKeys.value = [...expandedKeys.value, formData.parentId]
    }
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || 'Operation failed')
  } finally {
    submitting.value = false
  }
}

const handleCopy = async (node: SMLNode) => {
  try {
    await ElMessageBox.confirm(`Copy "${node.name}"?`, 'Confirm', { type: 'info' })
    await smlApi.createNode({ type: node.type, name: `${node.name} (Copy)`, parentId: node.parentId, content: node.content })
    ElMessage.success('Copied')
    await loadTree()
    if (node.parentId && !expandedKeys.value.includes(node.parentId)) {
      expandedKeys.value = [...expandedKeys.value, node.parentId]
    }
  } catch (error: any) {
    if (error !== 'cancel') ElMessage.error(error?.response?.data?.error || 'Copy failed')
  }
}

const handleDelete = async (node: SMLNode) => {
  try {
    let confirmMsg = `Delete "${node.name}"?`
    if (node.type === 'folder') {
      const resp = await smlApi.countChildren(node.id)
      const childCount = ((resp as any).data?.data) || 0
      if (childCount && childCount > 0) {
        confirmMsg = `Delete folder "${node.name}" and ALL ${childCount} child node(s) inside it? This action cannot be undone.`
      }
    }
    await ElMessageBox.confirm(confirmMsg, 'Confirm Delete', {
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonType: 'danger',
      type: 'error'
    })
    await smlApi.deleteNode(node.id)
    if (selectedNode.value?.id === node.id) cancelEdit()
    ElMessage.success('Deleted')
    await loadTree()
  } catch (error: any) {
    if (error !== 'cancel') ElMessage.error(error?.response?.data?.error || 'Delete failed')
  }
}

const onNodeContextMenu = (_e: MouseEvent, _node: any, data: SMLNode) => {
  contextMenu.node = data
  contextMenu.x = _e.clientX
  contextMenu.y = _e.clientY
  contextMenu.visible = true
}

const onTreeContextMenu = () => {
  contextMenu.node = null
}

const handleContextAdd = (type: 'folder' | 'sml') => {
  startCreate()
  formData.type = type
  if (contextMenu.node) {
    formData.parentId = contextMenu.node.type === 'folder' ? contextMenu.node.id : contextMenu.node.parentId
  }
}

const handleContextCopy = () => {
  if (contextMenu.node) handleCopy(contextMenu.node)
}

const handleContextDelete = () => {
  if (contextMenu.node && (contextMenu.node.template || contextMenu.node.isProtected)) {
    ElMessage.warning('Cannot delete protected node')
    return
  }
  if (contextMenu.node) handleDelete(contextMenu.node)
}

const onNodeAction = (command: string, data: SMLNode) => {
  contextMenu.node = data
  switch (command) {
    case 'addFolder': handleContextAdd('folder'); break
    case 'addSml': handleContextAdd('sml'); break
    case 'rename': startRename(); break
    case 'copy': handleContextCopy(); break
    case 'download': handleDownload(data); break
    case 'delete': handleContextDelete(); break
  }
}

const handleDownload = async (node: SMLNode) => {
  if (node.type !== 'folder') return
  try {
    await smlApi.downloadFolder(node.id)
  } catch (e: any) {
    const msg = e?.response?.data?.error || 'Download failed'
    ElMessage.error(msg)
  }
}

const handleContextDownload = () => {
  if (contextMenu.node) handleDownload(contextMenu.node)
}

const startRename = () => {
  if (!contextMenu.node) return
  renamingNodeId.value = contextMenu.node.id
  renamingName.value = contextMenu.node.name
  nextTick(() => {
    const inputs = renameInputRef.value
    if (inputs?.length) inputs[0]?.focus()
  })
}

const confirmRename = async () => {
  if (!renamingNodeId.value) return
  const id = renamingNodeId.value
  const newName = renamingName.value.trim()
  renamingNodeId.value = null

  if (!newName) return

  const node = findNode(treeData.value, id)
  if (!node || node.name === newName) return

  try {
    await smlApi.updateNode(id, {
      type: node.type,
      name: newName,
      parentId: node.parentId,
      content: node.content
    })
    ElMessage.success('Renamed')
    await loadTree()
    if (selectedNode.value?.id === id) {
      selectedNode.value.name = newName
      formData.name = newName
    }
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || 'Rename failed')
  }
}

const cancelRename = () => {
  renamingNodeId.value = null
}

const findNode = (nodes: SMLNode[], id: number): SMLNode | null => {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children?.length) {
      const found = findNode(node.children, id)
      if (found) return found
    }
  }
  return null
}

const closeContextMenu = () => {
  contextMenu.visible = false
}

const onKeyDown = (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    if (mode.value !== 'idle') handleSubmit()
  }
}

onMounted(() => {
  if (currentUser.value && currentUser.value.roleId !== 1) {
    selectedUserId.value = currentUser.value.id
  }
  loadTree()
  loadUsers()
  initEditor()
  document.addEventListener('click', closeContextMenu)
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
  document.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  if (editor) {
    editor.dispose()
    editor = null
  }
  document.removeEventListener('click', closeContextMenu)
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
  document.removeEventListener('keydown', onKeyDown)
})

watch(() => formData.type, () => {
  if (formData.type === 'sml') {
    nextTick(() => {
      if (!editor && editorContainer.value) initEditor()
      else syncEditor()
    })
  }
})
</script>

<style scoped>
.sml-page {
  padding: 4px 4px 16px 4px;
  height: calc(100vh - 85px);
  min-height: 400px;
  box-sizing: border-box;
}

.sml-page :deep(.el-card) {
  height: 100%;
}

.sml-page :deep(.el-card__body) {
  height: 100%;
  padding: 0;
}

.sml-layout {
  display: flex;
  height: 100%;
  overflow: hidden;
}

.left-panel {
  flex-shrink: 0;
  border-right: none;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 12px;
  height: 45px;
  box-sizing: border-box;
  border-bottom: 1px solid #dcdfe6;
  background-color: #f5f7fa;
  font-weight: bold;
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
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-bottom: 1px solid #e4e7ed;
  background-color: #fafafa;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  justify-content: space-between;
  padding-right: 4px;
}

.tree-node .el-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.node-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rename-input {
  flex: 1;
  border: 1px solid #409eff;
  border-radius: 3px;
  padding: 1px 6px;
  font-size: 13px;
  outline: none;
  min-width: 0;
}

.node-actions {
  display: flex;
  opacity: 0;
  transition: opacity 0.15s;
  gap: 2px;
  flex-shrink: 0;
}

.tree-node:hover .node-actions {
  opacity: 1;
}

.node-actions :deep(.el-button) {
  padding: 2px;
}
.node-actions :deep(.el-icon) {
  transform: rotate(90deg);
}

.node-type-tag {
  margin-right: 2px;
  font-size: 10px;
  height: 18px;
  line-height: 18px;
  padding: 0 4px;
  flex-shrink: 0;
}

.node-creator-tag {
  margin-right: 2px;
  font-size: 10px;
  height: 18px;
  line-height: 18px;
  padding: 0 4px;
  flex-shrink: 0;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tree-container {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #c1c1c1 transparent;
}

.tree-container::-webkit-scrollbar { width: 6px; }
.tree-container::-webkit-scrollbar-track { background: transparent; }
.tree-container::-webkit-scrollbar-thumb { background-color: #c1c1c1; border-radius: 3px; }
.tree-container::-webkit-scrollbar-thumb:hover { background-color: #a8a8a8; }

.resizer {
  width: 6px;
  flex-shrink: 0;
  cursor: col-resize;
  background-color: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s;
}

.resizer:hover {
  background-color: #dcdfe6;
}

.resizer-handle {
  width: 2px;
  height: 24px;
  border-radius: 1px;
  background-color: #c0c4cc;
}

.resizer:hover .resizer-handle {
  background-color: #409eff;
}

.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.editor-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  border-bottom: 1px solid #dcdfe6;
  background-color: #f5f7fa;
  flex-shrink: 0;
  height: 45px;
  box-sizing: border-box;
}

.name-input {
  flex: 1;
  min-width: 200px;
  max-width: 400px;
}

.name-input :deep(.el-input__inner) {
  font-size: 14px;
  font-weight: 500;
}

.editor-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.folder-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fafafa;
}

.editor-area {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.context-menu {
  position: fixed;
  z-index: 9999;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  padding: 4px 0;
  margin: 0;
  list-style: none;
  min-width: 140px;
}

.context-menu li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  cursor: pointer;
  font-size: 13px;
  color: #303133;
  transition: background-color 0.15s;
}

.context-menu li:hover {
  background-color: #ecf5ff;
  color: #409eff;
}

.context-menu li.danger:hover {
  background-color: #fef0f0;
  color: #f56c6c;
}

.context-menu li.divider {
  height: 1px;
  padding: 0;
  margin: 4px 8px;
  background-color: #e4e7ed;
  cursor: default;
}

.context-menu li.divider:hover {
  background-color: #e4e7ed;
  color: inherit;
}

.context-menu li .el-icon {
  font-size: 14px;
}
</style>
