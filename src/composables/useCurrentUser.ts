import { ref, onMounted } from 'vue'

export interface UserInfo {
  id: number
  username: string
  roleId: number
}

export function useCurrentUser() {
  const currentUser = ref<UserInfo | null>(null)

  onMounted(() => {
    const raw = localStorage.getItem('user')
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        currentUser.value = {
          id: parsed.id,
          username: parsed.username,
          roleId: parsed.roleId,
        }
      } catch {
        currentUser.value = null
      }
    }
  })

  return { currentUser }
}
