<template>
  <div>
    <div class="flex items-center justify-between mb-5">
      <h2 class="text-xl font-bold text-[#2D1B14] dark:text-slate-200">Paket & Harga</h2>
      <button @click="openForm(null)" class="px-3.5 py-2 bg-[#1A1A2E] text-[#C59B63] rounded-xl text-xs font-semibold hover:bg-[#2A2A4E] transition shadow-md flex items-center gap-1.5">+ Tambah Paket</button>
    </div>

    <div v-if="loading" class="flex justify-center py-12"><div class="loading-spinner"></div></div>

    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div v-for="item in data" :key="item.id" class="card p-5 dark:bg-slate-900 dark:border-slate-800 flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-lg text-[#2D1B14] dark:text-slate-100">{{ item.name }}</h3>
            <span class="font-bold text-[#D94A3D] dark:text-amber-400 text-lg">Rp {{ (item.price || 0).toLocaleString('id-ID') }}</span>
          </div>
          <p class="text-[#8A7A72] dark:text-slate-400 text-xs mt-2 leading-relaxed">{{ item.description || '-' }}</p>
          <p v-if="item.includes" class="text-[#C4B0A5] dark:text-slate-500 text-[11px] mt-2 font-mono">{{ item.includes }}</p>
          <div class="flex items-center gap-2 mt-3">
            <span class="status-chip" :class="item.active ? 'bg-[#E8F5E9] text-[#2E7D32] dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-[#FFF5F0] text-[#C4B0A5] dark:bg-slate-800 dark:text-slate-400'">{{ item.active ? 'Aktif' : 'Nonaktif' }}</span>
            <span v-if="item.duration_hours" class="text-xs text-[#C4B0A5] dark:text-slate-400 font-medium">{{ item.duration_hours }} jam</span>
            <span class="text-xs font-semibold text-purple-600 dark:text-purple-400">🎨 {{ item.max_selected_photos || 15 }} Foto Edit</span>
          </div>
        </div>
        <div class="flex gap-2 mt-5 pt-3 border-t border-[#E8D5C8]/40 dark:border-slate-800 justify-end">
          <button @click="openForm(item)" class="px-3 py-1.5 bg-[#FFF0E8] dark:bg-amber-950/40 text-[#D94A3D] dark:text-amber-400 rounded-lg text-xs font-semibold hover:bg-[#FFE5DA] transition">Edit</button>
          <button @click="hapus(item)" class="px-3 py-1.5 bg-[#FEF2F2] dark:bg-rose-950/40 text-[#EF4444] dark:text-rose-400 rounded-lg text-xs font-semibold hover:bg-[#FEE2E2] transition">Hapus</button>
        </div>
      </div>
    </div>

    <!-- Modal Form -->
    <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(17,30,54,0.6); backdrop-filter: blur(6px);" @click.self="showForm=false">
      <div class="card w-full max-w-lg p-6 animate-pop dark:bg-slate-900 dark:border-slate-800">
        <h3 class="font-bold text-xl text-[#2D1B14] dark:text-slate-100 mb-4">{{ editing ? 'Edit Paket' : 'Tambah Paket' }}</h3>
        <form @submit.prevent="simpan" class="space-y-4">
          <div>
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold uppercase tracking-wider">NAMA PAKET *</label>
            <input v-model="form.name" type="text" required class="input-fancy dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="Contoh: Paket Premium Studio">
          </div>
          <div>
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold uppercase tracking-wider">HARGA PAKET (RP) *</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8A7A72] dark:text-slate-400">Rp</span>
              <input v-model="priceDisplay" @input="onPriceInput" required type="text" placeholder="0" class="input-fancy !pl-9 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 font-bold text-amber-600 dark:text-amber-400">
            </div>
          </div>
          <div>
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold uppercase tracking-wider">DESKRIPSI</label>
            <textarea v-model="form.description" rows="2" class="input-fancy resize-none dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="Deskripsi singkat mengenai paket..."></textarea>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold uppercase tracking-wider">DURASI (JAM)</label>
              <input v-model.number="form.duration_hours" type="number" min="0" class="input-fancy dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="2">
            </div>
            <div>
              <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold uppercase tracking-wider">URUTAN TAMPILAN</label>
              <input v-model.number="form.sort_order" type="number" min="0" class="input-fancy dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="1">
            </div>
          </div>
          <div>
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold uppercase tracking-wider">KUOTA FOTO EDIT / SELEKSI KLIEN</label>
            <input v-model.number="form.max_selected_photos" type="number" min="1" class="input-fancy dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="15">
            <p class="text-[9px] text-slate-400 mt-1">Jumlah foto yang dapat dipilih oleh client untuk proses retouch editan akhir & highlight.</p>
          </div>
          <div>
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold uppercase tracking-wider">INCLUDES / FITUR (PISAHKAN KOMA)</label>
            <input v-model="form.includes" type="text" class="input-fancy dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="15 Foto Edit, Frame 10R, All Softcopy">
          </div>
          <label class="flex items-center gap-2 text-xs text-[#8A7A72] dark:text-slate-300 cursor-pointer">
            <input v-model="form.active" type="checkbox" class="w-4 h-4 rounded border-[#E5E0D8] text-[#C59B63] focus:ring-[#C59B63]">
            Aktifkan Paket
          </label>
          <div class="flex gap-3 justify-end pt-2">
            <button type="button" @click="showForm=false" class="px-4 py-2.5 bg-[#FAF9F6] text-[#8A7A72] border border-[#E5E0D8] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition">Batal</button>
            <button type="submit" class="px-5 py-2.5 bg-[#1A1A2E] text-[#C59B63] rounded-xl text-xs font-semibold hover:bg-[#2A2A4E] transition shadow-md">{{ editing ? 'Simpan' : 'Tambah Paket' }}</button>
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

const priceDisplay = ref('')
const form = ref({ name: '', price: 0, description: '', includes: '', duration_hours: null, sort_order: 0, active: true, max_selected_photos: 15, highlight_count: 5 })

function onPriceInput() {
  let raw = priceDisplay.value.replace(/[^0-9]/g, '')
  const num = parseInt(raw || '0', 10)
  form.value.price = num
  priceDisplay.value = num > 0 ? num.toLocaleString('id-ID') : ''
}

async function load() {
  loading.value = true
  try {
    const r = await fetch(`${API}/packages`, { credentials: 'include' })
    const d = await r.json()
    data.value = d.data || []
  } catch {}
  loading.value = false
}

function openForm(item) {
  editing.value = item || null
  if (item) {
    form.value = { ...item, active: !!item.active, max_selected_photos: item.max_selected_photos || 15, highlight_count: item.highlight_count || 5 }
    priceDisplay.value = (item.price || 0) > 0 ? item.price.toLocaleString('id-ID') : ''
  } else {
    form.value = { name: '', price: 0, description: '', includes: '', duration_hours: null, sort_order: 0, active: true, max_selected_photos: 15, highlight_count: 5 }
    priceDisplay.value = ''
  }
  showForm.value = true
}

async function simpan() {
  const url = editing.value ? `${API}/packages/${editing.value.id}` : `${API}/packages`
  const method = editing.value ? 'PUT' : 'POST'
  await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(form.value) })
  showForm.value = false
  editing.value = null
  loading.value = true
  await load()
}

async function hapus(item) {
  if (!confirm(`Hapus paket "${item.name}"?`)) return
  await fetch(`${API}/packages/${item.id}`, { method: 'DELETE', credentials: 'include' })
  await load()
}

onMounted(load)
</script>