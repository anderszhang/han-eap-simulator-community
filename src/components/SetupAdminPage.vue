<template>
  <div class="setup-container">
    <section class="setup-shell">
      <div class="setup-hero">
        <div class="setup-mark">HAN</div>
        <p class="setup-kicker">Secure first run</p>
        <h1>Initialize your admin access</h1>
        <p>
          This database has no active administrator yet. Create the password for
          the built-in <strong>admin</strong> account to finish setup.
        </p>
        <div class="setup-facts">
          <span>Local database</span>
          <span>No password in config.env</span>
          <span>One-time setup</span>
        </div>
      </div>

      <div class="setup-card">
        <div class="setup-card-head">
          <div>
            <div class="setup-badge">Admin Account</div>
            <h2>Set Password</h2>
          </div>
          <div class="setup-account">admin</div>
        </div>

        <form class="setup-form" @submit.prevent="handleSubmit">
          <div class="form-group">
            <label for="admin-password">New Password</label>
            <input
              id="admin-password"
              v-model="password"
              type="password"
              autocomplete="new-password"
              placeholder="Longer than 6 characters"
              minlength="7"
              required
            />
          </div>
          <div class="form-group">
            <label for="confirm-password">Confirm Password</label>
            <input
              id="confirm-password"
              v-model="confirmPassword"
              type="password"
              autocomplete="new-password"
              placeholder="Repeat admin password"
              minlength="7"
              required
            />
          </div>

          <div class="setup-rule" :class="{ passed: passwordLongEnough }">
            <span class="setup-rule-dot"></span>
            {{ passwordLongEnough ? 'Password length is valid.' : 'Password must be longer than 6 characters.' }}
          </div>

          <div v-if="error" class="setup-error">{{ error }}</div>
          <button class="setup-button" type="submit" :disabled="loading || !passwordLongEnough">
            {{ loading ? 'Saving password...' : 'Finish Setup' }}
          </button>
        </form>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import api from '../utils/api'

const router = useRouter()
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const passwordLongEnough = computed(() => password.value.length > 6)

onMounted(async () => {
  try {
    const resp = await api.get('/setup/status')
    if (!resp.data?.data?.setupRequired) {
      router.replace('/')
    }
  } catch {
    error.value = 'Unable to check setup status'
  }
})

const handleSubmit = async () => {
  error.value = ''
  if (!passwordLongEnough.value) {
    error.value = 'Password must be longer than 6 characters'
    return
  }
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    return
  }

  loading.value = true
  try {
    const response = await api.post('/setup/admin-password', { password: password.value })
    if (response.data.message === 'Success') {
      localStorage.setItem('token', response.data.data.token)
      localStorage.setItem('user', JSON.stringify(response.data.data))
      router.replace('/engine')
    }
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to set admin password'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.setup-container {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 28px;
  background:
    radial-gradient(circle at 18% 18%, rgba(68, 133, 165, 0.35), transparent 30%),
    radial-gradient(circle at 82% 28%, rgba(231, 177, 93, 0.24), transparent 28%),
    linear-gradient(135deg, #f1f6f4 0%, #d7e8ed 52%, #f8efe1 100%);
}

.setup-shell {
  width: min(920px, 100%);
  min-height: 560px;
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  overflow: hidden;
  border: 1px solid rgba(43, 78, 94, 0.16);
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.68);
  box-shadow: 0 34px 90px rgba(34, 58, 73, 0.22);
  backdrop-filter: blur(16px);
}

.setup-hero {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 44px;
  color: #f7fbfb;
  background:
    linear-gradient(160deg, rgba(18, 56, 69, 0.96), rgba(43, 111, 112, 0.9)),
    radial-gradient(circle at 24% 20%, rgba(255, 255, 255, 0.2), transparent 32%);
}

.setup-hero::before {
  content: "";
  position: absolute;
  inset: 24px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 24px;
  pointer-events: none;
}

.setup-mark {
  position: absolute;
  top: 42px;
  left: 44px;
  width: 76px;
  height: 76px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.1);
  font-size: 24px;
  font-weight: 900;
  letter-spacing: -0.08em;
}

.setup-kicker {
  margin: 0 0 12px;
  color: #b7dbdc;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.setup-hero h1 {
  max-width: 360px;
  margin: 0;
  font-size: clamp(34px, 5vw, 54px);
  line-height: 0.98;
  letter-spacing: -0.045em;
}

.setup-hero p {
  max-width: 390px;
  margin: 22px 0 0;
  color: rgba(247, 251, 251, 0.82);
  line-height: 1.7;
}

.setup-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 28px;
}

.setup-facts span {
  padding: 6px 10px;
  border-radius: 999px;
  color: #dff5f4;
  background: rgba(255, 255, 255, 0.1);
  font-size: 12px;
  font-weight: 700;
}

.setup-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 42px;
  background: rgba(255, 255, 255, 0.9);
}

.setup-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 28px;
}

.setup-badge {
  display: inline-flex;
  padding: 5px 10px;
  border-radius: 999px;
  color: #23506f;
  background: #dcecff;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.setup-card h2 {
  margin: 10px 0 0;
  color: #1f3448;
  font-size: 34px;
  line-height: 1.1;
  letter-spacing: -0.035em;
}

.setup-account {
  padding: 10px 12px;
  border-radius: 14px;
  color: #315d7b;
  background: #edf5fb;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 13px;
  font-weight: 800;
}

.setup-form {
  display: grid;
  gap: 18px;
}

.form-group {
  display: grid;
  gap: 8px;
}

.form-group label {
  color: #34495d;
  font-size: 13px;
  font-weight: 700;
}

.form-group input {
  width: 100%;
  padding: 13px 14px;
  border: 1px solid #cad8e5;
  border-radius: 12px;
  color: #1f3448;
  background: #fff;
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-group input:focus {
  border-color: #3d7eb8;
  box-shadow: 0 0 0 4px rgba(61, 126, 184, 0.14);
}

.setup-rule {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  color: #6b7c8a;
  background: #f3f7fa;
  font-size: 13px;
}

.setup-rule-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #b7c4ce;
}

.setup-rule.passed {
  color: #2f765b;
  background: #edf8f2;
}

.setup-rule.passed .setup-rule-dot {
  background: #35a36f;
}

.setup-error {
  padding: 10px 12px;
  border-radius: 10px;
  color: #b93b3b;
  background: #fff1f1;
  font-size: 13px;
}

.setup-button {
  padding: 13px 16px;
  border: none;
  border-radius: 12px;
  color: #fff;
  background: linear-gradient(135deg, #315d7b, #3e8c74);
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
}

.setup-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 12px 28px rgba(49, 93, 123, 0.22);
}

.setup-button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

@media (max-width: 760px) {
  .setup-shell {
    grid-template-columns: 1fr;
  }

  .setup-hero {
    min-height: 300px;
  }

  .setup-card {
    padding: 30px 24px;
  }
}
</style>
