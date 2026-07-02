<template>
  <div>
    <h2 class="font-serif text-2xl font-bold text-white mb-6">Dashboard</h2>
    <div v-if="loading" class="flex justify-center py-12">
      <div class="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
    </div>
    <div v-else>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div v-for="card in statCards" :key="card.key" class="bg-gray-800/40 border border-gray-700/50 rounded-xl p-4">
          <p class="text-gray-400 text-xs uppercase tracking-wider">{{ card.label }}</p>
          <p class="text-2xl font-bold text-white mt-1" :class="{ 'text-amber-400': card.highlight }">{{ card.value }}</p>
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div class="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6">
          <h3 class="font-semibold text-white mb-4">Inquiry Stats</h3>
          <div v-if="inquiryStats.length" class="space-y-3">
            <div v-for="(item, i) in inquiryStats" :key="i" class="flex items-center justify-between">
              <span class="text-gray-400 text-sm">{{ item.label }}</span>
              <span class="text-white font-medium">{{ item.value }}</span>
            </div>
          </div>
          <p v-else class="text-gray-500 text-sm">Belum ada data</p>
        </div>
        <div class="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6">
          <h3 class="font-semibold text-white mb-4">Booking Pipeline</h3>
          <div v-if="bookingStats.length" class="space-y-3">
            <div v-for="(item, i) in bookingStats" :key="i" class="flex items-center justify-between">
              <span class="text-gray-400 text-sm">{{ item.label }}</span>
              <span class="text-white font-medium">{{ item.value }}</span>
            </div>
          </div>
          <p v-else class="text-gray-500 text-sm">Belum ada data</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const API = '/api/admin'
const loading = ref(true)
const stats = ref({})

const statCards = ref([
  { key: 'inquiries_new', label: 'Inquiry Baru', value: 0, highlight: true },
  { key: 'bookings_confirmed', label: 'Booking Aktif', value: 0 },
  { key: 'dp_pending', label: 'DP Pending', value: 0, highlight: true },
  { key: 'payout_pending', label: 'Payout Pending', value: 0 },
])

const inquiryStats = ref([])
const bookingStats = ref([])

async function load() {
  try {
    const res = await fetch(`${API}/dashboard/stats`, { credentials: 'include' })
    stats.value = await res.json()
    
    statCards.value = [
      { key: 'inquiries_new', label: 'Inquiry Baru', value: stats.value.inquiries_new ?? 0, highlight: true },
      { key: 'inquiries_booked', label: 'Booking', value: stats.value.inquiries_booked ?? 0 },
      { key: 'dp_pending', label: 'DP Pending', value: stats.value.dp_pending ?? 0, highlight: true },
      { key: 'payout_pending', label: 'Payout', value: stats.value.payout_pending ?? 0 },
    ]
    
    inquiryStats.value = [
      { label: 'Total Inquiry', value: stats.value.inquiries_total ?? 0 },
      { label: 'Baru', value: stats.value.inquiries_new ?? 0 },
      { label: 'Quoted', value: stats.value.inquiries_quoted ?? 0 },
      { label: 'Booked', value: stats.value.inquiries_booked ?? 0 },
    ]
    
    bookingStats.value = [
      { label: 'Total Booking', value: stats.value.bookings_total ?? 0 },
      { label: 'Confirmed', value: stats.value.bookings_confirmed ?? 0 },
      { label: 'Shooting', value: stats.value.bookings_shooting ?? 0 },
      { label: 'Delivered', value: stats.value.bookings_delivered ?? 0 },
      { label: 'Completed', value: stats.value.bookings_completed ?? 0 },
    ]
  } catch (e) {
    console.error('Stats load error:', e)
  }
  loading.value = false
}

onMounted(load)
</script>