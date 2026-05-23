<template>
  <el-dialog
    v-model="visible"
    title="Download History Logs"
    width="480px"
    :destroy-on-close="true"
    @open="handleOpen"
  >
    <el-form label-width="100px">
      <el-form-item label="Engine">
        <span class="engine-name">{{ engineName }}</span>
      </el-form-item>

      <el-form-item label="Date Range">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          value-format="YYYY-MM-DD"
          format="YYYY-MM-DD"
          :disabled-date="disabledDate"
          :shortcuts="shortcuts"
          style="width: 100%"
          @change="onDateChange"
        />
      </el-form-item>

      <el-form-item label="Log Type">
        <el-radio-group v-model="logType">
          <el-radio label="formatted">Formatted (readable)</el-radio>
          <el-radio label="raw">Raw bytes</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item v-if="infoLoaded">
        <div class="info-box">
          <span v-if="fileCount > 0">
            📁 {{ fileCount }} file(s) found · 💾 {{ totalSizeFormatted }}
          </span>
          <span v-else class="text-warning">
            No log files found in selected range
          </span>
          <el-alert
            v-if="fileCount > 0 && totalSize > 20 * 1024 * 1024"
            type="warning"
            :closable="false"
            class="size-warning"
          >
            Large download ({{ totalSizeFormatted }}), may take a while
          </el-alert>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">Cancel</el-button>
      <el-button
        type="primary"
        :disabled="!canDownload"
        :loading="downloading"
        @click="handleDownload"
      >
        <el-icon><Download /></el-icon> Download
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import { engineApi } from '../../api/engine'

interface Props {
  modelValue: boolean
  engineId: number
  engineName: string
}

const props = defineProps<Props>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const dateRange = ref<string[]>([])
const logType = ref('formatted')
const availableDates = ref<string[]>([])
const fileCount = ref(0)
const totalSize = ref(0)
const totalSizeFormatted = ref('')
const infoLoaded = ref(false)
const downloading = ref(false)

const today = new Date()
const yesterday = new Date(today)
yesterday.setDate(yesterday.getDate() - 1)

const shortcuts = [
  {
    text: 'Today',
    value: () => {
      const d = formatDateStr(new Date())
      return [d, d]
    }
  },
  {
    text: 'Yesterday',
    value: () => {
      const d = new Date()
      d.setDate(d.getDate() - 1)
      const s = formatDateStr(d)
      return [s, s]
    }
  },
  {
    text: 'Last 7 Days',
    value: () => {
      const end = formatDateStr(new Date())
      const start = new Date()
      start.setDate(start.getDate() - 6)
      return [formatDateStr(start), end]
    }
  },
  {
    text: 'Last 30 Days',
    value: () => {
      const end = formatDateStr(new Date())
      const start = new Date()
      start.setDate(start.getDate() - 29)
      return [formatDateStr(start), end]
    }
  }
]

function formatDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

const canDownload = computed(() => {
  return dateRange.value?.length === 2 &&
    dateRange.value[0] &&
    dateRange.value[1] &&
    fileCount.value > 0 &&
    totalSize.value <= 100 * 1024 * 1024
})

const disabledDate = (date: Date) => {
  const d = formatDateStr(date)
  return !availableDates.value.includes(d)
}

async function handleOpen() {
  dateRange.value = []
  logType.value = 'formatted'
  infoLoaded.value = false
  fileCount.value = 0
  totalSize.value = 0
  await loadAvailableDates()
}

async function loadAvailableDates() {
  try {
    const resp = await engineApi.getLogDates(props.engineId)
    availableDates.value = resp.data || []
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.error || 'Failed to load log dates')
  }
}

async function onDateChange() {
  if (!dateRange.value || dateRange.value.length !== 2) {
    infoLoaded.value = false
    return
  }
  try {
    const resp = await engineApi.getLogInfo(
      props.engineId,
      dateRange.value[0],
      dateRange.value[1]
    )
    const data = resp.data
    if (data) {
      fileCount.value = data.fileCount || 0
      totalSize.value = data.totalSize || 0
      totalSizeFormatted.value = data.totalSizeFormatted || '0 B'
      infoLoaded.value = true
    }
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.error || 'Failed to get log info')
  }
}

async function handleDownload() {
  if (!canDownload.value) return
  downloading.value = true
  try {
    const blobData = await engineApi.downloadLogs(
      props.engineId,
      dateRange.value[0],
      dateRange.value[1],
      logType.value === 'raw'
    )

    const blob = new Blob([blobData])
    const url = window.URL.createObjectURL(blob)
    const filename = `${props.engineName}_logs_${dateRange.value[0]}_${dateRange.value[1]}.zip`

    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    ElMessage.success('Download started')
    visible.value = false
  } catch (e: any) {
    const msg = e?.response?.data?.error || 'Download failed'
    ElMessage.error(msg)
  } finally {
    downloading.value = false
  }
}
</script>

<style scoped>
.engine-name {
  font-weight: 600;
  color: #303133;
}

.info-box {
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 13px;
  color: #606266;
}

.text-warning {
  color: #e6a23c;
}

.size-warning {
  margin-top: 8px;
}
</style>
