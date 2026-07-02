<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="font-serif text-2xl font-bold text-white">Paket & Harga</h2>
      <button @click="openForm()" class="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition text-sm font-medium">+ Tambah Paket</button>
    </div>

    <!-- List -->
    <div v-if="loading" class="flex justify-center py-12"><div class="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div></div>
    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div v-for="item in data" :key="item.id" class="bg-gray-800/40 border border-gray-700/50 rounded-xl p-5">
        <div class="flex items-start justify-between">
          <div>
            <p class="font-serif text-lg font-semibold text-white">{{ item.name }}</p>
            <p class="text-amber-400 text-2xl font-bold mt-1">Rp {{ (item.price || 0).toLocaleString('id-ID') }}</p>
          </div>
          <div class="flex gap-1">
            <button @click="openForm(item)" class="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-amber-400 transition" title="Edit">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            </button>
            <button @click="hapus(item)" class="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-red-400 transition" title="Hapus">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </div>
        <p class="text-gray-400 text-sm mt-2">{{ item.description || '-' }}</p>
        <p v-if="item.includes" class="text-gray-500 text-xs mt-2">{{ item.includes }}</p>
        <div class="flex items-center gap-2 mt-3">
          <span :class="item.active ? 'bg-green-900/30 text-green-400' : 'bg-gray-700/30 text-gray-500'" class="text-xs px-2 py-0.5 rounded-full">{{ item.active ? 'Aktif' : 'Nonaktif' }}</span>
          <span v-if="item.duration_hours" class="text-xs text-gray-500">{{ item.duration_hours }} jam</span>
        </div>
      </div>
    </div>

    <!-- Modal Form -->
    <div v-if="showForm" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" @click.self="showForm=false">
      <div class="bg-gray-900 border border-gray-700/50 rounded-2xl p-6 w-full max-w-lg mx-4">
        <h3 class="font-serif text-xl font-bold text-white mb-4">{{ editing ? 'Edit Paket' : 'Tambah Paket' }}</h3>
        <form @submit.prevent="simpan" class="space-y-4">
          <div>
            <label class="block text-sm text-gray-400 mb-1">Nama Paket *</label>
            <input v-model="form.name" type="text" required class="w-full bg-gray-800/60 border border-gray-700/50 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-amber-500/50">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Harga *</label>
            <input v-model.number="form.price" type="number" required min="0" class="w-full bg-gray-800/60 border border-gray-700/50 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-amber-500/50">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Deskripsi</label>
            <textarea v-model="form.description" rows="2" class="w-full bg-gray-800/60 border border-gray-700/50 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-amber-500/50"></textarea>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm text-gray-400 mb-1">Durasi (jam)</label>
              <input v-model.number="form.duration_hours" type="number" min="0" class="w-full bg-gray-800/60 border border-gray-700/50 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-amber-500/50">
            </div>
            <div>
              <label class="block text-sm text-gray-400 mb-1">Urutan</label>
              <input v-model.number="form.sort_order" type="number" min="0" class="w-full bg-gray-800/60 border border-gray-700/50 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-amber-500/50">
            </div>
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Includes / Fitur (pisahkan koma)</label>
            <input v-model="form.includes" type="text" class="w-full bg-gray-800/60 border border-gray-700/50 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-amber-500/50">
          </div>
          <label class="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
            <input v-model="form.active" type="checkbox" class="rounded bg-gray-800 border-gray-600">
            Aktif
          </label>
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
const form = ref({ name: '', price: 0, description: '', includes: '', duration_hours: null, sort_order: 0, active: true })

async function load() {
  try {
    const r = await fetch(`${API}/packages`, { credentials: 'include' })
    const d = await r.json()
    data.value = d.data || []
  } catch {} finally { loading.value = false }
}
function openForm(item) {
  editing.value = item || null
  form.value = item ? { ...item, active: !!item.active } : { name: '', price: 0, description: '', includes: '', duration_hours: null, sort_order: 0, active: true }
  showForm.value = true
}
async function simpan() {
  const url = editing.value ? `${API}/packages/${editing.value.id}` : `${API}/packages`
  const method = editing.value ? 'PUT' : 'POST'
  await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(form.value) })
  showForm.value = false; editing.value = null; loading.value = true; await load()
}
async function hapus(item) {
  if (!confirm(`Hapus paket "${item.name}"?`)) return
  await fetch(`${API}/packages/${item.id}`, { method: 'DELETE', credentials: 'include' })
  await load()
}
onMounted(load)
</script>