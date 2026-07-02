<template>
  <div>
    <h2 class="font-serif text-2xl font-bold text-white mb-6">Laporan</h2>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div class="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6">
        <h3 class="font-semibold text-white mb-4">Revenue</h3>
        <p class="text-3xl font-bold text-amber-400">{{ totalRevenue }}</p>
        <p class="text-sm text-gray-500 mt-2">Total pendapatan dari booking DP terbayar</p>
      </div>
      <div class="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6">
        <h3 class="font-semibold text-white mb-4">Conversion Rate</h3>
        <p class="text-3xl font-bold text-white">{{ conversionRate }}%</p>
        <p class="text-sm text-gray-500 mt-2">{{ inquiriesTotal }} inquiries → {{ inquiriesBooked }} booking</p>
      </div>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6">
        <h3 class="font-semibold text-white mb-2">Inquiries</h3>
        <p class="text-4xl font-bold text-blue-400">{{ inquiriesTotal }}</p>
        <p class="text-sm text-gray-500 mt-1">Total leads masuk</p>
      </div>
      <div class="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6">
        <h3 class="font-semibold text-white mb-2">Booked</h3>
        <p class="text-4xl font-bold text-green-400">{{ inquiriesBooked }}</p>
        <p class="text-sm text-gray-500 mt-1">Konversi jadi booking</p>
      </div>
      <div class="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6">
        <h3 class="font-semibold text-white mb-2">Completed</h3>
        <p class="text-4xl font-bold text-purple-400">{{ completed }}</p>
        <p class="text-sm text-gray-500 mt-1">Project selesai</p>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
const API = '/api/admin'
const totalRevenue = ref('Rp 0')
const conversionRate = ref(0)
const inquiriesTotal = ref(0)
const inquiriesBooked = ref(0)
const completed = ref(0)
async function load() {
  try {
    const r = await fetch(`${API}/reports`, { credentials: 'include' })
    const d = await r.json()
    totalRevenue.value = d.revenueLabel || `Rp ${(d.revenue||0).toLocaleString('id-ID')}`
    conversionRate.value = d.conversionRate ?? 0
    inquiriesTotal.value = d.totalInquiries ?? 0
    inquiriesBooked.value = d.booked ?? 0
    completed.value = d.completed ?? 0
  } catch {}
}
onMounted(load)
</script>