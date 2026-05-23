<template>
  <div class="success-container">
    <div class="success-card">
      <div class="success-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" fill="#10b981"/>
          <path d="M8 12l2 2 4-4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      
      <div class="success-header">
        <h1>登录成功！</h1>
        <p>欢迎来到 EAP Simulator 系统</p>
      </div>
      
      <div class="user-info" v-if="user">
        <div class="info-item">
          <span class="label">用户ID:</span>
          <span class="value">{{ user.id }}</span>
        </div>
        <div class="info-item">
          <span class="label">用户名:</span>
          <span class="value">{{ user.username }}</span>
        </div>
      </div>
      
      <div class="system-info">
        <h3>系统信息</h3>
        <div class="info-grid">
          <div class="info-card">
            <div class="info-title">系统状态</div>
            <div class="info-value status-online">在线</div>
          </div>
          <div class="info-card">
            <div class="info-title">设备连接</div>
            <div class="info-value">0 台设备</div>
          </div>
          <div class="info-card">
            <div class="info-title">运行时间</div>
            <div class="info-value">{{ uptime }}</div>
          </div>
          <div class="info-card">
            <div class="info-title">版本</div>
            <div class="info-value">v1.0.0</div>
          </div>
        </div>
      </div>
      
      <div class="action-buttons">
        <button @click="goToDashboard" class="primary-btn">
          进入控制台
        </button>
        <button @click="logout" class="secondary-btn">
          退出登录
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const user = ref(null)
const uptime = ref('0 分钟')

const updateUptime = () => {
  const startTime = new Date()
  const now = new Date()
  const diff = Math.floor((now - startTime) / 60000)
  uptime.value = `${diff} 分钟`
}

const goToDashboard = () => {
  router.push('/communication')
}

const logout = () => {
  localStorage.removeItem('user')
  router.push('/')
}

onMounted(() => {
  // Get user info from localStorage
  const userInfo = localStorage.getItem('user')
  if (userInfo) {
    user.value = JSON.parse(userInfo)
  } else {
    // If no user info, redirect to login
    router.push('/')
  }
  
  // Update uptime every minute
  updateUptime()
  setInterval(updateUptime, 60000)
})
</script>

<style scoped>
.success-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
}

.success-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  padding: 40px;
  width: 100%;
  max-width: 500px;
  text-align: center;
}

.success-icon {
  margin-bottom: 30px;
}

.success-header h1 {
  color: #10b981;
  font-size: 32px;
  margin-bottom: 10px;
  font-weight: 600;
}

.success-header p {
  color: #666;
  font-size: 16px;
  margin-bottom: 30px;
}

.user-info {
  background: #f8fafc;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.info-item:last-child {
  margin-bottom: 0;
}

.label {
  color: #666;
  font-weight: 500;
}

.value {
  color: #333;
  font-weight: 600;
}

.system-info {
  margin-bottom: 30px;
}

.system-info h3 {
  color: #333;
  font-size: 18px;
  margin-bottom: 20px;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.info-card {
  background: #f1f5f9;
  border-radius: 8px;
  padding: 15px;
}

.info-title {
  color: #666;
  font-size: 12px;
  margin-bottom: 5px;
}

.info-value {
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.status-online {
  color: #10b981;
}

.action-buttons {
  display: flex;
  gap: 15px;
  justify-content: center;
}

.primary-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.3s;
}

.primary-btn:hover {
  opacity: 0.9;
}

.secondary-btn {
  background: white;
  color: #666;
  border: 2px solid #e1e5e9;
  border-radius: 6px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.secondary-btn:hover {
  border-color: #667eea;
  color: #667eea;
}

@media (max-width: 480px) {
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .action-buttons {
    flex-direction: column;
  }
}
</style>
