<template>
  <el-form-item label="Name">
    <el-input v-model="stepName" placeholder="Step name" />
  </el-form-item>
  <el-form-item label="Match SxFy">
    <el-input v-model="config.matchSxFy" placeholder="e.g. S6F12" />
  </el-form-item>
  <el-form-item label="Timeout(s)">
    <el-input-number v-model="config.timeout" :min="1" :max="600" controls-position="right" style="width: 100%" />
  </el-form-item>

    <el-collapse v-model="activeSections" class="receive-collapse">
      <el-collapse-item name="variables">
        <template #title>
          <span class="collapse-title">Variables</span>
          <el-tag size="small" effect="plain">{{ variableCount }}</el-tag>
        </template>
        <el-tabs v-model="varTab" class="receive-tabs" lazy>
          <el-tab-pane label="Node Var" name="node">
            <div v-for="(v, idx) in config.nodeVariables" :key="'nv'+idx" class="rule-row" style="margin-bottom: 6px">
              <el-input v-model="v.indexPath" placeholder="0,0" size="small" style="flex: 1" @click="openSmlPicker('nodeVariables', idx as number)" />
              <el-tag type="info" class="var-arrow-tag">></el-tag>
              <el-input v-model="v.name" placeholder="Name" size="small" style="width: 120px" />
              <el-button text type="danger" :icon="Close" size="small" @click="config.nodeVariables.splice(idx, 1)" />
            </div>
            <el-button type="primary" link size="small" @click="addVar('nodeVariables')" class="add-btn">
              <el-icon><Plus /></el-icon> Add Variable
            </el-button>
          </el-tab-pane>
          <el-tab-pane label="Flow Var" name="flow">
            <div v-for="(v, idx) in config.flowVariables" :key="'fv'+idx" class="rule-row" style="margin-bottom: 6px">
              <el-input v-model="v.indexPath" placeholder="0,0" size="small" style="flex: 1" @click="openSmlPicker('flowVariables', idx as number)" />
              <el-tag type="info" class="var-arrow-tag">></el-tag>
              <el-input v-model="v.name" placeholder="Name" size="small" style="width: 120px" />
              <el-button text type="danger" :icon="Close" size="small" @click="config.flowVariables.splice(idx, 1)" />
            </div>
            <el-button type="primary" link size="small" @click="addVar('flowVariables')" class="add-btn">
              <el-icon><Plus /></el-icon> Add Variable
            </el-button>
          </el-tab-pane>
          <el-tab-pane label="Computed" name="computed">
            <div v-for="(cv, idx) in config.computedVariables" :key="'cv'+idx" class="rule-item compact">
              <div class="rule-row">
                <el-input v-model="cv.name" placeholder="Var Name" size="small" style="width: 100px" />
                <el-select v-model="cv.functionId" placeholder="Function" size="small" style="flex: 1" @change="onComputedFnChange(cv)">
                  <el-option v-for="fn in flowFunctions" :key="fn.id" :label="fn.name" :value="fn.id">
                    <span>{{ fn.name }}</span>
                    <el-tag size="small" :type="fn.scope === 'global' ? '' : 'warning'" style="margin-left: 8px">{{ fn.scope === 'global' ? 'G' : 'F' }}</el-tag>
                  </el-option>
                </el-select>
                <el-button text type="danger" :icon="Close" size="small" @click="config.computedVariables.splice(idx, 1)" />
              </div>
              <template v-if="getFnParams(cv.functionId).length > 0">
                <div v-for="p of getFnParams(cv.functionId)" :key="p" class="rule-row" style="margin-top: 2px">
                  <span class="cv-param-label">{{ p }}:</span>
                  <el-input
                    :model-value="(cv.params || {})[p] || ''"
                    @update:model-value="(v: string) => setCvParam(cv, p, v)"
                    :placeholder="p"
                    size="small"
                    style="flex: 1"
                  />
                </div>
              </template>
            </div>
            <el-button type="primary" link size="small" @click="addComputedVariable" class="add-btn">
              <el-icon><Plus /></el-icon> Add
            </el-button>
          </el-tab-pane>
        </el-tabs>
      </el-collapse-item>

      <el-collapse-item name="rules">
        <template #title>
          <span class="collapse-title">Match Rules</span>
          <el-tag size="small" effect="plain" :type="config.rules?.length ? 'warning' : 'info'">{{ config.rules?.length || 0 }}</el-tag>
        </template>
        <div v-for="(rule, idx) in config.rules" :key="idx" class="rule-item">
          <div class="rule-heading">
            <span>Rule {{ Number(idx) + 1 }}</span>
            <el-tag v-if="isRuleIncomplete(rule)" type="warning" size="small" effect="plain">Incomplete</el-tag>
          </div>
          <div class="rule-row">
            <el-select v-model="rule.variable" style="flex: 1" size="small" clearable placeholder="Variable">
              <el-option-group label="Node">
                <el-option v-for="nv in config.nodeVariables" :key="'n'+nv.name" :label="nv.name || '?'" :value="nv.name" />
              </el-option-group>
              <el-option-group label="Flow">
                <el-option v-for="fv in config.flowVariables" :key="'f'+fv.name" :label="fv.name || '?'" :value="fv.name" />
              </el-option-group>
            </el-select>
            <el-button type="danger" :icon="Delete" circle size="small" @click="config.rules.splice(idx, 1)" />
          </div>
          <div class="rule-row">
            <el-select v-model="rule.operator" style="width: 100px" size="small">
              <el-option label="Contains" value="contains" />
              <el-option label="Equals" value="equals" />
            </el-select>
            <el-input v-model="rule.value" placeholder="Value" size="small" style="flex: 1" />
          </div>
          <el-form-item label="Target →" class="rule-target">
            <el-select v-model="rule.targetStepIdx" style="width: 100%" size="small">
              <el-option v-for="option in targetOptions" :key="option.node.id" :label="targetLabel(option.node)" :value="option.index" />
            </el-select>
          </el-form-item>
        </div>
        <el-button type="primary" link size="small" @click="addRule" class="add-btn">
          <el-icon><Plus /></el-icon> Add Rule
        </el-button>

        <el-form-item label="Default →">
          <el-select v-model="config.defaultStepIdx" style="width: 100%" size="small" clearable placeholder="Next step">
            <el-option v-for="(n, ni) in sortedNodes" :key="n.id" :label="targetLabel(n)" :value="ni" />
          </el-select>
        </el-form-item>
      </el-collapse-item>
    </el-collapse>

    <SmlPickerDialog
      v-model="smlPickerVisible"
      :initial-path="smlPickerInitialPath"
      :initial-sml-id="smlPickerInitialSmlId"
      :sml-tree="smlList"
      @confirm="onSmlPickerConfirm"
    />

</template>

<script setup lang="ts">
import { ref, computed, inject, watch } from 'vue'
import { Close, Delete, Plus } from '@element-plus/icons-vue'
import SmlPickerDialog from '../common/SmlPickerDialog.vue'
import type { FlowFunction } from '../../types'
import type { Node } from '@vue-flow/core'

const onRuleConfigChange = inject<() => void>('onRuleConfigChange', () => {})

const props = defineProps<{
  nodeData: {
    stepType: string
    name: string
    config: Record<string, any>
    label: string
  }
  nodeId: string
  flowFunctions: FlowFunction[]
  nodes: Node[]
  smlList?: any[]
}>()

const varTab = ref('node')
const activeSections = ref(['variables', 'rules'])
const smlPickerVisible = ref(false)
const smlPickerTarget = ref<{ key: 'nodeVariables' | 'flowVariables'; idx: number } | null>(null)
const smlPickerInitialPath = ref('')
const smlPickerInitialSmlId = ref<number | null>(null)

const config = computed(() => props.nodeData.config)
const variableCount = computed(() => (
  (config.value.nodeVariables?.length || 0) +
  (config.value.flowVariables?.length || 0) +
  (config.value.computedVariables?.length || 0)
))
const stepName = computed({
  get: () => props.nodeData.name || '',
  set: (val) => {
    props.nodeData.name = val
    props.nodeData.label = val
  },
})
const sortedNodes = computed(() => [...props.nodes].sort((a, b) => a.position.y - b.position.y))
const targetOptions = computed(() => sortedNodes.value
  .map((node, index) => ({ node, index }))
  .filter(option => option.node.id !== props.nodeId)
)

function targetLabel(node: Node): string {
  const idx = sortedNodes.value.findIndex(n => n.id === node.id)
  const name = node.data?.name || node.data?.stepType || 'Step'
  return `Step ${idx + 1}: ${name}`
}

function isRuleIncomplete(rule: Record<string, any>): boolean {
  return !rule.operator || !rule.value || rule.targetStepIdx === undefined || rule.targetStepIdx === null
}

function addVar(key: 'nodeVariables' | 'flowVariables') {
  const arr = config.value[key] || []
  arr.push({ name: '', indexPath: '' })
  config.value[key] = arr
  onRuleConfigChange()
}

function openSmlPicker(key: 'nodeVariables' | 'flowVariables', idx: number) {
  smlPickerTarget.value = { key, idx }
  smlPickerInitialPath.value = config.value[key]?.[idx]?.indexPath || ''
  smlPickerInitialSmlId.value = config.value.smlId || null
  smlPickerVisible.value = true
}

function onSmlPickerConfirm(payload: { indexPath: string; smlId?: number }) {
  if (!smlPickerTarget.value) return
  const { key, idx } = smlPickerTarget.value
  const arr = config.value[key] || []
  if (arr[idx]) {
    arr[idx].indexPath = payload.indexPath
    config.value[key] = [...arr]
    onRuleConfigChange()
  }
  if (payload.smlId) {
    config.value.smlId = payload.smlId
  }
  smlPickerVisible.value = false
}

function addComputedVariable() {
  const vars = config.value.computedVariables || []
  vars.push({ name: '', functionId: 0 })
  config.value.computedVariables = vars
  onRuleConfigChange()
}

function addRule() {
  const rules = config.value.rules || []
  rules.push({ operator: 'equals', variable: '', value: '', targetStepIdx: undefined })
  config.value.rules = rules
  onRuleConfigChange()
}

function getFnParams(fnId: number): string[] {
  const fn = props.flowFunctions.find(f => f.id === fnId)
  if (!fn) return []
  try {
    const parsed = JSON.parse(fn.params || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

function onComputedFnChange(cv: Record<string, any>) {
  const params = getFnParams(cv.functionId)
  const newParams: Record<string, string> = {}
  for (const p of params) {
    newParams[p] = (cv.params || {})[p] || ''
  }
  cv.params = newParams
}

function setCvParam(cv: Record<string, any>, paramName: string, value: string) {
  if (!cv.params) cv.params = {}
  cv.params[paramName] = value
}

// Watch rules/target changes that happen via v-model in template
watch(() => config.value.rules, () => onRuleConfigChange(), { deep: true })
watch(() => config.value.defaultStepIdx, () => onRuleConfigChange())
</script>

<style scoped>
.rule-item {
  padding: 8px;
  margin-bottom: 8px;
  background: #f5f7fa;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
}

.rule-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  color: #606266;
  font-size: 12px;
  font-weight: 600;
}

.rule-row {
  display: flex;
  gap: 6px;
  align-items: center;
}

.rule-target {
  margin-bottom: 0 !important;
}

.rule-target :deep(.el-form-item__label) {
  font-size: 11px;
  padding-right: 4px;
}

.rule-item.compact {
  padding: 6px 8px;
  margin-bottom: 4px;
}

.add-btn {
  margin-bottom: 10px;
}

.var-arrow-tag {
  flex-shrink: 0;
}

.cv-param-label {
  font-size: 11px;
  color: #909399;
  min-width: 50px;
  text-align: right;
}

.receive-tabs {
  margin-top: 4px;
}

.receive-collapse {
  margin-top: 8px;
}

.receive-collapse :deep(.el-collapse-item__header) {
  height: 34px;
  font-size: 12px;
  font-weight: 600;
}

.receive-collapse :deep(.el-collapse-item__content) {
  padding-bottom: 8px;
}

.collapse-title {
  margin-right: 8px;
}

.receive-tabs :deep(.el-tabs__header) {
  margin: 0 0 8px;
}

.receive-tabs :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
}

.receive-tabs :deep(.el-tabs__item) {
  font-size: 12px;
  height: 28px;
  line-height: 28px;
  padding: 0 14px;
}

.receive-tabs :deep(.el-tabs__content) {
  padding: 0;
}

</style>
