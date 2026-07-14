<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-xl font-bold text-[#2D1B14]">Paket & Harga</h2>
      <button @click="openForm()" class="px-4 py-2 bg-[#D94A3D] hover:bg-[#C0392B] text-white rounded-xl transition text-sm font-medium">+ Tambah Paket</button>
    </div>

    <div v-if="loading" class="flex justify-center py-12"><div class="loading-spinner"></div></div>

    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div v-for="item in data" :key="item.id" class="card p-5 hover:shadow-md transition">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-lg font-semibold text-[#2D1B14]">{{ item.name }}</p>
            <p class="text-2xl font-bold text-[#D94A3D] mt-1">Rp {{ (item.price || 0).toLocaleString('id-ID') }}</p>
          </div>
          <div class="flex gap-1">
            <button @click="openForm(item)" class="p-1.5 hover:bg-[#FFF0E8] rounded-lg text-[#8A7A72] hover:text-[#D94A3D] transition" title="Edit">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            </button>
            <button @click="hapus(item)" class="p-1.5 hover:bg-[#FEF2F2] rounded-lg text-[#8A7A72] hover:text-[#EF4444] transition" title="Hapus">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </div>
        <p class="text-[#8A7A72] text-sm mt-2">{{ item.description || '-' }}</p>
        <p v-if="item.includes" class="text-[#C4B0A5] text-xs mt-2">{{ item.includes }}</p>
        <div class="flex items-center gap-2 mt-3">
          <span class="status-chip" :class="item.active ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-[#FFF5F0] text-[#C4B0A5]'">{{ item.active ? 'Aktif' : 'Nonaktif' }}</span>
          <span v-if="item.duration_hours" class="text-xs text-[#C4B0A5]">{{ item.duration_hours }} jam</span>
        </div>
      </div>
    </div>

    <!-- Modal Form -->
    <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.6); backdrop-filter: blur(6px);" @click.self="showForm=false">
      <div class="card w-full max-w-lg p-6 animate-pop">
        <h3 class="font-bold text-xl text-[#2D1B14] mb-4">{{ editing ? 'Edit Paket' : 'Tambah Paket' }}</h3>
        <form @submit.prevent="simpan" class="space-y-4">
          <div>
            <label class="block text-[11px] text-[#C4B0A5] mb-1.5">Nama Paket *</label>
            <input v-model="form.name" type="text" required class="input-fancy">
          </div>
          <div>
            <label class="block text-[11px] text-[#C4B0A5] mb-1.5">Harga *</label>
            <input v-model.number="form.price" type="number" required min="0" class="input-fancy">
          </div>
          <div>
            <label class="block text-[11px] text-[#C4B0A5] mb-1.5">Deskripsi</label>
            <textarea v-model="form.description" rows="2" class="input-fancy resize-none"></textarea>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-[11px] text-[#C4B0A5] mb-1.5">Durasi (jam)</label>
              <input v-model.number="form.duration_hours" type="number" min="0" class="input-fancy">
            </div>
            <div>
              <label class="block text-[11px] text-[#C4B0A5] mb-1.5">Urutan</label>
              <input v-model.number="form.sort_order" type="number" min="0" class="input-fancy">
            </div>
          </div>
          <div>
            <label class="block text-[11px] text-[#C4B0A5] mb-1.5">Includes / Fitur (pisahkan koma)</label>
            <input v-model="form.includes" type="text" class="input-fancy">
          </div>
          <label class="flex items-center gap-2 text-sm text-[#8A7A72] cursor-pointer">
            <input v-model="form.active" type="checkbox" class="w-4 h-4 rounded border-[#E8D5C8] text-[#D94A3D] focus:ring-[#F4A261]">
            Aktif
          </label>
          <div class="flex gap-3 justify-end pt-2">
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
const form = ref({ name: '', price: 0, description: '', includes: '', duration_hours: null, sort_order: 0, active: true })

async function load() {
  try { const r = await fetch(`${API}/packages`, { credentials: 'include' }); const d = await r.json(); data.value = d.data || [] } catch {}
  loading.value = false
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