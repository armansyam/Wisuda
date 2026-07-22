<template>
  <div>
    <div class="flex items-center justify-between mb-5">
      <h2 class="text-xl font-bold text-[#2D1B14] dark:text-slate-200">Freelancers (Fotografer / Videografer)</h2>
      <button @click="openForm(null)" class="px-3.5 py-2 bg-[#1A1A2E] text-[#C59B63] rounded-xl text-xs font-semibold hover:bg-[#2A2A4E] transition shadow-md shadow-[#1A1A2E]/8 flex items-center gap-1.5">+ Tambah FG</button>
    </div>

    <div v-if="loading" class="flex justify-center py-12"><div class="loading-spinner"></div></div>

    <div v-else class="card overflow-hidden dark:bg-slate-900 dark:border-slate-800">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-[#8A7A72] dark:text-slate-400 border-b border-[#E8D5C8] dark:border-slate-800 text-left text-xs">
            <th class="p-3 font-medium">Nama</th>
            <th class="p-3 font-medium">WA</th>
            <th class="p-3 font-medium">Kode Akses</th>
            <th class="p-3 font-medium">Rate Default</th>
            <th class="p-3 font-medium">Spesialisasi</th>
            <th class="p-3 font-medium">Bank</th>
            <th class="p-3 font-medium">Status</th>
            <th class="p-3 font-medium">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in data" :key="item.id" class="border-b border-[#E8D5C8]/40 dark:border-slate-800/60 hover:bg-[#FFF8F3] dark:hover:bg-slate-800/50 text-[#2D1B14] dark:text-slate-200 text-xs transition">
            <td class="p-3 font-semibold">{{ item.name }}</td>
            <td class="p-3 font-mono text-[11px]">+{{ item.phone }}</td>
            <td class="p-3">
              <div class="flex items-center gap-1.5">
                <code class="px-2 py-0.5 bg-[#FAF6F0] dark:bg-slate-950 border border-[#E8D5C8]/60 dark:border-slate-800 rounded font-mono text-[10px] text-[#C59B63] font-bold">{{ item.access_code || '-' }}</code>
                <button @click="copyCode(item)" class="text-[#8A7A72] hover:text-[#2D1B14] text-[10px] p-0.5 rounded transition" title="Salin Kode Akses">
                  {{ copiedId === item.id ? '✓' : '📋' }}
                </button>
                <button @click="regenerateCode(item)" class="text-[#8A7A72] hover:text-[#D94A3D] text-[10px] p-0.5 rounded transition" title="Generate Ulang Kode">
                  🔄
                </button>
              </div>
            </td>
            <td class="p-3 font-semibold text-amber-600 dark:text-amber-400">Rp {{ (item.default_rate || 0).toLocaleString('id-ID') }}</td>
            <td class="p-3">
              <span v-for="s in (item.specialties || [])" :key="s" class="status-chip bg-[#FAF6F0] text-[#8A7A72] dark:bg-slate-800 dark:text-slate-300 mr-1 text-[10px]">{{ s }}</span>
            </td>
            <td class="p-3 text-[11px]">
              <template v-if="item.bank_account">
                <span class="font-medium">{{ item.bank_account.bank }}</span> {{ item.bank_account.number }}
                <div class="text-[9px] text-[#8A7A72] dark:text-slate-400">a.n. {{ item.bank_account.name }}</div>
              </template>
              <template v-else>-</template>
            </td>
            <td class="p-3">
              <span class="status-chip" :class="item.active ? 'bg-[#E8F5E9] text-[#2E7D32] dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-[#FFF5F0] text-[#C4B0A5] dark:bg-slate-800 dark:text-slate-400'">
                {{ item.active ? 'Aktif' : 'Nonaktif' }}
              </span>
            </td>
            <td class="p-3">
              <div class="flex gap-1.5 items-center flex-wrap">
                <a :href="getWaFgPortalLink(item)" target="_blank" class="px-2 py-1.5 bg-[#FAF6F0] dark:bg-slate-800 text-[#8A7A72] dark:text-slate-300 border border-[#E8D5C8]/80 dark:border-slate-700 rounded-lg text-[10px] font-semibold hover:bg-[#FFF0E8] transition">
                  💬 Hubungi
                </a>
                <button @click="openForm(item)" class="px-2.5 py-1.5 bg-[#FFF0E8] dark:bg-amber-950/40 text-[#D94A3D] dark:text-amber-400 rounded-lg text-[10px] font-medium hover:bg-[#FFE5DA] transition">Edit</button>
                <button @click="toggleActive(item)" class="px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition"
                  :class="item.active ? 'bg-[#FEF2F2] text-[#EF4444] dark:bg-rose-950/40 dark:text-rose-400 hover:bg-[#FEE2E2]' : 'bg-[#FDECEA] text-[#D94A3D] dark:bg-amber-950/40 dark:text-amber-400 hover:bg-[#FCE8E6]'">
                  {{ item.active ? 'Nonaktifkan' : 'Aktifkan' }}
                </button>
                <button @click="hapus(item)" class="px-2.5 py-1.5 bg-[#FEF2F2] dark:bg-rose-950/40 text-[#EF4444] dark:text-rose-400 rounded-lg text-[10px] font-medium hover:bg-[#FEE2E2] transition">Hapus</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="data.length === 0" class="text-center py-12 text-[#C4B0A5] dark:text-slate-500">Belum ada freelancer</div>
    </div>

    <!-- Portal Link Info -->
    <div class="mt-4 p-4 card border-l-4 border-l-[#F4A261] dark:bg-slate-900 dark:border-slate-800">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-[10px] font-semibold text-[#8A7A72]/80 dark:text-slate-400 uppercase tracking-wider">🔗 Link Portal Freelance (Publik)</span>
      </div>
      <p class="text-xs text-[#8A7A72] dark:text-slate-400">Bagikan link berikut ke freelancer agar bisa cek jadwal client mereka:</p>
      <div class="flex items-center gap-2 mt-2">
        <code class="flex-1 px-3 py-2 bg-[#FFF0E8] dark:bg-slate-950 rounded-xl text-[11px] text-[#2D1B14] dark:text-slate-200 font-mono select-all overflow-hidden">{{ portalUrl }}</code>
        <button @click="copyPortalLink" class="px-3 py-2 bg-[#D94A3D] text-white rounded-xl text-[10px] font-semibold hover:bg-[#C0392B] transition whitespace-nowrap">
          {{ portalLinkCopied ? '✓ Tersalin' : '📋 Salin' }}
        </button>
      </div>
    </div>

    <!-- Form Modal -->
    <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(17,30,54,0.6); backdrop-filter: blur(6px);" @click.self="showForm=false">
      <div class="card w-full max-w-lg p-6 animate-pop dark:bg-slate-900 dark:border-slate-800">
        <h3 class="font-bold text-xl text-[#2D1B14] dark:text-slate-100 mb-5">{{ editing ? 'Edit FG' : 'Tambah FG' }}</h3>
        <form @submit.prevent="simpan" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold uppercase tracking-wider">NAMA *</label>
              <input v-model="form.name" required class="input-fancy dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="Nama Lengkap FG">
            </div>
            <div>
              <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold uppercase tracking-wider">NO. WA *</label>
              <div class="flex">
                <span class="flex items-center px-3 bg-[#FAF6F0] dark:bg-slate-950 border border-r-0 border-[#E5E0D8] dark:border-slate-800 rounded-l-xl text-xs font-bold text-[#8A7A72] dark:text-slate-400">+62</span>
                <input v-model="phoneDisplay" @input="onPhoneInput" required type="tel" class="input-fancy rounded-l-none dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="8123456789">
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold uppercase tracking-wider">RATE DEFAULT (RP / SESI)</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8A7A72] dark:text-slate-400">Rp</span>
                <input v-model="rateDisplay" @input="onRateInput" type="text" placeholder="0" class="input-fancy !pl-9 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 font-bold text-amber-600 dark:text-amber-400">
              </div>
            </div>
            <div>
              <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold uppercase tracking-wider">SPESIALISASI (PISAH KOMA)</label>
              <input v-model="form.specialties" class="input-fancy dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="wisuda, studio, prewisuda">
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold uppercase tracking-wider">BANK</label>
              <input v-model="form.bank_account" class="input-fancy dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="BCA">
            </div>
            <div>
              <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold uppercase tracking-wider">NO REK</label>
              <input v-model="form.bank_number" class="input-fancy dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="123456789">
            </div>
            <div>
              <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold uppercase tracking-wider">AN. REK</label>
              <input v-model="form.bank_name" class="input-fancy dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="Atas Nama">
            </div>
          </div>

          <div class="flex gap-2 justify-end pt-2">
            <button type="button" @click="showForm=false" class="px-4 py-2.5 bg-[#FAF9F6] text-[#8A7A72] border border-[#E5E0D8] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition">Batal</button>
            <button type="submit" class="px-5 py-2.5 bg-[#1A1A2E] text-[#C59B63] rounded-xl text-xs font-semibold hover:bg-[#2A2A4E] transition shadow-md">{{ editing ? 'Simpan' : 'Tambah FG' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const API = '/api/admin'
const data = ref([])
const loading = ref(true)
const showForm = ref(false)
const editing = ref(null)

const phoneDisplay = ref('')
const rateDisplay = ref('')

const form = ref({
  name: '',
  phone: '',
  specialties: '',
  bank_account: '',
  bank_number: '',
  bank_name: '',
  default_rate: 0
})

const copiedId = ref(null)
const portalLinkCopied = ref(false)

const portalUrl = computed(() => {
  return `${window.location.origin}/freelance-portal.html`
})

function onPhoneInput() {
  if (!phoneDisplay.value) {
    form.value.phone = ''
    return
  }
  let raw = phoneDisplay.value.replace(/[^0-9]/g, '')
  if (raw.startsWith('62')) {
    raw = raw.slice(2)
  } else if (raw.startsWith('0')) {
    raw = raw.slice(1)
  }
  phoneDisplay.value = raw
  form.value.phone = '62' + raw
}

function onRateInput() {
  let raw = rateDisplay.value.replace(/[^0-9]/g, '')
  const num = parseInt(raw || '0', 10)
  form.value.default_rate = num
  rateDisplay.value = num > 0 ? num.toLocaleString('id-ID') : ''
}

async function load() {
  loading.value = true
  try {
    const r = await fetch(`${API}/freelancers`, { credentials: 'include' })
    const d = await r.json()
    data.value = d.data || []
  } catch {}
  loading.value = false
}

function openForm(item) {
  editing.value = item || null
  if (item) {
    const ba = item.bank_account || {}
    let rawPhone = (item.phone || '').replace(/[^0-9]/g, '')
    if (rawPhone.startsWith('62')) rawPhone = rawPhone.slice(2)
    else if (rawPhone.startsWith('0')) rawPhone = rawPhone.slice(1)
    phoneDisplay.value = rawPhone

    const rate = item.default_rate || 0
    rateDisplay.value = rate > 0 ? rate.toLocaleString('id-ID') : ''

    form.value = {
      name: item.name,
      phone: item.phone ? ('62' + rawPhone) : '',
      specialties: Array.isArray(item.specialties) ? item.specialties.join(', ') : item.specialties || '',
      bank_account: ba.bank || '',
      bank_number: ba.number || '',
      bank_name: ba.name || '',
      default_rate: rate
    }
  } else {
    phoneDisplay.value = ''
    rateDisplay.value = ''
    form.value = {
      name: '',
      phone: '',
      specialties: '',
      bank_account: '',
      bank_number: '',
      bank_name: '',
      default_rate: 0
    }
  }
  showForm.value = true
}

async function simpan() {
  const payload = {
    name: form.value.name,
    phone: form.value.phone,
    specialties: form.value.specialties ? form.value.specialties.split(',').map(s => s.trim()).filter(Boolean) : [],
    bank_account: { bank: form.value.bank_account, number: form.value.bank_number, name: form.value.bank_name },
    default_rate: parseInt(form.value.default_rate || 0, 10)
  }
  const url = editing.value ? `${API}/freelancers/${editing.value.id}` : `${API}/freelancers`
  const method = editing.value ? 'PUT' : 'POST'
  await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) })
  showForm.value = false
  editing.value = null
  await load()
}

async function toggleActive(item) {
  const newActive = !item.active
  await fetch(`${API}/freelancers/${item.id}/active`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ active: newActive }) })
  await load()
}

async function hapus(item) {
  if (!confirm(`Hapus FG "${item.name}"? Data assignments tetap tersimpan.`)) return
  await fetch(`${API}/freelancers/${item.id}`, { method: 'DELETE', credentials: 'include' })
  await load()
}

function copyCode(item) {
  if (!item.access_code) return
  navigator.clipboard.writeText(item.access_code)
  copiedId.value = item.id
  setTimeout(() => { copiedId.value = null }, 2000)
}

async function regenerateCode(item) {
  if (!confirm(`Generate kode akses baru untuk "${item.name}"? Kode lama tidak akan bisa dipakai lagi.`)) return
  try {
    const res = await fetch(`${API}/freelancers/${item.id}/regenerate-code`, { method: 'POST', credentials: 'include' })
    const data_res = await res.json()
    if (res.ok) {
      await load()
      alert(`Kode baru: ${data_res.access_code}`)
    }
  } catch {}
}

function copyPortalLink() {
  navigator.clipboard.writeText(portalUrl.value)
  portalLinkCopied.value = true
  setTimeout(() => { portalLinkCopied.value = false }, 2000)
}

function getWaFgPortalLink(item) {
  if (!item || !item.phone) return '#'
  const portalUrlVal = `http://${window.location.host}/freelance-portal.html?code=${item.access_code}`
  const msg = `Halo Kak ${item.name},\n\nBerikut adalah link portal freelance Anda untuk memantau jadwal dan progres foto wisuda:\n${portalUrlVal}\n\nLink ini sudah otomatis login ke akun Anda. Terima kasih!`
  return `https://wa.me/${item.phone}?text=${encodeURIComponent(msg)}`
}

onMounted(load)
</script>