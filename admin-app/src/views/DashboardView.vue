<template>
  <div class="max-w-7xl mx-auto">
    <!-- Header w/ pulse -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="font-serif text-3xl font-bold text-white tracking-tight">Overview</h1>
        <p class="text-gray-500 text-sm mt-1">{{ greeting }}, <span class="text-gray-300">Ammang</span></p>
      </div>
      <div class="flex items-center gap-3">
        <span class="inline-flex items-center gap-1.5 text-xs text-gray-500">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          {{ timeStr }}
        </span>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-24">
      <div class="w-10 h-10 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
    </div>

    <template v-else>
      <!-- Row 1: Revenue Hero + Verification Alerts -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <!-- Revenue Hero (spans 2) -->
        <div class="lg:col-span-2 bg-gradient-to-br from-[#1a1a1a] to-[#141414] border border-gray-800/60 rounded-2xl p-6 relative overflow-hidden">
          <div class="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
          <div class="relative z-10">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-medium text-gray-500 uppercase tracking-widest">Pendapatan Bulan Ini</span>
              <span class="flex items-center gap-1 text-xs font-medium"
                :class="trendColor">
                <svg v-if="s.revenue_trend > 0" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>
                <svg v-else class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg>
                {{ Math.abs(s.revenue_trend) }}% vs bulan lalu
              </span>
            </div>
            <div class="text-4xl font-bold text-white tracking-tight mt-1">{{ s.revenue_this_month }}</div>
            <div class="flex items-center gap-6 mt-4 text-sm">
              <div>
                <span class="text-gray-500">Total</span>
                <span class="text-white ml-2 font-semibold">{{ s.revenue_total }}</span>
              </div>
              <div>
                <span class="text-gray-500">Bulan lalu</span>
                <span class="text-gray-300 ml-2">{{ s.revenue_last_month }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Verification Alerts -->
        <div class="space-y-3">
          <div v-if="s.dp_uploaded > 0" class="bg-amber-500/10 border border-amber-500/25 rounded-xl p-4 relative overflow-hidden">
            <div class="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl"></div>
            <div class="relative z-10">
              <div class="flex items-center justify-between">
                <span class="text-xs font-medium text-amber-400 uppercase tracking-wider">DP Uploaded</span>
                <span class="text-2xl font-bold text-amber-400">{{ s.dp_uploaded }}</span>
              </div>
              <p class="text-xs text-amber-400/70 mt-1.5">Perlu verifikasi pembayaran</p>
              <router-link to="/admin/bookings" class="inline-block mt-2 text-xs text-amber-400/80 hover:text-amber-300 underline underline-offset-2">Lihat Booking →</router-link>
            </div>
          </div>
          <div v-if="s.balance_uploaded > 0" class="bg-sky-500/10 border border-sky-500/25 rounded-xl p-4">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-sky-400 uppercase tracking-wider">Pelunasan Upload</span>
              <span class="text-2xl font-bold text-sky-400">{{ s.balance_uploaded }}</span>
            </div>
            <p class="text-xs text-sky-400/70 mt-1.5">Perlu verifikasi pelunasan</p>
          </div>
          <div v-if="s.bookings_cancelled > 0" class="bg-red-500/10 border border-red-500/25 rounded-xl p-4">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-red-400 uppercase tracking-wider">Cancelled</span>
              <span class="text-2xl font-bold text-red-400">{{ s.bookings_cancelled }}</span>
            </div>
            <p class="text-xs text-red-400/70 mt-1.5">Booking dibatalkan</p>
          </div>
          <div v-if="!s.dp_uploaded && !s.balance_uploaded && !s.bookings_cancelled" class="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
            <div class="flex items-center gap-2 text-emerald-400">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <span class="text-sm font-medium">Semua clear</span>
            </div>
            <p class="text-xs text-emerald-400/60 mt-1">Tidak ada alert hari ini</p>
          </div>
        </div>
      </div>

      <!-- Row 2: Pipeline + Upcoming Shoots -->
      <div class="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-6">
        <!-- Pipeline Funnel (spans 3) -->
        <div class="lg:col-span-3 bg-[#1a1a1a] border border-gray-800/60 rounded-2xl p-5">
          <h3 class="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
            Pipeline
          </h3>
          <div class="space-y-4">
            <div v-for="step in pipeline" :key="step.key">
              <div class="flex items-center justify-between text-sm mb-1.5">
                <span class="text-gray-400 font-medium">{{ step.label }}</span>
                <div class="flex items-center gap-2.5">
                  <span class="text-white font-semibold">{{ step.value }}</span>
                  <span class="text-xs text-gray-600 w-8 text-right">{{ step.pct }}%</span>
                </div>
              </div>
              <div class="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all duration-700" :style="{ width: step.pct+'%', background: step.color }"></div>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-4 mt-5 pt-4 border-t border-gray-800/60 text-xs text-gray-500">
            <span>Conversion: <strong class="text-white">{{ s.conversion_rate }}%</strong></span>
            <span>Shooting: <strong class="text-white">{{ s.shooting_rate }}%</strong></span>
            <span>Delivered: <strong class="text-white">{{ s.delivery_rate }}%</strong></span>
            <span>Completed: <strong class="text-white">{{ s.completion_rate }}%</strong></span>
          </div>
        </div>

        <!-- Upcoming Shoots (spans 2) -->
        <div class="lg:col-span-2 bg-[#1a1a1a] border border-gray-800/60 rounded-2xl p-5">
          <h3 class="text-sm font-semibold text-white mb-4 flex items-center justify-between">
            <span class="flex items-center gap-2">
              <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              Jadwal Shooting
            </span>
            <span class="text-xs text-gray-600">{{ s.this_week_shoots }} minggu ini · {{ s.next_week_shoots }} pekan depan</span>
          </h3>
          <div v-if="s.upcoming_shoots && s.upcoming_shoots.length" class="space-y-2">
            <div v-for="shoot in s.upcoming_shoots" :key="shoot.id"
              class="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-800/40 transition cursor-pointer"
              @click="$router.push('/admin/bookings')">
              <div class="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-400 flex-shrink-0">
                {{ formatDay(shoot.shooting_time) }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-white truncate">{{ shoot.client_name }}</p>
                <p class="text-xs text-gray-500 truncate">
                  {{ shoot.location || '—' }}
                  <span v-if="shoot.fg_name" class="ml-1.5 px-1.5 py-0.5 bg-amber-500/10 rounded text-[10px] text-amber-400">{{ shoot.fg_name }}</span>
                </p>
              </div>
              <span class="text-[10px] font-medium uppercase tracking-wider px-2 py-1 rounded-md"
                :class="shoot.status === 'shooting' ? 'bg-purple-500/15 text-purple-400' : 'bg-emerald-500/15 text-emerald-400'">
                {{ shoot.status === 'shooting' ? 'Shooting' : 'Confirmed' }}
              </span>
            </div>
          </div>
          <div v-else class="flex flex-col items-center justify-center py-8 text-gray-600">
            <svg class="w-10 h-10 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            <p class="text-xs">Belum ada jadwal shooting</p>
          </div>
        </div>
      </div>

      <!-- Row 3: Activity + Top FG + Packages -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <!-- Recent Activity -->
        <div class="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl p-5">
          <h3 class="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            Aktivitas
          </h3>
          <div v-if="s.recent_activity && s.recent_activity.length" class="space-y-1">
            <div v-for="(act, i) in s.recent_activity" :key="i"
              class="flex items-center gap-3 py-2.5 border-b border-gray-800/40 last:border-0">
              <div class="w-2 h-2 rounded-full flex-shrink-0 mt-0.5"
                :class="act.type.includes('booking') ? 'bg-amber-500' : act.type === 'payment' ? 'bg-emerald-500' : 'bg-blue-500'">
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm text-white truncate">{{ act.client_name }}</p>
                <p class="text-xs text-gray-500">{{ actionLabel(act) }}</p>
              </div>
              <span class="text-[10px] text-gray-600 whitespace-nowrap">{{ timeAgo(act.created_at) }}</span>
            </div>
          </div>
          <div v-else class="flex flex-col items-center justify-center py-8 text-gray-600">
            <p class="text-xs">Belum ada aktivitas</p>
          </div>
        </div>

        <!-- Top FG -->
        <div class="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl p-5">
          <h3 class="text-sm font-semibold text-white mb-4 flex items-center justify-between">
            <span class="flex items-center gap-2">
              <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
              Top FG Bulan Ini
            </span>
            <span class="text-xs text-gray-600">{{ s.fg_active }} aktif</span>
          </h3>
          <div v-if="s.top_fg && s.top_fg.length" class="space-y-2">
            <div v-for="(fg, i) in s.top_fg" :key="fg.id"
              class="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-800/30 transition">
              <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                :class="i === 0 ? 'bg-amber-500/20 text-amber-400' : i === 1 ? 'bg-gray-500/20 text-gray-300' : 'bg-gray-700/30 text-gray-400'">
                {{ i + 1 }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-white">{{ fg.name }}</p>
                <p class="text-xs text-gray-500">{{ fg.completed }}/{{ fg.total_shoots }} selesai</p>
              </div>
              <span class="text-sm font-semibold text-white">{{ fg.total_shoots }}</span>
            </div>
          </div>
          <div v-else class="flex flex-col items-center justify-center py-8 text-gray-600">
            <svg class="w-10 h-10 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
            <p class="text-xs">Belum ada data FG</p>
          </div>
          <router-link to="/admin/freelancers" class="block mt-3 text-center text-xs text-gray-600 hover:text-gray-400 transition">Lihat semua FG →</router-link>
        </div>

        <!-- Package Popularity -->
        <div class="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl p-5">
          <h3 class="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Paket Populer
          </h3>
          <div v-if="s.package_popularity && s.package_popularity.length" class="space-y-3">
            <div v-for="pkg in s.package_popularity" :key="pkg.name" class="flex items-center justify-between">
              <span class="text-sm text-gray-300">{{ pkg.name }}</span>
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-white">{{ pkg.total }}</span>
                <div class="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div class="h-full bg-amber-500/60 rounded-full" :style="{ width: maxPkg > 0 ? (pkg.total/maxPkg*100)+'%' : '0%' }"></div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="flex flex-col items-center justify-center py-8 text-gray-600">
            <svg class="w-10 h-10 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <p class="text-xs">Belum ada booking</p>
          </div>

          <!-- Mini stats summary -->
          <div class="mt-5 pt-4 border-t border-gray-800/60 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span class="text-gray-500">Inquiry bulan ini</span>
              <p class="text-white font-semibold text-sm mt-0.5">{{ s.inquiries_this_month || 0 }}</p>
            </div>
            <div>
              <span class="text-gray-500">Booking bulan ini</span>
              <p class="text-white font-semibold text-sm mt-0.5">{{ s.bookings_this_month || 0 }}</p>
            </div>
            <div>
              <span class="text-gray-500">DP pending</span>
              <p class="text-white font-semibold text-sm mt-0.5">{{ s.dp_pending || 0 }}</p>
            </div>
            <div>
              <span class="text-gray-500">Payout pending</span>
              <p class="text-white font-semibold text-sm mt-0.5">{{ s.payout_pending || 0 }}</p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const API = '/api/admin'
const loading = ref(true)
const s = ref({})

const greeting = computed(() => {
  const h = new Date().getHours()
  return h < 12 ? 'Selamat pagi' : h < 18 ? 'Selamat siang' : 'Selamat malam'
})
const timeStr = computed(() => new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))

const trendColor = computed(() => s.value.revenue_trend > 0 ? 'text-emerald-400' : s.value.revenue_trend < 0 ? 'text-red-400' : 'text-gray-400')

const pipeline = computed(() => {
  const total = s.value.inquiries_total || 1
  return [
    { key: 'inquiry', label: 'Inquiry', value: s.value.inquiries_total || 0, pct: 100, color: 'linear-gradient(90deg, #f59e0b, #f97316)' },
    { key: 'booked', label: 'Booking', value: s.value.bookings_total || 0, pct: s.value.bookings_total / total * 100, color: 'linear-gradient(90deg, #f59e0b, #eab308)' },
    { key: 'shooting', label: 'Shooting', value: s.value.bookings_shooting || 0, pct: s.value.bookings_total > 0 ? s.value.bookings_shooting / total * 100 : 0, color: 'linear-gradient(90deg, #a855f7, #8b5cf6)' },
    { key: 'delivered', label: 'Delivered', value: s.value.bookings_delivered || 0, pct: s.value.bookings_total > 0 ? s.value.bookings_delivered / total * 100 : 0, color: 'linear-gradient(90deg, #3b82f6, #6366f1)' },
    { key: 'completed', label: 'Completed', value: s.value.bookings_completed || 0, pct: s.value.bookings_total > 0 ? s.value.bookings_completed / total * 100 : 0, color: 'linear-gradient(90deg, #10b981, #059669)' },
  ]
})
const maxPkg = computed(() => Math.max(...(s.value.package_popularity || []).map(p => p.total), 0))

function formatDay(dateStr) {
  if (!dateStr) return '--'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}
function actionLabel(act) {
  if (act.type === 'booking_new') {
    const labels = { confirmed: 'Booking baru confirmed', shooting: 'Mulai shooting', delivered: 'Hasil dikirim', completed: 'Selesai' }
    return labels[act.status] || `Status: ${act.status}`
  }
  if (act.type === 'payment') {
    if (act.status === 'dp_paid') return 'DP dibayar ✓'
    if (act.status === 'balance_paid') return 'Pelunasan dibayar ✓'
    if (act.status === 'uploaded') return 'Bukti transfer diupload'
    return 'Pembayaran'
  }
  if (act.type === 'deliver') return 'Hasil fotografi dikirim'
  return act.status || ''
}
function timeAgo(dateStr) {
  if (!dateStr) return ''
  const ms = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}j`
  const days = Math.floor(hours / 24)
  return `${days}h`
}

async function load() {
  try {
    const res = await fetch(`${API}/dashboard/stats`, { credentials: 'include' })
    s.value = await res.json()
  } catch (e) {
    console.error('Dashboard load error:', e)
  }
  loading.value = false
}

onMounted(load)
</script>
