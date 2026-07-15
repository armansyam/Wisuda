import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import router from '../router'

const API = '/api/admin'
const IDLE_TIMEOUT = 10 * 60 * 1000 // 10 menit

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const isLoggedIn = computed(() => !!user.value)
  const sidebarOpen = ref(true)
  const idleTimer = ref(null)
  let lastActivity = Date.now()
  const companyName = ref('AmsDev Wisuda')

  async function fetchSettings() {
    try {
      const res = await fetch(`${API}/settings`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        if (data.settings && data.settings.companyName) {
          companyName.value = data.settings.companyName
        }
      }
    } catch {}
  }

  async function login(username, password) {
    try {
      const res = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')
      user.value = data.user
      fetchSettings()
      startIdleWatcher()
      return data
    } catch (e) {
      throw e
    }
  }

  async function logout() {
    stopIdleWatcher()
    try {
      await fetch(`${API}/logout`, { method: 'POST', credentials: 'include' })
    } catch {}
    user.value = null
    router.push('/admin/login')
  }

  async function checkAuth() {
    try {
      const res = await fetch(`${API}/dashboard/stats`, { credentials: 'include' })
      if (res.ok) {
        user.value = { name: 'Admin', role: 'admin' }
        fetchSettings()
        startIdleWatcher()
      } else {
        user.value = null
      }
    } catch {
      user.value = null
    }
  }

  function resetIdle() {
    lastActivity = Date.now()
  }

  function startIdleWatcher() {
    stopIdleWatcher()
    lastActivity = Date.now()
    // Listen user activity
    document.addEventListener('click', resetIdle, { passive: true })
    document.addEventListener('keydown', resetIdle, { passive: true })
    document.addEventListener('mousemove', resetIdle, { passive: true })
    document.addEventListener('touchstart', resetIdle, { passive: true })
    // Check every 10s
    idleTimer.value = setInterval(() => {
      if (Date.now() - lastActivity > IDLE_TIMEOUT) {
        logout()
      }
    }, 10000)
  }

  function stopIdleWatcher() {
    if (idleTimer.value) {
      clearInterval(idleTimer.value)
      idleTimer.value = null
    }
    document.removeEventListener('click', resetIdle)
    document.removeEventListener('keydown', resetIdle)
    document.removeEventListener('mousemove', resetIdle)
    document.removeEventListener('touchstart', resetIdle)
  }

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  return { user, isLoggedIn, sidebarOpen, companyName, login, logout, checkAuth, toggleSidebar, fetchSettings }
})
