<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-5">
      <div class="flex items-center gap-2.5">
        <h2 class="text-xl font-bold text-[#2D1B14] dark:text-slate-200 tracking-tight">Arsip Client</h2>
      </div>
    </div>

    <!-- Tabs + Search -->
    <div class="flex flex-col sm:flex-row gap-3 mb-4">
      <div class="flex gap-2">
        <button @click="activeTab = 'completed'; load()" class="px-4 py-2 rounded-xl text-xs font-semibold transition"
          :class="activeTab === 'completed' ? 'bg-[#2D1B14] text-[#D4AF37] dark:bg-amber-950/40 dark:text-amber-400' : 'bg-white dark:bg-slate-900 text-[#8A7A72] dark:text-slate-400 border border-[#E8D5C8]/80 dark:border-slate-800 hover:bg-[#FFF8F3] dark:hover:bg-slate-800'">
          ✅ Selesai <span v-if="completedCount > 0" class="ml-1 bg-[#E8F5E9] dark:bg-green-950/30 text-[#2E7D32] dark:text-green-400 text-[9px] px-1.5 py-0.5 rounded-full">{{ completedCount }}</span>
        </button>
        <button @click="activeTab = 'cancelled'; load()" class="px-4 py-2 rounded-xl text-xs font-semibold transition"
          :class="activeTab === 'cancelled' ? 'bg-[#2D1B14] text-[#D4AF37] dark:bg-amber-950/40 dark:text-amber-400' : 'bg-white dark:bg-slate-900 text-[#8A7A72] dark:text-slate-400 border border-[#E8D5C8]/80 dark:border-slate-800 hover:bg-[#FFF8F3] dark:hover:bg-slate-800'">
          ❌ Batal <span v-if="cancelledCount > 0" class="ml-1 bg-[#FEF2F2] dark:bg-red-950/30 text-[#EF4444] dark:text-red-400 text-[9px] px-1.5 py-0.5 rounded-full">{{ cancelledCount }}</span>
        </button>
      </div>
      <div class="flex gap-2 flex-1">
        <input v-model="searchQuery" type="text" placeholder="🔍 Cari nama klien..." class="input-fancy !text-xs !py-2 flex-1 min-w-0 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
        <select v-model="driveFilter" class="input-fancy !text-xs !py-2 !w-auto dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
          <option value="all">📁 Semua Drive</option>
          <option value="active">🟢 Drive Aktif</option>
          <option value="failed">⚠️ Transfer Gagal</option>
          <option value="transferred">👤 Sudah Transfer</option>
          <option value="trashed">🗑️ Sudah Trash</option>
          <option value="no_drive">⚪ Tanpa Drive</option>
        </select>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-16">
      <div class="loading-spinner animate-spin"></div>
    </div>

    <!-- Table -->
    <div v-else class="space-y-4">
      <!-- Desktop Table (Hidden on Mobile) -->
      <div class="card overflow-hidden dark:bg-slate-900 dark:border-slate-800 hidden md:block">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-[#8A7A72] dark:text-slate-400 border-b border-[#E8D5C8] dark:border-slate-800 text-left text-xs">
              <th class="p-3 font-medium w-8">#</th>
              <th class="p-3 font-medium">Nama Client</th>
              <th class="p-3 font-medium">No. Invoice</th>
              <th class="p-3 font-medium">Link Drive</th>
              <th class="p-3 font-medium hidden md:table-cell">FG</th>
              <th class="p-3 font-medium">Status</th>
              <th class="p-3 font-medium text-right">Aksi WA</th>
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
                    <div v-if="item.fg_name && item.fg_payout_status !== 'paid'" class="mt-1">
                      <span class="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800 animate-pulse">
                        ⚠️ Fee FG Belum Dibayar
                      </span>
                    </div>
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
                    <span v-if="item.drive_cleanup_status === 'transferred'" class="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400">
                      👤 Owner Changed
                    </span>
                    <span v-else-if="item.drive_cleanup_status === 'failed'" @click="openTransferModal(item)" class="text-[9px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold border border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 animate-pulse cursor-pointer" :title="item.drive_cleanup_notes || 'Transfer gagal. Klik untuk coba lagi'">
                      ⚠️ Transfer Gagal
                    </span>
                    <span v-else-if="item.drive_cleanup_status === 'trashed'" class="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold border border-slate-200 dark:bg-slate-800 dark:text-slate-400">
                      🗑️ Trashed
                    </span>
                    <span v-if="item.drive_expiry_date" class="text-[9px] text-slate-400 font-mono">exp: {{ item.drive_expiry_date }}</span>
                  </div>
                  <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span v-if="item.tracking_token" class="text-[9px] px-1 bg-slate-100 dark:bg-slate-800 rounded font-mono text-slate-500 dark:text-slate-400">Token: {{ item.tracking_token }}</span>
                    <button v-if="item.tracking_token" @click="copyToken(item.tracking_token)" class="px-1.5 py-0.5 border border-[#E8D5C8]/80 text-[#8A7A72] dark:border-slate-800 dark:text-slate-300 hover:bg-[#FFE5DA] hover:text-[#2D1B14] rounded text-[9px] transition cursor-pointer font-medium" title="Salin Token">
                      Salin Token
                    </button>
                    <button @click="copyText(item.drive_parent_url || item.download_url)" class="px-1.5 py-0.5 border border-[#E8D5C8]/80 text-[#8A7A72] dark:border-slate-800 dark:text-slate-300 hover:bg-[#FFE5DA] hover:text-[#2D1B14] rounded text-[9px] transition cursor-pointer font-medium" title="Salin Link Drive">
                      Salin Link
                    </button>
                  </div>
                </div>
                <span v-else class="text-[#C4B0A5] dark:text-slate-500">-</span>
              </td>
              <td class="p-3 hidden md:table-cell">
                <div v-if="item.fg_name" class="flex flex-col gap-1 items-start">
                  <span class="text-[10px] px-2 py-0.5 bg-[#FAF0DD] dark:bg-amber-950/30 rounded text-[#B5942B] dark:text-amber-400 font-semibold">{{ item.fg_name }}</span>
                  <span v-if="item.fg_payout_status !== 'paid'" class="text-[9px] text-amber-600 dark:text-amber-400 font-bold animate-pulse">⏳ Fee Belum Dibayar</span>
                </div>
                <span v-else class="text-[#C4B0A5] dark:text-slate-500">-</span>
              </td>
              <td class="p-3">
                <span v-if="activeTab === 'completed'" class="status-chip bg-[#D1E8CF] dark:bg-green-900/20 text-[#4A7A4A] dark:text-green-400 text-[9px]">Selesai</span>
                <span v-else class="status-chip bg-[#FEF2F2] dark:bg-red-950/20 text-[#EF4444] dark:text-red-400 text-[9px]">Batal</span>
              </td>
              <td class="p-3 text-right">
                <div class="flex items-center justify-end gap-1.5 flex-wrap">
                  <button @click="sendWaSummary(item)" class="px-2.5 py-1.5 bg-[#0f766e] text-white hover:bg-[#0d6860] rounded-xl text-[10px] font-semibold transition inline-flex items-center gap-1 shadow-sm cursor-pointer whitespace-nowrap" title="Kirim Rekap Berkas & Link ke WhatsApp Client">
                    💬 WA Rekap
                  </button>
                  <template v-if="(item.drive_parent_url || item.download_url) && item.drive_cleanup_status !== 'trashed'">
                    <button v-if="item.drive_cleanup_status === 'transferring'" disabled class="px-2.5 py-1.5 bg-amber-500 text-white rounded-xl text-[10px] font-semibold transition inline-flex items-center gap-1 shadow-sm opacity-90 animate-pulse cursor-not-allowed whitespace-nowrap">
                      <span class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span> ⏳ Transferring...
                    </button>
                    <button v-else-if="item.drive_cleanup_status === 'transferred'" disabled class="px-2.5 py-1.5 bg-blue-600/80 text-white rounded-xl text-[10px] font-semibold transition inline-flex items-center gap-1 shadow-sm opacity-60 cursor-not-allowed whitespace-nowrap">
                      ✅ Transferred
                    </button>
                    <button v-else-if="item.drive_cleanup_status === 'failed'" @click="openTransferModal(item)" class="px-2.5 py-1.5 bg-rose-600 text-white hover:bg-rose-700 rounded-xl text-[10px] font-semibold transition inline-flex items-center gap-1 shadow-sm cursor-pointer animate-pulse whitespace-nowrap" title="Transfer gagal. Klik untuk retry / bantuan WA">
                      ⚠️ Transfer Gagal
                    </button>
                    <button v-else @click="openTransferModal(item)" class="px-2.5 py-1.5 bg-amber-600 text-white hover:bg-amber-700 rounded-xl text-[10px] font-semibold transition inline-flex items-center gap-1 shadow-sm cursor-pointer whitespace-nowrap">
                      🔄 Transfer
                    </button>
                  </template>
                </div>
              </td>
            </tr>
            <tr v-if="data.length === 0">
              <td class="p-8 text-center text-[#C4B0A5] dark:text-slate-500" colspan="7">
                <span class="text-2xl block mb-1">📂</span>
                <span class="text-xs">{{ activeTab === 'completed' ? 'Belum ada client yang selesai' : 'Belum ada client yang batal' }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile Card List (Visible on Mobile) -->
      <div class="md:hidden space-y-3">
        <div v-for="(item, idx) in filteredData" :key="item.id"
          class="card p-4 space-y-3 dark:bg-slate-900 dark:border-slate-800">
          <div class="flex justify-between items-start">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-[#FAF0DD] dark:bg-amber-950/20 flex items-center justify-center text-[10px] font-bold text-[#B5942B] dark:text-amber-400 flex-shrink-0">
                {{ (item.client_name||'?')[0] }}
              </div>
              <div>
                <span class="font-bold text-xs text-[#2D1B14] dark:text-slate-100">{{ item.client_name }}</span>
                <p class="text-[10px] text-[#8A7A72]">{{ item.university || '-' }}</p>
              </div>
            </div>
            <span class="status-chip flex-shrink-0 text-[10px]" :class="activeTab === 'completed' ? 'bg-[#D1E8CF] dark:bg-green-900/20 text-[#4A7A4A] dark:text-green-400' : 'bg-[#FEF2F2] dark:bg-red-950/20 text-[#EF4444] dark:text-red-400'">
              {{ activeTab === 'completed' ? 'Selesai' : 'Batal' }}
            </span>
          </div>

          <div class="text-[11px] space-y-1.5 pt-2 border-t border-[#E8D5C8]/40 dark:border-slate-800/60 text-[#8A7A72] dark:text-slate-400">
            <div class="flex justify-between">
              <span>No. Invoice:</span>
              <button @click="openInvoice(item)" class="text-[#D94A3D] hover:text-[#C0392B] font-semibold text-xs hover:underline transition cursor-pointer">
                INV-{{ String(item.id).padStart(4, '0') }}
              </button>
            </div>
            
            <div class="flex justify-between" v-if="item.fg_name">
              <span>Fotografer:</span>
              <div class="text-right">
                <span class="font-semibold text-[#2D1B14] dark:text-slate-200">{{ item.fg_name }}</span>
                <div v-if="item.fg_payout_status !== 'paid'" class="text-[9px] text-amber-600 font-bold animate-pulse">⏳ Fee Belum Dibayar</div>
              </div>
            </div>

            <!-- Buka Drive / Token / Link -->
            <div class="flex justify-between" v-if="item.drive_parent_url || item.download_url">
              <span>Link Drive:</span>
              <div class="text-right space-y-1" @click.stop>
                <div class="flex items-center justify-end gap-1.5 flex-wrap">
                  <a :href="item.drive_parent_url || item.download_url" target="_blank" class="text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center justify-end gap-1">
                    📁 Buka Drive
                  </a>
                  <span v-if="item.drive_cleanup_status === 'transferred'" class="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">👤 Transferred</span>
                  <span v-else-if="item.drive_cleanup_status === 'trashed'" class="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold border border-slate-200">🗑️ Trashed</span>
                </div>
                <div class="flex flex-wrap items-center justify-end gap-1.5 mt-0.5">
                  <span v-if="item.tracking_token" class="text-[9px] font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded text-slate-500">Token: {{ item.tracking_token }}</span>
                  <button v-if="item.tracking_token" @click="copyToken(item.tracking_token)" class="px-1.5 py-0.5 border border-[#E8D5C8]/80 text-[#8A7A72] hover:bg-[#FFE5DA] rounded text-[9px] transition cursor-pointer font-medium">
                    Salin Token
                  </button>
                  <button @click="copyText(item.drive_parent_url || item.download_url)" class="px-1.5 py-0.5 border border-[#E8D5C8]/80 text-[#8A7A72] hover:bg-[#FFE5DA] rounded text-[9px] transition cursor-pointer font-medium">
                    Salin Link
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="pt-2 border-t border-[#E8D5C8]/40 dark:border-slate-800/60 flex gap-2" @click.stop>
            <button @click="sendWaSummary(item)" class="flex-1 py-2 bg-[#0f766e] text-white hover:bg-[#0d6860] rounded-xl text-xs font-semibold text-center transition inline-flex items-center justify-center gap-1">
              💬 WA Rekap
            </button>
            <button v-if="(item.drive_parent_url || item.download_url) && item.drive_cleanup_status !== 'trashed'" @click="openTransferModal(item)" class="flex-1 py-2 bg-amber-600 text-white hover:bg-amber-700 rounded-xl text-xs font-semibold text-center transition inline-flex items-center justify-center gap-1" :disabled="item.drive_cleanup_status === 'transferred'" :class="{ 'opacity-50': item.drive_cleanup_status === 'transferred' }">
              🔄 {{ item.drive_cleanup_status === 'transferred' ? 'Transferred' : 'Transfer Drive' }}
            </button>
          </div>
        </div>

        <div v-if="data.length === 0" class="text-center py-16 text-[#C4B0A5] dark:text-slate-500 card bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800">
          <span class="text-2xl block mb-1">📂</span>
          <span class="text-xs">{{ activeTab === 'completed' ? 'Belum ada client yang selesai' : 'Belum ada client yang batal' }}</span>
        </div>
      </div>
    </div>

    <!-- MODAL: Invoice Detail Popup -->
    <div v-if="showInvoice" class="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style="background: rgba(45,27,20,0.6); backdrop-filter: blur(6px);" @click.self="showInvoice = false">
      <div class="card w-full max-w-md p-6 animate-pop relative dark:bg-slate-900 dark:border-slate-800 my-8">
        <button @click="showInvoice = false" class="absolute top-3 right-4 text-[#8A7A72] dark:text-slate-400 hover:text-[#2D1B14] dark:hover:text-slate-200 text-xl font-bold">×</button>
        
        <!-- Invoice Header -->
        <div class="flex justify-between items-start border-b border-[#E8D5C8] dark:border-slate-800 pb-4 mb-4">
          <div>
            <h1 class="text-base font-bold text-[#2D1B14] dark:text-slate-200 uppercase tracking-wider">{{ authStore.companyName }}</h1>
            <p class="text-[10px] text-[#8A7A72] dark:text-slate-400">Photography Agency</p>
          </div>
          <div class="text-right">
            <h2 class="text-xs font-bold text-[#D94A3D] uppercase tracking-wide">Invoice</h2>
            <p class="text-[10px] text-[#8A7A72] dark:text-slate-400 mt-0.5">No: INV-{{ String(invoiceData?.id).padStart(4, '0') }}</p>
          </div>
        </div>

        <!-- Client Info -->
        <div class="grid grid-cols-2 gap-4 text-xs mb-5">
          <div>
            <p class="text-[9px] uppercase tracking-wider text-[#C4B0A5] dark:text-slate-500 font-bold mb-1">Client</p>
            <p class="font-bold text-[#2D1B14] dark:text-slate-200">{{ invoiceData?.client_name }}</p>
            <p class="text-[#8A7A72] dark:text-slate-400">{{ invoiceData?.university || '-' }}</p>
            <p class="text-[#8A7A72] dark:text-slate-400">{{ invoiceData?.client_phone }}</p>
          </div>
          <div class="text-right">
            <p class="text-[9px] uppercase tracking-wider text-[#C4B0A5] dark:text-slate-500 font-bold mb-1">Status</p>
            <span v-if="invoiceData?.status === 'completed'" class="status-chip bg-[#D1E8CF] dark:bg-green-900/20 text-[#4A7A4A] dark:text-green-400 font-bold">SELESAI</span>
            <span v-else class="status-chip bg-[#FEF2F2] dark:bg-red-950/20 text-[#EF4444] dark:text-red-400 font-bold">BATAL</span>
          </div>
        </div>

        <!-- Detail Table -->
        <div class="border border-[#E8D5C8] dark:border-slate-800 rounded-xl overflow-hidden mb-4 text-xs">
          <table class="w-full">
            <tbody>
              <tr class="border-b border-[#E8D5C8]/60 dark:border-slate-800/60">
                <td class="p-2.5 text-[#8A7A72] dark:text-slate-400">Paket</td>
                <td class="p-2.5 font-semibold text-[#2D1B14] dark:text-slate-200 text-right">{{ invoiceData?.package_name || '-' }}</td>
              </tr>
              <tr class="border-b border-[#E8D5C8]/60 dark:border-slate-800/60">
                <td class="p-2.5 text-[#8A7A72] dark:text-slate-400">Tanggal Wisuda</td>
                <td class="p-2.5 font-medium text-[#2D1B14] dark:text-slate-200 text-right">{{ invoiceData?.graduation_date || '-' }}</td>
              </tr>
              <tr class="border-b border-[#E8D5C8]/60 dark:border-slate-800/60">
                <td class="p-2.5 text-[#8A7A72] dark:text-slate-400">Jam Shoot</td>
                <td class="p-2.5 font-medium text-[#2D1B14] dark:text-slate-200 text-right">{{ invoiceData?.shooting_time || '-' }}</td>
              </tr>
              <tr class="border-b border-[#E8D5C8]/60 dark:border-slate-800/60">
                <td class="p-2.5 text-[#8A7A72] dark:text-slate-400">Lokasi</td>
                <td class="p-2.5 font-medium text-[#2D1B14] dark:text-slate-200 text-right">{{ invoiceData?.location || '-' }}</td>
              </tr>
              <tr class="border-b border-[#E8D5C8]/60 dark:border-slate-800/60">
                <td class="p-2.5 text-[#8A7A72] dark:text-slate-400">Fotografer</td>
                <td class="p-2.5 font-medium text-[#2D1B14] dark:text-slate-200 text-right">{{ invoiceData?.fg_name || '-' }}</td>
              </tr>
              <tr class="border-b border-[#E8D5C8]/60 dark:border-slate-800/60">
                <td class="p-2.5 text-[#8A7A72] dark:text-slate-400">DP</td>
                <td class="p-2.5 text-right">
                  <span class="font-semibold text-[#2D1B14] dark:text-slate-200">Rp {{ (invoiceData?.dp_amount || 0).toLocaleString('id-ID') }}</span>
                  <span class="ml-1 text-[9px] px-1.5 py-0.5 rounded-full" :class="invoiceData?.dp_status === 'paid' ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-[#FFF0E8] text-[#F4A261]'">{{ invoiceData?.dp_status }}</span>
                </td>
              </tr>
              <tr class="border-b border-[#E8D5C8]/60 dark:border-slate-800/60">
                <td class="p-2.5 text-[#8A7A72] dark:text-slate-400">Pelunasan</td>
                <td class="p-2.5 text-right">
                  <span class="text-[9px] px-1.5 py-0.5 rounded-full" :class="invoiceData?.balance_status === 'paid' ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-[#FFF0E8] text-[#F4A261]'">{{ invoiceData?.balance_status }}</span>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="bg-[#FFF8F3] dark:bg-slate-800 font-bold text-[#2D1B14] dark:text-slate-200">
                <td class="p-2.5">Total Harga</td>
                <td class="p-2.5 text-right text-[#D94A3D]">Rp {{ (invoiceData?.total_price || 0).toLocaleString('id-ID') }}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Footer -->
        <div class="flex gap-2 justify-end">
          <button @click="viewPublicInvoice(invoiceData)" class="px-4 py-2 bg-[#FFF0E8] text-[#D94A3D] text-xs font-semibold rounded-xl hover:bg-[#FFE5DA] transition">
            🔗 Lihat Invoice Publik
          </button>
          <button @click="showInvoice = false" class="px-4 py-2 bg-[#2D1B14] dark:bg-slate-800 text-white dark:text-slate-200 text-xs font-semibold rounded-xl hover:bg-slate-900 dark:hover:bg-slate-700 transition">
            Tutup
          </button>
        </div>
      </div>
    </div>

    <!-- Transfer Ownership Modal -->
    <div v-if="showTransferModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div class="card w-full max-w-md p-6 dark:bg-slate-900 dark:border-slate-800 space-y-4 animate-scale-in">
        <div class="flex items-center justify-between border-b border-[#E8D5C8]/40 dark:border-slate-800 pb-3">
          <h3 class="font-bold text-sm text-[#2D1B14] dark:text-slate-200 flex items-center gap-2">
            <span>🔄</span> Transfer Kepemilikan Google Drive
          </h3>
          <button @click="showTransferModal=false" class="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 font-bold cursor-pointer">✕</button>
        </div>

        <div class="space-y-3 text-xs">
          <p class="text-slate-600 dark:text-slate-300">
            Transfer kepemilikan folder & seluruh file Drive untuk klien <strong class="text-[#2D1B14] dark:text-slate-100">{{ transferItem?.client_name }}</strong> (Booking #{{ transferItem?.id }}).
          </p>

          <div>
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1 font-bold uppercase">Email Google Drive Klien</label>
            <input v-model="transferEmail" type="email" class="input-fancy w-full !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="klien@gmail.com">
            <p class="text-[9px] text-slate-400 mt-1">Pastikan email diawali @gmail.com yang aktif untuk menerima ownership transfer.</p>
          </div>

          <div v-if="transferSuccessMsg" class="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 text-emerald-700 dark:text-emerald-300 rounded-xl space-y-2">
            <p class="font-bold">✓ {{ transferSuccessMsg }}</p>
            <a v-if="transferWaUrl" :href="transferWaUrl" target="_blank" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold text-[10px] hover:bg-emerald-700 transition">
              💬 Kirim WA Konfirmasi Transfer Ke Klien
            </a>
          </div>

          <div v-else-if="transferErrorMsg || transferItem?.drive_cleanup_status === 'failed'" class="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 text-rose-700 dark:text-rose-300 rounded-xl space-y-2">
            <p class="font-bold">⚠️ Transfer Kepemilikan Terkendala</p>
            <p class="text-[10px] opacity-90">{{ transferErrorMsg || transferItem?.drive_cleanup_notes || 'Transfer gagal. Pastikan email diawali @gmail.com aktif.' }}</p>
            <a v-if="transferWaUrl" :href="transferWaUrl" target="_blank" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-lg font-bold text-[10px] hover:bg-rose-700 transition">
              💬 WA Klien Bantu Manual / Klaim Ulang
            </a>
          </div>
        </div>

        <div class="flex gap-2 pt-2 border-t border-[#E8D5C8]/40 dark:border-slate-800">
          <button @click="showTransferModal=false" class="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition">Tutup</button>
          <button @click="executeTransferOwnership" :disabled="isTransferring || !transferEmail.trim()" class="flex-1 py-2 bg-[#D94A3D] hover:bg-[#C0392B] text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 disabled:opacity-40">
            <span v-if="isTransferring" class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            🔄 Transfer Sekarang
          </button>
        </div>
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

// Search & Filter
const searchQuery = ref('')
const driveFilter = ref('all')

const filteredData = computed(() => {
  return data.value.filter(item => {
    // Search query filter
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim()
      const matchName = (item.client_name || '').toLowerCase().includes(q)
      const matchUniv = (item.university || '').toLowerCase().includes(q)
      const matchPhone = (item.client_phone || '').includes(q)
      const matchEmail = (item.client_email || '').toLowerCase().includes(q)
      const matchInv = `inv-${String(item.id).padStart(4, '0')}`.includes(q) || String(item.id).includes(q)
      if (!matchName && !matchUniv && !matchPhone && !matchEmail && !matchInv) return false
    }

    // Drive status filter
    if (driveFilter.value === 'active') {
      if (!item.download_url && !item.drive_parent_url) return false
      if (item.drive_cleanup_status === 'transferred' || item.drive_cleanup_status === 'trashed') return false
    } else if (driveFilter.value === 'transferred') {
      if (item.drive_cleanup_status !== 'transferred') return false
    } else if (driveFilter.value === 'trashed') {
      if (item.drive_cleanup_status !== 'trashed') return false
    } else if (driveFilter.value === 'no_drive') {
      if (item.download_url || item.drive_parent_url) return false
    }

    return true
  })
})

// Transfer ownership modal
const showTransferModal = ref(false)
const transferItem = ref(null)
const transferEmail = ref('')
const isTransferring = ref(false)
const transferSuccessMsg = ref('')
const transferErrorMsg = ref('')
const transferWaUrl = ref('')

function openTransferModal(item) {
  transferItem.value = item
  transferEmail.value = item.client_email || ''
  transferSuccessMsg.value = ''
  transferErrorMsg.value = item.drive_cleanup_notes || ''
  transferWaUrl.value = ''
  showTransferModal.value = true
}

async function executeTransferOwnership() {
  if (!transferItem.value || !transferEmail.value.trim()) return
  isTransferring.value = true
  transferSuccessMsg.value = ''
  transferErrorMsg.value = ''
  try {
    const res = await fetch(`${API}/bookings/${transferItem.value.id}/transfer-drive-ownership`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: transferEmail.value.trim() }),
      credentials: 'include'
    })
    const d = await res.json()
    if (res.ok && d.success) {
      transferItem.value.drive_cleanup_status = 'transferring'
      transferItem.value.drive_cleanup_notes = 'Sedang mentransfer kepemilikan folder Google Drive...'
      transferItem.value.client_email = transferEmail.value.trim()
      showTransferModal.value = false
      load(true)
    } else {
      transferItem.value.drive_cleanup_status = 'failed'
      transferItem.value.drive_cleanup_notes = d.error || 'Gagal mentransfer kepemilikan'
      transferErrorMsg.value = d.error || 'Gagal mentransfer kepemilikan'
      transferWaUrl.value = d.direct_wa_url || ''
    }
  } catch (e) {
    transferErrorMsg.value = 'Terjadi kesalahan koneksi: ' + e.message
  } finally {
    isTransferring.value = false
  }
}

// Invoice modal
const showInvoice = ref(false)
const invoiceData = ref(null)

let timer = null
onMounted(() => {
  load()
  timer = setInterval(() => load(true), 3000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

async function load(silent = false) {
  if (!silent) loading.value = true
  try {
    const r = await fetch(`${API}/archive?tab=${activeTab.value}&limit=50`, { credentials: 'include' })
    const d = await r.json()
    data.value = d.data || []
    completedCount.value = d.completedCount || 0
    cancelledCount.value = d.cancelledCount || 0
  } catch {}
  if (!silent) loading.value = false
}

function openInvoice(item) {
  invoiceData.value = item
  showInvoice.value = true
}

function viewPublicInvoice(item) {
  if (item) {
    window.open(`/invoice.html?id=${item.id}`, '_blank')
  }
}

function viewPhysicalInvoice(item) {
  if (item) {
    const url = item.final_invoice_url || `/uploads/invoices-client/invoice_final_bkg_${item.id}.html`
    window.open(url, '_blank')
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
      msg += `📁 LINK GOOGLE DRIVE (FOLDER INDUK CLIENT):\n${driveParentUrl}\n\n`
    }
    msg += `📄 LINK INVOICE RESMI (PELUNASAN):\n${invoiceUrl}\n\n`
    msg += `Terima kasih banyak telah mempercayakan momen bahagia Anda bersama kami! ✨`
  }

  const phone = item.client_phone.replace(/[^0-9]/g, '')
  const waUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`
  window.open(waUrl, '_blank')
}

async function resetBookingToken(item) {
  if (!item || !confirm(`Reset token tracking untuk client ${item.client_name}?`)) return
  try {
    const res = await fetch(`/api/admin/bookings/${item.id}/reset-token`, {
      method: 'POST',
      credentials: 'include'
    })
    const data = await res.json()
    if (res.ok) {
      item.tracking_token = data.tracking_token
      alert(`✅ Token tracking baru: ${data.tracking_token}`)
    } else {
      alert(data.error || 'Gagal reset token')
    }
  } catch (e) {
    alert('Terjadi kesalahan koneksi')
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