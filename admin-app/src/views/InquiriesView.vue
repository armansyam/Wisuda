<template>
  <div>
    <div class="flex items-center justify-between mb-5">
      <div class="flex items-center gap-2.5">
        <h2 class="text-xl font-bold text-[#2D1B14] dark:text-slate-200 tracking-tight">Inquiries</h2>
        <span class="text-[10px] text-[#C4B0A5] bg-white dark:bg-slate-900 rounded-full px-2.5 py-0.5 border border-[#E8D5C8] dark:border-slate-800" v-if="!loading">{{ data.length }} item</span>
      </div>
      <div class="flex items-center gap-2">
        <input v-model="search" class="input-fancy !w-32 !py-1.5 !text-[11px] dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200" placeholder="🔍 Cari...">
        <select v-model="filterStatus" @change="load()" class="input-fancy !w-28 !py-1.5 !text-[11px] appearance-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200" style="background-image: url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%23C4B0A5' stroke-width='2'%3E%3Cpath d='M3 4.5l3 3 3-3'/%3E%3C/svg%3E&quot;); background-repeat: no-repeat; background-position: right 8px center; padding-right: 28px;">
          <option value="">Semua</option>
          <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <div class="loading-spinner animate-spin"></div>
    </div>

    <div v-else class="space-y-2">
      <div v-for="(item, i) in data" :key="item.id"
        class="card flex items-center gap-3 px-4 py-3.5 transition-all hover:shadow-md cursor-pointer animate-fade-up dark:bg-slate-900 dark:border-slate-800"
        :style="{ animationDelay: (i*20)+'ms' }"
        @click="showDetail(item)">
        <div class="w-9 h-9 rounded-xl bg-[#FAF0DD] flex items-center justify-center text-sm font-bold text-[#B5942B] dark:bg-amber-950/20 dark:text-amber-400 flex-shrink-0">{{ (item.client_name||'?')[0] }}</div>
        <div class="flex-1 min-w-0 grid grid-cols-12 gap-2 items-center">
          <div class="col-span-3">
            <p class="text-sm font-semibold text-[#2D1B14] dark:text-slate-200 truncate">{{ item.client_name }}</p>
            <p class="text-[10px] text-[#C4B0A5]">{{ item.client_phone }}</p>
          </div>
          <div class="col-span-3 text-[11px] text-[#8A7A72] dark:text-slate-400 truncate hidden md:block">
            {{ item.university || '-' }}
            <span v-if="item.graduation_date" class="text-[#C4B0A5]">· {{ item.graduation_date }}</span>
          </div>
          <div class="col-span-3 text-[11px] text-[#8A7A72] dark:text-slate-400 truncate hidden lg:block">
            {{ item.package_name || '-' }}
          </div>
          <div class="col-span-3 flex items-center justify-end gap-2">
            <span class="status-chip" :class="statusClass(item.status)">{{ item.status }}</span>
          </div>
        </div>
        <div class="flex items-center gap-1.5 flex-shrink-0" @click.stop>
          <button @click="showDetail(item)" class="px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition text-[#8A7A72] dark:text-slate-400 hover:bg-[#FFF0E8] dark:hover:bg-slate-800">Detail</button>
          <button v-if="item.status === 'new'" @click="generateLink(item)" class="px-3 py-1.5 rounded-lg text-[10px] font-semibold transition text-white bg-[#0f766e] hover:bg-[#0d6860]">Buat Link</button>
        </div>
      </div>
    </div>
    <div v-if="data.length === 0 && !loading" class="text-center py-16 text-[#C4B0A5]">
      <p class="text-base mb-1">📨</p>
      <p class="text-sm">Belum ada inquiry</p>
    </div>

    <div v-if="totalPages > 1" class="flex justify-center gap-1.5 mt-5">
      <button v-for="p in totalPages" :key="p" @click="page = p; load()"
        class="w-8 h-8 rounded-xl text-xs font-medium transition"
        :class="page === p ? 'bg-[#D94A3D] text-white' : 'bg-white dark:bg-slate-900 border border-[#E8D5C8] dark:border-slate-800 text-[#8A7A72] dark:text-slate-400 hover:border-[#FAF0DD]/60'">{{ p }}</button>
    </div>

    <!-- Detail Modal -->
    <div v-if="detailItem" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.6); backdrop-filter: blur(6px);" @click.self="detailItem=null">
      <div class="card w-full max-w-sm p-5 animate-pop dark:bg-slate-900 dark:border-slate-800">
        <div class="flex items-center gap-3 mb-5">
          <div class="w-10 h-10 rounded-xl bg-[#FAF0DD] dark:bg-amber-950/20 flex items-center justify-center text-lg font-bold text-[#B5942B] dark:text-amber-400">{{ (detailItem.client_name||'?')[0] }}</div>
          <div>
            <h3 class="font-bold text-[#2D1B14] dark:text-slate-200">{{ detailItem.client_name }}</h3>
            <p class="text-[10px] text-[#C4B0A5]">{{ detailItem.source || 'website' }}</p>
          </div>
          <span class="ml-auto status-chip" :class="statusClass(detailItem.status)">{{ detailItem.status }}</span>
          <button @click="detailItem=null" class="text-[#C4B0A5] hover:text-[#2D1B14] dark:hover:text-slate-200">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <dl class="space-y-2.5 text-sm text-[#475569] dark:text-slate-300">
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">WA</dt><dd class="font-medium text-[#2D1B14] dark:text-slate-200">{{ detailItem.client_phone }}</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">Tgl Wisuda</dt><dd>{{ detailItem.graduation_date }}</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">Univ</dt><dd>{{ detailItem.university || '-' }}</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">Lokasi</dt><dd>{{ detailItem.location || '-' }}</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">Status</dt><dd class="capitalize font-semibold">{{ detailItem.status }}</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">Catatan</dt><dd class="italic">{{ detailItem.notes || '-' }}</dd></div>
        </dl>
        <div class="flex gap-2 mt-5">
          <button @click="detailItem=null" class="flex-1 px-4 py-2.5 bg-[#FFF0E8] dark:bg-slate-800 text-[#8A7A72] dark:text-slate-300 rounded-xl text-xs font-medium hover:bg-[#FFE5DA] transition">Tutup</button>
          <a v-if="detailItem.client_phone" :href="waAdminLink(detailItem)" target="_blank" class="flex-1 px-4 py-2.5 bg-[#0f766e] text-white rounded-xl text-xs font-medium hover:bg-[#0d6860] transition text-center flex items-center justify-center gap-1">💬 WA</a>
        </div>
      </div>
    </div>

    <!-- Generated Link Modal -->
    <div v-if="tokenResult" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.6); backdrop-filter: blur(6px);" @click.self="tokenResult=null">
      <div class="card w-full max-w-sm p-5 animate-pop dark:bg-slate-900 dark:border-slate-800">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-[#2D1B14] dark:text-slate-200">🔗 Link Booking</h3>
          <button @click="tokenResult=null" class="text-[#C4B0A5] hover:text-[#2D1B14] dark:hover:text-slate-200">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <p class="text-xs text-[#8A7A72] dark:text-slate-400 mb-4">Kirimkan link ini ke client via WhatsApp untuk memilih paket & upload bukti pembayaran.</p>
        
        <div class="space-y-3">
          <div>
            <label class="text-[10px] text-[#C4B0A5] block mb-1">Generated URL (Exp. 48 Jam)</label>
            <div class="flex gap-2">
              <input :value="tokenResult.booking_url" readonly class="input-fancy !text-xs !py-2 select-all dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" id="gen-booking-url">
              <button @click="copyLink" class="px-3 py-2 bg-[#FAF6F0] border border-[#E8D5C8] text-[#8A7A72] rounded-xl text-xs font-semibold hover:bg-[#FFE5DA] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 transition">
                Salin
              </button>
            </div>
          </div>
          
          <div class="flex gap-2 pt-2">
            <button @click="tokenResult=null" class="flex-1 px-4 py-2.5 bg-[#FFF0E8] dark:bg-slate-800 text-[#8A7A72] dark:text-slate-300 rounded-xl text-xs font-medium hover:bg-[#FFE5DA] transition">Tutup</button>
            <a :href="tokenResult.wa_link" target="_blank" class="flex-1 px-4 py-2.5 bg-[#0f766e] text-white rounded-xl text-xs font-semibold hover:bg-[#0d6860] transition text-center flex items-center justify-center gap-1">
              💬 Kirim WA
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const API = '/api/admin'
const data = ref([])
const loading = ref(true)
const search = ref('')
const filterStatus = ref('new')
const page = ref(1)
const totalPages = ref(1)
const statuses = ['new', 'converted', 'expired', 'lost', 'archived']
const detailItem = ref(null)
const tokenResult = ref(null)

function statusClass(s) {
  const map = {
    new: 'bg-[#FDECEA] text-[#D94A3D] dark:bg-red-950/20 dark:text-red-400',
    converted: 'bg-[#E8F5E9] text-[#2E7D32] dark:bg-green-950/20 dark:text-green-400',
    expired: 'bg-[#FFF5F0] text-[#C4B0A5] dark:bg-slate-800 dark:text-slate-400',
    lost: 'bg-[#FEF2F2] text-[#EF4444] dark:bg-red-950/20 dark:text-red-400',
    archived: 'bg-[#FFF5F0] text-[#C4B0A5] dark:bg-slate-800 dark:text-slate-400'
  }
  return map[s] || 'bg-[#FFF5F0] text-[#C4B0A5]'
}

async function load() {
  loading.value = true
  try {
    const params = new URLSearchParams({ page: page.value, limit: 20 })
    if (search.value) params.set('search', search.value)
    if (filterStatus.value) params.set('status', filterStatus.value)
    const res = await fetch(`${API}/inquiries?` + params, { credentials: 'include' })
    const result = await res.json()
    data.value = result.data || []
    totalPages.value = result.totalPages || 1
  } catch {}
  loading.value = false
}

function showDetail(item) { detailItem.value = item }

async function generateLink(item) {
  try {
    const res = await fetch(`${API}/inquiries/${item.id}/generate-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ duration_hours: 48 })
    })
    if (res.ok) {
      tokenResult.value = await res.json()
      await load()
    } else {
      alert('Gagal membuat link booking')
    }
  } catch (e) {
    console.error('Error generating token:', e)
  }
}

function copyLink() {
  const el = document.getElementById('gen-booking-url')
  if (el) {
    el.select()
    document.execCommand('copy')
    alert('Link berhasil disalin!')
  }
}

function waAdminLink(item) {
  if (!item) return '#'
  const msg = `Halo Kak ${item.client_name}, terima kasih sudah mengirimkan inquiry wisuda untuk tanggal ${item.graduation_date} di ${item.location || '-'}. Saya admin dari Sorehari Wisuda. Yuk, kita diskusi untuk memilih paket foto terbaik yang paling cocok untuk kamu! 😊`
  return `https://wa.me/${item.client_phone}?text=${encodeURIComponent(msg)}`
}

let debounceTimer
watch(search, () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => { page.value = 1; load() }, 400)
})

load()
</script>
