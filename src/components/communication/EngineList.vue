<template>
  <div class="engine-section panel-section">
    <div class="section-header">
      <span>Engines</span>
      <span class="header-actions">
        <el-button size="small" circle :type="showSearch ? 'primary' : ''" @click="toggleSearch" title="Search">
          <el-icon><Search /></el-icon>
        </el-button>
        <el-button size="small" circle @click="emit('open-engine-page')" title="Manage Engines">
          <el-icon><Setting /></el-icon>
        </el-button>
        <el-button size="small" circle @click="emit('open-autoreply-page')" title="Manage Auto Reply">
          <el-icon><ChatLineRound /></el-icon>
        </el-button>
        <el-button size="small" circle @click="emit('refresh')" title="Refresh">
          <el-icon><Refresh /></el-icon>
        </el-button>
      </span>
    </div>
    <div v-if="showSearch" class="search-bar">
      <el-input
        ref="searchInputRef"
        v-model="searchKeyword"
        size="small"
        clearable
        placeholder="Search name, IP, port, mode, status"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
    </div>
    <div class="engine-list" v-loading="loading">
      <div
        v-for="engine in filteredEngines"
        :key="engine.id"
        class="engine-item"
        :class="{ 
          active: selectedEngineId === engine.id,
          'log-active': connectedEngineIds.has(engine.id),
          'send-active': activeSendEngineId === engine.id
        }"
      >
        <span
          class="status-bar"
          :class="{
            'status-connected': engine.status === 'connected',
            'status-running': engine.status === 'running',
            'status-starting': engine.status === 'starting',
            'status-error': engine.status === 'error'
          }"
          :title="getStatusText(engine.status)"
        />
        <div class="engine-info" @click="handleEngineClick(engine.id)">
          <div class="engine-main-row">
            <span class="engine-name">{{ engine.engineName }}</span>
            <span class="engine-port">:{{ engine.port }}</span>
            <el-tooltip placement="right" effect="dark" :show-after="200">
              <template #content>
                <div class="engine-tooltip">
                  <div><span>Mode:</span> {{ engine.mode || '-' }}</div>
                  <div><span>Address:</span> {{ engine.ip }}:{{ engine.port }}</div>
                  <div><span>Status:</span> {{ getStatusText(engine.status) }}</div>
                  <div><span>Device ID:</span> {{ engine.deviceId }}</div>
                  <div v-if="engine.description"><span>Description:</span> {{ engine.description }}</div>
                </div>
              </template>
              <el-icon class="engine-info-icon" @click.stop><InfoFilled /></el-icon>
            </el-tooltip>
          </div>
        </div>
        <div class="engine-actions">
          <!-- 启动/停止按钮 -->
          <el-button
            size="small"
            circle
            :loading="isOperating(engine.id)"
            :disabled="engine.status === 'starting'"
            @click.stop="handleToggleEngine(engine)"
            :title="isEngineActive(engine.status) ? 'Stop Engine' : 'Start Engine'"
            class="action-btn"
          >
            <el-icon v-if="!isOperating(engine.id)" :size="14">
              <VideoPause v-if="isEngineActive(engine.status)" />
              <VideoPlay v-else />
            </el-icon>
          </el-button>
          
          <!-- 日志订阅开关 -->
          <el-switch
            size="small"
            :model-value="connectedEngineIds.has(engine.id)"
            :disabled="!isEngineActive(engine.status)"
            @change="handleToggleLog(engine)"
            :title="connectedEngineIds.has(engine.id) ? 'Stop Log Stream' : 'Start Log Stream'"
            inline-prompt
            active-text="开"
            inactive-text="关"
            class="log-switch"
          />
        </div>
      </div>
      <div v-if="engines.length === 0" class="empty-state">
        <el-empty description="No engines found" />
      </div>
      <div v-else-if="filteredEngines.length === 0" class="empty-state">
        <el-empty description="No engines match" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { Refresh, Search, VideoPlay, VideoPause, Setting, ChatLineRound, InfoFilled } from '@element-plus/icons-vue'

export interface EngineItem {
  id: number
  engineName: string
  ip: string
  port: number
  mode: string
  deviceId: number
  description?: string
  status?: string
}

interface Props {
  engines: EngineItem[]
  selectedEngineId: number | null
  loading?: boolean
  connectedEngineIds: Set<number>
  activeSendEngineId: number | null
  operatingEngines: Set<number>
}

interface Emits {
  (e: 'select-engine', id: number): void
  (e: 'toggle-engine', engine: EngineItem): void
  (e: 'toggle-log', engine: EngineItem): void
  (e: 'refresh'): void
  (e: 'open-engine-page'): void
  (e: 'open-autoreply-page'): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<Emits>()
const showSearch = ref(false)
const searchKeyword = ref('')
const searchInputRef = ref()

const filteredEngines = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  if (!keyword) return props.engines
  return props.engines.filter(engine => {
    const fields = [
      engine.engineName,
      engine.ip,
      String(engine.port),
      engine.mode,
      getStatusText(engine.status),
      engine.status || '',
      String(engine.deviceId),
      engine.description || '',
    ]
    return fields.some(field => field.toLowerCase().includes(keyword))
  })
})

const toggleSearch = () => {
  showSearch.value = !showSearch.value
  if (!showSearch.value) {
    searchKeyword.value = ''
  } else {
    nextTick(() => {
      searchInputRef.value?.focus()
    })
  }
}

const isOperating = (engineId: number) => {
  return props.operatingEngines.has(engineId)
}

const isEngineActive = (status?: string) => {
  return status === 'running' || status === 'connected'
}

const getStatusText = (status?: string) => {
  switch (status) {
    case 'connected': return 'Connected'
    case 'running': return 'Running'
    case 'starting': return 'Starting'
    case 'error': return 'Error'
    default: return 'Stopped'
  }
}

const handleEngineClick = (engineId: number) => {
  emit('select-engine', engineId)
}

const handleToggleEngine = (engine: EngineItem) => {
  emit('toggle-engine', engine)
}

const handleToggleLog = (engine: EngineItem) => {
  emit('toggle-log', engine)
}
</script>

<style scoped>
.engine-section {
  border-bottom: 1px solid #dcdfe6;
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
  padding: 8px;
  border-bottom: 1px solid #ebeef5;
  background: #fff;
}

.engine-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px 8px;
}

.engine-item {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  overflow: hidden;
}

.engine-item:hover {
  background-color: #f0f0f0;
}

.engine-item.active {
  background-color: #e6f7ff;
}

.engine-item.log-active {
  background-color: #fff7e6;
}

.engine-item.send-active {
  border-left: 2px solid #409eff;
  margin-left: -2px;
}

.engine-item.send-active .engine-name {
  color: #409eff;
}

.status-bar {
  width: 3px;
  flex-shrink: 0;
  background-color: #c0c4cc;
  align-self: stretch;
}

.status-bar.status-connected {
  background-color: #67c23a;
}

.status-bar.status-running {
  background-color: #e6a23c;
  animation: pulse 1s infinite;
}

.status-bar.status-starting {
  background-color: #e6a23c;
  animation: pulse 1s infinite;
}

.status-bar.status-error {
  background-color: #f56c6c;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.engine-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex: 1;
  min-width: 0;
  padding: 7px 8px;
}

.engine-main-row {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  gap: 8px;
}

.engine-name {
  font-weight: 500;
  line-height: 24px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.engine-port {
  color: #666;
  font-size: 12px;
  flex-shrink: 0;
}

.engine-info-icon {
  color: #909399;
  cursor: help;
  flex-shrink: 0;
  font-size: 14px;
}

.engine-info-icon:hover {
  color: #409eff;
}

.engine-tooltip {
  display: grid;
  gap: 4px;
  max-width: 260px;
  line-height: 1.4;
  word-break: break-word;
}

.engine-tooltip span {
  color: #cfd3dc;
  font-weight: 600;
}

.engine-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  align-items: center;
  padding-right: 8px;
}

.engine-actions :deep(.action-btn.el-button) {
  --el-button-bg-color: #f5f5f5;
  --el-button-border-color: #d5d5d5;
  --el-button-hover-bg-color: #e8e8e8;
  --el-button-hover-border-color: #c0c0c0;
  --el-button-hover-text-color: #333;
  color: #606266;
}

.engine-actions :deep(.log-switch.el-switch) {
  --el-switch-on-color: #30d158;
  --el-switch-off-color: #e0e0e0;
  height: 22px;
}

.engine-actions :deep(.log-switch .el-switch__core) {
  border-radius: 11px;
  min-width: 36px;
  height: 22px;
}

.engine-actions :deep(.log-switch .el-switch__core .el-switch__action) {
  width: 16px;
  height: 16px;
}

.engine-actions :deep(.log-switch .el-switch__label) {
  font-size: 10px;
  color: #fff;
}

.engine-actions :deep(.log-switch .el-switch__label--left) {
  color: #999;
}

.empty-state {
  padding: 20px 0;
  text-align: center;
}

.engine-list {
  scrollbar-width: thin;
  scrollbar-color: #c1c1c1 transparent;
}

.engine-list::-webkit-scrollbar {
  width: 6px;
}

.engine-list::-webkit-scrollbar-track {
  background: transparent;
}

.engine-list::-webkit-scrollbar-thumb {
  background-color: #c1c1c1;
  border-radius: 3px;
}

.engine-list::-webkit-scrollbar-thumb:hover {
  background-color: #a8a8a8;
}
</style>
