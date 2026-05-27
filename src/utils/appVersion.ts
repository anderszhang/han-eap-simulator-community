import { ref } from 'vue'

import api from './api'

const appVersion = ref('dev')
let loadingPromise: Promise<string> | null = null

export async function loadAppVersion(): Promise<string> {
  if (loadingPromise) {
    return loadingPromise
  }

  loadingPromise = api
    .get('/version')
    .then((response) => {
      const version = response.data?.data?.version
      appVersion.value = typeof version === 'string' && version.trim() ? version.trim() : 'dev'
      return appVersion.value
    })
    .catch(() => {
      if (!appVersion.value) {
        appVersion.value = 'dev'
      }
      return appVersion.value
    })
    .finally(() => {
      loadingPromise = null
    })

  return loadingPromise
}

export function useAppVersion() {
  return {
    appVersion,
    loadAppVersion,
  }
}
