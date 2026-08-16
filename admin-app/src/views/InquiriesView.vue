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
            <!-- Status (1 Chip Ramping & Bersih) -->
            <td class="p-3">
              <span class="status-chip" :class="statusClass(item.status, item.token_expires_at, item.booking_dp_status, item)">
                {{ getDisplayStatusLabel(item) }}
              </span>
            </td>
            <!-- Aksi (Tombol Interaktif dengan Count Waktu Link) -->
            <td class="p-3 text-right" @click.stop>
              <!-- 1. dp='uploaded': tombol Verifikasi (Lunas atau DP) -->
              <button v-if="item.booking_dp_status === 'uploaded'" @click="openVerifyDpFromInquiry(item)"
                :class="isFullPayment(item) ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-500 hover:bg-amber-600'"
                class="px-3 py-1.5 text-white rounded-lg text-[10px] font-bold transition animate-pulse shadow-sm flex items-center gap-1 ml-auto">
                <span>🔍</span>
                <span>{{ isFullPayment(item) ? 'Verifikasi Lunas (100%)' : 'Verifikasi DP (50%)' }}</span>
              </button>

              <!-- 2. Status: new → Buat Link Booking -->
              <button v-else-if="item.status === 'new'" @click="generateLink(item)"
                class="px-3 py-1.5 bg-[#0f766e] hover:bg-[#0d6860] text-white rounded-lg text-[10px] font-bold transition shadow-sm">
                🔗 Buat Link Booking
              </button>

              <!-- 3. Status: expired (atau token sudah kadaluarsa) → Merah: Link Expired (Klik = Regenerate) -->
              <button v-else-if="item.status === 'expired' || (item.status === 'booking_link_active' && isTokenExpired(item.token_expires_at))" @click="regenerateBookingLink(item)"
                class="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[10px] font-bold transition shadow-sm flex items-center gap-1 ml-auto">
                🔄 Link Expired
              </button>

              <!-- 4. Status: booking_link_active & masih aktif → 1 Tombol Bersih: Lihat Link (count) -->
              <button v-else-if="item.status === 'booking_link_active' || item.status === 'quoted'" @click="showGeneratedLink(item)"
                class="px-3 py-1.5 bg-[#EBF5FF] dark:bg-blue-950/40 text-[#1E40AF] dark:text-blue-300 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition border border-blue-200 dark:border-blue-900 shadow-sm flex items-center gap-1 ml-auto">
                <span>{{ getLinkActionText(item) }}</span>
              </button>
            </td>
          </tr>
          <tr v-if="sortedData.length === 0">
            <td class="p-8 text-center text-[#C4B0A5]" colspan="5">
              {{ search || filterStatus ? 'Tidak ada data yang sesuai filter' : 'Belum ada inquiry' }}
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
            <span class="status-chip text-[9px]" :class="statusClass(item.status, item.token_expires_at, item.booking_dp_status, item)">
              {{ getDisplayStatusLabel(item) }}
            </span>
            <button v-if="item.booking_dp_status === 'uploaded'" @click="openVerifyDpFromInquiry(item)"
              :class="isFullPayment(item) ? 'bg-emerald-600' : 'bg-amber-500'"
              class="px-2.5 py-1.5 text-white rounded-lg text-[10px] font-bold animate-pulse">
              🔍 {{ isFullPayment(item) ? 'Lunas' : 'DP' }}
            </button>
            <button v-else-if="item.status === 'new'" @click="generateLink(item)"
              class="px-2.5 py-1.5 bg-[#0f766e] text-white rounded-lg text-[10px] font-bold">
              🔗
            </button>
            <button v-else-if="item.status === 'expired' || (item.status === 'booking_link_active' && isTokenExpired(item.token_expires_at))" @click="regenerateBookingLink(item)"
              class="px-2.5 py-1.5 bg-rose-500 text-white rounded-lg text-[10px] font-bold">
              🔄
            </button>
            <button v-else-if="item.status === 'booking_link_active' || item.status === 'quoted'" @click="showGeneratedLink(item)"
              class="px-2.5 py-1.5 bg-[#EBF5FF] dark:bg-blue-950/40 text-[#1E40AF] dark:text-blue-300 border border-blue-200 rounded-lg text-[10px] font-bold">
              {{ getLinkActionText(item) }}
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
          <span class="ml-auto status-chip" :class="statusClass(detailItem.status, detailItem.token_expires_at, detailItem.booking_dp_status, detailItem)">{{ getDisplayStatusLabel(detailItem) }}</span>
          <button @click="detailItem=null" class="text-[#C4B0A5] hover:text-[#2D1B14] dark:hover:text-slate-200">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <dl class="space-y-2.5 text-sm text-[#475569] dark:text-slate-300">
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">WA</dt><dd class="font-medium text-[#2D1B14] dark:text-slate-200">{{ detailItem.client_phone }}</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">Tgl Wisuda</dt><dd>{{ detailItem.graduation_date }}</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">Univ</dt><dd>{{ detailItem.university || '-' }}</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">Lokasi</dt><dd>{{ detailItem.location || '-' }}</dd></div>
          <!-- Unified Cost & Discount Adjustment Panel -->
          <div class="mt-2.5 p-3.5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 rounded-xl space-y-2.5">
            <div class="flex justify-between items-center">
              <span class="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                ⚙️ Penyesuaian Biaya & Diskon
              </span>
              <button v-if="!detailItem.token_used && detailItem.status !== 'converted' && detailItem.booking_dp_status !== 'uploaded'"
                type="button" @click="toggleChargeEdit" class="text-[10px] text-[#B5942B] dark:text-amber-400 font-bold hover:underline">
                {{ showChargeForm ? 'Tutup' : '✏️ Atur Biaya / Diskon' }}
              </button>
              <span v-else class="text-[10px] text-amber-800 dark:text-amber-400 font-bold bg-amber-200/50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                🔒 Terkunci
              </span>
            </div>

            <!-- Tampilan Ringkas (Read-Only) -->
            <div v-if="!showChargeForm" class="space-y-1 text-xs">
              <div v-if="detailItem.transport_charge > 0" class="flex justify-between text-amber-900 dark:text-amber-300 font-semibold">
                <span>🚗 Biaya Transport:</span>
                <span>+ Rp {{ parseInt(detailItem.transport_charge).toLocaleString('id-ID') }}</span>
              </div>
              <div v-if="detailItem.discount_amount > 0" class="flex justify-between text-emerald-700 dark:text-emerald-400 font-semibold">
                <span>🏷️ Potongan Diskon:</span>
                <span>- Rp {{ parseInt(detailItem.discount_amount).toLocaleString('id-ID') }}</span>
              </div>
              <div v-if="!detailItem.transport_charge && !detailItem.discount_amount" class="text-[10px] text-amber-700/70 dark:text-slate-400 font-light italic">
                Normal (Tanpa biaya tambahan & diskon).
              </div>
            </div>

            <!-- Form Edit Biaya & Diskon -->
            <div v-if="showChargeForm" class="pt-2 border-t border-amber-200/60 dark:border-amber-900/40 space-y-3">
              <!-- Extra Transport Charge -->
              <div>
                <label class="block text-[10px] text-amber-900 dark:text-amber-300 font-bold mb-1">🚗 Biaya Transport / Extra Charge (Rp)</label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-800 dark:text-amber-400">Rp</span>
                  <input v-model="formattedChargeAmount" type="text" class="input-fancy !pl-9 !text-xs !py-1.5 font-bold text-amber-900 dark:text-amber-300 dark:bg-slate-950 dark:border-slate-800" placeholder="0">
                </div>
                <input v-model="chargeInput.notes" type="text" class="input-fancy !text-xs !py-1.5 mt-1.5" placeholder="Keterangan transport (misal: Sesi CPI / Luar Kota)">
              </div>

              <!-- Diskon / Potongan Harga -->
              <div class="pt-2 border-t border-amber-200/40 dark:border-amber-900/30">
                <label class="flex items-center gap-2 text-[11px] font-bold text-emerald-800 dark:text-emerald-400 cursor-pointer">
                  <input type="checkbox" v-model="chargeInput.has_discount" class="rounded text-emerald-600 focus:ring-emerald-500">
                  <span>🏷️ Berikan Potongan Diskon Khusus</span>
                </label>
                <div v-if="chargeInput.has_discount" class="mt-2 space-y-1.5 animate-fade-in">
                  <div class="relative">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-700 dark:text-emerald-400">Rp</span>
                    <input v-model="formattedDiscountAmount" type="text" class="input-fancy !pl-9 !text-xs !py-1.5 font-bold text-emerald-800 dark:text-emerald-300 dark:bg-slate-950 dark:border-slate-800" placeholder="0">
                  </div>
                  <input v-model="chargeInput.discount_notes" type="text" class="input-fancy !text-xs !py-1.5" placeholder="Keterangan diskon (misal: Promo Early Bird / Nego)">
                </div>
              </div>

              <div class="pt-1">
                <button type="button" @click="saveCharge" :disabled="savingCharge" class="w-full py-2 bg-[#0f766e] text-white font-bold rounded-lg text-xs hover:bg-[#0d6860] transition flex items-center justify-center gap-1">
                  <span v-if="savingCharge" class="loading-spinner !w-3 !h-3"></span>
                  <span v-else>💾 Simpan Penyesuaian Biaya</span>
                </button>
              </div>
            </div>
          </div>

          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5">
            <dt class="text-[#C4B0A5]">Status</dt>
            <dd class="font-semibold" :class="detailItem.status === 'expired' || isTokenExpired(detailItem.token_expires_at) ? 'text-rose-500 font-bold' : 'text-[#2D1B14] dark:text-slate-200'">
              {{ getDisplayStatusLabel(detailItem) }}
            </dd>
          </div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">Catatan Klien</dt><dd class="italic">{{ detailItem.notes || '-' }}</dd></div>
          
          <!-- Single Unified Action: Link Booking -->
          <div class="pt-3 border-t border-[#E8D5C8]/60 dark:border-slate-800" v-if="detailItem.booking_token">
            <!-- Jika Link Expired / Kadaluarsa -->
            <div v-if="detailItem.status === 'expired' || (detailItem.status === 'booking_link_active' && isTokenExpired(detailItem.token_expires_at))" class="space-y-2">
              <div class="p-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl">
                <p class="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  ⚠️ Link Booking Kadaluarsa
                </p>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Link ini sudah melewati batas waktu dan tidak dapat diakses klien. Buat link baru untuk klien ini:
                </p>
              </div>
              <button @click="regenerateBookingLink(detailItem)" class="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm">
                🔄 Buat Ulang Link Booking Baru
              </button>
            </div>

            <!-- Jika Link Masih Aktif / Normal -->
            <div v-else>
              <dt class="text-[#C4B0A5] mb-1 text-xs">Link Booking <span class="text-[9px]" :class="detailItem.token_used ? 'text-green-600 font-bold' : 'text-yellow-600 font-bold'">({{ detailItem.token_used ? 'Sudah Dipakai' : 'Aktif / Belum Dipakai' }})</span></dt>
              <dd class="flex gap-1.5 items-center">
                <input :value="getBookingUrl(detailItem.booking_token)" readonly class="input-fancy !text-[11px] !py-1 select-all dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" :id="'detail-booking-url-' + detailItem.id">
                <button @click="copyDetailLink('detail-booking-url-' + detailItem.id)" class="px-2.5 py-1 bg-[#FAF6F0] border border-[#E8D5C8] dark:bg-slate-800 dark:border-slate-700 text-[#8A7A72] dark:text-slate-300 rounded-lg text-[10px] font-semibold hover:bg-[#FFE5DA] transition flex-shrink-0">
                  Salin
                </button>
              </dd>
              <div class="mt-2 flex justify-end" v-if="!detailItem.token_used && detailItem.status !== 'converted'">
                <button @click="regenerateBookingLink(detailItem)" class="px-2.5 py-1 bg-[#FFF0E8] border border-[#E8D5C8] dark:bg-slate-800 dark:border-slate-700 text-[#D94A3D] dark:text-amber-400 rounded-lg text-[10px] font-semibold hover:bg-[#FFE5DA] transition flex items-center gap-1">
                  🔄 Perbarui / Buat Ulang Link
                </button>
              </div>
              <!-- Tombol Verifikasi DP jika bukti transfer sudah diunggah -->
              <div v-if="detailItem.booking_dp_status === 'uploaded'" class="mt-3 pt-2.5 border-t border-amber-200/60 dark:border-amber-900/40">
                <button @click="const it = detailItem; detailItem=null; openVerifyDpFromInquiry(it)" class="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md animate-pulse">
                  🔍 Verifikasi Pembayaran DP Klien
                </button>
              </div>
            </div>
          </div>
          <div class="pt-3" v-else>
            <button @click="generateLink(detailItem)" class="w-full py-2.5 bg-[#0f766e] hover:bg-[#0d6860] text-white rounded-xl text-xs font-bold transition shadow-md flex items-center justify-center gap-1.5">
              🔗 Buat Link Booking Resmi
            </button>
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

    <!-- Generated Link Result Modal -->
    <div v-if="tokenResult" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.6); backdrop-filter: blur(6px);" @click.self="tokenResult=null">
      <div class="card w-full max-w-sm p-5 animate-pop dark:bg-slate-900 dark:border-slate-800">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-bold text-[#2D1B14] dark:text-slate-200">🔗 Link Booking Resmi</h3>
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

    <!-- Modal Verifikasi Pembayaran Langsung di Inquiries -->
    <div v-if="verifyModalItem" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.6); backdrop-filter: blur(6px);" @click.self="verifyModalItem=null">
      <div class="card w-full max-w-lg p-5 animate-pop dark:bg-slate-900 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
        <!-- Header Modal -->
        <div class="flex items-center justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-3">
          <div class="flex items-center gap-2.5">
            <span class="text-xl">{{ isFullPayment(verifyModalItem) ? '💰' : '💳' }}</span>
            <div>
              <h3 class="font-bold text-[#2D1B14] dark:text-slate-200 text-sm">
                {{ isFullPayment(verifyModalItem) ? 'Verifikasi Pembayaran Lunas (100%)' : 'Verifikasi Pembayaran DP (50%)' }}
              </h3>
              <p class="text-[10px] text-[#8A7A72] dark:text-slate-400">
                {{ isFullPayment(verifyModalItem) ? 'Periksa bukti transfer pelunasan penuh sebelum mengesahkan booking' : 'Periksa bukti transfer DP sebelum mengesahkan booking' }}
              </p>
            </div>
          </div>
          <button @click="verifyModalItem=null" class="text-[#C4B0A5] hover:text-[#2D1B14] dark:hover:text-slate-200">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- Info Client & Reservasi -->
        <div class="p-3.5 bg-[#FAF9F6] dark:bg-slate-950 border border-[#E8D5C8]/60 dark:border-slate-800 rounded-xl space-y-2 text-xs">
          <div class="flex justify-between"><span class="text-[#8A7A72]">Nama Klien:</span><span class="font-bold text-[#2D1B14] dark:text-slate-200">{{ verifyModalItem.client_name }}</span></div>
          <div class="flex justify-between"><span class="text-[#8A7A72]">WhatsApp:</span><span class="font-medium text-[#2D1B14] dark:text-slate-200">{{ verifyModalItem.client_phone }}</span></div>
          <div class="flex justify-between"><span class="text-[#8A7A72]">Tanggal Wisuda:</span><span class="font-medium text-[#2D1B14] dark:text-slate-200">{{ verifyModalItem.graduation_date }}</span></div>
          <div class="flex justify-between"><span class="text-[#8A7A72]">Universitas / Lokasi:</span><span class="font-medium text-[#2D1B14] dark:text-slate-200">{{ verifyModalItem.university || '-' }} ({{ verifyModalItem.location || '-' }})</span></div>
          <div v-if="verifyModalItem.booking_package_name" class="flex justify-between"><span class="text-[#8A7A72]">Paket Dipilih:</span><span class="font-bold text-[#C59B63]">{{ verifyModalItem.booking_package_name }}</span></div>
          <div v-if="verifyModalItem.booking_shooting_time" class="flex justify-between"><span class="text-[#8A7A72]">Jam Sesi:</span><span class="font-bold text-[#2D1B14] dark:text-slate-200">{{ verifyModalItem.booking_shooting_time }}</span></div>
        </div>

        <!-- Kotak Rincian Finansial & Opsi Pembayaran -->
        <div class="p-3.5 rounded-xl border space-y-2 text-xs"
             :class="isFullPayment(verifyModalItem) ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50' : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50'">
          <div class="flex justify-between items-center pb-1.5 border-b border-current/10">
            <span class="text-[11px] font-bold" :class="isFullPayment(verifyModalItem) ? 'text-emerald-800 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300'">
              🏷️ Opsi Pembayaran:
            </span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                  :class="isFullPayment(verifyModalItem) ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'">
              {{ isFullPayment(verifyModalItem) ? '🟢 FULL PAYMENT (LUNAS 100%)' : '🟡 DOWN PAYMENT (DP 50%)' }}
            </span>
          </div>
          <div class="flex justify-between text-[#8A7A72]">
            <span>Total Biaya Paket:</span>
            <span class="font-bold text-[#2D1B14] dark:text-slate-200">Rp {{ Number(verifyModalItem.booking_total_price || verifyModalItem.booking_dp_amount || 0).toLocaleString('id-ID') }}</span>
          </div>
          <div class="flex justify-between font-bold" :class="isFullPayment(verifyModalItem) ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'">
            <span>{{ isFullPayment(verifyModalItem) ? 'Nominal Ditransfer Klien:' : 'Nominal DP Ditransfer Klien:' }}</span>
            <span>Rp {{ Number(verifyModalItem.booking_dp_amount || 0).toLocaleString('id-ID') }}</span>
          </div>
          <div class="flex justify-between pt-1 border-t border-current/10 font-medium">
            <span class="text-[#8A7A72]">Sisa Tagihan Pelunasan:</span>
            <span v-if="isFullPayment(verifyModalItem)" class="text-emerald-700 dark:text-emerald-400 font-bold">
              Rp 0 (LUNAS ✓)
            </span>
            <span v-else class="text-amber-700 dark:text-amber-400 font-bold">
              Rp {{ Number(verifyModalItem.booking_balance_amount || 0).toLocaleString('id-ID') }} (Wajib Saat Sesi)
            </span>
          </div>
        </div>

        <!-- Preview Bukti Transfer -->
        <div>
          <label class="block text-[11px] font-bold text-[#2D1B14] dark:text-slate-200 mb-1.5">🖼️ Gambar Bukti Transfer Bank:</label>
          <div v-if="verifyModalItem.booking_dp_bukti_url" class="border border-[#E8D5C8] dark:border-slate-800 rounded-xl overflow-hidden bg-gray-50 dark:bg-slate-950 flex items-center justify-center p-2 min-h-[220px] max-h-[420px]">
            <iframe v-if="isPdf(verifyModalItem.booking_dp_bukti_url)" :src="verifyModalItem.booking_dp_bukti_url" class="w-full h-80 rounded-lg" frameborder="0"></iframe>
            <img v-else :src="verifyModalItem.booking_dp_bukti_url" alt="Bukti Transfer" class="max-w-full max-h-[400px] object-contain rounded-lg shadow-sm" />
          </div>
          <div v-else class="p-4 bg-amber-50 text-amber-700 text-center rounded-xl text-xs font-medium">
            Klien belum mengunggah file bukti transfer.
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-2 pt-2 border-t border-[#E8D5C8]/60 dark:border-slate-800">
          <button type="button" @click="verifyModalItem=null" class="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-[#8A7A72] dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-200 transition">
            Tutup
          </button>
          <button type="button" @click="submitVerifyDpFromInquiry" :disabled="verifyingDp" class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md">
            <span v-if="verifyingDp" class="loading-spinner !w-3.5 !h-3.5"></span>
            <span v-else>✅ Setujui &amp; Sahkan Booking</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Hasil Verifikasi Berhasil -->
    <div v-if="verifyResult" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.6); backdrop-filter: blur(6px);" @click.self="verifyResult=null">
      <div class="card w-full max-w-md p-6 text-center animate-pop dark:bg-slate-900 dark:border-slate-800 space-y-4">
        <div class="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold">
          ✓
        </div>
        <div>
          <h3 class="text-base font-bold text-[#2D1B14] dark:text-slate-200">
            {{ isFullPayment(verifyResult.booking) ? 'Pembayaran Lunas (100%) Berhasil Disahkan!' : 'Pembayaran DP Berhasil Disahkan!' }}
          </h3>
          <p class="text-xs text-[#8A7A72] dark:text-slate-400 mt-1">Data telah resmi tercatat sebagai Booking Aktif di menu Client.</p>
        </div>

        <div v-if="verifyResult.booking" class="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl text-left text-xs space-y-1">
          <div class="flex justify-between"><span class="text-[#8A7A72]">Kode Tracking:</span><span class="font-mono font-bold text-emerald-800 dark:text-emerald-400">{{ verifyResult.booking.tracking_code || '-' }}</span></div>
          <div class="flex justify-between"><span class="text-[#8A7A72]">Klien:</span><span class="font-bold text-[#2D1B14] dark:text-slate-200">{{ verifyResult.booking.client_name }}</span></div>
          <div class="flex justify-between"><span class="text-[#8A7A72]">Tipe:</span><span class="font-bold text-emerald-700 dark:text-emerald-400">{{ isFullPayment(verifyResult.booking) ? 'Lunas 100%' : 'DP 50%' }}</span></div>
        </div>

        <div class="flex flex-col gap-2 pt-2">
          <a v-if="verifyResult.wa_link" :href="verifyResult.wa_link" target="_blank" class="w-full py-2.5 bg-[#0f766e] hover:bg-[#0d6860] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md">
            <span>💬 Kirim Konfirmasi &amp; Tracking WA ke Klien</span>
          </a>
          <button @click="verifyResult=null" class="w-full py-2 bg-slate-100 dark:bg-slate-800 text-[#8A7A72] dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-200 transition">
            Selesai
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useAuthStore, getAuthHeaders } from '../stores/auth'

const authStore = useAuthStore()

const API = '/api/admin'
const data = ref([])
const loading = ref(true)
const search = ref('')
const filterStatus = ref('')
const page = ref(1)
const totalPages = ref(1)
const statuses = ['new', 'quoted', 'booking_link_active', 'converted', 'expired', 'lost', 'archived']
const detailItem = ref(null)
const tokenResult = ref(null)
const verifyModalItem = ref(null)
const verifyingDp = ref(false)
const verifyResult = ref(null)

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
  'booking_link_active': 2,
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

const nowTime = ref(Date.now())

// Label status Bahasa Indonesia
function statusLabel(s) {
  const map = {
    new: 'Baru Masuk',
    quoted: 'Link Booking Aktif',
    booking_link_active: 'Link Booking Aktif',
    converted: 'Booking Sah',
    expired: 'Link Expired',
    lost: 'Tidak Jadi',
    archived: 'Diarsipkan'
  }
  return map[s] || s
}

function isQrisActive(item) {
  if (!item || item.qris_status !== 'pending' || !item.qris_expired_at) return false
  if (item.booking_dp_status === 'paid' || item.status === 'converted') return false
  return new Date(item.qris_expired_at).getTime() > nowTime.value
}

function isQrisExpired(item) {
  if (!item || !item.qris_expired_at) return false
  if (item.booking_dp_status === 'paid' || item.status === 'converted') return false
  return (item.qris_status === 'expired' || item.qris_status === 'pending') && new Date(item.qris_expired_at).getTime() <= nowTime.value
}

function getQrisRemainingText(expiredAt) {
  if (!expiredAt) return ''
  const diff = new Date(expiredAt).getTime() - nowTime.value
  if (diff <= 0) return 'QRIS Expired'
  const mins = Math.floor(diff / (1000 * 60))
  const secs = Math.floor((diff % (1000 * 60)) / 1000)
  return `QRIS Aktif (${mins}:${secs < 10 ? '0' : ''}${secs})`
}

function getLinkActionText(item) {
  if (!item || !item.token_expires_at) return '🔗 Lihat Link'
  // Saat QRIS sedang aktif: tampilkan sisa waktu yang terkunci / beku secara stasioner (DI-PAUSE)
  if (isQrisActive(item)) {
    const pausedSec = item.token_paused_remaining_seconds != null
      ? Number(item.token_paused_remaining_seconds)
      : Math.max(0, Math.floor((new Date(item.token_expires_at).getTime() - new Date(item.qris_created_at || item.created_at).getTime()) / 1000))
    const hours = Math.floor(pausedSec / 3600)
    const mins = Math.floor((pausedSec % 3600) / 60)
    const secs = pausedSec % 60
    if (hours > 0) return `🔗 Lihat Link (${hours}j ${mins}m di-pause)`
    return `🔗 Lihat Link (${mins}m ${secs < 10 ? '0' : ''}${secs}s di-pause)`
  }
  const diff = new Date(item.token_expires_at).getTime() - nowTime.value
  if (diff <= 0) return '🔄 Link Expired'
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const secs = Math.floor((diff % (1000 * 60)) / 1000)
  if (hours > 0) return `🔗 Lihat Link (${hours}j ${mins}m)`
  return `🔗 Lihat Link (${mins}m ${secs < 10 ? '0' : ''}${secs}s)`
}

function getQrisTimerOnly(expiredAt) {
  if (!expiredAt) return '15:00'
  const diff = new Date(expiredAt).getTime() - nowTime.value
  if (diff <= 0) return '00:00'
  const mins = Math.floor(diff / (1000 * 60))
  const secs = Math.floor((diff % (1000 * 60)) / 1000)
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}

function isTokenExpired(expiresAt, item = null) {
  if (item && isQrisActive(item)) {
    return false // Saat QRIS aktif, link berstatus PAUSED (tidak expired)
  }
  if (!expiresAt) return false
  return new Date(expiresAt).getTime() <= nowTime.value
}

function isPdf(url) {
  return url && String(url).toLowerCase().endsWith('.pdf')
}

function isFullPayment(item) {
  if (!item) return false
  const bal = Number(item.booking_balance_amount || item.balance_amount || 0)
  const total = Number(item.booking_total_price || item.total_price || 0)
  const dp = Number(item.booking_dp_amount || item.dp_amount || 0)
  if (bal === 0 && (total > 0 || dp > 0)) return true
  if (total > 0 && dp >= total) return true
  return false
}

function getRemainingTimeText(expiresAt) {
  if (!expiresAt) return ''
  const diff = new Date(expiresAt).getTime() - nowTime.value
  if (diff <= 0) return 'Expired'
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const secs = Math.floor((diff % (1000 * 60)) / 1000)
  if (hours > 0) return `${hours}j ${mins}m`
  return `${mins}m ${secs}s`
}

function getDisplayStatusLabel(item) {
  if (!item) return ''
  if (item.booking_dp_status === 'uploaded') {
    return isFullPayment(item) ? 'Menunggu Verifikasi Lunas' : 'Menunggu Verifikasi DP'
  }
  if (item.status === 'converted' && item.booking_dp_status === 'paid') {
    return isFullPayment(item) ? 'Lunas Terkonfirmasi' : 'DP Terkonfirmasi'
  }
  if (isQrisActive(item)) {
    return `QRIS Aktif (${getQrisTimerOnly(item.qris_expired_at)})`
  }
  if (isQrisExpired(item)) {
    if (isTokenExpired(item.token_expires_at, item)) return 'Link Expired'
    return 'QRIS Expired'
  }
  if (item.status === 'expired' || (item.status === 'booking_link_active' && isTokenExpired(item.token_expires_at, item))) {
    return 'Link Expired'
  }
  if (item.status === 'booking_link_active' || item.status === 'quoted') {
    return 'Menunggu Pembayaran'
  }
  return statusLabel(item.status)
}

function statusClass(s, expiresAt = null, dpStatus = null, item = null) {
  if (dpStatus === 'uploaded') {
    if (item && isFullPayment(item)) {
      return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold'
    }
    return 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-bold'
  }
  if (isQrisActive(item)) {
    return 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-bold'
  }
  if (isQrisExpired(item) && !isTokenExpired(expiresAt)) {
    return 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
  }
  if (s === 'expired' || (s === 'booking_link_active' && isTokenExpired(expiresAt))) {
    return 'bg-[#FEF2F2] text-[#EF4444] dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900/50'
  }
  const map = {
    new: 'bg-[#FAF0DD] text-[#B5942B] dark:bg-amber-950/40 dark:text-amber-300 border border-[#E8D5C8]/80 dark:border-amber-900/40',
    quoted: 'bg-[#EBF5FF] text-[#1E40AF] dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40',
    booking_link_active: 'bg-[#EBF5FF] text-[#1E40AF] dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40',
    converted: 'bg-[#E8F5E9] text-[#2E7D32] dark:bg-green-950/30 dark:text-green-400 border border-green-200 dark:border-green-900/40',
    expired: 'bg-[#FEF2F2] text-[#EF4444] dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900/50',
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
const chargeInput = ref({
  amount: 0,
  notes: '',
  has_discount: false,
  discount_amount: 0,
  discount_notes: ''
})

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

const formattedDiscountAmount = computed({
  get() {
    if (!chargeInput.value.discount_amount) return ''
    return Number(chargeInput.value.discount_amount).toLocaleString('id-ID')
  },
  set(val) {
    const raw = String(val).replace(/[^0-9]/g, '')
    chargeInput.value.discount_amount = raw ? parseInt(raw, 10) : 0
  }
})

function showDetail(item) {
  detailItem.value = item
  showChargeForm.value = false
  chargeInput.value = {
    amount: item.transport_charge || 0,
    notes: item.transport_charge_notes || '',
    has_discount: Boolean(item.discount_amount && item.discount_amount > 0),
    discount_amount: item.discount_amount || 0,
    discount_notes: item.discount_notes || ''
  }
}

function toggleChargeEdit() {
  showChargeForm.value = !showChargeForm.value
  if (showChargeForm.value && detailItem.value) {
    chargeInput.value = {
      amount: detailItem.value.transport_charge || 0,
      notes: detailItem.value.transport_charge_notes || '',
      has_discount: Boolean(detailItem.value.discount_amount && detailItem.value.discount_amount > 0),
      discount_amount: detailItem.value.discount_amount || 0,
      discount_notes: detailItem.value.discount_notes || ''
    }
  }
}

async function saveCharge() {
  if (!detailItem.value) return
  savingCharge.value = true
  try {
    const finalDiscount = chargeInput.value.has_discount ? (chargeInput.value.discount_amount || 0) : 0
    const finalDiscountNotes = chargeInput.value.has_discount ? (chargeInput.value.discount_notes || '') : ''

    const res = await fetch(`${API}/inquiries/${detailItem.value.id}/adjust-charges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        transport_charge: chargeInput.value.amount || 0,
        transport_charge_notes: chargeInput.value.notes || '',
        discount_amount: finalDiscount,
        discount_notes: finalDiscountNotes,
        ignore_transport_charge: 0
      })
    })
    const d = await res.json()
    if (!res.ok) {
      alert(d.error || 'Gagal menyimpan penyesuaian biaya')
      savingCharge.value = false
      return
    }
    detailItem.value.transport_charge = d.inquiry.transport_charge
    detailItem.value.transport_charge_notes = d.inquiry.transport_charge_notes
    detailItem.value.discount_amount = d.inquiry.discount_amount
    detailItem.value.discount_notes = d.inquiry.discount_notes
    detailItem.value.is_outside_main_area = d.inquiry.is_outside_main_area
    showChargeForm.value = false
    alert('Penyesuaian biaya dan diskon berhasil disimpan!')
    await load(true)
  } catch (e) {
    console.error('Save charge error:', e)
    alert('Gagal menyimpan penyesuaian biaya')
  } finally {
    savingCharge.value = false
  }
}

async function generateLink(item) {
  try {
    const res = await fetch(`${API}/inquiries/${item.id}/create-booking-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        package_id: item.package_id || null,
        payment_type: item.payment_type || 'dp',
        transport_charge: item.transport_charge || 0,
        transport_charge_notes: item.transport_charge_notes || '',
        discount_amount: item.discount_amount || 0,
        discount_notes: item.discount_notes || ''
      })
    })
    if (res.ok) {
      const result = await res.json()
      tokenResult.value = result
      detailItem.value = null
      await load()
    } else {
      const err = await res.json()
      alert(err.error || 'Gagal membuat link booking')
    }
  } catch (e) {
    console.error('Error generating link:', e)
    alert('Terjadi kesalahan saat membuat link booking')
  }
}

async function regenerateBookingLink(item) {
  if (!confirm(`Apakah Anda yakin ingin memperbarui/membuat ulang link booking untuk ${item.client_name}? Link lama akan tidak bisa digunakan lagi.`)) return

  try {
    const res = await fetch(`${API}/inquiries/${item.id}/regenerate-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({})
    })
    if (res.ok) {
      const result = await res.json()
      alert('Link booking berhasil diperbarui!')
      tokenResult.value = result
      detailItem.value = null
      await load()
    } else {
      const err = await res.json()
      alert(err.error || 'Gagal memperbarui link booking')
    }
  } catch (e) {
    console.error('Error renewing token:', e)
  }
}

function showGeneratedLink(item) {
  if (!item || !item.booking_token) return
  
  const link = `${window.location.origin}/confirm-booking.html?token=${item.booking_token}`
  const waMessage = `Halo ${item.client_name}, silakan pilih paket foto wisuda kamu dan selesaikan booking melalui link berikut ini ya: ${link}`
  const waLink = `https://api.whatsapp.com/send?phone=${item.client_phone}&text=${encodeURIComponent(waMessage)}`
  
  tokenResult.value = {
    token: item.booking_token,
    expires_at: item.token_expires_at,
    booking_url: link,
    confirm_booking_url: link,
    wa_link: waLink
  }
}

// Verifikasi DP dari halaman Inquiry langsung di tempat (In-Place Modal)
function openVerifyDpFromInquiry(item) {
  if (!item) return
  verifyModalItem.value = item
}

async function submitVerifyDpFromInquiry() {
  if (!verifyModalItem.value || !verifyModalItem.value.booking_id) return
  verifyingDp.value = true
  const item = verifyModalItem.value
  try {
    const r = await fetch(`${API}/bookings/${item.booking_id}/verify-dp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      credentials: 'include',
      body: JSON.stringify({
        dp_bukti_url: item.booking_dp_bukti_url || '',
        dp_amount: item.booking_dp_amount || 0
      })
    })
    const d = await r.json()
    if (d.booking || d.status === 'ok') {
      verifyModalItem.value = null
      verifyResult.value = {
        booking: d.booking,
        invoice_url: d.invoice_url,
        wa_link: d.wa_link || d.wa_link_client
      }
      load(true)
    } else {
      alert(d.error || 'Verifikasi gagal.')
    }
  } catch (e) {
    console.error('Verify DP error:', e)
    alert('Gagal verifikasi: ' + e.message)
  } finally {
    verifyingDp.value = false
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
  return `${window.location.origin}/confirm-booking.html?token=${token}`
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
let nowTimer = null

onMounted(() => {
  loadPackages()
  load()
  timer = setInterval(() => load(true), 3000)
  nowTimer = setInterval(() => { nowTime.value = Date.now() }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  if (nowTimer) clearInterval(nowTimer)
})
</script>
