<template>
  <div :class="authStore.isLoggedIn ? 'h-screen bg-[#FFF8F3] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex transition-colors duration-300 overflow-hidden' : 'min-h-screen w-full bg-[#FAF9F6] dark:bg-[#0B0F19] flex text-slate-800 dark:text-slate-100'">
    <!-- Desktop Sidebar -->
    <aside class="hidden md:flex w-64 bg-white dark:bg-slate-900 border-r border-[#E8D5C8] dark:border-slate-800 flex-col flex-shrink-0 h-full transition-colors duration-300" v-show="authStore.isLoggedIn">
      <!-- Logo -->
      <div class="h-16 flex items-center px-5 border-b border-[#E8D5C8] dark:border-slate-800 flex-shrink-0">
        <div class="flex items-center gap-2.5">
          <img v-if="authStore.logoUrl" :src="authStore.logoUrl" class="w-8 h-8 object-contain rounded-xl shadow-sm" alt="Logo">
          <span v-else class="w-8 h-8 rounded-xl bg-gradient-to-br from-[#111E36] to-[#C5A880] flex items-center justify-center text-xs font-bold text-white shadow-sm">{{ (authStore.companyName || 'W')[0] }}</span>
          <span class="text-sm font-bold text-[#2D1B14] dark:text-slate-200 tracking-tight truncate max-w-[140px]">{{ authStore.companyName || 'wisuda.' }}</span>
        </div>
      </div>

      <!-- Nav -->
      <nav class="flex-1 py-3 px-2.5 space-y-0.5 overflow-y-auto min-h-0">
        <router-link v-for="item in menu" :key="item.path" :to="item.path"
          class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
          :class="isActive(item.path) 
            ? 'bg-[#FDECEA] text-[#D94A3D] dark:bg-amber-950/20 dark:text-amber-400' 
            : 'text-[#8A7A72] dark:text-slate-400 hover:bg-[#FFF0E8] hover:text-[#2D1B14] dark:hover:bg-slate-800 dark:hover:text-slate-200'">
          <span class="w-5 h-5 flex-shrink-0 flex items-center justify-center" :class="isActive(item.path) ? 'text-[#D94A3D]' : 'text-[#C4B0A5]'" v-html="item.icon"></span>
          <span>{{ item.label }}</span>
        </router-link>
      </nav>

      <!-- User -->
      <div class="p-4 border-t border-[#E8D5C8] dark:border-slate-800 mt-auto flex-shrink-0">
        <div class="flex items-center justify-between">
          <div @click="goToProfile" class="flex items-center gap-2.5 cursor-pointer hover:opacity-85 active:scale-95 transition-all">
            <div v-if="authStore.user?.avatar_url" class="w-8 h-8 rounded-xl overflow-hidden shadow-sm flex items-center justify-center bg-slate-100 dark:bg-slate-900 border border-[#E8D5C8]/60 dark:border-slate-800">
              <img :src="authStore.user.avatar_url" class="w-full h-full object-cover">
            </div>
            <div v-else class="w-8 h-8 rounded-xl bg-gradient-to-br from-[#111E36] to-[#C5A880] flex items-center justify-center text-xs font-bold text-white shadow-sm">
              {{ (authStore.user?.name || 'A')[0] }}
            </div>
            <div class="text-xs">
              <p class="font-semibold text-[#2D1B14] dark:text-slate-200">{{ authStore.user?.name || 'Admin' }}</p>
              <p class="text-[#D94A3D] dark:text-amber-400 text-[10px]">{{ authStore.user?.role }}</p>
            </div>
          </div>
          <button @click="authStore.logout()" class="w-8 h-8 rounded-lg flex items-center justify-center text-[#C4B0A5] hover:text-[#D94A3D] dark:text-slate-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition" title="Logout">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
          </button>
        </div>
      </div>
    </aside>

    <!-- Mobile Drawer Overlay -->
    <div v-if="authStore.isLoggedIn && isMobileMenuOpen" class="fixed inset-0 z-50 flex md:hidden">
      <div class="fixed inset-0 bg-black/60 backdrop-blur-sm" @click="isMobileMenuOpen = false"></div>
      <aside class="w-72 bg-white dark:bg-slate-900 border-r border-[#E8D5C8] dark:border-slate-800 flex flex-col flex-shrink-0 h-full relative z-10 shadow-2xl animate-fade-in">
        <div class="h-16 flex items-center justify-between px-5 border-b border-[#E8D5C8] dark:border-slate-800 flex-shrink-0">
          <div class="flex items-center gap-2.5">
            <img v-if="authStore.logoUrl" :src="authStore.logoUrl" class="w-8 h-8 object-contain rounded-xl shadow-sm" alt="Logo">
            <span v-else class="w-8 h-8 rounded-xl bg-gradient-to-br from-[#111E36] to-[#C5A880] flex items-center justify-center text-xs font-bold text-white shadow-sm">{{ (authStore.companyName || 'W')[0] }}</span>
            <span class="text-sm font-bold text-[#2D1B14] dark:text-slate-200 tracking-tight truncate max-w-[140px]">{{ authStore.companyName || 'wisuda.' }}</span>
          </div>
          <button @click="isMobileMenuOpen = false" class="w-8 h-8 rounded-lg flex items-center justify-center text-[#8A7A72] dark:text-slate-400 hover:bg-[#FFF0E8] dark:hover:bg-slate-800">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <nav class="flex-1 py-3 px-2.5 space-y-1 overflow-y-auto min-h-0">
          <router-link v-for="item in menu" :key="item.path" :to="item.path" @click="isMobileMenuOpen = false"
            class="flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all"
            :class="isActive(item.path) 
              ? 'bg-[#FDECEA] text-[#D94A3D] dark:bg-amber-950/20 dark:text-amber-400 font-semibold' 
              : 'text-[#8A7A72] dark:text-slate-400 hover:bg-[#FFF0E8] hover:text-[#2D1B14] dark:hover:bg-slate-800 dark:hover:text-slate-200'">
            <span class="w-5 h-5 flex-shrink-0 flex items-center justify-center" :class="isActive(item.path) ? 'text-[#D94A3D]' : 'text-[#C4B0A5]'" v-html="item.icon"></span>
            <span>{{ item.label }}</span>
          </router-link>
        </nav>

        <div class="p-4 border-t border-[#E8D5C8] dark:border-slate-800 mt-auto flex-shrink-0">
          <div class="flex items-center justify-between">
            <div @click="goToProfile" class="flex items-center gap-2.5 cursor-pointer hover:opacity-85 active:scale-95 transition-all">
              <div v-if="authStore.user?.avatar_url" class="w-8 h-8 rounded-xl overflow-hidden shadow-sm flex items-center justify-center bg-slate-100 dark:bg-slate-900 border border-[#E8D5C8]/60 dark:border-slate-800">
                <img :src="authStore.user.avatar_url" class="w-full h-full object-cover">
              </div>
              <div v-else class="w-8 h-8 rounded-xl bg-gradient-to-br from-[#111E36] to-[#C5A880] flex items-center justify-center text-xs font-bold text-white shadow-sm">
                {{ (authStore.user?.name || 'A')[0] }}
              </div>
              <div class="text-xs">
                <p class="font-semibold text-[#2D1B14] dark:text-slate-200">{{ authStore.user?.name || 'Admin' }}</p>
                <p class="text-[#D94A3D] dark:text-amber-400 text-[10px]">{{ authStore.user?.role }}</p>
              </div>
            </div>
            <button @click="authStore.logout(); isMobileMenuOpen = false" class="w-8 h-8 rounded-lg flex items-center justify-center text-[#C4B0A5] hover:text-[#D94A3D] dark:text-slate-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition" title="Logout">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            </button>
          </div>
        </div>
      </aside>
    </div>

    <!-- Main -->
    <div :class="authStore.isLoggedIn ? 'flex-1 flex flex-col h-screen dark:bg-slate-950 w-full overflow-hidden' : 'flex-1 flex flex-col min-h-screen w-full overflow-y-auto'">
      <!-- Header -->
      <header class="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-[#E8D5C8] dark:border-slate-800 flex items-center px-4 md:px-6 sticky top-0 z-30 transition-colors duration-300" v-show="authStore.isLoggedIn">
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center gap-3">
            <button @click="isMobileMenuOpen = !isMobileMenuOpen" class="w-9 h-9 rounded-xl flex items-center justify-center text-[#8A7A72] dark:text-slate-300 hover:text-[#2D1B14] hover:bg-[#FFF0E8] dark:hover:bg-slate-800 transition md:hidden border border-[#E8D5C8]/80 dark:border-slate-800">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
            <h1 class="text-xs md:text-sm font-semibold text-[#2D1B14] dark:text-slate-200 truncate">Dashboard Admin</h1>
          </div>
          <div class="flex items-center gap-3.5">
            <!-- Day/Night Theme Toggle -->
            <button @click="toggleTheme()" class="w-8 h-8 rounded-xl flex items-center justify-center border border-[#E8D5C8] dark:border-slate-800 bg-white dark:bg-slate-900 text-[#8A7A72] dark:text-slate-400 hover:text-[#D4AF37] dark:hover:text-amber-400 hover:bg-[#FFF0E8] dark:hover:bg-slate-800 transition" title="Toggle Theme">
              <!-- Moon Icon -->
              <svg v-if="!isDark" class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
              <!-- Sun Icon -->
              <svg v-else class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m2.828-9.9a5 5 0 117.07 7.07m-2.828-9.9L12 11.586m0 0l-3.536 3.536"/></svg>
            </button>
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#FDECEA] dark:bg-amber-950/40 rounded-full text-[9px] font-medium text-[#D94A3D] dark:text-amber-400">
              <span class="w-1.5 h-1.5 rounded-full bg-[#D94A3D] dark:bg-amber-400 animate-pulse"></span>
              live
            </span>
          </div>
        </div>
      </header>

      <!-- Content -->
      <main :class="authStore.isLoggedIn ? 'flex-1 p-4 md:p-6 overflow-y-auto w-full' : 'flex-1 w-full overflow-y-auto flex flex-col justify-center items-center py-8'">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { ref, onMounted } from 'vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

function goToProfile() {
  isMobileMenuOpen.value = false
  router.push({ path: '/admin/settings', query: { tab: 'security' } })
}

// Mobile menu & theme state
const isMobileMenuOpen = ref(false)
const isDark = ref(false)

function toggleTheme() {
  isDark.value = !isDark.value
  if (isDark.value) {
    document.documentElement.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', 'light')
  }
}

onMounted(() => {
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    isDark.value = true
    document.documentElement.classList.add('dark')
  } else {
    isDark.value = false
    document.documentElement.classList.remove('dark')
  }
})

function isActive(path) {
  if (path === '/admin') return route.path === '/admin'
  return route.path.startsWith(path)
}

const menu = [
  { path: '/admin', label: 'Dashboard', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>' },
  { path: '/admin/inquiries', label: 'Inquiries', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>' },
  { path: '/admin/bookings', label: 'Client', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z"/></svg>' },
  { path: '/admin/deliverables', label: 'Post Production', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"/></svg>' },
  { path: '/admin/payroll', label: 'Payroll Freelance', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2-2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>' },
  { path: '/admin/freelancers', label: 'Freelancers', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197"/></svg>' },
  { path: '/admin/packages', label: 'Paket & Harga', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>' },
  { path: '/admin/archive', label: 'Arsip', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>' },
  { path: '/admin/portfolio', label: 'Portfolio', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>' },
  { path: '/admin/reports', label: 'Laporan & Analitik', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>' },
  { path: '/admin/settings', label: 'Settings', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>' },
]
</script>

<style>
body { background: #FAF9F6; transition: background-color 0.3s, color 0.3s; }
.card {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #E8D5C8;
  box-shadow: 0 1px 2px rgba(217,74,61,0.02), 0 4px 12px rgba(217,74,61,0.04);
  transition: all 0.3s;
}
.status-chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.02em;
  white-space: nowrap;
}
.input-fancy {
  width: 100%;
  padding: 10px 14px;
  background: #ffffff;
  border: 1px solid #E8D5C8;
  border-radius: 12px;
  font-size: 13px;
  color: #2D1B14;
  outline: none;
  transition: all 0.25s;
}
.input-fancy:focus {
  border-color: #D94A3D;
  box-shadow: 0 0 0 3px rgba(217,74,61,0.12);
}
.input-fancy::placeholder { color: #C4B0A5; }
.loading-spinner {
  width: 24px; height: 24px;
  border: 2.5px solid #E8D5C8;
  border-top-color: #D94A3D;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes pop {
  0% { opacity: 0; transform: scale(0.95) translateY(8px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
.animate-pop { animation: pop 0.2s ease-out; }
@keyframes fade-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-up { animation: fade-up 0.3s ease-out both; }

/* ── Day Mode (Light) Overrides ── */
body {
  background-color: #FAF9F6 !important;
  color: #1e293b !important;
}

.text-\[\#2D1B14\] {
  color: #111E36 !important; /* Deep Navy */
}

.text-\[\#8A7A72\] {
  color: #475569 !important; /* Slate Gray */
}

.text-\[\#C4B0A5\] {
  color: #94a3b8 !important; /* Medium Slate */
}

.bg-\[\#FFF8F3\] {
  background-color: #FAF9F6 !important; /* Elegant Cream */
}

.border-\[\#E8D5C8\],
.border-b-\[\#E8D5C8\],
.border-r-\[\#E8D5C8\],
.border-t-\[\#E8D5C8\],
.border-l-\[\#E8D5C8\],
.border-\[\#E8D5C8\]\/60,
.border-b-\[\#E8D5C8\]\/60 {
  border-color: #E2E8F0 !important; /* Clean modern gray border */
}

.input-fancy {
  background-color: #ffffff !important;
  border-color: #cbd5e1 !important;
  color: #0f172a !important;
}
.input-fancy:focus {
  border-color: #C5A880 !important;
  box-shadow: 0 0 0 3px rgba(197, 168, 128, 0.2) !important;
}
.input-fancy::placeholder {
  color: #94a3b8 !important;
}

.bg-\[\#FDECEA\] {
  background-color: #FAF0DD !important; /* Light Champagne Gold tint */
}

.text-\[\#D94A3D\] {
  color: #B5942B !important; /* Warm Gold */
}

.hover\:bg-\[\#FFF0E8\]:hover {
  background-color: #FAF0DD !important;
}

.hover\:text-\[\#2D1B14\]:hover {
  color: #111E36 !important;
}

.hover\:bg-\[\#FFE5DA\]:hover {
  background-color: #FAF0DD !important;
}

.bg-\[\#FFF0E8\] {
  background-color: #F8F1E5 !important;
}

.loading-spinner {
  border-color: #FAF0DD !important;
  border-top-color: #B5942B !important;
}

.hover\:bg-red-50:hover {
  background-color: #FEF2F2 !important;
}

.border-l-\[\#F4A261\] {
  border-left-color: #D4AF37 !important; /* Gold */
}
.text-\[\#F4A261\] {
  color: #D4AF37 !important;
}
.border-l-\[\#D94A3D\] {
  border-left-color: #B5942B !important; /* Dark Gold */
}
.border-l-\[\#EF4444\] {
  border-left-color: #EF4444 !important; /* Keep Red alert */
}
.hover\:bg-\[\#FFF8F3\]:hover {
  background-color: #F8F5F0 !important; /* Hover bg */
}

/* ── Night Mode (Dark) Overrides ── */
.dark body {
  background-color: #0B0F19 !important; /* Midnight Dark */
  color: #cbd5e1 !important;
}

.dark .text-\[\#2D1B14\] {
  color: #f8fafc !important; /* High contrast clean white */
}

.dark .text-\[\#8A7A72\] {
  color: #94a3b8 !important; /* Readable slate gray */
}

.dark .text-\[\#C4B0A5\] {
  color: #4b5563 !important; /* Muted Slate */
}

.dark .bg-\[\#FFF8F3\] {
  background-color: #0B0F19 !important;
}

.dark .bg-white {
  background-color: #111827 !important; /* slate-900 / dark cards */
}

.dark .card {
  background-color: #111827 !important;
  border-color: #1f2937 !important; /* slate-800 border */
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.15);
}

.dark .border-\[\#E8D5C8\],
.dark .border-b-\[\#E8D5C8\],
.dark .border-r-\[\#E8D5C8\],
.dark .border-t-\[\#E8D5C8\],
.dark .border-l-\[\#E8D5C8\],
.dark .border-\[\#E8D5C8\]\/60,
.dark .border-b-\[\#E8D5C8\]\/60 {
  border-color: #1f2937 !important;
}

.dark .input-fancy {
  background-color: #0b0f19 !important;
  border-color: #1f2937 !important;
  color: #f8fafc !important;
}

.dark .input-fancy:focus {
  border-color: #D4AF37 !important;
  box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.15) !important;
}

.dark .input-fancy::placeholder {
  color: #4b5563 !important;
}

.dark .bg-\[\#FDECEA\] {
  background-color: rgba(212, 175, 55, 0.15) !important; /* Gold tint */
}

.dark .text-\[\#D94A3D\] {
  color: #F3C63F !important; /* Gold accent */
}

.dark .hover\:bg-\[\#FFF0E8\]:hover {
  background-color: rgba(212, 175, 55, 0.1) !important;
}

.dark .hover\:text-\[\#2D1B14\]:hover {
  color: #f8fafc !important;
}

.dark .hover\:bg-\[\#FFE5DA\]:hover {
  background-color: rgba(212, 175, 55, 0.1) !important;
}

.dark .bg-\[\#FFF0E8\] {
  background-color: rgba(212, 175, 55, 0.1) !important;
}

.dark .loading-spinner {
  border-color: rgba(212, 175, 55, 0.1) !important;
  border-top-color: #D4AF37 !important;
}

.dark .hover\:bg-red-50:hover {
  background-color: rgba(239, 68, 68, 0.15) !important;
}

.dark select.input-fancy option {
  background-color: #111827 !important;
  color: #f8fafc !important;
}

.dark .border-l-\[\#F4A261\] {
  border-left-color: #D4AF37 !important;
}

.dark .text-\[\#F4A261\] {
  color: #D4AF37 !important;
}

.dark .border-l-\[\#D94A3D\] {
  border-left-color: #F3C63F !important;
}

.dark .border-l-\[\#EF4444\] {
  border-left-color: #ef4444 !important;
}

.dark .hover\:bg-\[\#FFF8F3\]:hover {
  background-color: #1f2937 !important;
}
</style>
