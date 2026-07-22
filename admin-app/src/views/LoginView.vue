<template>
  <div class="w-full h-full flex items-center justify-center p-4 relative overflow-hidden">
    <!-- Subtle background glow -->
    <div class="absolute -top-32 -left-32 w-96 h-96 bg-[#C59B63]/10 dark:bg-[#C59B63]/5 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute -bottom-32 -right-32 w-96 h-96 bg-[#C59B63]/10 dark:bg-[#C59B63]/5 rounded-full blur-3xl pointer-events-none"></div>

    <div class="w-full max-w-md bg-white dark:bg-slate-900 border border-[#E5E0D8] dark:border-slate-800 rounded-3xl p-8 shadow-xl shadow-[#1A1A2E]/5 relative z-10 animate-fade-up">
      <!-- Header / Logo -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center mb-4">
          <img v-if="logoUrl" :src="logoUrl" class="h-12 w-auto object-contain" alt="Logo">
          <div v-else class="w-12 h-12 rounded-2xl bg-[#1A1A2E] dark:bg-slate-800 border border-[#C59B63]/30 flex items-center justify-center text-sm font-bold text-[#C59B63] shadow-md">
            {{ (companyName || 'W')[0] }}
          </div>
        </div>
        <h1 class="font-serif text-3xl font-light text-[#1A1A2E] dark:text-slate-100 tracking-tight">
          {{ companyName }}
        </h1>
        <p class="text-xs text-[#6B7280] dark:text-slate-400 mt-1 font-light tracking-wide uppercase">Superadmin Console</p>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div v-if="error" class="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 text-xs font-medium">
          {{ error }}
        </div>

        <div>
          <label class="block text-xs font-semibold text-[#1A1A2E] dark:text-slate-300 mb-1.5">Username Admin</label>
          <input v-model="username" type="text" required autofocus
            class="input-fancy" placeholder="Masukkan username...">
        </div>

        <div>
          <label class="block text-xs font-semibold text-[#1A1A2E] dark:text-slate-300 mb-1.5">Kata Sandi</label>
          <input v-model="password" type="password" required
            class="input-fancy" placeholder="••••••••">
        </div>

        <button type="submit" :disabled="loading"
          class="w-full py-3.5 bg-[#1A1A2E] dark:bg-slate-800 text-[#C59B63] rounded-xl font-semibold text-xs hover:bg-[#2A2A4E] dark:hover:bg-slate-700 transition shadow-lg shadow-[#1A1A2E]/8 flex items-center justify-center gap-2 disabled:opacity-50">
          <span v-if="loading" class="w-4 h-4 border-2 border-[#C59B63]/30 border-t-[#C59B63] rounded-full animate-spin"></span>
          <span v-else>Masuk ke System Dashboard</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const companyName = ref('')
const logoUrl = ref('')

onMounted(async () => {
  try {
    const res = await fetch('/api/public/settings')
    if (res.ok) {
      const data = await res.json()
      if (data.company_name) companyName.value = data.company_name
      if (data.logo_url) logoUrl.value = data.logo_url
    }
  } catch {}
})

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

<style scoped>
.font-serif {
  font-family: 'Cormorant Garamond', serif;
}
</style>