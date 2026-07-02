<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <p class="font-serif text-3xl font-bold text-amber-400">Wisuda<span class="text-white">.</span></p>
        <p class="text-gray-400 text-sm mt-2">Admin Dashboard</p>
      </div>
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div v-if="error" class="p-3 bg-red-900/30 border border-red-800/50 rounded-lg text-red-400 text-sm">{{ error }}</div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Username</label>
          <input v-model="username" type="text" required
            class="w-full bg-gray-800/60 border border-gray-700/50 rounded-lg px-4 py-3 text-gray-200 focus:outline-none focus:border-amber-500/50" placeholder="admin">
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Password</label>
          <input v-model="password" type="password" required
            class="w-full bg-gray-800/60 border border-gray-700/50 rounded-lg px-4 py-3 text-gray-200 focus:outline-none focus:border-amber-500/50" placeholder="****">
        </div>
        <button type="submit" :disabled="loading"
          class="w-full py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-500 transition disabled:opacity-50 flex items-center justify-center gap-2">
          <span v-if="loading" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          <span v-else>Masuk</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  loading.value = true
  error.value = ''
  try {
    await authStore.login(username.value, password.value)
    router.push('/admin')
  } catch (e) {
    error.value = e.message
  }
  loading.value = false
}
</script>