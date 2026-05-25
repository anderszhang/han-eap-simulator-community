import { ElNotification } from 'element-plus'

interface AlarmNotificationOptions {
  engineName?: string
  content: string
}

const recentAlarmKeys = new Map<string, number>()
const duplicateWindowMs = 2000

export function showEquipmentAlarm(options: AlarmNotificationOptions) {
  const key = `${options.engineName || ''}|${options.content}`
  const now = Date.now()
  const lastShownAt = recentAlarmKeys.get(key)

  if (lastShownAt && now - lastShownAt < duplicateWindowMs) {
    return
  }

  recentAlarmKeys.set(key, now)
  ElNotification.error({
    title: `Equipment Alarm${options.engineName ? ` - ${options.engineName}` : ''}`,
    message: options.content,
    duration: 10000,
    position: 'top-right',
  })
}
