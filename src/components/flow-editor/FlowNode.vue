<template>
  <div class="flow-node" :class="['node-' + type, execClass, { selected, 'has-warning': hasWarning, 'is-start': data._isStart }]">
    <Handle type="target" :position="Position.Top" />
    <!-- Left status bar for exec state -->
    <div v-if="execState" class="node-status-bar" :class="'bar-' + execState"></div>
    <!-- Done checkmark -->
    <div v-if="execState === 'done'" class="node-check">✓</div>
    <div v-if="data._isStart" class="node-start">START</div>
    <div class="node-header">
      <div class="node-dot" :style="{ backgroundColor: colors[type] }"></div>
      <span v-if="stepIndex" class="node-step">#{{ stepIndex }}</span>
      <span class="node-type">{{ type.toUpperCase() }}</span>
      <span class="node-name">{{ getNodeLabel() }}</span>
      <span v-if="hasWarning" class="node-warning" :title="warningText">!</span>
    </div>
    <div class="node-body">
      <template v-if="type === 'send'">
        <span v-if="data.config?.sml" class="node-preview">{{ previewText(data.config.sml) }}</span>
        <span v-if="!data.config?.smlName && !data.config?.sml" class="node-empty">Click to set SML</span>
      </template>
      <template v-if="type === 'receive'">
        <span>Match: <b>{{ data.config?.matchSxFy || '?' }}</b></span>
        <span>Timeout: {{ data.config?.timeout || 30 }}s</span>
        <template v-if="data.config?.rules?.length">
          <div v-for="(rule, i) in data.config.rules" :key="i" class="node-rule">
            <span v-if="rule.variable">{{ rule.variable }} {{ operatorLabel(rule.operator) }} "{{ rule.value || '?' }}" → #{{ rule.targetStepIdx }}</span>
            <span v-else>{{ operatorLabel(rule.operator) }} "{{ rule.value || '?' }}" → #{{ rule.targetStepIdx }}</span>
          </div>
          <span class="node-branch">Default → #{{ data.config?.defaultStepIdx ?? 'next' }}</span>
        </template>
        <template v-if="data.config?.flowVariables?.length">
          <span class="node-vars">{{ data.config.flowVariables.filter((v: Record<string,string>) => v.name).map((v: Record<string,string>) => '{' + v.name + '}').join(' ') }}</span>
        </template>
        <template v-if="data.config?.computedVariables?.length">
          <span class="node-computed">{{ data.config.computedVariables.filter((v: Record<string,any>) => v.name).map((v: Record<string,any>) => '{' + v.name + '}').join(' ') }}</span>
        </template>
      </template>
      <template v-if="type === 'delay'">
        <span class="node-delay">{{ data.config?.milliseconds || 0 }}ms</span>
      </template>
    </div>
    <Handle type="source" :position="Position.Bottom" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'

const props = defineProps<{
  data: {
    stepType: string
    name: string
    config: Record<string, any>
    label: string
    _execState?: string
    _isStart?: boolean
  }
  selected?: boolean
  type: string
  stepIndex?: number
}>()

const colors: Record<string, string> = {
  send: '#67c23a',
  receive: '#e6a23c',
  delay: '#909399',
  function: '#409eff',
}

const execState = computed(() => props.data?._execState || '')

const execClass = computed(() => {
  const s = execState.value
  if (s === 'running') return 'exec-running'
  if (s === 'done') return 'exec-done'
  if (s === 'pending') return 'exec-pending'
  return ''
})

const warningText = computed(() => {
  if (props.type === 'send' && !props.data?.config?.sml) return 'Missing SML'
  if (props.type === 'receive' && !props.data?.config?.matchSxFy) return 'Missing match SxFy'
  if (props.type === 'delay' && !props.data?.config?.milliseconds) return 'Missing delay'
  return ''
})

const hasWarning = computed(() => !!warningText.value)

function previewText(sml: string): string {
  if (!sml) return ''
  const first = sml.split('\n')[0]
  return first.length > 30 ? first.slice(0, 30) + '...' : first
}

function operatorLabel(operator?: string): string {
  if (operator === 'contains') return 'Contains'
  if (operator === 'not_equals') return 'Not Equal'
  return 'Equals'
}

function getNodeLabel(): string {
  if (props.type === 'send' && props.data?.config?.smlName) {
    return props.data.config.smlName
  }
  return props.data.name || props.type
}
</script>

<style scoped>
.flow-node {
  min-width: 180px;
  max-width: 240px;
  background: #fff;
  border-radius: 8px;
  border: 2px solid #e4e7ed;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  font-size: 12px;
  transition: border-color 0.3s, box-shadow 0.3s, background-color 0.3s;
  position: relative;
}

.flow-node.selected {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2), 0 2px 8px rgba(0, 0, 0, 0.1);
}

.flow-node.has-warning {
  border-color: #e6a23c;
}

.flow-node:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.flow-node.is-start {
  border-color: #409eff;
}

.node-start {
  position: absolute;
  top: -11px;
  left: 8px;
  padding: 1px 5px;
  border-radius: 3px;
  background: #409eff;
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  line-height: 14px;
}

/* ===== Execution States ===== */

/* Running: orange left bar + pulse glow */
.exec-running {
  border-color: #e6a23c;
  background: #fdf6ec;
  box-shadow: 0 0 12px rgba(230, 162, 60, 0.35);
  animation: exec-pulse 1.5s ease-in-out infinite;
}

@keyframes exec-pulse {
  0%, 100% { box-shadow: 0 0 8px rgba(230, 162, 60, 0.25); }
  50% { box-shadow: 0 0 18px rgba(230, 162, 60, 0.55); }
}

.exec-running .node-status-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: #e6a23c;
  border-radius: 8px 0 0 8px;
}

.exec-running .node-status-bar.bar-running {
  background: linear-gradient(180deg, #f5c06a, #e6a23c);
}

/* Done: green left bar + green bg + checkmark */
.exec-done {
  border-color: #67c23a;
  background: #f0f9eb;
}

.exec-done .node-status-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: #67c23a;
  border-radius: 8px 0 0 8px;
}

.node-check {
  position: absolute;
  top: 2px;
  right: 6px;
  font-size: 13px;
  font-weight: 700;
  color: #67c23a;
  line-height: 1;
}

/* Pending: dimmed */
.exec-pending {
  opacity: 0.55;
}

/* ===== Node Inner Layout ===== */

.node-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px 4px;
}

.node-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.node-type {
  font-weight: 700;
  font-size: 11px;
  text-transform: uppercase;
  color: #606266;
  letter-spacing: 0.5px;
}

.node-step {
  flex-shrink: 0;
  padding: 0 4px;
  border-radius: 3px;
  background: #f5f7fa;
  color: #606266;
  font-size: 10px;
  font-weight: 700;
  line-height: 16px;
}

.node-name {
  font-size: 12px;
  color: #303133;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.node-warning {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fdf6ec;
  color: #e6a23c;
  border: 1px solid #f3d19e;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
}

.node-body {
  padding: 4px 10px 8px;
  color: #606266;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.node-body b {
  color: #303133;
}

.node-preview {
  color: #67c23a;
  font-family: 'Courier New', monospace;
  font-size: 11px;
}

.node-empty {
  color: #c0c4cc;
  font-style: italic;
}

.node-delay {
  font-size: 16px;
  font-weight: 700;
  color: #909399;
}

.node-branch {
  font-size: 11px;
  color: #909399;
}

.node-rule {
  font-size: 11px;
  color: #409eff;
}

.node-vars {
  font-size: 11px;
  color: #67c23a;
  font-family: 'Courier New', monospace;
}

.node-computed {
  font-size: 11px;
  color: #e6a23c;
  font-family: 'Courier New', monospace;
}

/* ===== Enlarge connection handle hit-area without visual bulk ===== */
.flow-node :deep(.vue-flow__handle) {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #409eff;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px rgba(64, 158, 255, 0.4);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.flow-node :deep(.vue-flow__handle:hover) {
  transform: scale(1.6);
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.25);
}

/* Larger invisible hit-area around the handle */
.flow-node :deep(.vue-flow__handle::before) {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: transparent;
}
</style>
