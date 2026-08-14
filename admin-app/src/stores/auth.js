import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import router from '../router'

const API = '/api/admin'

function getSavedUser() {
  try {
    const raw = localStorage.getItem('admin_user')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function getAuthHeaders(extra = {}) {
  const token = localStorage.getItem('admin_token')
  const headers = { ...extra }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref(getSavedUser())
  const isLoggedIn = computed(() => !!user.value)
  const sidebarOpen = ref(true)
  const idleTimer = ref(null)
  let lastActivity = Date.now()
  const companyName = ref('AmsDev Wisuda')
  const logoUrl = ref('')
  const settings = ref({})

  const idleTimeoutMs = computed(() => {
    const minutes = parseInt(settings.value.session_timeout_minutes || '1440', 10)
    return (isNaN(minutes) || minutes <= 0 ? 1440 : minutes) * 60 * 1000
  })

  async function fetchSettings() {
    try {
      const res = await fetch(`${API}/settings`, { headers: getAuthHeaders(), credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        if (data.settings) {
          settings.value = data.settings
          companyName.value = data.settings.company_name || data.settings.companyName || 'AmsDev Wisuda'
          logoUrl.value = data.settings.logo_url || ''
          const favUrl = data.settings.favicon_url || data.settings.logo_url || ''
          if (favUrl) {
            let found = false
            document.querySelectorAll("link[rel*='icon']").forEach(link => {
              link.href = favUrl
              found = true
            })
            if (!found) {
              const link = document.createElement('link')
              link.rel = 'icon'
              link.type = 'image/png'
              link.href = favUrl
              document.head.appendChild(link)
            }
          }
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
      if (data.token) {
        localStorage.setItem('admin_token', data.token)
      }
      if (data.user) {
        localStorage.setItem('admin_user', JSON.stringify(data.user))
      }
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
      await fetch(`${API}/logout`, { method: 'POST', headers: getAuthHeaders(), credentials: 'include' })
    } catch {}
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    user.value = null
    router.push('/admin/login')
  }

  async function checkAuth() {
    const token = localStorage.getItem('admin_token')
    try {
      const res = await fetch(`${API}/profile`, { headers: getAuthHeaders(), credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        user.value = data.user
        if (data.user) {
          localStorage.setItem('admin_user', JSON.stringify(data.user))
        }
        fetchSettings()
        startIdleWatcher()
      } else {
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_user')
        user.value = null
      }
    } catch {
      if (!token) {
        user.value = null
      }
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
    // Check every 10s against dynamic timeout set in settings (or fallback to 1440 mins)
    idleTimer.value = setInterval(() => {
      if (Date.now() - lastActivity > idleTimeoutMs.value) {
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

  return { user, isLoggedIn, sidebarOpen, companyName, logoUrl, settings, login, logout, checkAuth, toggleSidebar, fetchSettings }
})
