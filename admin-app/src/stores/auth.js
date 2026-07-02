import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import router from '../router'

const API = '/api/admin'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const isLoggedIn = computed(() => !!user.value)
  const sidebarOpen = ref(true)

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
      return data
    } catch (e) {
      throw e
    }
  }

  async function logout() {
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
        // Session active, but we need user info
        user.value = { name: 'Admin', role: 'admin' }
      } else {
        user.value = null
      }
    } catch {
      user.value = null
    }
  }

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  return { user, isLoggedIn, sidebarOpen, login, logout, checkAuth, toggleSidebar }
})