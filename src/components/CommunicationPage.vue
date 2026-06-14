<template>
  <div class="communication-page">
    <el-card>
      <div class="comm-layout" ref="layoutRef">
        <!-- Left Panel -->
        <div
          class="left-panel"
          :class="{ collapsed: leftCollapsed }"
          :style="leftCollapsed ? {} : { width: leftWidth + 'px' }"
        >
          <EngineList
            :engines="engines"
            :selected-engine-id="selectedEngineId"
            :loading="loading"
            :connected-engine-ids="connectedEngineIds"
            :active-send-engine-id="activeSendEngineId"
            :operating-engines="operatingEngines"
            @select-engine="handleSelectEngine"
            @toggle-engine="handleToggleEngine"
            @toggle-log="handleToggleLog"
            @refresh="refreshData"
            @open-engine-page="enginePageVisible = true"
            @open-autoreply-page="autoreplyPageVisible = true"
          />

          <SmlTree
            :tree-data="smlTreeData"
            :selected-file="selectedSmlFile"
            :user-options="smlUserOptions"
            v-model:expanded-keys="expandedKeys"
            v-model:selected-user-id="selectedSmlUserId"
            @node-click="handleSmlNodeClick"
            @node-dblclick="handleSmlDblClick"
            @refresh="loadSmlTree"
            @user-change="handleSmlUserChange"
          />
        </div>

        <!-- Left Resizer -->
        <div class="resizer" :class="{ 'resizer-collapsed': leftCollapsed }" @mousedown.left="onResizerDown('left', $event)">
          <div class="resizer-btn" @mousedown.stop @click="leftCollapsed = !leftCollapsed">{{ leftCollapsed ? '›' : '‹' }}</div>
        </div>

        <!-- Center Panel -->
        <CommLogs
          ref="commLogsRef"
          :engine-name-lookup="getEngineName"
          @tab-close="handleTabClose"
        />

        <!-- Right Resizer -->
        <div class="resizer" :class="{ 'resizer-collapsed': rightCollapsed }" @mousedown.left="onResizerDown('right', $event)">
          <div class="resizer-btn" @mousedown.stop @click="rightCollapsed = !rightCollapsed">{{ rightCollapsed ? '‹' : '›' }}</div>
        </div>

        <!-- Right Panel -->
        <div
          class="right-panel"
          :class="{ collapsed: rightCollapsed }"
          :style="rightCollapsed ? {} : { width: rightWidth + 'px' }"
        >
          <div class="panel-title">{{ selectedSmlFile ? selectedSmlFile.name : 'SML Content' }}</div>
          <SmlEditorInner
            ref="smlEditorRef"
            :selected-file="selectedSmlFile"
            :connected-engine-id="activeSendEngineId"
            :runtime-vars="activeSendEngineId ? engineVars[activeSendEngineId] : undefined"
            @save="handleSaveSml"
          />
        </div>
      </div>
    </el-card>

    <el-dialog v-model="enginePageVisible" title="Engine Management" width="90%" top="5vh" destroy-on-close class="embedded-page-dialog">
      <EnginePage />
    </el-dialog>

    <el-dialog v-model="autoreplyPageVisible" title="Auto Reply Management" width="90%" top="5vh" destroy-on-close class="embedded-page-dialog">
      <AutoReplyPage />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useEngines, type EngineItem } from '../composables/useEngines'
import { useWebSocket, type EngineInfo } from '../composables/useWebSocket'
import { useCurrentUser } from '../composables/useCurrentUser'
import { smlApi } from '../api/sml'
import { engineApi } from '../api/engine'
import { userApi } from '../api/user'
import type { SMLNode } from '../types'
import EngineList from './communication/EngineList.vue'
import SmlTree from './communication/SmlTree.vue'
import CommLogs from './communication/CommLogs.vue'
import SmlEditor from './communication/SmlEditor.vue'
import EnginePage from './EnginePage.vue'
import AutoReplyPage from './AutoReplyPage.vue'

const SmlEditorInner = SmlEditor

const { 
  engines, 
  selectedEngineId, 
  loading, 
  operatingEngines,
  loadEngines, 
  selectEngine,
  startEngine,
  stopEngine,
  updateEngineStatus,
  getEngine,
  startStatusPoll,
  stopStatusPoll
} = useEngines()

const engineVars = ref<Record<number, Record<string, string>>>({})
const { currentUser } = useCurrentUser()

const loadEngineVars = async (engineId: number) => {
  try {
    const resp = await engineApi.getVars(engineId)
    engineVars.value[engineId] = resp.data ?? {}
  } catch {
    engineVars.value[engineId] = {}
  }
}

const {
  connectedEngineIds,
  connectEngine,
  disconnectEngine,
  isEngineConnected,
  getEngine: getWsEngine
} = useWebSocket({
  onConnect: (engineId: number) => {
    const engine = getEngine(engineId)
    if (engine) {
      ElMessage.success(`Log stream connected to ${engine.engineName}`)
    }
    if (commLogsRef.value) {
      commLogsRef.value.addTab(engineId)
    }
    loadEngineVars(engineId)
  },
  onDisconnect: (engineId: number) => {
    const engine = getEngine(engineId)
    if (engine) {
      ElMessage.info(`Log stream disconnected from ${engine.engineName}`)
    }
    if (commLogsRef.value) {
      commLogsRef.value.removeTab(engineId)
    }
    delete engineVars.value[engineId]
  },
  onMessage: (engineId: number, message: string) => {
    if (commLogsRef.value) {
      commLogsRef.value.addLogMessage(engineId, message)
    }
  },
  onError: (engineId: number) => {
    const engine = getEngine(engineId)
    if (engine) {
      ElMessage.error(`Failed to connect log stream to ${engine.engineName}`)
    }
  },
  onStatus: (engineId: number, status: string) => {
    updateEngineStatus(engineId, status)
  },
  onVars: (engineId: number, vars: Record<string, string>) => {
    engineVars.value[engineId] = vars
  }
})

const smlTreeData = ref<SMLNode[]>([])
const selectedSmlFile = ref<SMLNode | null>(null)
const expandedKeys = ref<number[]>([])
const smlUserOptions = ref<{ id: number; username: string }[]>([])
const selectedSmlUserId = ref<number | null>(null)

const getEngineName = (engineId: number): string => {
  return getEngine(engineId)?.engineName || getWsEngine(engineId)?.engineName || `Engine ${engineId}`
}

const commLogsRef = ref<InstanceType<typeof CommLogs>>()

const activeSendEngineId = computed(() => {
  return commLogsRef.value?.activeTabId ?? null
})
const layoutRef = ref<HTMLElement>()

const enginePageVisible = ref(false)
const autoreplyPageVisible = ref(false)

const leftCollapsed = ref(false)
const rightCollapsed = ref(false)
const leftWidth = ref(300)
const rightWidth = ref(420)

const MIN_WIDTH = 200
const MAX_RATIO = 0.4

let resizing: 'left' | 'right' | null = null
let startX = 0
let startWidth = 0

const onResizerDown = (side: 'left' | 'right', e: MouseEvent) => {
  const collapsed = side === 'left' ? leftCollapsed.value : rightCollapsed.value
  if (collapsed) return
  e.preventDefault()
  resizing = side
  startX = e.clientX
  startWidth = side === 'left' ? leftWidth.value : rightWidth.value
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

const onMouseMove = (e: MouseEvent) => {
  if (!resizing || !layoutRef.value) return
  const layoutWidth = layoutRef.value.offsetWidth
  const maxW = layoutWidth * MAX_RATIO

  if (resizing === 'left') {
    const delta = e.clientX - startX
    leftWidth.value = Math.min(maxW, Math.max(MIN_WIDTH, startWidth + delta))
  } else {
    const delta = startX - e.clientX
    rightWidth.value = Math.min(maxW, Math.max(MIN_WIDTH, startWidth + delta))
  }
}

const onMouseUp = () => {
  if (!resizing) return
  resizing = null
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

onMounted(async () => {
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
  if (currentUser.value && currentUser.value.roleId !== 1) {
    selectedSmlUserId.value = currentUser.value.id
  }
  await loadEngines()
  await Promise.all([loadSmlUsers(), loadSmlTree()])
  startStatusPoll()
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
  disconnectEngine()
  stopStatusPoll()
})

const loadSmlTree = async () => {
  try {
    const response = await smlApi.getTree(selectedSmlUserId.value ?? undefined)
    if (response.data && response.data.data) {
      smlTreeData.value = JSON.parse(JSON.stringify(response.data.data))
      if (selectedSmlFile.value && !containsSmlNode(smlTreeData.value, selectedSmlFile.value.id)) {
        selectedSmlFile.value = null
      }
    }
  } catch (error) {
    console.error('Failed to load SML tree:', error)
    ElMessage.error('Failed to load SML tree')
  }
}

const loadSmlUsers = async () => {
  try {
    const response = await userApi.getAll()
    smlUserOptions.value = response.data?.data || []
  } catch (error) {
    console.error('Failed to load SML users:', error)
  }
}

const refreshData = async () => {
  await Promise.all([loadEngines(), loadSmlTree()])
}

const handleSelectEngine = (engineId: number) => {
  selectEngine(engineId)
}

const handleToggleEngine = async (engine: EngineItem) => {
  if (engine.status === 'running' || engine.status === 'connected') {
    if (isEngineConnected(engine.id)) {
      disconnectEngine(engine.id)
    }
    await stopEngine(engine.id)
  } else {
    await startEngine(engine.id)
  }
}

const handleToggleLog = (engine: EngineItem) => {
  if (isEngineConnected(engine.id)) {
    disconnectEngine(engine.id)
  } else {
    connectEngine(engine as unknown as EngineInfo)
  }
}

const handleTabClose = (engineId: number) => {
  disconnectEngine(engineId)
}

const handleSmlNodeClick = (data: SMLNode) => {
  if (data.type === 'sml') {
    selectedSmlFile.value = data
  } else {
    selectedSmlFile.value = null
  }
}

const handleSmlDblClick = async (data: SMLNode) => {
  selectedSmlFile.value = data

  if (!activeSendEngineId.value) {
    ElMessage.warning('Subscribe to an engine log stream first, then double-click to send.')
    return
  }

  if (!data.content?.trim()) {
    ElMessage.warning('SML file has no content')
    return
  }

  try {
    await engineApi.sendSML(activeSendEngineId.value, data.content, undefined)
    ElMessage.success(`Sent "${data.name}" to engine`)
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || 'Failed to send SML')
  }
}

const handleSmlUserChange = async () => {
  expandedKeys.value = []
  await loadSmlTree()
}

const handleSaveSml = async (content: string) => {
  if (!selectedSmlFile.value) return

  try {
    await smlApi.updateNode(selectedSmlFile.value.id, {
      type: 'sml',
      name: selectedSmlFile.value.name,
      parentId: selectedSmlFile.value.parentId,
      content
    })
    selectedSmlFile.value = { ...selectedSmlFile.value, content }
    updateSmlNodeContent(smlTreeData.value, selectedSmlFile.value.id, content)
    ElMessage.success('SML file saved successfully')
  } catch (error) {
    console.error('Failed to save SML file:', error)
    ElMessage.error('Failed to save SML file')
  }
}

function updateSmlNodeContent(nodes: SMLNode[], id: number, content: string) {
  for (const node of nodes) {
    if (node.id === id) {
      node.content = content
      return
    }
    if (node.children?.length) {
      updateSmlNodeContent(node.children, id, content)
    }
  }
}

function containsSmlNode(nodes: SMLNode[], id: number): boolean {
  for (const node of nodes) {
    if (node.id === id) return true
    if (node.children?.length && containsSmlNode(node.children, id)) {
      return true
    }
  }
  return false
}
</script>

<style scoped>
.communication-page {
  height: 100%;
  box-sizing: border-box;
  padding: 4px 4px 16px 4px;
}

.communication-page :deep(.el-card) {
  height: calc(100vh - 85px);
  min-height: 400px;
}

.communication-page :deep(.el-card__body) {
  height: 100%;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.comm-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.left-panel {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background-color: #fafafa;
  overflow: hidden;
  transition: width 0.2s ease;
}

.left-panel.collapsed {
  width: 0 !important;
}

.left-panel :deep(.panel-section) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.right-panel {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background-color: #fafafa;
  overflow: hidden;
  transition: width 0.2s ease;
}

.right-panel.collapsed {
  width: 0 !important;
}

.panel-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  height: 48px;
  box-sizing: border-box;
  background-color: #f5f7fa;
  border-bottom: 1px solid #dcdfe6;
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

.embedded-page-dialog :deep(.el-dialog__body) {
  padding: 10px 16px 16px;
  max-height: 70vh;
  overflow: auto;
}

.embedded-page-dialog :deep(.engine-page),
.embedded-page-dialog :deep(.autoreply-page) {
  height: auto;
  min-height: 400px;
  padding: 0;
}

.embedded-page-dialog :deep(.engine-page .el-card),
.embedded-page-dialog :deep(.autoreply-page .el-card) {
  box-shadow: none;
  border: none;
}
</style>
