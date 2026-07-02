<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="font-serif text-2xl font-bold text-white">Portfolio</h2>
      <button @click="openAddModal" class="px-3 py-1.5 bg-amber-600/20 text-amber-400 border border-amber-600/40 rounded-lg text-sm hover:bg-amber-600/30 transition">+ Tambah</button>
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 mb-4">
      <button @click="tab='all'" class="px-3 py-1 rounded-full text-xs" :class="tab==='all'?'bg-amber-600/20 text-amber-400':'bg-gray-800/30 text-gray-500 hover:text-gray-300'">Semua ({{ total }})</button>
      <button @click="tab='published'" class="px-3 py-1 rounded-full text-xs" :class="tab==='published'?'bg-amber-600/20 text-amber-400':'bg-gray-800/30 text-gray-500 hover:text-gray-300'">Published</button>
      <button @click="tab='draft'" class="px-3 py-1 rounded-full text-xs" :class="tab==='draft'?'bg-amber-600/20 text-amber-400':'bg-gray-800/30 text-gray-500 hover:text-gray-300'">Draft</button>
    </div>

    <div v-if="loading" class="flex justify-center py-12"><div class="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div></div>

    <div v-else-if="data.length === 0" class="text-center py-12 text-gray-500 border border-dashed border-gray-700/50 rounded-xl">
      Belum ada portfolio. Klik "Tambah" untuk mulai.
    </div>

    <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <div v-for="item in data" :key="item.id" class="bg-gray-800/40 border border-gray-700/50 rounded-xl overflow-hidden group">
        <div class="aspect-[4/3] bg-gray-800 relative overflow-hidden">
          <img :src="item.cover_photo_url" class="w-full h-full object-cover group-hover:scale-105 transition" v-if="item.cover_photo_url">
          <div v-else class="flex items-center justify-center h-full text-gray-600 text-sm">No photo</div>
          <div class="absolute top-2 left-2 flex gap-1">
            <span v-if="item.published" class="px-1.5 py-0.5 bg-green-600/80 text-white text-[10px] rounded">Published</span>
            <span v-if="item.featured" class="px-1.5 py-0.5 bg-amber-600/80 text-white text-[10px] rounded">Featured</span>
          </div>
          <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
            <button @click="editItem(item)" class="px-2 py-1 bg-blue-600/80 text-white text-xs rounded hover:bg-blue-500">Edit</button>
            <button @click="togglePublish(item)" class="px-2 py-1 text-xs rounded" :class="item.published ? 'bg-yellow-600/80 text-white hover:bg-yellow-500' : 'bg-green-600/80 text-white hover:bg-green-500'">{{ item.published ? 'Unpublish' : 'Publish' }}</button>
          </div>
        </div>
        <div class="p-3 flex items-center justify-between">
          <div>
            <p class="font-medium text-white text-sm">{{ item.client_initial }}</p>
            <p class="text-xs text-gray-500">{{ item.graduation_year }} • {{ item.university }}</p>
          </div>
          <button @click="deleteItem(item)" class="text-red-500/50 hover:text-red-400 text-xs">Hapus</button>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showAdd" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" @click.self="showAdd=false">
      <div class="bg-gray-900 border border-gray-700/50 rounded-2xl p-6 w-full max-w-lg mx-4">
        <h3 class="font-serif text-xl font-bold text-white mb-4">{{ editId ? 'Edit' : 'Tambah' }} Portfolio</h3>
        <form @submit.prevent="submitAdd" class="space-y-4">
          <div>
            <label class="block text-sm text-gray-400 mb-1">Booking (completed)</label>
            <select v-model="addForm.booking_id" class="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">-- Pilih booking --</option>
              <option v-for="b in completedBookings" :key="b.id" :value="b.id">{{ b.client_name }} — #{{ b.id }}</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-gray-400 mb-1">Inisial *</label>
              <input v-model="addForm.client_initial" class="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="A.S.">
            </div>
            <div>
              <label class="block text-sm text-gray-400 mb-1">Tahun *</label>
              <input v-model.number="addForm.graduation_year" type="number" class="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="2026">
            </div>
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Universitas *</label>
            <input v-model="addForm.university" class="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Unhas">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Cover Foto *</label>
            <input type="file" accept="image/*" @change="onCoverChange" ref="coverInput"
              class="w-full text-gray-300 text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-amber-600/20 file:text-amber-400 hover:file:bg-amber-600/30">
            <img v-if="coverPreview" :src="coverPreview" class="mt-2 w-32 h-24 object-cover rounded-lg">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Foto Highlight (max 10, 5MB each)</label>
            <input type="file" accept="image/*" multiple @change="onHighlightChange" ref="highlightInput"
              class="w-full text-gray-300 text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-amber-600/20 file:text-amber-400 hover:file:bg-amber-600/30">
            <div v-if="highlightPreview.length" class="mt-2 flex gap-2 flex-wrap">
              <img v-for="(img, i) in highlightPreview" :key="i" :src="img" class="w-16 h-12 object-cover rounded border border-gray-700">
            </div>
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">FG Name (credit)</label>
            <input v-model="addForm.fg_name" class="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Budi Santoso">
          </div>
          <div class="flex gap-3">
            <label class="flex items-center gap-2 text-sm text-gray-300">
              <input v-model="addForm.published" type="checkbox" class="rounded bg-gray-800 border-gray-600"> Publikasikan
            </label>
            <label class="flex items-center gap-2 text-sm text-gray-300">
              <input v-model="addForm.featured" type="checkbox" class="rounded bg-gray-800 border-gray-600"> Featured
            </label>
          </div>
          <div v-if="uploading" class="text-amber-400 text-sm">Uploading...</div>
          <div class="flex gap-2 justify-end pt-2">
            <button type="button" @click="showAdd=false" class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition text-sm">Batal</button>
            <button type="submit" :disabled="!addForm.client_initial || !files.cover || uploading" class="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition text-sm disabled:opacity-50">{{ editId ? 'Update' : 'Simpan' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
const API = '/api/admin'
const data = ref([])
const total = ref(0)
const loading = ref(true)
const tab = ref('all')
const showAdd = ref(false)
const completedBookings = ref([])
const editId = ref(null)
const coverPreview = ref('')
const highlightPreview = ref([])
const uploading = ref(false)

const files = ref({ cover: null, highlights: [] })

const addForm = ref({
  booking_id: '',
  client_initial: '',
  graduation_year: new Date().getFullYear(),
  university: '',
  fg_name: '',
  published: false,
  featured: false
})

const coverInput = ref(null)
const highlightInput = ref(null)

function onCoverChange(e) {
  const f = e.target.files[0]
  if (!f) return
  files.value.cover = f
  coverPreview.value = URL.createObjectURL(f)
}

function onHighlightChange(e) {
  const fl = Array.from(e.target.files || [])
  files.value.highlights = fl.slice(0, 10)
  highlightPreview.value = fl.slice(0, 10).map(f => URL.createObjectURL(f))
}

async function load() {
  loading.value = true
  try {
    let url = `${API}/portfolio?limit=100`
    if (tab.value === 'published') url += '&published=true'
    else if (tab.value === 'draft') url += '&published=false'
    const r = await fetch(url, { credentials: 'include' })
    const result = await r.json()
    data.value = result.data || []
    total.value = result.total || 0
  } catch {}
  loading.value = false
}

watch(tab, load)

async function openAddModal() {
  editId.value = null
  files.value = { cover: null, highlights: [] }
  coverPreview.value = ''
  highlightPreview.value = []
  addForm.value = { booking_id: '', client_initial: '', graduation_year: new Date().getFullYear(), university: '', fg_name: '', published: false, featured: false }
  try {
    const r = await fetch(`${API}/bookings?status=completed&limit=50`, { credentials: 'include' })
    const result = await r.json()
    completedBookings.value = result.data || []
  } catch {}
  showAdd.value = true
}

async function uploadFile(file) {
  const formData = new FormData()
  formData.append('file', file)
  const r = await fetch(`${API}/portfolio/upload`, { method: 'POST', credentials: 'include', body: formData })
  const d = await r.json()
  if (!r.ok) throw new Error(d.error || 'Upload gagal')
  return d.url
}

async function submitAdd() {
  if (!files.value.cover) { alert('Pilih cover foto dulu'); return }
  uploading.value = true
  try {
    const coverUrl = await uploadFile(files.value.cover)
    const highlightUrls = []
    for (const f of (files.value.highlights || [])) {
      const url = await uploadFile(f)
      highlightUrls.push(url)
    }

    const body = {
      booking_id: addForm.value.booking_id || null,
      client_initial: addForm.value.client_initial,
      graduation_year: addForm.value.graduation_year,
      university: addForm.value.university,
      cover_photo_url: coverUrl,
      highlight_photos: JSON.stringify(highlightUrls),
      fg_name: addForm.value.fg_name || null,
      published: addForm.value.published ? 1 : 0,
      featured: addForm.value.featured ? 1 : 0
    }

    let url = `${API}/portfolio/from-booking`
    let method = 'POST'
    if (editId.value) { url = `${API}/portfolio/${editId.value}`; method = 'PATCH' }

    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) })
    if (!r.ok) { const e = await r.json(); alert(e.error || 'Gagal'); return }
    showAdd.value = false
    await load()
  } catch (e) { alert('Error: ' + e.message) }
  finally { uploading.value = false }
}

async function togglePublish(item) {
  const newPub = item.published ? 0 : 1
  try {
    const r = await fetch(`${API}/portfolio/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ published: newPub }) })
    if (!r.ok) { const e = await r.json(); alert(e.error || 'Gagal'); return }
    await load()
  } catch (e) { alert('Error: ' + e.message) }
}

async function editItem(item) {
  editId.value = item.id
  files.value = { cover: null, highlights: [] }
  coverPreview.value = item.cover_photo_url || ''
  highlightPreview.value = (item.highlight_photos || []).slice(0, 10)
  addForm.value = {
    booking_id: item.booking_id || '',
    client_initial: item.client_initial,
    graduation_year: item.graduation_year,
    university: item.university || '',
    fg_name: item.fg_name || '',
    published: !!item.published,
    featured: !!item.featured
  }
  try {
    const r = await fetch(`${API}/bookings?status=completed&limit=50`, { credentials: 'include' })
    const result = await r.json()
    completedBookings.value = result.data || []
  } catch {}
  showAdd.value = true
}

async function deleteItem(item) {
  if (!confirm(`Hapus portfolio ${item.client_initial}?`)) return
  try {
    await fetch(`${API}/portfolio/${item.id}`, { method: 'DELETE', credentials: 'include' })
    await load()
  } catch {}
}

load()
</script>
