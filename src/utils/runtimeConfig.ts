const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')

export const apiBaseURL = trimTrailingSlash(
  import.meta.env.VITE_API_BASE_URL?.trim() || '/api',
)

export const checklistTemplateURL = import.meta.env.VITE_CHECKLIST_TEMPLATE_URL?.trim() || ''

export function engineWebSocketURL(engineId: number): string {
  const configuredBaseURL = import.meta.env.VITE_WS_BASE_URL?.trim()
  if (configuredBaseURL) {
    return `${trimTrailingSlash(configuredBaseURL)}/engine/${engineId}`
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/api/ws/engine/${engineId}`
}
