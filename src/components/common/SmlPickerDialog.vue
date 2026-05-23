<template>
  <el-dialog
    v-model="visible"
    title="Pick Index Path"
    width="900px"
    :append-to-body="true"
    @closed="onClosed"
  >
    <div class="sml-picker-toolbar">
      <el-radio-group v-model="nodeTypeFilter" size="small">
        <el-radio-button value="">All</el-radio-button>
        <el-radio-button value="EQP">EQP</el-radio-button>
        <el-radio-button value="HOST">HOST</el-radio-button>
      </el-radio-group>
      <el-tree-select
        v-model="selectedSmlId"
        :data="filteredSmlTree"
        node-key="id"
        :default-expanded-keys="defaultExpandedKeys"
        :props="{ label: 'name', children: 'children', disabled: 'disabled' }"
        placeholder="Select SML file..."
        style="flex: 1; margin-left: 8px"
        clearable
        @change="onSmlSelected"
      />
    </div>
    <div class="sml-picker-split">
      <div class="sml-picker-left">
        <div ref="monacoContainerRef" class="monaco-container"></div>
      </div>
      <div class="sml-picker-right">
        <el-tree
          v-if="smlTreeData.length"
          ref="smlTreeRef"
          :data="smlTreeData"
          :props="{ label: 'label', children: 'children' }"
          node-key="key"
          :default-expanded-keys="treeExpandedKeys"
          highlight-current
          @node-click="onSmlTreeNodeClick"
          style="height: 100%; overflow: auto;"
        />
        <el-empty v-else description="Select an SML file or paste content" style="padding-top: 60px" />
      </div>
    </div>


    <template #footer>
      <div class="sml-picker-footer">
        <span v-if="selectedTreeNode" class="sml-picker-preview">
          Path: <strong>{{ selectedTreeNode.indexPath }}</strong> ({{ selectedTreeNode.type }})
        </span>
        <span v-else class="sml-picker-preview">Click a tree node to select path</span>
        <div>
          <el-button size="small" @click="visible = false">Cancel</el-button>
          <el-button type="primary" size="small" :disabled="!selectedTreeNode" @click="confirm">Confirm</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'

import * as monaco from 'monaco-editor'
import { parseSMLToTree, type SMLTreeNode } from '../../utils/smlParser'
import { registerSMLLanguage } from '../../utils/smlLanguage'
import { smlApi } from '../../api/sml'
import type { SMLNode } from '../../types'

const props = defineProps<{
  modelValue: boolean
  initialPath?: string
  initialSmlId?: number | null
  smlTree?: SMLNode[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', payload: { indexPath: string; smlId?: number }): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const nodeTypeFilter = ref('')
const selectedSmlId = ref<number | null>(null)
const selectedSmlName = ref('')
const smlPickerInput = ref('')
const smlTreeData = ref<SMLTreeNode[]>([])
const selectedTreeNode = ref<SMLTreeNode | null>(null)
const monacoContainerRef = ref<HTMLElement>()
const smlTreeRef = ref<any>(null)
let monacoEditor: monaco.editor.IStandaloneCodeEditor | null = null
let parseTimer: ReturnType<typeof setTimeout> | null = null

const filteredSmlTree = computed(() => {
  if (!props.smlTree?.length) return []
  if (!nodeTypeFilter.value) return props.smlTree
  return props.smlTree.filter((n: SMLNode) => n.nodeType === nodeTypeFilter.value)
})

const defaultExpandedKeys = computed(() => {
  return []
})

const treeExpandedKeys = computed(() => {
  return smlTreeData.value.map(n => n.key)
})

async function loadSmlContent(id: number) {
  try {
    const resp = await smlApi.getNode(id)
    const node = resp.data?.data || resp.data
    if (node?.content) {
      selectedSmlName.value = node.name || ''
      smlPickerInput.value = node.content
      if (monacoEditor) monacoEditor.setValue(node.content)
      smlTreeData.value = parseSMLToTree(node.content)
    }
  } catch {
    ElMessage.error('Failed to load SML content')
  }
}

async function onSmlSelected(id: number) {
  if (!id) {
    smlPickerInput.value = ''
    selectedSmlName.value = ''
    if (monacoEditor) monacoEditor.setValue('')
    smlTreeData.value = []
    return
  }
  await loadSmlContent(id)
}

function parseSml() {
  try {
    const content = monacoEditor?.getValue() || smlPickerInput.value
    smlTreeData.value = parseSMLToTree(content)
    if (smlTreeData.value.length === 0) {
      ElMessage.warning('No valid SML structure found')
    }
  } catch {
    ElMessage.error('Failed to parse SML')
    smlTreeData.value = []
  }
}

function onSmlTreeNodeClick(data: SMLTreeNode) {
  selectedTreeNode.value = data
}

function confirm() {
  if (!selectedTreeNode.value) return
  emit('confirm', {
    indexPath: selectedTreeNode.value.indexPath,
    smlId: selectedSmlId.value || undefined,
  })
  visible.value = false
}

function onClosed() {
  if (parseTimer) {
    clearTimeout(parseTimer)
    parseTimer = null
  }
  if (monacoEditor) {
    monacoEditor.dispose()
    monacoEditor = null
  }
}

async function highlightExistingNode() {
  if (!smlTreeRef.value || !smlTreeData.value.length) return
  const targetPath = props.initialPath
  if (!targetPath) return
  await nextTick()
  const findNode = (nodes: SMLTreeNode[]): SMLTreeNode | null => {
    for (const n of nodes) {
      if (n.indexPath === targetPath) return n
      if (n.children) {
        const found = findNode(n.children)
        if (found) return found
      }
    }
    return null
  }
  const node = findNode(smlTreeData.value)
  if (node) {
    smlTreeRef.value.setCurrentKey(node.key)
    selectedTreeNode.value = node
  }
}

watch(visible, async (val) => {
  if (!val) {
    onClosed()
    return
  }
  selectedTreeNode.value = null
  selectedSmlId.value = props.initialSmlId || null
  await nextTick()
  await nextTick()
  if (!monacoContainerRef.value) return
  registerSMLLanguage()
  monacoEditor = monaco.editor.create(monacoContainerRef.value, {
    value: smlPickerInput.value,
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
  monacoEditor.onDidChangeModelContent(() => {
    if (parseTimer) clearTimeout(parseTimer)
    parseTimer = setTimeout(() => {
      parseSml()
      parseTimer = null
    }, 500)
  })
  if (selectedSmlId.value) {
    await loadSmlContent(selectedSmlId.value)
  } else if (props.initialSmlId) {
    selectedSmlId.value = props.initialSmlId
    await loadSmlContent(props.initialSmlId)
  }
})

watch(smlTreeData, async () => {
  if (visible.value) {
    await highlightExistingNode()
    await nextTick()
    if (smlTreeRef.value && smlTreeData.value.length) {
      smlTreeData.value.forEach((node: any) => {
        smlTreeRef.value.expandNode(node)
      })
    }
  }
})
</script>

<style scoped>
.sml-picker-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}
.sml-picker-preview {
  font-size: 12px;
  color: #606266;
}
.sml-picker-toolbar {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  flex-wrap: wrap;
  gap: 8px;
}
.sml-picker-split {
  display: flex;
  gap: 12px;
  height: 400px;
}
.sml-picker-left {
  flex: 1;
  min-width: 0;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
}
.sml-picker-right {
  flex: 1;
  min-width: 0;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 8px;
  overflow: auto;
}
.monaco-container {
  width: 100%;
  height: 100%;
}
</style>
