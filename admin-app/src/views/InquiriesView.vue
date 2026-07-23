<template>
  <div>
    <div class="flex items-center justify-between mb-5">
      <div class="flex items-center gap-2.5">
        <h2 class="text-xl font-bold text-[#2D1B14] dark:text-slate-200 tracking-tight">Inquiries</h2>
        <span class="text-[10px] text-[#C4B0A5] bg-white dark:bg-slate-900 rounded-full px-2.5 py-0.5 border border-[#E8D5C8] dark:border-slate-800" v-if="!loading">{{ data.length }} item</span>
      </div>
      <div class="flex items-center gap-2">
        <input v-model="search" class="input-fancy !w-32 !py-1.5 !text-[11px] dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200" placeholder="🔍 Cari...">
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
          
          <!-- Direct Quote / Link Buttons -->
          <template v-if="item.status === 'new'">
            <button @click="openQuoteModal(item)" class="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition text-amber-900 bg-[#FAF0DD] hover:bg-[#FFE8C2] dark:bg-amber-950/40 dark:text-amber-300">📋 Buat Quote</button>
            <button @click="generateLink(item)" class="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition text-white bg-[#0f766e] hover:bg-[#0d6860]">Buat Link</button>
          </template>

          <button v-else-if="item.status === 'converted' && item.booking_token && item.token_used === 0" @click="showGeneratedLink(item)" class="px-3 py-1.5 rounded-lg text-[10px] font-semibold transition text-[#0f766e] bg-[#FAF6F0] border border-[#E8D5C8] dark:bg-slate-800 dark:border-slate-700 hover:bg-[#FFE5DA]">Lihat Link</button>
          
          <button @click.stop="deleteInquiry(item)" class="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20" title="Hapus Inquiry">Hapus</button>
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
          
          <!-- Action to create quote inside detail modal -->
          <div v-if="detailItem.status === 'new'" class="pt-2">
            <button @click="openQuoteModal(detailItem); detailItem = null;" class="w-full py-2 bg-[#FAF0DD] border border-[#E8D5C8] text-[#B5942B] dark:bg-amber-950/40 dark:border-amber-900/50 dark:text-amber-300 rounded-xl text-xs font-semibold hover:bg-[#FFE8C2] transition flex items-center justify-center gap-1.5">
              📋 Buat Penawaran Paket (Quote)
            </button>
          </div>

          <div class="flex flex-col border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5" v-if="detailItem.booking_token">
            <dt class="text-[#C4B0A5] mb-1">Link Booking <span class="text-[9px]" :class="detailItem.token_used ? 'text-green-600' : 'text-yellow-600'">({{ detailItem.token_used ? 'Sudah Dipakai' : 'Belum Dipakai' }})</span></dt>
            <dd class="flex gap-1.5 items-center">
              <input :value="getBookingUrl(detailItem.booking_token)" readonly class="input-fancy !text-[11px] !py-1 select-all dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" :id="'detail-booking-url-' + detailItem.id">
              <button @click="copyDetailLink('detail-booking-url-' + detailItem.id)" class="px-2 py-1 bg-[#FAF6F0] border border-[#E8D5C8] dark:bg-slate-800 dark:border-slate-700 text-[#8A7A72] dark:text-slate-300 rounded-lg text-[10px] font-semibold hover:bg-[#FFE5DA] transition flex-shrink-0">
                Salin
              </button>
            </dd>
            <div class="mt-2 flex justify-end">
              <button @click="regenerateBookingLink(detailItem)" class="px-2.5 py-1 bg-[#FFF0E8] border border-[#E8D5C8] dark:bg-slate-800 dark:border-slate-700 text-[#D94A3D] dark:text-amber-400 rounded-lg text-[10px] font-semibold hover:bg-[#FFE5DA] transition flex items-center gap-1">
                🔄 Perbarui / Buat Ulang Link
              </button>
            </div>
          </div>
          <div class="flex flex-col border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5" v-else-if="!detailItem.booking_token && detailItem.status !== 'quoted'">
            <dt class="text-[#C4B0A5] mb-1">Link Booking</dt>
            <dd>
              <button @click="regenerateBookingLink(detailItem)" class="px-2.5 py-1 bg-[#0f766e] text-white rounded-lg text-[10px] font-semibold hover:bg-[#0d6860] transition">
                🔑 Buat Link Booking
              </button>
            </dd>
          </div>
        </dl>
        <div class="flex gap-2 mt-5">
          <button @click="deleteInquiry(detailItem)" class="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1" title="Hapus Permanen">
            🗑️ Hapus
          </button>
          <button @click="detailItem=null" class="flex-1 px-4 py-2.5 bg-[#FFF0E8] dark:bg-slate-800 text-[#8A7A72] dark:text-slate-300 rounded-xl text-xs font-medium hover:bg-[#FFE5DA] transition">Tutup</button>
          <a v-if="detailItem.client_phone" :href="waAdminLink(detailItem)" target="_blank" class="flex-1 px-4 py-2.5 bg-[#0f766e] text-white rounded-xl text-xs font-medium hover:bg-[#0d6860] transition text-center flex items-center justify-center gap-1">💬 WA</a>
        </div>
      </div>
    </div>

    <!-- Create Quote Modal -->
    <div v-if="quoteItem" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.6); backdrop-filter: blur(6px);" @click.self="quoteItem=null">
      <div class="card w-full max-w-sm p-5 animate-pop dark:bg-slate-900 dark:border-slate-800 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-[#2D1B14] dark:text-slate-200 flex items-center gap-1.5">
            <span>📋</span> Buat Penawaran (Quote)
          </h3>
          <button @click="quoteItem=null" class="text-[#C4B0A5] hover:text-[#2D1B14] dark:hover:text-slate-200">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="bg-[#FAF0DD]/50 dark:bg-amber-950/20 p-3 rounded-xl border border-[#E8D5C8]/60 dark:border-amber-900/30 text-xs">
          <p class="font-semibold text-[#2D1B14] dark:text-slate-200">{{ quoteItem.client_name }}</p>
          <p class="text-[#8A7A72] dark:text-slate-400 mt-0.5">{{ quoteItem.university || '-' }} · {{ quoteItem.graduation_date }}</p>
        </div>

        <div>
          <label class="text-xs font-semibold text-[#2D1B14] dark:text-slate-300 block mb-1.5">Pilih Paket Foto Wisuda</label>
          <select v-model="quotePackageId" class="input-fancy w-full !text-xs !py-2 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
            <option value="" disabled>-- Pilih Paket --</option>
            <option v-for="pkg in packagesList" :key="pkg.id" :value="pkg.id">
              {{ pkg.name }} — Rp {{ (pkg.price || 0).toLocaleString('id-ID') }}
            </option>
          </select>
        </div>

        <div class="flex gap-2 pt-2">
          <button @click="quoteItem=null" class="flex-1 px-4 py-2.5 bg-[#FFF0E8] dark:bg-slate-800 text-[#8A7A72] dark:text-slate-300 rounded-xl text-xs font-medium hover:bg-[#FFE5DA] transition">Batal</button>
          <button @click="submitQuote" :disabled="!quotePackageId || submittingQuote" class="flex-1 px-4 py-2.5 bg-[#D94A3D] text-white rounded-xl text-xs font-semibold hover:bg-[#c33e32] transition disabled:opacity-50 flex items-center justify-center gap-1">
            <span v-if="submittingQuote" class="loading-spinner animate-spin !w-3 !h-3"></span>
            <span v-else>🚀 Kirim Quote</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Generated Link / Quote Result Modal -->
    <div v-if="tokenResult" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.6); backdrop-filter: blur(6px);" @click.self="tokenResult=null">
      <div class="card w-full max-w-sm p-5 animate-pop dark:bg-slate-900 dark:border-slate-800">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-bold text-[#2D1B14] dark:text-slate-200">🔗 {{ tokenResult.dp_amount ? 'Quotation & Link Booking' : 'Link Booking' }}</h3>
          <button @click="tokenResult=null" class="text-[#C4B0A5] hover:text-[#2D1B14] dark:hover:text-slate-200">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <p class="text-xs text-[#8A7A72] dark:text-slate-400 mb-4">
          {{ tokenResult.dp_amount ? 'Draf booking berhasil dibuat dengan nominal DP Rp ' + (tokenResult.dp_amount||0).toLocaleString('id-ID') + '. Kirimkan link ini ke client via WA.' : 'Kirimkan link ini ke client via WhatsApp untuk memilih paket & upload bukti pembayaran.' }}
        </p>
        
        <div class="space-y-3">
          <div>
            <label class="text-[10px] text-[#C4B0A5] block mb-1">Generated Booking URL</label>
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
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const API = '/api/admin'
const data = ref([])
const loading = ref(true)
const search = ref('')
const filterStatus = ref('')
const page = ref(1)
const totalPages = ref(1)
const statuses = ['new', 'quoted', 'converted', 'expired', 'lost', 'archived']
const detailItem = ref(null)
const tokenResult = ref(null)

const quoteItem = ref(null)
const quotePackageId = ref('')
const packagesList = ref([])
const submittingQuote = ref(false)

function statusClass(s) {
  const map = {
    new: 'bg-[#FDECEA] text-[#D94A3D] dark:bg-red-950/20 dark:text-red-400',
    quoted: 'bg-[#EBF5FF] text-[#1E40AF] dark:bg-blue-950/20 dark:text-blue-400',
    converted: 'bg-[#E8F5E9] text-[#2E7D32] dark:bg-green-950/20 dark:text-green-400',
    expired: 'bg-[#FFF5F0] text-[#C4B0A5] dark:bg-slate-800 dark:text-slate-400',
    lost: 'bg-[#FEF2F2] text-[#EF4444] dark:bg-red-950/20 dark:text-red-400',
    archived: 'bg-[#FFF5F0] text-[#C4B0A5] dark:bg-slate-800 dark:text-slate-400'
  }
  return map[s] || 'bg-[#FFF5F0] text-[#C4B0A5]'
}

async function loadPackages() {
  try {
    const res = await fetch(`${API}/packages?limit=100`, { credentials: 'include' })
    if (res.ok) {
      const result = await res.json()
      packagesList.value = Array.isArray(result) ? result : (result.data || [])
    }
  } catch (e) {
    console.error('Error loading packages:', e)
  }
}

async function load(silent = false) {
  if (!silent) loading.value = true
  try {
    const params = new URLSearchParams({ page: page.value, limit: 20 })
    if (search.value) params.set('search', search.value)
    if (filterStatus.value) params.set('status', filterStatus.value)
    const res = await fetch(`${API}/inquiries?` + params, { credentials: 'include' })
    const result = await res.json()
    data.value = result.data || []
    totalPages.value = result.totalPages || 1
  } catch {}
  if (!silent) loading.value = false
}

function showDetail(item) { detailItem.value = item }

function openQuoteModal(item) {
  quoteItem.value = item
  quotePackageId.value = item.package_id || (packagesList.value[0]?.id || '')
}

async function submitQuote() {
  if (!quoteItem.value || !quotePackageId.value) return
  submittingQuote.value = true
  try {
    const res = await fetch(`${API}/inquiries/${quoteItem.value.id}/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ package_id: quotePackageId.value })
    })
    const result = await res.json()
    if (res.ok) {
      tokenResult.value = result
      quoteItem.value = null
      await load()
    } else {
      alert(result.error || 'Gagal membuat penawaran quote')
    }
  } catch (e) {
    console.error('Quote error:', e)
    alert('Terjadi kesalahan saat memproses quote.')
  } finally {
    submittingQuote.value = false
  }
}

async function generateLink(item) {
  try {
    const res = await fetch(`${API}/inquiries/${item.id}/generate-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ duration_hours: 24 })
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

async function regenerateBookingLink(item) {
  if (!confirm(`Apakah Anda yakin ingin memperbarui/membuat ulang link booking untuk ${item.client_name}? Link lama akan tidak bisa digunakan lagi.`)) return
  
  try {
    const res = await fetch(`${API}/inquiries/${item.id}/generate-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ duration_hours: 24 })
    })
    if (res.ok) {
      const result = await res.json()
      alert('Link booking berhasil diperbarui!')
      tokenResult.value = result
      detailItem.value = null
      await load()
    } else {
      alert('Gagal memperbarui link booking')
    }
  } catch (e) {
    console.error('Error renewing token:', e)
  }
}

function showGeneratedLink(item) {
  if (!item || !item.booking_token) return
  
  const link = `http://${window.location.host}/confirm-booking.html?token=${item.booking_token}`
  const waMessage = `Halo ${item.client_name}, silakan pilih paket foto wisuda kamu dan selesaikan booking melalui link berikut ini ya: ${link}`
  const waLink = `https://api.whatsapp.com/send?phone=${item.client_phone}&text=${encodeURIComponent(waMessage)}`
  
  tokenResult.value = {
    token: item.booking_token,
    expires_at: item.token_expires_at,
    booking_url: link,
    wa_link: waLink
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

function copyDetailLink(id) {
  const el = document.getElementById(id)
  if (el) {
    el.select()
    document.execCommand('copy')
    alert('Link berhasil disalin!')
  }
}

function getBookingUrl(token) {
  if (!token) return ''
  return `http://${window.location.host}/confirm-booking.html?token=${token}`
}

function waAdminLink(item) {
  if (!item) return '#'
  const msg = `Halo Kak ${item.client_name}, terima kasih sudah mengirimkan inquiry wisuda untuk tanggal ${item.graduation_date} di ${item.location || '-'}. Saya admin dari ${authStore.companyName}. Yuk, kita diskusi untuk memilih paket foto terbaik yang paling cocok untuk kamu! 😊`
  return `https://api.whatsapp.com/send?phone=${item.client_phone}&text=${encodeURIComponent(msg)}`
}

async function deleteInquiry(item) {
  if (!item) return
  if (!confirm(`Apakah Anda yakin ingin menghapus data inquiry '${item.client_name}' secara permanen? Seluruh data terkait akan dihapus bersih tanpa sisa.`)) return

  try {
    const res = await fetch(`${API}/inquiries/${item.id}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    const d = await res.json()
    if (!res.ok) {
      alert(d.error || 'Gagal menghapus inquiry')
      return
    }
    alert(d.message || 'Data inquiry berhasil dihapus!')
    detailItem.value = null
    await load()
  } catch (e) {
    console.error('Delete inquiry error:', e)
    alert('Terjadi kesalahan koneksi.')
  }
}

let debounceTimer
watch(search, () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => { page.value = 1; load() }, 400)
})

let timer = null
onMounted(() => {
  loadPackages()
  load()
  timer = setInterval(() => load(true), 3000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>
