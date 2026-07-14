<template>
  <div>
    <h2 class="text-xl font-bold text-[#2D1B14] mb-5">Keuangan</h2>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      <div class="card p-5">
        <p class="text-[10px] text-[#C4B0A5] uppercase tracking-wider">Total Revenue</p>
        <p class="text-2xl font-bold text-[#2D1B14] mt-1">{{ totalRevenue }}</p>
      </div>
      <div class="card p-5">
        <p class="text-[10px] text-[#C4B0A5] uppercase tracking-wider">DP Pending</p>
        <p class="text-2xl font-bold text-[#D94A3D] mt-1">{{ dpPending }}</p>
      </div>
      <div class="card p-5">
        <p class="text-[10px] text-[#C4B0A5] uppercase tracking-wider">Payout Pending</p>
        <p class="text-2xl font-bold text-[#F4A261] mt-1">{{ payoutPending }}</p>
      </div>
    </div>
    <h3 class="font-semibold text-[#2D1B14] mb-3">DP Terverifikasi</h3>
    <div class="card overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-[#8A7A72] border-b border-[#E8D5C8] text-left">
            <th class="p-3 font-medium">Client</th>
            <th class="p-3 font-medium">Invoice</th>
            <th class="p-3 font-medium">Amount</th>
            <th class="p-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in dps" :key="d.id" class="border-b border-[#E8D5C8]/60 hover:bg-[#FFF8F3] text-[#2D1B14]">
            <td class="p-3 font-medium">{{ d.client_name }}</td>
            <td class="p-3 text-[#8A7A72]">{{ d.invoice_number || '-' }}</td>
            <td class="p-3">Rp {{ (d.amount||0).toLocaleString('id-ID') }}</td>
            <td class="p-3">
              <span class="status-chip" :class="d.dp_status === 'paid' ? 'bg-[#E8F5E9] text-[#2E7D32]' : d.dp_status === 'uploaded' ? 'bg-[#FFF0E8] text-[#F4A261]' : 'bg-[#FFF5F0] text-[#C4B0A5]'">
                {{ d.dp_status }}
              </span>
            </td>
          </tr>
          <tr v-if="dps.length === 0"><td class="p-3 text-[#C4B0A5] text-center" colspan="4">Belum ada data DP</td></tr>
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