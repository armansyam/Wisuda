<template>
  <div>
    <div class="flex items-center justify-between mb-5">
      <h2 class="text-xl font-bold text-[#2D1B14] dark:text-slate-200">Portfolio</h2>
      <button @click="openAddModal" class="px-3.5 py-2 bg-[#1A1A2E] text-[#C59B63] rounded-xl text-xs font-semibold hover:bg-[#2A2A4E] transition shadow-md shadow-[#1A1A2E]/8 flex items-center gap-1.5">+ Tambah Portfolio</button>
    </div>



    <!-- Tabs -->
    <div class="flex gap-2 mb-4">
      <button @click="tab='all'" class="px-3 py-1 rounded-full text-xs font-medium" :class="tab==='all' ? 'bg-[#FDECEA] text-[#D94A3D] dark:bg-amber-950/40 dark:text-amber-400' : 'bg-[#FFF0E8] text-[#8A7A72] dark:bg-slate-900 dark:text-slate-400 hover:bg-[#FFE5DA]'">Semua ({{ total }})</button>
      <button @click="tab='published'" class="px-3 py-1 rounded-full text-xs font-medium" :class="tab==='published' ? 'bg-[#FDECEA] text-[#D94A3D] dark:bg-amber-950/40 dark:text-amber-400' : 'bg-[#FFF0E8] text-[#8A7A72] dark:bg-slate-900 dark:text-slate-400 hover:bg-[#FFE5DA]'">Published</button>
      <button @click="tab='draft'" class="px-3 py-1 rounded-full text-xs font-medium" :class="tab==='draft' ? 'bg-[#FDECEA] text-[#D94A3D] dark:bg-amber-950/40 dark:text-amber-400' : 'bg-[#FFF0E8] text-[#8A7A72] dark:bg-slate-900 dark:text-slate-400 hover:bg-[#FFE5DA]'">Draft</button>
    </div>

    <div v-if="loading" class="flex justify-center py-12"><div class="loading-spinner"></div></div>

    <div v-else-if="data.length === 0" class="text-center py-12 text-[#C4B0A5] dark:text-slate-500 border border-dashed border-[#E8D5C8] dark:border-slate-800 rounded-xl">Belum ada portfolio. Klik "+ Tambah Portfolio" untuk mulai.</div>

    <TransitionGroup v-else name="card-pop" tag="div" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
      <div v-for="item in data" :key="item.id" class="card overflow-hidden group dark:bg-slate-900 dark:border-slate-800 transition-all flex flex-col justify-between">
        <div>
          <div class="aspect-[3/4] bg-[#FFF0E8] dark:bg-slate-950 relative overflow-hidden">
            <img :src="item.cover_photo_url" class="w-full h-full object-cover group-hover:scale-105 transition" v-if="item.cover_photo_url">
            <div v-else class="flex items-center justify-center h-full text-[#C4B0A5] text-sm">No photo</div>
            
            <!-- Top-Left Badges (Status & Consent) -->
            <div class="absolute top-2 left-2 flex flex-wrap gap-1 max-w-[80%] z-10">
              <span v-if="isNewlyAdded(item)" class="status-chip bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold animate-pulse shadow-sm">✨ NEW</span>
              <span v-if="item.published" class="status-chip bg-[#E8F5E9] text-[#2E7D32] dark:bg-emerald-950/60 dark:text-emerald-400 font-bold">Published</span>
              <span v-else class="status-chip bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">Draft</span>
              <span v-if="item.portfolio_consent === 'approved'" class="status-chip bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 font-semibold" title="Klien mengizinkan foto tampil di portofolio">✓ Izin Klien</span>
              <span v-else-if="item.portfolio_consent === 'declined'" class="status-chip bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 font-semibold" title="Klien meminta foto disimpan privat">✕ Privat</span>
              <span v-if="item.featured" class="status-chip bg-[#FFF0E8] text-[#F4A261] dark:bg-amber-950/60 dark:text-amber-400">Featured</span>
            </div>

            <!-- Top-Right Star Rating Badge -->
            <div v-if="item.rating && item.rating > 0" class="absolute top-2 right-2 z-10 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/20 shadow-md">
              <span class="text-amber-400 text-xs">★</span>
              <span class="text-white text-[10px] font-bold">{{ parseFloat(item.rating).toFixed(1) }}</span>
            </div>

            <!-- Hover Action Overlay -->
            <div class="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2 z-20">
              <button @click="editItem(item)" class="px-2.5 py-1.5 bg-white text-[#2D1B14] text-xs rounded-lg hover:bg-slate-100 transition font-bold shadow-md cursor-pointer">Edit</button>
              <button @click="togglePublish(item)" class="px-2.5 py-1.5 text-xs rounded-lg font-bold transition shadow-md cursor-pointer" :class="item.published ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'">{{ item.published ? 'Unpublish' : 'Publish' }}</button>
            </div>
          </div>

          <div class="p-3">
            <div class="flex items-center justify-between gap-1 mb-1">
              <p class="font-bold text-sm text-[#2D1B14] dark:text-slate-200 truncate">{{ item.client_initial }}</p>
              <span class="text-[10px] text-[#8A7A72] dark:text-slate-400 font-medium shrink-0">{{ getPhotoCount(item) }} foto</span>
            </div>
            <p class="text-xs text-[#8A7A72] dark:text-slate-400 truncate">{{ item.graduation_year }} • {{ item.university }}</p>
            <p v-if="item.city" class="text-[10px] text-[#C59B63] font-medium mt-0.5 truncate">📍 {{ item.city }}</p>

            <!-- 💬 Teks Ulasan / Testimoni Klien (Khusus Admin) -->
            <div v-if="item.feedback_notes" class="mt-2 p-2 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50 rounded-lg text-[10px] text-amber-950 dark:text-amber-300 font-light leading-relaxed">
              <p class="font-bold text-[9px] text-amber-800 dark:text-amber-400 uppercase flex items-center gap-1 mb-0.5">
                <span>💬</span> Ulasan Klien:
              </p>
              <p class="italic line-clamp-2" :title="item.feedback_notes">"{{ item.feedback_notes }}"</p>
            </div>
          </div>
        </div>

        <div class="px-3 pb-3 pt-1 border-t border-[#E8D5C8]/40 dark:border-slate-800/60 flex items-center justify-between">
          <span class="text-[10px] text-[#8A7A72] dark:text-slate-500 font-mono">ID: #{{ item.id }}</span>
          <button @click="deleteItem(item)" class="text-xs text-rose-500 hover:text-rose-700 font-semibold cursor-pointer">Hapus</button>
        </div>
      </div>
    </TransitionGroup>

    <!-- Add/Edit Modal -->
    <div v-if="showAdd" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(17,30,54,0.6); backdrop-filter: blur(6px);" @click.self="showAdd=false">
      <div class="card w-full max-w-lg p-6 animate-pop max-h-[90vh] overflow-y-auto dark:bg-slate-900 dark:border-slate-800 relative flex flex-col">
        <!-- Sticky Top Action Bar (Fast Access Header) -->
        <div class="flex items-center justify-between pb-3 mb-3 border-b border-[#E8D5C8]/60 dark:border-slate-800 sticky -top-6 bg-white dark:bg-slate-900 z-30 pt-1 -mx-6 px-6">
          <h3 class="font-bold text-lg text-[#2D1B14] dark:text-slate-100 flex items-center gap-2">
            <span>{{ editId ? '✏️ Edit' : '✨ Tambah' }} Portfolio</span>
          </h3>
          <div class="flex items-center gap-2">
            <button type="button" @click="showAdd=false" class="px-3 py-1.5 bg-[#FAF9F6] text-[#8A7A72] border border-[#E5E0D8] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-100 transition">
              Batal
            </button>
            <button type="button" @click="submitAdd" :disabled="isSubmitDisabled || submittingForm" class="px-4 py-1.5 bg-[#1A1A2E] text-[#C59B63] rounded-lg text-xs font-semibold disabled:opacity-40 hover:bg-[#2A2A4E] transition shadow-md flex items-center gap-1.5 cursor-pointer">
              <span v-if="submittingForm" class="loading-spinner !w-3 !h-3 !border-t-[#C59B63]"></span>
              <span>{{ editId ? 'Update' : 'Simpan Portfolio' }}</span>
            </button>
          </div>
        </div>

        <form @submit.prevent="submitAdd" class="space-y-4 flex-1">
          <div v-if="!editId && completedBookings.length">
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">PILIH DARI BOOKING COMPLETED (OPSIONAL)</label>
            <select v-model="addForm.booking_id" @change="onBookingSelect" class="input-fancy !text-xs dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
              <option value="">-- Pilih Booking --</option>
              <option v-for="b in completedBookings" :key="b.id" :value="b.id">{{ b.client_name }} — {{ b.university }} (#{{ b.id }})</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">NAMA CLIENT / INISIAL *</label>
              <input v-model="addForm.client_initial" class="input-fancy dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="Contoh: Riska Amelia / R.A.">
            </div>
            <div>
              <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">TAHUN WISUDA *</label>
              <input v-model.number="addForm.graduation_year" type="number" class="input-fancy dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" :placeholder="new Date().getFullYear()">
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">UNIVERSITAS / INSTITUT *</label>
              <input v-model="addForm.university" class="input-fancy dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="Universitas Hasanuddin">
            </div>
            <div>
              <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">KOTA LAYANAN / ACARA</label>
              <select v-model="addForm.city" class="input-fancy dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
                <option value="">-- Pilih Kota --</option>
                <option v-for="c in supportedCities" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>
          </div>

          <!-- FOR NEW PORTFOLIO: Drive Link OR Manual Upload Tabs -->
          <template v-if="!editId">
            <div class="flex gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl mb-3 border border-[#E8D5C8]/40 dark:border-slate-800">
              <button type="button" @click="inputMethod = 'drive'" class="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                :class="inputMethod === 'drive' ? 'bg-[#C59B63] text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'">
                🔗 Google Drive
              </button>
              <button type="button" @click="inputMethod = 'upload'" class="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                :class="inputMethod === 'upload' ? 'bg-[#C59B63] text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'">
                📁 Berkas Komputer
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

            <!-- Tab 2: Manual File Upload — Lightweight, No Thumbnail Preview -->
            <div v-show="inputMethod === 'upload'" class="space-y-4 bg-[#FAF9F6] dark:bg-slate-950 p-3.5 rounded-2xl border border-[#E5E0D8] dark:border-slate-800">
              <div>
                <label class="block text-[10px] text-[#C59B63] mb-1.5 font-bold uppercase tracking-wider">FOTO PORTOFOLIO / HIGHLIGHT (BERKAS KOMPUTER)</label>

                <!-- File Input (Hidden) — stores raw File objects only, no thumbnail generation -->
                <input type="file" accept="image/*" multiple @change="onLocalFilesChange" ref="localFileInput" class="hidden">

                <!-- Initial Click Zone (no files yet) -->
                <div v-if="!rawSelectedFiles.length"
                     @click="$refs.localFileInput.click()"
                     class="border-2 border-dashed border-[#C59B63]/40 hover:border-[#C59B63] rounded-2xl p-6 text-center bg-white dark:bg-slate-900 cursor-pointer transition-all space-y-2 group">
                  <div class="w-12 h-12 rounded-2xl bg-[#C59B63]/10 text-[#C59B63] group-hover:scale-110 transition flex items-center justify-center mx-auto text-2xl shadow-inner">
                    📁
                  </div>
                  <p class="text-xs font-bold text-[#2D1B14] dark:text-slate-200">Klik di sini untuk memilih berkas foto dari komputer / HP</p>
                  <p class="text-[10px] text-[#8A7A72] dark:text-slate-400 font-light">Bisa memilih puluhan hingga 1.000+ foto sekaligus (JPG, PNG, WEBP)</p>
                </div>

                <!-- Lightweight Summary Card — hanya tampilkan jumlah & ukuran, TANPA render thumbnail -->
                <div v-else class="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800/50 rounded-2xl flex items-center justify-between gap-3 shadow-sm">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                      📁
                    </div>
                    <div>
                      <p class="text-xs font-bold text-emerald-950 dark:text-emerald-300">
                        {{ rawSelectedFiles.length }} Berkas Foto Terpilih
                        <span v-if="rawSelectedFilesSizeFormatted" class="font-mono text-[11px] text-emerald-700 dark:text-emerald-400"> • {{ rawSelectedFilesSizeFormatted }}</span>
                      </p>
                      <p class="text-[10px] text-emerald-700 dark:text-emerald-400">
                        Foto #1 otomatis dijadikan Cover. Klik Submit → langsung masuk antrean upload.
                      </p>
                    </div>
                  </div>
                  <div class="flex items-center gap-1.5 shrink-0">
                    <button type="button" @click="$refs.localFileInput.click()" class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition shadow-sm cursor-pointer">
                      + Tambah
                    </button>
                    <button type="button" @click="rawSelectedFiles = []" class="px-2 py-1.5 bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-200 rounded-lg text-[10px] font-bold transition cursor-pointer">
                      Reset
                    </button>
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
                🔗 Google Drive
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
                       :class="coverPreview === img.url ? 'border-[#C59B63] ring-2 ring-[#C59B63]/40' : 'border-[#E5E0D8] hover:border-[#C59B63]/60'">
                    <img :src="img.url" class="w-full h-full object-cover">
                    <div v-if="img.isNew" class="absolute top-1 right-1 bg-emerald-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow z-10">NEW</div>
                    <div v-else-if="coverPreview === img.url" class="absolute top-1 right-1 bg-[#C59B63] text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] shadow pointer-events-none z-10">
                      ✓
                    </div>
                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center pointer-events-none">
                      <span class="text-[9px] font-bold text-white bg-[#C59B63] px-2 py-1 rounded-md shadow">
                        {{ coverPreview === img.url ? '⭐️ Cover Saat Ini' : 'Set Cover' }}
                      </span>
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

          <!-- ⭐ Rating & Ulasan Privat -->
          <div class="space-y-3 p-3.5 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/50 rounded-xl">
            <div>
              <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold uppercase tracking-wider">⭐ RATING CLIENT (1–5 Bintang)</label>
              <div class="flex items-center gap-1.5">
                <button
                  v-for="star in [1,2,3,4,5]"
                  :key="star"
                  type="button"
                  @click="addForm.rating = star"
                  class="text-2xl transition-transform hover:scale-110 cursor-pointer focus:outline-none leading-none"
                  :class="addForm.rating >= star ? 'text-amber-400' : 'text-gray-200 dark:text-slate-700'"
                >★</button>
                <span class="text-xs text-[#8A7A72] dark:text-slate-400 ml-2 font-bold" v-if="addForm.rating">
                  {{ parseFloat(addForm.rating).toFixed(1) }}/5.0
                </span>
                <button v-if="addForm.rating" type="button" @click="addForm.rating = null"
                  class="text-[10px] text-red-400 hover:text-red-600 ml-auto cursor-pointer font-semibold">Reset</button>
              </div>
              <p class="text-[10px] text-[#C4B0A5] dark:text-slate-500 mt-1.5 font-light">
                Rating dari client. Hanya angka bintang yang tampil di halaman publik (tanpa teks ulasan).
              </p>
            </div>
            <div>
              <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold uppercase tracking-wider">💬 CATATAN ULASAN / TESTIMONI (PRIVAT INTERNAL)</label>
              <textarea v-model="addForm.feedback_notes" rows="3"
                placeholder="Catatan ulasan atau testimoni client (tidak ditampilkan ke publik)..."
                class="input-fancy !py-2 resize-none text-xs dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
              ></textarea>
              <p class="text-[10px] text-amber-700/80 dark:text-amber-500/70 mt-1 font-semibold flex items-center gap-1">
                🔒 PRIVAT — Catatan ini hanya terlihat oleh Admin dan tidak pernah dipublikasikan ke publik.
              </p>
            </div>
          </div>

          <!-- Sticky Bottom Action Bar (Always Visible) -->
          <div class="sticky -bottom-6 bg-white dark:bg-slate-900 border-t border-[#E8D5C8]/80 dark:border-slate-800 pt-3 pb-3 mt-4 -mx-6 -mb-6 px-6 z-20 flex items-center justify-between shadow-lg">
            <div class="flex gap-4">
              <label class="flex items-center gap-2 text-xs text-[#8A7A72] dark:text-slate-300 cursor-pointer">
                <input v-model="addForm.published" type="checkbox" class="w-4 h-4 rounded border-[#E5E0D8] text-[#C59B63] focus:ring-[#C59B63]"> Publikasikan
              </label>
              <label class="flex items-center gap-2 text-xs text-[#8A7A72] dark:text-slate-300 cursor-pointer">
                <input v-model="addForm.featured" type="checkbox" class="w-4 h-4 rounded border-[#E5E0D8] text-[#C59B63] focus:ring-[#C59B63]"> Featured
              </label>
            </div>
            <div class="flex gap-2">
              <button type="button" @click="showAdd=false" class="px-4 py-2 bg-[#FAF9F6] text-[#8A7A72] border border-[#E5E0D8] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-100 transition">Batal</button>
              <button type="submit" :disabled="isSubmitDisabled || submittingForm" class="px-5 py-2 bg-[#1A1A2E] text-[#C59B63] rounded-xl text-xs font-semibold disabled:opacity-40 hover:bg-[#2A2A4E] transition shadow-md flex items-center gap-2 cursor-pointer">
                <span v-if="submittingForm" class="loading-spinner !w-3 !h-3 !border-t-[#C59B63]"></span>
                <span>{{ editId ? 'Update' : 'Simpan Portfolio' }}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- Expanded Queue Modal (Centered Window) -->
    <div v-if="hasActiveImportOrUpload && !isUploadMinimized" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(17,30,54,0.75); backdrop-filter: blur(8px);" @click.self="isUploadMinimized = true">
      <div class="card w-full max-w-md p-6 animate-pop dark:bg-slate-900 dark:border-slate-800 shadow-2xl space-y-4 relative">
        <!-- Top Right Minimize Button -->
        <button @click="isUploadMinimized = true" class="absolute top-3 right-4 px-2.5 py-1 bg-amber-500/10 text-[#C59B63] dark:text-amber-400 rounded-lg text-xs font-bold hover:bg-amber-500/20 transition cursor-pointer flex items-center gap-1">
          <span>🗕</span> <span>Minimize</span>
        </button>

        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-[#C59B63]/15 border border-[#C59B63]/30 flex items-center justify-center text-[#C59B63] font-bold">
            ⚡
          </div>
          <div>
            <h3 class="font-bold text-base text-[#2D1B14] dark:text-slate-100">Antrean Upload Portofolio</h3>
            <p class="text-xs text-[#C59B63] font-semibold">{{ totalActiveJobsCount ? `${totalActiveJobsCount} Upload Berjalan` : 'Antrean Upload Aktif' }}</p>
          </div>
        </div>

        <div class="space-y-3 max-h-64 overflow-y-auto pr-1">
          <!-- Active Drive Import Jobs -->
          <div v-for="job in activeImportJobs" :key="job.id" 
               class="p-3 rounded-xl border dark:bg-slate-950 dark:border-slate-800 space-y-1.5"
               :class="job.status === 'completed' ? 'border-emerald-500/40 bg-emerald-500/5' : (job.status === 'failed' ? 'border-rose-500/40 bg-rose-500/5' : 'border-amber-500/30 bg-amber-500/5')">
            <div class="flex justify-between items-center text-xs">
              <span class="font-bold text-[#2D1B14] dark:text-slate-200 truncate max-w-[240px]">
                {{ job.client_initial }} ({{ job.university }})
              </span>
              <span class="font-mono text-xs font-bold" :class="job.status === 'completed' ? 'text-emerald-500' : (job.status === 'failed' ? 'text-rose-500' : 'text-[#C59B63]')">
                {{ job.status === 'completed' ? '100% ✅' : (job.status === 'failed' ? '⚠️ Gagal' : `${job.total_photos > 0 ? Math.round((job.processed_photos / job.total_photos) * 100) : 0}%`) }}
              </span>
            </div>

            <!-- Progress Bar -->
            <div v-if="job.status === 'processing' || job.status === 'completed'" class="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
              <div class="h-2 rounded-full transition-all duration-300"
                   :class="job.status === 'completed' ? 'bg-emerald-500' : 'bg-gradient-to-r from-[#C59B63] to-[#D4AF37]'"
                   :style="{ width: `${job.status === 'completed' ? 100 : (job.total_photos > 0 ? (job.processed_photos / job.total_photos) * 100 : 5)}%` }"></div>
            </div>

            <div class="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              <span>{{ job.status === 'pending' ? 'Menyiapkan...' : (job.status === 'processing' ? `Mengunggah foto ${job.processed_photos || 0}/${job.total_photos || '?'}` : (job.status === 'completed' ? 'Selesai!' : job.error_message)) }}</span>
              <button @click="dismissJob(job.id)" class="text-rose-500 hover:underline font-bold">
                ✕ {{ job.status === 'completed' || job.status === 'failed' ? 'Tutup' : 'Batal' }}
              </button>
            </div>
          </div>

          <!-- Active Manual Local Upload Jobs Array -->
          <div v-for="job in activeLocalUploadJobs" :key="job.id" 
               class="p-3 rounded-xl border dark:bg-slate-950 dark:border-slate-800 space-y-1.5"
               :class="job.status === 'completed' ? 'border-emerald-500/40 bg-emerald-500/5' : (job.status === 'failed' || job.status === 'interrupted' ? 'border-rose-500/40 bg-rose-500/5' : 'border-amber-500/30 bg-amber-500/5')">
            <div class="flex justify-between items-center text-xs">
              <span class="font-bold text-[#2D1B14] dark:text-slate-200 truncate max-w-[240px]">
                {{ job.client_initial }} ({{ job.university }})
                <span class="text-[9px] font-normal text-amber-500 ml-1 font-mono">• 📁 Berkas Komputer</span>
              </span>
              <span class="font-mono text-xs font-bold" :class="job.status === 'completed' ? 'text-emerald-500' : (job.status === 'failed' || job.status === 'interrupted' ? 'text-rose-500' : 'text-[#C59B63]')">
                {{ job.status === 'completed' ? '100% ✅' : (job.status === 'interrupted' ? '⚠️ Terputus' : (job.status === 'failed' ? '⚠️ Gagal' : `${job.progressPercent}%`)) }}
              </span>
            </div>

            <!-- Progress Bar -->
            <div class="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
              <div class="h-2 rounded-full transition-all duration-300"
                   :class="job.status === 'completed' ? 'bg-emerald-500' : (job.status === 'interrupted' ? 'bg-rose-500' : 'bg-gradient-to-r from-[#C59B63] to-[#D4AF37]')"
                   :style="{ width: `${job.status === 'completed' ? 100 : job.progressPercent}%` }"></div>
            </div>

            <div class="flex justify-between items-center text-[10px] font-mono" :class="job.status === 'failed' || job.status === 'interrupted' ? 'text-rose-500 font-bold' : 'text-slate-500 dark:text-slate-400'">
              <span class="truncate max-w-[210px]">{{ job.status === 'interrupted' ? (job.progressText || '⚠️ Upload Terputus (Halaman Di-refresh)') : (job.status === 'failed' ? (job.errorMessage ? `⚠️ ${job.errorMessage}` : '⚠️ Upload gagal') : (job.progressText || 'Memproses upload berkas...')) }}</span>
              <div class="flex items-center gap-1.5 shrink-0 ml-2">
                <button v-if="job.status === 'interrupted'" @click="resumeLocalJob(job)" class="text-amber-500 hover:underline font-bold text-[10px]">
                  🔄 Lanjutkan
                </button>
                <button @click="dismissLocalUploadJob(job.id)" class="text-rose-500 hover:underline font-bold">
                  ✕ {{ job.status === 'completed' || job.status === 'failed' || job.status === 'interrupted' ? 'Tutup' : 'Batal' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Minimized Floating Banner Bar (Bottom Right Bubble with Live Progress) -->
    <div v-if="hasActiveImportOrUpload && isUploadMinimized" 
         @click="isUploadMinimized = false"
         class="fixed bottom-5 right-5 z-50 p-3.5 bg-[#111E35] text-white border border-[#C59B63]/60 rounded-2xl shadow-2xl backdrop-blur-md cursor-pointer hover:border-[#C59B63] transition-all flex items-center gap-3 animate-pop min-w-[240px]">
      <div class="w-9 h-9 rounded-xl bg-[#C59B63]/20 text-[#C59B63] flex items-center justify-center font-bold relative shrink-0">
        <svg class="animate-spin h-5 w-5 text-[#C59B63]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between text-xs font-bold text-[#C59B63] mb-1">
          <span class="truncate">
            ⚡ {{ totalActiveJobsCount ? `${totalActiveJobsCount} Upload Berjalan` : 'Upload Berjalan' }}
          </span>
          <span class="font-mono text-emerald-400 text-xs shrink-0 ml-2">
            {{ activeDriveJobs.length ? `${activeDriveJobs[0].total_photos > 0 ? Math.round((activeDriveJobs[0].processed_photos / activeDriveJobs[0].total_photos) * 100) : 5}%` : (activeLocalJobs.length ? `${activeLocalJobs[0].progressPercent}%` : '100%') }}
          </span>
        </div>
        
        <!-- Live Progress Bar in Minimized Widget -->
        <div class="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mb-1 border border-slate-700">
          <div class="bg-gradient-to-r from-[#C59B63] to-emerald-400 h-full transition-all duration-300"
               :style="{ width: `${activeDriveJobs.length ? (activeDriveJobs[0].total_photos > 0 ? Math.round((activeDriveJobs[0].processed_photos / activeDriveJobs[0].total_photos) * 100) : 5) : (activeLocalJobs.length ? activeLocalJobs[0].progressPercent : 100)}%` }"></div>
        </div>

        <div class="flex justify-between items-center text-[10px] text-slate-300 font-mono">
          <span class="truncate max-w-[170px]">
            {{ activeDriveJobs.length ? `${activeDriveJobs[0].client_initial} — ${activeDriveJobs[0].processed_photos || 0}/${activeDriveJobs[0].total_photos || '?'} foto` : (activeLocalJobs.length ? `${activeLocalJobs[0].client_initial} — ${activeLocalJobs[0].progressText}` : 'Progres selesai') }}
          </span>
          <span class="text-[9px] text-emerald-400 font-sans ml-1 shrink-0 font-bold">Buka ↗</span>
        </div>
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
const supportedCities = ref(['Makassar', 'Jakarta', 'Surabaya', 'Yogyakarta', 'Bandung'])
const editId = ref(null)
const inputMethod = ref('drive')
const editTab = ref('manage')
const coverPreview = ref('')
const highlightPreview = ref([])
const activeLocalUploadJobs = ref([])
const submittingForm = ref(false)
const isUploadMinimized = ref(true)
const files = ref({ cover: null, highlights: [] })
const addForm = ref({
  booking_id: '',
  client_initial: '',
  graduation_year: new Date().getFullYear(),
  university: '',
  city: 'Makassar',
  fg_name: '',
  drive_url: '',
  published: false, // WAJIB default false — portofolio baru harus melalui review Admin / persetujuan Client sebelum tayang
  featured: false
})

const localFileInput = ref(null)

// Mode 2B: raw File[] tracking — NO thumbnail generation, lightweight
const rawSelectedFiles = ref([])

const rawSelectedFilesSizeFormatted = computed(() => {
  if (!rawSelectedFiles.value.length) return ''
  const totalBytes = rawSelectedFiles.value.reduce((sum, f) => sum + (f.size || 0), 0)
  if (!totalBytes) return ''
  if (totalBytes < 1024 * 1024) return `${(totalBytes / 1024).toFixed(1)} KB`
  if (totalBytes < 1024 * 1024 * 1024) return `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
})

const selectedCoverFileName = computed(() => {
  if (!highlightPreview.value.length) return ''
  const coverItem = highlightPreview.value.find(i => i.url === coverPreview.value) || highlightPreview.value[0]
  return coverItem && coverItem.file ? coverItem.file.name : ''
})

function resetSelectedFiles() {
  highlightPreview.value = []
  coverPreview.value = ''
  files.value.cover = null
  files.value.highlights = []
  rawSelectedFiles.value = []
}

const isSubmitDisabled = computed(() => {
  if (!addForm.value.client_initial || !addForm.value.university) return true
  if (!editId.value) {
    if (inputMethod.value === 'drive') return !addForm.value.drive_url
    // Mode 2B: pakai rawSelectedFiles (no thumbnail dependency)
    if (inputMethod.value === 'upload') return rawSelectedFiles.value.length === 0
  } else if (editTab.value === 'drive') {
    return !addForm.value.drive_url
  }
  return false
})

const activeDriveJobs = computed(() => {
  return activeImportJobs.value.filter(j => j.status === 'pending' || j.status === 'processing')
})

const activeLocalJobs = computed(() => {
  return activeLocalUploadJobs.value.filter(j => j.status === 'pending' || j.status === 'processing')
})

const totalActiveJobsCount = computed(() => {
  return activeDriveJobs.value.length + activeLocalJobs.value.length
})

const hasActiveImportOrUpload = computed(() => {
  return activeImportJobs.value.length > 0 || activeLocalUploadJobs.value.length > 0
})

function sanitizeFolder(str) {
  return (str || '').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()
}

function isNewlyAdded(item) {
  if (!item || !item.created_at) return false
  const rawStr = String(item.created_at)
  const isoStr = rawStr.includes('T') ? rawStr : rawStr.replace(' ', 'T') + 'Z'
  const createdAtTime = new Date(isoStr).getTime()
  if (isNaN(createdAtTime)) return false
  const now = Date.now()
  return Math.abs(now - createdAtTime) <= 120000 // 2 minutes window
}

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

function setAsCover(img) {
  coverPreview.value = img.url
  if (img.isNew && img.file) {
    files.value.cover = img.file
  } else {
    files.value.cover = null
  }
}

function removeHighlightPhoto(index) {
  if (highlightPreview.value.length <= 1) {
    alert('Portfolio harus memiliki minimal 1 foto highlight/cover.')
    return
  }
  const removedImg = highlightPreview.value[index]
  
  // Remove from highlightPreview array
  highlightPreview.value.splice(index, 1)

  // If removed image was active cover, reassign cover to first remaining image
  if (coverPreview.value === removedImg.url) {
    const firstRemaining = highlightPreview.value[0]
    coverPreview.value = firstRemaining?.url || ''
    if (firstRemaining && firstRemaining.isNew && firstRemaining.file) {
      files.value.cover = firstRemaining.file
    } else {
      files.value.cover = null
    }
  }
}

async function generateFastThumbnail(file) {
  try {
    if ('createImageBitmap' in window) {
      const bmp = await createImageBitmap(file, { resizeWidth: 240, resizeQuality: 'medium' })
      const canvas = document.createElement('canvas')
      canvas.width = bmp.width
      canvas.height = bmp.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(bmp, 0, 0)
      bmp.close()
      return canvas.toDataURL('image/jpeg', 0.7)
    }
  } catch (e) {}
  return URL.createObjectURL(file)
}

async function onCoverChange(e) {
  const f = e.target.files[0]
  if (!f) return
  files.value.cover = f
  coverPreview.value = await generateFastThumbnail(f)
}

// Mode 2B (New): hanya simpan raw File refs tanpa thumbnail rendering
function onLocalFilesChange(e) {
  const fl = Array.from(e.target.files || [])
  if (!fl.length) return
  // Akumulasi (append) jika sudah ada file sebelumnya
  const existing = rawSelectedFiles.value
  const merged = [...existing, ...fl]
  rawSelectedFiles.value = merged
}

// Mode Edit (existing): tetap pakai highlightPreview untuk thumbnail grid
async function onHighlightChange(e) {
  const fl = Array.from(e.target.files || [])
  if (!fl.length) return
  
  for (const file of fl) {
    const thumbUrl = await generateFastThumbnail(file)
    highlightPreview.value.push({
      url: thumbUrl,
      file: file,
      isNew: true
    })
  }

  if (!coverPreview.value && highlightPreview.value.length > 0) {
    const first = highlightPreview.value[0]
    coverPreview.value = first.url
    if (first.isNew && first.file) {
      files.value.cover = first.file
    }
  }
  
  e.target.value = ''
}

function onBookingSelect() {
  if (!addForm.value.booking_id) return
  const b = completedBookings.value.find(item => item.id == addForm.value.booking_id)
  if (b) {
    addForm.value.client_initial = b.client_name || ''
    addForm.value.university = b.university || ''
    if (b.city) addForm.value.city = b.city
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
    data.value = [...(result.data || [])]
    total.value = result.total || 0
  } catch {}
  loading.value = false
}

watch(tab, load)

function resetAddForm() {
  editId.value = null
  files.value = { cover: null, highlights: [] }
  coverPreview.value = ''
  highlightPreview.value = []
  rawSelectedFiles.value = [] // Mode 2B: bersihkan raw file list agar tidak bocor ke session berikutnya
  addForm.value = {
    booking_id: '',
    client_initial: '',
    graduation_year: new Date().getFullYear(),
    university: '',
    city: 'Makassar',
    fg_name: '',
    drive_url: '',
    published: false,
    featured: false,
    rating: null,
    feedback_notes: ''
  }
}

async function openAddModal() {
  inputMethod.value = 'drive'
  editTab.value = 'manage'
  resetAddForm()
  try {
    const r = await fetch(`${API}/bookings?status=completed&limit=50`, { credentials: 'include' })
    const result = await r.json()
    completedBookings.value = result.data || []
  } catch {}
  showAdd.value = true
}

async function uploadFile(file, customFolder, clientInitial, university, year, subfolderId) {
  const formData = new FormData()
  formData.append('file', file)
  let url = `${API}/portfolio/upload`
  
  const initial = clientInitial || addForm.value.client_initial || ''
  const uni = university || addForm.value.university || ''
  const yr = year || addForm.value.graduation_year || ''

  const params = new URLSearchParams()
  if (subfolderId) params.append('subfolder_id', subfolderId)
  if (initial) params.append('client', initial)
  if (uni) params.append('university', uni)
  if (yr) params.append('year', yr)
  if (customFolder && !subfolderId) params.append('folder', customFolder)

  url += `?${params.toString()}`
  const r = await fetch(url, { method: 'POST', credentials: 'include', body: formData })
  const d = await r.json()
  if (!r.ok) throw new Error(d.error || 'Upload gagal')
  return d.url
}

const activeImportJobs = ref([])
let pollingTimer = null
let fallbackPollingTimer = null // M2 FIX: periodic fallback setiap 30 detik

async function checkImportJobs() {
  try {
    const r = await fetch(`${API}/portfolio/import-jobs`, { credentials: 'include' })
    if (r.ok) {
      const jobs = await r.json()
      
      let shouldReload = false
      jobs.forEach(job => {
        const existing = activeImportJobs.value.find(j => j.id === job.id)
        if (job.status === 'completed' && (!existing || existing.status !== 'completed')) {
          if (!job.dismissing) {
            job.dismissing = true
            shouldReload = true
            setTimeout(() => {
              dismissJob(job.id)
            }, 2500)
          }
        }
      })
      
      activeImportJobs.value = jobs

      // Link active import job to overlay progress bar
      const activeJob = jobs.find(j => j.status === 'pending' || j.status === 'processing')
      if (shouldReload) {
        tab.value = 'all'
        load()
      }
      
      const hasActive = jobs.some(j => j.status === 'pending' || j.status === 'processing')
      clearPolling()
      if (hasActive) {
        pollingTimer = setTimeout(checkImportJobs, 1500)
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

// M2 FIX: fallback polling 30 detik untuk mendeteksi impor yang berjalan
// saat halaman dibuka tanpa ada job aktif yang terdeteksi awal
function startFallbackPolling() {
  if (fallbackPollingTimer) return
  fallbackPollingTimer = setInterval(() => {
    const hasActive = activeImportJobs.value.some(j => j.status === 'pending' || j.status === 'processing')
    if (!hasActive && !uploading.value) {
      // Lakukan cek background sekali untuk mendeteksi job baru yang mungkin berjalan
      checkImportJobs()
    }
  }, 30000)
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

async function fetchSupportedCities() {
  try {
    const r = await fetch('/api/public/settings')
    if (r.ok) {
      const d = await r.json()
      if (d.supported_cities) {
        const sc = typeof d.supported_cities === 'string' ? JSON.parse(d.supported_cities) : d.supported_cities
        if (Array.isArray(sc) && sc.length) supportedCities.value = sc
      }
    }
  } catch {}
}

function handleBeforeUnload(e) {
  const hasRunningLocal = activeLocalUploadJobs.value.some(j => j.status === 'pending' || j.status === 'processing')
  if (hasRunningLocal) {
    e.preventDefault()
    e.returnValue = 'Proses upload berkas komputer sedang berlangsung. Refresh halaman akan membatalkan pengunggahan berkas.'
    return e.returnValue
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
  try {
    const importStarted = sessionStorage.getItem('portfolio_import_started')
    if (importStarted && (Date.now() - Number(importStarted)) < 300000) { // 5 menit
      isUploadMinimized.value = false // Buka queue drawer langsung
      sessionStorage.removeItem('portfolio_import_started')
    }
  } catch {}

  checkImportJobs()
  fetchSupportedCities()
  startFallbackPolling() // M2 FIX: mulai periodic fallback
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  clearPolling()
  if (fallbackPollingTimer) { // M2 FIX: bersihkan fallback timer saat unmount
    clearInterval(fallbackPollingTimer)
    fallbackPollingTimer = null
  }
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
      city: addForm.value.city || null,
      fg_name: addForm.value.fg_name || null,
      published: addForm.value.published,
      featured: addForm.value.featured,
      rating: addForm.value.rating !== null && addForm.value.rating !== undefined ? parseFloat(addForm.value.rating) : null,
      feedback_notes: addForm.value.feedback_notes || null
    }

    // CLOSE FORM MODAL & SHOW BACKGROUND IMPORT PROGRESS
    showAdd.value = false
    isUploadMinimized.value = false // Open progress drawer so user sees job initialization
    
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

  // Creating NEW Portfolio with manual upload (Concurrent Background Job Queue)
  if (!editId.value && inputMethod.value === 'upload') {
    const filesToUpload = Array.from(rawSelectedFiles.value)
    if (!filesToUpload.length) return

    // 1. Snapshot form & raw files (no thumbnails) into immutable local job payload
    const snapshot = {
      booking_id: addForm.value.booking_id,
      client_initial: addForm.value.client_initial,
      graduation_year: addForm.value.graduation_year || new Date().getFullYear(),
      university: addForm.value.university,
      city: addForm.value.city || null,
      fg_name: addForm.value.fg_name || null,
      published: addForm.value.published,
      featured: addForm.value.featured,
      rawFiles: filesToUpload
    }

    // 2. Immediately close modal & reset form so "+ Tambah" opens 100% clean
    showAdd.value = false
    resetAddForm()
    // Auto-minimize: widget langsung muncul minimized di sudut kanan bawah (Google Drive style)
    isUploadMinimized.value = true

    // 3. Create reactive job object in activeLocalUploadJobs queue
    const localJob = {
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      client_initial: snapshot.client_initial,
      university: snapshot.university,
      graduation_year: snapshot.graduation_year,
      status: 'pending',
      progressPercent: 2,
      progressText: 'Menyiapkan record database...',
      processedPhotos: 0,
      totalPhotos: snapshot.rawFiles.length,
      portfolioId: null, // akan diisi setelah DB entry dibuat
      errorMessage: ''
    }

    activeLocalUploadJobs.value.unshift(localJob)

    // 4. Trigger non-blocking async background job execution
    processLocalUploadJob(localJob, snapshot)
    return
  }

  // Editing existing item logic (manual upload or selecting existing cover)
  const newImages = highlightPreview.value.filter(img => img.isNew && img.file)
  const hasNewFiles = !!(files.value.cover || newImages.length)

  if (hasNewFiles) {
    showAdd.value = false
    uploading.value = true
    isUploadMinimized.value = true
    uploadProgressText.value = 'Menyiapkan perubahan...'
    uploadProgressPercent.value = 5
  } else {
    submittingForm.value = true
  }

  try {
    let subfolderId = null
    if (hasNewFiles) {
      try {
        const sfRes = await fetch(`${API}/portfolio/create-subfolder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            client_initial: addForm.value.client_initial,
            university: addForm.value.university,
            graduation_year: addForm.value.graduation_year
          })
        })
        if (sfRes.ok) {
          const sfData = await sfRes.json()
          subfolderId = sfData.subfolder_id
        }
      } catch (e) {}
    }

    const totalFiles = (files.value.cover ? 1 : 0) + newImages.length
    let processedFiles = 0

    let coverUrl = coverPreview.value
    if (files.value.cover) {
      processedFiles++
      uploadProgressText.value = `Mengunggah Cover Foto baru ke Google Drive (${processedFiles}/${totalFiles})...`
      uploadProgressPercent.value = Math.round((processedFiles / (totalFiles + 1)) * 90)
      coverUrl = await uploadFile(files.value.cover, targetFolder, addForm.value.client_initial, addForm.value.university, addForm.value.graduation_year, subfolderId)
    }

    const highlightUrls = []
    for (let idx = 0; idx < highlightPreview.value.length; idx++) {
      const img = highlightPreview.value[idx]
      if (img.isNew && img.file) {
        processedFiles++
        uploadProgressText.value = `Mengunggah foto ${processedFiles}/${totalFiles} ke Google Drive...`
        uploadProgressPercent.value = Math.round((processedFiles / (totalFiles + 1)) * 90)
        const url = await uploadFile(img.file, targetFolder, addForm.value.client_initial, addForm.value.university, addForm.value.graduation_year, subfolderId)
        highlightUrls.push(url)
        if (coverPreview.value === img.url) {
          coverUrl = url
        }
      } else {
        highlightUrls.push(img.url)
      }
    }

    if (!coverUrl && highlightUrls.length > 0) {
      coverUrl = highlightUrls[0]
    }

    if (hasNewFiles) {
      uploadProgressText.value = 'Menyimpan pembaruan portofolio...'
      uploadProgressPercent.value = 95
    }

    const body = {
      booking_id: addForm.value.booking_id ? Number(addForm.value.booking_id) : undefined,
      client_initial: addForm.value.client_initial,
      graduation_year: addForm.value.graduation_year,
      university: addForm.value.university,
      city: addForm.value.city || null,
      cover_photo_url: coverUrl,
      highlight_photos: JSON.stringify(highlightUrls),
      fg_name: addForm.value.fg_name || null,
      published: addForm.value.published ? 1 : 0,
      featured: addForm.value.featured ? 1 : 0,
      rating: addForm.value.rating !== null && addForm.value.rating !== undefined ? parseFloat(addForm.value.rating) : undefined,
      feedback_notes: addForm.value.feedback_notes !== '' ? addForm.value.feedback_notes : undefined
    }
    const r = await fetch(`${API}/portfolio/${editId.value}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body)
    })
    if (!r.ok) {
      const e = await r.json()
      alert(e.error || 'Gagal memperbarui portofolio')
      uploading.value = false
      submittingForm.value = false
      return
    }

    if (!hasNewFiles) {
      showAdd.value = false
      submittingForm.value = false
    } else {
      uploadProgressPercent.value = 100
      uploadProgressText.value = 'Selesai!'
      setTimeout(() => {
        uploading.value = false
        uploadProgressText.value = ''
        uploadProgressPercent.value = 0
      }, 600)
    }
    await load()
  } catch (e) {
    alert('Error: ' + e.message)
    uploading.value = false
    submittingForm.value = false
  }
}

const LOCAL_STORAGE_KEY = 'wisuda_local_upload_queue'

function saveLocalJobsToStorage() {
  try {
    const serializable = activeLocalUploadJobs.value.map(j => ({
      id: j.id,
      client_initial: j.client_initial,
      university: j.university,
      graduation_year: j.graduation_year,
      status: j.status === 'processing' || j.status === 'pending' ? 'interrupted' : j.status,
      progressPercent: j.progressPercent,
      progressText: j.status === 'processing' || j.status === 'pending' ? `⚠️ Upload Terputus pada Foto ${j.processedPhotos || 0}/${j.totalPhotos || 0}` : j.progressText,
      processedPhotos: j.processedPhotos || 0,
      totalPhotos: j.totalPhotos || 0,
      portfolioId: j.portfolioId || null,
      errorMessage: j.status === 'processing' || j.status === 'pending' ? 'Halaman di-refresh di tengah upload. Klik Lanjutkan Upload.' : j.errorMessage
    }))
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(serializable))
  } catch (e) {
    console.warn('localStorage save failed:', e)
  }
}

function loadLocalJobsFromStorage() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        activeLocalUploadJobs.value = parsed.map(j => {
          if (j.status === 'processing' || j.status === 'pending') {
            j.status = 'interrupted'
            j.progressText = `⚠️ Upload Terputus pada Foto ${j.processedPhotos || 0}/${j.totalPhotos || 0}`
            j.errorMessage = 'Halaman di-refresh di tengah upload'
          }
          return j
        })
      }
    }
  } catch (e) {
    console.warn('localStorage load failed:', e)
  }
}

function dismissLocalUploadJob(jobId) {
  activeLocalUploadJobs.value = activeLocalUploadJobs.value.filter(j => j.id !== jobId)
  saveLocalJobsToStorage()
}

function resumeLocalJob(job) {
  // Triggers file picker or alerts user to select remaining files to complete upload
  if (localFileInput.value) {
    localFileInput.value.value = ''
    localFileInput.value.click()
  } else {
    alert(`Upload terputus pada foto ${job.processedPhotos}/${job.totalPhotos}. Silakan buka kembali form + Tambah Portfolio untuk mengunggah sisa foto.`)
  }
}

async function processLocalUploadJob(job, snapshot) {
  // Pastikan kita selalu mengubah properti pada Reactive Proxy Vue di activeLocalUploadJobs
  const getJobRef = () => activeLocalUploadJobs.value.find(j => j.id === job.id) || job;

  const targetJob = getJobRef();
  targetJob.status = 'processing';
  targetJob.progressPercent = 2;
  targetJob.progressText = 'Membuat record database portofolio...'; // LANGKAH 1: DB dulu

  const snapTargetFolder = `${sanitizeFolder(snapshot.client_initial)}_${sanitizeFolder(snapshot.university)}_${snapshot.graduation_year}`;
  const filesToUpload = Array.from(snapshot.rawFiles || []);

  if (!filesToUpload.length) {
    const j = getJobRef();
    j.status = 'failed';
    j.errorMessage = 'Tidak ada file foto yang dipilih';
    return;
  }

  try {
    // ─── LANGKAH 1: Buat DB Entry Dulu (dapat portfolio_id) ───
    const initBody = {
      booking_id: snapshot.booking_id ? Number(snapshot.booking_id) : undefined,
      client_initial: snapshot.client_initial,
      graduation_year: snapshot.graduation_year || new Date().getFullYear(),
      university: snapshot.university,
      city: snapshot.city,
      cover_photo_url: '', // placeholder, akan diupdate setelah upload selesai
      highlight_photos: JSON.stringify([]),
      fg_name: snapshot.fg_name,
      published: false, // selalu draft sampai upload selesai
      featured: snapshot.featured,
      rating: snapshot.rating !== null && snapshot.rating !== undefined ? parseFloat(snapshot.rating) : null,
      feedback_notes: snapshot.feedback_notes || null
    };

    const initRes = await fetch(`${API}/portfolio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(initBody)
    });

    if (!initRes.ok) {
      const e = await initRes.json();
      const j = getJobRef();
      j.status = 'failed';
      j.errorMessage = e.error || 'Gagal membuat record portofolio';
      return;
    }

    const initData = await initRes.json();
    const portfolioId = initData.id;
    const j2 = getJobRef();
    j2.portfolioId = portfolioId;
    j2.progressPercent = 10;
    j2.progressText = 'Menyiapkan folder Google Drive...';

    // ─── LANGKAH 2: Buat subfolder di Master Portofolio Drive ───
    let subfolderId = null;
    try {
      const sfRes = await fetch(`${API}/portfolio/create-subfolder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          client_initial: snapshot.client_initial,
          university: snapshot.university,
          graduation_year: snapshot.graduation_year || new Date().getFullYear()
        })
      });
      if (sfRes.ok) {
        const sfData = await sfRes.json();
        subfolderId = sfData.subfolder_id;
      }
    } catch (e) {
      console.warn('Subfolder pre-creation warning (non-fatal):', e);
    }

    // ─── LANGKAH 3: Stream upload foto satu per satu ke Drive ───
    const j3 = getJobRef();
    j3.totalPhotos = filesToUpload.length;
    const highlightUrls = [];
    let processedFiles = 0;

    for (let idx = 0; idx < filesToUpload.length; idx++) {
      const file = filesToUpload[idx];
      processedFiles++;
      const currentJob = getJobRef();
      currentJob.processedPhotos = processedFiles;
      currentJob.progressText = `Mengunggah foto ${processedFiles}/${currentJob.totalPhotos} ke Google Drive...`;
      currentJob.progressPercent = 15 + Math.round((processedFiles / currentJob.totalPhotos) * 78);
      const url = await uploadFile(file, snapTargetFolder, snapshot.client_initial, snapshot.university, snapshot.graduation_year, subfolderId);
      highlightUrls.push(url);
    }

    const coverUrl = highlightUrls[0] || '';

    // ─── LANGKAH 4: Update DB dengan array URL CDN Google Drive ───
    const j4 = getJobRef();
    j4.progressText = 'Memperbarui metadata portofolio...';
    j4.progressPercent = 95;

    const patchBody = {
      cover_photo_url: coverUrl,
      highlight_photos: highlightUrls,
      published: snapshot.published ? 1 : 0,
      rating: snapshot.rating !== null && snapshot.rating !== undefined ? parseFloat(snapshot.rating) : null,
      feedback_notes: snapshot.feedback_notes || null
    };

    const patchRes = await fetch(`${API}/portfolio/${portfolioId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(patchBody)
    });

    if (!patchRes.ok) {
      const e = await patchRes.json();
      console.error('PATCH portfolio metadata failed (photos already uploaded):', e);
    }

    const j5 = getJobRef();
    j5.status = 'completed';
    j5.progressPercent = 100;
    j5.progressText = 'Portofolio Berhasil Dibuat! 🎉';
    saveLocalJobsToStorage();
    await load();

    setTimeout(() => {
      dismissLocalUploadJob(job.id);
    }, 4000);
  } catch (err) {
    console.error('Local upload job error:', err);
    const jErr = getJobRef();
    jErr.status = 'failed';
    jErr.errorMessage = err.message || 'Upload gagal';
    saveLocalJobsToStorage();
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
  const rawHighlights = Array.isArray(item.highlight_photos) ? item.highlight_photos : []
  highlightPreview.value = rawHighlights.map(url => ({
    url: url,
    file: null,
    isNew: false
  }))
  addForm.value = {
    booking_id: item.booking_id || '',
    client_initial: item.client_initial,
    graduation_year: item.graduation_year,
    university: item.university || '',
    city: item.city || 'Makassar',
    fg_name: item.fg_name || '',
    drive_url: '',
    published: !!item.published,
    featured: !!item.featured,
    rating: item.rating || null,
    feedback_notes: item.feedback_notes || ''
  }
  try {
    const r = await fetch(`${API}/bookings?status=completed&limit=50`, { credentials: 'include' })
    const result = await r.json()
    completedBookings.value = result.data || []
  } catch {}
  showAdd.value = true
}

async function deleteItem(item) {
  if (!window.confirm(`Hapus portfolio ${item.client_initial}?`)) return
  try {
    const r = await fetch(`${API}/portfolio/${item.id}`, { method: 'DELETE', credentials: 'include' })
    if (r.ok) {
      await load()
    } else {
      const err = await r.json()
      alert(err.error || 'Gagal menghapus portofolio')
    }
  } catch (e) {
    alert('Error: ' + e.message)
  }
}

loadLocalJobsFromStorage()
load()
</script>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(30px) scale(0.96);
}

.card-pop-enter-active,
.card-pop-leave-active {
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.card-pop-enter-from {
  opacity: 0;
  transform: scale(0.85) translateY(24px);
}
.card-pop-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>