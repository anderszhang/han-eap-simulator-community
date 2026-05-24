<template>
  <el-container class="main-layout">
    <el-aside :width="isCollapsed ? '64px' : '200px'" class="sidebar">
      <div class="logo">
        <img v-if="isCollapsed" class="logo-icon" src="/icon.svg" :alt="`${APP_INFO.name} logo`" />
        <template v-else>
          <div class="logo-title">HH EAP Simulator</div>
          <div class="logo-subtitle">Equipment Automation</div>
        </template>
      </div>
       <el-menu
         :default-active="$route.path"
         :collapse="isCollapsed"
         router
         class="sidebar-menu"
       >
           <el-menu-item index="/engine">
             <el-icon><Monitor /></el-icon>
             <span>Engine</span>
           </el-menu-item>
             <el-menu-item index="/checklist">
               <el-icon><List /></el-icon>
               <span>Checklist</span>
             </el-menu-item>
            <el-menu-item index="/sml">
             <el-icon><Document /></el-icon>
             <span>SML</span>
           </el-menu-item>
        <el-menu-item index="/autoreply">
          <el-icon><ChatDotRound /></el-icon>
          <span>AutoReply</span>
        </el-menu-item>
        <el-menu-item index="/flow">
          <el-icon><Connection /></el-icon>
          <span>Flow</span>
        </el-menu-item>

           <el-menu-item index="/communication">
             <el-icon><Position /></el-icon>
             <span>Manual SECS</span>
           </el-menu-item>
           <el-menu-item index="/auto-secs">
              <el-icon><MagicStick /></el-icon>
             <span>Auto SECS</span>
           </el-menu-item>
             <el-menu-item index="/vendors">
               <el-icon><OfficeBuilding /></el-icon>
               <span>Vendor & Model</span>
             </el-menu-item>
            <el-menu-item v-if="user.roleId === 1" index="/roles">
            <el-icon><User /></el-icon>
            <span>Role Management</span>
          </el-menu-item>
        </el-menu>

        <div class="sidebar-footer">
          <template v-if="!isCollapsed">
            <span class="footer-version">v{{ appVersion }}</span>
            <span class="footer-dot">·</span>
            <span class="footer-about" @click="showAboutDialog = true">About</span>
          </template>
          <template v-else>
            <el-tooltip :content="`v${appVersion}`" placement="right">
              <el-icon class="footer-icon-collapsed" @click="showAboutDialog = true"><InfoFilled /></el-icon>
            </el-tooltip>
          </template>
        </div>
     </el-aside>

    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-icon class="collapse-btn" @click="isCollapsed = !isCollapsed">
            <Fold v-if="!isCollapsed" />
            <Expand v-else />
          </el-icon>
          <h3>{{ getPageTitle() }}</h3>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="el-dropdown-link">
              <el-icon class="user-icon"><UserFilled /></el-icon>
              {{ user.username }}
              <el-icon class="el-icon--right"><arrow-down /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="changePassword">Change Password</el-dropdown-item>
                <el-dropdown-item disabled>
                  <span class="dropdown-version">v{{ appVersion }}</span>
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">Logout</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main-content">
        <router-view v-slot="{ Component, route }">
          <keep-alive v-if="route.meta.keepAlive">
            <component :is="Component" :key="route.path" />
          </keep-alive>
          <component v-else :is="Component" :key="route.path" />
        </router-view>
      </el-main>
    </el-container>

    <el-dialog v-model="showPwdDialog" title="Change Password" width="400px">
      <el-form :model="pwdForm" :rules="pwdRules" ref="pwdFormRef" label-width="120px">
        <el-form-item label="Old Password" prop="oldPassword">
          <el-input v-model="pwdForm.oldPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="New Password" prop="newPassword">
          <el-input v-model="pwdForm.newPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="Confirm" prop="confirmPassword">
          <el-input v-model="pwdForm.confirmPassword" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showPwdDialog = false">Cancel</el-button>
        <el-button type="primary" @click="handleChangePassword">Confirm</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showAboutDialog" :title="`About ${APP_INFO.name}`" width="460px">
      <div class="about-content">
        <div class="about-brand">
          <img class="about-logo" src="/icon.svg" :alt="`${APP_INFO.name} logo`" />
          <h3>{{ APP_INFO.name }}</h3>
        </div>
        <p class="about-desc">{{ APP_INFO.description }}</p>
        <el-divider />
        <div class="about-row">
          <span class="about-label">Version</span>
          <span class="about-value">v{{ appVersion }}</span>
        </div>
        <div class="about-row">
          <span class="about-label">Author</span>
          <span class="about-value">{{ APP_INFO.author }}</span>
        </div>
        <div class="about-row" v-if="APP_INFO.wechat">
          <span class="about-label">WeChat</span>
          <span class="about-value">{{ APP_INFO.wechat }}</span>
        </div>
        <div class="about-row">
          <span class="about-label">Email</span>
          <span class="about-value"><a :href="`mailto:${APP_INFO.email}`">{{ APP_INFO.email }}</a></span>
        </div>
        <div class="about-row">
          <span class="about-label">GitHub</span>
          <span class="about-value"><a :href="APP_INFO.github" target="_blank">{{ APP_INFO.github.replace('https://', '') }}</a></span>
        </div>
        <div class="about-row">
          <span class="about-label">License</span>
          <span class="about-value">{{ APP_INFO.license }}</span>
        </div>
        <el-divider />
        <p class="about-thanks">Thanks for using {{ APP_INFO.name }}!</p>
      </div>
    </el-dialog>
  </el-container>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { userApi } from '../api/user'
import { APP_INFO } from '../config/app'

const showAboutDialog = ref(false)

const router = useRouter()
const route = useRoute()
const user = ref({ username: '', roleId: 1, roleName: 'admin' })
const isCollapsed = ref(false)
const appVersion = __APP_VERSION__

watch(() => route.path, (path) => {
  if (path === '/communication' || path === '/auto-secs' || path.startsWith('/flow/')) {
    isCollapsed.value = true
  }
})

 const getPageTitle = () => {
   const path = route.path
    const titles: Record<string, string> = {
      '/roles': 'Role Management',
      '/engine': 'Engine',
      '/autoreply': 'AutoReply',
      '/sml': 'SML',
       '/communication': 'Manual SECS',
        '/flow': 'Flow',
        '/auto-secs': 'Auto SECS',
        '/vendors': 'Vendor & Model',
        '/checklist': 'Checklist'
     }
   return titles[path] || 'HH EAP Simulator'
 }

const showPwdDialog = ref(false)
const pwdForm = ref({ oldPassword: '', newPassword: '', confirmPassword: '' })
const pwdFormRef = ref()
const pwdRules = {
  oldPassword: [{ required: true, message: 'Required', trigger: 'blur' }],
  newPassword: [{ required: true, message: 'Required', trigger: 'blur' }],
  confirmPassword: [
    { required: true, message: 'Required', trigger: 'blur' },
    {
      validator: (_rule: any, value: string, callback: any) => {
        if (value !== pwdForm.value.newPassword) {
          callback(new Error('Passwords do not match'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

const handleCommand = (command: string): void => {
  if (command === 'logout') {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  } else if (command === 'changePassword') {
    showPwdDialog.value = true
    pwdForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
  }
}

const handleChangePassword = async () => {
  try {
    await pwdFormRef.value.validate()
    await userApi.changePassword({
      oldPassword: pwdForm.value.oldPassword,
      newPassword: pwdForm.value.newPassword,
    })
    ElMessage.success('Password changed')
    showPwdDialog.value = false
  } catch (e: any) {
    ElMessage.error(e.response?.data?.error || 'Failed')
  }
}

onMounted(() => {
  const userData = localStorage.getItem('user')
  if (userData) {
    user.value = JSON.parse(userData)
  }
})
</script>

<style scoped>
.main-layout {
  height: 100vh;
}

/* ─── Sidebar ─── */
.sidebar {
  background-color: #0f172a;
  transition: width 0.3s;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}

/* Logo Area */
.logo {
  padding: 18px 12px;
  text-align: center;
  border-bottom: 1px solid #1e293b;
  background-color: #111827;
  white-space: nowrap;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.logo-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.18));
}

.logo-title {
  color: #f8fafc;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.5px;
  line-height: 1.2;
}

.logo-subtitle {
  color: #64748b;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 1px;
  text-transform: uppercase;
}

/* Menu */
.sidebar-menu {
  border-right: none;
  transition: width 0.3s;
  background-color: transparent;
  flex: 1;
  overflow-y: auto;
}

.sidebar-menu:not(.el-menu--collapse) {
  width: 200px;
}

/* Override Element Plus menu colors for dark theme */
.sidebar-menu :deep(.el-menu-item) {
  color: #94a3b8;
  height: 44px;
  line-height: 44px;
  margin: 2px 8px;
  padding-left: 12px !important;
  border-radius: 6px;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    margin 0.3s ease,
    padding 0.3s ease;
}

.sidebar-menu :deep(.el-menu-item:hover) {
  background-color: #1e293b;
  color: #e2e8f0;
}

.sidebar-menu :deep(.el-menu-item.is-active) {
  background-color: #1e293b;
  color: #fff;
  position: relative;
}

.sidebar-menu :deep(.el-menu-item.is-active::before) {
  content: '';
  position: absolute;
  left: 0;
  top: 10px;
  bottom: 10px;
  width: 3px;
  background-color: var(--eap-primary);
  border-radius: 0 2px 2px 0;
}

.sidebar-menu :deep(.el-menu-item .el-icon) {
  color: inherit;
  flex-shrink: 0;
  transition: margin-right 0.3s ease;
}

.sidebar-menu :deep(.el-menu-item span) {
  overflow: hidden;
  text-overflow: ellipsis;
  transition: opacity 0.2s ease, max-width 0.3s ease;
}

/* Collapsed menu adjustments */
.sidebar-menu.el-menu--collapse {
  --el-menu-base-level-padding: 0;
}

.sidebar-menu.el-menu--collapse :deep(.el-menu-item) {
  margin: 2px 8px !important;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-left: 0 !important;
  padding-right: 0 !important;
}

.sidebar-menu.el-menu--collapse :deep(.el-menu-item .el-icon) {
  margin-right: 0 !important;
}

.sidebar-menu.el-menu--collapse :deep(.el-menu-item span) {
  max-width: 0;
  opacity: 0;
}

/* Footer */
.sidebar-footer {
  flex-shrink: 0;
  padding: 10px;
  border-top: 1px solid #1e293b;
  text-align: center;
  color: #64748b;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.footer-version {
  font-family: 'SFMono-Regular', Consolas, monospace;
  letter-spacing: 0.3px;
}

.footer-dot {
  opacity: 0.5;
}

.footer-about {
  cursor: pointer;
  transition: color 0.2s;
}

.footer-about:hover {
  color: var(--eap-primary);
}

.footer-icon-collapsed {
  cursor: pointer;
  color: #64748b;
  font-size: 16px;
  transition: color 0.2s;
}

.footer-icon-collapsed:hover {
  color: var(--eap-primary);
}

/* ─── Header ─── */
.header {
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h3 {
  margin: 0;
  color: #303133;
  font-weight: 500;
  font-size: 16px;
}

.collapse-btn {
  font-size: 20px;
  cursor: pointer;
  color: #606266;
  transition: color 0.2s;
}

.collapse-btn:hover {
  color: var(--eap-primary);
}

.header-right {
  display: flex;
  align-items: center;
}

.user-icon {
  margin-right: 6px;
  color: #909399;
}

.el-dropdown-link {
  cursor: pointer;
  color: #606266;
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.el-dropdown-link:hover {
  background-color: #f5f7fa;
}

.dropdown-version {
  color: #909399;
  font-size: 12px;
  font-family: 'SFMono-Regular', Consolas, monospace;
}

/* ─── Main Content ─── */
.main-content {
  background-color: #f5f5f5;
  padding: 8px;
  overflow: hidden;
}

/* ─── About Dialog ─── */
.about-content {
  text-align: center;
}

.about-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.about-logo {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  filter: drop-shadow(0 8px 18px rgba(20, 45, 85, 0.14));
}

.about-content h3 {
  margin: 0;
  color: #303133;
  font-size: 18px;
}

.about-desc {
  margin: 0;
  color: #606266;
  font-size: 13px;
}

.about-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 13px;
}

.about-label {
  color: #909399;
}

.about-value {
  color: #303133;
}

.about-value a {
  color: var(--eap-primary);
  text-decoration: none;
}

.about-value a:hover {
  text-decoration: underline;
}

.about-thanks {
  margin: 0;
  color: #909399;
  font-size: 12px;
}
</style>
