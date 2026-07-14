<template>
  <div class="min-h-screen bg-[#FFF8F3] flex">
    <!-- Sidebar -->
    <aside class="w-64 bg-white border-r border-[#E8D5C8] flex flex-col flex-shrink-0 h-screen sticky top-0" v-show="authStore.isLoggedIn">
      <!-- Logo -->
      <div class="h-16 flex items-center px-5 border-b border-[#E8D5C8] flex-shrink-0">
        <div class="flex items-center gap-2.5">
          <span class="w-8 h-8 rounded-xl bg-gradient-to-br from-[#D94A3D] to-[#F0784B] flex items-center justify-center text-xs font-bold text-white shadow-sm">W</span>
          <span class="text-sm font-bold text-[#2D1B14] tracking-tight">wisuda<span class="text-[#D94A3D]">.</span></span>
        </div>
      </div>

      <!-- Nav -->
      <nav class="flex-1 py-3 px-2.5 space-y-0.5 overflow-y-auto min-h-0">
        <router-link v-for="item in menu" :key="item.path" :to="item.path"
          class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
          :class="isActive(item.path) 
            ? 'bg-[#FDECEA] text-[#D94A3D]' 
            : 'text-[#8A7A72] hover:bg-[#FFF0E8] hover:text-[#2D1B14]'">
          <span class="w-5 h-5 flex-shrink-0 flex items-center justify-center" :class="isActive(item.path) ? 'text-[#D94A3D]' : 'text-[#C4B0A5]'" v-html="item.icon"></span>
          <span>{{ item.label }}</span>
        </router-link>
      </nav>

      <!-- User -->
      <div class="p-4 border-t border-[#E8D5C8] mt-auto flex-shrink-0">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-[#D94A3D] to-[#F0784B] flex items-center justify-center text-xs font-bold text-white">{{ (authStore.user?.name || 'A')[0] }}</div>
            <div class="text-xs">
              <p class="font-semibold text-[#2D1B14]">{{ authStore.user?.name || 'Admin' }}</p>
              <p class="text-[#D94A3D] text-[10px]">{{ authStore.user?.role }}</p>
            </div>
          </div>
          <button @click="authStore.logout()" class="w-8 h-8 rounded-lg flex items-center justify-center text-[#C4B0A5] hover:text-[#D94A3D] hover:bg-red-50 transition" title="Logout">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
          </button>
        </div>
      </div>
    </aside>

    <!-- Main -->
    <div class="flex-1 flex flex-col min-h-screen">
      <!-- Header -->
      <header class="h-16 bg-white/80 backdrop-blur-md border-b border-[#E8D5C8] flex items-center px-6 sticky top-0 z-30" v-show="authStore.isLoggedIn">
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center gap-3">
            <button class="w-8 h-8 rounded-lg flex items-center justify-center text-[#C4B0A5] hover:text-[#2D1B14] hover:bg-[#FFF0E8] transition md:hidden">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
            <h1 class="text-sm font-semibold text-[#2D1B14]">Dashboard Admin</h1>
          </div>
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#FDECEA] rounded-full text-[9px] font-medium text-[#D94A3D]">
              <span class="w-1.5 h-1.5 rounded-full bg-[#D94A3D] animate-pulse"></span>
              live
            </span>
          </div>
        </div>
      </header>

      <!-- Content -->
      <main class="flex-1 p-6 overflow-y-auto">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { RouterView, useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'

const route = useRoute()
const authStore = useAuthStore()

function isActive(path) {
  if (path === '/admin') return route.path === '/admin'
  return route.path.startsWith(path)
}

const menu = [
  { path: '/admin', label: 'Dashboard', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>' },
  { path: '/admin/inquiries', label: 'Inquiries', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>' },
  { path: '/admin/bookings', label: 'Bookings', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>' },
  { path: '/admin/freelancers', label: 'Freelancers (FG)', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197"/></svg>' },
  { path: '/admin/packages', label: 'Paket & Harga', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>' },
  { path: '/admin/finances', label: 'Keuangan', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.58-2 3.58 2-3.58-2 3.58 2-3.58-2 3.58 2-3.58-2 3.58 2-3.58-2 3.58 2-3.58-2 3.58 2-3.58-2 3.58 2-3.58-2 3.58 2-3.58-2 3.58 2-3.58-2 3.58 2-3.58-2 3.58 2-3.58-2 3.58 2-3.58-2 3.5-2 3.58 2z"/></svg>' },
  { path: '/admin/deliverables', label: 'Deliverables & QC', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>' },
  { path: '/admin/portfolio', label: 'Portfolio', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>' },
  { path: '/admin/reports', label: 'Laporan', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>' },
  { path: '/admin/settings', label: 'Settings', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>' },
]
</script>

<style>
body { background: #FFF8F3; }
.card {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #E8D5C8;
  box-shadow: 0 1px 2px rgba(217,74,61,0.04), 0 4px 12px rgba(217,74,61,0.06);
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
  transition: border-color 0.2s, box-shadow 0.2s;
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
</style>
