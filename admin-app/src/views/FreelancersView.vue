<template>
  <div>
    <div class="flex items-center justify-between mb-5">
      <h2 class="text-xl font-bold text-[#2D1B14] tracking-tight">Freelancers (FG)</h2>
      <button @click="openForm()" class="px-4 py-2 bg-[#D94A3D] hover:bg-[#C0392B] text-white rounded-xl transition text-sm font-medium">+ Tambah FG</button>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="loading-spinner"></div>
    </div>

    <div v-else class="card overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-[#8A7A72] border-b border-[#E8D5C8] text-left">
            <th class="p-3 font-medium">Nama</th>
            <th class="p-3 font-medium hidden md:table-cell">WA</th>
            <th class="p-3 font-medium">Kode Akses</th>
            <th class="p-3 font-medium text-right">Rate Default</th>
            <th class="p-3 font-medium hidden lg:table-cell">Spesialisasi</th>
            <th class="p-3 font-medium hidden lg:table-cell">Bank</th>
            <th class="p-3 font-medium">Status</th>
            <th class="p-3 font-medium">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in data" :key="item.id" class="border-b border-[#E8D5C8]/60 hover:bg-[#FFF8F3] text-[#2D1B14]">
            <td class="p-3 font-medium">{{ item.name }}</td>
            <td class="p-3 hidden md:table-cell text-[#8A7A72]">{{ item.phone }}</td>
            <td class="p-3">
              <div class="flex items-center gap-1.5">
                <code class="px-2 py-1 bg-[#FFF0E8] text-[#D94A3D] rounded-lg text-[11px] font-mono font-bold tracking-wider select-all">{{ item.access_code || '-' }}</code>
                <button v-if="item.access_code" @click="copyCode(item)" 
                  class="p-1 rounded-md hover:bg-[#FDECEA] transition text-[#8A7A72] hover:text-[#D94A3D]" 
                  :title="copiedId === item.id ? 'Tersalin!' : 'Salin Kode'">
                  <svg v-if="copiedId !== item.id" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                  <svg v-else class="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                </button>
                <button @click="regenerateCode(item)" 
                  class="p-1 rounded-md hover:bg-[#FEF2F2] transition text-[#8A7A72] hover:text-[#F4A261]" 
                  title="Generate Kode Baru">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                </button>
              </div>
            </td>
            <td class="p-3 text-right font-medium text-[#2D1B14]">Rp {{ (item.default_rate || 0).toLocaleString('id-ID') }}</td>
            <td class="p-3 hidden lg:table-cell text-[#8A7A72]">{{ Array.isArray(item.specialties) ? item.specialties.join(', ') : item.specialties || '-' }}</td>
            <td class="p-3 hidden lg:table-cell text-[#8A7A72]">{{ item.bank_account?.bank || '-' }}</td>
            <td class="p-3">
              <span class="status-chip" :class="item.active ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-[#FFF5F0] text-[#C4B0A5]'">
                {{ item.active ? 'Aktif' : 'Nonaktif' }}
              </span>
            </td>
            <td class="p-3">
              <div class="flex gap-1.5 items-center flex-wrap">
                <a :href="getWaFgPortalLink(item)" target="_blank" class="px-2 py-1.5 bg-[#FAF6F0] text-[#8A7A72] border border-[#E8D5C8]/80 rounded-lg text-[10px] font-semibold hover:bg-[#FFF0E8] transition">
                  💬 Hubungi
                </a>
                <button @click="openForm(item)" class="px-2.5 py-1.5 bg-[#FFF0E8] text-[#D94A3D] rounded-lg text-[10px] font-medium hover:bg-[#FFE5DA] transition">Edit</button>
                <button @click="toggleActive(item)" class="px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition"
                  :class="item.active ? 'bg-[#FEF2F2] text-[#EF4444] hover:bg-[#FEE2E2]' : 'bg-[#FDECEA] text-[#D94A3D] hover:bg-[#FCE8E6]'">
                  {{ item.active ? 'Nonaktifkan' : 'Aktifkan' }}
                </button>
                <button @click="hapus(item)" class="px-2.5 py-1.5 bg-[#FEF2F2] text-[#EF4444] rounded-lg text-[10px] font-medium hover:bg-[#FEE2E2] transition">Hapus</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="data.length === 0" class="text-center py-12 text-[#C4B0A5]">Belum ada freelancer</div>
    </div>

    <!-- Portal Link Info -->
    <div class="mt-4 p-4 card border-l-4 border-l-[#F4A261]">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-[10px] font-semibold text-[#8A7A72]/80 uppercase tracking-wider">🔗 Link Portal Freelance (Publik)</span>
      </div>
      <p class="text-xs text-[#8A7A72]">Bagikan link berikut ke freelancer agar bisa cek jadwal client mereka:</p>
      <div class="flex items-center gap-2 mt-2">
        <code class="flex-1 px-3 py-2 bg-[#FFF0E8] rounded-xl text-[11px] text-[#2D1B14] font-mono select-all overflow-hidden">{{ portalUrl }}</code>
        <button @click="copyPortalLink" class="px-3 py-2 bg-[#D94A3D] text-white rounded-xl text-[10px] font-semibold hover:bg-[#C0392B] transition whitespace-nowrap">
          {{ portalLinkCopied ? '✓ Tersalin' : '📋 Salin' }}
        </button>
      </div>
    </div>

    <!-- Form Modal -->
    <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.6); backdrop-filter: blur(6px);" @click.self="showForm=false">
      <div class="card w-full max-w-lg p-6 animate-pop">
        <h3 class="font-bold text-xl text-[#2D1B14] mb-5">{{ editing ? 'Edit FG' : 'Tambah FG' }}</h3>
        <form @submit.prevent="simpan" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-[11px] text-[#C4B0A5] mb-1.5">Nama *</label>
              <input v-model="form.name" required class="input-fancy">
            </div>
            <div>
              <label class="block text-[11px] text-[#C4B0A5] mb-1.5">WA *</label>
              <input v-model="form.phone" required type="tel" class="input-fancy">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-[11px] text-[#C4B0A5] mb-1.5">Rate Default (Rp / Sesi)</label>
              <input v-model="form.default_rate" type="number" min="0" placeholder="0" class="input-fancy">
            </div>
            <div>
              <label class="block text-[11px] text-[#C4B0A5] mb-1.5">Spesialisasi (pisah koma)</label>
              <input v-model="form.specialties" class="input-fancy" placeholder="wisuda, studio, prewisuda">
            </div>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-[11px] text-[#C4B0A5] mb-1.5">Bank</label>
              <input v-model="form.bank_account" class="input-fancy">
            </div>
            <div>
              <label class="block text-[11px] text-[#C4B0A5] mb-1.5">No Rek</label>
              <input v-model="form.bank_number" class="input-fancy">
            </div>
            <div>
              <label class="block text-[11px] text-[#C4B0A5] mb-1.5">An. Rek</label>
              <input v-model="form.bank_name" class="input-fancy">
            </div>
          </div>
          <div class="flex gap-2 justify-end pt-2">
            <button type="button" @click="showForm=false" class="px-4 py-2.5 bg-[#FFF0E8] text-[#8A7A72] rounded-xl text-sm font-medium hover:bg-[#FFE5DA] transition">Batal</button>
            <button type="submit" class="px-4 py-2.5 bg-[#D94A3D] text-white rounded-xl text-sm font-semibold hover:bg-[#C0392B] transition">{{ editing ? 'Simpan' : 'Tambah' }}</button>
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
const form = ref({ name: '', phone: '', specialties: '', bank_account: '', bank_number: '', bank_name: '', default_rate: 0 })
const copiedId = ref(null)
const portalLinkCopied = ref(false)

const portalUrl = computed(() => {
  return `${window.location.origin}/freelance-portal.html`
})

async function load() {
  loading.value = true
  try { const r = await fetch(`${API}/freelancers`, { credentials: 'include' }); const d = await r.json(); data.value = d.data || [] } catch {}
  loading.value = false
}
function openForm(item) {
  editing.value = item || null
  if (item) {
    const ba = item.bank_account || {}
    form.value = { name: item.name, phone: item.phone, specialties: Array.isArray(item.specialties) ? item.specialties.join(', ') : item.specialties || '', bank_account: ba.bank || '', bank_number: ba.number || '', bank_name: ba.name || '', default_rate: item.default_rate || 0 }
  } else {
    form.value = { name: '', phone: '', specialties: '', bank_account: '', bank_number: '', bank_name: '', default_rate: 0 }
  }
  showForm.value = true
}
async function simpan() {
  const payload = {
    name: form.value.name, phone: form.value.phone,
    specialties: form.value.specialties ? form.value.specialties.split(',').map(s => s.trim()) : [],
    bank_account: { bank: form.value.bank_account, number: form.value.bank_number, name: form.value.bank_name },
    default_rate: parseInt(form.value.default_rate || 0)
  }
  const url = editing.value ? `${API}/freelancers/${editing.value.id}` : `${API}/freelancers`
  const method = editing.value ? 'PUT' : 'POST'
  await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) })
  showForm.value = false; editing.value = null; await load()
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