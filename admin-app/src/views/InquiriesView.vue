<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="font-serif text-2xl font-bold text-white">Inquiries / Leads</h2>
      <div class="flex gap-2">
        <select v-model="filterStatus" @change="load()" class="bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Semua Status</option>
          <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
        </select>
        <input v-model="search" class="bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm w-48" placeholder="Cari...">
      </div>
    </div>

    <!-- Table -->
    <div v-if="loading" class="flex justify-center py-12"><div class="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div></div>
    <div v-else>
      <div class="bg-gray-800/30 border border-gray-700/50 rounded-xl overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-gray-400 border-b border-gray-700/50 text-left">
              <th class="p-3 font-medium">Nama</th>
              <th class="p-3 font-medium hidden md:table-cell">WA</th>
              <th class="p-3 font-medium hidden lg:table-cell">Tgl Wisuda</th>
              <th class="p-3 font-medium hidden lg:table-cell">Univ</th>
              <th class="p-3 font-medium">Status</th>
              <th class="p-3 font-medium hidden md:table-cell">Tgl</th>
              <th class="p-3 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in data" :key="item.id" class="border-b border-gray-800/50 hover:bg-gray-800/20 text-gray-300">
              <td class="p-3 font-medium text-white">{{ item.client_name }}</td>
              <td class="p-3 hidden md:table-cell">{{ item.client_phone }}</td>
              <td class="p-3 hidden lg:table-cell">{{ item.graduation_date }}</td>
              <td class="p-3 hidden lg:table-cell">{{ item.university }}</td>
              <td class="p-3">
                <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                  :class="statusClass(item.status)">{{ item.status }}</span>
              </td>
              <td class="p-3 hidden md:table-cell text-gray-500">{{ item.created_at?.split(' ')[0] || item.created_at?.split('T')[0] }}</td>
              <td class="p-3">
                <div class="flex gap-1">
                  <button @click="showDetail(item)" class="px-2 py-1 bg-amber-600/20 text-amber-400 rounded text-xs hover:bg-amber-600/30">Detail</button>
                  <button v-if="item.status === 'new'" @click="quoteInquiry(item)" class="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs hover:bg-blue-600/30">Quote</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="data.length === 0 && !loading" class="text-center py-12 text-gray-500">Belum ada inquiry</div>
      <div v-if="totalPages > 1" class="flex justify-center gap-2 mt-4 text-sm">
        <button v-for="p in totalPages" :key="p" @click="page = p; load()" 
          class="px-3 py-1 rounded" :class="page === p ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'">{{ p }}</button>
      </div>
    </div>

    <!-- Detail Modal -->
    <div v-if="detailItem" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" @click.self="detailItem=null">
      <div class="bg-gray-900 border border-gray-700/50 rounded-2xl p-6 w-full max-w-lg mx-4">
        <h3 class="font-serif text-xl font-bold text-white mb-4">Detail Inquiry</h3>
        <dl class="space-y-2 text-sm">
          <div class="flex"><dt class="text-gray-400 w-32">Nama</dt><dd class="text-white">{{ detailItem.client_name }}</dd></div>
          <div class="flex"><dt class="text-gray-400 w-32">WA</dt><dd class="text-white">{{ detailItem.client_phone }}</dd></div>
          <div class="flex"><dt class="text-gray-400 w-32">Email</dt><dd class="text-white">{{ detailItem.client_email || '-' }}</dd></div>
          <div class="flex"><dt class="text-gray-400 w-32">Tgl Wisuda</dt><dd class="text-white">{{ detailItem.graduation_date }}</dd></div>
          <div class="flex"><dt class="text-gray-400 w-32">Lokasi</dt><dd class="text-white">{{ detailItem.location }}</dd></div>
          <div class="flex"><dt class="text-gray-400 w-32">Univ</dt><dd class="text-white">{{ detailItem.university }}</dd></div>
          <div class="flex"><dt class="text-gray-400 w-32">Paket</dt><dd class="text-white">{{ detailItem.package_name || '-' }}</dd></div>
          <div class="flex"><dt class="text-gray-400 w-32">Catatan</dt><dd class="text-white">{{ detailItem.notes || '-' }}</dd></div>
          <div class="flex"><dt class="text-gray-400 w-32">Sumber</dt><dd class="text-white">{{ detailItem.source || 'website' }}</dd></div>
          <div class="flex"><dt class="text-gray-400 w-32">Status</dt><dd><span class="px-2 py-0.5 rounded-full text-xs font-medium" :class="statusClass(detailItem.status)">{{ detailItem.status }}</span></dd></div>
        </dl>
        <div class="flex gap-2 mt-6">
          <button @click="detailItem=null" class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition text-sm">Tutup</button>
          <a v-if="detailItem.client_phone" :href="'https://wa.me/'+detailItem.client_phone" target="_blank" class="px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg transition text-sm inline-block">Chat WA</a>
        </div>
      </div>
    </div>

    <!-- Quote Modal -->
    <div v-if="quoteItem" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" @click.self="quoteItem=null">
      <div class="bg-gray-900 border border-gray-700/50 rounded-2xl p-6 w-full max-w-lg mx-4">
        <h3 class="font-serif text-xl font-bold text-white mb-4">Buat Quote — {{ quoteItem.client_name }}</h3>
        <form v-if="!quoteResult" @submit.prevent="submitQuote" class="space-y-4">
          <div>
            <label class="block text-sm text-gray-400 mb-1">Pilih Paket</label>
            <select v-model="quoteForm.package_id" required class="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">-- Pilih --</option>
              <option v-for="p in packages" :key="p.id" :value="p.id">{{ p.name }} — Rp {{ (p.price||0).toLocaleString('id-ID') }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Total Harga</label>
            <input :value="'Rp ' + (quoteForm.total_price||0).toLocaleString('id-ID')" class="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm" readonly>
          </div>
          <div class="text-xs text-gray-500">
            DP 50%: <strong>Rp {{ (quoteForm.dp_amount||0).toLocaleString('id-ID') }}</strong>
          </div>
          <div v-if="quoteError" class="bg-red-900/30 text-red-400 text-sm p-3 rounded-lg">{{ quoteError }}</div>
          <div class="flex gap-2 justify-end pt-2">
            <button type="button" @click="resetQuote" class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition text-sm">Batal</button>
            <button type="submit" :disabled="!quoteForm.package_id || quoteLoading" class="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition text-sm disabled:opacity-50">{{ quoteLoading ? 'Processing...' : 'Kirim Quote' }}</button>
          </div>
        </form>
        <div v-else class="space-y-4">
          <div class="bg-green-900/30 border border-green-800/50 rounded-lg p-4">
            <p class="text-green-400 font-medium text-sm">✅ Booking berhasil dibuat!</p>
          </div>
          <div class="bg-gray-800/40 rounded-lg p-3 text-sm">
            <p class="text-gray-400">Booking ID: <span class="text-white font-medium">#{{ quoteResult.booking?.id }}</span></p>
            <p class="text-gray-400 mt-1">Total: <span class="text-amber-400 font-medium">Rp {{ (quoteResult.total_price||0).toLocaleString('id-ID') }}</span></p>
            <p class="text-gray-400">DP: <span class="text-white font-medium">Rp {{ (quoteResult.dp_amount||0).toLocaleString('id-ID') }}</span></p>
          </div>
          <div class="space-y-2">
            <a :href="quoteResult.wa_link" target="_blank" class="flex items-center justify-center gap-2 px-4 py-3 bg-green-700 hover:bg-green-600 text-white rounded-lg transition text-sm font-medium">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Kirim WA ke Client
            </a>
            <a :href="quoteResult.booking_url" target="_blank" class="flex items-center justify-center gap-2 px-4 py-3 bg-blue-700 hover:bg-blue-600 text-white rounded-lg transition text-sm font-medium">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
              Buka Booking Client
            </a>
          </div>
          <button @click="resetQuote" class="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition text-sm">Tutup</button>
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
  const map = { new: 'bg-blue-900/40 text-blue-400', quoted: 'bg-yellow-900/40 text-yellow-400', booked: 'bg-green-900/40 text-green-400', expired: 'bg-gray-700/40 text-gray-400', lost: 'bg-red-900/40 text-red-400', archived: 'bg-gray-700/40 text-gray-500' }
  return map[s] || 'bg-gray-700/40 text-gray-400'
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

function showDetail(item) {
  detailItem.value = item
}

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

// Debounce search
let debounceTimer
watch(search, () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => { page.value = 1; load() }, 500)
})

load()
</script>