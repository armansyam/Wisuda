<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="font-serif text-2xl font-bold text-white">Bookings</h2>
      <select v-model="filterStatus" @change="load()" class="bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm">
        <option value="">Semua</option>
        <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
      </select>
    </div>
    <div v-if="loading" class="flex justify-center py-12"><div class="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div></div>
    <div v-else>
      <div class="bg-gray-800/30 border border-gray-700/50 rounded-xl overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-gray-400 border-b border-gray-700/50 text-left">
              <th class="p-3">Client</th>
              <th class="p-3 hidden md:table-cell">Paket</th>
              <th class="p-3 hidden lg:table-cell">Tgl Wisuda</th>
              <th class="p-3">Status</th>
              <th class="p-3 hidden md:table-cell">DP</th>
              <th class="p-3 hidden lg:table-cell">FG</th>
              <th class="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in data" :key="item.id" class="border-b border-gray-800/50 hover:bg-gray-800/20 text-gray-300">
              <td class="p-3 font-medium text-white">{{ item.client_name }}</td>
              <td class="p-3 hidden md:table-cell">{{ item.package_name || '-' }}</td>
              <td class="p-3 hidden lg:table-cell">{{ item.graduation_date }}</td>
              <td class="p-3">
                <span class="px-2 py-0.5 rounded-full text-xs font-medium" :class="statusClass(item.status)">{{ item.statusLabel || item.status }}</span>
              </td>
              <td class="p-3 hidden md:table-cell">
                <span :class="dpClass(item.dp_status)">{{ item.dp_status }}</span>
              </td>
              <td class="p-3 hidden lg:table-cell">{{ item.fg_name || '-' }}</td>
              <td class="p-3">
                <div class="flex gap-1 flex-wrap">
                  <button @click="showDetail(item)" class="px-2 py-1 bg-amber-600/20 text-amber-400 rounded text-xs hover:bg-amber-600/30">Detail</button>
                  <button v-if="item.status === 'pending' && item.dp_status === 'unpaid'" @click="verifyDp(item)" class="px-2 py-1 bg-green-600/20 text-green-400 rounded text-xs hover:bg-green-600/30">Verify DP</button>
                  <button v-if="item.status === 'confirmed' && !item.fg_name" @click="openAssign(item)" class="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs hover:bg-blue-600/30">Assign FG</button>
                  <button v-if="item.status === 'confirmed' && item.fg_name" @click="setStatus(item, 'shooting')" class="px-2 py-1 bg-indigo-600/20 text-indigo-400 rounded text-xs hover:bg-indigo-600/30">Shooting</button>
                  <button v-if="item.status === 'shooting' && item.balance_status === 'uploaded'" @click="verifyBalance(item)" class="px-2 py-1 bg-orange-600/20 text-orange-400 rounded text-xs hover:bg-orange-600/30">Verifikasi Pelunasan</button>
                  <button v-if="item.status === 'shooting' && item.balance_status === 'paid'" @click="openDeliver(item)" class="px-2 py-1 bg-purple-600/20 text-purple-400 rounded text-xs hover:bg-purple-600/30">Deliver</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="data.length === 0 && !loading" class="text-center py-12 text-gray-500">Belum ada booking</div>
    </div>

    <!-- Detail Modal -->
    <div v-if="detailItem" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" @click.self="detailItem=null">
      <div class="bg-gray-900 border border-gray-700/50 rounded-2xl p-6 w-full max-w-lg mx-4">
        <h3 class="font-serif text-xl font-bold text-white mb-4">Detail Booking</h3>
        <dl class="space-y-2 text-sm">
          <div class="flex"><dt class="text-gray-400 w-32">Client</dt><dd class="text-white">{{ detailItem.client_name }}</dd></div>
          <div class="flex"><dt class="text-gray-400 w-32">WA</dt><dd class="text-white">{{ detailItem.client_phone }}</dd></div>
          <div class="flex"><dt class="text-gray-400 w-32">Paket</dt><dd class="text-white">{{ detailItem.package_name || '-' }}</dd></div>
          <div class="flex"><dt class="text-gray-400 w-32">Tgl Wisuda</dt><dd class="text-white">{{ detailItem.graduation_date }}</dd></div>
          <div class="flex"><dt class="text-gray-400 w-32">Total</dt><dd class="text-white">Rp {{ (detailItem.total_price||0).toLocaleString('id-ID') }}</dd></div>
          <div class="flex"><dt class="text-gray-400 w-32">DP</dt><dd class="text-white">Rp {{ (detailItem.dp_amount||0).toLocaleString('id-ID') }} ({{ detailItem.dp_status }})</dd></div>
          <div class="flex"><dt class="text-gray-400 w-32">FG</dt><dd class="text-white">{{ detailItem.fg_name || '-' }}</dd></div>
          <div class="flex"><dt class="text-gray-400 w-32">Status</dt><dd><span class="px-2 py-0.5 rounded-full text-xs font-medium" :class="statusClass(detailItem.status)">{{ detailItem.statusLabel || detailItem.status }}</span></dd></div>
          <div class="flex"><dt class="text-gray-400 w-32">Link Booking</dt><dd><a :href="'http://192.168.100.254:8081/cek-booking.html?id='+detailItem.id" target="_blank" class="text-amber-400 underline text-xs">cek-booking.html?id={{ detailItem.id }}</a></dd></div>
        </dl>
        <div class="flex gap-2 mt-6">
          <button @click="detailItem=null" class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition text-sm">Tutup</button>
          <a :href="'https://wa.me/'+detailItem.client_phone" target="_blank" class="px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg transition text-sm inline-block">Chat WA</a>
        </div>
      </div>
    </div>

    <!-- Assign FG Modal -->
    <div v-if="showAssign" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" @click.self="showAssign=null">
      <div class="bg-gray-900 border border-gray-700/50 rounded-2xl p-6 w-full max-w-lg mx-4">
        <h3 class="font-serif text-xl font-bold text-white mb-4">Assign FG — {{ assignItem.client_name }}</h3>
        <form @submit.prevent="submitAssign" class="space-y-4">
          <div>
            <label class="block text-sm text-gray-400 mb-1">Pilih Fotografer (FG)</label>
            <select v-model="assignForm.fg_id" required class="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">-- Pilih FG --</option>
              <option v-for="fg in fgList" :key="fg.id" :value="fg.id">{{ fg.name }} — {{ fg.phone }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Brief (optional)</label>
            <textarea v-model="assignForm.brief" rows="3" class="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Instruksi khusus untuk FG..."></textarea>
          </div>
          <div v-if="assignResult" class="bg-green-900/30 border border-green-800/50 rounded-lg p-3 text-sm">
            <p class="text-green-400 font-medium">FG terassign!</p>
            <p class="text-gray-400 mt-1">WA link: <a :href="assignResult.wa_link" target="_blank" class="text-amber-400 underline">Kirim WA</a></p>
            <p class="text-gray-400">Booking: <a :href="assignResult.booking_url" target="_blank" class="text-amber-400 underline">{{ assignResult.booking_url }}</a></p>
          </div>
          <div class="flex gap-2 justify-end pt-2">
            <button type="button" @click="showAssign=null; assignResult=null" class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition text-sm">Batal</button>
            <button v-if="!assignResult" type="submit" :disabled="!assignForm.fg_id" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition text-sm disabled:opacity-50">Assign</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Deliver Modal -->
    <div v-if="showDeliver" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" @click.self="showDeliver=null">
      <div class="bg-gray-900 border border-gray-700/50 rounded-2xl p-6 w-full max-w-lg mx-4">
        <h3 class="font-serif text-xl font-bold text-white mb-4">Kirim Hasil — {{ deliverItem.client_name }}</h3>
        <form @submit.prevent="submitDeliver" class="space-y-4">
          <div>
            <label class="block text-sm text-gray-400 mb-1">Link Download Foto *</label>
            <input v-model="deliverForm.download_url" type="url" required
              class="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm"
              placeholder="https://drive.google.com/...">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Password (optional)</label>
            <input v-model="deliverForm.password" class="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Auto-generated jika kosong">
          </div>
          <div v-if="deliverResult" class="bg-green-900/30 border border-green-800/50 rounded-lg p-3 text-sm">
            <p class="text-green-400 font-medium">✅ Hasil terkirim ke client!</p>
            <p class="text-gray-400 mt-1">WA client: <a :href="deliverResult.wa_link_client" target="_blank" class="text-amber-400 underline">Kirim WA</a></p>
            <p class="text-gray-400">WA admin: <a :href="deliverResult.wa_link_admin" target="_blank" class="text-amber-400 underline">Kirim WA</a></p>
          </div>
          <div class="flex gap-2 justify-end pt-2">
            <button type="button" @click="showDeliver=null; deliverResult=null" class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition text-sm">Tutup</button>
            <button v-if="!deliverResult" type="submit" :disabled="!deliverForm.download_url" class="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition text-sm disabled:opacity-50">Kirim ke Client</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const API = '/api/admin'
const data = ref([])
const loading = ref(true)
const filterStatus = ref('')
const statuses = ['pending', 'confirmed', 'shooting', 'delivered', 'completed', 'cancelled']
const detailItem = ref(null)

const showAssign = ref(null)
const assignItem = ref(null)
const assignForm = ref({ fg_id: '', brief: '' })
const assignResult = ref(null)
const fgList = ref([])
const showDeliver = ref(null)
const deliverItem = ref(null)
const deliverForm = ref({ download_url: '', password: '' })
const deliverResult = ref(null)

const statusLabels = { pending: 'Pending', confirmed: 'Confirmed', shooting: 'Shooting', delivered: 'Delivered', completed: 'Completed', cancelled: 'Cancelled' }

function statusClass(s) {
  const map = { pending: 'bg-yellow-900/40 text-yellow-400', confirmed: 'bg-green-900/40 text-green-400', shooting: 'bg-blue-900/40 text-blue-400', delivered: 'bg-purple-900/40 text-purple-400', completed: 'bg-gray-700/40 text-gray-300', cancelled: 'bg-red-900/40 text-red-400' }
  return map[s] || ''
}
function dpClass(s) {
  const map = { unpaid: 'text-yellow-400', paid: 'text-green-400', refunded: 'text-red-400' }
  return (map[s] || 'text-gray-400') + ' text-xs'
}

async function load() {
  loading.value = true
  try {
    const params = new URLSearchParams({ limit: 50 })
    if (filterStatus.value) params.set('status', filterStatus.value)
    const res = await fetch(`${API}/bookings?` + params, { credentials: 'include' })
    const result = await res.json()
    data.value = (result.data || []).map(b => ({ ...b, statusLabel: statusLabels[b.status] || b.status }))
  } catch {}
  loading.value = false
}
function showDetail(item) { detailItem.value = item }

async function setStatus(item, status) {
  if (!confirm(`Ubah status ke ${status}?`)) return
  try {
    const res = await fetch(`${API}/bookings/${item.id}/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ status }) })
    if (!res.ok) { const e = await res.json(); alert(e.error || 'Gagal'); return }
    await load()
  } catch (e) { alert('Error: ' + e.message) }
}

async function verifyDp(item) {
  if (!confirm(`Verifikasi DP Rp ${(item.dp_amount||0).toLocaleString('id-ID')}?`)) return
  try {
    const res = await fetch(`${API}/bookings/${item.id}/verify-dp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ dp_amount: item.dp_amount }) })
    if (!res.ok) { const e = await res.json(); alert(e.error || 'Gagal'); return }
    alert('DP terverifikasi! Booking confirmed.')
    await load()
  } catch (e) { alert('Error: ' + e.message) }
}

async function verifyBalance(item) {
  if (!confirm(`Verifikasi pelunasan Booking #${item.id} (${item.client_name})?`)) return
  try {
    const res = await fetch(`${API}/bookings/${item.id}/verify-balance`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({}) })
    if (!res.ok) { const e = await res.json(); alert(e.error || 'Gagal'); return }
    alert('✅ Pelunasan terverifikasi! Sekarang bisa kirim link download.')
    await load()
  } catch (e) { alert('Error: ' + e.message) }
}

async function openAssign(item) {
  assignItem.value = item
  assignForm.value = { fg_id: '', brief: '' }
  assignResult.value = null
  showAssign.value = true
  try {
    const r = await fetch(`${API}/freelancers?limit=50&active=1`, { credentials: 'include' })
    const d = await r.json()
    fgList.value = d.data || []
  } catch {}
}

async function submitAssign() {
  try {
    const res = await fetch(`${API}/bookings/${assignItem.value.id}/assign-fg`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(assignForm.value) })
    if (!res.ok) { const e = await res.json(); alert(e.error || 'Gagal'); return }
    assignResult.value = await res.json()
    await load()
  } catch (e) { alert('Error: ' + e.message) }
}

function openDeliver(item) {
  deliverItem.value = item
  deliverForm.value = { download_url: '', password: '' }
  deliverResult.value = null
  showDeliver.value = true
}

async function submitDeliver() {
  try {
    const res = await fetch(`${API}/bookings/${deliverItem.value.id}/deliver`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(deliverForm.value) })
    if (!res.ok) { const e = await res.json(); alert(e.error || 'Gagal'); return }
    deliverResult.value = await res.json()
    await load()
  } catch (e) { alert('Error: ' + e.message) }
}

load()
</script>