<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-5">
      <div>
        <h2 class="text-xl font-bold text-[#2D1B14] dark:text-slate-200 tracking-tight">Post Production</h2>
        <p class="text-xs text-[#8A7A72] dark:text-slate-400 mt-0.5">Kelola alur pasca produksi — dari galeri seleksi foto hingga pengiriman file akhir ke client.</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-20">
      <div class="loading-spinner animate-spin"></div>
    </div>

    <!-- Compact List View -->
    <div v-else class="card overflow-hidden dark:bg-slate-900 dark:border-slate-800 animate-fade-in">

      <!-- Desktop Table -->
      <table class="w-full text-sm hidden md:table">
        <thead>
          <tr class="text-[#8A7A72] dark:text-slate-400 border-b border-[#E8D5C8] dark:border-slate-800 text-left text-[11px] bg-[#FFF8F3]/50 dark:bg-slate-900/50">
            <th @click="handleSort('client_name')" class="p-3 font-medium cursor-pointer hover:text-[#C59B63] select-none transition">
              Client <span v-if="sortBy === 'client_name'">{{ sortDesc ? '▴' : '▾' }}</span>
            </th>
            <th @click="handleSort('fg_name')" class="p-3 font-medium hidden lg:table-cell cursor-pointer hover:text-[#C59B63] select-none transition">
              Fotografer <span v-if="sortBy === 'fg_name'">{{ sortDesc ? '▴' : '▾' }}</span>
            </th>
            <th @click="handleSort('pp_status')" class="p-3 font-medium cursor-pointer hover:text-[#C59B63] select-none transition">
              Tahap <span v-if="sortBy === 'pp_status'">{{ sortDesc ? '▴' : '▾' }}</span>
            </th>
            <th @click="handleSort('payment_status')" class="p-3 font-medium cursor-pointer hover:text-[#C59B63] select-none transition">
              Bayar <span v-if="sortBy === 'payment_status'">{{ sortDesc ? '▴' : '▾' }}</span>
            </th>
            <th @click="handleSort('drive_status')" class="p-3 font-medium cursor-pointer hover:text-[#C59B63] select-none transition">
              Status Drive <span v-if="sortBy === 'drive_status'">{{ sortDesc ? '▴' : '▾' }}</span>
            </th>
            <th @click="handleSort('action')" class="p-3 font-medium text-right cursor-pointer hover:text-[#C59B63] select-none transition">
              Aksi <span v-if="sortBy === 'action'">{{ sortDesc ? '▴' : '▾' }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in sortedData" :key="item.booking_id"
            class="border-b border-[#E8D5C8]/40 dark:border-slate-800/60 hover:bg-[#FFF8F3] dark:hover:bg-slate-800/40 text-xs transition">

            <td class="p-3 cursor-pointer" @click="openClientDetailModal(item)">
              <p class="font-semibold text-[#2D1B14] dark:text-slate-200 hover:text-[#C59B63] transition truncate max-w-[160px]">{{ item.client_name || '-' }}</p>
              <p class="text-[10px] text-[#C4B0A5] dark:text-slate-500 truncate max-w-[160px]">{{ item.university || '-' }}</p>
            </td>

            <td class="p-3 hidden lg:table-cell">
              <p class="font-medium text-[#2D1B14] dark:text-slate-300 text-[11px]">{{ item.fg_name || '-' }}</p>
              <p class="text-[10px] mt-0.5">
                <span v-if="item.assignment_status === 'done' || item.assignment_status === 'completed'" class="text-emerald-600 dark:text-emerald-400 font-semibold">✓ Sesi Selesai</span>
                <span v-else-if="item.assignment_status === 'confirmed'" class="text-blue-600 dark:text-blue-400 font-semibold">📅 Terjadwal</span>
                <span v-else-if="item.assignment_status === 'assigned'" class="text-amber-500 animate-pulse">⏳ Menunggu Konfirmasi FG</span>
                <span v-else class="text-slate-400">-</span>
              </p>
            </td>

            <td class="p-3">
              <span class="status-chip text-[9px]" :class="ppStatusClass(item.pp_status)">{{ ppStatusDisplay(item.pp_status) }}</span>
              <div class="flex flex-wrap gap-x-2 mt-1 text-[9px]">
                <a v-if="item.staging_drive_url" :href="item.staging_drive_url" target="_blank" class="text-blue-500 hover:underline" @click.stop title="Seleksi Drive">&#128193;</a>
                <a v-if="['ready','submitted','cleaned'].includes(item.selection_status)" :href="'/select-photos/' + item.booking_id" target="_blank" class="text-blue-500 hover:underline" @click.stop title="Galeri">&#127912;</a>
                <a v-if="item.highlight_drive_url" :href="item.highlight_drive_url" target="_blank" class="text-purple-500 hover:underline" @click.stop title="Highlight">&#10024;</a>
                <a v-if="item.download_url" :href="item.download_url" target="_blank" class="text-emerald-500 hover:underline" @click.stop title="Final">&#127891;</a>
                <span v-if="item.tracking_token" class="font-mono text-[#C59B63] dark:text-amber-400 select-all">{{ item.tracking_token }}</span>
              </div>
            </td>

            <td class="p-3" @click.stop>
              <span v-if="item.balance_status === 'paid'" class="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 dark:bg-green-950/30 dark:text-green-400 border border-emerald-200 dark:border-green-900">Lunas &#10003;</span>
              <span v-else-if="item.balance_status === 'uploaded'" @click="openVerifyModal(item)" class="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 animate-pulse cursor-pointer hover:bg-amber-100 transition">&#9203; Verif</span>
              <span v-else class="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-200">DP 50%</span>
            </td>

            <!-- Direct Drive Upload Cell -->
            <td class="p-3" @click.stop>
              <div v-if="getDriveUploadButton(item)" class="flex items-center gap-1">
                <!-- Active Live Uploading Indicator for this Row -->
                <button v-if="isItemUploading(item)"
                        @click="isMinimizedUploadWidget = false; showDirectUploadModal = true"
                        class="px-2.5 py-1 rounded text-[9px] font-bold text-white bg-amber-600 animate-pulse transition shadow-sm flex items-center gap-1 cursor-pointer"
                        title="Upload sedang berlangsung. Klik untuk buka antrean upload">
                  <span class="animate-spin">⚡</span>
                  <span>Uploading ({{ getItemUploadProgress(item) }})...</span>
                </button>

                <!-- State 1b: Locked Button while Client is Selecting Photos -->
                <button v-else-if="item.pp_status === 'Menunggu Pilihan Client' || item.selection_status === 'ready'"
                        disabled
                        class="px-2 py-1 rounded text-[9px] font-bold text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 flex items-center gap-1 cursor-not-allowed opacity-60 select-none"
                        title="Terkunci: Client belum selesai memilih foto. Tunggu hingga client menyelesaikan pilihan di galeri.">
                  <span>⏳ Menunggu Pilihan Client</span>
                </button>

                <!-- State 2 & 3: Clickable Upload / Ready Push Badge -->
                <button v-else
                        @click="openDirectUploadModal(item, getDriveUploadTarget(item))"
                        class="px-2 py-1 rounded text-[9px] font-extrabold flex items-center gap-1 shadow-sm cursor-pointer transition"
                        :class="getUploadedFileCountLabel(item, getDriveUploadTarget(item)) ? 'text-emerald-800 dark:text-emerald-300 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800' : (getDriveUploadTarget(item) === 'highlight' ? 'text-indigo-800 dark:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-300 dark:border-indigo-800' : 'text-blue-800 dark:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-800')"
                        title="Klik untuk Tambah / Upload Foto Baru">
                  <span v-if="getUploadedFileCountLabel(item, getDriveUploadTarget(item))">✅ Ready Push {{ getUploadedFileCountLabel(item, getDriveUploadTarget(item)) }}</span>
                  <span v-else-if="getDriveUploadTarget(item) === 'highlight'">⭐ Upload Highlight</span>
                  <span v-else-if="getDriveUploadTarget(item) === 'final'">📦 Upload Final</span>
                  <span v-else>☁️ Upload File</span>
                </button>
              </div>
              <span v-else class="text-[9px] text-gray-400 italic dark:text-slate-500">-</span>
            </td>

            <td class="p-3 text-right" @click.stop>
              <div class="flex items-center justify-end gap-1.5">
                <template v-if="item.balance_status !== 'paid'">
                  <button v-if="item.balance_status === 'uploaded'" @click="openVerifyModal(item)"
                    class="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold shadow-md transition flex items-center gap-1"
                    title="Client sudah setor bukti transfer pelunasan. Klik untuk verifikasi.">
                    🔍 Verif Pelunasan
                  </button>
                  <a v-else :href="getWaBillingLink(item)" target="_blank"
                    class="px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded-lg text-[10px] font-semibold hover:bg-rose-100 transition"
                    title="Pelunasan belum lunas. Klik untuk tagih via WA">
                    ⏳ Tagih
                  </a>
                </template>
                <template v-else>
                  <!-- Post Production Pipeline Action Buttons -->
                  <!-- Step 1: Initial state - Terima File button -->
                  <template v-if="item.pp_status === 'Menunggu File dari FG' || (item.booking_status === 'shooting' && !item.is_session_done)">
                    <button @click="confirmShootDoneByAdmin(item)"
                      class="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold shadow-md transition flex items-center gap-1 cursor-pointer"
                      title="Klik untuk konfirmasi terima file/berkas foto dari FG">
                      📦 Terima File
                    </button>
                    <button disabled
                      class="px-2.5 py-1.5 bg-gray-100 dark:bg-slate-800/60 text-gray-400 dark:text-slate-500 border border-gray-200 dark:border-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-not-allowed opacity-60 select-none ml-1"
                      title="Terkunci: Terima file & unggah foto ke Drive Staging terlebih dahulu">
                      🚀 Push Staging
                    </button>
                  </template>

                  <!-- Step 2: Staging Phase (Menunggu Upload Staging / Menunggu Push Staging) -->
                  <template v-else-if="['Menunggu Staging Upload', 'Menunggu Push Staging', 'confirmed'].includes(item.pp_status) || item.selection_status === 'staged'">
                    <!-- Upload Masih Berlangsung -> KUNCI TOTAL -->
                    <button v-if="isItemUploading(item)"
                      disabled
                      class="px-2.5 py-1.5 bg-amber-500/20 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-not-allowed opacity-90 select-none shadow-xs"
                      title="Upload ke Drive sedang berlangsung. Tunggu hingga 100% selesai untuk Push Staging">
                      <span class="animate-spin">⏳</span>
                      <span>Mengunggah {{ getItemUploadProgress(item) }}...</span>
                    </button>
                    <!-- Upload Selesai 100% -> PUSH STAGING TERBUKA -->
                    <button v-else-if="getUploadedFileCountLabel(item, 'staging') || (item.staged_photo_count && item.staged_photo_count > 0)"
                      @click="publishStaging(item)"
                      class="px-2.5 py-1.5 bg-[#111E35] text-[#D4AF37] hover:bg-[#1A2B4C] rounded-lg text-[10px] font-bold shadow-md cursor-pointer flex items-center gap-1 animate-bounce"
                      title="Publikasikan Galeri Seleksi ke Client">
                      🚀 Push Staging
                    </button>
                    <!-- Belum Upload -> TERKUNCI -->
                    <button v-else
                      disabled
                      class="px-2.5 py-1.5 bg-gray-100 dark:bg-slate-800/60 text-gray-400 dark:text-slate-500 border border-gray-200 dark:border-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-not-allowed opacity-60 select-none"
                      title="Terkunci: Unggah foto staging terlebih dahulu via Direct Drive Upload">
                      🚀 Push Staging
                    </button>
                  </template>

                  <button v-else-if="item.pp_status === 'Staging Gagal (0 Foto)'" @click="openStagingModal(item)"
                    class="px-2.5 py-1.5 bg-rose-600 text-white rounded-lg text-[10px] font-bold hover:bg-rose-700 transition animate-pulse"
                    title="Folder kosong atau privat. Klik untuk mengulang">
                    ⚠️ Gagal (0 Foto)
                  </button>
                  <span v-else-if="item.pp_status === 'Memindai Folder Drive' || item.pp_status === 'Proses Import Staging'"
                    class="px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 rounded-lg text-[10px] font-bold flex items-center gap-1">
                    <span class="animate-spin">⌛</span> Memindai...
                  </span>
                  <span v-else-if="item.pp_status === 'Menunggu Pilihan Client'"
                    class="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 rounded-lg text-[10px] font-bold">
                    🎨 Client Memilih
                  </span>

                  <!-- Step 3: Highlight Phase -->
                  <template v-else-if="item.pp_status === 'Proses Edit Highlight'">
                    <button @click="openSelectionDetailModal(item)"
                      class="px-2.5 py-1.5 bg-[#FAF6F0] dark:bg-slate-800 text-[#C59B63] dark:text-amber-400 border border-[#E8D5C8] dark:border-slate-700 rounded-lg text-[10px] font-semibold hover:bg-[#FAF0DD] transition mr-1"
                      title="Lihat rincian foto pilihan client">
                      🎨 ({{ item.selected_photos?.length || 0 }}) Foto Pilihan
                    </button>
                    <!-- Upload Highlight Berlangsung -> KUNCI -->
                    <button v-if="isItemUploading(item)"
                      disabled
                      class="px-2.5 py-1.5 bg-indigo-500/20 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-not-allowed opacity-90 select-none shadow-xs"
                      title="Upload Highlight ke Drive sedang berlangsung. Tunggu hingga 100% selesai untuk Push Highlight">
                      <span class="animate-spin">⏳</span>
                      <span>Mengunggah {{ getItemUploadProgress(item) }}...</span>
                    </button>
                    <!-- Upload Selesai 100% -> PUSH HIGHLIGHT TERBUKA -->
                    <button v-else-if="getUploadedFileCountLabel(item, 'highlight') || (item.highlight_photo_count && item.highlight_photo_count > 0)"
                      @click="publishHighlight(item)"
                      class="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold shadow-md cursor-pointer flex items-center gap-1 animate-bounce"
                      title="Publikasikan Foto Highlight ke Client">
                      🚀 Push Highlight
                    </button>
                    <button v-else
                      disabled
                      class="px-2.5 py-1.5 bg-gray-100 dark:bg-slate-800/60 text-gray-400 dark:text-slate-500 border border-gray-200 dark:border-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-not-allowed opacity-60 select-none"
                      title="Terkunci: Unggah foto highlight terlebih dahulu via Direct Drive Upload">
                      🚀 Push Highlight
                    </button>
                  </template>

                  <!-- Final Edit Delivered State -->
                  <span v-if="['Terkirim ke Client (Final)', 'delivered'].includes(item.pp_status) || (item.download_url && item.booking_status === 'delivered')"
                        class="px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm">
                    ⏳ Menunggu Konfirmasi Client
                  </span>
                  <span v-else-if="item.pp_status === 'Selesai' || item.booking_status === 'completed'"
                        class="px-2.5 py-1.5 bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm">
                    ✅ Selesai (Konfirmasi Client)
                  </span>

                  <!-- Step 4: Final Edit Phase -->
                  <template v-else-if="['Highlight Siap', 'Proses Edit Final'].includes(item.pp_status) || item.selection_status === 'cleaned'">
                    <!-- Upload Final Berlangsung -> KUNCI -->
                    <button v-if="isItemUploading(item)"
                      disabled
                      class="px-2.5 py-1.5 bg-emerald-500/20 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-not-allowed opacity-90 select-none shadow-xs"
                      title="Upload Final ke Drive sedang berlangsung. Tunggu hingga 100% selesai untuk Push Final Edit">
                      <span class="animate-spin">⏳</span>
                      <span>Mengunggah {{ getItemUploadProgress(item) }}...</span>
                    </button>
                    <!-- Upload Selesai 100% -> PUSH FINAL TERBUKA -->
                    <button v-else-if="getUploadedFileCountLabel(item, 'final') || (item.final_photo_count && item.final_photo_count > 0)"
                      @click="publishFinal(item)"
                      class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shadow-md cursor-pointer flex items-center gap-1 animate-bounce"
                      title="Publikasikan hasil foto Final Edit ke client">
                      🚀 Push Final Edit
                    </button>
                    <button v-else
                      disabled
                      class="px-2.5 py-1.5 bg-gray-100 dark:bg-slate-800/60 text-gray-400 dark:text-slate-500 border border-gray-200 dark:border-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-not-allowed opacity-60 select-none"
                      title="Terkunci: Unggah foto final edit terlebih dahulu via Direct Drive Upload">
                      🚀 Push Final Edit
                    </button>
                  </template>
                </template>
              </div>
            </td>
          </tr>
          <tr v-if="data.length === 0">
            <td class="p-10 text-center text-[#C4B0A5] dark:text-slate-500" colspan="6">
              <span class="text-2xl block mb-1">&#127910;</span>
              <span class="text-xs">Tidak ada data Post Production saat ini</span>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Mobile: compact row list -->
      <div class="md:hidden divide-y divide-[#E8D5C8]/40 dark:divide-slate-800">
        <div v-for="item in sortedData" :key="item.booking_id"
          class="flex items-center gap-3 p-3 hover:bg-[#FFF8F3] dark:hover:bg-slate-800/40 transition">
          <div class="flex-1 min-w-0 cursor-pointer" @click="openClientDetailModal(item)">
            <div class="flex items-center gap-1.5 flex-wrap">
              <p class="font-semibold text-sm text-[#2D1B14] dark:text-slate-200 truncate">{{ item.client_name || '-' }}</p>
              <span v-if="item.balance_status === 'paid'" class="text-[8px] px-1 py-0.5 rounded font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Lunas</span>
              <span v-else-if="item.balance_status === 'uploaded'" class="text-[8px] px-1 py-0.5 rounded font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">Verif</span>
              <span v-else class="text-[8px] px-1 py-0.5 rounded font-bold bg-rose-50 text-rose-600 border border-rose-200">DP</span>
            </div>
            <p class="text-[10px] text-[#C4B0A5] mt-0.5">{{ item.fg_name || '-' }}</p>
            <span class="status-chip text-[9px] mt-1 inline-block" :class="ppStatusClass(item.pp_status)">{{ item.pp_status }}</span>
          </div>
          <div class="flex-shrink-0 flex gap-1.5" @click.stop>
            <template v-if="item.balance_status !== 'paid'">
              <button v-if="item.balance_status === 'uploaded'" @click="openVerifyModal(item)" class="px-2.5 py-2 bg-amber-600 text-white rounded-xl text-[10px] font-bold animate-pulse">&#128269;</button>
              <a v-else :href="getWaBillingLink(item)" target="_blank" class="px-2.5 py-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-[10px] font-semibold inline-flex items-center">&#9203;</a>
            </template>
            <template v-else>
              <button v-if="item.pp_status === 'Menunggu Staging Upload'" @click="openStagingModal(item)" class="px-2.5 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-semibold">&#128279;</button>
              <button v-else-if="item.pp_status === 'Proses Edit Highlight'" @click="openSelectionDetailModal(item)" class="px-2.5 py-2 bg-[#FAF6F0] dark:bg-slate-800 text-[#C59B63] border border-[#E8D5C8] dark:border-slate-700 rounded-xl text-[10px] font-bold" title="Rincian Foto Pilihan">🎨 ({{ item.selected_photos?.length || 0 }})</button>
              <button v-else-if="['Highlight Siap', 'Proses Edit Final'].includes(item.pp_status) || item.selection_status === 'cleaned'"
                @click="publishFinal(item)"
                :disabled="!(getUploadedFileCountLabel(item, 'final') || (item.final_photo_count && item.final_photo_count > 0))"
                :class="[getUploadedFileCountLabel(item, 'final') || (item.final_photo_count && item.final_photo_count > 0) ? 'bg-emerald-600 text-white animate-bounce' : 'bg-slate-800 text-slate-500 opacity-60 cursor-not-allowed']"
                class="px-2.5 py-2 rounded-xl text-[10px] font-bold flex items-center gap-1">
                🚀 Push Final
              </button>
              <!-- Mode 1: Portofolio otomatis saat Push Highlight — tidak ada tombol manual -->
            </template>
          </div>
        </div>
        <div v-if="data.length === 0" class="text-center py-16 text-[#C4B0A5] dark:text-slate-500">
          <span class="text-2xl block mb-1">&#127910;</span>
          <span class="text-xs">Tidak ada data Post Production saat ini</span>
        </div>
      </div>

    </div>

    <!-- MODAL DETAIL CLIENT -->
    <div v-if="clientDetailItem" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.65); backdrop-filter: blur(6px);" @click.self="clientDetailItem=null">
      <div class="card w-full max-w-lg p-6 animate-pop dark:bg-slate-900 dark:border-slate-800 relative max-h-[90vh] overflow-y-auto shadow-2xl">
        <button @click="clientDetailItem=null" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold transition">✕</button>

        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-xl bg-[#FAF0DD] dark:bg-amber-950/40 text-[#B5942B] dark:text-amber-400 flex items-center justify-center font-bold text-lg">
            {{ (clientDetailItem.client_name || '?')[0] }}
          </div>
          <div>
            <h3 class="font-bold text-base text-[#2D1B14] dark:text-slate-200">{{ clientDetailItem.client_name }}</h3>
            <p class="text-xs text-[#C4B0A5]">{{ clientDetailItem.university || '-' }}</p>
          </div>
          <span class="ml-auto status-chip" :class="statusClass(clientDetailItem.status)">{{ clientDetailItem.statusLabel || clientDetailItem.status }}</span>
        </div>

        <dl class="space-y-2 text-sm text-[#475569] dark:text-slate-300">
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">WA</dt><dd class="font-medium text-[#2D1B14] dark:text-slate-200">{{ clientDetailItem.client_phone }}</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">Paket</dt><dd class="text-[#2D1B14] dark:text-slate-200">{{ clientDetailItem.package_name || '-' }}</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">Tgl Wisuda</dt><dd>{{ clientDetailItem.graduation_date }}</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">Jam</dt><dd class="font-semibold text-[#2D1B14] dark:text-slate-200">{{ formatAmPm(clientDetailItem.shooting_time) || '-' }}</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">Lokasi</dt><dd>{{ clientDetailItem.location || '-' }}</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">Total</dt><dd class="font-semibold text-[#2D1B14] dark:text-slate-200">Rp {{ (clientDetailItem.total_price||0).toLocaleString('id-ID') }}</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">DP</dt><dd class="font-medium">Rp {{ (clientDetailItem.dp_amount||0).toLocaleString('id-ID') }} (<span :class="dpClass(clientDetailItem.dp_status)">{{ clientDetailItem.dp_status }}</span>)</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">Pelunasan</dt><dd class="font-medium">Rp {{ (clientDetailItem.balance_amount||0).toLocaleString('id-ID') }} (<span :class="dpClass(clientDetailItem.balance_status)">{{ clientDetailItem.balance_status }}</span>)</dd></div>
          <div class="flex justify-between items-center border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5">
            <dt class="text-[#C4B0A5]">Token Tracking</dt>
            <dd class="flex items-center gap-2">
              <span class="font-mono text-xs font-bold text-[#C59B63] dark:text-amber-400 select-all">{{ clientDetailItem.tracking_token || 'TRK-' + (clientDetailItem.id || clientDetailItem.booking_id) }}</span>
              <button @click="resetBookingToken(clientDetailItem)" type="button" title="Reset Token Tracking Baru" class="text-[10px] font-semibold text-red-500 hover:underline flex items-center gap-0.5">
                🔄 Reset
              </button>
            </dd>
          </div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5" v-if="clientDetailItem.fg_name">
            <dt class="text-[#C4B0A5]">FG</dt>
            <dd class="flex items-center gap-1.5">
              <span class="font-medium text-[#2d1b14] dark:text-slate-300">{{ clientDetailItem.fg_name }}</span>
              <span v-if="clientDetailItem.assignment_status === 'assigned'" class="text-[9px] text-amber-500 animate-pulse font-medium">⏳ Menunggu Konfirmasi</span>
              <span v-else-if="clientDetailItem.assignment_status === 'confirmed'" class="text-[9px] text-green-600 font-medium">✓ Diterima</span>
            </dd>
          </div>
        </dl>
        
        <!-- Invoice & WA Links -->
        <div v-if="clientDetailItem.dp_status === 'paid'" class="mt-4 p-3 bg-[#FAF6F0] dark:bg-slate-950 rounded-xl border border-[#E8D5C8]/60 dark:border-slate-800 space-y-2">
          <p class="text-[10px] text-[#C4B0A5] uppercase font-bold tracking-wider">Akses Cepat Admin</p>
          <div class="flex gap-2">
            <a :href="'/invoice.html?id=' + (clientDetailItem.id || clientDetailItem.booking_id)" target="_blank" class="flex-1 px-3 py-2 bg-[#FAF0DD] dark:bg-amber-950/20 text-[#B5942B] dark:text-amber-400 border border-[#FAF0DD]/80 rounded-lg text-center text-xs font-medium hover:bg-[#FFE5DA] transition">
              📄 Buka Invoice
            </a>
            <a :href="getWaConfirmLinkModal(clientDetailItem)" target="_blank" class="flex-1 px-3 py-2 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-900 rounded-lg text-center text-xs font-medium hover:bg-green-100 dark:hover:bg-green-950/40 transition">
              📤 Kirim WA Invoice
            </a>
          </div>
          <div class="flex gap-2">
            <a :href="'/tracking.html?code=' + encodeURIComponent(clientDetailItem.tracking_token || clientDetailItem.download_password || clientDetailItem.id || clientDetailItem.booking_id)" target="_blank" class="flex-1 px-3 py-2 bg-[#FAF6F0] dark:bg-slate-800 text-[#8A7A72] dark:text-slate-300 border border-[#E8D5C8]/80 dark:border-slate-700 rounded-lg text-center text-xs font-medium hover:bg-[#FFE5DA] transition">
              📍 Buka Tracking
            </a>
            <a :href="getWaTrackingLinkModal(clientDetailItem)" target="_blank" class="flex-1 px-3 py-2 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 rounded-lg text-center text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-950/40 transition">
              💬 Kirim WA Tracking
            </a>
          </div>
        </div>

        <div class="flex gap-2 mt-5">
          <button v-if="clientDetailItem?.status === 'cancelled'" @click="deleteClient(clientDetailItem)" class="px-3 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer" title="Hapus Client & Booking Permanen">
            🗑️ Hapus Permanen
          </button>
          <button v-else @click="cancelBooking(clientDetailItem)" class="px-3 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer" title="Batalkan Booking & Simpan Rekam Keuangan">
            🚫 Batalkan Booking
          </button>
          <button @click="clientDetailItem=null" class="flex-1 px-4 py-2.5 bg-[#FFF0E8] dark:bg-slate-800 text-[#8A7A72] dark:text-slate-300 rounded-xl text-xs font-medium hover:bg-[#FFE5DA] transition cursor-pointer">Tutup</button>
          <a :href="waAdminLinkModal(clientDetailItem)" target="_blank" class="flex-1 px-4 py-2.5 bg-[#0f766e] text-white rounded-xl text-xs font-medium hover:bg-[#0d6860] transition text-center flex items-center justify-center gap-1 cursor-pointer">💬 WA</a>
        </div>
      </div>
    </div>

    <!-- MODAL DETAIL PILIHAN CLIENT & SALIN NAMA FILE UNTUK EDITOR -->
    <div v-if="showSelectionModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.65); backdrop-filter: blur(6px);" @click.self="showSelectionModal = false">
      <div class="card w-full max-w-xl p-6 animate-pop dark:bg-slate-900 dark:border-slate-800 relative max-h-[90vh] flex flex-col shadow-2xl">
        <button @click="showSelectionModal = false" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold transition">✕</button>
        
        <div class="flex items-center gap-3 mb-1">
          <h3 class="font-bold text-base text-[#2D1B14] dark:text-slate-100 flex items-center gap-2">
            🎨 Pilihan Foto Client
          </h3>
          <span class="px-2.5 py-0.5 bg-[#FAF0DD] dark:bg-amber-950/20 text-[#B5942B] dark:text-amber-400 text-xs rounded-full font-mono font-bold border border-[#FAF0DD]/80 dark:border-amber-900/30">
            {{ selectionListNoExt.length }} Foto
          </span>
        </div>
        <p class="text-xs text-[#8A7A72] dark:text-slate-400 mb-4">— {{ selectionItem?.client_name }} ({{ selectionItem?.university || '-' }})</p>

        <!-- Panduan Format Editor -->
        <div class="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-xl p-3 mb-3 text-xs text-amber-950 dark:text-amber-200 space-y-1.5">
          <div class="flex items-center justify-between">
            <p class="font-bold text-[#2D1B14] dark:text-amber-300 flex items-center gap-1.5 text-xs">
              <span>⚡</span> <span>Cara Filter di Lightroom:</span>
            </p>
            <span class="px-2 py-0.5 bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 text-[10px] font-bold rounded-md border border-red-200">
              Wajib Set: "Contains Any"
            </span>
          </div>
          <p class="text-[11px] leading-relaxed text-amber-900 dark:text-amber-300">
            Di Library Filter Bar Lightroom, ubah dropdown menjadi <code class="bg-emerald-100 dark:bg-emerald-950 px-1 py-0.5 rounded text-emerald-800 dark:text-emerald-300 font-bold">Filename ➔ Contains Any</code>, lalu klik <strong>⚡ Salin Lightroom</strong>.
          </p>
        </div>

        <!-- List Box -->
        <div class="flex-1 overflow-y-auto bg-gray-50 dark:bg-slate-950 border border-[#E8D5C8]/80 dark:border-slate-800 rounded-xl p-3 mb-3.5 font-mono text-xs text-slate-700 dark:text-slate-200 space-y-1 max-h-48 shadow-inner">
          <div v-for="(name, idx) in selectionListNoExt" :key="idx" class="flex justify-between items-center py-1.5 px-1 border-b border-gray-200/60 dark:border-slate-800/60 last:border-0 hover:bg-[#FAF6F0] dark:hover:bg-slate-900 rounded transition">
            <div class="flex items-center gap-2">
              <span class="text-[10px] text-slate-400 font-sans w-5">{{ idx + 1 }}.</span>
              <span class="font-bold text-[#8A7A72] dark:text-[#E8D5C8] text-xs">{{ name }}</span>
            </div>
          </div>
          <div v-if="selectionListNoExt.length === 0" class="text-center text-slate-400 py-6 font-sans text-xs">
            Belum ada foto yang dipilih client.
          </div>
        </div>

        <!-- Additional Photo Input for Reopen -->
        <div class="mb-4 p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200/80 dark:border-amber-900/40 flex items-center justify-between gap-3 text-xs">
          <div class="space-y-0.5">
            <span class="text-xs font-bold text-amber-950 dark:text-amber-300 flex items-center gap-1.5">
              <span>🔓</span> <span>Buka Ulang & Tambah Kuota Foto</span>
            </span>
            <p class="text-[10px] text-amber-900/80 dark:text-amber-400 font-light leading-relaxed">
              Jika client membayar tambahan foto, input jumlah foto tambahan di bawah ini sebelum Buka Ulang.
            </p>
          </div>
          <div class="flex items-center gap-1.5 shrink-0 bg-white dark:bg-slate-950 px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-slate-800">
            <span class="text-[10px] text-[#8A7A72]">Tambah:</span>
            <input type="number" min="0" v-model.number="reopenAddPhotos" class="w-10 px-1 py-0.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded text-center font-bold text-[#1A1A2E] dark:text-slate-100" placeholder="0">
            <span class="text-[10px] text-[#8A7A72] font-semibold">Foto</span>
          </div>
        </div>
        <div class="flex items-center justify-between border-t border-[#E8D5C8]/60 dark:border-slate-800 pt-3.5 gap-2">
          <button @click="reopenSelectionInModal" class="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-red-950/20 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0"
            title="Buka kembali seleksi foto agar klien bisa mengubah/menambah pilihannya">
            🔓 Buka Ulang Seleksi
          </button>

          <div class="flex items-center gap-2">
            <button @click="copyOrSeparated" :disabled="selectionListNoExt.length === 0 || !!copiedType"
              class="px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5 min-w-[150px]"
              :class="copiedType === 'finder' 
                ? 'bg-emerald-600 text-white font-bold border border-emerald-500 scale-105 shadow-lg' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'">
              <span v-if="copiedType === 'finder'" class="flex items-center gap-1 font-bold animate-pulse">✓ Tersalin!</span>
              <span v-else>🔍 Finder / Explorer</span>
            </button>

            <button @click="copySpaceSeparated" :disabled="selectionListNoExt.length === 0 || !!copiedType"
              class="px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5 min-w-[125px]"
              :class="copiedType === 'lightroom' 
                ? 'bg-emerald-600 text-white font-bold border border-emerald-500 scale-105 shadow-lg' 
                : 'bg-[#C59B63] hover:bg-[#B5942B] text-white'">
              <span v-if="copiedType === 'lightroom'" class="flex items-center gap-1 font-bold animate-pulse">✓ Tersalin!</span>
              <span v-else>⚡ Lightroom</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL 1: Upload Staging Link (Drive Mentah untuk Pilihan Client) -->
    <div v-if="showStagingModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.6); backdrop-filter: blur(6px);" @click.self="closeStagingModal">
      <div class="card w-full max-w-sm p-5 animate-pop dark:bg-slate-900 dark:border-slate-800 relative">
        <button @click="closeStagingModal" class="absolute top-3 right-4 text-[#8A7A72] dark:text-slate-400 hover:text-[#2D1B14] dark:hover:text-slate-200 text-xl font-bold">×</button>
        
        <h3 class="font-bold text-sm text-[#2D1B14] dark:text-slate-200 mb-1">🔗 Upload Link Drive Staging</h3>
        <p class="text-[10px] text-[#8A7A72] dark:text-slate-400 mb-3">Input link Google Drive berisi foto mentah yang akan ditampilkan di Galeri Seleksi Client.</p>

        <div class="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-xl p-2.5 mb-3 text-[10px] text-blue-700 dark:text-blue-300">
          ⚙️ <strong>Proses Background:</strong> Setelah Anda submit, notifikasi import akan berjalan di background dan galeri seleksi siap diakses oleh client di timeline tracking.
        </div>

        <form @submit.prevent="submitStaging" class="space-y-3.5">
          <div>
            <label class="text-[10px] font-bold text-[#8A7A72] dark:text-slate-400 block mb-1.5">Link Google Drive Staging</label>
            <input v-model="stagingForm.staging_drive_url" type="url" required class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="https://drive.google.com/drive/folders/...">
          </div>

          <div v-if="stagingResult" class="bg-green-50 dark:bg-green-950/20 border border-green-200 rounded-xl p-3 text-xs text-green-700 dark:text-green-400">
            <p class="font-bold">✓ {{ stagingResult.message }}</p>
          </div>

          <div class="flex gap-2 pt-1">
            <button type="button" @click="closeStagingModal" class="flex-1 px-4 py-2.5 bg-[#FFF0E8] dark:bg-slate-800 text-[#8A7A72] dark:text-slate-300 rounded-xl text-xs font-medium hover:bg-[#FFE5DA] transition">
              Tutup
            </button>
            <button v-if="!stagingResult" type="submit" :disabled="submitting" class="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-semibold disabled:opacity-40 hover:bg-blue-700 transition flex items-center justify-center gap-1.5">
              <span v-if="!submitting">Submit & Aktifkan →</span>
              <div v-else class="loading-spinner !w-3.5 !h-3.5 !border-2 !border-t-white"></div>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL 2: Kirim Highlight Drive Link (Fast Editing) -->
    <div v-if="showHighlightModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.6); backdrop-filter: blur(6px);" @click.self="closeHighlightModal">
      <div class="card w-full max-w-sm p-5 animate-pop dark:bg-slate-900 dark:border-slate-800 relative">
        <button @click="closeHighlightModal" class="absolute top-3 right-4 text-[#8A7A72] dark:text-slate-400 hover:text-[#2D1B14] dark:hover:text-slate-200 text-xl font-bold">×</button>
        
        <h3 class="font-bold text-sm text-[#2D1B14] dark:text-slate-200 mb-1">✨ Kirim Link Foto Highlight</h3>
        <p class="text-[10px] text-[#8A7A72] dark:text-slate-400 mb-3">Input link Google Drive berisi foto highlight (fast editing) hasil pilihan client.</p>



        <form @submit.prevent="submitHighlight" class="space-y-3.5">
          <div>
            <label class="text-[10px] font-bold text-[#8A7A72] dark:text-slate-400 block mb-1.5">Link Google Drive Highlight</label>
            <input v-model="highlightForm.highlight_drive_url" type="url" required class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="https://drive.google.com/drive/folders/...">
          </div>

          <div v-if="highlightResult" class="bg-green-50 dark:bg-green-950/20 border border-green-200 rounded-xl p-3 text-xs text-green-700 dark:text-green-400">
            <p class="font-bold">✓ {{ highlightResult.message }}</p>
          </div>

          <div class="flex gap-2 pt-1">
            <button type="button" @click="closeHighlightModal" class="flex-1 px-4 py-2.5 bg-[#FFF0E8] dark:bg-slate-800 text-[#8A7A72] dark:text-slate-300 rounded-xl text-xs font-medium hover:bg-[#FFE5DA] transition">
              Tutup
            </button>
            <button v-if="!highlightResult" type="submit" :disabled="submitting" class="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-xl text-xs font-semibold disabled:opacity-40 hover:bg-purple-700 transition flex items-center justify-center gap-1.5">
              <span v-if="!submitting">Simpan Highlight →</span>
              <div v-else class="loading-spinner !w-3.5 !h-3.5 !border-2 !border-t-white"></div>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL 3: Deliver Final All-Edited Drive Link Input -->
    <div v-if="showDeliverModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.6); backdrop-filter: blur(6px);" @click.self="closeDeliverModal">
      <div class="card w-full max-w-sm p-5 animate-pop dark:bg-slate-900 dark:border-slate-800 relative">
        <button @click="closeDeliverModal" class="absolute top-3 right-4 text-[#8A7A72] dark:text-slate-400 hover:text-[#2D1B14] dark:hover:text-slate-200 text-xl font-bold">×</button>
        
        <form @submit.prevent="submitDeliver" class="space-y-3.5">
          <div>
            <label class="text-[10px] font-bold text-[#8A7A72] dark:text-slate-400 block mb-1.5">Link Google Drive All Edited</label>
            <input v-model="deliverForm.download_url" type="url" required class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="https://drive.google.com/drive/folders/...">
          </div>

          <!-- Quick Link Response Info -->
          <div v-if="deliverResult" class="bg-[#E8F5E9] dark:bg-green-950/20 border border-green-200/50 rounded-xl p-3 text-xs text-[#2E7D32] dark:text-green-400 animate-fade-up">
            <p class="font-bold">✓ Hasil Foto Berhasil Dikirim!</p>
            <p class="text-[10px] mt-0.5 text-slate-500">Status booking sekarang: **Delivered**.</p>
            <a :href="deliverResult.wa_link_client" target="_blank" class="text-blue-600 dark:text-blue-400 underline font-semibold mt-1.5 inline-flex items-center gap-1 text-[11px]">
              💬 Kirim WA ke Client
            </a>
          </div>

          <!-- Buttons -->
          <div class="flex gap-2 pt-1">
            <button type="button" @click="closeDeliverModal" class="flex-1 px-4 py-2.5 bg-[#FFF0E8] dark:bg-slate-800 text-[#8A7A72] dark:text-slate-300 rounded-xl text-xs font-medium hover:bg-[#FFE5DA] transition">
              Tutup
            </button>
            <button v-if="!deliverResult" type="submit" :disabled="submitting" class="flex-1 px-4 py-2.5 bg-[#0f766e] text-white rounded-xl text-xs font-semibold disabled:opacity-40 hover:bg-[#0d6860] transition flex items-center justify-center gap-1.5">
              <span v-if="!submitting">Kirim →</span>
              <div v-else class="loading-spinner !w-3.5 !h-3.5 !border-2 !border-t-white"></div>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL 4: Verify Balance Payment -->
    <div v-if="showVerifyModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.6); backdrop-filter: blur(6px);" @click.self="showVerifyModal = false">
      <div class="card w-full max-w-md p-5 animate-pop relative max-h-[90vh] overflow-y-auto dark:bg-slate-900 dark:border-slate-800">
        <button @click="showVerifyModal = false" class="absolute top-4 right-4 text-[#B8C6B8] hover:text-[#2D3A2E] dark:hover:text-slate-200">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
        <h3 class="font-bold text-sm text-[#2D1B14] dark:text-slate-200 mb-1">🔍 Verifikasi Pelunasan</h3>
        <p class="text-[10px] text-[#8A7A72] dark:text-slate-400 mb-3">— {{ verifyItem?.client_name }} ({{ verifyItem?.university || '-' }})</p>
        
        <!-- Rincian Tagihan & Sisa Nominal Pelunasan -->
        <div class="px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 mb-4 space-y-1.5 text-xs">
          <div class="flex justify-between items-center text-slate-700 dark:text-slate-300">
            <span>Nama Client:</span>
            <strong class="text-slate-900 dark:text-slate-100 font-semibold">{{ verifyItem?.client_name }}</strong>
          </div>
          <div class="flex justify-between items-center text-slate-700 dark:text-slate-300" v-if="verifyItem?.dp_amount">
            <span>DP Awal (50%):</span>
            <span class="font-mono font-medium text-slate-600 dark:text-slate-400">Rp {{ Number(verifyItem.dp_amount || 0).toLocaleString('id-ID') }}</span>
          </div>
          <div class="flex justify-between items-center pt-1 border-t border-amber-200/60 dark:border-amber-800/40 text-amber-900 dark:text-amber-200">
            <span class="font-bold uppercase tracking-wider text-[10px]">Sisa Nominal Pelunasan:</span>
            <strong class="font-mono text-sm text-emerald-700 dark:text-emerald-400 font-bold">
              Rp {{ Number(verifyItem?.balance_amount || 0).toLocaleString('id-ID') }}
            </strong>
          </div>
        </div>

        <div class="mb-5">
          <label class="text-[10px] text-[#C4B0A5] block mb-1">Bukti Transfer Pelunasan</label>
          <div class="border border-[#E8D5C8] dark:border-slate-800 rounded-xl overflow-hidden bg-gray-50 dark:bg-slate-950 flex items-center justify-center min-h-[300px] max-h-[500px]">
            <iframe v-if="isPdf(verifyUrl)" :src="verifyUrl" class="w-full h-80" frameborder="0"></iframe>
            <img v-else :src="verifyUrl" class="max-w-full max-h-[480px] object-contain" alt="Bukti Transfer" />
          </div>
        </div>

        <div class="flex gap-2">
          <button @click="showVerifyModal = false" class="flex-1 px-4 py-2.5 bg-[#FFF0E8] dark:bg-slate-800 text-[#8A7A72] dark:text-slate-300 rounded-xl text-xs font-medium hover:bg-[#FFE5DA] transition">Batal</button>
          <button @click="submitVerification" class="flex-1 px-4 py-2.5 bg-[#0f766e] text-white rounded-xl text-xs font-semibold hover:bg-[#0d6860] transition">
            Verifikasi Sah ✓
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL DIRECT WEB UPLOAD TO GOOGLE DRIVE -->
    <div v-if="showDirectUploadModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" @click.self="closeDirectUploadModal">
      <div class="card w-full max-w-lg p-6 animate-pop dark:bg-slate-900 dark:border-slate-800 relative shadow-2xl" @click.stop>
        <div class="absolute top-4 right-4 flex items-center gap-2">
          <button v-if="isUploadingBatch" @click="minimizeDirectUploadModal" class="px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg text-xs font-bold hover:bg-amber-500/20 transition cursor-pointer flex items-center gap-1">
            <span>🗕</span> <span>Minimize</span>
          </button>
          <button @click="closeDirectUploadModal" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold transition cursor-pointer">✕</button>
        </div>

        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xl">
            {{ uploadTargetIcon }}
          </div>
          <div>
            <h3 class="font-bold text-base text-[#2D1B14] dark:text-slate-100">{{ uploadModalTitle }}</h3>
            <p class="text-xs text-[#8A7A72] dark:text-slate-400">— {{ directUploadItem?.client_name }}</p>
          </div>
        </div>

        <div class="space-y-4">
          <!-- Live Batch Upload Progress Bar Box -->
          <div v-if="isUploadingBatch" class="p-4 rounded-2xl bg-[#111E35] text-white border border-[#D4AF37]/50 space-y-2">
            <div class="flex items-center justify-between text-xs font-bold text-[#D4AF37]">
              <span class="flex items-center gap-1.5">
                <span class="animate-spin">⚡</span>
                <span>Mengunggah File {{ currentUploadIndex + 1 }} dari {{ selectedUploadFiles.length }}</span>
              </span>
              <span class="font-mono text-emerald-400">{{ uploadProgressPercent }}%</span>
            </div>
            <div class="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
              <div class="bg-gradient-to-r from-amber-500 to-emerald-400 h-full transition-all duration-300" :style="{ width: uploadProgressPercent + '%' }"></div>
            </div>
            <div class="flex justify-between items-center text-[10px] text-slate-300 font-mono">
              <span class="truncate max-w-[240px]">Sedang mengunggah: {{ selectedUploadFiles[currentUploadIndex]?.name }}</span>
              <span>{{ selectedUploadFiles.filter(f => f.status === 'success').length }}/{{ selectedUploadFiles.length }} Sukses</span>
            </div>
          </div>

          <!-- Dropzone Area -->
          <div v-if="!isUploadingBatch" class="border-2 border-dashed border-amber-300 dark:border-amber-900/60 rounded-2xl p-6 text-center bg-amber-50/40 dark:bg-amber-950/10 hover:bg-amber-50/80 transition cursor-pointer"
               @dragover.prevent @drop.prevent="handleFileDrop">
            <input type="file" multiple accept="image/*" ref="directFileInput" class="hidden" @change="handleFileSelect">
            <div @click="$refs.directFileInput.click()" class="space-y-2 cursor-pointer">
              <span class="text-3xl block">📤</span>
              <p class="text-xs font-bold text-[#2D1B14] dark:text-slate-200">Klik atau Seret File Foto ke Sini</p>
              <p class="text-[10px] text-[#8A7A72] dark:text-slate-400">Format: JPG, PNG, WEBP, HEIC (bisa puluhan file sekaligus)</p>
            </div>
          </div>

          <!-- File Queue List & Progress -->
          <div v-if="selectedUploadFiles.length > 0" class="space-y-2 max-h-48 overflow-y-auto pr-1">
            <div v-for="(f, idx) in selectedUploadFiles" :key="idx" class="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-950 rounded-xl text-xs border border-gray-100 dark:border-slate-800">
              <span class="truncate max-w-[200px] font-medium text-slate-700 dark:text-slate-300">{{ f.name }}</span>
              <div class="flex items-center gap-2 shrink-0">
                <span class="text-[10px] text-gray-400">{{ (f.size / (1024*1024)).toFixed(1) }} MB</span>
                <span v-if="f.status === 'success'" class="text-xs text-emerald-600 font-bold">✓ Ter-upload</span>
                <span v-else-if="f.status === 'uploading'" class="loading-spinner !w-3 !h-3 !border-amber-600"></span>
                <span v-else-if="f.status === 'error'" class="text-[10px] text-rose-500 font-bold truncate max-w-[180px]" :title="f.errorMessage">⚠️ {{ f.errorMessage || 'Error' }}</span>
                <span v-else class="text-[10px] text-gray-400">Antrean</span>
              </div>
            </div>
          </div>

          <!-- Alert Result -->
          <div v-if="uploadBatchSuccess && selectedUploadFiles.every(f => f.status === 'success')" class="p-3 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-900 text-xs font-semibold">
            ✓ Semua file berhasil ter-upload ke Google Drive! Status & timeline client otomatis diperbarui.
          </div>
          <div v-else-if="uploadBatchSuccess && selectedUploadFiles.some(f => f.status === 'error')" class="p-3 bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-900 text-xs font-semibold">
            ⚠️ Sebagian file gagal diunggah. Periksa koneksi atau kuota Google Drive Anda.
          </div>

          <!-- Buttons -->
          <div class="flex gap-2 pt-2">
            <button type="button" @click="closeDirectUploadModal" class="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer">Tutup</button>
            <button type="button" @click="startBatchUpload" :disabled="selectedUploadFiles.length === 0 || isUploadingBatch"
                    class="flex-1 px-4 py-2.5 bg-[#111E35] text-[#D4AF37] rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md hover:bg-[#111E35]/90 disabled:opacity-40 cursor-pointer">
              <span v-if="!isUploadingBatch">⚡ Mulai Upload ({{ selectedUploadFiles.length }} File)</span>
              <span v-else>Mengunggah {{ currentUploadIndex + 1 }}/{{ selectedUploadFiles.length }}...</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- FLOATING BACKGROUND UPLOAD WIDGET (Minimized Mode) -->
    <div v-if="isUploadingBatch && isMinimizedUploadWidget"
         class="fixed bottom-6 right-6 z-50 bg-[#111E35] text-white p-4 rounded-2xl shadow-2xl border border-[#D4AF37]/50 w-80 animate-slide-up backdrop-blur-md">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <span class="animate-spin text-base">⚡</span>
          <div>
            <p class="text-xs font-bold text-[#D4AF37]">Mengunggah Foto ke Drive...</p>
            <p class="text-[10px] text-slate-300">{{ directUploadItem?.client_name }} — {{ currentUploadIndex + 1 }} dari {{ selectedUploadFiles.length }} File</p>
          </div>
        </div>
        <button @click="isMinimizedUploadWidget = false; showDirectUploadModal = true" class="px-2.5 py-1 bg-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/30 rounded-lg text-[10px] font-bold transition cursor-pointer">
          ↖️ Perbesar
        </button>
      </div>

      <!-- Progress Bar -->
      <div class="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-1.5 border border-slate-700">
        <div class="bg-gradient-to-r from-amber-500 to-emerald-400 h-full transition-all duration-300" :style="{ width: uploadProgressPercent + '%' }"></div>
      </div>

      <div class="flex justify-between items-center text-[9px] text-slate-400 font-mono">
        <span class="truncate max-w-[180px]">{{ selectedUploadFiles[currentUploadIndex]?.name }}</span>
        <span class="font-bold text-emerald-400">{{ uploadProgressPercent }}%</span>
      </div>
    </div>

    <!-- MODAL POPUP: UPLOAD SELESAI & SIAP KIRIM KE TIMELINE -->
    <div v-if="showUploadCompletionModal && uploadCompletionData"
         class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
         @click.self="showUploadCompletionModal = false">
      <div class="card w-full max-w-md p-6 animate-pop dark:bg-slate-900 dark:border-slate-800 text-center relative shadow-2xl space-y-4">
        <button @click="showUploadCompletionModal = false" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold transition cursor-pointer">✕</button>

        <div class="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-3xl flex items-center justify-center mx-auto text-3xl shadow-inner border border-emerald-200/50">
          🎉
        </div>

        <div>
          <h3 class="font-extrabold text-lg text-slate-900 dark:text-slate-100">Upload {{ uploadCompletionData.target_label }} Selesai!</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
            <strong>{{ uploadCompletionData.file_count }} File foto</strong> untuk <strong>{{ uploadCompletionData.client_name }}</strong> telah tersimpan rapi di Google Drive.
          </p>
        </div>

        <!-- Status & Next Action Recommendation -->
        <div class="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/60 rounded-2xl text-left space-y-1.5">
          <div class="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
            <span>🟢 Status: Drive Ready & Ter-link</span>
            <span class="text-[10px] bg-emerald-200/60 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full font-bold">Siap Publish</span>
          </div>
          <p class="text-[11px] text-emerald-700 dark:text-emerald-400">
            Link Drive telah terhubung secara otomatis. Klik tombol di bawah untuk mempublikasikan / mengirim ke timeline tracking client.
          </p>
        </div>

        <!-- Action Buttons -->
        <div class="space-y-2 pt-1">
          <button v-if="uploadCompletionData.target === 'staging'"
                  @click="publishStaging(uploadCompletionData.item); showUploadCompletionModal = false"
                  class="w-full py-3 bg-[#111E35] hover:bg-[#1A2B4C] text-[#D4AF37] rounded-xl text-xs font-bold transition shadow-lg flex items-center justify-center gap-2 cursor-pointer">
            <span>🚀 Publish Staging ke Timeline Client Sekarang</span>
          </button>

          <button v-else-if="uploadCompletionData.target === 'highlight'"
                  @click="publishHighlight(uploadCompletionData.item); showUploadCompletionModal = false"
                  class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-lg flex items-center justify-center gap-2 cursor-pointer">
            <span>✨ Push Highlight ke Timeline Client Sekarang</span>
          </button>

          <button v-else-if="uploadCompletionData.target === 'final'"
                  @click="openDeliverModal(uploadCompletionData.item); showUploadCompletionModal = false"
                  class="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-lg flex items-center justify-center gap-2 cursor-pointer">
            <span>📩 Kirim Hasil Final Edit ke Client</span>
          </button>

          <button @click="showUploadCompletionModal = false"
                  class="w-full py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer">
            Tutup (Nanti Saja)
          </button>
        </div>
      </div>
    </div>

    <!-- Mode 1: Portfolio dibuat otomatis saat Push Highlight — modal manual sudah dihapus -->

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useUploadStore } from '../stores/upload'
import { useDirectUpload } from '../composables/useDirectUpload'
import { confirmDialog, alertDialog, showToast } from '../utils/dialog'

const router = useRouter()
const authStore = useAuthStore()
const uploadStore = useUploadStore()
const { startDirectUpload } = useDirectUpload()

const API = '/api/admin'
const data = ref([])
const loading = ref(true)
const submitting = ref(false)

// Sorting State & Logic
const sortBy = ref('client_name')
const sortDesc = ref(false)

function handleSort(columnKey) {
  if (sortBy.value === columnKey) {
    sortDesc.value = !sortDesc.value
  } else {
    sortBy.value = columnKey
    sortDesc.value = false
  }
}

const stageRankMap = {
  'Menunggu Staging Upload': 1,
  'Menunggu File dari FG': 1,
  'Staging Gagal (0 Foto)': 2,
  'Menunggu Push Staging': 3,
  'Memindai Folder Drive': 4,
  'Proses Import Staging': 4,
  'Menunggu Pilihan Client': 5,
  'Proses Edit Highlight': 6,
  'Highlight Siap': 7,
  'Proses Edit Final': 8,
  'Terkirim ke Client (Final)': 9,
  'Selesai': 10
}

function getActionPriority(item) {
  if (!item) return 99
  const status = item.pp_status || ''
  if (status.includes('Final') || status === 'Highlight Siap') return 1
  if (status === 'Proses Edit Highlight') return 2
  if (status === 'Menunggu Push Staging') return 3
  if (status === 'Menunggu Pilihan Client') return 4
  if (status.includes('Staging') || status.includes('FG')) return 5
  if (status === 'Selesai') return 6
  return 10
}

const sortedData = computed(() => {
  const list = [...data.value]
  if (!sortBy.value) return list

  return list.sort((a, b) => {
    let valA, valB

    if (sortBy.value === 'client_name') {
      valA = (a.client_name || '').toLowerCase()
      valB = (b.client_name || '').toLowerCase()
    } else if (sortBy.value === 'fg_name') {
      valA = (a.fg_name || '').toLowerCase()
      valB = (b.fg_name || '').toLowerCase()
    } else if (sortBy.value === 'pp_status') {
      valA = stageRankMap[a.pp_status] || 99
      valB = stageRankMap[b.pp_status] || 99
    } else if (sortBy.value === 'payment_status') {
      valA = a.balance_status === 'paid' ? 2 : (a.dp_status === 'paid' ? 1 : 0)
      valB = b.balance_status === 'paid' ? 2 : (b.dp_status === 'paid' ? 1 : 0)
    } else if (sortBy.value === 'drive_status') {
      valA = (a.staged_photo_count || 0) + (a.highlight_photo_count || 0) + (a.final_photo_count || 0)
      valB = (b.staged_photo_count || 0) + (b.highlight_photo_count || 0) + (b.final_photo_count || 0)
    } else if (sortBy.value === 'action') {
      valA = getActionPriority(a)
      valB = getActionPriority(b)
    } else {
      valA = a[sortBy.value] || ''
      valB = b[sortBy.value] || ''
    }

    if (valA < valB) return sortDesc.value ? 1 : -1
    if (valA > valB) return sortDesc.value ? -1 : 1
    return 0
  })
})

// Direct Web Upload Modal State
const driveOAuthConnected = ref(false)
const showDirectUploadModal = ref(false)
const directUploadItem = ref(null)
const uploadTarget = ref('staging')
const selectedUploadFiles = ref([])
const currentUploadIndex = ref(0)
const uploadBatchSuccess = ref(false)
const directFileInput = ref(null)
const isUploadingBatch = ref(false)
const isMinimizedUploadWidget = ref(false)

const showUploadCompletionModal = ref(false)
const uploadCompletionData = ref(null)

const lastUploadedBookingId = ref(null)
const lastUploadedTarget = ref(null)
const lastUploadedCount = ref(0)
const lastUploadedCountsByBooking = ref({})

function isItemUploading(item) {
  if (!item) return false
  const rowId = item.booking_id || item.id
  if (rowId == null) return false

  // Check uploadStore tasks
  const inStore = uploadStore?.activeTasks?.some(t => String(t.bookingId) === String(rowId))
  // Check local batch modal upload
  const inBatch = isUploadingBatch.value && directUploadItem.value && String(directUploadItem.value.booking_id || directUploadItem.value.id) === String(rowId)
  return !!(inStore || inBatch)
}

function getItemUploadProgress(item) {
  if (!item) return ''
  const rowId = item.booking_id || item.id
  if (rowId == null) return ''
  const storeTasks = uploadStore?.uploadQueue?.filter(t => String(t.bookingId) === String(rowId)) || []
  if (storeTasks.length > 0) {
    const done = storeTasks.filter(t => t.status === 'completed' || t.status === 'error').length
    return `(${done}/${storeTasks.length})`
  }
  if (isUploadingBatch.value && directUploadItem.value && String(directUploadItem.value.booking_id || directUploadItem.value.id) === String(rowId)) {
    return `(${currentUploadIndex.value + 1}/${selectedUploadFiles.value.length})`
  }
  return ''
}

function isItemJustUploaded(item) {
  if (!lastUploadedBookingId.value || !item) return false
  const rowId = item.booking_id || item.id
  return rowId != null && String(lastUploadedBookingId.value) === String(rowId)
}

const uploadProgressPercent = computed(() => {
  if (!selectedUploadFiles.value.length) return 0
  const finishedCount = selectedUploadFiles.value.filter(f => f.status === 'success' || f.status === 'error').length
  return Math.min(100, Math.round((finishedCount / selectedUploadFiles.value.length) * 100))
})

function minimizeDirectUploadModal() {
  isMinimizedUploadWidget.value = true
  showDirectUploadModal.value = false
}

async function checkDriveOAuthStatus() {
  try {
    const res = await fetch(`${API}/settings/drive-status`, { credentials: 'include' })
    if (res.ok) {
      const d = await res.json()
      driveOAuthConnected.value = !!(d.oauth_connected || d.driveOAuthConnected || d.mode === 'direct_web_upload')
    }
  } catch (e) {
    driveOAuthConnected.value = false
  }
}
const uploadModalTitle = computed(() => {
  if (uploadTarget.value === 'staging') return '📁 Upload Foto Staging (Galeri Seleksi Mentah)'
  if (uploadTarget.value === 'highlight') return '⭐ Upload Foto Highlight (Fast Editing)'
  if (uploadTarget.value === 'final') return '📦 Upload Final Edit'
  return '📤 Upload Foto ke Google Drive'
})

const uploadTargetIcon = computed(() => {
  if (uploadTarget.value === 'staging') return '📁'
  if (uploadTarget.value === 'highlight') return '⭐'
  if (uploadTarget.value === 'final') return '📦'
  return '📤'
})

function openDirectUploadModal(item, target = 'staging') {
  directUploadItem.value = item
  uploadTarget.value = target
  selectedUploadFiles.value = []
  isUploadingBatch.value = false
  isMinimizedUploadWidget.value = false
  currentUploadIndex.value = 0
  uploadBatchSuccess.value = false
  showDirectUploadModal.value = true
}

function closeDirectUploadModal() {
  if (isUploadingBatch.value) {
    minimizeDirectUploadModal()
    return
  }
  showDirectUploadModal.value = false
  isMinimizedUploadWidget.value = false
  directUploadItem.value = null
  selectedUploadFiles.value = []
}

function handleFileSelect(e) {
  const files = Array.from(e.target.files || [])
  addFilesToQueue(files)
}

function handleFileDrop(e) {
  const files = Array.from(e.dataTransfer?.files || [])
  addFilesToQueue(files)
}

function addFilesToQueue(files) {
  const validFiles = files.filter(f => f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|heic|cr2|nef|arw)$/i.test(f.name))
  const formatted = validFiles.map(f => ({
    file: f,
    name: f.name,
    size: f.size,
    status: 'pending',
    errorMessage: ''
  }))
  selectedUploadFiles.value = [...selectedUploadFiles.value, ...formatted]
}

async function confirmShootDoneByAdmin(item) {
  if (!item) return
  const bookingId = item.booking_id || item.id
  const confirmed = await confirmDialog(
    'Terima File / Berkas Foto?',
    `Konfirmasi bahwa file foto dari FG untuk ${item.client_name} telah diterima? Status akan diperbarui ke 'Menunggu Upload Staging'.`,
    'Ya, Terima File'
  )
  if (!confirmed) return

  try {
    const res = await fetch(`${API}/bookings/${bookingId}/activate-gallery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    })
    const dataRes = await res.json()
    if (res.ok && dataRes.success) {
      showToast(dataRes.message || 'File/berkas foto diterima! Silakan unggah ke Drive Staging.', 'success')
      await load()
    } else {
      alertDialog('Gagal', dataRes.error || 'Gagal mengonfirmasi file diterima')
    }
  } catch (err) {
    alertDialog('Error', err.message)
  }
}

async function startBatchUpload() {
  if (!directUploadItem.value || selectedUploadFiles.value.length === 0) return

  const bookingId = directUploadItem.value.booking_id || directUploadItem.value.id
  const targetType = uploadTarget.value === 'staging' ? 'jpg' : uploadTarget.value
  const rawFiles = selectedUploadFiles.value.map(f => f.file).filter(Boolean)

  if (rawFiles.length > 0) {
    startDirectUpload(rawFiles, bookingId, targetType)
    showDirectUploadModal.value = false
    selectedUploadFiles.value = []
    return
  }

  for (let i = 0; i < selectedUploadFiles.value.length; i++) {
    currentUploadIndex.value = i
    const item = selectedUploadFiles.value[i]
    item.status = 'uploading'

    const formData = new FormData()
    formData.append('file', item.file)

    const isLastFile = i === selectedUploadFiles.value.length - 1
    const autoScrapeParam = (uploadTarget.value === 'staging' && isLastFile) ? '&auto_scrape=true' : ''

    try {
      const res = await fetch(`${API}/bookings/${bookingId}/upload-to-drive?target=${uploadTarget.value}${autoScrapeParam}`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      })
      const dataRes = await res.json()
      if (res.ok && dataRes.success) {
        item.status = 'success'
      } else {
        item.status = 'error'
        item.errorMessage = dataRes.error || 'Gagal Upload'
      }
    } catch (err) {
      item.status = 'error'
      item.errorMessage = err.message || 'Network Error'
    }
  }

  isUploadingBatch.value = false
  uploadBatchSuccess.value = true
  isMinimizedUploadWidget.value = false

  const successCount = selectedUploadFiles.value.filter(f => f.status === 'success').length
  if (successCount > 0 && directUploadItem.value) {
    const key = `${bookingId}_${uploadTarget.value}`
    lastUploadedCountsByBooking.value[key] = (lastUploadedCountsByBooking.value[key] || 0) + successCount

    lastUploadedBookingId.value = bookingId
    lastUploadedTarget.value = uploadTarget.value
    lastUploadedCount.value = successCount

    if (directUploadItem.value) {
      if (uploadTarget.value === 'staging') {
        directUploadItem.value.staged_photo_count = (directUploadItem.value.staged_photo_count || 0) + successCount
      } else if (uploadTarget.value === 'highlight') {
        directUploadItem.value.highlight_photo_count = (directUploadItem.value.highlight_photo_count || 0) + successCount
      } else if (uploadTarget.value === 'final') {
        directUploadItem.value.final_photo_count = (directUploadItem.value.final_photo_count || 0) + successCount
      }
    }

    const found = data.value.find(x => (x.booking_id || x.id) === bookingId)
    if (found) {
      if (uploadTarget.value === 'staging') {
        found.staged_photo_count = (found.staged_photo_count || 0) + successCount
      } else if (uploadTarget.value === 'highlight') {
        found.highlight_photo_count = (found.highlight_photo_count || 0) + successCount
      } else if (uploadTarget.value === 'final') {
        found.final_photo_count = (found.final_photo_count || 0) + successCount
      }
    }

    uploadCompletionData.value = {
      client_name: directUploadItem.value.client_name,
      booking_id: bookingId,
      target: uploadTarget.value,
      target_label: uploadTarget.value === 'staging' ? 'Staging Mentah' : (uploadTarget.value === 'highlight' ? 'Photo Highlight' : 'Final Edit'),
      file_count: successCount,
      item: directUploadItem.value
    }
    showUploadCompletionModal.value = true
  }

  await load()
}

function getDriveUploadTarget(item) {
  if (!item) return 'staging'
  if (['ready', 'submitted'].includes(item.selection_status) || item.pp_status === 'Proses Edit Highlight') {
    return 'highlight'
  }
  if (['cleaned', 'Highlight Siap', 'Selesai'].includes(item.selection_status) || ['Highlight Siap', 'Terkirim ke Client (Final)', 'delivered', 'completed'].includes(item.pp_status)) {
    return 'final'
  }
  return 'staging'
}

function getUploadedFileCountLabel(item, target) {
  if (!item) return ''
  const id = item.booking_id || item.id
  const key = `${id}_${target}`

  let count = lastUploadedCountsByBooking.value[key] || 0

  if (target === 'staging') {
    count = count || item.staged_photo_count || 0
  } else if (target === 'highlight') {
    count = count || item.highlight_photo_count || 0
  } else if (target === 'final') {
    count = count || item.final_photo_count || 0
  }

  if (!count || count <= 0) return ''
  return `(${count} File)`
}

function getDriveUploadButton(item) {
  if (!item) return null

  const isFinalDelivered = ['Terkirim ke Client (Final)', 'delivered', 'completed', 'Selesai'].includes(item.pp_status) || ['delivered', 'completed'].includes(item.booking_status || item.status)
  const isStagingDone = isFinalDelivered || ['staged', 'ready', 'submitted', 'cleaned'].includes(item.selection_status) || ['Menunggu Push Staging', 'Menunggu Pilihan Client', 'Client Memilih', 'Proses Edit Highlight', 'Highlight Siap', 'Selesai'].includes(item.pp_status)
  const isSelectionSubmitted = isFinalDelivered || ['submitted', 'cleaned'].includes(item.selection_status) || ['Proses Edit Highlight', 'Highlight Siap', 'Selesai'].includes(item.pp_status)
  const isHighlightDone = isFinalDelivered || !!(item.highlight_drive_url_unlocked || ['Highlight Siap', 'Terkirim ke Client (Final)', 'Selesai', 'delivered', 'completed'].includes(item.pp_status))

  // 4. TAHAP 4: Selesai / Terkirim ke Client
  if (isFinalDelivered) {
    return {
      target: 'final',
      label: 'Seluruh File Terkirim',
      icon: '✅',
      url: item.download_url || item.drive_parent_url,
      bgClass: 'bg-emerald-700 hover:bg-emerald-800',
      title: 'Seluruh file foto telah terkirim ke timeline klien. Klik untuk buka folder Drive'
    }
  }

  // 1. TAHAP 1: Unggah JPG Staging (Galeri Seleksi Foto Mentah)
  if (!isStagingDone && item.staging_drive_url) {
    return {
      target: 'staging',
      label: 'Upload JPG / Galeri Photo',
      icon: '📁',
      url: item.staging_drive_url,
      bgClass: 'bg-amber-600 hover:bg-amber-700',
      title: 'Buka Subfolder Staging JPG di Google Drive untuk upload foto mentah'
    }
  }

  // TAHAP INTERMEDIATE: Client belum selesai memilih foto (selection_status === 'ready' / Menunggu Pilihan Client)
  if (item.selection_status === 'ready' || item.pp_status === 'Menunggu Pilihan Client') {
    return {
      target: 'staging',
      label: 'Menunggu Pilihan Client',
      icon: '⏳',
      url: item.staging_drive_url || item.drive_parent_url,
      bgClass: 'bg-slate-400 dark:bg-slate-700 text-white cursor-not-allowed opacity-80',
      disabled: true,
      title: 'Client belum selesai memilih foto. Upload highlight baru bisa dilakukan setelah client mengirimkan pilihan foto.'
    }
  }

  // 2. TAHAP 2: Unggah Hasil Photo Highlight (Fast Editing) — Hanya aktif jika pilihan foto sudah disubmit
  if (isSelectionSubmitted && !isHighlightDone && item.highlight_drive_url) {
    return {
      target: 'highlight',
      label: 'Upload Highlight',
      icon: '⭐',
      url: item.highlight_drive_url,
      bgClass: 'bg-indigo-600 hover:bg-indigo-700',
      title: 'Buka Subfolder Highlight di Google Drive untuk upload foto editan cepat'
    }
  }

  // 3. TAHAP 3: Unggah Final All Edited Photos (Otomatis aktif setelah Highlight selesai dipush / dilakukan)
  if (isHighlightDone || item.download_url) {
    return {
      target: 'final',
      label: 'Upload Final Edit',
      icon: '📦',
      url: item.download_url || item.drive_parent_url,
      bgClass: 'bg-emerald-600 hover:bg-emerald-700',
      title: 'Buka Subfolder Final Editing di Google Drive'
    }
  }

  // Fallback ke Master Folder
  if (item.drive_parent_url) {
    return {
      target: 'staging',
      label: 'Buka Master Folder',
      icon: '🔗',
      url: item.drive_parent_url,
      bgClass: 'bg-slate-700 hover:bg-slate-800',
      title: 'Buka Folder Utama Client di Google Drive'
    }
  }

  return null
}

// 0. Selection Detail Modal State
const showSelectionModal = ref(false)
const selectionItem = ref(null)
const copyToast = ref('')
const copiedType = ref('')
const reopenAddPhotos = ref(0)

// Computed: Stripped file extensions for editor RAW match
const selectionListNoExt = computed(() => {
  if (!selectionItem.value || !Array.isArray(selectionItem.value.selected_photos)) return []
  return selectionItem.value.selected_photos.map(filename => {
    return String(filename).replace(/\.[^/.]+$/, '')
  })
})

function openSelectionDetailModal(item) {
  selectionItem.value = item
  copyToast.value = ''
  copiedType.value = ''
  showSelectionModal.value = true
}

function copySpaceSeparated() {
  const text = selectionListNoExt.value.join(' ')
  navigator.clipboard.writeText(text)
  copiedType.value = 'lightroom'
  setTimeout(() => {
    showSelectionModal.value = false
    copiedType.value = ''
  }, 1000)
}

function copyOrSeparated() {
  const text = selectionListNoExt.value.join(' OR ')
  navigator.clipboard.writeText(text)
  copiedType.value = 'finder'
  setTimeout(() => {
    showSelectionModal.value = false
    copiedType.value = ''
  }, 1000)
}

async function cleanStagingDisk(item) {
  if (!item) return
  const ok = await confirmDialog({
    title: 'Bersihkan Folder Staging?',
    text: 'Apakah Anda yakin ingin membersihkan folder foto staging dari disk server?',
    isDanger: true,
    confirmButtonText: 'Ya, Bersihkan'
  })
  if (!ok) return

  try {
    const res = await fetch(`/api/admin/bookings/${item.booking_id}/clean-staging`, {
      method: 'POST',
      credentials: 'include'
    })
    const d = await res.json()
    if (res.ok) {
      showToast(d.message || 'Folder staging dibersihkan!', 'success')
      showSelectionModal.value = false
      await load()
    } else {
      alertDialog('Gagal', d.error || 'Gagal membersihkan staging', 'error')
    }
  } catch (e) {
    alertDialog('Error', 'Error: ' + e.message, 'error')
  }
}

async function reopenSelection(item) {
  // Deprecated - moved to modal
}

async function reopenSelectionInModal() {
  if (!selectionItem.value) return
  const item = selectionItem.value
  const addCount = reopenAddPhotos.value || 0
  
  let confirmMsg = `Apakah Anda yakin ingin membuka kembali galeri seleksi untuk '${item.client_name}'?`
  if (addCount > 0) {
    confirmMsg += `\n\nKuota foto pilihan client akan DITAMBAH sebanyak +${addCount} foto.`
  }
  
  const ok = await confirmDialog({
    title: 'Buka Kembali Galeri Seleksi?',
    text: confirmMsg,
    confirmButtonText: 'Ya, Buka Kembali'
  })
  if (!ok) return
  
  try {
    const res = await fetch(`${API}/bookings/${item.booking_id}/reopen-selection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ additional_photos: addCount }),
      credentials: 'include'
    })
    const d = await res.json()
    if (res.ok) {
      showToast('Galeri seleksi berhasil dibuka kembali untuk client!', 'success')
      showSelectionModal.value = false
      reopenAddPhotos.value = 0
      await load()
    } else {
      alertDialog('Gagal', d.error || 'Gagal membuka kembali galeri seleksi', 'error')
    }
  } catch (e) {
    alertDialog('Error Connection', 'Terjadi kesalahan koneksi.', 'error')
  }
}

async function proceedToHighlight(item) {
  if (!item) return
  showSelectionModal.value = false
  openHighlightModal(item)
}

// 1. Staging modal state
const showStagingModal = ref(false)
const stagingItem = ref(null)
const stagingForm = ref({ staging_drive_url: '' })
const stagingResult = ref(null)

// 2. Highlight modal state
const showHighlightModal = ref(false)
const highlightItem = ref(null)
const highlightForm = ref({ highlight_drive_url: '' })
const highlightResult = ref(null)

// 3. Deliver modal state
const showDeliverModal = ref(false)
const deliverItem = ref(null)
const deliverForm = ref({ download_url: '', password: '' })
const deliverResult = ref(null)

// 4. Verification modal state
const showVerifyModal = ref(false)
const verifyItem = ref(null)
const verifyUrl = ref('')

function isPdf(url) {
  return url && url.toLowerCase().endsWith('.pdf')
}

async function openVerifyModal(item) {
  verifyItem.value = item
  verifyUrl.value = item.balance_bukti_url || ''
  if (!item.balance_bukti_url) {
    if (await confirmDialog('Verifikasi Pelunasan?', `Verifikasi pelunasan secara manual untuk client ${item.client_name}?`)) {
      submitVerification()
    }
  } else {
    showVerifyModal.value = true
  }
}

async function submitVerification() {
  const item = verifyItem.value
  try {
    const r = await fetch(`${API}/bookings/${item.booking_id}/verify-balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ balance_bukti_url: item.balance_bukti_url })
    })
    const d = await r.json()
    if (d.booking || d.status === 'ok') {
      showVerifyModal.value = false
      verifyItem.value = null
      await load()
      
      const link = d.wa_link_client || d.wa_link
      if (link) {
        window.open(link, '_blank')
      }
    } else {
      alertDialog('Verifikasi Gagal', d.error || 'Verifikasi gagal', 'error')
    }
  } catch (e) {
    alertDialog('Error', 'Error: ' + e.message, 'error')
  }
}

async function publishStaging(item) {
  if (!item) return
  const ok = await confirmDialog({
    title: 'Publikasikan Galeri Seleksi?',
    text: `Publikasikan galeri seleksi untuk client ${item.client_name}? Klien akan dapat membuka galeri seleksi di halaman tracking.`,
    confirmButtonText: 'Ya, Publikasikan'
  })
  if (!ok) return

  try {
    const res = await fetch(`${API}/bookings/${item.booking_id}/publish-staging`, {
      method: 'POST',
      credentials: 'include'
    })
    const d = await res.json()
    if (res.ok) {
      showToast(d.message || 'Galeri seleksi telah dipublikasikan!', 'success')
      await load()
    } else {
      alertDialog('Gagal Publikasi', d.error || 'Gagal mempublikasikan galeri staging', 'error')
    }
  } catch (e) {
    alertDialog('Error Connection', 'Error: ' + e.message, 'error')
  }
}

async function publishHighlight(item) {
  if (!item) return
  const driveUrl = item.highlight_drive_url || item.drive_parent_url
  if (!driveUrl) {
    alertDialog('Perhatian', 'Link folder Highlight belum diatur.', 'warning')
    return
  }
  const ok = await confirmDialog({
    title: 'Publikasikan Foto Highlight?',
    text: `Publikasikan foto highlight untuk client ${item.client_name}? Hasil highlight akan dapat dilihat di timeline tracking, dan otomatis diproses ke Portofolio Studio (Draft).`,
    confirmButtonText: 'Ya, Publikasikan'
  })
  if (!ok) return

  try {
    const res = await fetch(`${API}/bookings/${item.booking_id}/upload-highlight-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ highlight_drive_url: driveUrl })
    })
    const d = await res.json()
    if (res.ok) {
      showToast('Foto highlight berhasil dipublikasikan!', 'success')
      // Backend send-highlight-link sudah otomatis:
      // 1. Buat portfolio_items record (published=0, Draft)
      // 2. Trigger importPortfolioFromDrive() background service
      // Tidak perlu trigger manual lagi dari frontend.

      await load()
    } else {
      alertDialog('Gagal Publikasi', d.error || 'Gagal mempublikasikan foto highlight', 'error')
    }
  } catch (e) {
    alertDialog('Error Connection', 'Error: ' + e.message, 'error')
  }
}

async function publishFinal(item) {
  if (!item) return
  const driveUrl = item.download_url || item.drive_parent_url
  if (!driveUrl) {
    alertDialog('Perhatian', 'Link folder Final Edit belum diatur.', 'warning')
    return
  }
  const ok = await confirmDialog({
    title: 'Publikasikan Foto Final Edit?',
    text: `Publikasikan foto Final Edit untuk client ${item.client_name}? Hasil akhir foto akan dapat dibuka oleh klien di halaman tracking.`,
    confirmButtonText: 'Ya, Publikasikan'
  })
  if (!ok) return

  try {
    const res = await fetch(`${API}/bookings/${item.booking_id}/unlock-final-editing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        download_url: driveUrl,
        password: item.download_password || String(Math.floor(1000 + Math.random() * 9000))
      })
    })
    const d = await res.json()
    if (res.ok) {
      showToast('Foto Final Edit berhasil dipublikasikan!', 'success')
      await load()
    } else {
      alertDialog('Gagal Publikasi', d.error || 'Gagal mempublikasikan foto Final Edit', 'error')
    }
  } catch (e) {
    alertDialog('Error Connection', 'Error: ' + e.message, 'error')
  }
}

function ppStatusDisplay(s) {
  if (s === 'Menunggu File dari FG') return 'Menunggu File / Berkas'
  if (s === 'Menunggu Staging Upload') return 'Menunggu Upload Staging'
  return s || '-'
}

function ppStatusClass(s) {
  if (s === 'Terkirim ke Client (Final)') return 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400 border border-green-200 font-bold'
  if (s === 'Highlight Siap') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200 font-bold'
  if (s === 'Proses Edit Highlight') return 'bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 border border-purple-200 font-bold'
  if (s === 'Menunggu Pilihan Client') return 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-200 font-bold'
  if (s === 'Menunggu Push Staging') return 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 font-bold shadow-sm animate-pulse'
  if (s === 'Proses Import Staging') return 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 font-bold shadow-sm animate-pulse'
  if (s === 'Menunggu Staging Upload') return 'bg-sky-50 text-sky-700 dark:bg-sky-950/20 dark:text-sky-400 border border-sky-200 font-semibold'
  if (s === 'Menunggu File dari FG') return 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 font-bold shadow-sm animate-pulse'
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
}

async function load(silent = false) {
  if (!silent) loading.value = true
  try {
    const r = await fetch(`${API}/deliverables`, { credentials: 'include' })
    const result = await r.json()
    const list = result.data || []

    list.forEach(item => {
      const id = item.booking_id || item.id
      const stagingKey = `${id}_staging`
      const highlightKey = `${id}_highlight`
      const finalKey = `${id}_final`

      if (lastUploadedCountsByBooking.value[stagingKey] && (!item.staged_photo_count || item.staged_photo_count < lastUploadedCountsByBooking.value[stagingKey])) {
        item.staged_photo_count = lastUploadedCountsByBooking.value[stagingKey]
      }
      if (lastUploadedCountsByBooking.value[highlightKey] && (!item.highlight_photo_count || item.highlight_photo_count < lastUploadedCountsByBooking.value[highlightKey])) {
        item.highlight_photo_count = lastUploadedCountsByBooking.value[highlightKey]
      }
      if (lastUploadedCountsByBooking.value[finalKey] && (!item.final_photo_count || item.final_photo_count < lastUploadedCountsByBooking.value[finalKey])) {
        item.final_photo_count = lastUploadedCountsByBooking.value[finalKey]
      }
    })

    data.value = list
  } catch (e) {
    console.error(e)
  }
  if (!silent) loading.value = false
}

// Modal Staging Handlers
function openStagingModal(item) {
  stagingItem.value = item
  stagingForm.value = { staging_drive_url: item.staging_drive_url || '' }
  stagingResult.value = null
  showStagingModal.value = true
}

function closeStagingModal() {
  showStagingModal.value = false
  stagingItem.value = null
  stagingResult.value = null
}

async function submitStaging() {
  if (!stagingForm.value.staging_drive_url) return
  submitting.value = true
  try {
    const res = await fetch(`${API}/bookings/${stagingItem.value.booking_id}/upload-raw-photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ staging_drive_url: stagingForm.value.staging_drive_url })
    })
    const d = await res.json()
    if (res.ok) {
      stagingResult.value = d
      await load()
    } else {
      alert(d.error || 'Gagal menyimpan link staging')
    }
  } catch (e) {
    alert('Terjadi kesalahan koneksi.')
  }
  submitting.value = false
}

// Modal Highlight Handlers
function openHighlightModal(item) {
  highlightItem.value = item
  highlightForm.value = { highlight_drive_url: item.highlight_drive_url || '' }
  highlightResult.value = null
  showHighlightModal.value = true
}

function closeHighlightModal() {
  showHighlightModal.value = false
  highlightItem.value = null
  highlightResult.value = null
}

async function submitHighlight() {
  if (!highlightForm.value.highlight_drive_url) return
  submitting.value = true
  try {
    const bookingId = highlightItem.value.booking_id || highlightItem.value.id
    const res = await fetch(`${API}/bookings/${bookingId}/drive-urls`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ highlight_drive_url: highlightForm.value.highlight_drive_url })
    })
    const d = await res.json()
    if (res.ok) {
      highlightResult.value = { message: 'Link Highlight tersimpan! Klik tombol "Push Highlight" di tabel jika siap mempublikasikan ke client.' }
      setTimeout(() => {
        closeHighlightModal()
      }, 1200)
      await load(true)
    } else {
      alert(d.error || 'Gagal menyimpan foto highlight')
    }
  } catch (e) {
    alert('Terjadi kesalahan koneksi.')
  }
  submitting.value = false
}

// Modal Deliver Handlers
function openDeliverModal(item) {
  deliverItem.value = item
  deliverForm.value = {
    download_url: item.download_url || '',
    password: item.download_password || String(Math.floor(1000 + Math.random() * 9000))
  }
  deliverResult.value = null
  showDeliverModal.value = true
}

function closeDeliverModal() {
  showDeliverModal.value = false
  deliverItem.value = null
  deliverResult.value = null
}

async function submitDeliver() {
  if (!deliverForm.value.download_url) return
  submitting.value = true
  try {
    const res = await fetch(`${API}/bookings/${deliverItem.value.booking_id}/unlock-final-editing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        download_url: deliverForm.value.download_url,
        password: deliverForm.value.password || (deliverItem.value ? deliverItem.value.download_password : '') || '1234'
      })
    })
    const d = await res.json()
    if (res.ok) {
      deliverResult.value = d
      await load()
    } else {
      alert(d.error || 'Gagal mengirim hasil foto')
    }
  } catch (e) {
    console.error(e)
    alert('Terjadi kesalahan koneksi ke server.')
  }
  submitting.value = false
}

function getWaLink(item) {
  if (!item || !item.client_phone) return '#'
  const token = item.tracking_token || `TRK-${item.booking_id || item.id}`
  const trackingUrl = `${window.location.origin}/tracking.html?code=${encodeURIComponent(token)}`
  const waMessage = `Halo Kak ${item.client_name}! 🎉\n\nFoto wisuda kamu dari ${authStore.companyName} sudah selesai dan siap diakses!\n\n🔍 Halaman Akses Dokumentasi & Tracking:\n${trackingUrl}\n\n🔗 Kode Tracking Client: ${token}\n\nTerima kasih banyak telah berfoto bersama ${authStore.companyName}! 😊`;
  return `https://api.whatsapp.com/send?phone=${item.client_phone}&text=${encodeURIComponent(waMessage)}`;
}

function getWaConfirmLink(item) {
  if (!item || !item.client_phone) return '#'
  const token = item.tracking_token || `TRK-${item.booking_id || item.id}`
  const trackingUrl = `${window.location.origin}/tracking.html?code=${encodeURIComponent(token)}`
  const waMessage = `Halo Kak ${item.client_name}! 😊\n\nApakah file foto wisuda kamu dari ${authStore.companyName} sudah diterima dengan baik?\n\nJika sudah, mohon konfirmasi dengan klik tombol "Saya Sudah Menerima Hasil Foto" di halaman tracking:\n${trackingUrl}\n\nTerima kasih banyak! 🙏`;
  return `https://api.whatsapp.com/send?phone=${item.client_phone}&text=${encodeURIComponent(waMessage)}`;
}

function getWaBillingLink(item) {
  if (!item || !item.client_phone) return '#'
  const token = item.tracking_token || `TRK-${item.booking_id || item.id}`
  const trackingUrl = `${window.location.origin}/tracking.html?code=${encodeURIComponent(token)}`
  const balanceStr = 'Rp ' + (item.balance_amount || 0).toLocaleString('id-ID')
  const waMessage = `Halo Kak ${item.client_name}! 👋\n\nSesi foto wisuda kamu sudah selesai dan sedang diproses. Mohon lakukan pelunasan pembayaran sisa sebesar *${balanceStr}* agar kami dapat memproses dan mengirimkan link download foto final kamu.\n\nKamu bisa mengunggah bukti transfer pelunasan melalui link tracking kamu berikut:\n${trackingUrl}\n\nTerima kasih banyak! 🙏`;
  return `https://api.whatsapp.com/send?phone=${item.client_phone}&text=${encodeURIComponent(waMessage)}`;
}

// Client Detail Modal State & Operations
const clientDetailItem = ref(null)

async function openClientDetailModal(item) {
  if (!item) return
  const id = item.booking_id || item.id
  try {
    const res = await fetch(`${API}/bookings/${id}`, { credentials: 'include' })
    const d = await res.json()
    if (res.ok && d) {
      clientDetailItem.value = d
    } else {
      clientDetailItem.value = item
    }
  } catch (e) {
    clientDetailItem.value = item
  }
}

async function cancelBooking(item) {
  if (!item) return
  const id = item.booking_id || item.id
  const name = item.client_name || 'Client'
  const ok = await confirmDialog({
    title: 'Batalkan Booking Client?',
    text: `Apakah Anda yakin ingin membatalkan booking client '${name}' (Booking #${id})? Data pembayaran & DP akan tetap tersimpan di laporan keuangan, dan jadwal fotografer akan dibebaskan.`,
    isDanger: true,
    confirmButtonText: 'Ya, Batalkan Booking'
  })
  if (!ok) return

  try {
    const res = await fetch(`${API}/bookings/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    })
    const d = await res.json()
    if (!res.ok) {
      alertDialog('Gagal Batal', d.error || 'Gagal membatalkan booking', 'error')
      return
    }
    showToast(d.message || 'Booking berhasil dibatalkan!', 'success')
    clientDetailItem.value = null
    await load()
  } catch (e) {
    console.error('Cancel booking error:', e)
    alertDialog('Error', 'Terjadi kesalahan koneksi.', 'error')
  }
}

async function deleteClient(item) {
  if (!item) return
  const id = item.booking_id || item.id
  const name = item.client_name || 'Client'
  const ok = await confirmDialog({
    title: 'Hapus Data Client?',
    text: `Apakah Anda yakin ingin menghapus data client '${name}' (Booking #${id}) secara permanen? Seluruh data booking, invoice, bukti bayar, dan penugasan fotografer akan dihapus bersih tanpa sisa.`,
    isDanger: true,
    confirmButtonText: 'Ya, Hapus Permanen'
  })
  if (!ok) return

  try {
    const res = await fetch(`${API}/bookings/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    const d = await res.json()
    if (!res.ok) {
      alertDialog('Gagal Hapus', d.error || 'Gagal menghapus client', 'error')
      return
    }
    showToast(d.message || 'Data client berhasil dihapus bersih!', 'success')
    clientDetailItem.value = null
    await load()
  } catch (e) {
    console.error('Delete booking error:', e)
    alertDialog('Error', 'Terjadi kesalahan koneksi.', 'error')
  }
}

async function resetBookingToken(item) {
  if (!item) return
  const id = item.booking_id || item.id
  const ok = await confirmDialog({
    title: 'Reset Token & PIN Tracking?',
    text: `Reset token & PIN tracking untuk ${item.client_name}? Token lama akan hangus dan dibuatkan link baru.`,
    isDanger: true,
    confirmButtonText: 'Ya, Reset'
  })
  if (!ok) return

  try {
    const res = await fetch(`${API}/bookings/${id}/reset-token`, {
      method: 'POST',
      credentials: 'include'
    })
    const d = await res.json()
    if (res.ok && d.tracking_token) {
      item.tracking_token = d.tracking_token
      item.download_password = d.download_password
      if (clientDetailItem.value && (clientDetailItem.value.id === id || clientDetailItem.value.booking_id === id)) {
        clientDetailItem.value.tracking_token = d.tracking_token
        clientDetailItem.value.download_password = d.download_password
      }
      alertDialog({
        title: 'Token Berhasil Direset!',
        html: `<p>Token Baru: <strong class="font-mono text-amber-400">${d.tracking_token}</strong></p><p class="mt-1">PIN Baru: <strong class="font-mono text-emerald-400">${d.download_password}</strong></p>`,
        icon: 'success'
      })
      await load(true)
    } else {
      alertDialog('Gagal', d.error || 'Gagal mereset token.', 'error')
    }
  } catch (e) {
    alertDialog('Error Connection', 'Terjadi kesalahan koneksi.', 'error')
  }
}

function dpClass(status) {
  if (status === 'paid') return 'text-green-600 dark:text-green-400 font-semibold'
  if (status === 'uploaded') return 'text-amber-500 font-semibold'
  return 'text-red-500'
}

function statusClass(status) {
  if (status === 'completed') return 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300'
  if (status === 'confirmed') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
  if (status === 'shooting') return 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
  if (status === 'post_production') return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300'
  if (status === 'delivered') return 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300'
  return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
}

function formatAmPm(timeStr) {
  if (!timeStr) return ''
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return timeStr
  let hours = parseInt(match[1], 10)
  const minutes = match[2]
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  hours = hours ? hours : 12
  const strHours = hours < 10 ? '0' + hours : hours
  return `${strHours}:${minutes} ${ampm}`
}

function getWaConfirmLinkModal(item) {
  if (!item) return '#'
  const id = item.booking_id || item.id
  const invUrl = `${window.location.origin}/invoice.html?id=${id}`
  const msg = `Halo Kak ${item.client_name},\n\nTerima kasih! Pembayaran DP foto wisuda kamu telah kami terima.\nSilakan cek kuitansi / invoice resmi di sini:\n${invUrl}\n\nTerima kasih!`
  return `https://wa.me/${item.client_phone}?text=${encodeURIComponent(msg)}`
}

function getWaTrackingLinkModal(item) {
  if (!item) return '#'
  const token = item.tracking_token || item.download_password || item.booking_id || item.id
  const trackingUrl = `${window.location.origin}/tracking.html?code=${encodeURIComponent(token)}`
  const msg = `Halo Kak ${item.client_name},\n\nBerikut adalah link untuk memantau status dan progres sesi foto wisuda kamu bersama ${authStore.companyName}:\n${trackingUrl}\n\nTerima kasih!`
  return `https://wa.me/${item.client_phone}?text=${encodeURIComponent(msg)}`
}

function waAdminLinkModal(item) {
  if (!item || !item.client_phone) return '#'
  return `https://wa.me/${item.client_phone}`
}

// ============================================================
// JADIKAN PORTOFOLIO — dihapus (Mode 1 sudah otomatis via publishHighlight)
// ============================================================
// Tidak ada state/handler manual lagi — portfolio dibuat otomatis
// saat admin melakukan Push Highlight ke client.

let timer = null
onMounted(() => {
  load()
  checkDriveOAuthStatus()
  timer = setInterval(() => load(true), 3000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>