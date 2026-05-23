<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1>EAP Simulator</h1>
        <p>Semiconductor EAP Simulation System</p>
      </div>
      
      <form v-if="!isRegister" @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="username">Username</label>
          <input
            id="username"
            v-model="loginForm.username"
            type="text"
            placeholder="Enter username"
            autocomplete="username"
            required
          />
        </div>
        
        <div class="form-group">
          <label for="password">Password</label>
          <div class="password-wrapper">
            <input
              id="password"
              v-model="loginForm.password"
              :type="showLoginPwd ? 'text' : 'password'"
              placeholder="Enter password"
              autocomplete="current-password"
              required
            />
            <span class="toggle-pwd" @click="showLoginPwd = !showLoginPwd">
              <svg v-if="!showLoginPwd" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
              <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>
            </span>
          </div>
        </div>
        
        <div class="error-message" v-if="error">
          {{ error }}
        </div>
        
        <button type="submit" class="login-btn" :disabled="loading">
          {{ loading ? 'Signing in...' : 'Sign In' }}
        </button>
        
        <div class="form-switch">
          <span>Don't have an account?</span>
          <a href="javascript:void(0)" @click="switchMode">Sign up</a>
        </div>
      </form>
      
      <form v-else @submit.prevent="handleRegister" class="login-form">
        <div class="form-group">
          <label for="reg-username">Username</label>
          <input
            id="reg-username"
            v-model="registerForm.username"
            type="text"
            placeholder="Enter username"
            autocomplete="off"
            required
          />
        </div>
        
        <div class="form-group">
          <label for="reg-password">Password</label>
          <div class="password-wrapper">
            <input
              id="reg-password"
              v-model="registerForm.password"
              :type="showRegPwd ? 'text' : 'password'"
              placeholder="Enter password"
              autocomplete="new-password"
              required
            />
            <span class="toggle-pwd" @click="showRegPwd = !showRegPwd">
              <svg v-if="!showRegPwd" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
              <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>
            </span>
          </div>
        </div>
        
        <div class="form-group">
          <label for="reg-confirm">Confirm Password</label>
          <div class="password-wrapper">
            <input
              id="reg-confirm"
              v-model="registerForm.confirmPassword"
              :type="showRegConfirm ? 'text' : 'password'"
              placeholder="Confirm password"
              autocomplete="new-password"
              required
            />
            <span class="toggle-pwd" @click="showRegConfirm = !showRegConfirm">
              <svg v-if="!showRegConfirm" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
              <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>
            </span>
          </div>
        </div>
        
        <div class="error-message" v-if="error">
          {{ error }}
        </div>
        
        <button type="submit" class="login-btn" :disabled="loading">
          {{ loading ? 'Signing up...' : 'Sign Up' }}
        </button>
        
        <div class="form-switch">
          <span>Already have an account?</span>
          <a href="javascript:void(0)" @click="switchMode">Sign in</a>
        </div>
      </form>
      
      <div class="login-footer">
        <p class="version">v{{ appVersion }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../utils/api'
import type { LoginForm } from '../types'

const router = useRouter()
const appVersion = __APP_VERSION__

const loginForm = ref<LoginForm>({
  username: '',
  password: ''
})

const registerForm = ref({
  username: '',
  password: '',
  confirmPassword: ''
})

const isRegister = ref(false)
const loading = ref<boolean>(false)
const error = ref<string>('')
const showLoginPwd = ref(false)
const showRegPwd = ref(false)
const showRegConfirm = ref(false)

const switchMode = () => {
  isRegister.value = !isRegister.value
  error.value = ''
  loginForm.value = { username: '', password: '' }
  registerForm.value = { username: '', password: '', confirmPassword: '' }
}

const handleLogin = async (): Promise<void> => {
  loading.value = true
  error.value = ''
  
  try {
    const response = await api.post('/login', loginForm.value)

    if (response.data.message === 'Success') {
      localStorage.setItem('token', response.data.data.token)
      localStorage.setItem('user', JSON.stringify(response.data.data))
      router.push('/engine')
    }
  } catch (err: any) {
    if (err.response && err.response.data.error) {
      error.value = err.response.data.error
    } else {
      error.value = 'Sign in failed, please try again'
    }
  } finally {
    loading.value = false
  }
}

const handleRegister = async (): Promise<void> => {
  loading.value = true
  error.value = ''
  
  if (registerForm.value.password !== registerForm.value.confirmPassword) {
    error.value = 'Passwords do not match'
    loading.value = false
    return
  }
  
  try {
    const response = await api.post('/register', {
      username: registerForm.value.username,
      password: registerForm.value.password
    })

    if (response.data.message === 'Success') {
      localStorage.setItem('token', response.data.data.token)
      localStorage.setItem('user', JSON.stringify(response.data.data))
      router.push('/engine')
    }
  } catch (err: any) {
    if (err.response && err.response.data.error) {
      error.value = err.response.data.error
    } else {
      error.value = 'Sign up failed, please try again'
    }
  } finally {
    loading.value = false
  }
}

</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
}

.login-card {
  background: var(--eap-bg-card);
  border-radius: var(--eap-radius-lg);
  box-shadow: var(--eap-shadow-login);
  padding: 40px;
  width: 100%;
  max-width: 400px;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-header h1 {
  color: var(--eap-text-primary);
  font-size: 28px;
  margin-bottom: 8px;
  font-weight: 600;
}

.login-header p {
  color: var(--eap-text-regular);
  font-size: 14px;
}

.login-form {
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  color: var(--eap-text-primary);
  font-weight: 500;
  font-size: 14px;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 2px solid var(--eap-border-base);
  border-radius: var(--eap-radius-base);
  font-size: 14px;
  transition: border-color 0.3s;
}

.form-group input:focus {
  outline: none;
  border-color: var(--eap-primary);
}

.password-wrapper {
  position: relative;
}

.password-wrapper input {
  padding-right: 40px;
}

.toggle-pwd {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--eap-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  transition: color 0.2s;
}

.toggle-pwd:hover {
  color: var(--eap-primary);
}

.error-message {
  background: #fef0f0;
  color: var(--eap-danger);
  padding: 10px;
  border-radius: 6px;
  margin-bottom: 20px;
  font-size: 14px;
}

.login-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, var(--eap-primary) 0%, var(--eap-primary-dark) 100%);
  color: #fff;
  border: none;
  border-radius: var(--eap-radius-base);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.3s;
}

.login-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.login-footer {
  text-align: center;
  margin-top: 20px;
}

.login-footer p {
  color: var(--eap-text-secondary);
  font-size: 12px;
}

.login-footer .version {
  margin-top: 8px;
  color: var(--eap-text-placeholder);
  font-size: 11px;
}

.form-switch {
  text-align: center;
  margin-top: 16px;
  font-size: 13px;
  color: var(--eap-text-regular);
}

.form-switch a {
  color: var(--eap-primary);
  text-decoration: none;
  margin-left: 4px;
}

.form-switch a:hover {
  text-decoration: underline;
}
</style>
