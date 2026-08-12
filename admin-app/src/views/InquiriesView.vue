<template>
  <div>
    <div class="flex items-center justify-between mb-5">
      <div class="flex items-center gap-2.5">
        <h2 class="text-xl font-bold text-[#2D1B14] dark:text-slate-200 tracking-tight">Inquiries</h2>
        <span class="text-[10px] text-[#C4B0A5] bg-white dark:bg-slate-900 rounded-full px-2.5 py-0.5 border border-[#E8D5C8] dark:border-slate-800" v-if="!loading">{{ data.length }} item</span>
      </div>
      <div class="flex items-center gap-2">
        <input v-model="search" class="input-fancy !w-32 !py-1.5 !text-[11px] dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200" placeholder="🔍 Cari...">
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <div class="loading-spinner animate-spin"></div>
    </div>

    <!-- Tabel Sortable -->
    <div v-else class="card overflow-hidden dark:bg-slate-900 dark:border-slate-800 animate-fade-in">
      <!-- Desktop Table -->
      <table class="w-full text-sm hidden md:table">
        <thead>
          <tr class="text-[#8A7A72] dark:text-slate-400 border-b border-[#E8D5C8] dark:border-slate-800 text-left text-xs bg-[#FFF8F3]/50 dark:bg-slate-900">
            <th @click="handleSort('client_name')" class="p-3 font-medium cursor-pointer hover:text-[#C59B63] select-none transition">
              Nama Client <span v-if="sortBy === 'client_name'">{{ sortDir === 'asc' ? '▴' : '▾' }}</span>
            </th>
            <th @click="handleSort('university')" class="p-3 font-medium cursor-pointer hover:text-[#C59B63] select-none transition hidden lg:table-cell">
              Kampus <span v-if="sortBy === 'university'">{{ sortDir === 'asc' ? '▴' : '▾' }}</span>
            </th>
            <th @click="handleSort('graduation_date')" class="p-3 font-medium cursor-pointer hover:text-[#C59B63] select-none transition">
              Tanggal <span v-if="sortBy === 'graduation_date'">{{ sortDir === 'asc' ? '▴' : '▾' }}</span>
            </th>
            <th @click="handleSort('status')" class="p-3 font-medium cursor-pointer hover:text-[#C59B63] select-none transition">
              Status <span v-if="sortBy === 'status'">{{ sortDir === 'asc' ? '▴' : '▾' }}</span>
            </th>
            <th @click="handleSort('action')" class="p-3 font-medium text-right cursor-pointer hover:text-[#C59B63] select-none transition">
              Aksi <span v-if="sortBy === 'action'">{{ sortDir === 'asc' ? '▴' : '▾' }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, i) in sortedData" :key="item.id"
            class="border-b border-[#E8D5C8]/40 dark:border-slate-800/60 hover:bg-[#FFF8F3] dark:hover:bg-slate-800/50 text-[#2D1B14] dark:text-slate-200 text-xs transition cursor-pointer"
            @click="showDetail(item)">
            <!-- Nama -->
            <td class="p-3">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-xl bg-[#FAF0DD] dark:bg-amber-950/20 flex items-center justify-center text-[11px] font-bold text-[#B5942B] dark:text-amber-400 flex-shrink-0">
                  {{ (item.client_name||'?')[0] }}
                </div>
                <div class="truncate">
                  <p class="font-semibold text-[#2D1B14] dark:text-slate-200 truncate">{{ item.client_name }}</p>
                  <p class="text-[10px] text-[#C4B0A5] mt-0.5">{{ item.client_phone }}</p>
                </div>
              </div>
            </td>
            <!-- Kampus -->
            <td class="p-3 text-[#8A7A72] dark:text-slate-400 hidden lg:table-cell">
              <p class="truncate max-w-[150px]">{{ item.university || '-' }}</p>
              <p class="text-[10px] text-[#C4B0A5] mt-0.5" v-if="item.location">{{ item.location }}</p>
              <span v-if="item.transport_charge > 0" class="inline-block mt-1 px-2 py-0.5 bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300 rounded-full text-[9px] font-bold border border-amber-300">
                🚗 Charge Transport (+Rp {{ (parseInt(item.transport_charge)/1000) }}k)
              </span>
            </td>
            <!-- Tanggal -->
            <td class="p-3">
              <span class="font-medium">{{ item.graduation_date || '-' }}</span>
            </td>
            <!-- Status -->
            <td class="p-3">
              <span class="status-chip" :class="statusClass(item.status)">{{ statusLabel(item.status) }}</span>
              <!-- Badge tambahan: state booking payment -->
              <span v-if="item.booking_dp_status === 'uploaded'" class="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">⏳ Menunggu Verif DP</span>
              <span v-else-if="item.booking_dp_status === 'unpaid' && item.booking_id" class="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400">🕐 Menunggu Bukti Client</span>
            </td>
            <!-- Aksi -->
            <td class="p-3 text-right" @click.stop>
              <!-- Status: new → Buat Penawaran -->
              <button v-if="item.status === 'new'" @click="openQuoteModal(item)"
                class="px-3 py-1.5 bg-[#FAF0DD] dark:bg-amber-950/40 text-[#B5942B] dark:text-amber-300 rounded-lg text-[10px] font-semibold hover:bg-[#FFE8C2] transition">
                📋 Buat Penawaran
              </button>
              <!-- dp='uploaded': tombol Verifikasi DP (berlaku untuk quoted & converted) -->
              <button v-else-if="item.booking_dp_status === 'uploaded'" @click="openVerifyDpFromInquiry(item)"
                class="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-[10px] font-semibold hover:bg-amber-600 transition animate-pulse">
                🔍 Verifikasi DP
              </button>
              <!-- quoted + unpaid: belum ada bukti, tampilkan opsi link tracking -->
              <template v-else-if="item.status === 'quoted' && item.booking_dp_status === 'unpaid'">
                <button v-if="!item.booking_token" @click="generateLink(item)"
                  class="px-3 py-1.5 bg-[#0f766e] text-white rounded-lg text-[10px] font-semibold hover:bg-[#0d6860] transition">
                  🔗 Buat Link Booking
                </button>
                <button v-else @click="showGeneratedLink(item)"
                  class="px-3 py-1.5 bg-[#EBF5FF] dark:bg-blue-950/30 text-[#1E40AF] dark:text-blue-300 rounded-lg text-[10px] font-semibold hover:bg-blue-100 transition border border-blue-200 dark:border-blue-900">
                  🔗 Lihat Link
                </button>
              </template>
              <!-- Lainnya → tidak ada tombol -->
            </td>
          </tr>
          <tr v-if="sortedData.length === 0">
            <td class="p-8 text-center text-[#C4B0A5]" colspan="5">
              <span class="text-2xl block mb-1">📨</span>
              <span class="text-xs">Belum ada inquiry</span>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Mobile Card List -->
      <div class="md:hidden divide-y divide-[#E8D5C8]/40 dark:divide-slate-800">
        <div v-for="(item, i) in sortedData" :key="item.id"
          class="flex items-center justify-between p-4 hover:bg-[#FFF8F3] dark:hover:bg-slate-800/50 transition cursor-pointer"
          :style="{ animationDelay: (i*20)+'ms' }"
          @click="showDetail(item)">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 rounded-xl bg-[#FAF0DD] dark:bg-amber-950/20 flex items-center justify-center text-sm font-bold text-[#B5942B] dark:text-amber-400 flex-shrink-0">
              {{ (item.client_name||'?')[0] }}
            </div>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-[#2D1B14] dark:text-slate-200 truncate">{{ item.client_name }}</p>
              <p class="text-[10px] text-[#C4B0A5] mt-0.5">{{ item.university || '-' }} · {{ item.graduation_date }} <span v-if="item.transport_charge > 0" class="text-amber-600 font-bold ml-1">🚗 Transport (+Rp {{ parseInt(item.transport_charge)/1000 }}k)</span></p>
            </div>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0 ml-2" @click.stop>
            <div class="flex flex-col items-end gap-1">
              <span class="status-chip text-[9px]" :class="statusClass(item.status)">{{ statusLabel(item.status) }}</span>
              <span v-if="item.booking_dp_status === 'uploaded'" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">⏳ Verif DP</span>
              <span v-else-if="item.booking_dp_status === 'unpaid' && item.booking_id" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-slate-100 text-slate-500 border border-slate-200">🕐 Tunggu Client</span>
            </div>
            <button v-if="item.booking_dp_status === 'uploaded'" @click="openVerifyDpFromInquiry(item)"
              class="px-2.5 py-1.5 bg-amber-500 text-white rounded-lg text-[10px] font-semibold animate-pulse">
              🔍
            </button>
            <button v-else-if="item.status === 'new'" @click="openQuoteModal(item)"
              class="px-2.5 py-1.5 bg-[#FAF0DD] dark:bg-amber-950/40 text-[#B5942B] rounded-lg text-[10px] font-semibold">
              📋
            </button>
            <button v-else-if="item.status === 'quoted'" @click="item.booking_token ? showGeneratedLink(item) : generateLink(item)"
              class="px-2.5 py-1.5 bg-[#0f766e] text-white rounded-lg text-[10px] font-semibold">
              🔗
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="totalPages > 1" class="flex justify-center gap-1.5 mt-5">
      <button v-for="p in totalPages" :key="p" @click="page = p; load()"
        class="w-8 h-8 rounded-xl text-xs font-medium transition"
        :class="page === p ? 'bg-[#D94A3D] text-white' : 'bg-white dark:bg-slate-900 border border-[#E8D5C8] dark:border-slate-800 text-[#8A7A72] dark:text-slate-400 hover:border-[#FAF0DD]/60'">{{ p }}</button>
    </div>


    <div v-if="detailItem" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.6); backdrop-filter: blur(6px);" @click.self="detailItem=null">
      <div class="card w-full max-w-sm p-5 animate-pop dark:bg-slate-900 dark:border-slate-800">
        <div class="flex items-center gap-3 mb-5">
          <div class="w-10 h-10 rounded-xl bg-[#FAF0DD] dark:bg-amber-950/20 flex items-center justify-center text-lg font-bold text-[#B5942B] dark:text-amber-400">{{ (detailItem.client_name||'?')[0] }}</div>
          <div>
            <h3 class="font-bold text-[#2D1B14] dark:text-slate-200">{{ detailItem.client_name }}</h3>
            <p class="text-[10px] text-[#C4B0A5]">{{ detailItem.source || 'website' }}</p>
          </div>
          <span class="ml-auto status-chip" :class="statusClass(detailItem.status)">{{ statusLabel(detailItem.status) }}</span>
          <button @click="detailItem=null" class="text-[#C4B0A5] hover:text-[#2D1B14] dark:hover:text-slate-200">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <dl class="space-y-2.5 text-sm text-[#475569] dark:text-slate-300">
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">WA</dt><dd class="font-medium text-[#2D1B14] dark:text-slate-200">{{ detailItem.client_phone }}</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">Tgl Wisuda</dt><dd>{{ detailItem.graduation_date }}</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">Univ</dt><dd>{{ detailItem.university || '-' }}</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">Lokasi</dt><dd>{{ detailItem.location || '-' }}</dd></div>
          <!-- Charge Management Card -->
          <div class="mt-2.5 p-3 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1">
                🚗 Biaya Transport / Extra Charge
              </span>
              <button type="button" @click="toggleChargeEdit" class="text-[10px] text-[#B5942B] dark:text-amber-400 font-bold hover:underline">
                {{ showChargeForm ? 'Tutup' : ((detailItem.transport_charge > 0) ? '✏️ Edit Charge' : '➕ Tambah Charge') }}
              </button>
            </div>

            <div v-if="detailItem.transport_charge > 0 && !showChargeForm" class="text-xs text-amber-800 dark:text-amber-300 font-semibold">
              <span>+ Rp {{ parseInt(detailItem.transport_charge).toLocaleString('id-ID') }}</span>
              <span class="block text-[10px] text-amber-700/80 dark:text-amber-400 font-normal" v-if="detailItem.transport_charge_notes">
                Keterangan: {{ detailItem.transport_charge_notes }}
              </span>
            </div>
            <div v-else-if="!showChargeForm" class="text-[10px] text-amber-700/70 font-light">
              Belum ada biaya transport tambahan (Rp 0).
            </div>

            <!-- Editable Charge Form -->
            <div v-if="showChargeForm" class="pt-2 border-t border-amber-200/60 dark:border-amber-900/40 space-y-2">
              <div>
                <label class="block text-[10px] text-amber-900 dark:text-amber-300 font-medium mb-1">Nominal Charge (Rp)</label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-800 dark:text-amber-400">Rp</span>
                  <input v-model="formattedChargeAmount" type="text" class="input-fancy !pl-9 !text-xs !py-1.5 font-bold text-amber-900 dark:text-amber-300 dark:bg-slate-950 dark:border-slate-800" placeholder="0">
                </div>
                <p v-if="chargeInput.amount" class="text-[10px] font-bold text-amber-700 dark:text-amber-400 mt-1">
                  Format Rp: {{ Number(chargeInput.amount).toLocaleString('id-ID') }}
                </p>
              </div>
              <div>
                <label class="block text-[10px] text-amber-900 dark:text-amber-300 font-medium mb-1">Keterangan Biaya Charge</label>
                <input v-model="chargeInput.notes" type="text" class="input-fancy !text-xs !py-1.5" placeholder="Misal: Biaya Transport CPI / Luar Kampus">
              </div>
              <div class="flex gap-2 pt-1">
                <button type="button" @click="saveCharge" :disabled="savingCharge" class="w-full py-1.5 bg-[#C59B63] text-white font-bold rounded-lg text-xs hover:bg-[#b58b53] transition flex items-center justify-center gap-1">
                  <span v-if="savingCharge" class="loading-spinner !w-3 !h-3"></span>
                  <span v-else>💾 Simpan Biaya Charge</span>
                </button>
              </div>
            </div>
          </div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">Paket</dt><dd class="font-semibold text-[#0f766e] dark:text-teal-400">{{ detailItem.package_name || '-' }}</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">Status</dt><dd class="capitalize font-semibold">{{ detailItem.status }}</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">Catatan</dt><dd class="italic">{{ detailItem.notes || '-' }}</dd></div>
          
          <!-- Action to create quote inside detail modal -->
          <div v-if="detailItem.status === 'new'" class="pt-2">
            <button @click="openQuoteModal(detailItem); detailItem = null;" class="w-full py-2 bg-[#FAF0DD] border border-[#E8D5C8] text-[#B5942B] dark:bg-amber-950/40 dark:border-amber-900/50 dark:text-amber-300 rounded-xl text-xs font-semibold hover:bg-[#FFE8C2] transition flex items-center justify-center gap-1.5">
              📋 Buat Penawaran Paket (Quote)
            </button>
          </div>

          <div class="flex flex-col border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5" v-if="detailItem.booking_token">
            <dt class="text-[#C4B0A5] mb-1">Link Booking <span class="text-[9px]" :class="detailItem.token_used ? 'text-green-600' : 'text-yellow-600'">({{ detailItem.token_used ? 'Sudah Dipakai' : 'Belum Dipakai' }})</span></dt>
            <dd class="flex gap-1.5 items-center">
              <input :value="getBookingUrl(detailItem.booking_token)" readonly class="input-fancy !text-[11px] !py-1 select-all dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" :id="'detail-booking-url-' + detailItem.id">
              <button @click="copyDetailLink('detail-booking-url-' + detailItem.id)" class="px-2 py-1 bg-[#FAF6F0] border border-[#E8D5C8] dark:bg-slate-800 dark:border-slate-700 text-[#8A7A72] dark:text-slate-300 rounded-lg text-[10px] font-semibold hover:bg-[#FFE5DA] transition flex-shrink-0">
                Salin
              </button>
            </dd>
            <div class="mt-2 flex justify-end">
              <button @click="regenerateBookingLink(detailItem)" class="px-2.5 py-1 bg-[#FFF0E8] border border-[#E8D5C8] dark:bg-slate-800 dark:border-slate-700 text-[#D94A3D] dark:text-amber-400 rounded-lg text-[10px] font-semibold hover:bg-[#FFE5DA] transition flex items-center gap-1">
                🔄 Perbarui / Buat Ulang Link
              </button>
            </div>
          </div>
          <div class="flex flex-col border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5" v-else-if="!detailItem.booking_token && detailItem.status !== 'quoted'">
            <dt class="text-[#C4B0A5] mb-1">Link Booking</dt>
            <dd>
              <button @click="generateLink(detailItem)" class="w-full py-1.5 bg-[#0f766e] text-white rounded-lg text-xs font-semibold hover:bg-[#0d6860] transition">
                🔗 Buat Link Booking
              </button>
            </dd>
          </div>
        </dl>

        <div class="mt-5 flex justify-between items-center pt-3 border-t border-[#E8D5C8]/60 dark:border-slate-800">
          <button @click="deleteInquiry(detailItem)" class="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-1">
            🗑️ Hapus Inquiry
          </button>
          <a :href="waAdminLink(detailItem)" target="_blank" class="px-4 py-2 bg-[#0f766e] text-white rounded-xl text-xs font-semibold hover:bg-[#0d6860] transition flex items-center gap-1.5">
            💬 WA Client
          </a>
        </div>
      </div>
    </div>

    <!-- Create Quote Modal -->
    <div v-if="quoteItem" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.6); backdrop-filter: blur(6px);" @click.self="quoteItem=null">
      <div class="card w-full max-w-sm p-5 animate-pop dark:bg-slate-900 dark:border-slate-800 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-[#2D1B14] dark:text-slate-200 flex items-center gap-1.5">
            <span>📋</span> Buat Penawaran (Quote)
          </h3>
          <button @click="quoteItem=null" class="text-[#C4B0A5] hover:text-[#2D1B14] dark:hover:text-slate-200">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="bg-[#FAF0DD]/50 dark:bg-amber-950/20 p-3 rounded-xl border border-[#E8D5C8]/60 dark:border-amber-900/30 text-xs">
          <p class="font-semibold text-[#2D1B14] dark:text-slate-200">{{ quoteItem.client_name }}</p>
          <p class="text-[#8A7A72] dark:text-slate-400 mt-0.5">{{ quoteItem.university || '-' }} · {{ quoteItem.graduation_date }}</p>
        </div>

        <div>
          <label class="text-xs font-semibold text-[#2D1B14] dark:text-slate-300 block mb-1.5">Pilih Paket Foto Wisuda</label>
          <select v-model="quotePackageId" @change="onQuotePackageChange" class="input-fancy w-full !text-xs !py-2 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
            <option value="" disabled>-- Pilih Paket --</option>
            <option v-for="pkg in packagesList" :key="pkg.id" :value="pkg.id">
              {{ pkg.name }} — Rp {{ (pkg.price || 0).toLocaleString('id-ID') }}
            </option>
          </select>
        </div>

        <div>
          <label class="text-xs font-semibold text-[#2D1B14] dark:text-slate-300 block mb-1.5">Harga Penawaran / Custom Price (Rp)</label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8A7A72] dark:text-slate-400">Rp</span>
            <input v-model="formattedQuotePrice" type="text" class="input-fancy w-full !pl-9 !text-xs !py-2 font-bold dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 text-amber-600 dark:text-amber-400" placeholder="0">
          </div>
          <p class="text-[10px] text-amber-700 dark:text-amber-400 font-bold mt-1" v-if="quoteCustomPrice">
            Format Rp: {{ Number(quoteCustomPrice).toLocaleString('id-ID') }}
          </p>
          <p class="text-[10px] text-[#C4B0A5] mt-0.5">Bisa diubah secara khusus (diskon / custom price per client).</p>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-xs font-semibold text-[#2D1B14] dark:text-slate-300 block mb-1.5">Jam Sesi Foto</label>
            <input v-model="quoteShootingTime" type="time" class="input-fancy w-full !text-xs !py-2 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
          </div>
          <div>
            <label class="text-xs font-semibold text-[#2D1B14] dark:text-slate-300 block mb-1.5">Durasi (Jam)</label>
            <input v-model.number="quoteDurationHours" @input="onDurationChange" type="number" min="1" max="12" class="input-fancy w-full !text-xs !py-2 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="Durasi jam...">
          </div>
        </div>

        <!-- Tipe Pembayaran Option -->
        <div>
          <label class="text-xs font-semibold text-[#2D1B14] dark:text-slate-300 block mb-1.5">Metode Pembayaran Quote</label>
          <div class="flex gap-4">
            <label class="flex items-center gap-1.5 text-xs text-[#2D1B14] dark:text-slate-300 cursor-pointer">
              <input type="radio" v-model="quotePaymentType" value="dp" class="accent-[#D94A3D]">
              <span>DP {{ dpPercentage }}%</span>
            </label>
            <label class="flex items-center gap-1.5 text-xs text-[#2D1B14] dark:text-slate-300 cursor-pointer">
              <input type="radio" v-model="quotePaymentType" value="full" class="accent-[#D94A3D]">
              <span>Full Payment (100%)</span>
            </label>
          </div>
        </div>

        <!-- Live Calculation Summary -->
        <div v-if="quotePackageId" class="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-1.5 text-[11px] text-slate-700 dark:text-slate-300">
          <div class="flex justify-between">
            <span class="text-slate-500">Harga Asli Paket:</span>
            <span>Rp {{ (packagesList.find(p => p.id === quotePackageId)?.price || 0).toLocaleString('id-ID') }}</span>
          </div>
          <div class="flex justify-between font-semibold">
            <span class="text-slate-500">Total Harga:</span>
            <span class="text-slate-900 dark:text-white">Rp {{ (quoteCustomPrice || 0).toLocaleString('id-ID') }}</span>
          </div>
          
          <template v-if="quotePaymentType === 'full'">
            <div class="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-800 text-teal-700 dark:text-teal-400 font-bold">
              <span>Pembayaran Lunas (100%):</span>
              <span>Rp {{ (quoteCustomPrice || 0).toLocaleString('id-ID') }}</span>
            </div>
            <div class="flex justify-between text-slate-500">
              <span>Sisa Pelunasan:</span>
              <span>Rp 0</span>
            </div>
          </template>
          
          <template v-else>
            <div class="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-800 text-teal-700 dark:text-teal-400 font-bold">
              <span>Pembayaran DP ({{ dpPercentage }}%):</span>
              <span>Rp {{ Math.round((quoteCustomPrice || 0) * dpPercentage / 100).toLocaleString('id-ID') }}</span>
            </div>
            <div class="flex justify-between text-slate-500">
              <span>Pelunasan (Sisa):</span>
              <span>Rp {{ Math.round((quoteCustomPrice || 0) * (100 - dpPercentage) / 100).toLocaleString('id-ID') }}</span>
            </div>
          </template>
        </div>

        <div class="flex gap-2 pt-2">
          <button @click="quoteItem=null" class="flex-1 px-4 py-2.5 bg-[#FFF0E8] dark:bg-slate-800 text-[#8A7A72] dark:text-slate-300 rounded-xl text-xs font-medium hover:bg-[#FFE5DA] transition">Batal</button>
          <button @click="submitQuote" :disabled="!quotePackageId || submittingQuote" class="flex-1 px-4 py-2.5 bg-[#D94A3D] text-white rounded-xl text-xs font-semibold hover:bg-[#c33e32] transition disabled:opacity-50 flex items-center justify-center gap-1">
            <span v-if="submittingQuote" class="loading-spinner animate-spin !w-3 !h-3"></span>
            <span v-else>🚀 Kirim Quote</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Generated Link / Quote Result Modal -->
    <div v-if="tokenResult" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.6); backdrop-filter: blur(6px);" @click.self="tokenResult=null">
      <div class="card w-full max-w-sm p-5 animate-pop dark:bg-slate-900 dark:border-slate-800">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-bold text-[#2D1B14] dark:text-slate-200">🔗 {{ tokenResult.dp_amount ? 'Quotation & Link Booking' : 'Link Booking' }}</h3>
          <button @click="tokenResult=null" class="text-[#C4B0A5] hover:text-[#2D1B14] dark:hover:text-slate-200">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <p class="text-xs text-[#8A7A72] dark:text-slate-400 mb-4">
          {{ tokenResult.dp_amount ? 'Draf booking berhasil dibuat dengan nominal DP Rp ' + (tokenResult.dp_amount||0).toLocaleString('id-ID') + '. Kirimkan link ini ke client via WA.' : 'Kirimkan link ini ke client via WhatsApp untuk memilih paket & upload bukti pembayaran.' }}
        </p>
        
        <div class="space-y-3">
          <div>
            <label class="text-[10px] text-[#C4B0A5] block mb-1">Generated Booking URL</label>
            <div class="flex gap-2">
              <input :value="tokenResult.booking_url" readonly class="input-fancy !text-xs !py-2 select-all dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" id="gen-booking-url">
              <button @click="copyLink" class="px-3 py-2 bg-[#FAF6F0] border border-[#E8D5C8] text-[#8A7A72] rounded-xl text-xs font-semibold hover:bg-[#FFE5DA] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 transition">
                Salin
              </button>
            </div>
          </div>
          
          <div class="flex gap-2 pt-2">
            <button @click="tokenResult=null" class="flex-1 px-4 py-2.5 bg-[#FFF0E8] dark:bg-slate-800 text-[#8A7A72] dark:text-slate-300 rounded-xl text-xs font-medium hover:bg-[#FFE5DA] transition">Tutup</button>
            <a :href="tokenResult.wa_link" target="_blank" class="flex-1 px-4 py-2.5 bg-[#0f766e] text-white rounded-xl text-xs font-semibold hover:bg-[#0d6860] transition text-center flex items-center justify-center gap-1">
              💬 Kirim WA
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const API = '/api/admin'
const data = ref([])
const loading = ref(true)
const search = ref('')
const filterStatus = ref('')
const page = ref(1)
const totalPages = ref(1)
const statuses = ['new', 'quoted', 'converted', 'expired', 'lost', 'archived']
const detailItem = ref(null)
const tokenResult = ref(null)

// --- Sort state ---
const sortBy = ref('created_at')
const sortDir = ref('desc')

function handleSort(field) {
  if (sortBy.value === field) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = field
    sortDir.value = 'asc'
  }
}

const statusRankMap = {
  'new': 1,
  'quoted': 2,
  'converted': 3,
  'expired': 4,
  'lost': 5,
  'archived': 6
}

// Computed sorted data
const sortedData = computed(() => {
  const arr = [...data.value]
  const field = sortBy.value
  const dir = sortDir.value === 'asc' ? 1 : -1

  return arr.sort((a, b) => {
    let va, vb

    if (field === 'status' || field === 'action') {
      va = statusRankMap[a.status] || 99
      vb = statusRankMap[b.status] || 99
    } else {
      va = (a[field] || '').toString().toLowerCase()
      vb = (b[field] || '').toString().toLowerCase()
    }

    return va < vb ? -dir : va > vb ? dir : 0
  })
})

// Label status Bahasa Indonesia
function statusLabel(s) {
  const map = {
    new: 'Baru Masuk',
    quoted: 'Penawaran Dikirim',
    converted: 'Booking Aktif',
    expired: 'Kedaluwarsa',
    lost: 'Tidak Jadi',
    archived: 'Diarsipkan'
  }
  return map[s] || s
}

const quoteItem = ref(null)
const quotePackageId = ref('')
const quoteCustomPrice = ref(0)
const quoteShootingTime = ref('')
const quoteDurationHours = ref(2)
const quotePaymentType = ref('dp')
const packagesList = ref([])
const submittingQuote = ref(false)
const dpPercentage = ref(50)

async function loadSettings() {
  try {
    const res = await fetch(`${API}/settings`, { credentials: 'include' })
    if (res.ok) {
      const result = await res.json()
      if (result.settings && result.settings.dp_percentage) {
        dpPercentage.value = Number(result.settings.dp_percentage) || 50
      }
    }
  } catch (e) {
    console.error('Error loading settings:', e)
  }
}

function onQuotePackageChange() {
  const selectedPkg = packagesList.value.find(p => p.id === quotePackageId.value)
  if (selectedPkg) {
    quoteCustomPrice.value = selectedPkg.price || 0
    quoteDurationHours.value = selectedPkg.duration_hours || 2
  }
}

function onDurationChange() {
  const selectedPkg = packagesList.value.find(p => p.id === quotePackageId.value)
  if (selectedPkg) {
    const baseHours = selectedPkg.duration_hours || 2
    const currentDuration = Number(quoteDurationHours.value) || baseHours
    quoteCustomPrice.value = Math.round((selectedPkg.price / baseHours) * currentDuration)
  }
}

function statusClass(s) {
  const map = {
    new: 'bg-[#FDECEA] text-[#D94A3D] dark:bg-red-950/20 dark:text-red-400',
    quoted: 'bg-[#EBF5FF] text-[#1E40AF] dark:bg-blue-950/20 dark:text-blue-400',
    converted: 'bg-[#E8F5E9] text-[#2E7D32] dark:bg-green-950/20 dark:text-green-400',
    expired: 'bg-[#FFF5F0] text-[#C4B0A5] dark:bg-slate-800 dark:text-slate-400',
    lost: 'bg-[#FEF2F2] text-[#EF4444] dark:bg-red-950/20 dark:text-red-400',
    archived: 'bg-[#FFF5F0] text-[#C4B0A5] dark:bg-slate-800 dark:text-slate-400'
  }
  return map[s] || 'bg-[#FFF5F0] text-[#C4B0A5]'
}

async function loadPackages() {
  try {
    const res = await fetch(`${API}/packages?limit=100`, { credentials: 'include' })
    if (res.ok) {
      const result = await res.json()
      packagesList.value = Array.isArray(result) ? result : (result.data || [])
    }
  } catch (e) {
    console.error('Error loading packages:', e)
  }
}

async function load(silent = false) {
  if (!silent) loading.value = true
  try {
    const params = new URLSearchParams({ page: page.value, limit: 20 })
    if (search.value) params.set('search', search.value)
    if (filterStatus.value) params.set('status', filterStatus.value)
    const res = await fetch(`${API}/inquiries?` + params, { credentials: 'include' })
    const result = await res.json()
    data.value = result.data || []
    totalPages.value = result.totalPages || 1
  } catch {}
  if (!silent) loading.value = false
}

function getWaChargeUrl(item) {
  if (!item) return '#'
  const text = `Halo Kak ${item.client_name || ''}, kami melihat lokasi sesi foto Kakak di ${item.location || ''} (${item.city || 'Makassar'}). Dikarenakan lokasi di luar kampus utama, terdapat biaya transport tambahan. Mohon konfirmasinya ya Kak 🙏`
  const phone = item.client_phone ? item.client_phone.replace(/\D/g, '') : ''
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
}

async function toggleIgnoreBadge(item) {
  if (!item) return
  const newIgnoreState = item.is_outside_main_area ? 1 : 0
  try {
    const res = await fetch(`${API}/inquiries/${item.id}/charge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        ignore_transport_charge: newIgnoreState
      })
    })
    const d = await res.json()
    if (res.ok && d.inquiry) {
      item.is_outside_main_area = d.inquiry.is_outside_main_area
      item.ignore_transport_charge = d.inquiry.ignore_transport_charge
      if (detailItem.value && detailItem.value.id === item.id) {
        detailItem.value.is_outside_main_area = d.inquiry.is_outside_main_area
        detailItem.value.ignore_transport_charge = d.inquiry.ignore_transport_charge
      }
      await load(true)
    }
  } catch (e) {
    console.error('Toggle ignore badge error:', e)
  }
}

const showChargeForm = ref(false)
const savingCharge = ref(false)
const chargeInput = ref({ amount: 0, notes: '' })

const formattedChargeAmount = computed({
  get() {
    if (!chargeInput.value.amount) return ''
    return Number(chargeInput.value.amount).toLocaleString('id-ID')
  },
  set(val) {
    const raw = String(val).replace(/[^0-9]/g, '')
    chargeInput.value.amount = raw ? parseInt(raw, 10) : 0
  }
})

const formattedQuotePrice = computed({
  get() {
    if (!quoteCustomPrice.value) return ''
    return Number(quoteCustomPrice.value).toLocaleString('id-ID')
  },
  set(val) {
    const raw = String(val).replace(/[^0-9]/g, '')
    quoteCustomPrice.value = raw ? parseInt(raw, 10) : 0
  }
})

function toggleChargeEdit() {
  showChargeForm.value = !showChargeForm.value
  if (showChargeForm.value && detailItem.value) {
    chargeInput.value = {
      amount: detailItem.value.transport_charge || 0,
      notes: detailItem.value.transport_charge_notes || ''
    }
  }
}

async function saveCharge() {
  if (!detailItem.value) return
  savingCharge.value = true
  try {
    const res = await fetch(`${API}/inquiries/${detailItem.value.id}/charge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        transport_charge: chargeInput.value.amount || 0,
        transport_charge_notes: chargeInput.value.notes || '',
        ignore_transport_charge: 0
      })
    })
    const d = await res.json()
    if (!res.ok) {
      alert(d.error || 'Gagal menyimpan charge')
      savingCharge.value = false
      return
    }
    detailItem.value.transport_charge = d.inquiry.transport_charge
    detailItem.value.transport_charge_notes = d.inquiry.transport_charge_notes
    detailItem.value.is_outside_main_area = d.inquiry.is_outside_main_area
    showChargeForm.value = false
    alert('Biaya charge berhasil disimpan!')
    await load(true)
  } catch (e) {
    console.error('Save charge error:', e)
    alert('Gagal menyimpan biaya charge')
  } finally {
    savingCharge.value = false
  }
}

function showDetail(item) {
  detailItem.value = item
  showChargeForm.value = false
  chargeInput.value = {
    amount: item.transport_charge || 0,
    notes: item.transport_charge_notes || ''
  }
}

function openQuoteModal(item) {
  quoteItem.value = item
  quotePackageId.value = item.package_id || (packagesList.value[0]?.id || '')
  quoteShootingTime.value = ''
  onQuotePackageChange()
}

async function submitQuote() {
  if (!quoteItem.value || !quotePackageId.value) return
  submittingQuote.value = true
  try {
    const res = await fetch(`${API}/inquiries/${quoteItem.value.id}/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        package_id: quotePackageId.value,
        custom_price: quoteCustomPrice.value,
        shooting_time: quoteShootingTime.value,
        duration_hours: quoteDurationHours.value,
        payment_type: quotePaymentType.value
      })
    })
    const result = await res.json()
    if (res.ok) {
      tokenResult.value = result
      quoteItem.value = null
      detailItem.value = null
      await load()
    } else {
      alert(result.error || 'Gagal membuat penawaran quote')
    }
  } catch (e) {
    console.error('Quote error:', e)
    alert('Terjadi kesalahan saat memproses quote.')
  } finally {
    submittingQuote.value = false
  }
}

async function generateLink(item) {
  try {
    const res = await fetch(`${API}/inquiries/${item.id}/generate-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ duration_hours: 24 })
    })
    if (res.ok) {
      const result = await res.json()
      tokenResult.value = result
      detailItem.value = null
      await load()
    } else {
      alert('Gagal membuat link booking')
    }
  } catch (e) {
    console.error('Error generating token:', e)
  }
}

async function regenerateBookingLink(item) {
  if (!await confirm(`Apakah Anda yakin ingin memperbarui/membuat ulang link booking untuk ${item.client_name}? Link lama akan tidak bisa digunakan lagi.`)) return

  try {
    const res = await fetch(`${API}/inquiries/${item.id}/generate-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ duration_hours: 24 })
    })
    if (res.ok) {
      const result = await res.json()
      alert('Link booking berhasil diperbarui!')
      tokenResult.value = result
      detailItem.value = null
      await load()
    } else {
      alert('Gagal memperbarui link booking')
    }
  } catch (e) {
    console.error('Error renewing token:', e)
  }
}

function showGeneratedLink(item) {
  if (!item || !item.booking_token) return
  
  const link = `http://${window.location.host}/confirm-booking.html?token=${item.booking_token}`
  const waMessage = `Halo ${item.client_name}, silakan pilih paket foto wisuda kamu dan selesaikan booking melalui link berikut ini ya: ${link}`
  const waLink = `https://api.whatsapp.com/send?phone=${item.client_phone}&text=${encodeURIComponent(waMessage)}`
  
  tokenResult.value = {
    token: item.booking_token,
    expires_at: item.token_expires_at,
    booking_url: link,
    wa_link: waLink
  }
}

// Verifikasi DP dari halaman Inquiry (berlaku untuk quoted & converted)
async function openVerifyDpFromInquiry(item) {
  if (!item.booking_id) return
  if (!item.booking_dp_bukti_url) {
    // Belum ada bukti — manual verify dengan konfirmasi
    if (!confirm(`Verifikasi pembayaran ${verifyModalLabelForInquiry(item)} secara manual untuk ${item.client_name}?\nBukti transfer belum diunggah oleh client.`)) return
  }
  const label = verifyModalLabelForInquiry(item)
  if (item.booking_dp_bukti_url) {
    // Ada bukti — arahkan ke halaman Bookings dengan modal verif terbuka
    // Simpan ke localStorage agar BookingsView bisa auto-buka modal
    localStorage.setItem('autoVerifyBookingId', String(item.booking_id))
    window.location.href = '/admin/bookings'
    return
  }
  // Manual verify tanpa bukti
  try {
    const r = await fetch(`${API}/bookings/${item.booking_id}/verify-dp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ dp_bukti_url: '', dp_amount: item.booking_dp_amount })
    })
    const d = await r.json()
    if (d.booking || d.status === 'ok') {
      alert(`✅ Pembayaran ${label} untuk ${item.client_name} berhasil diverifikasi!`)
      load()
    } else {
      alert(d.error || 'Verifikasi gagal')
    }
  } catch (e) {
    alert('Error: ' + e.message)
  }
}

function verifyModalLabelForInquiry(item) {
  if (!item.booking_balance_amount || item.booking_balance_amount === 0) return 'Lunas (100%)'
  const pct = item.booking_total_price > 0
    ? Math.round((item.booking_dp_amount / item.booking_total_price) * 100)
    : 50
  return `DP (${pct}%)`
}

function copyLink() {
  const el = document.getElementById('gen-booking-url')
  if (el) {
    el.select()
    document.execCommand('copy')
    alert('Link berhasil disalin!')
  }
}

function copyDetailLink(id) {
  const el = document.getElementById(id)
  if (el) {
    el.select()
    document.execCommand('copy')
    alert('Link berhasil disalin!')
  }
}

function getBookingUrl(token) {
  if (!token) return ''
  return `http://${window.location.host}/confirm-booking.html?token=${token}`
}

function waAdminLink(item) {
  if (!item) return '#'
  const msg = `Halo Kak ${item.client_name}, terima kasih sudah mengirimkan inquiry wisuda untuk tanggal ${item.graduation_date} di ${item.location || '-'}. Saya admin dari ${authStore.companyName}. Yuk, kita diskusi untuk memilih paket foto terbaik yang paling cocok untuk kamu! 😊`
  return `https://api.whatsapp.com/send?phone=${item.client_phone}&text=${encodeURIComponent(msg)}`
}

async function deleteInquiry(item) {
  if (!item) return
  if (!await confirm(`Apakah Anda yakin ingin menghapus data inquiry '${item.client_name}' secara permanen? Seluruh data terkait akan dihapus bersih tanpa sisa.`)) return

  try {
    const res = await fetch(`${API}/inquiries/${item.id}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    const d = await res.json()
    if (!res.ok) {
      alert(d.error || 'Gagal menghapus inquiry')
      return
    }
    alert(d.message || 'Data inquiry berhasil dihapus!')
    detailItem.value = null
    await load()
  } catch (e) {
    console.error('Delete inquiry error:', e)
    alert('Terjadi kesalahan koneksi.')
  }
}

let debounceTimer
watch(search, () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => { page.value = 1; load() }, 400)
})

let timer = null
onMounted(() => {
  loadSettings()
  loadPackages()
  load()
  timer = setInterval(() => load(true), 3000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>
