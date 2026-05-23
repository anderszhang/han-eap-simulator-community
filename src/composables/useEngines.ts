import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { engineApi } from '../api/engine'

export interface EngineItem {
  id: number
  engineName: string
  ip: string
  port: number
  mode: string
  deviceId: number
  description?: string
  status?: string  // running, stopped, starting, error
}

export function useEngines() {
  const engines = ref<EngineItem[]>([])
  const selectedEngineId = ref<number | null>(null)
  const loading = ref(false)
  const operatingEngines = ref<Set<number>>(new Set())  // 正在启动/停止的engine

  const loadEngines = async () => {
    loading.value = true
    try {
      const response = await engineApi.getEngines({ pageSize: 1000 })
      if (response.data && response.data.data) {
        engines.value = response.data.data
      }
    } catch (error) {
      console.error('Failed to load engines:', error)
      ElMessage.error('Failed to load engine data')
    } finally {
      loading.value = false
    }
  }

  const selectEngine = (engineId: number) => {
    selectedEngineId.value = engineId
  }

  // 启动engine
  const startEngine = async (engineId: number) => {
    if (operatingEngines.value.has(engineId)) return

    operatingEngines.value.add(engineId)
    try {
      await engineApi.startEngine(engineId)
      const engine = engines.value.find(e => e.id === engineId)
      if (engine) {
        engine.status = 'starting'
      }
      ElMessage.success('Engine starting...')

      pollEngineStatus(engineId)
    } catch (error: any) {
      console.error('Failed to start engine:', error)
      ElMessage.error(error.response?.data?.error || 'Failed to start engine')
      operatingEngines.value.delete(engineId)
    }
  }

  const pollEngineStatus = (engineId: number) => {
    let attempts = 0
    const maxAttempts = 30
    const interval = setInterval(async () => {
      attempts++
      try {
        const resp = await engineApi.getEngines({ pageSize: 1000 })
        if (resp.data?.data) {
          const updated = resp.data.data.find((e: EngineItem) => e.id === engineId)
          if (updated) {
            const engine = engines.value.find(e => e.id === engineId)
            if (engine) {
              engine.status = updated.status
            }
            if (updated.status === 'running' || updated.status === 'connected' || updated.status === 'error') {
              clearInterval(interval)
              operatingEngines.value.delete(engineId)
              return
            }
          }
        }
      } catch {
      }
      if (attempts >= maxAttempts) {
        clearInterval(interval)
        operatingEngines.value.delete(engineId)
      }
    }, 1000)
  }

  // 停止engine
  const stopEngine = async (engineId: number) => {
    if (operatingEngines.value.has(engineId)) return

    operatingEngines.value.add(engineId)
    try {
      await engineApi.stopEngine(engineId)
      // 更新engine状态
      const engine = engines.value.find(e => e.id === engineId)
      if (engine) {
        engine.status = 'stopped'
      }
      ElMessage.success('Engine stopped')
    } catch (error: any) {
      console.error('Failed to stop engine:', error)
      ElMessage.error(error.response?.data?.error || 'Failed to stop engine')
    } finally {
      operatingEngines.value.delete(engineId)
    }
  }

  // 检查engine是否正在运行
  const isEngineRunning = (engineId: number) => {
    const engine = engines.value.find(e => e.id === engineId)
    return engine?.status === 'running' || engine?.status === 'connected'
  }

  // 检查engine是否正在操作中
  const isEngineOperating = (engineId: number) => {
    return operatingEngines.value.has(engineId)
  }

  // 更新engine状态（从WebSocket接收）
  const updateEngineStatus = (engineId: number, status: string) => {
    const engine = engines.value.find(e => e.id === engineId)
    if (engine) {
      engine.status = status
    }
  }

  // 获取engine信息
  const getEngine = (engineId: number) => {
    return engines.value.find(e => e.id === engineId)
  }

  // 轻量状态轮询：只更新状态字段，不替换整个列表
  let statusPollTimer: ReturnType<typeof setInterval> | null = null
  const startStatusPoll = (interval = 2000) => {
    if (statusPollTimer !== null) return
    statusPollTimer = setInterval(async () => {
      try {
        const resp = await engineApi.getEngines({ pageSize: 1000 })
        if (resp.data?.data) {
          for (const updated of resp.data.data) {
            const engine = engines.value.find(e => e.id === updated.id)
            if (engine && engine.status !== updated.status) {
              engine.status = updated.status
            }
          }
        }
      } catch { /* ignore */ }
    }, interval)
  }
  const stopStatusPoll = () => {
    if (statusPollTimer !== null) {
      clearInterval(statusPollTimer)
      statusPollTimer = null
    }
  }

  return {
    engines,
    selectedEngineId,
    loading,
    operatingEngines,
    loadEngines,
    selectEngine,
    startEngine,
    stopEngine,
    isEngineRunning,
    isEngineOperating,
    updateEngineStatus,
    getEngine,
    startStatusPoll,
    stopStatusPoll
  }
}
