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
            <td class="p-3 hidden lg:table-cell text-[#8A7A72]">{{ Array.isArray(item.specialties) ? item.specialties.join(', ') : item.specialties || '-' }}</td>
            <td class="p-3 hidden lg:table-cell text-[#8A7A72]">{{ item.bank_account?.bank || '-' }}</td>
            <td class="p-3">
              <span class="status-chip" :class="item.active ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-[#FFF5F0] text-[#C4B0A5]'">
                {{ item.active ? 'Aktif' : 'Nonaktif' }}
              </span>
            </td>
            <td class="p-3">
              <div class="flex gap-1">
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

    <!-- Form Modal -->
    <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.6); backdrop-filter: blur(6px);" @click.self="showForm=false">
      <div class="card w-full max-w-lg p-6 animate-pop">
        <h3 class="font-bold text-xl text-[#2D1B14] mb-5">{{ editing ? 'Edit FG' : 'Tambah FG' }}</h3>
        <form @submit.prevent="simpan" class="space-y-4">
          <div>
            <label class="block text-[11px] text-[#C4B0A5] mb-1.5">Nama *</label>
            <input v-model="form.name" required class="input-fancy">
          </div>
          <div>
            <label class="block text-[11px] text-[#C4B0A5] mb-1.5">WA *</label>
            <input v-model="form.phone" required type="tel" class="input-fancy">
          </div>
          <div>
            <label class="block text-[11px] text-[#C4B0A5] mb-1.5">Spesialisasi (pisah koma)</label>
            <input v-model="form.specialties" class="input-fancy" placeholder="wisuda, studio, prewisuda">
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
import { ref, onMounted } from 'vue'
const API = '/api/admin'
const data = ref([])
const loading = ref(true)
const showForm = ref(false)
const editing = ref(null)
const form = ref({ name: '', phone: '', specialties: '', bank_account: '', bank_number: '', bank_name: '' })

async function load() {
  loading.value = true
  try { const r = await fetch(`${API}/freelancers`, { credentials: 'include' }); const d = await r.json(); data.value = d.data || [] } catch {}
  loading.value = false
}
function openForm(item) {
  editing.value = item || null
  if (item) {
    const ba = item.bank_account || {}
    form.value = { name: item.name, phone: item.phone, specialties: Array.isArray(item.specialties) ? item.specialties.join(', ') : item.specialties || '', bank_account: ba.bank || '', bank_number: ba.number || '', bank_name: ba.name || '' }
  } else {
    form.value = { name: '', phone: '', specialties: '', bank_account: '', bank_number: '', bank_name: '' }
  }
  showForm.value = true
}
async function simpan() {
  const payload = {
    name: form.value.name, phone: form.value.phone,
    specialties: form.value.specialties ? form.value.specialties.split(',').map(s => s.trim()) : [],
    bank_account: { bank: form.value.bank_account, number: form.value.bank_number, name: form.value.bank_name }
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
onMounted(load)
</script>