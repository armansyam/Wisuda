<template>
  <div>
    <div class="flex items-center justify-between mb-5">
      <h2 class="text-xl font-bold text-[#2D1B14] dark:text-slate-200">Portfolio</h2>
      <button @click="openAddModal" class="px-3.5 py-2 bg-[#1A1A2E] text-[#C59B63] rounded-xl text-xs font-semibold hover:bg-[#2A2A4E] transition shadow-md shadow-[#1A1A2E]/8 flex items-center gap-1.5">+ Tambah Portfolio</button>
    </div>

    <!-- Background Drive Import Banners -->
    <div v-for="job in activeImportJobs" :key="job.id" class="mb-4 p-4 rounded-2xl border transition-all animate-fade-up shadow-md flex items-center justify-between bg-[#FAF6F0] dark:bg-[#1A1F2C] text-[#2D1B14] dark:text-slate-200"
      :class="job.status === 'pending' || job.status === 'processing' ? 'border-[#C59B63]/40' : (job.status === 'completed' ? 'border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-500/5 text-emerald-700 dark:text-emerald-300' : 'border-rose-500/40 bg-rose-500/5 dark:bg-rose-500/5 text-rose-700 dark:text-rose-300')">
      <div class="flex items-center gap-3 w-full">
        <div v-if="job.status === 'pending' || job.status === 'processing'" class="w-5 h-5 border-2 border-[#C59B63]/30 border-t-[#C59B63] rounded-full animate-spin shrink-0"></div>
        <span v-else class="text-lg shrink-0">{{ job.status === 'completed' ? '✅' : '⚠️' }}</span>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between mb-1">
            <p class="text-xs font-bold">{{ job.status === 'pending' ? 'Menunggu Antrean Impor GDrive...' : (job.status === 'processing' ? 'Sedang Mengimpor Google Drive' : (job.status === 'completed' ? 'Impor Google Drive Selesai' : 'Gagal Impor Drive')) }}</p>
            <span v-if="job.status === 'processing' && job.total_photos > 0" class="text-[10px] font-mono font-bold">{{ Math.round((job.processed_photos / job.total_photos) * 100) }}%</span>
          </div>
          <p class="text-xs opacity-90 truncate">{{ job.client_initial }} ({{ job.university }}) · {{ job.status === 'processing' ? `${job.processed_photos} dari ${job.total_photos} foto` : (job.status === 'completed' ? `Berhasil mengimpor ${job.total_photos} foto` : (job.status === 'failed' ? `Error: ${job.error_message}` : 'Menyiapkan file...')) }}</p>
          <div v-if="job.status === 'processing' && job.total_photos > 0" class="w-full bg-black/10 dark:bg-white/10 rounded-full h-1.5 mt-1.5 overflow-hidden">
            <div class="bg-[#C59B63] h-1.5 rounded-full transition-all duration-300" :style="{ width: `${(job.processed_photos / job.total_photos) * 100}%` }"></div>
          </div>
        </div>
      </div>
      <button v-if="job.status === 'completed' || job.status === 'failed'" @click="dismissJob(job.id)" class="text-xs px-2.5 py-1 rounded-lg bg-black/5 hover:bg-black/10 transition font-medium ml-4 shrink-0 dark:text-slate-400 dark:hover:text-slate-200">Tutup</button>
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 mb-4">
      <button @click="tab='all'" class="px-3 py-1 rounded-full text-xs font-medium" :class="tab==='all' ? 'bg-[#FDECEA] text-[#D94A3D] dark:bg-amber-950/40 dark:text-amber-400' : 'bg-[#FFF0E8] text-[#8A7A72] dark:bg-slate-900 dark:text-slate-400 hover:bg-[#FFE5DA]'">Semua ({{ total }})</button>
      <button @click="tab='published'" class="px-3 py-1 rounded-full text-xs font-medium" :class="tab==='published' ? 'bg-[#FDECEA] text-[#D94A3D] dark:bg-amber-950/40 dark:text-amber-400' : 'bg-[#FFF0E8] text-[#8A7A72] dark:bg-slate-900 dark:text-slate-400 hover:bg-[#FFE5DA]'">Published</button>
      <button @click="tab='draft'" class="px-3 py-1 rounded-full text-xs font-medium" :class="tab==='draft' ? 'bg-[#FDECEA] text-[#D94A3D] dark:bg-amber-950/40 dark:text-amber-400' : 'bg-[#FFF0E8] text-[#8A7A72] dark:bg-slate-900 dark:text-slate-400 hover:bg-[#FFE5DA]'">Draft</button>
    </div>

    <div v-if="loading" class="flex justify-center py-12"><div class="loading-spinner"></div></div>

    <div v-else-if="data.length === 0" class="text-center py-12 text-[#C4B0A5] dark:text-slate-500 border border-dashed border-[#E8D5C8] dark:border-slate-800 rounded-xl">Belum ada portfolio. Klik "+ Tambah Portfolio" untuk mulai.</div>

    <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <!-- Active Drive Import Progress Card in Grid -->
      <div v-for="job in activeImportJobs.filter(j => j.status === 'pending' || j.status === 'processing')" :key="'grid-' + job.id" class="card overflow-hidden dark:bg-slate-900 border-2 border-dashed border-[#C59B63]/60 shadow-lg">
        <div class="aspect-[4/3] bg-[#FAF6F0] dark:bg-amber-950/40 relative flex flex-col items-center justify-center p-4 text-center">
          <div class="w-8 h-8 border-3 border-[#C59B63]/30 border-t-[#C59B63] rounded-full animate-spin mb-3"></div>
          <p class="font-bold text-sm text-[#2D1B14] dark:text-slate-200">{{ job.client_initial }}</p>
          <p class="text-xs text-[#8A7A72] dark:text-slate-400 mt-0.5">{{ job.university }}</p>
        </div>
        <div class="p-3 bg-[#FAF9F6] dark:bg-slate-950 text-center border-t border-[#E5E0D8]/60 dark:border-slate-800 flex flex-col gap-2">
          <span class="text-[10px] font-semibold text-[#C59B63]">
            ⏳ {{ job.status === 'pending' ? 'Menunggu antrean...' : `Mengunduh (${job.processed_photos}/${job.total_photos})` }}
          </span>
          <div v-if="job.status === 'processing' && job.total_photos > 0" class="w-full bg-black/10 dark:bg-white/10 rounded-full h-1 overflow-hidden">
            <div class="bg-[#C59B63] h-1 rounded-full transition-all duration-300" :style="{ width: `${(job.processed_photos / job.total_photos) * 100}%` }"></div>
          </div>
        </div>
      </div>

      <div v-for="item in data" :key="item.id" class="card overflow-hidden group dark:bg-slate-900 dark:border-slate-800">
        <div class="aspect-[4/3] bg-[#FFF0E8] dark:bg-slate-950 relative overflow-hidden">
          <img :src="item.cover_photo_url" class="w-full h-full object-cover group-hover:scale-105 transition" v-if="item.cover_photo_url">
          <div v-else class="flex items-center justify-center h-full text-[#C4B0A5] text-sm">No photo</div>
          <div class="absolute top-2 left-2 flex gap-1">
            <span v-if="item.published" class="status-chip bg-[#E8F5E9] text-[#2E7D32] dark:bg-emerald-950/60 dark:text-emerald-400">Published</span>
            <span v-if="item.featured" class="status-chip bg-[#FFF0E8] text-[#F4A261] dark:bg-amber-950/60 dark:text-amber-400">Featured</span>
          </div>
          <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
            <button @click="editItem(item)" class="px-2.5 py-1 bg-white/90 text-[#2D1B14] text-xs rounded-lg hover:bg-white transition font-medium">Edit</button>
            <button @click="togglePublish(item)" class="px-2.5 py-1 text-xs rounded-lg font-medium transition" :class="item.published ? 'bg-white/90 text-[#D94A3D] hover:bg-white' : 'bg-white/90 text-[#2E7D32] hover:bg-white'">{{ item.published ? 'Unpublish' : 'Publish' }}</button>
          </div>
        </div>
        <div class="p-3 flex items-center justify-between">
          <div>
            <p class="font-semibold text-sm text-[#2D1B14] dark:text-slate-200">{{ item.client_initial }}</p>
            <p class="text-xs text-[#8A7A72] dark:text-slate-400">{{ item.graduation_year }} • {{ item.university }}</p>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-[#8A7A72] dark:text-slate-400 font-medium">{{ getPhotoCount(item) }}</span>
            <button @click="deleteItem(item)" class="text-[#EF4444] hover:text-[#C0392B] text-xs font-medium">Hapus</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showAdd" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(17,30,54,0.6); backdrop-filter: blur(6px);" @click.self="showAdd=false">
      <div class="card w-full max-w-lg p-6 animate-pop max-h-[90vh] overflow-y-auto dark:bg-slate-900 dark:border-slate-800">
        <h3 class="font-bold text-xl text-[#2D1B14] dark:text-slate-100 mb-4">{{ editId ? 'Edit' : 'Tambah' }} Portfolio</h3>

        <form @submit.prevent="submitAdd" class="space-y-4">
          <div v-if="!editId && completedBookings.length">
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">PILIH DARI BOOKING COMPLETED (OPSIONAL)</label>
            <select v-model="addForm.booking_id" @change="onBookingSelect" class="input-fancy !text-xs dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
              <option value="">-- Pilih Booking --</option>
              <option v-for="b in completedBookings" :key="b.id" :value="b.id">{{ b.client_name }} — {{ b.university }} (#{{ b.id }})</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">INISIAL CLIENT *</label>
              <input v-model="addForm.client_initial" class="input-fancy dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="Contoh: R.A.">
            </div>
            <div>
              <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">TAHUN WISUDA *</label>
              <input v-model.number="addForm.graduation_year" type="number" class="input-fancy dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" :placeholder="new Date().getFullYear()">
            </div>
          </div>

          <div>
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">UNIVERSITAS / INSTITUT *</label>
            <input v-model="addForm.university" class="input-fancy dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="Universitas Hasanuddin">
          </div>

          <!-- FOR NEW PORTFOLIO: Drive Link OR Manual Upload Tabs -->
          <template v-if="!editId">
            <div class="flex gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl mb-3">
              <button type="button" @click="inputMethod = 'drive'" class="flex-1 py-1.5 rounded-lg text-xs font-semibold transition"
                :class="inputMethod === 'drive' ? 'bg-white dark:bg-slate-800 text-[#1A1A2E] dark:text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-700'">
                🔗 Impor via Drive Link
              </button>
              <button type="button" @click="inputMethod = 'upload'" class="flex-1 py-1.5 rounded-lg text-xs font-semibold transition"
                :class="inputMethod === 'upload' ? 'bg-white dark:bg-slate-800 text-[#1A1A2E] dark:text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-700'">
                🖼️ Upload File Manual
              </button>
            </div>

            <!-- Tab 1: Google Drive Link -->
            <div v-show="inputMethod === 'drive'" class="space-y-1.5 bg-[#FAF9F6] dark:bg-slate-950 p-3.5 rounded-xl border border-[#E5E0D8] dark:border-slate-800">
              <label class="block text-[10px] text-[#C59B63] mb-1 font-bold uppercase tracking-wider">LINK FOLDER GOOGLE DRIVE *</label>
              <input v-model="addForm.drive_url" class="input-fancy dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200" placeholder="https://drive.google.com/drive/folders/...">
              <p class="text-[10px] text-[#8A7A72] dark:text-slate-400 font-light leading-relaxed">
                💡 Pastikan link folder di-share sebagai <em>"Anyone with the link can view"</em>. Sistem akan otomatis mengunduh gambar dan mengompresnya dengan Sharp secara tajam.
              </p>
            </div>

            <!-- Tab 2: Manual File Upload -->
            <div v-show="inputMethod === 'upload'" class="space-y-4 bg-[#FAF9F6] dark:bg-slate-950 p-3.5 rounded-xl border border-[#E5E0D8] dark:border-slate-800">
              <div>
                <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1 font-bold">COVER FOTO *</label>
                <input type="file" accept="image/*" @change="onCoverChange" class="input-fancy !p-2 !text-xs cursor-pointer dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
                <div v-if="coverPreview" class="mt-2 w-32 h-24 rounded-lg overflow-hidden border-2 border-[#C59B63] bg-black/10">
                  <img :src="coverPreview" class="w-full h-full object-cover">
                </div>
              </div>
              <div>
                <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1 font-bold">FOTO HIGHLIGHT (OPSIONAL)</label>
                <input type="file" accept="image/*" multiple @change="onHighlightChange" class="input-fancy cursor-pointer dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
                <div v-if="highlightPreview.length" class="grid grid-cols-4 gap-2 mt-2">
                  <div v-for="(img, i) in highlightPreview" :key="i" class="aspect-[4/3] rounded-lg overflow-hidden border border-[#E5E0D8]">
                    <img :src="img" class="w-full h-full object-cover">
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- FOR EDITING PORTFOLIO: Option to choose existing cover OR import from Drive / upload -->
          <template v-else>
            <!-- Tab Switcher inside Edit Modal -->
            <div class="flex gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl mb-3">
              <button type="button" @click="editTab = 'manage'" class="flex-1 py-1.5 rounded-lg text-xs font-semibold transition"
                :class="editTab === 'manage' ? 'bg-white dark:bg-slate-800 text-[#1A1A2E] dark:text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-700'">
                🖼️ Kelola Cover & Foto
              </button>
              <button type="button" @click="editTab = 'drive'" class="flex-1 py-1.5 rounded-lg text-xs font-semibold transition"
                :class="editTab === 'drive' ? 'bg-white dark:bg-slate-800 text-[#1A1A2E] dark:text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-700'">
                🔗 Impor Ulang via Drive API
              </button>
            </div>

            <!-- Tab 1: Manage Existing Photos & Set Cover -->
            <div v-show="editTab === 'manage'" class="space-y-4">
              <!-- COVER PHOTO SECTION -->
              <div class="bg-[#FFF8F3] dark:bg-slate-950 p-3.5 rounded-xl border border-[#E8D5C8]/80 dark:border-slate-800">
                <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold uppercase tracking-wider">COVER FOTO AKTIF</label>
                <div class="flex items-center gap-3">
                  <div class="relative w-32 h-24 rounded-lg overflow-hidden border-2 border-[#C59B63] bg-black/10 flex-shrink-0">
                    <img v-if="coverPreview" :src="coverPreview" class="w-full h-full object-cover">
                    <span class="absolute top-1 left-1 bg-[#C59B63] text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow">COVER</span>
                  </div>
                  <div>
                    <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1 font-bold">Ganti File Cover Baru (Upload)</label>
                    <input type="file" accept="image/*" @change="onCoverChange" class="input-fancy !p-2 !text-xs cursor-pointer dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
                    <p class="text-[10px] text-[#8A7A72] dark:text-slate-400 mt-1 font-light">
                      💡 Atau klik salah satu Foto Highlight di bawah untuk menjadikannya Cover Foto.
                    </p>
                  </div>
                </div>
              </div>

              <!-- HIGHLIGHT PHOTOS SECTION WITH SELECT COVER ACTION -->
              <div>
                <div class="flex justify-between items-center mb-1.5">
                  <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 font-bold uppercase tracking-wider">
                    FOTO HIGHLIGHT ({{ highlightPreview.length }}) & PILIH COVER
                  </label>
                  <span class="text-[10px] text-[#C59B63] font-semibold">Klik foto untuk set sebagai Cover</span>
                </div>
                <input type="file" accept="image/*" multiple @change="onHighlightChange" class="input-fancy cursor-pointer dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 mb-2">
                
                <div v-if="highlightPreview.length" class="grid grid-cols-4 gap-2 mt-2">
                  <div v-for="(img, i) in highlightPreview" :key="i"
                       @click="setAsCover(img)"
                       class="relative group aspect-[4/3] rounded-lg overflow-hidden border-2 cursor-pointer transition-all hover:scale-105"
                       :class="coverPreview === img ? 'border-[#C59B63] ring-2 ring-[#C59B63]/40' : 'border-[#E5E0D8] hover:border-[#C59B63]/60'">
                    <img :src="img" class="w-full h-full object-cover">
                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center pointer-events-none">
                      <span class="text-[9px] font-bold text-white bg-[#C59B63] px-2 py-1 rounded-md shadow">
                        {{ coverPreview === img ? '⭐️ Cover Saat Ini' : 'Set Cover' }}
                      </span>
                    </div>
                    <div v-if="coverPreview === img" class="absolute top-1 right-1 bg-[#C59B63] text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] shadow pointer-events-none">
                      ✓
                    </div>
                    <!-- DELETE PHOTO BUTTON (X) -->
                    <button type="button" @click.stop="removeHighlightPhoto(i)" 
                            title="Hapus foto ini"
                            class="absolute top-1 left-1 bg-red-500/90 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow transition opacity-80 group-hover:opacity-100 z-10">
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tab 2: Re-Import via Google Drive (Drive API + Sharp) -->
            <div v-show="editTab === 'drive'" class="space-y-2 bg-[#FAF9F6] dark:bg-slate-950 p-4 rounded-xl border border-[#E5E0D8] dark:border-slate-800">
              <label class="block text-[10px] text-[#C59B63] font-bold uppercase tracking-wider">LINK FOLDER GOOGLE DRIVE BARU *</label>
              <input v-model="addForm.drive_url" class="input-fancy dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200" placeholder="https://drive.google.com/drive/folders/...">
              <p class="text-[10px] text-[#8A7A72] dark:text-slate-400 font-light leading-relaxed">
                🚀 Link folder Drive baru ini akan di-scan via Google Drive API. Foto akan otomatis diunduh, dikompres secara tajam dengan Sharp (`1200px` width JPEG quality 85), dan menggantikan foto portfolio ini.
              </p>
            </div>
          </template>

          <div>
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">FOTOGRAFER (CREDIT)</label>
            <input v-model="addForm.fg_name" class="input-fancy dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="Nama Fotografer">
          </div>

          <div class="flex gap-4 pt-1">
            <label class="flex items-center gap-2 text-xs text-[#8A7A72] dark:text-slate-300 cursor-pointer">
              <input v-model="addForm.published" type="checkbox" class="w-4 h-4 rounded border-[#E5E0D8] text-[#C59B63] focus:ring-[#C59B63]"> Publikasikan
            </label>
            <label class="flex items-center gap-2 text-xs text-[#8A7A72] dark:text-slate-300 cursor-pointer">
              <input v-model="addForm.featured" type="checkbox" class="w-4 h-4 rounded border-[#E5E0D8] text-[#C59B63] focus:ring-[#C59B63]"> Featured
            </label>
          </div>

          <div class="flex gap-2 justify-end pt-2">
            <button type="button" @click="showAdd=false" class="px-4 py-2.5 bg-[#FAF9F6] text-[#8A7A72] border border-[#E5E0D8] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition">Batal</button>
            <button type="submit" :disabled="isSubmitDisabled" class="px-5 py-2.5 bg-[#1A1A2E] text-[#C59B63] rounded-xl text-xs font-semibold disabled:opacity-40 hover:bg-[#2A2A4E] transition shadow-md">{{ editId ? 'Update' : 'Simpan Portfolio' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const API = '/api/admin'
const data = ref([])
const total = ref(0)
const loading = ref(true)
const tab = ref('all')
const showAdd = ref(false)
const completedBookings = ref([])
const editId = ref(null)
const inputMethod = ref('drive')
const editTab = ref('manage')
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
  drive_url: '',
  published: true,
  featured: false
})

const isSubmitDisabled = computed(() => {
  if (!addForm.value.client_initial || !addForm.value.university || uploading.value) return true
  if (!editId.value) {
    if (inputMethod.value === 'drive') return !addForm.value.drive_url
    if (inputMethod.value === 'upload') return !coverPreview.value && !files.value.cover
  } else if (editTab.value === 'drive') {
    return !addForm.value.drive_url
  }
  return false
})

function getPhotoCount(item) {
  if (!item) return 0
  if (Array.isArray(item.highlight_photos)) return item.highlight_photos.length
  if (typeof item.highlight_photos === 'string') {
    try {
      const arr = JSON.parse(item.highlight_photos)
      return Array.isArray(arr) ? arr.length : 1
    } catch { return 1 }
  }
  return 1
}

function setAsCover(imgUrl) {
  coverPreview.value = imgUrl
  files.value.cover = null
}

function removeHighlightPhoto(index) {
  if (highlightPreview.value.length <= 1) {
    alert('Portfolio harus memiliki minimal 1 foto highlight/cover.')
    return
  }
  const removedImg = highlightPreview.value[index]
  
  // Remove from highlightPreview array
  highlightPreview.value.splice(index, 1)

  // Remove from files.value.highlights if present
  if (files.value.highlights && files.value.highlights.length > index) {
    files.value.highlights.splice(index, 1)
  }

  // If removed image was active cover, reassign cover to first remaining image
  if (coverPreview.value === removedImg) {
    coverPreview.value = highlightPreview.value[0] || ''
    files.value.cover = null
  }
}

function onCoverChange(e) {
  const f = e.target.files[0]
  if (!f) return
  files.value.cover = f
  coverPreview.value = URL.createObjectURL(f)
}

function onHighlightChange(e) {
  const fl = Array.from(e.target.files || [])
  files.value.highlights = fl
  highlightPreview.value = fl.map(f => URL.createObjectURL(f))
}

function onBookingSelect() {
  if (!addForm.value.booking_id) return
  const b = completedBookings.value.find(item => item.id == addForm.value.booking_id)
  if (b) {
    addForm.value.client_initial = b.client_name ? b.client_name.split(' ').map(n => n[0]).join('.').toUpperCase() + '.' : ''
    addForm.value.university = b.university || ''
    if (b.graduation_date) {
      const year = new Date(b.graduation_date).getFullYear()
      if (!isNaN(year)) addForm.value.graduation_year = year
    }
  }
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
  inputMethod.value = 'drive'
  editTab.value = 'manage'
  files.value = { cover: null, highlights: [] }
  coverPreview.value = ''
  highlightPreview.value = []
  addForm.value = {
    booking_id: '',
    client_initial: '',
    graduation_year: new Date().getFullYear(),
    university: '',
    fg_name: '',
    drive_url: '',
    published: true,
    featured: false
  }
  try {
    const r = await fetch(`${API}/bookings?status=completed&limit=50`, { credentials: 'include' })
    const result = await r.json()
    completedBookings.value = result.data || []
  } catch {}
  showAdd.value = true
}

async function uploadFile(file, customFolder) {
  const formData = new FormData()
  formData.append('file', file)
  let url = `${API}/portfolio/upload`
  if (customFolder) {
    url += `?folder=${encodeURIComponent(customFolder)}`
  }
  const r = await fetch(url, { method: 'POST', credentials: 'include', body: formData })
  const d = await r.json()
  if (!r.ok) throw new Error(d.error || 'Upload gagal')
  return d.url
}

const activeImportJobs = ref([])
let pollingTimer = null

async function checkImportJobs() {
  try {
    const r = await fetch(`${API}/portfolio/import-jobs`, { credentials: 'include' })
    if (r.ok) {
      const jobs = await r.json()
      
      let shouldReload = false
      jobs.forEach(job => {
        const existing = activeImportJobs.value.find(j => j.id === job.id)
        if (job.status === 'completed' && (!existing || existing.status !== 'completed')) {
          shouldReload = true
        }
      })
      
      activeImportJobs.value = jobs
      
      const hasActive = jobs.some(j => j.status === 'pending' || j.status === 'processing')
      if (hasActive) {
        if (!pollingTimer) {
          pollingTimer = setTimeout(checkImportJobs, 3000)
        }
      } else {
        clearPolling()
      }
    }
  } catch (err) {
    console.error('Error polling import jobs:', err)
  }
}

function clearPolling() {
  if (pollingTimer) {
    clearTimeout(pollingTimer)
    pollingTimer = null
  }
}

async function dismissJob(jobId) {
  try {
    await fetch(`${API}/portfolio/import-jobs/${jobId}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    activeImportJobs.value = activeImportJobs.value.filter(j => j.id !== jobId)
  } catch (err) {
    console.error('Failed to delete import job:', err)
  }
}

onMounted(() => {
  checkImportJobs()
})

onUnmounted(() => {
  clearPolling()
})

async function submitAdd() {
  const isDriveImport = (!editId.value && inputMethod.value === 'drive') || (editId.value && editTab.value === 'drive')
  
  if (isDriveImport) {
    const body = {
      portfolio_id: editId.value || undefined,
      drive_url: addForm.value.drive_url,
      client_initial: addForm.value.client_initial,
      graduation_year: addForm.value.graduation_year,
      university: addForm.value.university,
      fg_name: addForm.value.fg_name || null,
      published: addForm.value.published,
      featured: addForm.value.featured
    }

    // CLOSE POPUP MODAL IMMEDIATELY!
    showAdd.value = false

    // Async non-blocking fetch execution
    fetch(`${API}/portfolio/import-drive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body)
    }).then(async r => {
      const d = await r.json()
      if (!r.ok) {
        alert(d.error || 'Gagal memulai impor Google Drive')
      } else {
        clearPolling()
        await checkImportJobs()
      }
    }).catch(err => {
      console.error(err)
      alert('Terjadi kesalahan jaringan saat memulai impor Google Drive')
    })
    return
  }

  const sanitizeFolder = (str) => (str || '').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()
  const targetFolder = `${sanitizeFolder(addForm.value.client_initial)}_${sanitizeFolder(addForm.value.university)}_${addForm.value.graduation_year || new Date().getFullYear()}`

  // Creating NEW Portfolio with manual upload
  if (!editId.value && inputMethod.value === 'upload') {
    uploading.value = true
    try {
      let coverUrl = ''
      if (files.value.cover) {
        coverUrl = await uploadFile(files.value.cover, targetFolder)
      } else if (coverPreview.value) {
        coverUrl = coverPreview.value
      } else {
        alert('File cover foto wajib diunggah')
        return
      }

      let highlightUrls = []
      if (files.value.highlights && files.value.highlights.length) {
        for (const f of files.value.highlights) {
          const url = await uploadFile(f, targetFolder)
          highlightUrls.push(url)
        }
      }
      if (highlightUrls.length === 0) {
        highlightUrls = [coverUrl]
      }

      const body = {
        booking_id: addForm.value.booking_id || null,
        client_initial: addForm.value.client_initial,
        graduation_year: addForm.value.graduation_year,
        university: addForm.value.university,
        cover_photo_url: coverUrl,
        highlight_photos: highlightUrls,
        fg_name: addForm.value.fg_name || null,
        published: addForm.value.published,
        featured: addForm.value.featured
      }

      const r = await fetch(`${API}/portfolio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      })
      if (!r.ok) { const e = await r.json(); alert(e.error || 'Gagal'); return }
      showAdd.value = false
      await load()
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      uploading.value = false
    }
    return
  }

  // Editing existing item logic (manual upload or selecting existing cover)
  uploading.value = true
  try {
    let coverUrl = coverPreview.value
    if (files.value.cover) {
      coverUrl = await uploadFile(files.value.cover, targetFolder)
    }

    let highlightUrls = highlightPreview.value
    if (files.value.highlights && files.value.highlights.length) {
      highlightUrls = []
      for (const f of files.value.highlights) {
        const url = await uploadFile(f, targetFolder)
        highlightUrls.push(url)
      }
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
    const r = await fetch(`${API}/portfolio/${editId.value}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body)
    })
    if (!r.ok) { const e = await r.json(); alert(e.error || 'Gagal'); return }
    showAdd.value = false
    await load()
  } catch (e) {
    alert('Error: ' + e.message)
  } finally {
    uploading.value = false
  }
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
  inputMethod.value = 'upload'
  editTab.value = 'manage'
  files.value = { cover: null, highlights: [] }
  coverPreview.value = item.cover_photo_url || ''
  highlightPreview.value = item.highlight_photos || []
  addForm.value = {
    booking_id: item.booking_id || '',
    client_initial: item.client_initial,
    graduation_year: item.graduation_year,
    university: item.university || '',
    fg_name: item.fg_name || '',
    drive_url: '',
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
  try { await fetch(`${API}/portfolio/${item.id}`, { method: 'DELETE', credentials: 'include' }); await load() } catch {}
}

load()
</script>