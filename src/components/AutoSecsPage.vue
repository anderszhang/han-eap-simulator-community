<template>
  <div class="auto-secs-page">
    <el-card>
      <!-- Main Content: Left Flow + Right Logs -->
      <div class="main-content">
        <!-- Left: Controls + Flow Visualization -->
        <div class="flow-panel" :class="{ 'flow-panel-empty': !selectedFlowId }">
          <div class="panel-header">
            <div class="header-controls">
              <div class="bar-group">
                <span class="bar-label">Engine</span>
                <el-select
                  v-model="selectedEngineId"
                  placeholder="Select Engine"
                  size="small"
                  style="width: 130px"
                  @change="onEngineChange"
                >
                  <el-option v-for="e in availableEngines" :key="e.id" :label="e.engineName" :value="e.id" />
                </el-select>
                <template v-if="selectedEngineId">
                  <el-button
                    v-if="engineStatus !== 'running' && engineStatus !== 'connected'"
                    type="success"
                    size="small"
                    :loading="engineOperating"
                    @click="handleStartEngine"
                  >
                    <el-icon><VideoPlay /></el-icon> Start
                  </el-button>
                  <el-button
                    v-else
                    type="danger"
                    size="small"
                    :loading="engineOperating"
                    @click="handleStopEngine"
                  >
                    <el-icon><SwitchButton /></el-icon> Stop
                  </el-button>
                </template>
              </div>
              <div class="header-divider"></div>
              <div class="bar-group">
                <span class="bar-label">Flow</span>
                <el-select
                  v-model="selectedFlowId"
                  placeholder="Select Flow"
                  size="small"
                  style="width: 150px"
                  @change="onFlowChange"
                >
                  <el-option v-for="f in publishedFlows" :key="f.id" :label="f.name" :value="f.id" />
                </el-select>
                <el-button
                  type="primary"
                  size="small"
                  :disabled="!canExecute"
                  :loading="flowStarting"
                  @click="handleExecute"
                >
                  <el-icon><VideoPlay /></el-icon> Execute
                </el-button>
                <el-tooltip content="Edit selected flow" placement="bottom">
                  <span class="action-wrap">
                    <el-button
                      size="small"
                      :disabled="!selectedFlowId || flowRunning || flowStarting"
                      @click="openFlowEditor"
                    >
                      <el-icon><Edit /></el-icon>
                    </el-button>
                  </span>
                </el-tooltip>
                <el-tooltip
                  v-if="selectedFlowId"
                  :content="runOptionsExpanded ? 'Hide run options' : 'Show run options'"
                  placement="bottom"
                >
                  <el-badge :value="configuredRunOptionsCount" :hidden="!configuredRunOptionsCount" class="options-badge">
                    <el-button
                      class="run-options-toggle"
                      size="small"
                      :type="runOptionsExpanded ? 'primary' : ''"
                      plain
                      circle
                      @click="runOptionsExpanded = !runOptionsExpanded"
                    >
                      <el-icon><Setting /></el-icon>
                    </el-button>
                  </el-badge>
                </el-tooltip>
              </div>
            </div>
            <div v-if="selectedFlowId && runOptionsExpanded" class="run-options">
              <span class="bar-label">Start From</span>
              <el-select
                v-model="startStepId"
                placeholder="Beginning"
                size="small"
                class="start-select"
                :disabled="flowRunning || flowStarting"
                @change="handleStartStepChange"
              >
                <el-option label="Beginning" value="" />
                <el-option
                  v-for="(node, index) in flowNodes"
                  :key="node.id"
                  :label="`${index + 1}. ${node.data?.name || node.data?.label || node.type}`"
                  :value="node.id"
                />
              </el-select>
              <el-button
                size="small"
                :disabled="flowRunning || flowStarting"
                @click="initialVariablesVisible = true"
              >
                <el-icon><Setting /></el-icon>
                Initial Variables
                <el-tag v-if="initialVariablesCount" size="small" type="info" effect="plain" class="vars-count">
                  {{ initialVariablesCount }}
                </el-tag>
              </el-button>
            </div>
          </div>
          <div v-if="selectedFlowId && flowNodes.length > 0" class="flow-canvas">
            <div v-if="selectedEngineId" class="engine-overlay">
              <div class="engine-overlay-name">{{ selectedEngine?.engineName }}</div>
              <div class="engine-overlay-info">{{ selectedEngine?.ip }}:{{ selectedEngine?.port }}</div>
              <el-tag v-if="engineStatus === 'running' || engineStatus === 'connected'" type="success" size="small" effect="dark">
                Connected
              </el-tag>
              <el-tag v-else-if="engineStatus === 'starting'" type="warning" size="small">
                Starting...
              </el-tag>
              <el-tag v-else type="info" size="small">Stopped</el-tag>
            </div>
            <VueFlow
              v-model:nodes="flowNodes"
              v-model:edges="flowEdges"
              :default-viewport="{ x: 50, y: 50, zoom: 0.8 }"
              :nodes-draggable="false"
              :nodes-connectable="false"
              :elements-selectable="false"
              :pan-on-drag="true"
              :pan-on-scroll="true"
              :zoom-on-scroll="false"
              fit-view-on-init
            >
              <template #node-send="props">
                <FlowNode :data="props.data" :selected="props.selected" type="send" />
              </template>
              <template #node-receive="props">
                <FlowNode :data="props.data" :selected="props.selected" type="receive" />
              </template>
              <template #node-delay="props">
                <FlowNode :data="props.data" :selected="props.selected" type="delay" />
              </template>
              <Background :gap="20" />
              <Controls position="bottom-left" />
              <MiniMap position="bottom-right" />
            </VueFlow>
          </div>
          <div v-else class="flow-empty">
            <el-icon :size="48" color="#c0c4cc"><SetUp /></el-icon>
            <p>Select a published flow to visualize</p>
          </div>
        </div>

        <!-- Right: Logs -->
        <div class="log-panel">
          <div class="panel-header">
            <span>Execution Logs</span>
            <span class="log-actions">
              <el-button
                size="small"
                circle
                :type="filterLinktest ? 'primary' : ''"
                @click="filterLinktest = !filterLinktest"
                :title="filterLinktest ? 'Showing: linktest filtered' : 'Showing: all messages'"
              >
                <el-icon><Connection /></el-icon>
              </el-button>
              <el-button size="small" circle @click="downloadLogs" title="Download Today's Log" :disabled="!selectedEngineId">
                <el-icon><Download /></el-icon>
              </el-button>
              <el-button size="small" circle @click="clearLogs" title="Clear Logs" :disabled="logLines.length === 0">
                <el-icon><Delete /></el-icon>
              </el-button>
            </span>
          </div>
          <div class="log-container" ref="logContainerRef"></div>
        </div>
      </div>

      <!-- Bottom Status Bar -->
      <div class="status-bar">
        <template v-if="flowRunning || lastStatus">
          <div class="status-item">
            <span class="status-label">Status</span>
            <el-tag :type="statusTagType" size="small">{{ runStatus?.status || 'idle' }}</el-tag>
          </div>
          <div class="status-item" v-if="runStatus?.stepName">
            <span class="status-label">Step</span>
            <span>{{ runStatus.currentIdx + 1 }}/{{ totalSteps }} &mdash; {{ runStatus.stepName }}</span>
          </div>
          <div class="status-item" v-if="runStatus?.message">
            <span class="status-label">Info</span>
            <span class="status-msg">{{ runStatus.message }}</span>
          </div>
        </template>
        <div v-else class="status-item status-idle">
          <span>Ready</span>
        </div>
      </div>
    </el-card>

    <el-dialog v-model="initialVariablesVisible" title="Initial Variables" width="460px" :destroy-on-close="false">
      <el-table :data="initialVariableRows" size="small" empty-text="No initial variables">
        <el-table-column label="Variable" min-width="150">
          <template #default="{ row }">
            <el-input v-if="!row.required" v-model="row.name" size="small" placeholder="Variable name" />
            <span v-else class="required-variable">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Value" min-width="190">
          <template #default="{ row }">
            <el-input v-model="row.value" size="small" />
          </template>
        </el-table-column>
        <el-table-column width="42">
          <template #default="{ $index, row }">
            <el-button v-if="!row.required" link type="danger" :icon="Delete" @click="removeInitialVariable($index)" />
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="addInitialVariable">
          <el-icon><Plus /></el-icon>
          Add Variable
        </el-button>
        <el-button type="primary" @click="initialVariablesVisible = false">Done</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  VideoPlay, SwitchButton, Delete, SetUp, Connection, Download, Edit, Setting, Plus
} from '@element-plus/icons-vue'
import { VueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import type { Node, Edge } from '@vue-flow/core'
import * as monaco from 'monaco-editor'
import { registerSMLLanguage } from '../utils/smlLanguage'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'
import { engineApi } from '../api/engine'
import { flowApi } from '../api/flow'
import { showEquipmentAlarm } from '../utils/alarmNotification'
import { engineWebSocketURL } from '../utils/runtimeConfig'
import type { Flow, FlowRunStatus } from '../types'
import FlowNode from './flow-editor/FlowNode.vue'

const route = useRoute()
const router = useRouter()

// ===== Engine State =====
const engines = ref<any[]>([])
const selectedEngineId = ref<number | null>(null)
const engineStatus = ref<string>('stopped')
const engineOperating = ref(false)

// ===== Flow State =====
const publishedFlows = ref<Flow[]>([])
const selectedFlowId = ref<number | null>(null)
const flowNodes = ref<Node[]>([])
const flowEdges = ref<Edge[]>([])
const totalSteps = ref(0)
const executedSteps = ref<Set<number>>(new Set())
const startStepId = ref('')

type InitialVariableRow = {
  name: string
  value: string
  required: boolean
}

const initialVariablesVisible = ref(false)
const initialVariableRows = ref<InitialVariableRow[]>([])
const runOptionsExpanded = ref(false)

// ===== Execution State =====
const flowStarting = ref(false)
const flowRunning = ref(false)
const runStatus = ref<FlowRunStatus | null>(null)
const lastStatus = ref(false)

// ===== WebSocket =====
let ws: WebSocket | null = null
const wsConnected = ref(false)

// ===== Logs =====
const logLines = ref<string[]>([])
const logContainerRef = ref<HTMLElement>()
let logEditor: monaco.editor.IStandaloneCodeEditor | null = null
const maxLogLines = 10000
const filterLinktest = ref(true)

// ===== Computed =====
const selectedEngine = computed(() => {
  return engines.value.find((e: any) => e.id === selectedEngineId.value) || null
})

const selectedFlow = computed(() => {
  return publishedFlows.value.find(f => f.id === selectedFlowId.value) || null
})

const availableEngines = computed(() => {
  if (!selectedFlow.value?.commMode) return engines.value
  return engines.value.filter((e: any) => e.mode === selectedFlow.value?.commMode)
})

const canExecute = computed(() => {
  return selectedEngineId.value && selectedFlowId.value && wsConnected.value && !flowRunning.value && !flowStarting.value
})

const statusTagType = computed(() => {
  const s = runStatus.value?.status
  if (s === 'running') return 'warning'
  if (s === 'completed') return 'success'
  if (s === 'error') return 'danger'
  if (s === 'stopped') return 'info'
  return 'info'
})

const selectedStartNode = computed(() => flowNodes.value.find(node => node.id === startStepId.value) || null)

const requiredStartVariables = computed(() => {
  if (!selectedStartNode.value) return []
  const result = new Set<string>()
  collectConfigVariables(selectedStartNode.value.data?.config, result)
  return [...result].sort()
})

const initialVariablesCount = computed(() => initialVariableRows.value.filter(row => row.name.trim()).length)
const configuredRunOptionsCount = computed(() => (
  (startStepId.value ? 1 : 0) + (initialVariablesCount.value > 0 ? 1 : 0)
))

function collectConfigVariables(value: unknown, result: Set<string>) {
  if (typeof value === 'string') {
    const pattern = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g
    let match: RegExpExecArray | null
    while ((match = pattern.exec(value)) !== null) result.add(match[1])
    return
  }
  if (Array.isArray(value)) {
    value.forEach(item => collectConfigVariables(item, result))
    return
  }
  if (value && typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach(item => collectConfigVariables(item, result))
  }
}

function syncStartMarker() {
  flowNodes.value = flowNodes.value.map(node => ({
    ...node,
    data: {
      ...node.data,
      _isStart: !!startStepId.value && node.id === startStepId.value,
    },
  }))
}

function handleStartStepChange() {
  const previousValues = new Map(initialVariableRows.value.map(row => [row.name.trim(), row.value]))
  const required = new Set(requiredStartVariables.value)
  initialVariableRows.value = [
    ...requiredStartVariables.value.map(name => ({
      name,
      value: previousValues.get(name) || '',
      required: true,
    })),
    ...initialVariableRows.value.filter(row => row.name.trim() && !required.has(row.name.trim())).map(row => ({
      ...row,
      required: false,
    })),
  ]
  syncStartMarker()
}

function addInitialVariable() {
  initialVariableRows.value.push({ name: '', value: '', required: false })
}

function removeInitialVariable(index: number) {
  initialVariableRows.value.splice(index, 1)
}

function initialVariablesPayload(): Record<string, string> {
  return Object.fromEntries(
    initialVariableRows.value
      .map(row => [row.name.trim(), row.value] as const)
      .filter(([name]) => !!name)
  )
}

function resetExecutionOptions() {
  startStepId.value = ''
  initialVariableRows.value = []
  initialVariablesVisible.value = false
  runOptionsExpanded.value = false
  syncStartMarker()
}

// ===== Data Loading =====
async function loadEngines() {
  try {
    const resp = await engineApi.getEngines({ page: 1, pageSize: 1000 })
    engines.value = resp.data?.data || []
  } catch { /* ignore */ }
}

async function loadPublishedFlows() {
  try {
    const resp = await flowApi.getAll({ page: 1, pageSize: 100, published: true })
    publishedFlows.value = resp.data?.data?.data || []
  } catch { /* ignore */ }
}

function queryNumber(value: unknown): number | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (raw === undefined || raw === null || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

async function applyRouteSelection() {
  const engineId = queryNumber(route.query.engineId)
  const flowId = queryNumber(route.query.flowId)

  if (!flowId) return

  if (!publishedFlows.value.some(f => f.id === flowId)) {
    try {
      const resp = await flowApi.getByID(flowId)
      const flow = resp.data?.data || resp.data
      if (flow) {
        publishedFlows.value = [flow, ...publishedFlows.value]
      }
    } catch {
      ElMessage.error('Failed to load selected flow')
      return
    }
  }

  selectedFlowId.value = flowId
  await onFlowChange(flowId)

  if (engineId) {
    if (availableEngines.value.some((e: any) => e.id === engineId)) {
      selectedEngineId.value = engineId
      onEngineChange(engineId)
    } else if (engines.value.some((e: any) => e.id === engineId)) {
      ElMessage.warning('Selected engine does not match flow mode')
    }
  }
}

// ===== Engine Control =====
function onEngineChange(id: number) {
  const engine = engines.value.find((e: any) => e.id === id)
  engineStatus.value = engine?.status || 'stopped'
  disconnectWs()
  flowRunning.value = false
  runStatus.value = null
  lastStatus.value = false
  // Auto-connect WebSocket if engine is already running/connected
  if (engine && (engine.status === 'running' || engine.status === 'connected')) {
    nextTick(() => connectWs())
  }
}

async function handleStartEngine() {
  if (!selectedEngineId.value) return
  engineOperating.value = true
  try {
    await engineApi.startEngine(selectedEngineId.value)
    engineStatus.value = 'starting'
    ElMessage.success('Engine starting...')
    pollEngineStatus()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.error || 'Failed to start engine')
  } finally {
    engineOperating.value = false
  }
}

async function handleStopEngine() {
  if (!selectedEngineId.value) return
  engineOperating.value = true
  try {
    disconnectWs()
    await engineApi.stopEngine(selectedEngineId.value)
    engineStatus.value = 'stopped'
    flowRunning.value = false
    ElMessage.success('Engine stopped')
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.error || 'Failed to stop engine')
  } finally {
    engineOperating.value = false
  }
}

function pollEngineStatus() {
  let attempts = 0
  const timer = setInterval(async () => {
    attempts++
    try {
      const resp = await engineApi.getEngines({ page: 1, pageSize: 1000 })
      const updated = (resp.data?.data || []).find((e: any) => e.id === selectedEngineId.value)
      if (updated) {
        engineStatus.value = updated.status
        if (updated.status === 'running' || updated.status === 'connected') {
          clearInterval(timer)
          connectWs()
          return
        }
        if (updated.status === 'error') {
          clearInterval(timer)
          return
        }
      }
    } catch { /* ignore */ }
    if (attempts >= 30) clearInterval(timer)
  }, 1000)
}

// ===== WebSocket =====
function connectWs() {
  if (!selectedEngineId.value || ws) return
  const engine = engines.value.find((e: any) => e.id === selectedEngineId.value)
  if (!engine) return

  ws = new WebSocket(engineWebSocketURL(engine.id))
  ws.onopen = () => {
    wsConnected.value = true
    addLog(`--- Connected to ${engine.engineName} ---`)
  }
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.type === 'log') {
        const dirLabel = data.direction === 'send' ? 'Send' : 'Receive'
        addLog(`${data.timestamp}   ${dirLabel}   ${data.content}`)
      } else if (data.type === 'alarm') {
        addLog(`${data.timestamp}   ALARM   ${data.content}`)
        showEquipmentAlarm({ engineName: data.engineName, content: data.content })
      } else if (data.type === 'status') {
        addLog(`${data.timestamp}   STATUS   ${data.content}`)
        if (data.content === 'disconnected') {
          wsConnected.value = false
        }
      } else if (data.type === 'flow_status') {
        handleFlowStatus(data.content)
      }
    } catch {
      addLog(event.data)
    }
  }
  ws.onclose = () => {
    wsConnected.value = false
    ws = null
  }
  ws.onerror = () => {
    ElMessage.error('WebSocket connection failed')
  }
}

function disconnectWs() {
  if (ws) {
    ws.close()
    ws = null
  }
  wsConnected.value = false
}

// ===== Flow Selection =====
async function onFlowChange(flowId: number) {
  flowRunning.value = false
  runStatus.value = null
  lastStatus.value = false
  resetExecutionOptions()
  if (selectedEngineId.value && !availableEngines.value.some((e: any) => e.id === selectedEngineId.value)) {
    selectedEngineId.value = null
    engineStatus.value = 'stopped'
    disconnectWs()
  }
  if (!flowId) {
    flowNodes.value = []
    flowEdges.value = []
    totalSteps.value = 0
    return
  }
  await loadFlowVisualization(flowId)
}

async function loadFlowVisualization(flowId: number) {
  try {
    const resp = await flowApi.getByID(flowId)
    const flow = resp.data?.data || resp.data
    if (!flow) return

    const steps = flow.steps || []
    totalSteps.value = steps.length
    const newNodes: Node[] = []
    const newEdges: Edge[] = []

    // Restore persisted layout
    let savedLayout: { edges?: any[]; positions?: Record<string, { x: number; y: number }> } = {}
    if (flow.edges) {
      try {
        const parsed = typeof flow.edges === 'string' ? JSON.parse(flow.edges) : flow.edges
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          savedLayout = parsed
        } else if (Array.isArray(parsed)) {
          savedLayout = { edges: parsed }
        }
      } catch { /* ignore */ }
    }

    steps.forEach((step: any, idx: number) => {
      let config: Record<string, any> = {}
      try {
        const raw = typeof step.config === 'string' ? JSON.parse(step.config) : step.config
        config = typeof raw === 'string' ? JSON.parse(raw) : raw
      } catch { config = {} }

      const nodeId = `step_${idx + 1}`
      const pos = savedLayout.positions?.[nodeId] || { x: 300, y: idx * 120 + 50 }

      newNodes.push({
        id: nodeId,
        type: step.type,
        position: { x: pos.x, y: pos.y },
        data: {
          stepType: step.type,
          name: step.name,
          config,
          label: step.name,
        },
      })
    })

    const validNodeIds = new Set(newNodes.map(node => node.id))

    // Restore user-created edges. Receive routing lines are rebuilt from
    // step configuration below so this view matches the editor.
    if (savedLayout.edges?.length) {
      savedLayout.edges.forEach((e: any) => {
        if (typeof e.id === 'string' && e.id.startsWith('_rule_')) return
        if (!validNodeIds.has(e.source) || !validNodeIds.has(e.target)) return
        newEdges.push({
          id: e.id,
          source: e.source,
          target: e.target,
          animated: true,
          style: { stroke: '#409eff', strokeWidth: 2 },
        })
      })
    }
    // Fallback: auto-connect sequential steps for flows without saved edges
    if (newEdges.length === 0 && newNodes.length > 1) {
      for (let idx = 1; idx < newNodes.length; idx++) {
        newEdges.push({
          id: `e-step_${idx}-step_${idx + 1}`,
          source: `step_${idx}`,
          target: `step_${idx + 1}`,
          animated: true,
          style: { stroke: '#409eff', strokeWidth: 2 },
        })
      }
    }
    appendReceiveRoutingEdges(newNodes, newEdges)

    flowNodes.value = newNodes
    flowEdges.value = newEdges
    syncStartMarker()
  } catch {
    ElMessage.error('Failed to load flow')
  }
}

function appendReceiveRoutingEdges(nodes: Node[], edges: Edge[]) {
  const edgeIds = new Set(edges.map(edge => edge.id))

  function addRoutingEdge(source: Node, targetIdx: number | undefined, suffix: string, label: string, color: string) {
    if (targetIdx === undefined || targetIdx === null) return
    const target = nodes[targetIdx]
    if (!target || target.id === source.id) return
    const id = `_rule_${source.id}_${suffix}`
    if (edgeIds.has(id)) return
    edgeIds.add(id)
    edges.push({
      id,
      source: source.id,
      target: target.id,
      label,
      animated: false,
      style: { stroke: color, strokeWidth: 1.5, strokeDasharray: '5 3' },
      labelStyle: { fontSize: '11px', fontWeight: '600' },
      labelBgStyle: { fill: '#fff', fillOpacity: 0.9 },
    })
  }

  nodes.forEach(node => {
    if (node.data?.stepType !== 'receive') return
    const config = node.data.config || {}
    if (Array.isArray(config.rules)) {
      config.rules.forEach((rule: Record<string, any>, index: number) => {
        const variable = rule.variable || '?'
        const value = rule.value || '?'
        const operator = rule.operator === 'equals' ? '=' : 'contains'
        addRoutingEdge(node, rule.targetStepIdx, `r${index}`, `${variable} ${operator} ${value}`, '#e6a23c')
      })
    }
    addRoutingEdge(node, config.defaultStepIdx, 'def', 'default', '#909399')
  })
}

// ===== Flow Execution =====
async function handleExecute() {
  if (!selectedEngineId.value || !selectedFlowId.value) return
  const initialVariables = initialVariablesPayload()
  const missingVariables = requiredStartVariables.value.filter(name => !initialVariables[name])
  if (missingVariables.length > 0) {
    initialVariablesVisible.value = true
    ElMessage.warning(`Provide initial values for: ${missingVariables.join(', ')}`)
    return
  }
  const startIdx = startStepId.value ? Math.max(0, flowNodes.value.findIndex(node => node.id === startStepId.value)) : 0
  flowStarting.value = true
  try {
    await flowApi.run(selectedFlowId.value, {
      engineId: selectedEngineId.value,
      startStepId: startStepId.value || undefined,
      initialVariables,
    })
    flowRunning.value = true
    lastStatus.value = true
    executedSteps.value = new Set()
    runStatus.value = { flowId: selectedFlowId.value, engineId: selectedEngineId.value, status: 'running', currentIdx: startIdx, startStepIdx: startIdx, stepName: '' }
    highlightStep(startIdx)
    const startLabel = selectedStartNode.value?.data?.name || selectedStartNode.value?.data?.label
    addLog(startLabel ? `--- Flow execution started from step ${startIdx + 1}: ${startLabel} ---` : '--- Flow execution started ---')
    ElMessage.success('Flow started')
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.error || 'Failed to start flow')
  } finally {
    flowStarting.value = false
  }
}

function openFlowEditor() {
  if (!selectedFlowId.value) return
  router.push(`/flow/${selectedFlowId.value}/edit`)
}

// ===== Status Polling =====
function handleFlowStatus(content: string | object) {
  const status = typeof content === 'string' ? JSON.parse(content) : content
  if (!status || status.flowId !== selectedFlowId.value) return

  runStatus.value = status
  highlightStep(status.currentIdx)

  if (status.status === 'completed' || status.status === 'error' || status.status === 'stopped') {
    flowRunning.value = false
    lastStatus.value = true
    if (status.status === 'completed') {
      highlightStep(status.currentIdx, true)
    }
    addLog(`--- Flow ${status.status}${status.message ? ': ' + status.message : ''} ---`)
  }
}

function highlightStep(idx: number, done: boolean = false) {
  const stepIdx = idx + 1
  executedSteps.value.add(stepIdx)

  flowNodes.value = flowNodes.value.map(n => {
    const nodeIdx = parseInt(n.id.replace('step_', ''))
    const wasExecuted = executedSteps.value.has(nodeIdx)
    const isCurrent = nodeIdx === stepIdx
    const isDone = wasExecuted && (nodeIdx < stepIdx || (isCurrent && done))
    return {
      ...n,
      data: {
        ...n.data,
        _execState: isDone ? 'done' : wasExecuted ? 'running' : 'pending',
      },
    }
  })

  flowEdges.value = flowEdges.value.map(e => {
    const srcIdx = parseInt(e.source.replace('step_', ''))
    const tgtIdx = parseInt(e.target.replace('step_', ''))
    const srcExecuted = executedSteps.value.has(srcIdx)
    const tgtExecuted = executedSteps.value.has(tgtIdx)
    const isCompleted = tgtExecuted && (tgtIdx < stepIdx || (tgtIdx === stepIdx && done))
    const isActive = !done && srcExecuted && tgtIdx === stepIdx
    return {
      ...e,
      style: {
        ...(e.style || {}),
        stroke: isCompleted || isActive ? '#67c23a' : '#c0c4cc',
      },
      animated: isActive,
    }
  })
}


// ===== Logs =====
function addLog(line: string) {
  if (filterLinktest.value && line.includes('LINKTEST')) return
  logLines.value.push(line)
  if (logLines.value.length > maxLogLines) {
    logLines.value = logLines.value.slice(-maxLogLines)
  }
  if (logEditor) {
    const model = logEditor.getModel()
    if (model) {
      const text = logLines.value.join('\n')
      model.setValue(text)
      logEditor.revealLine(model.getLineCount())
    }
  }
}

function clearLogs() {
  logLines.value = []
  if (logEditor) {
    const model = logEditor.getModel()
    if (model) model.setValue('')
  }
}

async function downloadLogs() {
  if (!selectedEngineId.value) {
    ElMessage.warning('Please select an engine first')
    return
  }
  const today = new Date().toISOString().slice(0, 10)

  try {
    const blobData = await engineApi.downloadLogs(selectedEngineId.value, today, today, false)
    const blob = new Blob([blobData])
    const url = window.URL.createObjectURL(blob)
    const filename = `${selectedEngine.value?.engineName || 'Engine'}_${today.replace(/-/g, '')}.log`

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

function initLogEditor() {
  if (!logContainerRef.value) return
  registerSMLLanguage()
  logEditor = monaco.editor.create(logContainerRef.value, {
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
    lineDecorationsWidth: 4,
    lineNumbersMinChars: 4,
    renderLineHighlight: 'none',
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    overviewRulerBorder: false,
    scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
  })
}

// ===== Lifecycle =====
onMounted(async () => {
  await Promise.all([loadEngines(), loadPublishedFlows()])
  await applyRouteSelection()
  nextTick(() => initLogEditor())
})

onUnmounted(() => {
  disconnectWs()
  if (logEditor) {
    logEditor.dispose()
    logEditor = null
  }
})
</script>

<style scoped>
.auto-secs-page {
  height: 100%;
  box-sizing: border-box;
  padding: 4px 4px 16px 4px;
}

.auto-secs-page :deep(.el-card) {
  height: calc(100vh - 85px);
  min-height: 400px;
}

.auto-secs-page :deep(.el-card__body) {
  height: 100%;
  padding: 0;
  display: flex;
  flex-direction: column;
}

/* ===== Panel Headers ===== */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  font-size: 12px;
  font-weight: 600;
  color: #606266;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}

.log-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.flow-panel .panel-header {
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}

.header-divider {
  width: 1px;
  height: 20px;
  background: #dcdfe6;
  flex-shrink: 0;
}

.bar-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.run-options {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid #e4e7ed;
}

.run-options-toggle {
  display: inline-flex;
  align-items: center;
}

.options-badge :deep(.el-badge__content) {
  transform: translate(45%, -45%);
}

.start-select {
  flex: 1;
  min-width: 140px;
}

.vars-count {
  margin-left: 6px;
}

.required-variable {
  font-family: 'Courier New', monospace;
  color: #303133;
}

.bar-label {
  font-size: 12px;
  font-weight: 600;
  color: #606266;
  white-space: nowrap;
  min-width: 44px;
  text-transform: none;
}

.engine-info {
  font-size: 12px;
  color: #909399;
  font-family: 'Courier New', monospace;
}

/* ===== Main Content ===== */
.main-content {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* Left: Flow Panel */
.flow-panel {
  width: 45%;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e4e7ed;
  background: #fafbfc;
  flex-shrink: 0;
}

.flow-panel-empty {
  background: #fff;
}

.flow-canvas {
  flex: 1;
  position: relative;
  min-height: 0;
}

.engine-overlay {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 10;
  background: rgba(255, 255, 255, 0.88);
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 12px;
  pointer-events: none;
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.engine-overlay-name {
  font-weight: 600;
  color: #303133;
}

.engine-overlay-info {
  color: #909399;
  font-family: 'Courier New', monospace;
  margin-bottom: 2px;
}

.flow-canvas :deep(.vue-flow) {
  width: 100%;
  height: 100%;
}

.flow-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #c0c4cc;
}

.flow-empty p {
  margin-top: 12px;
  font-size: 14px;
}

/* Right: Log Panel */
.log-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: #fff;
}

.log-container {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* ===== Bottom Status Bar ===== */
.status-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 6px 16px;
  background: #f5f7fa;
  border-top: 1px solid #e4e7ed;
  font-size: 13px;
  flex-shrink: 0;
  min-height: 32px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-label {
  color: #909399;
  font-weight: 600;
}

.status-msg {
  color: #606266;
}

.status-idle {
  color: #c0c4cc;
}
</style>
