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
            <th class="p-3 font-medium w-8">#</th>
            <th class="p-3 font-medium">Client</th>
            <th class="p-3 font-medium hidden lg:table-cell">Fotografer</th>
            <th class="p-3 font-medium">Tahap</th>
            <th class="p-3 font-medium">Bayar</th>
            <th class="p-3 font-medium text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in data" :key="item.booking_id"
            class="border-b border-[#E8D5C8]/40 dark:border-slate-800/60 hover:bg-[#FFF8F3] dark:hover:bg-slate-800/40 text-xs transition">

            <td class="p-3 font-mono text-[10px] text-[#C4B0A5] dark:text-slate-500">{{ item.booking_id }}</td>

            <td class="p-3 cursor-pointer" @click="openClientDetailModal(item)">
              <p class="font-semibold text-[#2D1B14] dark:text-slate-200 hover:text-[#C59B63] transition truncate max-w-[160px]">{{ item.client_name || '-' }}</p>
              <p class="text-[10px] text-[#C4B0A5] dark:text-slate-500 truncate max-w-[160px]">{{ item.university || '-' }}</p>
            </td>

            <td class="p-3 hidden lg:table-cell">
              <p class="font-medium text-[#2D1B14] dark:text-slate-300 text-[11px]">{{ item.fg_name || '-' }}</p>
              <p class="text-[10px] mt-0.5">
                <span v-if="item.delivery_type === 'link'" class="text-blue-600 dark:text-blue-400">&#128279; Drive</span>
                <span v-else-if="item.delivery_type === 'fisik'" class="text-emerald-600 dark:text-emerald-400">&#128230; Fisik</span>
                <span v-else class="text-amber-500 animate-pulse">&#9203; Belum Disetor</span>
              </p>
            </td>

            <td class="p-3">
              <span class="status-chip text-[9px]" :class="ppStatusClass(item.pp_status)">{{ item.pp_status }}</span>
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

            <td class="p-3 text-right" @click.stop>
              <div class="flex items-center justify-end gap-1.5">
                <template v-if="item.balance_status !== 'paid'">
                  <button v-if="item.balance_status === 'uploaded'" @click="openVerifyModal(item)"
                    class="px-2.5 py-1.5 bg-amber-600 text-white rounded-lg text-[10px] font-bold hover:bg-amber-700 transition animate-pulse">
                    &#128269; Verifikasi
                  </button>
                  <a v-else :href="getWaBillingLink(item)" target="_blank"
                    class="px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded-lg text-[10px] font-semibold hover:bg-rose-100 transition">
                    &#9203; Tagih
                  </a>
                </template>
                <template v-else>
                  <span v-if="item.pp_status === 'Menunggu File dari FG'"
                    class="px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 rounded-lg text-[10px] font-bold">
                    &#9203; Menunggu FG
                  </span>
                  <button v-else-if="item.pp_status === 'Menunggu Staging Upload'" @click="openStagingModal(item)"
                    class="px-2.5 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-semibold hover:bg-blue-700 transition">
                    &#128279; Upload Staging
                  </button>
                  <span v-else-if="item.pp_status === 'Proses Import Staging'"
                    class="px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 rounded-lg text-[10px] font-bold flex items-center gap-1">
                    <span class="animate-spin">&#9203;</span> Import...
                  </span>
                  <span v-else-if="item.pp_status === 'Menunggu Pilihan Client'"
                    class="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 rounded-lg text-[10px] font-bold">
                    &#127912; Client Memilih
                  </span>
                  <template v-else-if="item.pp_status === 'Proses Edit Highlight'">
                    <button @click="openSelectionDetailModal(item)"
                      class="px-2 py-1.5 bg-[#FAF6F0] dark:bg-slate-800 text-[#C59B63] dark:text-amber-400 border border-[#E8D5C8] dark:border-slate-700 rounded-lg text-[10px] font-semibold hover:bg-[#FAF0DD] transition">
                      &#127912; ({{ item.selected_photos?.length || 0 }})
                    </button>
                    <button @click="proceedToHighlight(item)"
                      class="px-2.5 py-1.5 bg-[#C59B63] hover:bg-[#B5942B] text-white rounded-lg text-[10px] font-bold transition">
                      &#10024; Kirim Highlight
                    </button>
                  </template>
                  <button v-else-if="item.pp_status === 'Highlight Siap'" @click="openDeliverModal(item)"
                    class="px-2.5 py-1.5 bg-[#0f766e] text-white rounded-lg text-[10px] font-semibold hover:bg-[#0d6860] transition">
                    &#128228; Kirim Final
                  </button>
                  <template v-else>
                    <span class="text-[10px] text-green-600 dark:text-green-400 font-bold">&#10003; Terkirim</span>
                    <a :href="getWaLink(item)" target="_blank" class="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 border border-blue-200 hover:bg-blue-100 transition text-xs" title="Kirim Link">&#128228;</a>
                    <a :href="getWaConfirmLink(item)" target="_blank" class="w-7 h-7 flex items-center justify-center rounded-lg bg-green-50 dark:bg-green-950/40 text-green-600 border border-green-200 hover:bg-green-100 transition text-xs" title="Konfirmasi Selesai">&#9989;</a>
                  </template>
                </template>
                <button @click="openClientDetailModal(item)"
                  class="w-7 h-7 flex items-center justify-center rounded-lg bg-[#FFF0E8] dark:bg-slate-800 text-[#8A7A72] dark:text-slate-400 hover:bg-[#FFE5DA] dark:hover:bg-slate-700 transition flex-shrink-0" title="Detail">
                  &#8943;
                </button>
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
        <div v-for="item in data" :key="item.booking_id"
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
              <button v-else-if="item.pp_status === 'Proses Edit Highlight'" @click="proceedToHighlight(item)" class="px-2.5 py-2 bg-[#C59B63] text-white rounded-xl text-[10px] font-bold">&#10024;</button>
              <button v-else-if="item.pp_status === 'Highlight Siap'" @click="openDeliverModal(item)" class="px-2.5 py-2 bg-[#0f766e] text-white rounded-xl text-[10px] font-semibold">&#128228;</button>
              <button v-else @click="openClientDetailModal(item)" class="px-2.5 py-2 bg-[#FFF0E8] dark:bg-slate-800 text-[#8A7A72] rounded-xl text-[10px]">&#8943;</button>
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
          <button @click="deleteClient(clientDetailItem)" class="px-3 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer" title="Hapus Client & Booking Permanen">
            🗑️ Hapus Client
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

        <!-- Notification Toast Copy Feedback -->
        <div v-if="copyToast" class="bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-xs px-3.5 py-2.5 rounded-xl mb-3 flex items-center gap-2 animate-fade-in font-medium">
          <span class="text-base">✓</span> <span>{{ copyToast }}</span>
        </div>

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
            Di Library Filter Bar Lightroom, ubah dropdown menjadi <code class="bg-emerald-100 dark:bg-emerald-950 px-1 py-0.5 rounded text-emerald-800 dark:text-emerald-300 font-bold">Filename ➔ Contains Any</code>, lalu klik <strong>⚡ Salin untuk Lightroom</strong>.
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

        <!-- Minimalist Copy Buttons (Lightroom & Finder/Explorer) -->
        <div class="mb-4 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span class="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <span>📋</span> Salin Nama:
          </span>
          <div class="flex items-center gap-2">
            <button @click="copySpaceSeparated" :disabled="selectionListNoExt.length === 0"
              class="px-3 py-1.5 bg-[#C59B63] hover:bg-[#B5942B] text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm disabled:opacity-40 flex items-center gap-1">
              ⚡ Lightroom
            </button>
            <button @click="copyOrSeparated" :disabled="selectionListNoExt.length === 0"
              class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm disabled:opacity-40 flex items-center gap-1">
              🔍 Finder / Explorer
            </button>
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

        <!-- Footer Action -->
        <div class="flex items-center justify-between border-t border-[#E8D5C8]/60 dark:border-slate-800 pt-3.5">
          <div class="flex gap-2">
            <button @click="showSelectionModal = false" class="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-200 transition">
              Tutup
            </button>
            <button @click="reopenSelectionInModal" class="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-650 dark:bg-red-950/20 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1"
              title="Buka kembali seleksi foto agar klien bisa mengubah/menambah pilihannya">
              🔓 Buka Ulang Seleksi
            </button>
          </div>
          <button @click="proceedToHighlight(selectionItem)" class="px-5 py-2.5 bg-gradient-to-r from-[#C59B63] to-[#B5942B] hover:from-[#B5942B] hover:to-[#9E7D1B] text-white rounded-xl text-xs font-bold transition shadow-md flex items-center gap-1.5 cursor-pointer">
            ✨ Lanjut Kirim Highlight →
          </button>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const API = '/api/admin'
const data = ref([])
const loading = ref(true)
const submitting = ref(false)

// 0. Selection Detail Modal State
const showSelectionModal = ref(false)
const selectionItem = ref(null)
const copyToast = ref('')
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
  showSelectionModal.value = true
}

function copySpaceSeparated() {
  const text = selectionListNoExt.value.join(' ')
  navigator.clipboard.writeText(text)
  copyToast.value = 'Format Lightroom (pisah spasi) berhasil disalin ke clipboard!'
  setTimeout(() => { copyToast.value = '' }, 3000)
}

function copyOrSeparated() {
  const text = selectionListNoExt.value.join(' OR ')
  navigator.clipboard.writeText(text)
  copyToast.value = 'Format Finder/Explorer disalin!'
  setTimeout(() => { copyToast.value = '' }, 3000)
}

async function cleanStagingDisk(item) {
  if (!item) return
  if (!confirm('Apakah Anda yakin ingin membersihkan folder foto staging dari disk server?')) return
  try {
    const res = await fetch(`/api/admin/bookings/${item.booking_id}/clean-staging`, {
      method: 'POST',
      credentials: 'include'
    })
    const d = await res.json()
    if (res.ok) {
      alert(d.message || 'Folder staging dibersihkan!')
      showSelectionModal.value = false
      await load()
    } else {
      alert(d.error || 'Gagal membersihkan staging')
    }
  } catch (e) {
    alert('Error: ' + e.message)
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
  
  if (!confirm(confirmMsg)) return
  
  try {
    const res = await fetch(`${API}/bookings/${item.booking_id}/reopen-selection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ additional_photos: addCount }),
      credentials: 'include'
    })
    const d = await res.json()
    if (res.ok) {
      alert('Galeri seleksi berhasil dibuka kembali untuk client!')
      showSelectionModal.value = false
      reopenAddPhotos.value = 0
      await load()
    } else {
      alert(d.error || 'Gagal membuka kembali galeri seleksi')
    }
  } catch (e) {
    alert('Terjadi kesalahan koneksi.')
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

function openVerifyModal(item) {
  verifyItem.value = item
  verifyUrl.value = item.balance_bukti_url || ''
  if (!item.balance_bukti_url) {
    if (confirm(`Verifikasi pelunasan secara manual untuk client ${item.client_name}?`)) {
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
      alert(d.error || 'Verifikasi gagal')
    }
  } catch (e) {
    alert('Error: ' + e.message)
  }
}

async function publishStaging(item) {
  if (!item) return
  if (!confirm(`Publikasikan galeri seleksi untuk client ${item.client_name}? Klien akan dapat membuka galeri seleksi di tracking.`)) return
  try {
    const res = await fetch(`${API}/post-production/${item.booking_id}/publish-staging`, {
      method: 'POST',
      credentials: 'include'
    })
    const d = await res.json()
    if (res.ok) {
      alert(d.message || 'Galeri seleksi telah dipublikasikan!')
      await load()
    } else {
      alert(d.error || 'Gagal mempublikasikan galeri staging')
    }
  } catch (e) {
    alert('Error: ' + e.message)
  }
}

function ppStatusClass(s) {
  if (s === 'Terkirim ke Client (Final)') return 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400 border border-green-200 font-bold'
  if (s === 'Highlight Siap') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200 font-bold'
  if (s === 'Proses Edit Highlight') return 'bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 border border-purple-200 font-bold'
  if (s === 'Menunggu Pilihan Client') return 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-200 font-bold'
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
    data.value = result.data || []
  } catch (e) {
    console.error(e)
  }
  if (!silent) loading.value = false
}

// Modal Staging Handlers
function openStagingModal(item) {
  stagingItem.value = item
  stagingForm.value = { staging_drive_url: item.staging_drive_url || item.drive_folder_url || '' }
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
    const res = await fetch(`${API}/post-production/${stagingItem.value.booking_id}/upload-staging`, {
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
    const res = await fetch(`${API}/post-production/${highlightItem.value.booking_id}/send-highlight-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ highlight_drive_url: highlightForm.value.highlight_drive_url })
    })
    const d = await res.json()
    if (res.ok) {
      highlightResult.value = d
      await load()
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
    const res = await fetch(`${API}/post-production/${deliverItem.value.booking_id}/send-link`, {
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

async function deleteClient(item) {
  if (!item) return
  const id = item.booking_id || item.id
  const name = item.client_name || 'Client'
  if (!confirm(`Apakah Anda yakin ingin menghapus data client '${name}' (Booking #${id}) secara permanen? Seluruh data booking, invoice, bukti bayar, dan penugasan fotografer akan dihapus bersih tanpa sisa.`)) return

  try {
    const res = await fetch(`${API}/bookings/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    const d = await res.json()
    if (!res.ok) {
      alert(d.error || 'Gagal menghapus client')
      return
    }
    alert(d.message || 'Data client berhasil dihapus bersih!')
    clientDetailItem.value = null
    await load()
  } catch (e) {
    console.error('Delete booking error:', e)
    alert('Terjadi kesalahan koneksi.')
  }
}

async function resetBookingToken(item) {
  if (!item) return
  const id = item.booking_id || item.id
  if (!confirm(`Reset token & PIN tracking untuk ${item.client_name}? Token lama akan hangus dan dibuatkan link baru.`)) return

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
      alert(`Token berhasil direset!\nToken Baru: ${d.tracking_token}\nPIN Baru: ${d.download_password}`)
      await load(true)
    } else {
      alert(d.error || 'Gagal mereset token.')
    }
  } catch (e) {
    alert('Terjadi kesalahan koneksi.')
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
  if (status === 'editing') return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300'
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

let timer = null
onMounted(() => {
  load()
  timer = setInterval(() => load(true), 3000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>