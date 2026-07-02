<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="font-serif text-2xl font-bold text-white">Freelancers (FG)</h2>
      <button @click="openForm()" class="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition text-sm font-medium">+ Tambah FG</button>
    </div>

    <div v-if="loading" class="flex justify-center py-12"><div class="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div></div>
    <div v-else>
      <div class="bg-gray-800/30 border border-gray-700/50 rounded-xl overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-gray-400 border-b border-gray-700/50 text-left">
              <th class="p-3 font-medium">Nama</th>
              <th class="p-3 font-medium hidden md:table-cell">WA</th>
              <th class="p-3 font-medium hidden lg:table-cell">Spesialisasi</th>
              <th class="p-3 font-medium hidden lg:table-cell">Bank</th>
              <th class="p-3 font-medium">Status</th>
              <th class="p-3 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in data" :key="item.id" class="border-b border-gray-800/50 hover:bg-gray-800/20 text-gray-300">
              <td class="p-3 font-medium text-white">{{ item.name }}</td>
              <td class="p-3 hidden md:table-cell">{{ item.phone }}</td>
              <td class="p-3 hidden lg:table-cell">{{ Array.isArray(item.specialties) ? item.specialties.join(', ') : item.specialties || '-' }}</td>
              <td class="p-3 hidden lg:table-cell">{{ item.bank_account?.bank || '-' }}</td>
              <td class="p-3">
                <span class="px-2 py-0.5 rounded-full text-xs font-medium" :class="item.active ? 'bg-green-900/40 text-green-400' : 'bg-gray-700/40 text-gray-400'">
                  {{ item.active ? 'Aktif' : 'Nonaktif' }}
                </span>
              </td>
              <td class="p-3">
                <div class="flex gap-1">
                  <button @click="openForm(item)" class="px-2 py-1 bg-amber-600/20 text-amber-400 rounded text-xs hover:bg-amber-600/30">Edit</button>
                  <button @click="toggleActive(item)" class="px-2 py-1 rounded text-xs" :class="item.active ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30' : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'">
                    {{ item.active ? 'Nonaktifkan' : 'Aktifkan' }}
                  </button>
                  <button @click="hapus(item)" class="px-2 py-1 bg-red-700/30 text-red-400 rounded text-xs hover:bg-red-700/50">Hapus</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="data.length === 0 && !loading" class="text-center py-12 text-gray-500">Belum ada freelancer</div>
    </div>

    <!-- Form Modal -->
    <div v-if="showForm" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" @click.self="showForm=false">
      <div class="bg-gray-900 border border-gray-700/50 rounded-2xl p-6 w-full max-w-lg mx-4">
        <h3 class="font-serif text-xl font-bold text-white mb-4">{{ editing ? 'Edit FG' : 'Tambah FG' }}</h3>
        <form @submit.prevent="simpan" class="space-y-3">
          <div><label class="block text-sm text-gray-400 mb-1">Nama *</label><input v-model="form.name" required class="w-full bg-gray-800/60 border border-gray-700/50 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-amber-500/50"></div>
          <div><label class="block text-sm text-gray-400 mb-1">WA *</label><input v-model="form.phone" required class="w-full bg-gray-800/60 border border-gray-700/50 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-amber-500/50"></div>
          <div><label class="block text-sm text-gray-400 mb-1">Spesialisasi</label><input v-model="form.specialties" class="w-full bg-gray-800/60 border border-gray-700/50 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-amber-500/50"></div>
          <div class="grid grid-cols-3 gap-3">
            <div><label class="block text-sm text-gray-400 mb-1">Bank</label><input v-model="form.bank_account" class="w-full bg-gray-800/60 border border-gray-700/50 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-amber-500/50"></div>
            <div><label class="block text-sm text-gray-400 mb-1">No Rek</label><input v-model="form.bank_number" class="w-full bg-gray-800/60 border border-gray-700/50 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-amber-500/50"></div>
            <div><label class="block text-sm text-gray-400 mb-1">An. Rek</label><input v-model="form.bank_name" class="w-full bg-gray-800/60 border border-gray-700/50 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-amber-500/50"></div>
          </div>
          <div class="flex gap-3 justify-end pt-2">
            <button type="button" @click="showForm=false" class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition text-sm">Batal</button>
            <button type="submit" class="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition text-sm">{{ editing ? 'Simpan' : 'Tambah' }}</button>
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