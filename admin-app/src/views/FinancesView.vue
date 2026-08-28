<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-5">
      <div class="flex items-center gap-2.5">
        <h2 class="text-xl font-bold text-[#2D1B14] dark:text-slate-200 tracking-tight">Arsip & Kearsipan</h2>
      </div>
    </div>

    <!-- Tabs + Search -->
    <div class="flex flex-col md:flex-row gap-3 mb-4">
      <div class="flex flex-wrap gap-2">
        <button @click="activeTab = 'completed'; load()" class="px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer"
          :class="activeTab === 'completed' ? 'bg-[#2D1B14] text-[#D4AF37] dark:bg-amber-950/40 dark:text-amber-400 shadow-sm' : 'bg-white dark:bg-slate-900 text-[#8A7A72] dark:text-slate-400 border border-[#E8D5C8]/80 dark:border-slate-800 hover:bg-[#FFF8F3] dark:hover:bg-slate-800'">
          ✅ Klien Selesai <span v-if="completedCount > 0" class="ml-1 bg-[#E8F5E9] dark:bg-green-950/30 text-[#2E7D32] dark:text-green-400 text-[9px] px-1.5 py-0.5 rounded-full font-bold">{{ completedCount }}</span>
        </button>
        <button @click="activeTab = 'cancelled'; load()" class="px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer"
          :class="activeTab === 'cancelled' ? 'bg-[#2D1B14] text-[#D4AF37] dark:bg-amber-950/40 dark:text-amber-400 shadow-sm' : 'bg-white dark:bg-slate-900 text-[#8A7A72] dark:text-slate-400 border border-[#E8D5C8]/80 dark:border-slate-800 hover:bg-[#FFF8F3] dark:hover:bg-slate-800'">
          ❌ Klien Batal <span v-if="cancelledCount > 0" class="ml-1 bg-[#FEF2F2] dark:bg-red-950/30 text-[#EF4444] dark:text-red-400 text-[9px] px-1.5 py-0.5 rounded-full font-bold">{{ cancelledCount }}</span>
        </button>
        <button @click="activeTab = 'inquiries'; load()" class="px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer"
          :class="activeTab === 'inquiries' ? 'bg-[#2D1B14] text-[#D4AF37] dark:bg-amber-950/40 dark:text-amber-400 shadow-sm' : 'bg-white dark:bg-slate-900 text-[#8A7A72] dark:text-slate-400 border border-[#E8D5C8]/80 dark:border-slate-800 hover:bg-[#FFF8F3] dark:hover:bg-slate-800'">
          📭 Calon Batal / Expired <span v-if="inquiriesCount > 0" class="ml-1 bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[9px] px-1.5 py-0.5 rounded-full font-bold">{{ inquiriesCount }}</span>
        </button>
      </div>
      <div class="flex gap-2 flex-1">
        <input v-model="searchQuery" type="text" :placeholder="activeTab === 'inquiries' ? '🔍 Cari nama calon klien / kampus / no WA...' : '🔍 Cari nama klien / invoice / no WA...'" class="input-fancy !text-xs !py-2 flex-1 min-w-0 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
        
        <!-- Filter Dropdown untuk Tab Klien (Drive Filter) -->
        <select v-if="activeTab !== 'inquiries'" v-model="driveFilter" class="input-fancy !text-xs !py-2 !w-auto dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
          <option value="all">📁 Semua Status Drive</option>
          <option value="active">⏳ Retensi Aktif</option>
          <option value="client_confirmed">🟢 File Diamankan Klien</option>
          <option value="trashed">🗑️ Terhapus (Trash)</option>
          <option value="no_drive">⚪ Tanpa Drive</option>
        </select>

        <!-- Filter Dropdown untuk Tab Calon Klien (Inquiry Status Filter) -->
        <select v-else v-model="inquiryStatusFilter" class="input-fancy !text-xs !py-2 !w-auto dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
          <option value="all">📭 Semua Status Prospek</option>
          <option value="expired">⏳ Expired (Lewat 3 Jam)</option>
          <option value="lost">❌ Tidak Jadi (Lost Lead)</option>
          <option value="archived">📅 Jadwal Lewat (Auto-Arsip)</option>
        </select>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-16">
      <div class="loading-spinner animate-spin"></div>
    </div>

    <!-- Content Tables -->
    <div v-else class="space-y-4">
      
      <!-- ========================================== -->
      <!-- TAB 3: CALON KLIEN BATAL / EXPIRED (INQUIRY)-->
      <!-- ========================================== -->
      <template v-if="activeTab === 'inquiries'">
        <!-- Desktop Table for Inquiries -->
        <div class="card overflow-hidden dark:bg-slate-900 dark:border-slate-800 hidden md:block">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-[#8A7A72] dark:text-slate-400 border-b border-[#E8D5C8] dark:border-slate-800 text-left text-xs bg-[#FFF8F3]/50 dark:bg-slate-900">
                <th class="p-3 font-medium w-8">#</th>
                <th class="p-3 font-medium">Nama Calon Klien</th>
                <th class="p-3 font-medium">Kampus & Lokasi</th>
                <th class="p-3 font-medium">Rencana Wisuda & Paket</th>
                <th class="p-3 font-medium">Status Kearsipan</th>
                <th class="p-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in filteredData" :key="item.id"
                class="border-b border-[#E8D5C8]/40 dark:border-slate-800/60 hover:bg-[#FFF8F3] dark:hover:bg-slate-800/50 text-[#2D1B14] dark:text-slate-200 text-xs transition">
                <td class="p-3 text-[#C4B0A5] dark:text-slate-500 font-mono text-[10px]">{{ idx + 1 }}</td>
                <td class="p-3">
                  <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center text-[10px] font-bold text-amber-800 dark:text-amber-400 flex-shrink-0">
                      {{ (item.client_name||'?')[0] }}
                    </div>
                    <div>
                      <span class="font-semibold text-xs">{{ item.client_name }}</span>
                      <div class="text-[10px] text-[#8A7A72] dark:text-slate-400 font-mono">{{ item.client_phone || '-' }}</div>
                      <div v-if="item.notes" class="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[180px]" :title="item.notes">
                        💬 {{ item.notes }}
                      </div>
                    </div>
                  </div>
                </td>
                <td class="p-3">
                  <div class="font-medium text-xs">{{ item.university || '-' }}</div>
                  <div class="text-[10px] text-[#8A7A72] dark:text-slate-400" v-if="item.location">{{ item.location }}</div>
                  <span v-if="item.transport_charge > 0" class="inline-block mt-0.5 px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded text-[9px] font-bold">
                    +Transport Rp {{ item.transport_charge.toLocaleString('id-ID') }}
                  </span>
                </td>
                <td class="p-3">
                  <div class="font-semibold text-xs text-[#D94A3D] dark:text-amber-400">📅 {{ item.graduation_date || '-' }}</div>
                  <div class="text-[10px] text-[#8A7A72] dark:text-slate-400 font-medium">{{ item.package_name || 'Paket Belum Dipilih' }}</div>
                </td>
                <td class="p-3">
                  <span v-if="item.status === 'expired'" class="status-chip bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 text-[9px] font-bold">
                    ⏳ Expired (3 Jam)
                  </span>
                  <span v-else-if="item.status === 'lost'" class="status-chip bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 text-[9px] font-bold">
                    ❌ Tidak Jadi
                  </span>
                  <span v-else-if="item.status === 'archived'" class="status-chip bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-[9px] font-bold">
                    📅 Jadwal Lewat
                  </span>
                  <span v-else class="status-chip bg-slate-100 text-slate-600 text-[9px]">
                    {{ item.status }}
                  </span>
                </td>
                <td class="p-3 text-right">
                  <div class="flex items-center justify-end gap-1.5 flex-wrap">
                    <a :href="waInquiryLink(item)" target="_blank" class="px-2.5 py-1.5 bg-[#0f766e] text-white hover:bg-[#0d6860] rounded-xl text-xs font-semibold transition inline-flex items-center gap-1 shadow-sm cursor-pointer whitespace-nowrap" title="Chat Follow Up ke WhatsApp Calon Klien">
                      💬 WA
                    </a>
                    <button @click="restoreInquiry(item)" class="px-2.5 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-xs font-semibold transition inline-flex items-center gap-1 shadow-sm cursor-pointer whitespace-nowrap" title="Kembalikan Calon Klien ke Antrean Aktif Inquiry">
                      ↩️ Ke Inquiry
                    </button>
                    <button @click="openInquiryDetail(item)" class="px-2 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer" title="Lihat Detail Lengkap">
                      🔍
                    </button>
                    <button @click="deleteInquiry(item)" class="px-2.5 py-1.5 bg-red-600/90 text-white hover:bg-red-700 rounded-xl text-xs font-semibold transition inline-flex items-center gap-1 shadow-sm cursor-pointer whitespace-nowrap" title="Hapus Data Calon Klien Permanen dari Database">
                      🗑️ Hapus
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredData.length === 0">
                <td class="p-8 text-center text-[#C4B0A5] dark:text-slate-500" colspan="6">
                  <span class="text-2xl block mb-1">📭</span>
                  <span class="text-xs">Tidak ada data calon klien batal / expired di arsip</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Cards for Inquiries -->
        <div class="md:hidden space-y-3">
          <div v-for="(item, idx) in filteredData" :key="item.id"
            class="card p-4 space-y-3 dark:bg-slate-900 dark:border-slate-800">
            <div class="flex justify-between items-start">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center text-[10px] font-bold text-amber-800 dark:text-amber-400 flex-shrink-0">
                  {{ (item.client_name||'?')[0] }}
                </div>
                <div>
                  <span class="font-bold text-xs text-[#2D1B14] dark:text-slate-100">{{ item.client_name }}</span>
                  <p class="text-[10px] text-[#8A7A72]">{{ item.university || '-' }}</p>
                </div>
              </div>
              <span v-if="item.status === 'expired'" class="status-chip text-[9px] bg-rose-50 text-rose-600 border border-rose-200">⏳ Expired</span>
              <span v-else-if="item.status === 'lost'" class="status-chip text-[9px] bg-amber-50 text-amber-700 border border-amber-200">❌ Tidak Jadi</span>
              <span v-else-if="item.status === 'archived'" class="status-chip text-[9px] bg-slate-100 text-slate-600 border border-slate-200">📅 Lewat</span>
              <span v-else class="status-chip text-[9px] bg-slate-100 text-slate-600">{{ item.status }}</span>
            </div>

            <div class="text-[11px] space-y-1.5 pt-2 border-t border-[#E8D5C8]/40 dark:border-slate-800/60 text-[#8A7A72] dark:text-slate-400">
              <div class="flex justify-between">
                <span>Rencana Wisuda:</span>
                <span class="font-semibold text-[#D94A3D] dark:text-amber-400">{{ item.graduation_date || '-' }}</span>
              </div>
              <div class="flex justify-between">
                <span>Paket Diminati:</span>
                <span class="font-medium text-[#2D1B14] dark:text-slate-200">{{ item.package_name || '-' }}</span>
              </div>
              <div class="flex justify-between" v-if="item.notes">
                <span>Catatan:</span>
                <span class="text-right italic max-w-[200px] truncate">{{ item.notes }}</span>
              </div>
            </div>

            <div class="pt-2 border-t border-[#E8D5C8]/40 dark:border-slate-800/60 flex flex-wrap gap-1.5">
              <a :href="waInquiryLink(item)" target="_blank" class="flex-1 py-2 bg-[#0f766e] text-white hover:bg-[#0d6860] rounded-xl text-xs font-semibold text-center transition inline-flex items-center justify-center gap-1">
                💬 WA
              </a>
              <button @click="restoreInquiry(item)" class="flex-1 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-xs font-semibold text-center transition inline-flex items-center justify-center gap-1">
                ↩️ Ke Inquiry
              </button>
              <button @click="deleteInquiry(item)" class="px-3 py-2 bg-red-600 text-white hover:bg-red-700 rounded-xl text-xs font-semibold text-center transition inline-flex items-center justify-center gap-1 cursor-pointer">
                🗑️ Hapus
              </button>
            </div>
          </div>

          <div v-if="filteredData.length === 0" class="text-center py-16 text-[#C4B0A5] dark:text-slate-500 card bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800">
            <span class="text-2xl block mb-1">📭</span>
            <span class="text-xs">Tidak ada data calon klien batal / expired di arsip</span>
          </div>
        </div>
      </template>

      <!-- ========================================== -->
      <!-- TAB 1 & TAB 2: KLIEN SELESAI / KLIEN BATAL -->
      <!-- ========================================== -->
      <template v-else>
        <!-- Desktop Table (Hidden on Mobile) -->
        <div class="card overflow-hidden dark:bg-slate-900 dark:border-slate-800 hidden md:block">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-[#8A7A72] dark:text-slate-400 border-b border-[#E8D5C8] dark:border-slate-800 text-left text-xs bg-[#FFF8F3]/50 dark:bg-slate-900">
                <th class="p-3 font-medium w-8">#</th>
                <th class="p-3 font-medium">Nama Client</th>
                <th class="p-3 font-medium">No. Invoice</th>
                <th class="p-3 font-medium">Link Drive</th>
                <th class="p-3 font-medium hidden md:table-cell">FG</th>
                <th class="p-3 font-medium">Status</th>
                <th class="p-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in filteredData" :key="item.id"
                class="border-b border-[#E8D5C8]/40 dark:border-slate-800/60 hover:bg-[#FFF8F3] dark:hover:bg-slate-800/50 text-[#2D1B14] dark:text-slate-200 text-xs transition">
                <td class="p-3 text-[#C4B0A5] dark:text-slate-500 font-mono text-[10px]">{{ idx + 1 }}</td>
                <td class="p-3">
                  <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-lg bg-[#FAF0DD] dark:bg-amber-950/20 flex items-center justify-center text-[10px] font-bold text-[#B5942B] dark:text-amber-400 flex-shrink-0">{{ (item.client_name||'?')[0] }}</div>
                    <div>
                      <span class="font-semibold text-xs">{{ item.client_name }}</span>
                      <div class="text-[10px] text-[#8A7A72] dark:text-slate-500">{{ item.university || '-' }}</div>
                    </div>
                  </div>
                </td>
                <td class="p-3">
                  <button @click="openInvoice(item)" class="text-[#D94A3D] hover:text-[#C0392B] dark:text-amber-400 dark:hover:text-amber-300 font-semibold text-xs hover:underline transition cursor-pointer">
                    INV-{{ String(item.id).padStart(4, '0') }}
                  </button>
                </td>
                <td class="p-3">
                  <div v-if="item.drive_parent_url || item.download_url" class="flex flex-col gap-1">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <a :href="item.drive_parent_url || item.download_url" target="_blank" class="text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1">
                        📁 Buka Drive
                      </a>
                    </div>
                    <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span v-if="item.tracking_token" class="text-[9px] px-1 bg-slate-100 dark:bg-slate-800 rounded font-mono text-slate-500 dark:text-slate-400">Token: {{ item.tracking_token }}</span>
                      <button v-if="item.tracking_token" @click="copyToken(item.tracking_token)" class="px-1.5 py-0.5 border border-[#E8D5C8]/80 text-[#8A7A72] dark:border-slate-800 dark:text-slate-300 hover:bg-[#FFE5DA] hover:text-[#2D1B14] rounded text-[9px] transition cursor-pointer font-medium" title="Salin Token">
                        Salin Token
                      </button>
                      <button @click="copyText(item.drive_parent_url || item.download_url)" class="px-1.5 py-0.5 border border-[#E8D5C8]/80 text-[#8A7A72] dark:border-slate-800 dark:text-slate-300 hover:bg-[#FFE5DA] hover:text-[#2D1B14] rounded text-[9px] transition cursor-pointer font-medium" title="Salin Link Drive">
                        Salin Drive
                      </button>
                    </div>
                  </div>
                  <span v-else class="text-[#C4B0A5] dark:text-slate-500 italic text-[11px]">-</span>
                </td>
                <td class="p-3 hidden md:table-cell">
                  <span v-if="item.fg_name" class="font-medium text-xs">{{ item.fg_name }}</span>
                  <span v-else class="text-[#C4B0A5] dark:text-slate-500 italic text-[11px]">-</span>
                </td>
                <td class="p-3">
                  <span v-if="item.status === 'completed'" class="status-chip bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50">
                    🟢 Selesai
                  </span>
                  <span v-else-if="item.status === 'cancelled'" class="status-chip bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50">
                    🔴 Dibatalkan
                  </span>
                  <span v-else class="status-chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {{ item.status }}
                  </span>
                </td>
                <td class="p-3 text-right">
                  <div class="flex items-center justify-end gap-1.5 flex-wrap">
                    <button @click="sendWaSummary(item)" class="px-2.5 py-1.5 bg-[#0f766e] text-white hover:bg-[#0d6860] rounded-xl text-xs font-semibold transition inline-flex items-center gap-1 shadow-sm cursor-pointer whitespace-nowrap" title="Kirim Link Drive & Dokumen ke WhatsApp Klien">
                      💬 Kirim WA
                    </button>
                    <button @click="openInvoice(item)" class="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-[#E8D5C8] dark:border-slate-700 text-[#2D1B14] dark:text-slate-200 hover:bg-[#FFF8F3] dark:hover:bg-slate-700 rounded-xl text-xs font-semibold transition inline-flex items-center gap-1 shadow-sm cursor-pointer whitespace-nowrap" title="Buka Dokumen Invoice">
                      📄 Invoice
                    </button>
                    <button @click="deleteBooking(item)" class="px-2.5 py-1.5 bg-red-600/90 text-white hover:bg-red-700 rounded-xl text-xs font-semibold transition inline-flex items-center gap-1 shadow-sm cursor-pointer whitespace-nowrap" title="Hapus Data Client Permanen dari Database">
                      🗑️ Hapus
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredData.length === 0">
                <td class="p-8 text-center text-[#C4B0A5] dark:text-slate-500" colspan="7">
                  <span class="text-2xl block mb-1">📭</span>
                  <span class="text-xs">Tidak ada data arsip di tab ini</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Card List (Visible on Mobile) -->
        <div class="md:hidden space-y-3">
          <div v-for="(item, idx) in filteredData" :key="item.id"
            class="card p-4 dark:bg-slate-900 dark:border-slate-800 space-y-3">
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg bg-[#FAF0DD] dark:bg-amber-950/20 flex items-center justify-center text-xs font-bold text-[#B5942B] dark:text-amber-400 flex-shrink-0">
                  {{ (item.client_name||'?')[0] }}
                </div>
                <div>
                  <span class="font-bold text-xs text-[#2D1B14] dark:text-slate-100">{{ item.client_name }}</span>
                  <p class="text-[10px] text-[#8A7A72]">{{ item.university || '-' }}</p>
                </div>
              </div>
              <span v-if="item.status === 'completed'" class="status-chip bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 text-[10px]">
                🟢 Selesai
              </span>
              <span v-else-if="item.status === 'cancelled'" class="status-chip bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/30 dark:text-red-400 text-[10px]">
                🔴 Batal
              </span>
            </div>

            <div class="text-[11px] space-y-1.5 pt-2 border-t border-[#E8D5C8]/40 dark:border-slate-800/60 text-[#8A7A72] dark:text-slate-400">
              <div class="flex justify-between">
                <span>Invoice:</span>
                <button @click="openInvoice(item)" class="text-[#D94A3D] font-bold hover:underline">
                  INV-{{ String(item.id).padStart(4, '0') }}
                </button>
              </div>
              <div class="flex justify-between">
                <span>Total Biaya:</span>
                <span class="font-semibold text-[#2D1B14] dark:text-slate-200">Rp {{ (item.total_price || 0).toLocaleString('id-ID') }}</span>
              </div>
            </div>

            <div class="pt-2 border-t border-[#E8D5C8]/40 dark:border-slate-800/60 flex flex-wrap gap-1.5">
              <button @click="sendWaSummary(item)" class="flex-1 py-2 bg-[#0f766e] text-white hover:bg-[#0d6860] rounded-xl text-xs font-semibold text-center transition inline-flex items-center justify-center gap-1">
                💬 Kirim WA
              </button>
              <button @click="openInvoice(item)" class="flex-1 py-2 bg-white dark:bg-slate-800 border border-[#E8D5C8] dark:border-slate-700 text-[#2D1B14] dark:text-slate-200 hover:bg-[#FFF8F3] dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-center transition inline-flex items-center justify-center gap-1">
                📄 Invoice
              </button>
              <button @click="deleteBooking(item)" class="px-3 py-2 bg-red-600 text-white hover:bg-red-700 rounded-xl text-xs font-semibold text-center transition inline-flex items-center justify-center gap-1 cursor-pointer">
                🗑️
              </button>
            </div>
          </div>

          <div v-if="filteredData.length === 0" class="text-center py-16 text-[#C4B0A5] dark:text-slate-500 card bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800">
            <span class="text-2xl block mb-1">📭</span>
            <span class="text-xs">Tidak ada data arsip di tab ini</span>
          </div>
        </div>
      </template>
    </div>

    <!-- MODAL: Invoice Detail & Cetak -->
    <div v-if="showInvoice && invoiceData" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.6); backdrop-filter: blur(6px);" @click.self="showInvoice=false">
      <div class="card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 animate-pop dark:bg-slate-900 dark:border-slate-800">
        <div class="flex items-center justify-between mb-4 pb-3 border-b border-[#E8D5C8]/60 dark:border-slate-800">
          <div>
            <h3 class="text-base font-bold text-[#2D1B14] dark:text-slate-200 flex items-center gap-2">
              📄 Invoice Detail — INV-{{ String(invoiceData.id).padStart(4, '0') }}
            </h3>
            <span class="text-xs text-[#8A7A72] dark:text-slate-400">Status Transaksi: <strong class="text-[#D94A3D] dark:text-amber-400">{{ invoiceData.status === 'completed' ? 'LUNAS (SELESAI)' : invoiceData.status }}</strong></span>
          </div>
          <button @click="showInvoice=false" class="text-[#C4B0A5] hover:text-[#2D1B14] dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="space-y-4 text-xs text-[#2D1B14] dark:text-slate-300">
          <div class="grid grid-cols-2 gap-4 p-3.5 bg-[#FAF0DD]/40 dark:bg-slate-800/40 rounded-xl border border-[#E8D5C8]/60 dark:border-slate-800">
            <div>
              <span class="text-[#8A7A72] dark:text-slate-400 block text-[10px]">Client:</span>
              <p class="font-bold text-sm text-[#2D1B14] dark:text-slate-100">{{ invoiceData.client_name }}</p>
              <p class="text-[11px] text-[#8A7A72]">{{ invoiceData.client_phone }}</p>
            </div>
            <div>
              <span class="text-[#8A7A72] dark:text-slate-400 block text-[10px]">Detail Acara:</span>
              <p class="font-semibold">{{ invoiceData.university || '-' }}</p>
              <p class="text-[11px] text-[#8A7A72]">Tgl: {{ invoiceData.graduation_date || '-' }}</p>
            </div>
          </div>
          <div class="p-3.5 bg-white dark:bg-slate-800/60 rounded-xl border border-[#E8D5C8] dark:border-slate-700 space-y-2">
            <div class="flex justify-between items-center pb-2 border-b border-[#E8D5C8]/60 dark:border-slate-700">
              <span class="font-bold">{{ invoiceData.package_name || 'Paket Foto Wisuda' }}</span>
              <span class="font-bold">Rp {{ (invoiceData.total_price || 0).toLocaleString('id-ID') }}</span>
            </div>
            <div class="flex justify-between font-bold text-sm pt-2 text-[#2D1B14] dark:text-slate-100">
              <span>Total Pembayaran:</span>
              <span class="text-[#D94A3D] dark:text-amber-400">Rp {{ (invoiceData.total_price || 0).toLocaleString('id-ID') }}</span>
            </div>
          </div>
        </div>

        <div class="mt-5 pt-3 border-t border-[#E8D5C8]/60 dark:border-slate-800 flex items-center justify-between gap-2">
          <button @click="viewPublicInvoice(invoiceData)" class="px-4 py-2 bg-[#D4AF37] hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
            🌐 Buka Versi Web Klien
          </button>
          <button @click="showInvoice=false" class="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-200 transition cursor-pointer">
            Tutup
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: Inquiry Detail Modal -->
    <div v-if="selectedInquiry" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.6); backdrop-filter: blur(6px);" @click.self="selectedInquiry=null">
      <div class="card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 animate-pop dark:bg-slate-900 dark:border-slate-800">
        <div class="flex items-center justify-between mb-4 pb-3 border-b border-[#E8D5C8]/60 dark:border-slate-800">
          <div>
            <h3 class="text-base font-bold text-[#2D1B14] dark:text-slate-200 flex items-center gap-2">
              📭 Calon Klien Batal / Expired
            </h3>
            <span class="text-xs text-[#8A7A72] dark:text-slate-400">ID Inquiry: #{{ selectedInquiry.id }}</span>
          </div>
          <button @click="selectedInquiry=null" class="text-[#C4B0A5] hover:text-[#2D1B14] dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="space-y-4 text-xs text-[#2D1B14] dark:text-slate-300">
          <div class="p-3.5 bg-[#FAF0DD]/40 dark:bg-slate-800/40 rounded-xl border border-[#E8D5C8]/60 dark:border-slate-800 space-y-2">
            <h4 class="font-bold text-[#D94A3D] text-[10px] uppercase tracking-wider">👤 1. Identitas Calon Klien</h4>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span class="text-[#8A7A72] block text-[10px]">Nama Lengkap:</span>
                <span class="font-bold text-[#2D1B14] dark:text-slate-100">{{ selectedInquiry.client_name }}</span>
              </div>
              <div>
                <span class="text-[#8A7A72] block text-[10px]">WhatsApp:</span>
                <span class="font-semibold">{{ selectedInquiry.client_phone }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-5 pt-3 border-t border-[#E8D5C8]/60 dark:border-slate-800 flex items-center justify-between gap-2">
          <a :href="waInquiryLink(selectedInquiry)" target="_blank" class="px-3.5 py-2 bg-[#0f766e] text-white hover:bg-[#0d6860] rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer">
            💬 Chat WA
          </a>
          <button @click="restoreInquiry(selectedInquiry)" class="px-3.5 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer">
            ↩️ Kembalikan ke Inquiry
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: Restore to Inquiry (Update Tanggal Wisuda Baru) -->
    <div v-if="restoreModal.open" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.6); backdrop-filter: blur(6px);" @click.self="restoreModal.open = false">
      <div class="card w-full max-w-md p-6 animate-pop dark:bg-slate-900 dark:border-slate-800">
        <div class="flex items-center justify-between mb-4 pb-2 border-b border-[#E8D5C8]/60 dark:border-slate-800">
          <div class="flex items-center gap-2">
            <span class="text-xl">↩️</span>
            <h3 class="font-bold text-[#2D1B14] dark:text-slate-200 text-sm">Kembalikan ke Inquiry</h3>
          </div>
          <button @click="restoreModal.open = false" class="text-[#C4B0A5] hover:text-[#2D1B14] dark:hover:text-slate-200 cursor-pointer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="p-3.5 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-300 mb-4 space-y-1.5">
          <p class="font-bold flex items-center gap-1">⚠️ Jadwal Wisuda Sebelumnya Sudah Lewat</p>
          <p class="text-[11px] text-amber-800 dark:text-amber-400">
            Tentukan tanggal wisuda baru agar calon klien dapat kembali aktif di antrean Inquiry.
          </p>
        </div>

        <form @submit.prevent="submitRestoreWithDate">
          <div class="mb-4">
            <label class="block text-xs font-bold text-[#2D1B14] dark:text-slate-300 mb-1.5">
              📅 Tanggal Wisuda Baru <span class="text-red-500">*</span>
            </label>
            <input 
              type="date" 
              v-model="restoreModal.newDate" 
              required
              class="w-full px-3.5 py-2.5 border border-[#E8D5C8] dark:border-slate-700 rounded-xl text-xs dark:bg-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-[#E8D5C8]/60 dark:border-slate-800">
            <button 
              type="button" 
              @click="restoreModal.open = false" 
              class="px-4 py-2 border border-[#E8D5C8] dark:border-slate-700 text-[#8A7A72] dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Batal
            </button>
            <button 
              type="submit" 
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span>↩️ Simpan & Kembalikan</span>
            </button>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const API = '/api/admin'
const activeTab = ref('completed')
const loading = ref(true)
const data = ref([])
const completedCount = ref(0)
const cancelledCount = ref(0)
const inquiriesCount = ref(0)

// Search & Filter
const searchQuery = ref('')
const driveFilter = ref('all')
const inquiryStatusFilter = ref('all')

const filteredData = computed(() => {
  return data.value.filter(item => {
    // Search query filter
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim()
      const matchName = (item.client_name || '').toLowerCase().includes(q)
      const matchUniv = (item.university || '').toLowerCase().includes(q)
      const matchPhone = (item.client_phone || '').includes(q)
      const matchEmail = (item.client_email || '').toLowerCase().includes(q)
      const matchLocation = (item.location || '').toLowerCase().includes(q)
      const matchNotes = (item.notes || '').toLowerCase().includes(q)
      const matchInv = `inv-${String(item.id).padStart(4, '0')}`.includes(q) || String(item.id).includes(q)
      if (!matchName && !matchUniv && !matchPhone && !matchEmail && !matchLocation && !matchNotes && !matchInv) return false
    }

    // Filter untuk Tab Calon Klien
    if (activeTab.value === 'inquiries') {
      if (inquiryStatusFilter.value !== 'all') {
        if (item.status !== inquiryStatusFilter.value) return false
      }
      return true
    }

    // Filter untuk Tab Klien (Drive Filter)
    if (driveFilter.value === 'active') {
      if (!item.download_url && !item.drive_parent_url) return false
      if (item.drive_cleanup_status === 'trashed') return false
    } else if (driveFilter.value === 'client_confirmed') {
      if (item.drive_cleanup_status !== 'client_confirmed') return false
    } else if (driveFilter.value === 'trashed') {
      if (item.drive_cleanup_status !== 'trashed') return false
    } else if (driveFilter.value === 'no_drive') {
      if (item.download_url || item.drive_parent_url) return false
    }

    return true
  })
})

// Modals State
const showInvoice = ref(false)
const invoiceData = ref(null)
const selectedInquiry = ref(null)
const restoreModal = ref({
  open: false,
  item: null,
  newDate: '',
  minDate: ''
})

let timer = null
onMounted(() => {
  load()
  timer = setInterval(() => load(true), 4000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

async function load(silent = false) {
  if (!silent) loading.value = true
  try {
    const r = await fetch(`${API}/archive?tab=${activeTab.value}&limit=100`, { credentials: 'include' })
    const d = await r.json()
    data.value = d.data || []
    completedCount.value = d.completedCount || 0
    cancelledCount.value = d.cancelledCount || 0
    inquiriesCount.value = d.inquiriesCount || 0
  } catch (err) {
    console.error('Error loading archive:', err)
  }
  if (!silent) loading.value = false
}

function openInvoice(item) {
  invoiceData.value = item
  showInvoice.value = true
}

function openInquiryDetail(item) {
  selectedInquiry.value = item
}

function viewPublicInvoice(item) {
  if (item) {
    window.open(`/invoice.html?id=${item.id}&token=${item.tracking_token || ''}`, '_blank')
  }
}

function waInquiryLink(item) {
  if (!item || !item.client_phone) return '#'
  const phone = item.client_phone.replace(/[^0-9]/g, '')
  const companyName = authStore.companyName || 'Wisuda Photography'
  const msg = `Halo Kak ${item.client_name || ''}, saya admin dari ${companyName}. Menghubungi kembali terkait rencana wisuda Kakak di ${item.university || ''}. Apakah masih membutuhkan layanan foto wisuda terbaik bersama kami? 😊`
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`
}

function getTodayStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' })
}

async function restoreInquiry(item) {
  if (!item) return
  const todayStr = getTodayStr()
  const isPast = item.graduation_date && item.graduation_date < todayStr

  if (isPast) {
    restoreModal.value = {
      open: true,
      item,
      newDate: todayStr,
      minDate: todayStr
    }
    return
  }

  if (!await confirm(`Kembalikan calon klien '${item.client_name}' ke antrean aktif Inquiry?`)) return

  await executeRestoreInquiry(item.id, null)
}

async function submitRestoreWithDate() {
  if (!restoreModal.value.item || !restoreModal.value.newDate) return
  await executeRestoreInquiry(restoreModal.value.item.id, restoreModal.value.newDate)
  restoreModal.value.open = false
}

async function executeRestoreInquiry(id, newDate) {
  try {
    const payload = newDate ? { graduation_date: newDate } : {}
    const res = await fetch(`${API}/inquiries/${id}/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    })
    const d = await res.json()
    if (!res.ok) {
      alert(d.error || 'Gagal mengembalikan ke Inquiry')
      return
    }
    alert(d.message || 'Calon klien berhasil dikembalikan ke antrean Inquiry!')
    selectedInquiry.value = null
    await load()
  } catch (e) {
    console.error('Restore inquiry error:', e)
    alert('Terjadi kesalahan koneksi.')
  }
}

async function deleteInquiry(item) {
  if (!item) return
  if (!await confirm(`PERINGATAN HARD DELETE!\n\nApakah Anda yakin ingin menghapus data calon klien '${item.client_name}' secara PERMANEN dari database?\n\nData ini akan dimusnahkan total dan tidak dapat dikembalikan lagi. Gunakan opsi ini hanya untuk data testing / spam.`)) return

  try {
    const res = await fetch(`${API}/inquiries/${item.id}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    const d = await res.json()
    if (!res.ok) {
      alert(d.error || 'Gagal menghapus data')
      return
    }
    alert(d.message || 'Data calon klien berhasil dihapus bersih dari database!')
    selectedInquiry.value = null
    await load()
  } catch (e) {
    console.error('Delete inquiry error:', e)
    alert('Terjadi kesalahan koneksi.')
  }
}

function sendWaSummary(item) {
  if (!item || !item.client_phone) return
  const companyName = authStore.companyName || 'Wisuda Platform'
  const appUrl = window.location.origin
  const invNo = `INV-${String(item.id).padStart(4, '0')}`
  const token = item.tracking_token || `TRK-${item.id}`
  const trackingUrl = `${appUrl}/tracking.html?code=${encodeURIComponent(token)}`
  const invoiceUrl = `${appUrl}/invoice.html?id=${item.id}`

  const driveParentUrl = item.drive_parent_url || item.download_url || ''

  let msg = ''
  if (authStore.waTemplates && authStore.waTemplates.client_rekap) {
    msg = authStore.waTemplates.client_rekap
      .replace(/{company_name}/g, companyName)
      .replace(/{client_name}/g, item.client_name || 'Kak')
      .replace(/{invoice_no}/g, invNo)
      .replace(/{university}/g, item.university || '-')
      .replace(/{package_name}/g, item.package_name || 'Wisuda')
      .replace(/{tracking_url}/g, trackingUrl)
      .replace(/{password}/g, token)
      .replace(/{drive_parent_url}/g, driveParentUrl)
      .replace(/{drive_url}/g, driveParentUrl)
      .replace(/{download_url}/g, driveParentUrl)
      .replace(/{invoice_url}/g, invoiceUrl)
  } else {
    msg = `Halo Kak ${item.client_name}! 👋\n`
    msg += `Berikut informasi lengkap & akses berkas foto wisuda Anda dari ${companyName}:\n\n`
    msg += `📋 No. Invoice: ${invNo}\n`
    msg += `🎓 Universitas: ${item.university || '-'}\n`
    msg += `📦 Paket: ${item.package_name || 'Wisuda'}\n\n`
    msg += `🔍 HALAMAN AKSES DOKUMEN & TRACKING:\n${trackingUrl}\n`
    msg += `🔗 KODE TRACKING CLIENT: ${token}\n`
    msg += `*(Gunakan kode tracking di atas untuk memantau progres & mengakses hasil foto di halaman tracking)*\n\n`
    if (driveParentUrl) {
      msg += `📁 LINK GOOGLE DRIVE (MASTER FOLDER CLIENT):\n${driveParentUrl}\n\n`
    }
    msg += `📄 LINK INVOICE RESMI (PELUNASAN):\n${invoiceUrl}\n\n`
    msg += `Terima kasih banyak telah mempercayakan momen bahagia Anda bersama kami! ✨`
  }

  const phone = item.client_phone.replace(/[^0-9]/g, '')
  const waUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`
  window.open(waUrl, '_blank')
}

async function deleteBooking(item) {
  if (!item) return
  const isCompleted = item.status === 'completed' || activeTab.value === 'completed'
  
  const bodyText = isCompleted
    ? `PERINGATAN KERAS!\n\nClient '${item.client_name}' (Booking #${item.id}) berstatus SELESAI.\n\nMenghapus data ini akan memusnahkan seluruh data booking, invoice, bukti bayar, dan rekap fee terkait secara permanen dari database!\n\nApakah Anda yakin ingin menghapus data ini?`
    : `PERINGATAN HARD DELETE!\n\nApakah Anda yakin ingin menghapus data client batal '${item.client_name}' (Booking #${item.id}) secara PERMANEN dari database? Seluruh berkas & record akan dihapus bersih.`

  if (!await confirm(bodyText)) return

  try {
    const res = await fetch(`${API}/bookings/${item.id}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    const d = await res.json()
    if (!res.ok) {
      alert(d.error || 'Gagal menghapus client')
      return
    }
    alert(d.message || 'Data client berhasil dihapus bersih dari database!')
    await load()
  } catch (e) {
    console.error('Delete booking error:', e)
    alert('Terjadi kesalahan koneksi.')
  }
}

function copyToken(token) {
  if (!token) return
  copyToClipboard(token, `Token Tracking (${token})`)
}

function copyText(text) {
  if (!text) return
  copyToClipboard(text, 'Link Google Drive')
}

function copyTextCustom(text, label) {
  if (!text) return
  copyToClipboard(text, label)
}

function copyToClipboard(text, label) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      alert(`✅ ${label} berhasil disalin ke clipboard!`)
    }).catch(() => {
      fallbackCopy(text, label)
    })
  } else {
    fallbackCopy(text, label)
  }
}

function fallbackCopy(text, label) {
  const textArea = document.createElement('textarea')
  textArea.value = String(text)
  textArea.style.position = 'fixed'
  textArea.style.left = '-999999px'
  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()
  try {
    document.execCommand('copy')
    alert(`✅ ${label} berhasil disalin ke clipboard!`)
  } catch (err) {
    alert(`Gagal menyalin ${label}: ${text}`)
  }
  document.body.removeChild(textArea)
}
</script>