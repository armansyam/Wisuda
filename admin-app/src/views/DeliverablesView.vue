<template>
  <div>
    <h2 class="text-xl font-bold text-[#2D1B14] mb-5">Deliverables & QC</h2>
    <div v-if="loading" class="flex justify-center py-12"><div class="loading-spinner"></div></div>
    <div v-else class="card overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-[#8A7A72] border-b border-[#E8D5C8] text-left">
            <th class="p-3 font-medium">Booking</th>
            <th class="p-3 font-medium">Client</th>
            <th class="p-3 font-medium hidden md:table-cell">Status</th>
            <th class="p-3 font-medium">QC</th>
            <th class="p-3 font-medium">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="item in data" :key="item.id">
            <tr class="border-b border-[#E8D5C8]/60 hover:bg-[#FFF8F3] text-[#2D1B14]">
              <td class="p-3 text-[#8A7A72]">#{{ item.booking_id }}</td>
              <td class="p-3 font-medium">{{ item.client_name || '-' }}</td>
              <td class="p-3 hidden md:table-cell">
                <span class="status-chip" :class="statusClass(item.status)">{{ item.status }}</span>
              </td>
              <td class="p-3">
                <span class="status-chip" :class="qcClass(item.qc_status)">{{ item.qc_status }}</span>
              </td>
              <td class="p-3">
                <button v-if="item.qc_status === 'pending'" @click="passQC(item)" class="px-2.5 py-1.5 bg-[#FDECEA] text-[#D94A3D] rounded-lg text-[10px] font-medium hover:bg-[#FCE8E6] transition">Lulus</button>
                <button v-else-if="item.qc_status === 'passed' && item.status === 'qc_passed'" @click="deliver(item)" class="px-2.5 py-1.5 bg-[#EDF2EB] text-[#A3B5A0] rounded-lg text-[10px] font-medium hover:bg-[#DCE6DA] transition">Kirim</button>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
      <div v-if="data.length === 0" class="text-center py-12 text-[#C4B0A5]">Belum ada deliverable</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
const API = '/api/admin'
const data = ref([])
const loading = ref(true)

function statusClass(s) {
  const map = {
    draft: 'bg-[#FFF5F0] text-[#C4B0A5]',
    qc_passed: 'bg-[#EDF2EB] text-[#A3B5A0]',
    delivered: 'bg-[#E8F5E9] text-[#2E7D32]',
    approved: 'bg-[#FDECEA] text-[#D94A3D]'
  }
  return map[s] || 'bg-[#FFF5F0] text-[#C4B0A5]'
}
function qcClass(s) {
  const map = {
    pending: 'bg-[#FFF0E8] text-[#F4A261]',
    passed: 'bg-[#E8F5E9] text-[#2E7D32]',
    failed: 'bg-[#FEF2F2] text-[#EF4444]'
  }
  return map[s] || 'bg-[#FFF5F0] text-[#C4B0A5]'
}
async function load() {
  try { const r = await fetch(`${API}/deliverables`, { credentials: 'include' }); data.value = (await r.json()).data || [] } catch {}
  loading.value = false
}
async function passQC(item) {
  try { await fetch(`${API}/deliverables/${item.id}/qc`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ qc_status: 'passed' }) }); load() } catch {}
}
async function deliver(item) {
  try { await fetch(`${API}/deliverables/${item.id}/deliver`, { method: 'POST', credentials: 'include' }); load() } catch {}
}
onMounted(load)
</script>