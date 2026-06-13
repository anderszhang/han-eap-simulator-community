<template>
  <el-divider content-position="left">Checklist Binding</el-divider>
  <el-form-item label="Binding">
    <el-select :model-value="bindingKind" placeholder="None" clearable style="width: 100%" size="small" @change="setBindingKind">
      <el-option label="None" value="" />
      <template v-if="stepType === 'send'">
        <el-option label="Same-name SML" value="sendSmlByName" />
        <el-option label="Query VID (S1F3)" value="queryVid" />
        <el-option label="Send Event (S6F11)" value="event" />
      </template>
      <template v-if="stepType === 'receive'">
        <el-option label="Receive Event (S6F11)" value="receiveEvent" />
      </template>
    </el-select>
  </el-form-item>

  <template v-if="bindingKind === 'event' || bindingKind === 'receiveEvent'">
    <el-form-item label="CEID">
      <el-input
        :model-value="binding.ceid || ''"
        placeholder="Checklist CEID name, e.g. CarrierArrived"
        size="small"
        @update:model-value="(value: string) => setBindingField('ceid', value)"
      />
    </el-form-item>
    <el-form-item v-if="bindingKind === 'event'" label="DATAID">
      <el-input
        :model-value="binding.dataId || ''"
        placeholder="Default 0"
        size="small"
        @update:model-value="(value: string) => setBindingField('dataId', value)"
      />
    </el-form-item>
    <el-form-item v-if="bindingKind === 'receiveEvent'" label="Extract VIDs">
      <el-input
        :model-value="csvValue(binding.extractVids)"
        placeholder="Optional, comma separated. Empty = all"
        size="small"
        @update:model-value="(value: string) => setBindingList('extractVids', value)"
      />
    </el-form-item>
    <el-form-item v-if="bindingKind === 'receiveEvent'" label="Target #">
      <el-input-number
        :model-value="binding.targetStepIdx === undefined ? undefined : Number(binding.targetStepIdx) + 1"
        :min="1"
        :max="nodes.length || 1"
        controls-position="right"
        style="width: 100%"
        size="small"
        @update:model-value="(value: number | undefined) => setTargetStep(value)"
      />
    </el-form-item>
  </template>

  <template v-if="bindingKind === 'queryVid'">
    <el-form-item label="Keywords">
      <el-input
        :model-value="csvValue(binding.keywords)"
        placeholder="accessmode, controlstate..."
        size="small"
        @update:model-value="(value: string) => setBindingList('keywords', value)"
      />
    </el-form-item>
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type BindingConfig = Record<string, any>

const props = defineProps<{
  config: Record<string, any>
  stepType: string
  nodes: any[]
}>()

const emit = defineEmits<{
  (e: 'change'): void
}>()

const binding = computed<BindingConfig>(() => props.config.binding || {})
const bindingKind = computed(() => String(binding.value.kind || ''))

function setBindingKind(kind: string) {
  if (!kind) {
    delete props.config.binding
    emit('change')
    return
  }
  props.config.binding = { ...(props.config.binding || {}), kind }
  emit('change')
}

function setBindingField(key: string, value: unknown) {
  if (!props.config.binding) props.config.binding = { kind: bindingKind.value }
  if (value === undefined || value === '') {
    delete props.config.binding[key]
  } else {
    props.config.binding[key] = value
  }
  emit('change')
}

function setBindingList(key: string, value: string) {
  const items = value.split(',').map(item => item.trim()).filter(Boolean)
  setBindingField(key, items.length ? items : undefined)
}

function setTargetStep(value: number | undefined) {
  setBindingField('targetStepIdx', value === undefined ? undefined : Math.max(0, Number(value) - 1))
}

function csvValue(value: unknown): string {
  return Array.isArray(value) ? value.join(', ') : ''
}
</script>
