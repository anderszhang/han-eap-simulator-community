import { ref, onUnmounted } from 'vue'
import { ElMessage, ElNotification } from 'element-plus'

import { showEquipmentAlarm } from '../utils/alarmNotification'
import { engineWebSocketURL } from '../utils/runtimeConfig'

export interface EngineConnectionCallbacks {
  onMessage?: (engineId: number, message: string) => void
  onStatus?: (engineId: number, status: string) => void
  onVars?: (engineId: number, vars: Record<string, string>) => void
  onConnect?: (engineId: number) => void
  onDisconnect?: (engineId: number) => void
  onError?: (engineId: number, error: Event) => void
}

export interface EngineInfo {
  id: number
  engineName: string
  ip: string
  port: number
}

interface WSMessage {
  type: string
  engineId: number
  engineName: string
  timestamp: string
  direction: string
  content: string
  vars?: Record<string, string>
}

interface EngineConnection {
  ws: WebSocket
  engine: EngineInfo
  closing?: boolean
}

export function useWebSocket(callbacks?: EngineConnectionCallbacks) {
  const connections = ref<Map<number, EngineConnection>>(new Map())
  const connectedEngineIds = ref<Set<number>>(new Set())

  const connectEngine = (engine: EngineInfo) => {
    if (connections.value.has(engine.id)) return

    try {
      const ws = new WebSocket(engineWebSocketURL(engine.id))

      ws.onopen = () => {
        connections.value.set(engine.id, { ws, engine })
        connectedEngineIds.value = new Set(connections.value.keys())
        callbacks?.onConnect?.(engine.id)
      }

      ws.onmessage = (event) => {
        try {
          const data: WSMessage = JSON.parse(event.data)
          if (data.type === 'log') {
            const dirLabel = data.direction === 'send' ? 'Send' : 'Receive'
            const engineLabel = data.engineName ? `[${data.engineName}] ` : ''
            const formattedMessage = `${data.timestamp} ${engineLabel}${dirLabel} ${data.content}`
            callbacks?.onMessage?.(engine.id, formattedMessage)
          } else if (data.type === 'alarm') {
            const engineLabel = data.engineName ? `[${data.engineName}] ` : ''
            const formattedMessage = `${data.timestamp} ${engineLabel}ALARM ${data.content}`
            callbacks?.onMessage?.(engine.id, formattedMessage)
            showEquipmentAlarm({ engineName: data.engineName, content: data.content })
          } else if (data.type === 'status') {
            callbacks?.onStatus?.(data.engineId, data.content)
            if (data.engineId === engine.id) {
              callbacks?.onMessage?.(engine.id, `${data.timestamp} STATUS ${data.content}`)
            }
          } else if (data.type === 'vars') {
            callbacks?.onVars?.(engine.id, data.vars ?? {})
          }
        } catch {
          callbacks?.onMessage?.(engine.id, event.data)
        }
      }

      ws.onclose = () => {
        const conn = connections.value.get(engine.id)
        const wasExpected = conn?.closing
        connections.value.delete(engine.id)
        connectedEngineIds.value = new Set(connections.value.keys())
        callbacks?.onDisconnect?.(engine.id)
        if (!wasExpected) {
          ElNotification.warning({
            title: 'Connection Lost',
            message: `Connection to ${engine.engineName} was closed unexpectedly`,
            position: 'bottom-right',
          })
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        callbacks?.onError?.(engine.id, error)
      }
    } catch (error) {
      console.error('Failed to connect to engine:', error)
      ElMessage.error(`Failed to connect to ${engine.engineName}`)
    }
  }

  const disconnectEngine = (engineId?: number) => {
    if (engineId !== undefined) {
      const conn = connections.value.get(engineId)
      if (conn) {
        conn.closing = true
        conn.ws.close()
        connections.value.delete(engineId)
        connectedEngineIds.value = new Set(connections.value.keys())
      }
    } else {
      connections.value.forEach(conn => { conn.closing = true; conn.ws.close() })
      connections.value.clear()
      connectedEngineIds.value = new Set()
    }
  }

  const isEngineConnected = (engineId: number) => {
    return connections.value.has(engineId)
  }

  const getEngine = (engineId: number): EngineInfo | undefined => {
    return connections.value.get(engineId)?.engine
  }

  onUnmounted(() => {
    disconnectEngine()
  })

  return {
    connections,
    connectedEngineIds,
    connectEngine,
    disconnectEngine,
    isEngineConnected,
    getEngine,
  }
}
