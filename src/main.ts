import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './styles/variables.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import LoginPage from './components/LoginPage.vue'
import SuccessPage from './components/SuccessPage.vue'
import Layout from './components/Layout.vue'
import EnginePage from './components/EnginePage.vue'
import AutoReplyPage from './components/AutoReplyPage.vue'
import SMLPage from './components/SMLPage.vue'
import CommunicationPage from './components/CommunicationPage.vue'
import FlowPage from './components/FlowPage.vue'
import FlowEditorPage from './components/FlowEditorPage.vue'
import AutoSecsPage from './components/AutoSecsPage.vue'
import RoleManagement from './components/RoleManagement.vue'
import ChecklistPage from './components/ChecklistPage.vue'
import ChecklistDetailPage from './components/ChecklistDetailPage.vue'
import VendorModelPage from './components/VendorModelPage.vue'

const routes = [
  { path: '/', component: LoginPage },
  { path: '/success', component: SuccessPage },
  {
    path: '/',
    component: Layout,
    children: [
      { path: 'roles', component: RoleManagement, meta: { keepAlive: true } },
      { path: 'engine', component: EnginePage, meta: { keepAlive: true } },
      { path: 'autoreply', component: AutoReplyPage, meta: { keepAlive: true } },
      { path: 'sml', component: SMLPage, meta: { keepAlive: true } },
      { path: 'communication', component: CommunicationPage },
      { path: 'flow', component: FlowPage, meta: { keepAlive: true } },
      { path: 'flow/:id/edit', component: FlowEditorPage },
      { path: 'auto-secs', component: AutoSecsPage },
      { path: 'checklist', component: ChecklistPage, meta: { keepAlive: true } },
      { path: 'checklist/:id/edit', component: ChecklistDetailPage },
      { path: 'vendors', component: VendorModelPage, meta: { keepAlive: true } }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, _from, next) => {
  const isLoggedIn = !!localStorage.getItem('token')
  const publicPaths = ['/', '/success']
  const isPublic = publicPaths.includes(to.path)

  if (!isLoggedIn && !isPublic) {
    next('/')
    return
  }

  if (to.path === '/' && isLoggedIn) {
    next('/engine')
    return
  }

  if (to.path === '/roles') {
    const userData = localStorage.getItem('user')
    if (userData) {
      const user = JSON.parse(userData)
      if (user.roleId !== 1) {
        next('/engine')
        return
      }
    }
  }
  next()
})

const app = createApp(App)
app.use(router)
app.use(ElementPlus)

// Register all icons
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.mount('#app')