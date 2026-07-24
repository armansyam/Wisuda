<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-5">
      <div class="flex items-center gap-2.5">
        <h2 class="text-xl font-bold text-[#2D1B14] dark:text-slate-200 tracking-tight">Payroll Freelance</h2>
        <span class="text-[10px] text-[#C4B0A5] bg-white dark:bg-slate-900 rounded-full px-2.5 py-0.5 border border-[#E8D5C8] dark:border-slate-800" v-if="payoutPending > 0">{{ payoutPending }} pending</span>
      </div>
    </div>

    <!-- Tab Filter -->
    <div class="flex gap-2 mb-4">
      <button @click="filterStatus = 'pending'; loadPayouts()" class="px-4 py-2 rounded-xl text-xs font-semibold transition"
        :class="filterStatus === 'pending' ? 'bg-[#2D1B14] text-[#D4AF37] dark:bg-amber-950/40 dark:text-amber-400' : 'bg-white dark:bg-slate-900 text-[#8A7A72] dark:text-slate-400 border border-[#E8D5C8]/80 dark:border-slate-800 hover:bg-[#FFF8F3] dark:hover:bg-slate-800'">
        ⏳ Belum Dibayar
      </button>
      <button @click="filterStatus = 'paid'; loadPayouts()" class="px-4 py-2 rounded-xl text-xs font-semibold transition"
        :class="filterStatus === 'paid' ? 'bg-[#2D1B14] text-[#D4AF37] dark:bg-amber-950/40 dark:text-amber-400' : 'bg-white dark:bg-slate-900 text-[#8A7A72] dark:text-slate-400 border border-[#E8D5C8]/80 dark:border-slate-800 hover:bg-[#FFF8F3] dark:hover:bg-slate-800'">
        ✅ Sudah Dibayar
      </button>
      <button @click="filterStatus = ''; loadPayouts()" class="px-4 py-2 rounded-xl text-xs font-semibold transition"
        :class="filterStatus === '' ? 'bg-[#2D1B14] text-[#D4AF37] dark:bg-amber-950/40 dark:text-amber-400' : 'bg-white dark:bg-slate-900 text-[#8A7A72] dark:text-slate-400 border border-[#E8D5C8]/80 dark:border-slate-800 hover:bg-[#FFF8F3] dark:hover:bg-slate-800'">
        📋 Semua
      </button>
    </div>

    <!-- Clean Table View for Pending Payroll -->
    <div v-if="filterStatus === 'pending'" class="space-y-4">
      <!-- Desktop Pending Table (Hidden on Mobile) -->
      <div class="card overflow-hidden dark:bg-slate-900 dark:border-slate-800 hidden md:block">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-[#8A7A72] dark:text-slate-400 border-b border-[#E8D5C8] dark:border-slate-800 text-left text-xs">
              <th class="p-3.5 font-semibold">Fotografer (FG)</th>
              <th class="p-3.5 font-semibold text-center">Jumlah Client</th>
              <th class="p-3.5 font-semibold text-right">Total Fee Payout</th>
              <th class="p-3.5 font-semibold text-center">Status Sesi</th>
              <th class="p-3.5 font-semibold text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="g in groupedPendingPayouts" :key="g.fg_id" class="border-b border-[#E8D5C8]/60 dark:border-slate-800/60 hover:bg-[#FFF8F3] dark:hover:bg-slate-800/50 text-[#2D1B14] dark:text-slate-200 text-xs transition">
              <td class="p-3.5">
                <div class="font-bold text-xs text-[#2D1B14] dark:text-slate-100">{{ g.fg_name }}</div>
                <div class="text-[10px] text-[#8A7A72] dark:text-slate-400 font-mono">{{ g.fg_phone }}</div>
                <div v-if="g.bank_account?.bank" class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  <span class="font-bold text-[#2D1B14] dark:text-slate-300">{{ g.bank_account.bank }}</span> - {{ g.bank_account.norek }} (A/N: {{ g.bank_account.atas_nama }})
                </div>
                <div v-else class="text-[10px] text-red-500 font-semibold mt-0.5">⚠️ Rekening Belum Diatur</div>
              </td>
              <td class="p-3.5 text-center">
                <span class="px-2.5 py-1 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold text-xs rounded-full border border-purple-200 dark:border-purple-800">
                  {{ g.assignments.length }} Client
                </span>
              </td>
              <td class="p-3.5 text-right font-bold text-xs text-[#D94A3D]">
                Rp {{ selectedTotalForFg(g.fg_id).toLocaleString('id-ID') }}
              </td>
              <td class="p-3.5 text-center">
                <span v-if="getSessionRatio(g).completed === getSessionRatio(g).total" class="status-chip bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 text-[10px] font-bold">
                  ✓ {{ getSessionRatio(g).completed }}/{{ getSessionRatio(g).total }} Selesai
                </span>
                <span v-else class="status-chip bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200 text-[10px] font-bold animate-pulse">
                  ⏳ {{ getSessionRatio(g).completed }}/{{ getSessionRatio(g).total }} Selesai
                </span>
              </td>
              <td class="p-3.5 text-center">
                <button @click="openFgDetailModal(g)" class="px-3 py-1.5 bg-[#1A1A2E] dark:bg-amber-950/40 text-[#C59B63] dark:text-amber-400 hover:bg-[#2A2A4E] rounded-xl text-[11px] font-semibold transition cursor-pointer shadow-sm inline-flex items-center gap-1.5">
                  🔍 Detail & Bayar
                </button>
              </td>
            </tr>
            <tr v-if="groupedPendingPayouts.length === 0">
              <td colspan="5" class="p-12 text-center text-[#C4B0A5] dark:text-slate-500">
                <span class="text-3xl block mb-2">📸</span>
                <span class="text-xs">Tidak ada data payroll freelance pending</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile Pending Card List (Visible on Mobile) -->
      <div class="md:hidden space-y-3">
        <div v-for="g in groupedPendingPayouts" :key="g.fg_id"
          class="card p-4 space-y-3 dark:bg-slate-900 dark:border-slate-800">
          <div class="flex justify-between items-start">
            <div>
              <h4 class="font-bold text-sm text-[#2D1B14] dark:text-slate-200">{{ g.fg_name }}</h4>
              <p class="text-[10px] text-[#8A7A72] font-mono mt-0.5">{{ g.fg_phone }}</p>
            </div>
            <span class="px-2.5 py-0.5 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold text-[10px] rounded-full border border-purple-200 dark:border-purple-800 flex-shrink-0">
              {{ g.assignments.length }} Client
            </span>
          </div>

          <div class="text-[11px] space-y-1.5 pt-2 border-t border-[#E8D5C8]/40 dark:border-slate-800/60 text-[#8A7A72] dark:text-slate-400">
            <div class="flex justify-between">
              <span>Total Fee Payout:</span>
              <span class="font-bold text-xs text-[#D94A3D]">Rp {{ selectedTotalForFg(g.fg_id).toLocaleString('id-ID') }}</span>
            </div>
            <div class="flex justify-between">
              <span>Status Sesi:</span>
              <span v-if="getSessionRatio(g).completed === getSessionRatio(g).total" class="text-emerald-600 font-semibold text-[10px]">
                ✓ {{ getSessionRatio(g).completed }}/{{ getSessionRatio(g).total }} Selesai
              </span>
              <span v-else class="text-amber-600 font-semibold text-[10px] animate-pulse">
                ⏳ {{ getSessionRatio(g).completed }}/{{ getSessionRatio(g).total }} Selesai
              </span>
            </div>
            <div class="flex flex-col gap-0.5 pt-1">
              <span class="text-[10px] text-[#C4B0A5] uppercase tracking-wider font-bold">Rekening</span>
              <div v-if="g.bank_account?.bank" class="text-[11px] text-[#2D1B14] dark:text-slate-200 font-medium">
                {{ g.bank_account.bank }} - {{ g.bank_account.norek }}
                <div class="text-[9px] text-[#8A7A72]">A/N: {{ g.bank_account.atas_nama }}</div>
              </div>
              <div v-else class="text-[11px] text-red-500 font-semibold">⚠️ Rekening Belum Diatur</div>
            </div>
          </div>

          <div class="pt-2 border-t border-[#E8D5C8]/40 dark:border-slate-800/60" @click.stop>
            <button @click="openFgDetailModal(g)" class="w-full py-2 bg-[#1A1A2E] dark:bg-amber-950/40 text-[#C59B63] dark:text-amber-400 rounded-xl text-xs font-semibold text-center hover:bg-[#2A2A4E] transition">
              🔍 Detail & Bayar
            </button>
          </div>
        </div>
        
        <div v-if="groupedPendingPayouts.length === 0" class="text-center py-16 text-[#C4B0A5] dark:text-slate-500 card bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800">
          <span class="text-3xl block mb-2">📸</span>
          <span class="text-xs">Tidak ada data payroll freelance pending</span>
        </div>
      </div>
    </div>

    <!-- Plain Table View (Shown when filterStatus is 'paid' or empty) -->
    <div v-else class="space-y-4">
      <!-- Desktop Payouts Table (Hidden on Mobile) -->
      <div class="card overflow-hidden dark:bg-slate-900 dark:border-slate-800 hidden md:block">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-[#8A7A72] dark:text-slate-400 border-b border-[#E8D5C8] dark:border-slate-800 text-left">
              <th class="p-3 font-medium">Fotografer (FG)</th>
              <th class="p-3 font-medium">Client / Project</th>
              <th class="p-3 font-medium">Fee Payout</th>
              <th class="p-3 font-medium">Rekening Tujuan</th>
              <th class="p-3 font-medium">Status</th>
              <th class="p-3 font-medium">Tanggal Payment</th>
              <th class="p-3 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="p in payouts" :key="p.id">
              <!-- Main Row (Clickable for details) -->
              <tr @click="toggleExpandPayout(p.id)"
                  class="border-b border-[#E8D5C8]/60 dark:border-slate-800/60 hover:bg-[#FFF8F3] dark:hover:bg-slate-800/50 text-[#2D1B14] dark:text-slate-200 cursor-pointer transition">
                <td class="p-3">
                  <div class="font-medium">{{ p.fg_name }}</div>
                  <div class="text-[10px] text-[#8A7A72] dark:text-slate-500">{{ p.fg_phone }}</div>
                </td>
                <td class="p-3">
                  <div class="flex items-center gap-1.5">
                    <span class="px-2.5 py-0.5 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold text-xs rounded-full border border-purple-200 dark:border-purple-800">
                      {{ getClientLines(p.client_name).length }} Client
                    </span>
                    <span class="text-[10px] text-slate-400 font-bold transition-transform duration-200" :class="expandedPayouts[p.id] ? 'rotate-180' : ''">▾</span>
                  </div>
                </td>
                <td class="p-3 font-semibold text-[#D94A3D]">
                  Rp {{ (p.total_payout || 0).toLocaleString('id-ID') }}
                </td>
                <td class="p-3 text-xs text-[#8A7A72] dark:text-slate-400">
                  <div v-if="p.bank_account?.bank">
                    <span class="font-semibold text-[#2D1B14] dark:text-slate-200">{{ p.bank_account.bank }}</span> - {{ p.bank_account.norek }}
                    <div class="text-[10px] italic">A/N: {{ p.bank_account.atas_nama }}</div>
                  </div>
                  <div v-else>-</div>
                </td>
                <td class="p-3">
                  <span class="status-chip" :class="p.status === 'paid' ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-[#FFF0E8] text-[#F4A261]'">
                    {{ p.status === 'paid' ? 'Paid' : 'Pending' }}
                  </span>
                </td>
                <td class="p-3 text-xs text-[#8A7A72] dark:text-slate-400 font-medium">
                  {{ p.paid_at ? formatDate(p.paid_at) : '-' }}
                </td>
                <td class="p-3" @click.stop>
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <button @click="openInvoice(p)" class="px-2 py-1 bg-[#FFF0E8] text-[#D94A3D] rounded-lg text-[10px] font-medium hover:bg-[#FFE5DA] transition whitespace-nowrap">
                      📄 Invoice
                    </button>
                    <a v-if="p.status === 'paid'" :href="getWaReceiptLink(p)" target="_blank" class="px-2 py-1 bg-green-50 text-green-600 rounded-lg text-[10px] font-medium hover:bg-green-100 transition whitespace-nowrap">
                      📤 Slip WA
                    </a>
                  </div>
                </td>
              </tr>
              <!-- Expanded Detailed Client List Row -->
              <tr v-show="expandedPayouts[p.id]" class="bg-[#FAF9F6]/80 dark:bg-slate-900/60">
                <td colspan="7" class="p-4 border-b border-[#E8D5C8]/40">
                  <div class="max-w-md bg-white dark:bg-slate-900 p-4 rounded-xl border border-[#E8D5C8]/60 dark:border-slate-800 space-y-2.5 shadow-sm">
                    <p class="text-[10px] text-[#C4B0A5] dark:text-slate-500 uppercase tracking-wider font-bold">Client / Project yang di-handle:</p>
                    <ul class="space-y-1.5 text-xs text-[#2D1B14] dark:text-slate-200 font-medium">
                      <li v-for="(client, idx) in getClientLines(p.client_name)" :key="idx" class="flex items-start gap-2">
                        <span class="text-[10px] text-[#C59B63] font-bold">{{ idx + 1 }}.</span>
                        <span class="whitespace-pre-line">{{ client }}</span>
                      </li>
                    </ul>
                    <div v-if="p.status !== 'paid'" class="text-[10px] text-[#8A7A72] dark:text-slate-500 pt-1">
                      Jadwal Wisuda: <span class="font-semibold">{{ formatDate(p.graduation_date) }}</span>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
            <tr v-if="payouts.length === 0">
              <td class="p-3 text-[#C4B0A5] dark:text-slate-500 text-center" colspan="7">Belum ada data Payout</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile Payouts Card List (Visible on Mobile) -->
      <div class="md:hidden space-y-3">
        <div v-for="p in payouts" :key="p.id"
          class="card p-4 space-y-3 dark:bg-slate-900 dark:border-slate-800">
          <div class="flex justify-between items-start">
            <div>
              <h4 class="font-bold text-sm text-[#2D1B14] dark:text-slate-200">{{ p.fg_name }}</h4>
              <p class="text-[10px] text-[#8A7A72] mt-0.5">{{ p.fg_phone }}</p>
            </div>
            <span class="status-chip flex-shrink-0 text-[10px]" :class="p.status === 'paid' ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-[#FFF0E8] text-[#F4A261]'">
              {{ p.status === 'paid' ? 'Paid' : 'Pending' }}
            </span>
          </div>

          <div class="text-[11px] space-y-1.5 pt-2 border-t border-[#E8D5C8]/40 dark:border-slate-800/60 text-[#8A7A72] dark:text-slate-400">
            <div class="flex justify-between items-center cursor-pointer select-none" @click="toggleExpandPayout(p.id)">
              <span>Client / Project:</span>
              <div class="flex items-center gap-1.5">
                <span class="px-2 py-0.5 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold text-[9px] rounded-full border border-purple-200">
                  {{ getClientLines(p.client_name).length }} Client
                </span>
                <span class="text-[9px] text-slate-400 font-bold">{{ expandedPayouts[p.id] ? 'Sembunyikan ▴' : 'Detail ▾' }}</span>
              </div>
            </div>
            
            <!-- Mobile Expanded Details -->
            <div v-show="expandedPayouts[p.id]" class="bg-[#FAF9F6] dark:bg-slate-950 p-2.5 rounded-lg border border-[#E8D5C8]/60 space-y-1.5 mt-1 animate-fade-in text-left">
              <p class="text-[9px] text-[#C4B0A5] dark:text-slate-500 uppercase tracking-wider font-bold">Daftar Client:</p>
              <ul class="space-y-1 text-[11px] text-slate-700 dark:text-slate-350 font-medium">
                <li v-for="(client, idx) in getClientLines(p.client_name)" :key="idx" class="whitespace-pre-line">
                  {{ idx + 1 }}. {{ client }}
                </li>
              </ul>
              <div v-if="p.status !== 'paid'" class="text-[9px] text-[#8A7A72] pt-1">
                Jadwal: {{ formatDate(p.graduation_date) }}
              </div>
            </div>

            <div class="flex justify-between">
              <span>Fee Payout:</span>
              <span class="font-bold text-xs text-[#D94A3D]">Rp {{ (p.total_payout || 0).toLocaleString('id-ID') }}</span>
            </div>
            <div v-if="p.status === 'paid'" class="flex justify-between">
              <span>Tanggal Payment:</span>
              <span class="font-semibold text-[#2D1B14] dark:text-slate-200 text-xs">{{ formatDate(p.paid_at) }}</span>
            </div>
            <div class="flex flex-col gap-0.5 pt-1">
              <span class="text-[10px] text-[#C4B0A5] uppercase tracking-wider font-bold">Rekening Tujuan</span>
              <div v-if="p.bank_account?.bank" class="text-[11px] text-[#2D1B14] dark:text-slate-200 font-medium">
                {{ p.bank_account.bank }} - {{ p.bank_account.norek }}
                <div class="text-[9px] text-[#8A7A72]">A/N: {{ p.bank_account.atas_nama }}</div>
              </div>
              <div v-else class="text-[11px] text-slate-400 font-medium">-</div>
            </div>
          </div>

          <div class="flex gap-2 pt-2 border-t border-[#E8D5C8]/40 dark:border-slate-800/60" @click.stop>
            <button @click="openInvoice(p)" class="flex-1 py-2 bg-[#FFF0E8] text-[#D94A3D] rounded-xl text-xs font-semibold text-center hover:bg-[#FFE5DA] transition">
              📄 Invoice
            </button>
            <a v-if="p.status === 'paid'" :href="getWaReceiptLink(p)" target="_blank" class="flex-1 py-2 bg-green-50 text-green-600 rounded-xl text-xs font-semibold text-center hover:bg-green-100 transition">
              📤 Slip WA
            </a>
          </div>
        </div>

        <div v-if="payouts.length === 0" class="text-center py-16 text-[#C4B0A5] dark:text-slate-500 card bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800">
          <span class="text-xs">Belum ada data Payout</span>
        </div>
      </div>
    </div>

    <!-- MODAL: Complete Payment (Bayar) -->
    <div v-if="showPayModal" class="fixed inset-0 z-[70] flex items-center justify-center p-4" style="background: rgba(45,27,20,0.6); backdrop-filter: blur(6px);" @click.self="cancelPayModal()">
      <div class="card w-full max-w-sm p-6 animate-pop dark:bg-slate-900 dark:border-slate-800 shadow-2xl">
        <h3 class="font-bold text-lg text-[#2D1B14] dark:text-slate-200 mb-1">Konfirmasi Pembayaran</h3>
        <p class="text-xs text-[#8A7A72] dark:text-slate-400 mb-4">Kirim fee ke fotografer <span class="font-bold text-[#2D1B14] dark:text-slate-200">{{ payItem?.fg_name }}</span></p>
        
        <!-- Bank Target Info -->
        <div class="bg-[#FFF8F3] dark:bg-slate-800 border border-[#E8D5C8]/80 dark:border-slate-700 p-3 rounded-xl mb-4 text-xs">
          <p class="text-[10px] text-[#8A7A72] dark:text-slate-400 uppercase font-bold tracking-wider">Rekening Tujuan</p>
          <div v-if="payItem?.bank_account?.bank" class="mt-1">
            <div class="font-semibold text-[#2D1B14] dark:text-slate-200">{{ payItem.bank_account.bank }} - {{ payItem.bank_account.norek }}</div>
            <div class="text-[#8A7A72] dark:text-slate-400">A/N: {{ payItem.bank_account.atas_nama }}</div>
            <div class="font-bold text-[#D94A3D] mt-1.5 text-sm">Transfer: Rp {{ (payItem.total_payout || 0).toLocaleString('id-ID') }}</div>
          </div>
          <div v-else class="text-red-500 font-bold mt-1">⚠️ Freelancer belum set informasi Rekening Bank!</div>
        </div>

        <form @submit.prevent="submitPayment" class="space-y-4">
          <div class="flex gap-2 justify-end mt-5">
            <button type="button" @click="cancelPayModal()" class="px-4 py-2 text-xs font-semibold text-[#8A7A72] dark:text-slate-400 hover:text-[#2D1B14] dark:hover:text-slate-200 transition">
              Batal
            </button>
            <button type="submit" :disabled="payLoading" class="px-4 py-2 bg-[#059669] text-white text-xs font-semibold rounded-xl hover:bg-[#047857] transition">
              {{ payLoading ? 'Processing...' : 'Konfirmasi Pembayaran ✅' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL: Invoice Payout Detail -->
    <div v-if="showInvoiceModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style="background: rgba(45,27,20,0.6); backdrop-filter: blur(6px);" @click.self="showInvoiceModal = false">
      <div class="card w-full max-w-lg p-8 animate-pop relative my-8 dark:bg-slate-900 dark:border-slate-800" id="printable-payout-invoice">
        <button @click="showInvoiceModal = false" class="absolute top-4 right-4 text-[#8A7A72] hover:text-[#2D1B14] dark:hover:text-slate-200 text-xl font-bold no-print">×</button>
        
        <!-- Invoice Header -->
        <div class="flex justify-between items-start border-b border-[#E8D5C8] dark:border-slate-800 pb-5 mb-5">
          <div>
            <h1 class="text-lg font-bold text-[#2D1B14] dark:text-slate-200 uppercase tracking-wider">{{ authStore.companyName }}</h1>
            <p class="text-[10px] text-[#8A7A72] dark:text-slate-400 mt-0.5">Photography Agency & Graduation Services</p>
          </div>
          <div class="text-right">
            <h2 class="text-xs font-bold text-[#D94A3D] uppercase tracking-wide">Payout Invoice</h2>
            <p class="text-[10px] text-[#8A7A72] dark:text-slate-400 mt-0.5">Invoice: #PAY-{{ invoiceItem?.id }}</p>
            <p class="text-[10px] text-[#8A7A72] dark:text-slate-400 mt-0.5">Tanggal: {{ formatDate(invoiceItem?.created_at || new Date().toISOString()) }}</p>
          </div>
        </div>

        <!-- Invoice Details Grid -->
        <div class="grid grid-cols-2 gap-6 text-xs mb-6">
          <div>
            <p class="text-[9px] uppercase tracking-wider text-[#C4B0A5] dark:text-slate-500 font-bold mb-1">Penerima (Freelancer)</p>
            <p class="font-bold text-[#2D1B14] dark:text-slate-200">{{ invoiceItem?.fg_name }}</p>
            <p class="text-[#8A7A72] dark:text-slate-400 mt-0.5">{{ invoiceItem?.fg_phone }}</p>
            <div v-if="invoiceItem?.bank_account?.bank" class="mt-1 bg-[#FAF6F0] dark:bg-slate-800 p-2 rounded-lg border border-[#E8E4D8]/60 dark:border-slate-700 text-[#2D1B14] dark:text-slate-200">
              <span class="font-semibold text-[#2D1B14] dark:text-slate-200">{{ invoiceItem.bank_account.bank }}</span><br>
              Norek: {{ invoiceItem.bank_account.norek }}<br>
              A/N: {{ invoiceItem.bank_account.atas_nama }}
            </div>
          </div>
          <div class="text-right">
            <p class="text-[9px] uppercase tracking-wider text-[#C4B0A5] dark:text-slate-500 font-bold mb-1">Status Pembayaran</p>
            <span class="status-chip font-bold" :class="invoiceItem?.status === 'paid' ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-[#FFF0E8] text-[#F4A261]'">
              {{ invoiceItem?.status === 'paid' ? 'LUNAS (PAID)' : 'PENDING' }}
            </span>
            <p class="text-[10px] text-[#8A7A72] dark:text-slate-400 mt-2" v-if="invoiceItem?.status === 'paid'">Ref No: {{ invoiceItem?.transfer_ref }}</p>
            <p class="text-[10px] text-[#8A7A72] dark:text-slate-400" v-if="invoiceItem?.status === 'paid'">Dibayar: {{ invoiceItem?.paid_at ? formatDate(invoiceItem.paid_at) : '-' }}</p>
          </div>
        </div>

        <!-- Invoice Items Table -->
        <div class="border border-[#E8D5C8] dark:border-slate-800 rounded-xl overflow-hidden mb-6 text-xs">
          <table class="w-full">
            <thead>
              <tr class="bg-[#FFF8F3] dark:bg-slate-800 text-[#8A7A72] dark:text-slate-400 text-left border-b border-[#E8D5C8] dark:border-slate-700">
                <th class="p-2.5 font-medium">Client & Jadwal</th>
                <th class="p-2.5 font-medium text-right">Fee Payout</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in invoiceItem?.items" :key="item.payout_id" class="border-b border-[#E8D5C8]/60 dark:border-slate-800/60 text-[#2D1B14] dark:text-slate-200">
                <td class="p-2.5">
                  <div class="font-bold text-[#2D1B14] dark:text-slate-200">{{ item.client_name }}</div>
                  <div class="text-[10px] text-[#8A7A72] dark:text-slate-500 mt-0.5">{{ formatDate(item.graduation_date) }}</div>
                </td>
                <td class="p-2.5 text-right font-semibold text-gray-800 dark:text-slate-200">Rp {{ (item.fg_fee || item.total_payout || 0).toLocaleString('id-ID') }}</td>
              </tr>
              <tr v-if="invoiceItem?.bonus > 0" class="border-b border-[#E8D5C8]/60 dark:border-slate-800/60 text-[#2D1B14] dark:text-slate-200">
                <td class="p-2.5">
                  Bonus / Kompensasi Tambahan
                </td>
                <td class="p-2.5 text-right font-medium text-[#059669]">+ Rp {{ (invoiceItem.bonus).toLocaleString('id-ID') }}</td>
              </tr>
              <tr v-if="invoiceItem?.deduction > 0" class="border-b border-[#E8D5C8]/60 dark:border-slate-800/60 text-[#2D1B14] dark:text-slate-200">
                <td class="p-2.5">
                  Potongan / Penalty
                </td>
                <td class="p-2.5 text-right font-medium text-red-500">- Rp {{ (invoiceItem.deduction).toLocaleString('id-ID') }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="bg-[#FFF8F3] dark:bg-slate-800 font-bold text-[#2D1B14] dark:text-slate-200">
                <td class="p-2.5">Total Payroll</td>
                <td class="p-2.5 text-right text-[#D94A3D]">Rp {{ (invoiceItem?.total_payout || 0).toLocaleString('id-ID') }}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Footer Actions (Print / Copy) -->
        <div class="flex gap-2 justify-end no-print">
          <button @click="copyInvoiceText" class="px-4 py-2 bg-[#FFF0E8] text-[#D94A3D] text-xs font-semibold rounded-xl hover:bg-[#FFE5DA] transition">
            📋 Salin Detail
          </button>
          <button @click="printInvoice" class="px-4 py-2 bg-[#2D1B14] text-white text-xs font-semibold rounded-xl hover:bg-slate-900 transition">
            🖨️ Cetak Invoice
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL POPUP: Rincian Detail Payroll Freelancer -->
    <div v-if="showDetailModal && activeFgGroup" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.65); backdrop-filter: blur(6px);" @click.self="showDetailModal = false">
      <div class="card w-full max-w-2xl p-6 animate-pop dark:bg-slate-900 dark:border-slate-800 relative max-h-[90vh] flex flex-col shadow-2xl">
        <button @click="showDetailModal = false" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold transition">✕</button>

        <!-- Header Modal -->
        <div class="border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-3 mb-4">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="font-bold text-base text-[#2D1B14] dark:text-slate-100 flex items-center gap-2">
                📸 Rincian Payroll — {{ activeFgGroup.fg_name }}
              </h3>
              <p class="text-xs text-[#8A7A72] dark:text-slate-400 mt-0.5">No. HP / WA: {{ activeFgGroup.fg_phone }}</p>
            </div>
            
            <!-- Bank Info Badge -->
            <div class="bg-[#FAF6F0] dark:bg-slate-800 p-2.5 rounded-xl border border-[#E8D5C8]/60 dark:border-slate-700 text-xs text-right">
              <div v-if="activeFgGroup.bank_account?.bank">
                <span class="font-bold text-[#2D1B14] dark:text-slate-200">{{ activeFgGroup.bank_account.bank }}</span> - {{ activeFgGroup.bank_account.norek }}
                <div class="text-[10px] italic text-[#8A7A72] dark:text-slate-400">A/N: {{ activeFgGroup.bank_account.atas_nama }}</div>
              </div>
              <div v-else class="text-red-500 font-bold text-[11px]">⚠️ Rekening Bank Belum Diatur</div>
            </div>
          </div>
        </div>

        <!-- Tabel Rincian Client/Project -->
        <div class="overflow-y-auto flex-1 text-xs mb-4 border border-[#E8D5C8]/60 dark:border-slate-800 rounded-xl">
          <table class="w-full text-left">
            <thead class="sticky top-0 bg-[#FAF6F0] dark:bg-slate-800 text-[#8A7A72] dark:text-slate-400 border-b border-[#E8D5C8]/60 dark:border-slate-700">
              <tr>
                <th class="p-2.5 w-10 text-center">
                  <input type="checkbox" 
                         :checked="selectedAssignments[activeFgGroup.fg_id]?.length === activeFgGroup.assignments.length"
                         @change="toggleAllForFg(activeFgGroup.fg_id, activeFgGroup.assignments)"
                         class="rounded text-[#D94A3D] focus:ring-[#D94A3D] cursor-pointer">
                </th>
                <th class="p-2.5 font-semibold">Klien / Project</th>
                <th class="p-2.5 font-semibold">Lokasi</th>
                <th class="p-2.5 font-semibold text-right">Fee Payout</th>
                <th class="p-2.5 font-semibold text-center">Status Sesi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in activeFgGroup.assignments" :key="a.assignment_id" class="border-b border-[#E8D5C8]/20 dark:border-slate-800/40 hover:bg-[#FFF8F3]/50 dark:hover:bg-slate-800/50">
                <td class="p-2.5 text-center">
                  <input type="checkbox" 
                         :value="a.assignment_id" 
                         v-model="selectedAssignments[activeFgGroup.fg_id]" 
                         class="rounded text-[#D94A3D] focus:ring-[#D94A3D] cursor-pointer">
                </td>
                <td class="p-2.5">
                  <div class="font-bold text-[#2D1B14] dark:text-slate-200">{{ a.client_name }}</div>
                  <div class="text-[10px] text-[#8A7A72] dark:text-slate-500">{{ formatDate(a.graduation_date) }}</div>
                </td>
                <td class="p-2.5 text-[#8A7A72] dark:text-slate-400">{{ a.location || '-' }}</td>
                <td class="p-2.5 text-right font-bold text-[#2D1B14] dark:text-slate-200">Rp {{ (a.total_payout || 0).toLocaleString('id-ID') }}</td>
                <td class="p-2.5 text-center">
                  <span class="status-chip bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-[10px]">
                    {{ a.is_file_submitted ? 'File Disetor' : 'Sesi Selesai' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Selection Summary & Bulk Action Footer -->
        <div class="flex justify-between items-center bg-[#FFF8F3] dark:bg-slate-800/60 p-3.5 rounded-xl border border-[#E8D5C8]/60 dark:border-slate-700">
          <div class="text-xs text-[#8A7A72] dark:text-slate-400">
            Terpilih: <span class="font-bold text-[#2D1B14] dark:text-slate-200">{{ selectedAssignments[activeFgGroup.fg_id]?.length || 0 }}</span> dari {{ activeFgGroup.assignments.length }} project
            <div class="mt-0.5 text-sm font-bold text-[#D94A3D]">Total Fee: Rp {{ selectedTotalForFg(activeFgGroup.fg_id).toLocaleString('id-ID') }}</div>
          </div>
          <div class="flex gap-2">
            <a :href="getWaValidateBulkLink(activeFgGroup)"
               target="_blank"
               :class="(!selectedAssignments[activeFgGroup.fg_id] || selectedAssignments[activeFgGroup.fg_id].length === 0) ? 'pointer-events-none opacity-50 bg-gray-200 text-gray-400' : 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100'"
               class="px-3.5 py-2 rounded-xl transition text-xs font-semibold flex items-center gap-1.5 no-underline"
               style="text-decoration: none; display: inline-flex; align-items: center; justify-content: center; height: 38px;">
              💬 Validasi WA
            </a>
            <button @click="openPayBulkModal(activeFgGroup)" 
                    :disabled="!selectedAssignments[activeFgGroup.fg_id] || selectedAssignments[activeFgGroup.fg_id].length === 0"
                    class="px-4 py-2 bg-[#D94A3D] hover:bg-[#C0392B] text-white disabled:bg-gray-200 disabled:text-gray-400 rounded-xl transition text-xs font-semibold shadow-sm cursor-pointer"
                    style="height: 38px;">
              💸 Bayar Selected
            </button>
          </div>
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
const filterStatus = ref('pending')

const payoutPending = ref(0)
const payouts = ref([])

const expandedPayouts = ref({})
const toggleExpandPayout = (id) => {
  expandedPayouts.value[id] = !expandedPayouts.value[id]
}
const getClientLines = (clientNameStr) => {
  if (!clientNameStr) return []
  return clientNameStr.split('\n').map(s => s.trim()).filter(Boolean)
}

function getSessionRatio(g) {
  if (!g || !g.assignments || g.assignments.length === 0) return { completed: 0, total: 0 }
  const total = g.assignments.length
  const completed = g.assignments.filter(a => 
    ['done', 'completed', 'uploaded'].includes(a.assignment_status) ||
    ['shooting', 'editing', 'delivered', 'completed'].includes(a.booking_status)
  ).length
  return { completed, total }
}

// Selection state for pending payroll
const selectedAssignments = ref({})

const groupedPendingPayouts = computed(() => {
  const groups = {}
  payouts.value.forEach(p => {
    if (p.status === 'pending') {
      const fgId = p.fg_id
      if (!groups[fgId]) {
        groups[fgId] = {
          fg_id: fgId,
          fg_name: p.fg_name,
          fg_phone: p.fg_phone,
          bank_account: p.bank_account,
          assignments: []
        }
      }
      groups[fgId].assignments.push(p)
      
      if (!selectedAssignments.value[fgId]) {
        selectedAssignments.value[fgId] = []
      }
    }
  })
  return Object.values(groups)
})

const selectedTotalForFg = (fgId) => {
  const selectedIds = selectedAssignments.value[fgId] || []
  const fgGroup = groupedPendingPayouts.value.find(g => g.fg_id === fgId)
  if (!fgGroup) return 0
  return fgGroup.assignments
    .filter(a => selectedIds.includes(a.assignment_id))
    .reduce((sum, a) => sum + (a.total_payout || 0), 0)
}

const selectAllForFg = (fgId, assignmentsList) => {
  selectedAssignments.value[fgId] = assignmentsList.map(a => a.assignment_id)
}

const unselectAllForFg = (fgId) => {
  selectedAssignments.value[fgId] = []
}

const toggleAllForFg = (fgId, assignmentsList) => {
  if (selectedAssignments.value[fgId]?.length === assignmentsList.length) {
    unselectAllForFg(fgId)
  } else {
    selectAllForFg(fgId, assignmentsList)
  }
}

// Complete Payment State
const showPayModal = ref(false)
const payLoading = ref(false)
const payItem = ref(null)

// Freelancer Detail Payroll Modal State
const showDetailModal = ref(false)
const activeFgGroup = ref(null)

function openFgDetailModal(group) {
  activeFgGroup.value = group
  showDetailModal.value = true
}

// Invoice Detail State
const showInvoiceModal = ref(false)
const invoiceItem = ref(null)

let timer = null
onMounted(async () => {
  await loadStats()
  await loadPayouts()
  timer = setInterval(async () => {
    await loadStats()
    await loadPayouts()
  }, 3000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

async function loadStats() {
  try {
    const r = await fetch(`${API}/finances`, { credentials: 'include' })
    const d = await r.json()
    payoutPending.value = d.payoutPending
  } catch {}
}

const isFirstLoad = ref(true)

async function loadPayouts() {
  expandedPayouts.value = {}
  try {
    const statusQuery = filterStatus.value ? `&status=${filterStatus.value}` : ''
    const r = await fetch(`${API}/payouts?limit=100${statusQuery}`, { credentials: 'include' })
    const d = await r.json()
    payouts.value = d.data || []
    
    // Auto-select all pending assignments for each freelancer by default on initial load
    if (isFirstLoad.value) {
      payouts.value.forEach(p => {
        if (p.status === 'pending') {
          const fgId = p.fg_id
          if (!selectedAssignments.value[fgId]) {
            selectedAssignments.value[fgId] = []
          }
          if (!selectedAssignments.value[fgId].includes(p.assignment_id)) {
            selectedAssignments.value[fgId].push(p.assignment_id)
          }
        }
      })
      isFirstLoad.value = false
    }
  } catch {}
}

function openPayBulkModal(fgGroup) {
  const selectedIds = selectedAssignments.value[fgGroup.fg_id] || []
  if (selectedIds.length === 0) return
  
  payItem.value = {
    fg_name: fgGroup.fg_name,
    fg_phone: fgGroup.fg_phone,
    bank_account: fgGroup.bank_account,
    assignment_ids: selectedIds,
    total_payout: selectedTotalForFg(fgGroup.fg_id)
  }
  showDetailModal.value = false
  showPayModal.value = true
}

function cancelPayModal() {
  showPayModal.value = false
  if (activeFgGroup.value) {
    showDetailModal.value = true
  }
}

async function submitPayment() {
  payLoading.value = true
  try {
    const r = await fetch(`${API}/payouts/complete-bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        assignment_ids: payItem.value.assignment_ids
      })
    })
    const d = await r.json()
    if (r.ok) {
      showPayModal.value = false
      alert('Pembayaran berhasil dicatat!')
      
      if (d.wa_link) {
        window.open(d.wa_link, '_blank')
      }
      
      // Reset selections
      payItem.value.assignment_ids.forEach(id => {
        const pItem = payouts.value.find(p => p.assignment_id === id || p.id === id)
        if (pItem) {
          const fgId = pItem.fg_id
          if (selectedAssignments.value[fgId]) {
            selectedAssignments.value[fgId] = selectedAssignments.value[fgId].filter(sid => sid !== id)
          }
        }
      })
      
      await loadPayouts()
      await loadStats()
    } else {
      alert(d.error || 'Gagal mencatat pembayaran')
    }
  } catch (e) {
    alert('Terjadi kesalahan')
  } finally {
    payLoading.value = false
  }
}

// Invoice detail handlers
async function openInvoice(payout) {
  if (payout.status === 'paid' && payout.transfer_ref) {
    try {
      const res = await fetch(`/api/public/freelance-portal/payout-invoice/${encodeURIComponent(payout.transfer_ref)}`)
      if (res.ok) {
        const data = await res.json()
        invoiceItem.value = {
          id: payout.id,
          fg_name: data.fg_name,
          fg_phone: data.fg_phone,
          bank_account: data.bank_account,
          status: 'paid',
          transfer_ref: data.transfer_ref,
          paid_at: data.paid_at,
          created_at: payout.created_at,
          items: data.items,
          total_payout: data.total_amount
        }
        showInvoiceModal.value = true
        return
      }
    } catch (e) {
      console.error('Error fetching consolidated invoice:', e)
    }
  }
  
  // Fallback for pending or API error
  invoiceItem.value = {
    ...payout,
    items: [{
      payout_id: payout.id,
      client_name: payout.client_name,
      graduation_date: payout.graduation_date,
      location: payout.location,
      fg_fee: payout.fg_fee || payout.total_payout || 0,
      bonus: payout.bonus || 0,
      deduction: payout.deduction || 0,
      total_payout: payout.total_payout || 0
    }]
  }
  showInvoiceModal.value = true
}

function printInvoice() {
  if (invoiceItem.value && invoiceItem.value.transfer_ref) {
    window.open(`/payout-invoice.html?ref=${encodeURIComponent(invoiceItem.value.transfer_ref)}`, '_blank')
  } else {
    window.print()
  }
}

function copyInvoiceText() {
  if (!invoiceItem.value) return
  const item = invoiceItem.value
  
  const clientListText = (item.items || []).map((i, idx) => {
    return `- ${i.client_name} (${formatDate(i.graduation_date)}) : Rp ${(i.fg_fee || i.total_payout || 0).toLocaleString('id-ID')}`
  }).join('\n')

  const text = `
========= ${authStore.companyName.toUpperCase()} INVOICE PAYOUT =========
Invoice ID: #PAY-${item.id}
Tanggal: ${formatDate(item.created_at)}
Status: ${item.status === 'paid' ? 'LUNAS (PAID)' : 'PENDING'}

FREELANCER:
Nama: ${item.fg_name}
WA: ${item.fg_phone}
Tujuan Transfer: ${item.bank_account?.bank || '-'} - ${item.bank_account?.norek || '-'} (A/N: ${item.bank_account?.atas_nama || '-'})

RINCIAN CLIENT:
${clientListText}

KUMULATIF:
Bonus: Rp ${(item.bonus || 0).toLocaleString('id-ID')}
Potongan: Rp ${(item.deduction || 0).toLocaleString('id-ID')}
--------------------------------------------------
TOTAL TRANSFER: Rp ${(item.total_payout || 0).toLocaleString('id-ID')}

${item.status === 'paid' ? `No Ref Transfer: ${item.transfer_ref}\nTanggal Transfer: ${formatDate(item.paid_at)}` : 'Harap segera lakukan transfer.'}
==================================================
  `.trim()

  navigator.clipboard.writeText(text)
  alert('Detail rincian invoice telah disalin ke clipboard!')
}

// Receipt/Slip message via WA after payment
function getWaReceiptLink(p) {
  const appUrl = window.location.origin;
  const text = `Halo ${p.fg_name}, pembayaran fee untuk tugas kamu telah berhasil ditransfer.

Rincian Tugas:
- Client: ${p.client_name}
- Tanggal Shoot: ${formatDate(p.graduation_date)}
- Total Transfer: Rp ${(p.total_payout || 0).toLocaleString('id-ID')}

No. Referensi: ${p.transfer_ref || '-'}

Detail Invoice Payroll:
${appUrl}/payout-invoice.html?ref=${encodeURIComponent(p.transfer_ref || '')}

Terima kasih atas kerja samanya!`.trim()

  return `https://wa.me/${p.fg_phone}?text=${encodeURIComponent(text)}`
}

function getWaValidateBulkLink(g) {
  const selectedIds = selectedAssignments.value[g.fg_id] || []
  if (selectedIds.length === 0) return '#'
  
  const selectedAssignmentsList = g.assignments.filter(a => selectedIds.includes(a.assignment_id))
  
  const bank = g.bank_account?.bank || '-'
  const norek = g.bank_account?.norek || '-'
  const atas_nama = g.bank_account?.atas_nama || '-'
  const total = selectedTotalForFg(g.fg_id)
  
  const projectListText = selectedAssignmentsList.map((a, idx) => {
    return `${idx + 1}. Klien: ${a.client_name} (${formatDate(a.graduation_date)}) - Fee: Rp ${(a.total_payout || 0).toLocaleString('id-ID')}`
  }).join('\n')
  
  const text = `Halo ${g.fg_name}, mohon konfirmasi rincian fee berikut sebelum kami transfer:\n\n` +
               `Rincian Tugas:\n${projectListText}\n\n` +
               `Total yang akan dibayarkan: *Rp ${total.toLocaleString('id-ID')}*\n\n` +
               `Rekening tujuan:\n` +
               `Bank: ${bank}\n` +
               `No. Rek: ${norek}\n` +
               `A/N: ${atas_nama}\n\n` +
               `Jika data di atas sudah sesuai, mohon membalas pesan ini agar proses transfer dapat segera diproses. Terima kasih!`.trim()
               
  return `https://wa.me/${g.fg_phone}?text=${encodeURIComponent(text)}`
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return dateStr
  }
}
</script>

<style scoped>
@media print {
  body * {
    visibility: hidden;
  }
  #printable-payout-invoice, #printable-payout-invoice * {
    visibility: visible;
  }
  #printable-payout-invoice {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    border: none;
    box-shadow: none;
    padding: 0;
    margin: 0;
  }
  .no-print {
    display: none !important;
  }
}
</style>
