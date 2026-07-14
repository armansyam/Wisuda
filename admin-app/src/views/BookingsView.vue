<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-5">
      <div class="flex items-center gap-2.5">
        <h2 class="text-xl font-bold text-[#2D1B14] dark:text-slate-200 tracking-tight">Client</h2>
        <span class="text-[10px] text-[#C4B0A5] bg-white dark:bg-slate-900 rounded-full px-2.5 py-0.5 border border-[#E8D5C8] dark:border-slate-800" v-if="!loading">{{ data.length }} item</span>
      </div>
      <div class="flex items-center gap-2">
        <input v-model="searchQ" @input.debounce.300ms="load()" class="input-fancy !w-32 !py-1.5 !text-[11px] dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200" placeholder="🔍 Cari nama...">
        <select v-model="filterStatus" @change="load()" class="input-fancy !w-28 !py-1.5 !text-[11px] appearance-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200" style="background-image: url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%23C4B0A5' stroke-width='2'%3E%3Cpath d='M3 4.5l3 3 3-3'/%3E%3C/svg%3E&quot;); background-repeat: no-repeat; background-position: right 8px center; padding-right: 28px;">
          <option value="">Semua</option>
          <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-16">
      <div class="loading-spinner animate-spin"></div>
    </div>

    <!-- Cards -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      <div v-for="item in data" :key="item.id"
        class="card p-4 transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer dark:bg-slate-900 dark:border-slate-800"
        @click="showDetail(item)">
        <div class="flex items-start justify-between mb-2.5">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-[#FAF0DD] dark:bg-amber-950/20 flex items-center justify-center text-sm font-bold text-[#B5942B] dark:text-amber-400">{{ (item.client_name||'?')[0] }}</div>
            <div>
              <p class="text-sm font-semibold text-[#2D1B14] dark:text-slate-200 leading-tight">{{ item.client_name }}</p>
              <p class="text-[10px] text-[#C4B0A5]">{{ item.university || '-' }}</p>
            </div>
          </div>
          <span class="status-chip ml-2" :class="statusClass(item.status)">{{ item.statusLabel || item.status }}</span>
        </div>
        <div class="space-y-1 text-[11px] text-[#8A7A72] dark:text-slate-400">
          <div class="flex justify-between">
            <span>Paket</span>
            <span class="font-medium text-[#2D1B14] dark:text-slate-200">{{ item.package_name || '-' }}</span>
          </div>
          <div class="flex justify-between">
            <span>Tanggal</span>
            <span>{{ item.graduation_date || '-' }}</span>
          </div>
          <div class="flex justify-between" v-if="!(item.dp_status === 'uploaded' && item.balance_status === 'uploaded')">
            <span>DP</span>
            <span :class="dpClass(item.dp_status)">{{ item.dp_status }}</span>
          </div>
          <div class="flex justify-between" v-if="item.balance_status !== 'unpaid' && !(item.dp_status === 'uploaded' && item.balance_status === 'uploaded')">
            <span>Pelunasan</span>
            <span :class="dpClass(item.balance_status)">{{ item.balance_status }}</span>
          </div>
          <div class="flex justify-between text-[#0f766e] dark:text-green-400 font-semibold" v-if="item.dp_status === 'uploaded' && item.balance_status === 'uploaded'">
            <span>Pembayaran</span>
            <span>Lunas 100% (Awal)</span>
          </div>
          <div class="flex justify-between" v-if="item.fg_name">
            <span>FG</span>
            <span class="text-[9px] px-1.5 py-0.5 bg-[#FAF0DD] dark:bg-amber-950/20 rounded text-[#B5942B] dark:text-amber-400 font-semibold">{{ item.fg_name || '-' }}</span>
          </div>
        </div>
        <div class="flex gap-1.5 mt-3 pt-2.5 border-t border-[#E8D5C8]/60 dark:border-slate-800" @click.stop>
          <button @click="showDetail(item)" class="flex-1 px-2 py-1.5 rounded-lg text-[9px] font-medium transition text-[#8A7A72] dark:text-slate-400 hover:bg-[#FFF0E8] dark:hover:bg-slate-800">Detail</button>
          
          <!-- Verification Buttons -->
          <button v-if="item.dp_status === 'uploaded' || (item.status === 'pending' && item.dp_status === 'unpaid')" 
            @click="openVerifyModal(item, 'dp')" 
            class="flex-1 px-2 py-1.5 rounded-lg text-[9px] font-medium transition text-white bg-[#0f766e] hover:bg-[#0d6860]">
            ✓ DP
          </button>
          
          <button v-if="item.status === 'confirmed' && !item.fg_name" @click="openAssign(item)" class="flex-1 px-2 py-1.5 rounded-lg text-[9px] font-medium transition text-[#8A7A72] bg-[#FAF0DD] dark:bg-amber-950/20 text-[#B5942B] dark:text-amber-400 hover:bg-[#FFE5DA]">👤 Assign</button>
          <button v-if="item.status === 'confirmed' && item.fg_name" @click="setStatus(item, 'shooting')" class="flex-1 px-2 py-1.5 rounded-lg text-[9px] font-medium transition text-white bg-blue-600 hover:bg-blue-700">📸 Shoot</button>
          
          <button v-if="item.balance_status === 'uploaded' || (item.status === 'shooting' && item.balance_status === 'unpaid')" 
            @click="openVerifyModal(item, 'balance')" 
            class="flex-1 px-2 py-1.5 rounded-lg text-[9px] font-medium transition text-white bg-[#0f766e] hover:bg-[#0d6860]">
            ✓ Bayar
          </button>
          
          <button v-if="item.status === 'shooting' && item.balance_status === 'paid'" @click="openDeliver(item)" class="flex-1 px-2 py-1.5 rounded-lg text-[9px] font-medium transition text-white bg-green-600 hover:bg-green-700">📦 Kirim</button>
          <button v-if="item.status === 'delivered'" @click="complete(item)" class="flex-1 px-2 py-1.5 rounded-lg text-[9px] font-medium transition text-white bg-green-600 hover:bg-green-700">✅ Selesai</button>
        </div>
      </div>
    </div>
    <div v-if="data.length === 0 && !loading" class="text-center py-16 text-[#C4B0A5]">
      <span class="text-3xl block mb-2">📋</span>
      <p class="text-xs">Belum ada data client</p>
    </div>

    <!-- Detail Modal -->
    <div v-if="detailItem" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.6); backdrop-filter: blur(6px);" @click.self="detailItem=null">
      <div class="card w-full max-w-sm p-5 animate-pop relative max-h-[90vh] overflow-y-auto dark:bg-slate-900 dark:border-slate-800">
        <button @click="detailItem=null" class="absolute top-4 right-4 text-[#B8C6B8] hover:text-[#2D3A2E] dark:hover:text-slate-200">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
        <div class="flex items-center gap-3 mb-5">
          <div class="w-10 h-10 rounded-xl bg-[#FAF0DD] dark:bg-amber-950/20 flex items-center justify-center text-lg font-bold text-[#B5942B] dark:text-amber-400">{{ (detailItem.client_name||'?')[0] }}</div>
          <div>
            <h3 class="font-bold text-[#2D1B14] dark:text-slate-200">{{ detailItem.client_name }}</h3>
            <p class="text-xs text-[#C4B0A5]">{{ detailItem.university || '-' }}</p>
          </div>
          <span class="ml-auto status-chip" :class="statusClass(detailItem.status)">{{ detailItem.statusLabel || detailItem.status }}</span>
        </div>
        <dl class="space-y-2 text-sm text-[#475569] dark:text-slate-300">
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">WA</dt><dd class="font-medium text-[#2D1B14] dark:text-slate-200">{{ detailItem.client_phone }}</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">Paket</dt><dd class="text-[#2D1B14] dark:text-slate-200">{{ detailItem.package_name || '-' }}</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">Tgl Wisuda</dt><dd>{{ detailItem.graduation_date }}</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">Jam</dt><dd>{{ detailItem.shooting_time || '-' }}</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">Lokasi</dt><dd>{{ detailItem.location || '-' }}</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">Total</dt><dd class="font-semibold text-[#2D1B14] dark:text-slate-200">Rp {{ (detailItem.total_price||0).toLocaleString('id-ID') }}</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">DP</dt><dd class="font-medium">Rp {{ (detailItem.dp_amount||0).toLocaleString('id-ID') }} (<span :class="dpClass(detailItem.dp_status)">{{ detailItem.dp_status }}</span>)</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">Pelunasan</dt><dd class="font-medium"><span :class="dpClass(detailItem.balance_status)">{{ detailItem.balance_status }}</span></dd></div>
          <div class="flex justify-between"><dt class="text-[#C4B0A5]">FG</dt><dd>{{ detailItem.fg_name || '-' }}</dd></div>
        </dl>
        <div class="flex gap-2 mt-5">
          <button @click="detailItem=null" class="flex-1 px-4 py-2.5 bg-[#FFF0E8] dark:bg-slate-800 text-[#8A7A72] dark:text-slate-300 rounded-xl text-xs font-medium hover:bg-[#FFE5DA] transition">Tutup</button>
          <a :href="waAdminLink(detailItem)" target="_blank" class="flex-1 px-4 py-2.5 bg-[#0f766e] text-white rounded-xl text-xs font-medium hover:bg-[#0d6860] transition text-center flex items-center justify-center gap-1">💬 WA</a>
        </div>
      </div>
    </div>

    <!-- Verification Modal -->
    <div v-if="proofModalItem" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.6); backdrop-filter: blur(6px);" @click.self="proofModalItem=null">
      <div class="card w-full max-w-md p-5 animate-pop relative max-h-[90vh] overflow-y-auto dark:bg-slate-900 dark:border-slate-800">
        <button @click="proofModalItem=null" class="absolute top-4 right-4 text-[#B8C6B8] hover:text-[#2D3A2E] dark:hover:text-slate-200">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
        <h3 class="font-bold text-[#2D1B14] dark:text-slate-200 mb-2">🔍 Verifikasi Pembayaran ({{ proofModalType === 'dp' ? 'DP 50%' : 'Pelunasan' }})</h3>
        <p class="text-xs text-[#8A7A72] mb-4">— {{ proofModalItem.client_name }}</p>
        
        <div class="mb-5">
          <label class="text-[10px] text-[#C4B0A5] block mb-1">Bukti Transfer</label>
          <div class="border border-[#E8D5C8] dark:border-slate-800 rounded-xl overflow-hidden bg-gray-50 dark:bg-slate-950 flex items-center justify-center min-h-[300px] max-h-[500px]">
            <iframe v-if="isPdf(proofUrl)" :src="proofUrl" class="w-full h-80" frameborder="0"></iframe>
            <img v-else :src="proofUrl" class="max-w-full max-h-[480px] object-contain" alt="Bukti Transfer" />
          </div>
        </div>

        <div class="flex gap-2">
          <button @click="proofModalItem=null" class="flex-1 px-4 py-2.5 bg-[#FFF0E8] dark:bg-slate-800 text-[#8A7A72] dark:text-slate-300 rounded-xl text-xs font-medium hover:bg-[#FFE5DA] transition">Batal</button>
          <button @click="submitVerification" class="flex-1 px-4 py-2.5 bg-[#0f766e] text-white rounded-xl text-xs font-semibold hover:bg-[#0d6860] transition">
            Verifikasi Sah ✓
          </button>
        </div>
      </div>
    </div>

    <!-- Assign FG Modal -->
    <div v-if="showAssign" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.6); backdrop-filter: blur(6px);" @click.self="showAssign=null">
      <div class="card w-full max-w-sm p-5 animate-pop dark:bg-slate-900 dark:border-slate-800">
        <h3 class="font-bold text-[#2D1B14] dark:text-slate-200">👤 Assign FG</h3>
        <p class="text-xs text-[#8A7A72] mb-4">— {{ assignItem.client_name }}</p>
        <form @submit.prevent="submitAssign" class="space-y-3">
          <div>
            <label class="text-[10px] text-[#C4B0A5] block mb-1.5">Pilih Fotografer</label>
            <select v-model="assignForm.fg_id" required class="input-fancy !text-xs dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
              <option value="">-- Pilih FG --</option>
              <option v-for="fg in fgList" :key="fg.id" :value="fg.id">{{ fg.name }} — {{ fg.phone }}</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-[10px] text-[#C4B0A5] block mb-1.5">Jam</label>
              <input v-model="assignForm.shooting_time" type="text" class="input-fancy dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="08:00">
            </div>
            <div>
              <label class="text-[10px] text-[#C4B0A5] block mb-1.5">Durasi (jam)</label>
              <input v-model="assignForm.duration_hours" type="number" min="1" max="8" class="input-fancy dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
            </div>
          </div>
          <input v-model="assignForm.location" class="input-fancy dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="Lokasi">
          <textarea v-model="assignForm.brief" rows="2" class="input-fancy resize-none dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="Brief untuk FG..."></textarea>
          <div v-if="assignResult" class="bg-[#FAF0DD] dark:bg-amber-950/20 rounded-xl p-3">
            <p class="text-[#B5942B] dark:text-amber-400 font-medium text-xs">✅ FG terassign!</p>
            <a :href="assignResult.wa_link" target="_blank" class="text-[#B5942B] dark:text-amber-400 text-[10px] underline mt-1 inline-block">📤 Kirim WA ke FG</a>
          </div>
          <div class="flex gap-2 pt-1">
            <button type="button" @click="showAssign=null; assignResult=null" class="flex-1 px-4 py-2.5 bg-[#FFF0E8] dark:bg-slate-800 text-[#8A7A72] dark:text-slate-300 rounded-xl text-xs font-medium hover:bg-[#FFE5DA] transition">Batal</button>
            <button v-if="!assignResult" type="submit" :disabled="!assignForm.fg_id" class="flex-1 px-4 py-2.5 bg-[#0f766e] text-white rounded-xl text-xs font-semibold disabled:opacity-40 hover:bg-[#0d6860] transition">Assign</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Deliver Modal -->
    <div v-if="showDeliver" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.6); backdrop-filter: blur(6px);" @click.self="showDeliver=null">
      <div class="card w-full max-w-sm p-5 animate-pop dark:bg-slate-900 dark:border-slate-800">
        <h3 class="font-bold text-[#2D1B14] dark:text-slate-200">📦 Kirim Hasil</h3>
        <p class="text-xs text-[#8A7A72] mb-4">— {{ deliverItem.client_name }}</p>
        <form @submit.prevent="submitDeliver" class="space-y-3">
          <input v-model="deliverForm.download_url" type="url" required class="input-fancy dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="https://drive.google.com/...">
          <input v-model="deliverForm.password" class="input-fancy dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="Password (auto jika kosong)">
          <div v-if="deliverResult" class="bg-[#FAF0DD] dark:bg-amber-950/20 rounded-xl p-3">
            <p class="text-[#B5942B] dark:text-amber-400 font-medium text-xs">✅ Hasil terkirim!</p>
            <a :href="deliverResult.wa_link_client" target="_blank" class="text-[#B5942B] dark:text-amber-400 text-[10px] underline mt-1 inline-block">💬 WA client</a>
          </div>
          <div class="flex gap-2 pt-1">
            <button type="button" @click="showDeliver=null; deliverResult=null" class="flex-1 px-4 py-2.5 bg-[#FFF0E8] dark:bg-slate-800 text-[#8A7A72] dark:text-slate-300 rounded-xl text-xs font-medium hover:bg-[#FFE5DA] transition">Tutup</button>
            <button v-if="!deliverResult" type="submit" :disabled="!deliverForm.download_url" class="flex-1 px-4 py-2.5 bg-[#0f766e] text-white rounded-xl text-xs font-semibold disabled:opacity-40 hover:bg-[#0d6860] transition">Kirim →</button>
          </div>
        </form>
      </div>
    </div>
    <!-- Verification Success Modal -->
    <div v-if="verificationResult" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.6); backdrop-filter: blur(6px);" @click.self="verificationResult=null">
      <div class="card w-full max-w-sm p-5 animate-pop dark:bg-slate-900 dark:border-slate-800 text-center">
        <div class="w-16 h-16 bg-green-50 dark:bg-green-950/20 text-[#0f766e] dark:text-green-400 rounded-3xl flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
        <h3 class="font-bold text-[#2D1B14] dark:text-slate-200 text-base mb-1">Verifikasi Berhasil!</h3>
        <p class="text-xs text-[#8A7A72] dark:text-slate-400 mb-5">Pembayaran client telah diverifikasi sah. Invoice pembayaran telah berhasil diterbitkan.</p>
        
        <div class="space-y-2.5 mb-5">
          <a :href="verificationResult.invoice_url" target="_blank" class="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#FAF0DD] dark:bg-amber-950/20 text-[#B5942B] dark:text-amber-400 border border-[#FAF0DD] rounded-xl text-xs font-semibold hover:bg-[#FFE5DA] transition">
            📄 Lihat / Cetak Invoice
          </a>
          <a :href="verificationResult.wa_link" target="_blank" class="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#0f766e] text-white rounded-xl text-xs font-semibold hover:bg-[#0d6860] transition">
            💬 Kirim Invoice via WhatsApp
          </a>
        </div>
        
        <button @click="verificationResult=null" class="w-full py-2 text-xs text-[#C4B0A5] hover:text-[#8A7A72] transition font-medium">Tutup</button>
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

// Verification Modal State
const proofModalItem = ref(null)
const proofModalType = ref('')
const proofUrl = ref('')
const verificationResult = ref(null)

function isPdf(url) {
  return url && url.toLowerCase().endsWith('.pdf')
}

function openVerifyModal(item, type) {
  const url = type === 'dp' ? item.dp_bukti_url : item.balance_bukti_url
  if (url) {
    proofModalItem.value = item
    proofModalType.value = type
    proofUrl.value = url
  } else {
    if (confirm(`Verifikasi pembayaran ${type === 'dp' ? 'DP 50%' : 'Pelunasan'} secara manual untuk ${item.client_name}?`)) {
      verifyManual(item, type)
    }
  }
}

async function verifyManual(item, type) {
  const endpoint = type === 'dp' ? 'verify-dp' : 'verify-balance'
  const body = type === 'dp' 
    ? { dp_bukti_url: '', dp_amount: item.dp_amount } 
    : { balance_bukti_url: '' }
  try {
    const r = await fetch(`${API}/bookings/${item.id}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body)
    })
    const d = await r.json()
    if (d.booking || d.status === 'ok') {
      verificationResult.value = {
        booking: d.booking,
        invoice_url: d.invoice_url,
        wa_link: d.wa_link || d.wa_link_client
      }
      load()
    } else {
      alert(d.error || 'Verifikasi manual gagal')
    }
  } catch (e) {
    alert('Error: ' + e.message)
  }
}

async function submitVerification() {
  const item = proofModalItem.value
  const type = proofModalType.value
  const endpoint = type === 'dp' ? 'verify-dp' : 'verify-balance'
  const body = type === 'dp' 
    ? { dp_bukti_url: item.dp_bukti_url, dp_amount: item.dp_amount } 
    : { balance_bukti_url: item.balance_bukti_url }
    
  try {
    const r = await fetch(`${API}/bookings/${item.id}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body)
    })
    const d = await r.json()
    if (d.booking || d.status === 'ok') {
      proofModalItem.value = null
      verificationResult.value = {
        booking: d.booking,
        invoice_url: d.invoice_url,
        wa_link: d.wa_link || d.wa_link_client
      }
      load()
    } else {
      alert(d.error || 'Verifikasi gagal')
    }
  } catch (e) {
    alert('Error: ' + e.message)
  }
}

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
    pending: 'bg-[#FFF7ED] text-[#C2410C] dark:bg-amber-950/20 dark:text-amber-500',
    confirmed: 'bg-[#EDF2EB] text-[#2E7D32] dark:bg-green-950/20 dark:text-green-400',
    shooting: 'bg-[#FFF7ED] text-[#C2410C] dark:bg-amber-950/20 dark:text-amber-500',
    delivered: 'bg-[#EDF2EB] text-[#2E7D32] dark:bg-green-950/20 dark:text-green-400',
    completed: 'bg-[#D1E8CF] text-[#4A7A4A] dark:bg-green-900/20 dark:text-green-400',
    cancelled: 'bg-[#FEF2F2] text-[#EF4444] dark:bg-red-950/20 dark:text-red-400'
  }
  return map[s] || 'bg-[#F0F5EE] text-[#B8C6B8]'
}

function dpClass(s) {
  const map = { 
    unpaid: 'text-[#C4B0A5] dark:text-slate-500', 
    paid: 'text-green-600 dark:text-green-400 font-semibold', 
    refunded: 'text-red-500 dark:text-red-400', 
    uploaded: 'text-yellow-600 dark:text-yellow-400 font-semibold animate-pulse' 
  }
  return map[s] || 'text-[#B8C6B8]'
}

function waAdminLink(item) {
  if (!item) return '#'
  const msg = `Halo Kak ${item.client_name}, saya admin dari Sorehari Wisuda. Saya ingin menghubungi Kakak untuk konfirmasi detail sesi foto wisuda kamu untuk tanggal ${item.graduation_date} di ${item.location || '-'}. 😊`
  return `https://wa.me/${item.client_phone}?text=${encodeURIComponent(msg)}`
}
</script>
