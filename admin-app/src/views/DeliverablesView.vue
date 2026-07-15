<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-5">
      <h2 class="text-xl font-bold text-[#2D1B14] dark:text-slate-200 tracking-tight">Post Production</h2>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-20">
      <div class="loading-spinner animate-spin"></div>
    </div>

    <!-- Table -->
    <div v-else class="card overflow-hidden dark:bg-slate-900 dark:border-slate-800 animate-fade-in">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-[#8A7A72] dark:text-slate-400 border-b border-[#E8D5C8] dark:border-slate-800 text-left text-xs">
            <th class="p-3 font-medium w-16">Booking</th>
            <th class="p-3 font-medium">Client</th>
            <th class="p-3 font-medium">Fotografer</th>
            <th class="p-3 font-medium hidden md:table-cell">Setoran Freelance</th>
            <th class="p-3 font-medium">Status Post-Pro</th>
            <th class="p-3 font-medium">Status Bayar</th>
            <th class="p-3 font-medium hidden lg:table-cell">Link Hasil {{ authStore.companyName }}</th>
            <th class="p-3 font-medium text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in data" :key="item.booking_id"
            class="border-b border-[#E8D5C8]/40 dark:border-slate-800/60 hover:bg-[#FFF8F3] dark:hover:bg-slate-800/50 text-[#2D1B14] dark:text-slate-200 text-xs transition">
            <td class="p-3 font-mono text-[10px] text-[#8A7A72]">#{{ item.booking_id }}</td>
            <td class="p-3">
              <span class="font-semibold">{{ item.client_name || '-' }}</span>
              <div class="text-[10px] text-[#C4B0A5] dark:text-slate-500">{{ item.university || '-' }}</div>
            </td>
            <td class="p-3">
              <span class="font-medium text-[#2d1b14] dark:text-slate-300">{{ item.fg_name || '-' }}</span>
            </td>
            <td class="p-3 hidden md:table-cell">
              <div v-if="item.delivery_type === 'link'">
                <a :href="item.drive_folder_url" target="_blank" class="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium text-[11px]">
                  🔗 Drive Setoran FG
                </a>
              </div>
              <div v-else-if="item.delivery_type === 'fisik'">
                <span class="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded text-[10px] font-medium">
                  📦 Setor Fisik
                </span>
              </div>
              <span v-else class="text-[#C4B0A5] dark:text-slate-500">Belum disetor</span>
            </td>
            <td class="p-3">
              <span class="status-chip" :class="ppStatusClass(item.pp_status)">{{ item.pp_status }}</span>
            </td>
            <td class="p-3" @click.stop>
              <span v-if="item.balance_status === 'paid'" class="status-chip bg-[#E8F5E9] text-[#2E7D32] dark:bg-green-950/20 dark:text-green-400 border border-green-200 dark:border-green-900 font-bold">
                Lunas
              </span>
              <span v-else-if="item.balance_status === 'uploaded'" @click="openVerifyModal(item)" class="status-chip bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200 dark:border-amber-800 cursor-pointer animate-pulse hover:bg-amber-100 transition font-bold" title="Klik untuk verifikasi bukti pelunasan">
                ⏳ Verifikasi Pelunasan
              </span>
              <span v-else class="status-chip bg-[#FFF0E8] text-[#F4A261] dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200/40">
                Belum Pelunasan
              </span>
            </td>
            <td class="p-3 hidden lg:table-cell">
              <div v-if="item.download_url">
                <a :href="item.download_url" target="_blank" class="text-emerald-600 dark:text-emerald-400 hover:underline font-mono text-[10px] block truncate max-w-xs">
                  {{ item.download_url }}
                </a>
                <div class="text-[9px] text-slate-400">PIN: {{ item.download_password }}</div>
              </div>
              <span v-else class="text-[#C4B0A5] dark:text-slate-500">-</span>
            </td>
            <td class="p-3 text-right">
              <div class="flex gap-1.5 justify-end" @click.stop>
                <!-- Tombol Kirim Link (Hanya jika Status Belum Delivered) -->
                <button v-if="item.booking_status === 'editing'" @click="openDeliverModal(item)" class="px-2.5 py-1.5 bg-[#0f766e] text-white rounded-lg text-[10px] font-semibold hover:bg-[#0d6860] transition cursor-pointer">
                  📤 Kirim Link Hasil
                </button>
                <div v-else class="flex flex-col items-end gap-1">
                  <span class="text-[10px] text-green-600 dark:text-green-400 font-semibold flex items-center gap-1">
                    ✓ Terkirim
                  </span>
                  <a :href="getWaLink(item)" target="_blank" class="text-blue-600 dark:text-blue-400 underline font-semibold text-[10px] flex items-center gap-0.5">
                    💬 Chat WA
                  </a>
                </div>
              </div>
            </td>
          </tr>
          <tr v-if="data.length === 0">
            <td class="p-8 text-center text-[#C4B0A5] dark:text-slate-500" colspan="8">
              <span class="text-2xl block mb-1">🎬</span>
              <span class="text-xs">Tidak ada data Post Production saat ini</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- MODAL: Deliver Drive Link Input -->
    <div v-if="showDeliverModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.6); backdrop-filter: blur(6px);" @click.self="closeDeliverModal">
      <div class="card w-full max-w-sm p-5 animate-pop dark:bg-slate-900 dark:border-slate-800 relative">
        <button @click="closeDeliverModal" class="absolute top-3 right-4 text-[#8A7A72] dark:text-slate-400 hover:text-[#2D1B14] dark:hover:text-slate-200 text-xl font-bold">×</button>
        
        <h3 class="font-bold text-sm text-[#2D1B14] dark:text-slate-200 mb-1">📤 Kirim Link Drive ke Client</h3>
        <p class="text-[10px] text-[#8A7A72] dark:text-slate-400 mb-4">Input link Google Drive hasil foto final dan PIN akses untuk client.</p>

        <form @submit.prevent="submitDeliver" class="space-y-3.5">
          <div>
            <label class="text-[10px] font-bold text-[#8A7A72] dark:text-slate-400 block mb-1.5">Link Google Drive</label>
            <input v-model="deliverForm.download_url" type="url" required class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="https://drive.google.com/drive/folders/...">
          </div>

          <div>
            <label class="text-[10px] font-bold text-[#8A7A72] dark:text-slate-400 block mb-1.5">Password / PIN Akses Client</label>
            <input v-model="deliverForm.password" required class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="Masukkan 4 digit PIN / Password...">
          </div>

          <!-- Quick Link Response Info -->
          <div v-if="deliverResult" class="bg-[#E8F5E9] dark:bg-green-950/20 border border-green-200/50 rounded-xl p-3 text-xs text-[#2E7D32] dark:text-green-400 animate-fade-up">
            <p class="font-bold">✓ Hasil Foto Berhasil Dikirim!</p>
            <p class="text-[10px] mt-0.5 text-slate-500">Status booking sekarang: **Delivered**.</p>
            <a :href="deliverResult.wa_link_client" target="_blank" class="text-blue-600 dark:text-blue-400 underline font-semibold mt-1.5 inline-flex items-center gap-1 text-[11px]">
              💬 Kirim WA ke Client
            </a>
          </div>

          <!-- Buttons -->
          <div class="flex gap-2 pt-1">
            <button type="button" @click="closeDeliverModal" class="flex-1 px-4 py-2.5 bg-[#FFF0E8] dark:bg-slate-800 text-[#8A7A72] dark:text-slate-300 rounded-xl text-xs font-medium hover:bg-[#FFE5DA] transition">
              Tutup
            </button>
            <button v-if="!deliverResult" type="submit" :disabled="submitting" class="flex-1 px-4 py-2.5 bg-[#0f766e] text-white rounded-xl text-xs font-semibold disabled:opacity-40 hover:bg-[#0d6860] transition flex items-center justify-center gap-1.5">
              <span v-if="!submitting">Kirim →</span>
              <div v-else class="loading-spinner !w-3.5 !h-3.5 !border-2 !border-t-white"></div>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL: Verify Balance Payment -->
    <div v-if="showVerifyModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.6); backdrop-filter: blur(6px);" @click.self="showVerifyModal = false">
      <div class="card w-full max-w-md p-5 animate-pop relative max-h-[90vh] overflow-y-auto dark:bg-slate-900 dark:border-slate-800">
        <button @click="showVerifyModal = false" class="absolute top-4 right-4 text-[#B8C6B8] hover:text-[#2D3A2E] dark:hover:text-slate-200">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
        <h3 class="font-bold text-sm text-[#2D1B14] dark:text-slate-200 mb-1">🔍 Verifikasi Pelunasan</h3>
        <p class="text-[10px] text-[#8A7A72] dark:text-slate-400 mb-4">— {{ verifyItem.client_name }}</p>
        
        <div class="mb-5">
          <label class="text-[10px] text-[#C4B0A5] block mb-1">Bukti Transfer Pelunasan</label>
          <div class="border border-[#E8D5C8] dark:border-slate-800 rounded-xl overflow-hidden bg-gray-50 dark:bg-slate-950 flex items-center justify-center min-h-[300px] max-h-[500px]">
            <iframe v-if="isPdf(verifyUrl)" :src="verifyUrl" class="w-full h-80" frameborder="0"></iframe>
            <img v-else :src="verifyUrl" class="max-w-full max-h-[480px] object-contain" alt="Bukti Transfer" />
          </div>
        </div>

        <div class="flex gap-2">
          <button @click="showVerifyModal = false" class="flex-1 px-4 py-2.5 bg-[#FFF0E8] dark:bg-slate-800 text-[#8A7A72] dark:text-slate-300 rounded-xl text-xs font-medium hover:bg-[#FFE5DA] transition">Batal</button>
          <button @click="submitVerification" class="flex-1 px-4 py-2.5 bg-[#0f766e] text-white rounded-xl text-xs font-semibold hover:bg-[#0d6860] transition">
            Verifikasi Sah ✓
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const API = '/api/admin'
const data = ref([])
const loading = ref(true)
const submitting = ref(false)

// Deliver modal state
const showDeliverModal = ref(false)
const deliverItem = ref(null)
const deliverForm = ref({ download_url: '', password: '' })
const deliverResult = ref(null)

// Verification modal state
const showVerifyModal = ref(false)
const verifyItem = ref(null)
const verifyUrl = ref('')

function isPdf(url) {
  return url && url.toLowerCase().endsWith('.pdf')
}

function openVerifyModal(item) {
  verifyItem.value = item
  verifyUrl.value = item.balance_bukti_url || ''
  showVerifyModal.value = true
}

async function submitVerification() {
  const item = verifyItem.value
  try {
    const r = await fetch(`${API}/bookings/${item.booking_id}/verify-balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ balance_bukti_url: item.balance_bukti_url })
    })
    const d = await r.json()
    if (d.booking || d.status === 'ok') {
      showVerifyModal.value = false
      verifyItem.value = null
      await load()
      
      const link = d.wa_link_client || d.wa_link
      if (link) {
        window.open(link, '_blank')
      }
    } else {
      alert(d.error || 'Verifikasi gagal')
    }
  } catch (e) {
    alert('Error: ' + e.message)
  }
}

function ppStatusClass(s) {
  if (s === 'Terkirim ke Client') return 'bg-[#E8F5E9] text-[#2E7D32] dark:bg-green-950/20 dark:text-green-400'
  if (s === 'File Diterima (Siap Kirim Link)') return 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200/40'
  return 'bg-[#FFF0E8] text-[#F4A261] dark:bg-amber-950/20 dark:text-amber-400'
}

async function load(silent = false) {
  if (!silent) loading.value = true
  try {
    const r = await fetch(`${API}/deliverables`, { credentials: 'include' })
    const result = await r.json()
    data.value = result.data || []
  } catch (e) {
    console.error(e)
  }
  if (!silent) loading.value = false
}

function openDeliverModal(item) {
  deliverItem.value = item
  deliverForm.value = {
    download_url: item.download_url || '',
    // Generate a simple 4-digit random pin code for client password download
    password: item.download_password || String(Math.floor(1000 + Math.random() * 9000))
  }
  deliverResult.value = null
  showDeliverModal.value = true
}

function closeDeliverModal() {
  showDeliverModal.value = false
  deliverItem.value = null
  deliverResult.value = null
}

async function submitDeliver() {
  if (!deliverForm.value.download_url) return
  submitting.value = true
  try {
    const res = await fetch(`${API}/post-production/${deliverItem.value.booking_id}/send-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        download_url: deliverForm.value.download_url,
        password: deliverForm.value.password
      })
    })
    const d = await res.json()
    if (res.ok) {
      deliverResult.value = d
      await load()
    } else {
      alert(d.error || 'Gagal mengirim hasil foto')
    }
  } catch (e) {
    console.error(e)
    alert('Terjadi kesalahan koneksi ke server.')
  }
  submitting.value = false
}

// Generate whatsapp link dynamically for already sent bookings
function getWaLink(item) {
  if (!item.download_url || !item.client_phone) return '#'
  
  // Custom message body
  const waMessage = `Halo kak! File foto wisuda kakak dari studio ${authStore.companyName} sudah siap di-download.\n\nLink Google Drive: ${item.download_url}\nPIN Akses: ${item.download_password}\n\nTerima kasih banyak telah berfoto bersama ${authStore.companyName}! 😊`;
  return `https://wa.me/${item.client_phone}?text=${encodeURIComponent(waMessage)}`;
}

let timer = null
onMounted(() => {
  load()
  timer = setInterval(() => load(true), 3000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>