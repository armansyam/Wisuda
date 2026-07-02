<template>
  <div>
    <h2 class="font-serif text-2xl font-bold text-white mb-6">Keuangan</h2>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
      <div class="bg-gray-800/40 border border-gray-700/50 rounded-xl p-5">
        <p class="text-gray-400 text-xs uppercase tracking-wider">Total Revenue</p>
        <p class="text-2xl font-bold text-amber-400 mt-1">{{ totalRevenue }}</p>
      </div>
      <div class="bg-gray-800/40 border border-gray-700/50 rounded-xl p-5">
        <p class="text-gray-400 text-xs uppercase tracking-wider">DP Pending</p>
        <p class="text-2xl font-bold text-white mt-1">{{ dpPending }}</p>
      </div>
      <div class="bg-gray-800/40 border border-gray-700/50 rounded-xl p-5">
        <p class="text-gray-400 text-xs uppercase tracking-wider">Payout Pending</p>
        <p class="text-2xl font-bold text-white mt-1">{{ payoutPending }}</p>
      </div>
    </div>
    <h3 class="font-semibold text-white mb-4">DP Terverifikasi</h3>
    <div class="bg-gray-800/30 border border-gray-700/50 rounded-xl overflow-hidden">
      <table class="w-full text-sm">
        <thead><tr class="text-gray-400 border-b border-gray-700/50 text-left"><th class="p-3">Client</th><th class="p-3">Invoice</th><th class="p-3">Amount</th><th class="p-3">Status</th></tr></thead>
        <tbody>
          <tr v-for="d in dps" :key="d.id" class="border-b border-gray-800/50 text-gray-300">
            <td class="p-3 font-medium text-white">{{ d.client_name }}</td>
            <td class="p-3">{{ d.invoice_number || '-' }}</td>
            <td class="p-3">Rp {{ (d.amount||0).toLocaleString('id-ID') }}</td>
            <td class="p-3">{{ d.dp_status }}</td>
          </tr>
          <tr v-if="dps.length === 0"><td class="p-3 text-gray-500 text-center" colspan="4">Belum ada data DP</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
const API = '/api/admin'
const totalRevenue = ref('Rp 0')
const dpPending = ref(0)
const payoutPending = ref(0)
const dps = ref([])
onMounted(async () => {
  try { const r = await fetch(`${API}/finances`, { credentials: 'include' }); const d = await r.json(); totalRevenue.value = d.totalRevenue; dpPending.value = d.dpPending; payoutPending.value = d.payoutPending; dps.value = d.dps || [] } catch {}
})
</script>