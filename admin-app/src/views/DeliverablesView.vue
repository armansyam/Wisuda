<template>
  <div>
    <h2 class="font-serif text-2xl font-bold text-white mb-6">Deliverables & QC</h2>
    <div v-if="loading" class="flex justify-center py-12"><div class="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div></div>
    <div v-else>
      <div class="bg-gray-800/30 border border-gray-700/50 rounded-xl overflow-hidden">
        <table class="w-full text-sm">
          <thead><tr class="text-gray-400 border-b border-gray-700/50 text-left"><th class="p-3">Booking</th><th class="p-3">Client</th><th class="p-3 hidden md:table-cell">Status</th><th class="p-3">QC</th><th class="p-3">Aksi</th></tr></thead>
          <tbody>
            <template v-for="item in data" :key="item.id">
              <tr class="border-b border-gray-800/50 hover:bg-gray-800/20 text-gray-300">
                <td class="p-3">#{{ item.booking_id }}</td>
                <td class="p-3 font-medium text-white">{{ item.client_name || '-' }}</td>
                <td class="p-3 hidden md:table-cell">
                  <span class="px-2 py-0.5 rounded-full text-xs" :class="statusClass(item.status)">{{ item.status }}</span>
                </td>
                <td class="p-3">
                  <span class="px-2 py-0.5 rounded-full text-xs" :class="qcClass(item.qc_status)">{{ item.qc_status }}</span>
                </td>
                <td class="p-3">
                  <button v-if="item.qc_status === 'pending'" @click="passQC(item)" class="px-2 py-1 bg-green-600/20 text-green-400 rounded text-xs hover:bg-green-600/30">Lulus</button>
                  <button v-else-if="item.qc_status === 'passed' && item.status === 'qc_passed'" @click="deliver(item)" class="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs hover:bg-blue-600/30">Kirim</button>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      <div v-if="data.length === 0" class="text-center py-12 text-gray-500">Belum ada deliverable</div>
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue'
const API = '/api/admin'
const data = ref([])
const loading = ref(true)
function statusClass(s) { return { draft: 'bg-gray-700/40 text-gray-400', qc_passed: 'bg-green-900/40 text-green-400', delivered: 'bg-blue-900/40 text-blue-400', approved: 'bg-purple-900/40 text-purple-400' }[s] || '' }
function qcClass(s) { return { pending: 'bg-yellow-900/40 text-yellow-400', passed: 'bg-green-900/40 text-green-400', failed: 'bg-red-900/40 text-red-400' }[s] || '' }
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
load()
</script>