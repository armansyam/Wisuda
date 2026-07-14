<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-5">
      <div class="flex items-center gap-2.5">
        <h2 class="text-xl font-bold text-[#2D3A2E] tracking-tight">Bookings</h2>
        <span class="text-[10px] text-[#B8C6B8] bg-white rounded-full px-2.5 py-0.5 border border-[#E5EBE2]" v-if="!loading">{{ data.length }} item</span>
      </div>
      <div class="flex items-center gap-2">
        <input v-model="searchQ" @input.debounce.300ms="load()" class="input-fancy !w-32 !py-1.5 !text-[11px]" placeholder="🔍 Cari nama...">
        <select v-model="filterStatus" @change="load()" class="input-fancy !w-28 !py-1.5 !text-[11px] appearance-none" style="background-image: url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%23B8C6B8' stroke-width='2'%3E%3Cpath d='M3 4.5l3 3 3-3'/%3E%3C/svg%3E&quot;); background-repeat: no-repeat; background-position: right 8px center; padding-right: 28px;">
          <option value="">Semua</option>
          <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-16">
      <div class="loading-spinner"></div>
    </div>

    <!-- Cards -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      <div v-for="item in data" :key="item.id"
        class="card p-4 transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
        @click="showDetail(item)">
        <div class="flex items-start justify-between mb-2.5">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-[#EDF2EB] flex items-center justify-center text-sm font-bold text-[#A3B5A0]">{{ (item.client_name||'?')[0] }}</div>
            <div>
              <p class="text-sm font-semibold text-[#2D3A2E] leading-tight">{{ item.client_name }}</p>
              <p class="text-[10px] text-[#B8C6B8]">{{ item.university || '-' }}</p>
            </div>
          </div>
          <span class="status-chip ml-2" :class="statusClass(item.status)">{{ item.statusLabel || item.status }}</span>
        </div>
        <div class="space-y-1 text-[11px] text-[#8A9A8A]">
          <div class="flex justify-between">
            <span>Paket</span>
            <span class="font-medium text-[#2D3A2E]">{{ item.package_name || '-' }}</span>
          </div>
          <div class="flex justify-between">
            <span>Tanggal</span>
            <span>{{ item.graduation_date || '-' }}</span>
          </div>
          <div class="flex justify-between">
            <span>DP</span>
            <span :class="dpClass(item.dp_status)">{{ item.dp_status }}</span>
          </div>
          <div class="flex justify-between" x-show="item.fg_name">
            <span>FG</span>
            <span class="text-[9px] px-1.5 py-0.5 bg-[#E8EEE5] rounded text-[#8A9A8A]">{{ item.fg_name || '-' }}</span>
          </div>
        </div>
        <div class="flex gap-1.5 mt-3 pt-2.5 border-t border-[#E5EBE2]/60" @click.stop>
          <button @click="showDetail(item)" class="flex-1 px-2 py-1.5 rounded-lg text-[9px] font-medium transition text-[#8A9A8A] hover:bg-[#F0F5EE]">Detail</button>
          <button v-if="item.status === 'pending' && item.dp_status === 'unpaid'" @click="verifyDp(item)" class="flex-1 px-2 py-1.5 rounded-lg text-[9px] font-medium transition text-[#A3B5A0] bg-[#EDF2EB] hover:bg-[#DCE6DA]">✓ DP</button>
          <button v-if="item.status === 'confirmed' && !item.fg_name" @click="openAssign(item)" class="flex-1 px-2 py-1.5 rounded-lg text-[9px] font-medium transition text-[#8A9A8A] bg-[#E8EEE5] hover:bg-[#DAE2D8]">👤 Assign</button>
          <button v-if="item.status === 'confirmed' && item.fg_name" @click="setStatus(item, 'shooting')" class="flex-1 px-2 py-1.5 rounded-lg text-[9px] font-medium transition text-[#A3B5A0] bg-[#EDF2EB] hover:bg-[#DCE6DA]">📸 Shoot</button>
          <button v-if="item.status === 'shooting' && item.balance_status === 'uploaded'" @click="verifyBalance(item)" class="flex-1 px-2 py-1.5 rounded-lg text-[9px] font-medium transition text-[#4A7A4A] bg-[#D1E8CF] hover:bg-[#B8D8B5]">✓ Bayar</button>
          <button v-if="item.status === 'shooting' && item.balance_status === 'paid'" @click="openDeliver(item)" class="flex-1 px-2 py-1.5 rounded-lg text-[9px] font-medium transition text-[#A3B5A0] bg-[#EDF2EB] hover:bg-[#DCE6DA]">📦 Kirim</button>
          <button v-if="item.status === 'delivered'" @click="complete(item)" class="flex-1 px-2 py-1.5 rounded-lg text-[9px] font-medium transition text-[#4A7A4A] bg-[#D1E8CF] hover:bg-[#B8D8B5]">✅ Selesai</button>
        </div>
      </div>
    </div>
    <div v-if="data.length === 0 && !loading" class="text-center py-16 text-[#B8C6B8]">
      <span class="text-3xl block mb-2">📋</span>
      <p class="text-xs">Belum ada booking</p>
    </div>

    <!-- Detail Modal -->
    <div v-if="detailItem" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,58,46,0.6); backdrop-filter: blur(6px);" @click.self="detailItem=null">
      <div class="card w-full max-w-sm p-5 animate-pop relative max-h-[90vh] overflow-y-auto">
        <button @click="detailItem=null" class="absolute top-4 right-4 text-[#B8C6B8] hover:text-[#2D3A2E]">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
        <div class="flex items-center gap-3 mb-5">
          <div class="w-10 h-10 rounded-xl bg-[#EDF2EB] flex items-center justify-center text-lg font-bold text-[#A3B5A0]">{{ (detailItem.client_name||'?')[0] }}</div>
          <div>
            <h3 class="font-bold text-[#2D3A2E]">{{ detailItem.client_name }}</h3>
            <p class="text-xs text-[#B8C6B8]">{{ detailItem.university || '-' }}</p>
          </div>
          <span class="ml-auto status-chip" :class="statusClass(detailItem.status)">{{ detailItem.statusLabel || detailItem.status }}</span>
        </div>
        <dl class="space-y-2 text-sm">
          <div class="flex justify-between border-b border-[#E5EBE2]/60 pb-1.5"><dt class="text-[#B8C6B8]">WA</dt><dd class="font-medium text-[#2D3A2E]">{{ detailItem.client_phone }}</dd></div>
          <div class="flex justify-between border-b border-[#E5EBE2]/60 pb-1.5"><dt class="text-[#B8C6B8]">Paket</dt><dd class="text-[#2D3A2E]">{{ detailItem.package_name || '-' }}</dd></div>
          <div class="flex justify-between border-b border-[#E5EBE2]/60 pb-1.5"><dt class="text-[#B8C6B8]">Tgl Wisuda</dt><dd>{{ detailItem.graduation_date }}</dd></div>
          <div class="flex justify-between border-b border-[#E5EBE2]/60 pb-1.5"><dt class="text-[#B8C6B8]">Jam</dt><dd>{{ detailItem.shooting_time || '-' }}</dd></div>
          <div class="flex justify-between border-b border-[#E5EBE2]/60 pb-1.5"><dt class="text-[#B8C6B8]">Lokasi</dt><dd>{{ detailItem.location || '-' }}</dd></div>
          <div class="flex justify-between border-b border-[#E5EBE2]/60 pb-1.5"><dt class="text-[#B8C6B8]">Total</dt><dd class="font-semibold text-[#2D3A2E]">Rp {{ (detailItem.total_price||0).toLocaleString('id-ID') }}</dd></div>
          <div class="flex justify-between border-b border-[#E5EBE2]/60 pb-1.5"><dt class="text-[#B8C6B8]">DP</dt><dd class="font-medium">Rp {{ (detailItem.dp_amount||0).toLocaleString('id-ID') }} (<span :class="dpClass(detailItem.dp_status)">{{ detailItem.dp_status }}</span>)</dd></div>
          <div class="flex justify-between"><dt class="text-[#B8C6B8]">FG</dt><dd>{{ detailItem.fg_name || '-' }}</dd></div>
        </dl>
        <div class="flex gap-2 mt-5">
          <button @click="detailItem=null" class="flex-1 px-4 py-2.5 bg-[#F0F5EE] text-[#8A9A8A] rounded-xl text-xs font-medium hover:bg-[#E5EBE2] transition">Tutup</button>
          <a :href="'https://wa.me/'+detailItem.client_phone" target="_blank" class="flex-1 px-4 py-2.5 bg-[#A3B5A0] text-white rounded-xl text-xs font-medium hover:bg-[#8DAB8D] transition text-center flex items-center justify-center gap-1">💬 WA</a>
        </div>
      </div>
    </div>

    <!-- Assign FG Modal -->
    <div v-if="showAssign" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,58,46,0.6); backdrop-filter: blur(6px);" @click.self="showAssign=null">
      <div class="card w-full max-w-sm p-5 animate-pop">
        <h3 class="font-bold text-[#2D3A2E]">👤 Assign FG</h3>
        <p class="text-xs text-[#8A9A8A] mb-4">— {{ assignItem.client_name }}</p>
        <form @submit.prevent="submitAssign" class="space-y-3">
          <div>
            <label class="text-[10px] text-[#B8C6B8] block mb-1.5">Pilih Fotografer</label>
            <select v-model="assignForm.fg_id" required class="input-fancy !text-xs">
              <option value="">-- Pilih FG --</option>
              <option v-for="fg in fgList" :key="fg.id" :value="fg.id">{{ fg.name }} — {{ fg.phone }}</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-[10px] text-[#B8C6B8] block mb-1.5">Jam</label>
              <input v-model="assignForm.shooting_time" type="time" class="input-fancy" :value="assignItem.shooting_time || ''">
            </div>
            <div>
              <label class="text-[10px] text-[#B8C6B8] block mb-1.5">Durasi (jam)</label>
              <input v-model="assignForm.duration_hours" type="number" min="1" max="8" class="input-fancy" :value="assignItem.duration_hours || 2">
            </div>
          </div>
          <input v-model="assignForm.location" class="input-fancy" placeholder="Lokasi" :value="assignItem.location || ''">
          <textarea v-model="assignForm.brief" rows="2" class="input-fancy resize-none" placeholder="Brief untuk FG..."></textarea>
          <div v-if="assignResult" class="bg-[#EDF2EB] rounded-xl p-3">
            <p class="text-[#A3B5A0] font-medium text-xs">✅ FG terassign!</p>
            <a :href="assignResult.wa_link" target="_blank" class="text-[#A3B5A0] text-[10px] underline mt-1 inline-block">📤 Kirim WA ke FG</a>
          </div>
          <div class="flex gap-2 pt-1">
            <button type="button" @click="showAssign=null; assignResult=null" class="flex-1 px-4 py-2.5 bg-[#F0F5EE] text-[#8A9A8A] rounded-xl text-xs font-medium hover:bg-[#E5EBE2] transition">Batal</button>
            <button v-if="!assignResult" type="submit" :disabled="!assignForm.fg_id" class="flex-1 px-4 py-2.5 bg-[#A3B5A0] text-white rounded-xl text-xs font-semibold disabled:opacity-40 hover:bg-[#8DAB8D] transition">Assign</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Deliver Modal -->
    <div v-if="showDeliver" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,58,46,0.6); backdrop-filter: blur(6px);" @click.self="showDeliver=null">
      <div class="card w-full max-w-sm p-5 animate-pop">
        <h3 class="font-bold text-[#2D3A2E]">📦 Kirim Hasil</h3>
        <p class="text-xs text-[#8A9A8A] mb-4">— {{ deliverItem.client_name }}</p>
        <form @submit.prevent="submitDeliver" class="space-y-3">
          <input v-model="deliverForm.download_url" type="url" required class="input-fancy" placeholder="https://drive.google.com/...">
          <input v-model="deliverForm.password" class="input-fancy" placeholder="Password (auto jika kosong)">
          <div v-if="deliverResult" class="bg-[#EDF2EB] rounded-xl p-3">
            <p class="text-[#A3B5A0] font-medium text-xs">✅ Hasil terkirim!</p>
            <a :href="deliverResult.wa_link_client" target="_blank" class="text-[#A3B5A0] text-[10px] underline mt-1 inline-block">💬 WA client</a>
          </div>
          <div class="flex gap-2 pt-1">
            <button type="button" @click="showDeliver=null; deliverResult=null" class="flex-1 px-4 py-2.5 bg-[#F0F5EE] text-[#8A9A8A] rounded-xl text-xs font-medium hover:bg-[#E5EBE2] transition">Tutup</button>
            <button v-if="!deliverResult" type="submit" :disabled="!deliverForm.download_url" class="flex-1 px-4 py-2.5 bg-[#A3B5A0] text-white rounded-xl text-xs font-semibold disabled:opacity-40 hover:bg-[#8DAB8D] transition">Kirim →</button>
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
const searchQ = ref('')
const statuses = ['pending', 'confirmed', 'shooting', 'delivered', 'completed', 'cancelled']
const detailItem = ref(null)
const showAssign = ref(null)
const assignItem = ref(null)
const assignForm = ref({ fg_id: '', shooting_time: '', duration_hours: 2, location: '', brief: '' })
const assignResult = ref(null)
const fgList = ref([])
const showDeliver = ref(null)
const deliverItem = ref(null)
const deliverForm = ref({ download_url: '', password: '' })
const deliverResult = ref(null)

async function load() {
  loading.value = true
  try {
    let url = `${API}/bookings?limit=50`
    if (filterStatus.value) url += '&status=' + filterStatus.value
    if (searchQ.value) url += '&search=' + encodeURIComponent(searchQ.value)
    const r = await fetch(url, { credentials: 'include' })
    const d = await r.json()
    data.value = d.data || []
  } catch {}
  loading.value = false
}
load()

function showDetail(item) { detailItem.value = item }

async function verifyDp(item) {
  const url = prompt('URL bukti transfer DP (optional):') || ''
  try {
    const r = await fetch(`${API}/bookings/${item.id}/verify-dp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ dp_bukti_url: url, dp_amount: item.dp_amount }) })
    const d = await r.json()
    if (d.booking) { load() } else { alert(d.error) }
  } catch {}
}

async function openAssign(item) {
  assignItem.value = item
  assignForm.value = { fg_id: '', shooting_time: item.shooting_time || '', duration_hours: item.duration_hours || 2, location: item.location || '', brief: '' }
  assignResult.value = null
  showAssign.value = item
  try {
    const r = await fetch(`${API}/freelancers?limit=50`, { credentials: 'include' })
    const d = await r.json()
    fgList.value = d.data || []
  } catch {}
}

async function submitAssign() {
  try {
    const r = await fetch(`${API}/bookings/${assignItem.value.id}/assign-fg`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({
        fg_id: assignForm.value.fg_id,
        shooting_time: assignForm.value.shooting_time,
        duration_hours: parseInt(assignForm.value.duration_hours) || 2,
        location: assignForm.value.location,
        brief: assignForm.value.brief
      })
    })
    const d = await r.json()
    if (d.assignment) { assignResult.value = d; load() }
    else { alert(d.error) }
  } catch {}
}

async function setStatus(item, s) {
  if (!confirm(`Set status ke "${s}"?`)) return
  try {
    const r = await fetch(`${API}/bookings/${item.id}/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ status: s }) })
    const d = await r.json()
    if (d.status === 'ok') load()
    else alert(d.error)
  } catch {}
}

async function verifyBalance(item) {
  const url = prompt('URL bukti pelunasan (optional):') || ''
  try {
    const r = await fetch(`${API}/bookings/${item.id}/verify-balance`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ balance_bukti_url: url }) })
    const d = await r.json()
    if (d.booking) load()
    else alert(d.error)
  } catch {}
}

function openDeliver(item) {
  deliverItem.value = item
  deliverForm.value = { download_url: '', password: '' }
  deliverResult.value = null
  showDeliver.value = item
}

async function submitDeliver() {
  try {
    const r = await fetch(`${API}/bookings/${deliverItem.value.id}/deliver`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ download_url: deliverForm.value.download_url, password: deliverForm.value.password })
    })
    const d = await r.json()
    if (d.status === 'delivered') { deliverResult.value = d; load() }
    else { alert(d.error || 'Gagal') }
  } catch {}
}

async function complete(item) {
  if (!confirm(`Tandai selesai untuk ${item.client_name}?`)) return
  try {
    const r = await fetch(`${API}/bookings/${item.id}/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ status: 'completed' }) })
    const d = await r.json()
    if (d.status === 'ok') load()
    else alert(d.error)
  } catch {}
}

function statusClass(s) {
  const map = {
    pending: 'bg-[#FFF7ED] text-[#C2410C]',
    confirmed: 'bg-[#EDF2EB] text-[#A3B5A0]',
    shooting: 'bg-[#E8EEE5] text-[#8A9A8A]',
    delivered: 'bg-[#EDF2EB] text-[#A3B5A0]',
    completed: 'bg-[#D1E8CF] text-[#4A7A4A]',
    cancelled: 'bg-[#FEF2F2] text-[#EF4444]'
  }
  return map[s] || 'bg-[#F0F5EE] text-[#B8C6B8]'
}
function dpClass(s) {
  const map = { unpaid: 'text-[#B8C6B8]', paid: 'text-[#4A7A4A]', refunded: 'text-[#EF4444]', uploaded: 'text-[#8A9A8A]' }
  return map[s] || 'text-[#B8C6B8]'
}
</script>
