<template>
  <div class="center-panel">
    <div class="section-header">
      <span>SECS Communication Logs</span>
      <span class="log-status">
        <el-button
          size="small"
          circle
          :type="filterLinktest ? 'primary' : ''"
          @click="filterLinktest = !filterLinktest"
          :title="filterLinktest ? 'Showing: linktest filtered' : 'Showing: all messages'"
        >
          <el-icon><Connection /></el-icon>
        </el-button>
        <el-button size="small" circle @click="downloadActiveLogs" title="Download Today's Log" :disabled="activeTabId === null">
          <el-icon><Download /></el-icon>
        </el-button>
        <el-button size="small" circle @click="clearActiveLogs" title="Clear Current Tab" :disabled="tabEngineIds.length === 0">
          <el-icon><Delete /></el-icon>
        </el-button>
      </span>
    </div>
    <div v-if="tabEngineIds.length > 0" class="log-tabs">
      <div class="tab-bar">
        <div
          v-for="engineId in tabEngineIds"
          :key="engineId"
          class="tab-item"
          :class="{ active: activeTabId === engineId }"
          @click="switchTab(engineId)"
        >
          <span class="tab-label">{{ getEngineName(engineId) }}</span>
          <span class="tab-close" @click.stop="removeTab(engineId)">×</span>
        </div>
      </div>
      <div class="log-container" ref="containerRef"></div>
    </div>
    <div v-else class="log-empty">
      <el-empty description="Subscribe to an engine to view logs" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Delete, Connection, Download } from '@element-plus/icons-vue'
import * as monaco from 'monaco-editor'
import { registerSMLLanguage } from '../../utils/smlLanguage'
import { engineApi } from '../../api/engine'

interface EngineNameLookup {
  (engineId: number): string
}

interface Props {
  engineNameLookup: EngineNameLookup
}

interface Emits {
  (e: 'tab-close', engineId: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const getEngineName = (engineId: number) => props.engineNameLookup(engineId)

const containerRef = ref<HTMLElement>()
let editor: monaco.editor.IStandaloneCodeEditor | null = null

const tabEngineIds = ref<number[]>([])
const activeTabId = ref<number | null>(null)
const filterLinktest = ref(true)

const logStore = new Map<number, string[]>()
const pendingStore = new Map<number, string[]>()
const maxLogLines = 30000

const ensureLogBuffers = (engineId: number) => {
  if (!logStore.has(engineId)) logStore.set(engineId, [])
  if (!pendingStore.has(engineId)) pendingStore.set(engineId, [])
}

const flushAllToStore = () => {
  logStore.forEach((_, engineId) => {
    const pending = pendingStore.get(engineId)
    if (!pending || pending.length === 0) return

    const logs = logStore.get(engineId) || []
    logs.push(...pending)
    pendingStore.set(engineId, [])

    if (logs.length > maxLogLines) {
      logStore.set(engineId, logs.slice(-maxLogLines))
    } else {
      logStore.set(engineId, logs)
    }
  })
}

const updateEditorDisplay = () => {
  if (!editor || activeTabId.value === null) return
  const logs = logStore.get(activeTabId.value) || []
  editor.setValue(logs.join('\n'))
  if (logs.length > 0) {
    editor.revealLine(editor.getModel()!.getLineCount())
  }
}

const doFlush = () => {
  if (flushTimer !== null) {
    flushTimer = null
  }

  if (cleared && activeTabId.value !== null) {
    cleared = false
    logStore.set(activeTabId.value, [])
    pendingStore.set(activeTabId.value, [])
  }

  flushAllToStore()
  updateEditorDisplay()
}

let flushTimer: number | null = null
let cleared = false

const scheduleFlush = () => {
  if (flushTimer !== null) return
  flushTimer = window.setTimeout(doFlush, 100)
}

const addLogMessage = (engineId: number, message: string) => {
  if (filterLinktest.value && message.includes('LINKTEST')) return
  ensureLogBuffers(engineId)
  pendingStore.get(engineId)!.push(message)
  scheduleFlush()
}

const clearActiveLogs = () => {
  if (activeTabId.value === null) return
  const engineId = activeTabId.value
  logStore.set(engineId, [])
  pendingStore.set(engineId, [])
  cleared = true
  if (flushTimer !== null) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  if (editor) {
    const model = editor.getModel()
    if (model) {
      model.applyEdits([{ range: model.getFullModelRange(), text: '' }])
    }
  }
}

const downloadActiveLogs = async () => {
  if (activeTabId.value === null) return
  const engineId = activeTabId.value
  const today = new Date().toISOString().slice(0, 10)

  try {
    const blobData = await engineApi.downloadLogs(engineId, today, today, false)
    const blob = new Blob([blobData])
    const url = window.URL.createObjectURL(blob)
    const filename = `${getEngineName(engineId) || 'Engine'}_${today.replace(/-/g, '')}.log`

    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (e: any) {
    const msg = e?.response?.data?.error || 'Failed to download log file'
    ElMessage.error(msg)
  }
}

const addTab = (engineId: number) => {
  ensureLogBuffers(engineId)
  if (!tabEngineIds.value.includes(engineId)) {
    tabEngineIds.value = [...tabEngineIds.value, engineId]
  }
  switchTab(engineId)
}

const removeTab = (engineId: number) => {
  const idx = tabEngineIds.value.indexOf(engineId)
  if (idx === -1) return
  const newTabs = tabEngineIds.value.filter(id => id !== engineId)
  tabEngineIds.value = newTabs

  logStore.delete(engineId)
  pendingStore.delete(engineId)
  emit('tab-close', engineId)

  if (activeTabId.value === engineId) {
    if (newTabs.length > 0) {
      switchTab(newTabs[Math.min(idx, newTabs.length - 1)])
    } else {
      activeTabId.value = null
    }
  }
}

const switchTab = (engineId: number) => {
  activeTabId.value = engineId
  nextTick(() => {
    if (!editor) return
    const logs = logStore.get(engineId) || []
    editor.setValue(logs.join('\n'))
    if (logs.length > 0) {
      editor.revealLine(editor.getModel()!.getLineCount())
    }
  })
}

watch(containerRef, () => {
  if (!containerRef.value) return
  registerSMLLanguage()
  editor = monaco.editor.create(containerRef.value, {
    value: '',
    theme: 'sml-light',
    language: 'sml',
    automaticLayout: true,
    fontSize: 13,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    readOnly: true,
    lineNumbers: 'on',
    glyphMargin: false,
    folding: true,
    showFoldingControls: 'always',
    foldingStrategy: 'auto',
    foldingMaximumRegions: 5000,
    lineDecorationsWidth: 4,
    lineNumbersMinChars: 4,
    renderLineHighlight: 'none',
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    overviewRulerBorder: false,
    scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 }
  })
})

onUnmounted(() => {
  if (flushTimer !== null) {
    clearTimeout(flushTimer)
  }
  if (editor) {
    editor.dispose()
    editor = null
  }
})

defineExpose({ addLogMessage, addTab, removeTab, activeTabId })
</script>

<style scoped>
.center-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
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

.log-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.log-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.tab-bar {
  display: flex;
  background-color: #f5f7fa;
  border-bottom: 1px solid #dcdfe6;
  padding: 0 4px;
  overflow-x: auto;
  flex-shrink: 0;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  cursor: pointer;
  border-right: 1px solid #e4e7ed;
  font-size: 12px;
  color: #606266;
  white-space: nowrap;
  transition: background-color 0.15s;
  user-select: none;
}

.tab-item:hover {
  background-color: #ecf5ff;
}

.tab-item.active {
  background-color: #fff;
  color: #409eff;
  font-weight: 500;
  border-bottom: 2px solid #409eff;
  margin-bottom: -1px;
}

.tab-label {
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-close {
  font-size: 14px;
  color: #c0c4cc;
  line-height: 1;
  transition: color 0.15s;
}

.tab-close:hover {
  color: #f56c6c;
}

.log-container {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.log-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
