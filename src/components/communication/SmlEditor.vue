<template>
  <div class="sml-editor-wrapper">
    <div class="editor-body">
      <div class="editor-toolbar" v-if="selectedFile">
        <el-tooltip content="Send" placement="left">
          <el-button size="small" circle type="primary" @click="handleSend" :loading="sending" :disabled="!canSend">
            <el-icon><Promotion /></el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip content="Save" placement="left">
          <el-button size="small" circle @click="handleSave">
            <el-icon><DocumentAdd /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
      <div class="editor-main">
        <div v-show="!selectedFile" class="editor-placeholder">
          <el-empty description="Select an SML file to view content" />
        </div>
        <div v-show="selectedFile" class="editor-container">
          <div ref="containerRef" class="sml-editor-container"></div>
        </div>

        <!-- Variables Panel -->
        <div v-show="selectedFile" class="variables-panel">
          <div class="variables-header" @click="varsExpanded = !varsExpanded">
            <el-icon><ArrowDown v-if="varsExpanded" /><ArrowRight v-else /></el-icon>
            <span>Variables</span>
            <el-badge :value="totalVarCount" type="info" v-if="totalVarCount > 0" />
          </div>
          <div v-show="varsExpanded" class="variables-body">
            <!-- Runtime vars from AutoReply -->
            <div v-if="runtimeVarCount > 0" class="var-section">
              <div class="var-section-title">Runtime</div>
              <div v-for="(value, key) in runtimeVars" :key="'rt-' + key" class="var-row readonly">
                <span class="var-key">{{ key }}</span>
                <span class="var-value">{{ value }}</span>
                <el-icon class="var-lock"><Lock /></el-icon>
              </div>
            </div>

            <!-- User-defined vars -->
            <div class="var-section">
              <div class="var-section-title">Custom</div>
              <div v-for="(v, index) in userVarsList" :key="'usr-' + index" class="var-row">
                <el-input
                  v-model="v.key"
                  size="small"
                  placeholder="VAR_NAME"
                  class="var-input-key"
                  @change="persistUserVars"
                />
                <el-input
                  v-model="v.value"
                  size="small"
                  placeholder="value"
                  class="var-input-value"
                  @change="persistUserVars"
                />
                <el-button text type="danger" size="small" @click="removeUserVar(index)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
              <el-button text size="small" @click="addUserVar">
                <el-icon><Plus /></el-icon> Add Variable
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed, onUnmounted, type Ref } from 'vue'
import { DocumentAdd, Promotion, ArrowDown, ArrowRight, Plus, Delete, Lock } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import * as monaco from 'monaco-editor'
import { engineApi } from '../../api/engine'
import { registerSMLLanguage } from '../../utils/smlLanguage'
import type { SMLNode } from '../../types'

interface Props {
  selectedFile: SMLNode | null
  connectedEngineId: number | null
  runtimeVars?: Record<string, string>
}

interface Emits {
  (e: 'save', content: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const containerRef = ref<HTMLElement>() as Ref<HTMLElement>
const sending = ref(false)
const canSend = computed(() => props.connectedEngineId !== null && !sending.value)

const varsExpanded = ref(false)

// User-defined variables (persisted in localStorage per engine)
const userVarsList = ref<{ key: string; value: string }[]>([])

const loadUserVars = () => {
  if (!props.connectedEngineId) {
    userVarsList.value = []
    return
  }
  const key = `eap_vars_${props.connectedEngineId}`
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, string>
      userVarsList.value = Object.entries(parsed).map(([k, v]) => ({ key: k, value: v }))
    } else {
      userVarsList.value = []
    }
  } catch {
    userVarsList.value = []
  }
}

const persistUserVars = () => {
  if (!props.connectedEngineId) return
  const key = `eap_vars_${props.connectedEngineId}`
  const map: Record<string, string> = {}
  for (const item of userVarsList.value) {
    if (item.key.trim()) {
      map[item.key.trim()] = item.value
    }
  }
  localStorage.setItem(key, JSON.stringify(map))
}

const addUserVar = () => {
  userVarsList.value.push({ key: '', value: '' })
}

const removeUserVar = (index: number) => {
  userVarsList.value.splice(index, 1)
  persistUserVars()
}

const runtimeVars = computed(() => props.runtimeVars ?? {})
const runtimeVarCount = computed(() => Object.keys(runtimeVars.value).length)
const userVarCount = computed(() => userVarsList.value.filter(v => v.key.trim()).length)
const totalVarCount = computed(() => runtimeVarCount.value + userVarCount.value)

watch(() => props.connectedEngineId, () => {
  loadUserVars()
}, { immediate: true })

let editor: monaco.editor.IStandaloneCodeEditor | null = null

const ensureEditor = async () => {
  if (editor) return
  await nextTick()
  if (!containerRef.value) return
  registerSMLLanguage()
  editor = monaco.editor.create(containerRef.value, {
    value: '',
    theme: 'sml-light',
    language: 'sml',
    automaticLayout: true,
    fontSize: 14,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    wordWrap: 'off'
  })
}

watch(() => props.selectedFile, async (newFile) => {
  if (!newFile) return
  await ensureEditor()
  if (editor && newFile.content) {
    editor.setValue(newFile.content)
  }
})

onUnmounted(() => {
  if (editor) {
    editor.dispose()
    editor = null
  }
})

const handleSend = async () => {
  if (!props.connectedEngineId) {
    ElMessage.warning('No engine connected. Subscribe to an engine log stream first.')
    return
  }
  const content = editor?.getValue()
  if (!content?.trim()) {
    ElMessage.warning('No SML content to send')
    return
  }

  // Build user variables map
  const variables: Record<string, string> = {}
  for (const item of userVarsList.value) {
    if (item.key.trim()) {
      variables[item.key.trim()] = item.value
    }
  }

  sending.value = true
  try {
    await engineApi.sendSML(props.connectedEngineId, content, variables)
    ElMessage.success('SML message sent')
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || 'Failed to send SML')
  } finally {
    sending.value = false
  }
}

const handleSave = () => {
  const content = editor?.getValue()
  if (content != null) {
    emit('save', content)
  }
}
</script>

<style scoped>
.sml-editor-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.editor-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.editor-toolbar {
  width: 44px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-right: 1px solid #e4e7ed;
  background-color: #fafafa;
}

.editor-toolbar :deep(.el-button.is-circle) {
  width: 24px;
  height: 24px;
  margin-left: 0;
}

.editor-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.editor-container {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.editor-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sml-editor-container {
  height: 100%;
  width: 100%;
}

/* Variables Panel */
.variables-panel {
  flex-shrink: 0;
  border-top: 1px solid #e4e7ed;
  background-color: #fafafa;
}

.variables-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 500;
  color: #606266;
  cursor: pointer;
  user-select: none;
}

.variables-header:hover {
  background-color: #f0f2f5;
}

.variables-body {
  padding: 0 12px 10px;
  max-height: 200px;
  overflow-y: auto;
}

.var-section {
  margin-bottom: 8px;
}

.var-section-title {
  font-size: 11px;
  color: #909399;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.var-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 0;
}

.var-row.readonly {
  padding: 3px 6px;
  background-color: #f0f2f5;
  border-radius: 4px;
  margin-bottom: 2px;
}

.var-key {
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 12px;
  color: #409EFF;
  min-width: 80px;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.var-value {
  flex: 1;
  font-size: 12px;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.var-lock {
  font-size: 12px;
  color: #c0c4cc;
}

.var-input-key {
  width: 100px;
}

.var-input-key :deep(.el-input__inner) {
  font-family: 'SFMono-Regular', Consolas, monospace;
}

.var-input-value {
  flex: 1;
}
</style>
