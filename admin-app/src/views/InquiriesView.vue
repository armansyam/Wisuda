<template>
  <div>
    <div class="flex items-center justify-between mb-5">
      <div class="flex items-center gap-2.5">
        <h2 class="text-xl font-bold text-[#2D1B14] tracking-tight">Inquiries</h2>
        <span class="text-[10px] text-[#C4B0A5] bg-white rounded-full px-2.5 py-0.5 border border-[#E8D5C8]" v-if="!loading">{{ data.length }} item</span>
      </div>
      <div class="flex items-center gap-2">
        <input v-model="search" class="input-fancy !w-32 !py-1.5 !text-[11px]" placeholder="🔍 Cari...">
        <select v-model="filterStatus" @change="load()" class="input-fancy !w-28 !py-1.5 !text-[11px] appearance-none" style="background-image: url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%23C4B0A5' stroke-width='2'%3E%3Cpath d='M3 4.5l3 3 3-3'/%3E%3C/svg%3E&quot;); background-repeat: no-repeat; background-position: right 8px center; padding-right: 28px;">
          <option value="">Semua</option>
          <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <div class="loading-spinner"></div>
    </div>

    <div v-else class="space-y-2">
      <div v-for="(item, i) in data" :key="item.id"
        class="card flex items-center gap-3 px-4 py-3.5 transition-all hover:shadow-md cursor-pointer animate-fade-up"
        :style="{ animationDelay: (i*20)+'ms' }"
        @click="showDetail(item)">
        <div class="w-9 h-9 rounded-xl bg-[#FDECEA] flex items-center justify-center text-sm font-bold text-[#D94A3D] flex-shrink-0">{{ (item.client_name||'?')[0] }}</div>
        <div class="flex-1 min-w-0 grid grid-cols-12 gap-2 items-center">
          <div class="col-span-3">
            <p class="text-sm font-semibold text-[#2D1B14] truncate">{{ item.client_name }}</p>
            <p class="text-[10px] text-[#C4B0A5]">{{ item.client_phone }}</p>
          </div>
          <div class="col-span-3 text-[11px] text-[#8A7A72] truncate hidden md:block">
            {{ item.university || '-' }}
            <span v-if="item.graduation_date" class="text-[#C4B0A5]">· {{ item.graduation_date }}</span>
          </div>
          <div class="col-span-3 text-[11px] text-[#8A7A72] truncate hidden lg:block">
            {{ item.package_name || '-' }}
          </div>
          <div class="col-span-3 flex items-center justify-end gap-2">
            <span class="status-chip" :class="statusClass(item.status)">{{ item.status }}</span>
          </div>
        </div>
        <div class="flex items-center gap-1.5 flex-shrink-0" @click.stop>
          <button @click="showDetail(item)" class="px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition text-[#8A7A72] hover:bg-[#FFF0E8]">Detail</button>
          <button v-if="item.status === 'new'" @click="quoteInquiry(item)" class="px-3 py-1.5 rounded-lg text-[10px] font-semibold transition text-white bg-[#D94A3D] hover:bg-[#C0392B]">Quote</button>
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
        :class="page === p ? 'bg-[#D94A3D] text-white' : 'bg-white border border-[#E8D5C8] text-[#8A7A72] hover:border-[#F4A261]/60'">{{ p }}</button>
    </div>

    <!-- Detail Modal -->
    <div v-if="detailItem" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.6); backdrop-filter: blur(6px);" @click.self="detailItem=null">
      <div class="card w-full max-w-sm p-5 animate-pop">
        <div class="flex items-center gap-3 mb-5">
          <div class="w-10 h-10 rounded-xl bg-[#FDECEA] flex items-center justify-center text-lg font-bold text-[#D94A3D]">{{ (detailItem.client_name||'?')[0] }}</div>
          <div>
            <h3 class="font-bold text-[#2D1B14]">{{ detailItem.client_name }}</h3>
            <p class="text-[10px] text-[#C4B0A5]">{{ detailItem.source || 'website' }}</p>
          </div>
          <span class="ml-auto status-chip" :class="statusClass(detailItem.status)">{{ detailItem.status }}</span>
          <button @click="detailItem=null" class="text-[#C4B0A5] hover:text-[#2D1B14]">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <dl class="space-y-2.5 text-sm">
          <div class="flex justify-between border-b border-[#E8D5C8]/60 pb-1.5"><dt class="text-[#C4B0A5]">WA</dt><dd class="font-medium text-[#2D1B14]">{{ detailItem.client_phone }}</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 pb-1.5"><dt class="text-[#C4B0A5]">Tgl Wisuda</dt><dd>{{ detailItem.graduation_date }}</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 pb-1.5"><dt class="text-[#C4B0A5]">Univ</dt><dd>{{ detailItem.university || '-' }}</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 pb-1.5"><dt class="text-[#C4B0A5]">Lokasi</dt><dd>{{ detailItem.location || '-' }}</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 pb-1.5"><dt class="text-[#C4B0A5]">Paket</dt><dd>{{ detailItem.package_name || '-' }}</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 pb-1.5"><dt class="text-[#C4B0A5]">Catatan</dt><dd class="italic">{{ detailItem.notes || '-' }}</dd></div>
        </dl>
        <div class="flex gap-2 mt-5">
          <button @click="detailItem=null" class="flex-1 px-4 py-2.5 bg-[#FFF0E8] text-[#8A7A72] rounded-xl text-xs font-medium hover:bg-[#FFE5DA] transition">Tutup</button>
          <a v-if="detailItem.client_phone" :href="'https://wa.me/'+detailItem.client_phone" target="_blank" class="flex-1 px-4 py-2.5 bg-[#D94A3D] text-white rounded-xl text-xs font-medium hover:bg-[#C0392B] transition text-center flex items-center justify-center gap-1">💬 WA</a>
        </div>
      </div>
    </div>

    <!-- Quote Modal -->
    <div v-if="quoteItem" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.6); backdrop-filter: blur(6px);" @click.self="quoteItem=null">
      <div class="card w-full max-w-sm p-5 animate-pop">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-[#2D1B14]">📝 Buat Quote</h3>
          <button @click="resetQuote" class="text-[#C4B0A5] hover:text-[#2D1B14]">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <p class="text-xs text-[#8A7A72] mb-4">— {{ quoteItem.client_name }}</p>
        <form v-if="!quoteResult" @submit.prevent="submitQuote" class="space-y-3">
          <div>
            <label class="text-[10px] text-[#C4B0A5] block mb-1.5">Pilih Paket</label>
            <select v-model="quoteForm.package_id" required class="input-fancy !text-xs">
              <option value="">-- Pilih --</option>
              <option v-for="p in packages" :key="p.id" :value="p.id">{{ p.name }} — Rp {{ (p.price||0).toLocaleString('id-ID') }}</option>
            </select>
          </div>
          <div class="bg-[#FFF0E8] rounded-xl p-3 space-y-1 text-xs">
            <div class="flex justify-between"><span class="text-[#C4B0A5]">Total</span><span class="font-semibold text-[#2D1B14]">Rp {{ (quoteForm.total_price||0).toLocaleString('id-ID') }}</span></div>
            <div class="flex justify-between"><span class="text-[#C4B0A5]">DP (50%)</span><span class="font-semibold text-[#D94A3D]">Rp {{ (quoteForm.dp_amount||0).toLocaleString('id-ID') }}</span></div>
          </div>
          <div v-if="quoteError" class="bg-red-50 border border-red-200 text-red-500 text-xs p-3 rounded-xl">{{ quoteError }}</div>
          <div class="flex gap-2 pt-1">
            <button type="button" @click="resetQuote" class="flex-1 px-4 py-2.5 bg-[#FFF0E8] text-[#8A7A72] rounded-xl text-xs font-medium hover:bg-[#FFE5DA] transition">Batal</button>
            <button type="submit" :disabled="!quoteForm.package_id || quoteLoading" class="flex-1 px-4 py-2.5 bg-[#D94A3D] text-white rounded-xl text-xs font-semibold disabled:opacity-40 hover:bg-[#C0392B] transition">
              {{ quoteLoading ? 'Ngirim...' : 'Kirim Quote' }}
            </button>
          </div>
        </form>
        <div v-else class="space-y-3">
          <div class="bg-[#FDECEA] rounded-xl p-3">
            <p class="text-[#D94A3D] font-medium text-sm">✅ Booking berhasil!</p>
          </div>
          <div class="bg-[#FFF0E8] rounded-xl p-3 text-xs space-y-1">
            <p><span class="text-[#C4B0A5]">ID:</span> <span class="font-medium text-[#2D1B14]">#{{ quoteResult.booking?.id }}</span></p>
            <p><span class="text-[#C4B0A5]">Total:</span> <span class="font-semibold text-[#D94A3D]">Rp {{ (quoteResult.total_price||0).toLocaleString('id-ID') }}</span></p>
          </div>
          <div class="space-y-2">
            <a :href="quoteResult.wa_link" target="_blank" class="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#D94A3D] text-white rounded-xl text-xs font-semibold hover:bg-[#C0392B] transition">💬 Kirim WA</a>
          </div>
          <button @click="resetQuote" class="w-full py-2 text-[10px] text-[#C4B0A5] hover:text-[#8A7A72] transition">Tutup</button>
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
const filterStatus = ref('')
const page = ref(1)
const totalPages = ref(1)
const statuses = ['new', 'quoted', 'booked', 'expired', 'lost', 'archived']
const detailItem = ref(null)
const quoteItem = ref(null)
const packages = ref([])
const quoteForm = ref({ package_id: '', total_price: 0, dp_amount: 0 })
const quoteResult = ref(null)
const quoteError = ref('')
const quoteLoading = ref(false)

function statusClass(s) {
  const map = {
    new: 'bg-[#FDECEA] text-[#D94A3D]',
    quoted: 'bg-[#FFF0E8] text-[#F4A261]',
    booked: 'bg-[#E8F5E9] text-[#2E7D32]',
    expired: 'bg-[#FFF5F0] text-[#C4B0A5]',
    lost: 'bg-[#FEF2F2] text-[#EF4444]',
    archived: 'bg-[#FFF5F0] text-[#C4B0A5]'
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

async function quoteInquiry(item) {
  quoteItem.value = item
  quoteForm.value = { package_id: '', total_price: 0, dp_amount: 0 }
  quoteResult.value = null
  quoteError.value = ''
  try {
    const r = await fetch(`${API}/packages`, { credentials: 'include' })
    const d = await r.json()
    packages.value = d.data || []
  } catch {}
}

watch(() => quoteForm.value.package_id, (id) => {
  if (!id) { quoteForm.value.total_price = 0; quoteForm.value.dp_amount = 0; return }
  const pkg = packages.value.find(p => p.id == id)
  if (pkg) {
    quoteForm.value.total_price = pkg.price
    quoteForm.value.dp_amount = Math.round(pkg.price * 0.5)
  }
})

async function submitQuote() {
  quoteError.value = ''
  quoteLoading.value = true
  try {
    const res = await fetch(`${API}/inquiries/${quoteItem.value.id}/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ package_id: quoteForm.value.package_id })
    })
    if (!res.ok) { const e = await res.json(); quoteError.value = e.error || 'Gagal'; return }
    quoteResult.value = await res.json()
    await load()
  } catch (e) { quoteError.value = 'Error: ' + e.message }
  finally { quoteLoading.value = false }
}

function resetQuote() {
  quoteItem.value = null
  quoteResult.value = null
  quoteError.value = ''
}

let debounceTimer
watch(search, () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => { page.value = 1; load() }, 400)
})

load()
</script>
