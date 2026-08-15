<template>
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <div class="flex items-center gap-2.5">
          <h1 class="text-2xl font-bold text-[#2D1B14] tracking-tight">Overview</h1>
          <span class="status-chip bg-[#FDECEA] text-[#D94A3D]">live</span>
        </div>
        <p class="text-sm text-[#8A7A72] dark:text-slate-400 mt-0.5">{{ greeting }}, <strong class="text-[#2D1B14] dark:text-slate-200">{{ authStore.user?.name || 'Admin' }}</strong></p>
      </div>
      <div class="flex items-center gap-3">
        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl border border-[#E8D5C8] text-[10px] text-[#8A7A72] shadow-sm">
          <span class="w-1.5 h-1.5 rounded-full bg-[#D94A3D] animate-pulse"></span>
          {{ timeStr }}
        </span>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-24">
      <div class="loading-spinner"></div>
    </div>

    <template v-else>
      <!-- 🟢 System & Automation Health Status Barometer -->
      <div class="card p-3.5 mb-5 dark:bg-slate-900 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mr-1">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Status Sistem:
          </span>
          <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
            <span>☁️</span>
            <span class="text-slate-500 dark:text-slate-400 font-medium">Google Drive:</span>
            <strong :class="s.system_health?.drive_active ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'">
              {{ s.system_health?.drive_active ? 'Aktif' : 'Belum Ditautkan' }}
            </strong>
          </div>
          <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
            <span>📧</span>
            <span class="text-slate-500 dark:text-slate-400 font-medium">SMTP Email:</span>
            <strong :class="s.system_health?.smtp_active ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'">
              {{ s.system_health?.smtp_active ? 'Aktif' : 'Non-aktif' }}
            </strong>
          </div>
          <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
            <span>💾</span>
            <span class="text-slate-500 dark:text-slate-400 font-medium">Backup Otomatis:</span>
            <strong class="text-slate-700 dark:text-slate-300">02:00 WIB</strong>
          </div>
        </div>
        <router-link to="/admin/settings" class="text-[11px] font-bold text-sky-700 dark:text-sky-400 hover:underline flex items-center gap-1">
          <span>Kelola Integrasi</span> <span>→</span>
        </router-link>
      </div>

      <!-- ⚡ Core Sidebar Overview Hub (5 Key KPI Modules) -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-5">
        <!-- 1. Inquiry -->
        <router-link to="/admin/inquiries" class="card p-3 dark:bg-slate-900 dark:border-slate-800 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition flex items-center justify-between group">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm flex-shrink-0 group-hover:scale-105 transition">✉️</span>
            <div class="min-w-0">
              <span class="text-[11px] font-bold text-slate-800 dark:text-slate-200 block truncate">Inquiries</span>
              <span class="text-[9px] text-slate-400 block truncate">Calon klien</span>
            </div>
          </div>
          <span class="text-xs font-black px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono">
            {{ s.inquiries_total || 0 }}
          </span>
        </router-link>

        <!-- 2. Client -->
        <router-link to="/admin/bookings" class="card p-3 dark:bg-slate-900 dark:border-slate-800 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition flex items-center justify-between group">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm flex-shrink-0 group-hover:scale-105 transition">👥</span>
            <div class="min-w-0">
              <span class="text-[11px] font-bold text-slate-800 dark:text-slate-200 block truncate">Client</span>
              <span class="text-[9px] text-slate-400 block truncate">Klien aktif</span>
            </div>
          </div>
          <span class="text-xs font-black px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono">
            {{ s.clients_active || 0 }}
          </span>
        </router-link>

        <!-- 3. Post Production -->
        <router-link to="/admin/deliverables" class="card p-3 dark:bg-slate-900 dark:border-slate-800 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition flex items-center justify-between group">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm flex-shrink-0 group-hover:scale-105 transition">🎬</span>
            <div class="min-w-0">
              <span class="text-[11px] font-bold text-slate-800 dark:text-slate-200 block truncate">Post Production</span>
              <span class="text-[9px] text-slate-400 block truncate">Antrean foto</span>
            </div>
          </div>
          <span class="text-xs font-black px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono">
            {{ s.drive_upload_pipeline?.total_clients || 0 }}
          </span>
        </router-link>

        <!-- 4. Payroll Freelance -->
        <router-link to="/admin/payroll" class="card p-3 dark:bg-slate-900 dark:border-slate-800 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition flex items-center justify-between group">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm flex-shrink-0 group-hover:scale-105 transition">💸</span>
            <div class="min-w-0">
              <span class="text-[11px] font-bold text-slate-800 dark:text-slate-200 block truncate">Payroll</span>
              <span class="text-[9px] text-slate-400 block truncate">Belum dibayar</span>
            </div>
          </div>
          <span class="text-xs font-black px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono" :class="(s.payout_pending || 0) > 0 ? 'text-amber-600 dark:text-amber-400' : ''">
            {{ s.payout_pending || 0 }}
          </span>
        </router-link>

        <!-- 5. Portofolio -->
        <router-link to="/admin/portfolio" class="card p-3 dark:bg-slate-900 dark:border-slate-800 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition flex items-center justify-between group">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm flex-shrink-0 group-hover:scale-105 transition">🖼️</span>
            <div class="min-w-0">
              <span class="text-[11px] font-bold text-slate-800 dark:text-slate-200 block truncate">Portofolio</span>
              <span class="text-[9px] text-slate-400 block truncate">Draft galeri</span>
            </div>
          </div>
          <span class="text-xs font-black px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono">
            {{ s.portfolio_draft || 0 }}
          </span>
        </router-link>
      </div>

      <!-- Row 1: Revenue + Alerts -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <!-- Revenue -->
        <div class="lg:col-span-2 card overflow-hidden relative dark:bg-slate-900 dark:border-slate-800">
          <div class="absolute -top-20 -right-20 w-48 h-48 bg-[#F0784B]/8 rounded-full blur-3xl"></div>
          <div class="absolute -bottom-10 -left-10 w-32 h-32 bg-[#F4A261]/12 rounded-full blur-3xl"></div>
          <div class="relative z-10 p-6">
            <div class="flex items-center justify-between mb-1">
              <span class="text-[10px] font-semibold text-[#8A7A72]/70 dark:text-slate-400 uppercase tracking-widest">Pendapatan Bulan Ini</span>
              <span class="flex items-center gap-1 text-[10px] font-semibold status-chip"
                :class="s.revenue_trend > 0 ? 'bg-[#FDECEA] text-[#D94A3D]' : s.revenue_trend < 0 ? 'bg-[#FEF2F2] text-[#EF4444]' : 'bg-[#FFF0E8] text-[#C4B0A5]'">
                <svg v-if="s.revenue_trend > 0" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>
                <svg v-else class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg>
                {{ isNaN(s.revenue_trend) || s.revenue_trend == null ? 0 : Math.abs(s.revenue_trend) }}%
              </span>
            </div>
            <div class="text-4xl font-bold text-[#2D1B14] dark:text-slate-100 tracking-tight mt-1" v-html="s.revenue_this_month ? s.revenue_this_month.replace('Rp','').trim() : 'Rp 0'"></div>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-[#E8D5C8]/60 dark:border-slate-800 text-xs">
              <div>
                <span class="text-[#C4B0A5] dark:text-slate-400 text-[10px] block">Total Pendapatan</span>
                <span class="text-[#2D1B14] dark:text-slate-200 font-semibold" v-text="formatPrice(s.revenue_total)"></span>
              </div>
              <div>
                <span class="text-[#C4B0A5] dark:text-slate-400 text-[10px] block">Est. Sisa Pelunasan Klien</span>
                <span class="text-amber-600 dark:text-amber-400 font-bold" v-text="formatPrice(s.unpaid_balances_total)"></span>
              </div>
              <div>
                <span class="text-[#C4B0A5] dark:text-slate-400 text-[10px] block">Unpaid Fee FG (Payroll)</span>
                <span class="text-rose-600 dark:text-rose-400 font-bold" v-text="formatPrice(s.unpaid_fg_fees_total)"></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Alerts -->
        <div class="space-y-2.5">
          <!-- Inquiry Baru -->
          <div v-if="s.inquiries_new > 0" class="card p-4 dark:bg-slate-900 dark:border-slate-800">
            <div class="flex items-center justify-between mb-0.5">
              <span class="text-[10px] font-semibold text-[#8A7A72]/80 dark:text-slate-400 uppercase tracking-wider">Inquiry Baru</span>
              <span class="text-lg font-bold text-emerald-600 dark:text-emerald-400">{{ s.inquiries_new }}</span>
            </div>
            <p class="text-[10px] text-[#C4B0A5]">Perlu kirim Link Booking</p>
            <router-link to="/admin/inquiries" class="inline-block mt-1.5 text-[10px] text-[#D94A3D] font-semibold hover:underline">Follow Up →</router-link>
          </div>

          <!-- Booking Tanpa FG -->
          <div v-if="s.unassigned_bookings > 0" class="card p-4 dark:bg-slate-900 dark:border-slate-800">
            <div class="flex items-center justify-between mb-0.5">
              <span class="text-[10px] font-semibold text-[#8A7A72]/80 dark:text-slate-400 uppercase tracking-wider">Booking Tanpa FG</span>
              <span class="text-lg font-bold text-rose-600 dark:text-rose-400">{{ s.unassigned_bookings }}</span>
            </div>
            <p class="text-[10px] text-[#C4B0A5]">Perlu assign fotografer</p>
            <router-link to="/admin/bookings" class="inline-block mt-1.5 text-[10px] text-[#D94A3D] font-semibold hover:underline">Tugaskan →</router-link>
          </div>

          <!-- Klien Selesai Memilih -->
          <div v-if="s.client_selected > 0" class="card p-4 dark:bg-slate-900 dark:border-slate-800">
            <div class="flex items-center justify-between mb-0.5">
              <span class="text-[10px] font-semibold text-[#8A7A72]/80 dark:text-slate-400 uppercase tracking-wider">Klien Selesai Memilih</span>
              <span class="text-lg font-bold text-purple-600 dark:text-purple-400">{{ s.client_selected }}</span>
            </div>
            <p class="text-[10px] text-[#C4B0A5]">Perlu edit & upload foto final</p>
            <router-link to="/admin/deliverables" class="inline-block mt-1.5 text-[10px] text-[#D94A3D] font-semibold hover:underline">Proses →</router-link>
          </div>

          <div v-if="s.dp_uploaded > 0" class="card p-4 dark:bg-slate-900 dark:border-slate-800">
            <div class="flex items-center justify-between mb-0.5">
              <span class="text-[10px] font-semibold text-[#8A7A72]/80 dark:text-slate-400 uppercase tracking-wider">DP Uploaded</span>
              <span class="text-lg font-bold text-[#F4A261]">{{ s.dp_uploaded }}</span>
            </div>
            <p class="text-[10px] text-[#C4B0A5]">Perlu verifikasi</p>
            <router-link to="/admin/bookings" class="inline-block mt-1.5 text-[10px] text-[#D94A3D] font-medium hover:underline font-semibold">Cek →</router-link>
          </div>
          <div v-if="s.balance_uploaded > 0" class="card p-4 dark:bg-slate-900 dark:border-slate-800">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-semibold text-[#8A7A72]/80 dark:text-slate-400 uppercase tracking-wider">Pelunasan</span>
              <span class="text-lg font-bold text-[#D94A3D]">{{ s.balance_uploaded }}</span>
            </div>
            <p class="text-[10px] text-[#C4B0A5]">Perlu verifikasi</p>
            <router-link to="/admin/bookings" class="inline-block mt-1.5 text-[10px] text-[#D94A3D] font-medium hover:underline font-semibold">Cek →</router-link>
          </div>
          <div v-if="s.payout_pending > 0" class="card p-4 dark:bg-slate-900 dark:border-slate-800">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-semibold text-[#8A7A72]/80 dark:text-slate-400 uppercase tracking-wider">Payroll Pending</span>
              <span class="text-lg font-bold text-amber-500">{{ s.payout_pending }}</span>
            </div>
            <p class="text-[10px] text-[#C4B0A5]">Perlu transfer fee FG</p>
            <router-link to="/admin/payroll" class="inline-block mt-1.5 text-[10px] text-[#D94A3D] font-medium hover:underline font-semibold">Cek →</router-link>
          </div>
          <div v-if="s.assignments_pending > 0" class="card p-4 dark:bg-slate-900 dark:border-slate-800">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-semibold text-[#8A7A72]/80 dark:text-slate-400 uppercase tracking-wider">FG Pending</span>
              <span class="text-lg font-bold text-blue-500">{{ s.assignments_pending }}</span>
            </div>
            <p class="text-[10px] text-[#C4B0A5]">Penugasan fotografer aktif</p>
            <router-link to="/admin/bookings" class="inline-block mt-1.5 text-[10px] text-[#D94A3D] font-medium hover:underline font-semibold">Cek →</router-link>
          </div>
          <div v-if="s.bookings_cancelled > 0" class="card p-4 dark:bg-slate-900 dark:border-slate-800">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-semibold text-[#8A7A72]/80 dark:text-slate-400 uppercase tracking-wider">Cancelled</span>
              <span class="text-lg font-bold text-[#EF4444]">{{ s.bookings_cancelled }}</span>
            </div>
            <p class="text-[10px] text-[#C4B0A5]">Booking dibatalkan</p>
          </div>
          <div v-if="!s.dp_uploaded && !s.balance_uploaded && !s.payout_pending && !s.assignments_pending && !s.bookings_cancelled && !s.unassigned_bookings && !s.client_selected && !s.inquiries_new" class="card p-4 dark:bg-slate-900 dark:border-slate-800">
            <div class="flex items-center gap-2 text-[#D94A3D]">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <span class="text-xs font-semibold">Semua clear ✅</span>
            </div>
            <p class="text-[10px] text-[#C4B0A5] mt-0.5">No alert hari ini</p>
          </div>
        </div>
      </div>

      <!-- 🎬 Post Production & ☁️ Storage Google Drive (Side-by-Side Dual Box) -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <!-- Widget 1: Post Production -->
        <div class="card p-4 dark:bg-slate-900 dark:border-slate-800 shadow-sm space-y-3">
          <!-- Header -->
          <div class="flex items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-2.5">
            <div class="flex items-center gap-2">
              <span class="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs flex-shrink-0">🎬</span>
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="font-bold text-xs text-[#2D1B14] dark:text-slate-200">Post Production</h3>
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-semibold font-mono">
                  Total: {{ s.drive_upload_pipeline?.total_clients || 0 }} Klien
                </span>
              </div>
            </div>
            <router-link to="/admin/deliverables" class="text-[10px] font-bold text-sky-700 dark:text-sky-400 hover:underline flex items-center gap-0.5">
              <span>Buka Post Production</span> <span>→</span>
            </router-link>
          </div>

          <!-- 4-Row Breakdown Table (Clean & Compact) -->
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr class="text-left text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/80">
                  <th class="pb-2 font-semibold">Tahapan / Berkas</th>
                  <th class="pb-2 font-semibold text-right">Jumlah Klien</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                <!-- 1. Semua JPG -->
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                  <td class="py-2.5 font-bold text-[#2D1B14] dark:text-slate-200 flex items-center gap-2 whitespace-nowrap">
                    <span>📁</span> <span>1. Semua JPG</span>
                  </td>
                  <td class="py-2.5 text-right font-extrabold font-mono text-xs whitespace-nowrap">
                    <span class="px-2.5 py-0.5 rounded" :class="(s.drive_upload_pipeline?.jpg?.count || 0) > 0 ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'">
                      {{ s.drive_upload_pipeline?.jpg?.count || 0 }} Klien
                    </span>
                  </td>
                </tr>

                <!-- 2. Belum Memilih Foto -->
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                  <td class="py-2.5 font-bold text-[#2D1B14] dark:text-slate-200 flex items-center gap-2 whitespace-nowrap">
                    <span>⏳</span> <span>2. Belum Memilih Foto</span>
                  </td>
                  <td class="py-2.5 text-right font-extrabold font-mono text-xs whitespace-nowrap">
                    <span class="px-2.5 py-0.5 rounded" :class="(s.drive_upload_pipeline?.selection_pending?.count || 0) > 0 ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'">
                      {{ s.drive_upload_pipeline?.selection_pending?.count || 0 }} Klien
                    </span>
                  </td>
                </tr>

                <!-- 3. Highlight -->
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                  <td class="py-2.5 font-bold text-[#2D1B14] dark:text-slate-200 flex items-center gap-2 whitespace-nowrap">
                    <span>⭐</span> <span>3. Highlight</span>
                  </td>
                  <td class="py-2.5 text-right font-extrabold font-mono text-xs whitespace-nowrap">
                    <span class="px-2.5 py-0.5 rounded" :class="(s.drive_upload_pipeline?.highlight?.count || 0) > 0 ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'">
                      {{ s.drive_upload_pipeline?.highlight?.count || 0 }} Klien
                    </span>
                  </td>
                </tr>

                <!-- 4. Final Editing -->
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                  <td class="py-2.5 font-bold text-[#2D1B14] dark:text-slate-200 flex items-center gap-2 whitespace-nowrap">
                    <span>🎨</span> <span>4. Final Editing</span>
                  </td>
                  <td class="py-2.5 text-right font-extrabold font-mono text-xs whitespace-nowrap">
                    <span class="px-2.5 py-0.5 rounded" :class="(s.drive_upload_pipeline?.final_editing?.count || 0) > 0 ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'">
                      {{ s.drive_upload_pipeline?.final_editing?.count || 0 }} Klien
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Widget 2: Storage Google Drive -->
        <div class="card p-4 dark:bg-slate-900 dark:border-slate-800 shadow-sm space-y-3">
          <!-- Header -->
          <div class="flex items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-2.5">
            <div class="flex items-center gap-2">
              <span class="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs flex-shrink-0">☁️</span>
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="font-bold text-xs text-[#2D1B14] dark:text-slate-200">Storage Drive</h3>
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-semibold font-mono">
                  Total: {{ s.drive_storage_overview?.total_used_gb || '0.0' }} GB
                </span>
              </div>
            </div>
            <router-link to="/admin/settings" class="text-[10px] font-bold text-sky-700 dark:text-sky-400 hover:underline flex items-center gap-0.5">
              <span>Buka Storage</span> <span>→</span>
            </router-link>
          </div>

          <!-- 3-Row Breakdown Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr class="text-left text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/80">
                  <th class="pb-2 font-semibold">Folder</th>
                  <th class="pb-2 font-semibold text-center">Sub Folder</th>
                  <th class="pb-2 font-semibold text-right">Size</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                <!-- 1. Master Client -->
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                  <td class="py-2.5 font-bold text-[#2D1B14] dark:text-slate-200 flex items-center gap-2 whitespace-nowrap">
                    <span>📁</span> <span>1. Master Client</span>
                  </td>
                  <td class="py-2.5 text-center text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {{ s.drive_storage_overview?.master_client?.folder_count || 0 }} Folder Klien
                  </td>
                  <td class="py-2.5 text-right font-extrabold font-mono text-xs whitespace-nowrap">
                    <span class="px-2.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {{ s.drive_storage_overview?.master_client?.size_gb || '0.0' }} GB
                    </span>
                  </td>
                </tr>

                <!-- 2. Master Portofolio -->
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                  <td class="py-2.5 font-bold text-[#2D1B14] dark:text-slate-200 flex items-center gap-2 whitespace-nowrap">
                    <span>🖼️</span> <span>2. Master Portofolio</span>
                  </td>
                  <td class="py-2.5 text-center text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {{ s.drive_storage_overview?.master_portfolio?.folder_count || 0 }} Folder Portofolio
                  </td>
                  <td class="py-2.5 text-right font-extrabold font-mono text-xs whitespace-nowrap">
                    <span class="px-2.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {{ s.drive_storage_overview?.master_portfolio?.size_gb || '0.0' }} GB
                    </span>
                  </td>
                </tr>

                <!-- 3. Sampah Drive -->
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                  <td class="py-2.5 font-bold text-[#2D1B14] dark:text-slate-200 flex items-center gap-2 whitespace-nowrap">
                    <span>🗑️</span> <span>3. Sampah Drive</span>
                  </td>
                  <td class="py-2.5 text-center text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {{ s.drive_storage_overview?.drive_trash?.folder_count || 0 }} Folder Terhapus
                  </td>
                  <td class="py-2.5 text-right font-extrabold font-mono text-xs whitespace-nowrap">
                    <span class="px-2.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {{ s.drive_storage_overview?.drive_trash?.size_gb || '0.0' }} GB
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Today & Tomorrow Shoots Widget -->
      <div v-if="s.today_shoots && s.today_shoots.length" class="card p-5 mb-5 dark:bg-slate-900 dark:border-slate-800 shadow-sm">
        <h3 class="text-xs font-bold text-[#2D1B14] dark:text-slate-200 mb-3 flex items-center justify-between">
          <span class="flex items-center gap-2">
            <span class="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center text-[10px]">📸</span>
            Sesi Foto Hari Ini &amp; Besok (Spot Monitor)
          </span>
          <span class="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
            {{ s.today_shoots.length }} Sesi Aktif
          </span>
        </h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div v-for="st in s.today_shoots" :key="st.id"
            class="p-3.5 rounded-xl bg-[#FAF9F6] dark:bg-slate-950/60 border border-[#E8D5C8]/80 dark:border-slate-800 flex flex-col justify-between space-y-2 shadow-sm">
            <div class="space-y-1">
              <div class="flex items-center justify-between">
                <span class="text-[9px] font-bold px-2 py-0.5 rounded-md tracking-wider uppercase bg-emerald-100 text-emerald-800">
                  {{ formatDay(st.graduation_date) }} · {{ st.shooting_time || 'Jam TBA' }}
                </span>
                <span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-[#E8D5C8] dark:border-slate-700 text-[#D94A3D]">
                  #BKG-{{ st.id }}
                </span>
              </div>
              <h4 class="text-xs font-bold text-[#2D1B14] dark:text-slate-200 mt-1">{{ st.client_name }}</h4>
              <p class="text-[10px] text-[#8A7A72] dark:text-slate-400">
                🎓 {{ st.university || '-' }}
              </p>
              <p class="text-[10px] text-[#8A7A72] dark:text-slate-400">
                📍 {{ st.location || '-' }}
              </p>
            </div>
            
            <div class="pt-2 border-t border-[#E8D5C8]/40 dark:border-slate-800 flex items-center justify-between text-[10px]">
              <span class="text-[#8A7A72] dark:text-slate-400">FG: <strong class="text-[#2D1B14] dark:text-slate-200">{{ st.fg_name || 'Belum diassign' }}</strong></span>
              <router-link to="/admin/bookings" class="text-[9px] text-[#D94A3D] font-semibold hover:underline">Detail →</router-link>
            </div>
          </div>
        </div>
      </div>

      <!-- Reminders Alert Widget (Only shown if reminders exist) -->
      <div v-if="s.reminders && s.reminders.length" class="card p-5 mb-5 dark:bg-slate-900 dark:border-slate-800 shadow-sm">
        <h3 class="text-xs font-bold text-[#2D1B14] dark:text-slate-200 mb-3.5 flex items-center justify-between">
          <span class="flex items-center gap-2">
            <span class="w-5 h-5 rounded-md bg-[#FDECEA] flex items-center justify-center text-[10px]">⏰</span>
            Pengingat Sesi Foto (H-3 / H-1) - Perlu Chat WA
          </span>
          <span class="text-[10px] bg-[#FDECEA] text-[#D94A3D] px-2 py-0.5 rounded-full font-bold">
            {{ s.reminders.length }} Tindakan
          </span>
        </h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div v-for="r in s.reminders" :key="r.booking_id"
            class="p-4 rounded-xl bg-[#FAF9F6] dark:bg-slate-950/60 border border-[#E8D5C8] dark:border-slate-800 flex flex-col justify-between space-y-3 shadow-sm">
            <div class="space-y-1">
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-bold px-2 py-0.5 bg-[#FFF0E8] text-[#D94A3D] rounded-md tracking-wider">
                  {{ r.type_label }}
                </span>
                <span class="text-[9px] text-[#8A7A72]">
                  {{ formatDay(r.graduation_date) }}
                </span>
              </div>
              <h4 class="text-xs font-bold text-[#2D1B14] dark:text-slate-200 mt-1">{{ r.client_name }}</h4>
              <p class="text-[10px] text-[#8A7A72] dark:text-slate-400">
                🎓 {{ r.university }} · 🕒 {{ r.shooting_time }}
              </p>
              <p class="text-[10px] text-[#8A7A72] dark:text-slate-400">
                📍 {{ r.location }}
              </p>
              <p class="text-[10px] text-[#8A7A72] dark:text-slate-400 border-t border-[#E8D5C8]/40 dark:border-slate-800 pt-1 mt-1">
                📸 Fotografer: <strong class="text-[#2D1B14] dark:text-slate-200">{{ r.fg_name || '-' }}</strong> <span v-if="r.fg_phone && r.fg_phone !== '-'">({{ r.fg_phone }})</span>
              </p>
            </div>
            
            <div class="flex gap-2 border-t border-[#E8D5C8]/40 dark:border-slate-800 pt-2.5">
              <a v-if="r.wa_link_client" :href="r.wa_link_client" target="_blank"
                class="flex-1 py-1.5 px-3 bg-[#1A1A2E] text-[#C59B63] hover:bg-[#2A2A4E] transition rounded-lg text-[9px] font-bold text-center flex items-center justify-center gap-1 shadow-sm">
                📱 Chat WA Klien
              </a>
              <a v-if="r.wa_link_fg && r.fg_phone" :href="r.wa_link_fg" target="_blank"
                class="flex-1 py-1.5 px-3 bg-[#FAF9F6] border border-[#E8D5C8] text-[#8A7A72] hover:text-[#2D1B14] transition rounded-lg text-[9px] font-bold text-center flex items-center justify-center gap-1 shadow-sm">
                📸 Chat WA FG
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Google Drive Retention Alert Widget -->
      <div v-if="s.drive_retention_alerts && s.drive_retention_alerts.length" class="card p-5 mb-5 dark:bg-slate-900 dark:border-slate-800 shadow-sm">
        <h3 class="text-xs font-bold text-[#2D1B14] dark:text-slate-200 mb-3.5 flex items-center justify-between">
          <span class="flex items-center gap-2">
            <span class="w-5 h-5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-[10px]">⏳</span>
            Masa Simpan Google Drive Klien (Pengingat H-14 / H-3)
          </span>
          <span class="text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold">
            {{ s.drive_retention_alerts.length }} Klien Perlu Reminder
          </span>
        </h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div v-for="item in s.drive_retention_alerts" :key="item.id"
            class="p-3.5 rounded-xl bg-[#FAF9F6] dark:bg-slate-950/50 border border-[#E8D5C8]/80 dark:border-slate-800 flex flex-col justify-between space-y-2.5 shadow-sm">
            <div class="space-y-1">
              <div class="flex items-center justify-between">
                <span class="text-[9px] font-bold px-2 py-0.5 rounded-md tracking-wider uppercase"
                  :class="item.days_remaining <= 3 ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'">
                  {{ item.days_remaining <= 0 ? 'Expired Hari Ini' : item.days_remaining + ' Hari Lagi' }}
                </span>
                <span class="text-[9px] font-mono text-slate-500">
                  📁 {{ item.formatted_size }}
                </span>
              </div>
              <h4 class="text-xs font-bold text-[#2D1B14] dark:text-slate-200 mt-1">{{ item.client_name }}</h4>
              <p class="text-[10px] text-[#8A7A72] dark:text-slate-400">
                📅 Expired: <strong class="text-slate-700 dark:text-slate-300">{{ item.drive_expiry_date }}</strong>
              </p>
              <p class="text-[9px] text-slate-400 font-mono truncate">
                📧 {{ item.client_email || 'Email belum diisi' }}
              </p>
            </div>
            
            <div class="pt-2 border-t border-[#E8D5C8]/40 dark:border-slate-800/60 flex items-center gap-2">
              <a v-if="item.direct_wa_url" :href="item.direct_wa_url" target="_blank"
                class="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white transition rounded-lg text-[9px] font-bold text-center flex items-center justify-center gap-1 shadow-sm">
                💬 Direct WA Reminder
              </a>
              <a v-if="item.drive_parent_url" :href="item.drive_parent_url" target="_blank"
                class="py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition rounded-lg text-[9px] font-bold text-center">
                📂 Drive
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Row 2: Pipeline + University Trend -->
      <div class="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-5">
        <!-- Pipeline -->
        <div class="lg:col-span-3 card p-5 dark:bg-slate-900 dark:border-slate-800 shadow-sm">
          <h3 class="text-xs font-bold text-[#2D1B14] dark:text-slate-200 mb-4 flex items-center gap-2">
            <span class="w-5 h-5 rounded-md bg-[#FDECEA] flex items-center justify-center text-[10px]">📊</span>
            Pipeline Layanan Wisuda
          </h3>
          <div class="space-y-3.5">
            <div v-for="step in pipeline" :key="step.key">
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="font-medium text-[#8A7A72] dark:text-slate-400">{{ step.label }}</span>
                <div class="flex items-center gap-2">
                  <span class="font-bold text-[#2D1B14] dark:text-slate-200">{{ step.value }}</span>
                  <span class="text-[9px] text-[#C4B0A5] w-7 text-right">{{ step.pct }}%</span>
                </div>
              </div>
              <div class="h-2 bg-[#E8D5C8]/60 dark:bg-slate-800 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all duration-700" :style="{ width: step.pct+'%', background: step.color }"></div>
              </div>
            </div>
          </div>
          <div class="flex flex-wrap gap-x-4 gap-y-1 mt-4 pt-3 border-t border-[#E8D5C8] dark:border-slate-800 text-[10px] text-[#C4B0A5]">
            <span>Konversi: <strong class="text-[#2D1B14] dark:text-slate-200">{{ s.conversion_rate || 0 }}%</strong></span>
            <span>Sesi Selesai: <strong class="text-[#2D1B14] dark:text-slate-200">{{ s.post_prod_rate || 0 }}%</strong></span>
            <span>Completed: <strong class="text-[#2D1B14] dark:text-slate-200">{{ s.completion_rate || 0 }}%</strong></span>
          </div>
        </div>

        <!-- 🎓 Trend Universitas / Kampus Teramai -->
        <div class="lg:col-span-2 card p-5 dark:bg-slate-900 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-xs font-bold text-[#2D1B14] dark:text-slate-200 flex items-center gap-2">
                <span class="w-5 h-5 rounded-md bg-[#FDECEA] flex items-center justify-center text-[10px]">🎓</span>
                Trend Kampus Teramai
              </h3>
              <span class="text-[10px] text-[#8A7A72] dark:text-slate-400 font-bold">Top 5 Universitas</span>
            </div>

            <div v-if="s.university_distribution && s.university_distribution.length" class="space-y-3">
              <div v-for="u in s.university_distribution" :key="u.university" class="space-y-1">
                <div class="flex items-center justify-between text-xs">
                  <span class="font-medium text-[#2D1B14] dark:text-slate-300 truncate max-w-[170px]">{{ u.university }}</span>
                  <span class="font-bold text-xs text-[#D94A3D] dark:text-sky-400">{{ u.count }} Klien</span>
                </div>
                <div class="h-1.5 bg-[#E8D5C8]/50 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div class="h-full rounded-full bg-gradient-to-r from-amber-500 to-[#D94A3D]"
                    :style="{ width: Math.min(100, Math.round((u.count / (s.bookings_total || 1)) * 100)) + '%' }"></div>
                </div>
              </div>
            </div>
            <div v-else class="py-8 text-center text-slate-400 text-xs">
              Belum ada data persebaran universitas
            </div>
          </div>

          <div class="mt-4 pt-3 border-t border-[#E8D5C8]/80 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
            <span>Total Klien Terdaftar:</span>
            <strong class="text-slate-800 dark:text-slate-200 font-bold">{{ s.bookings_total || 0 }} Klien</strong>
          </div>
        </div>
      </div>

      <!-- Row 3: Activity + FG + Packages -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <!-- Activity -->
        <div class="card p-5 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-xs font-bold text-[#2D1B14] dark:text-slate-200 flex items-center gap-2">
                <span class="w-5 h-5 rounded-md bg-[#FFF0E8] dark:bg-slate-800 flex items-center justify-center text-[10px]">⚡</span>
                Aktivitas
              </h3>
              <span class="text-[9px] text-[#8A7A72] dark:text-slate-400 font-medium px-2 py-0.5 bg-[#FFF0E8] dark:bg-slate-800/80 rounded-full">
                8 Terbaru
              </span>
            </div>
            <div v-if="s.recent_activity && s.recent_activity.length" class="space-y-1 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin">
              <div v-for="(act, i) in s.recent_activity" :key="i"
                class="flex items-center gap-3 py-2.5 border-b border-[#E8D5C8]/60 dark:border-slate-800 last:border-0">
                <div class="w-2 h-2 rounded-full flex-shrink-0 mt-0.5"
                  :class="act.type.includes('booking') ? 'bg-[#F4A261]' : act.type === 'payment' ? 'bg-[#D94A3D]' : 'bg-[#C4B0A5]'">
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-medium text-[#2D1B14] dark:text-slate-200 truncate">{{ act.client_name }}</p>
                  <p class="text-[10px] text-[#8A7A72] dark:text-slate-400">{{ actionLabel(act) }}</p>
                </div>
                <span class="text-[9px] text-[#C4B0A5] dark:text-slate-500 whitespace-nowrap">{{ timeAgo(act.created_at) }}</span>
              </div>
            </div>
            <div v-else class="flex flex-col items-center justify-center py-8 text-[#C4B0A5]">
              <p class="text-xs">Belum ada aktivitas</p>
            </div>
          </div>
        </div>

        <!-- Top FG -->
        <div class="card p-5">
          <h3 class="text-xs font-bold text-[#2D1B14] mb-4 flex items-center justify-between">
            <span class="flex items-center gap-2">
              <span class="w-5 h-5 rounded-md bg-[#FDECEA] flex items-center justify-center text-[10px]">👥</span>
              Top FG
            </span>
            <span class="text-[9px] text-[#C4B0A5]">{{ s.fg_active }} aktif</span>
          </h3>
          <div v-if="s.top_fg && s.top_fg.length" class="space-y-2">
            <div v-for="(fg, i) in s.top_fg" :key="fg.id"
              class="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#FFF0E8] transition">
              <div class="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                :class="i === 0 ? 'bg-[#FDECEA] text-[#D94A3D]' : i === 1 ? 'bg-[#FFF0E8] text-[#F4A261]' : 'bg-[#FFF5F0] text-[#C4B0A5]'">
                {{ i + 1 }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-semibold text-[#2D1B14]">{{ fg.name }}</p>
                <p class="text-[10px] text-[#8A7A72]">{{ fg.completed }}/{{ fg.total_shoots }} selesai</p>
              </div>
              <span class="text-xs font-bold text-[#2D1B14]">{{ fg.total_shoots }}</span>
            </div>
          </div>
          <div v-else class="flex flex-col items-center justify-center py-8 text-[#C4B0A5]">
            <p class="text-xs">Belum ada data FG</p>
          </div>
          <router-link to="/admin/freelancers" class="block mt-3 text-center text-[10px] text-[#C4B0A5] hover:text-[#2D1B14] transition">Lihat semua FG →</router-link>
        </div>

        <!-- Package Popularity -->
        <div class="card p-5">
          <h3 class="text-xs font-bold text-[#2D1B14] mb-4 flex items-center gap-2">
            <span class="w-5 h-5 rounded-md bg-[#FDECEA] flex items-center justify-center text-[10px]">💰</span>
            Paket Populer
          </h3>
          <div v-if="s.package_popularity && s.package_popularity.length" class="space-y-3">
            <div v-for="pkg in s.package_popularity" :key="pkg.name" class="flex items-center justify-between">
              <span class="text-xs text-[#8A7A72]">{{ pkg.name }}</span>
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-[#2D1B14]">{{ pkg.total }}</span>
                <div class="w-16 h-1.5 bg-[#E8D5C8] rounded-full overflow-hidden">
                  <div class="h-full rounded-full" :style="{ width: maxPkg > 0 ? (pkg.total/maxPkg*100)+'%' : '0%', background: 'linear-gradient(90deg, #F4A261, #D94A3D)' }"></div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="flex flex-col items-center justify-center py-8 text-[#C4B0A5]">
            <p class="text-xs">Belum ada booking</p>
          </div>
          <div class="mt-4 pt-4 border-t border-[#E8D5C8] grid grid-cols-2 gap-3 text-[10px]">
            <div>
              <span class="text-[#C4B0A5]">Inquiry bulan ini</span>
              <p class="text-sm font-bold text-[#2D1B14] mt-0.5">{{ s.inquiries_this_month || 0 }}</p>
            </div>
            <div>
              <span class="text-[#C4B0A5]">Booking bulan ini</span>
              <p class="text-sm font-bold text-[#2D1B14] mt-0.5">{{ s.bookings_this_month || 0 }}</p>
            </div>
            <div>
              <span class="text-[#C4B0A5]">DP pending</span>
              <p class="text-sm font-bold text-[#2D1B14] mt-0.5">{{ s.dp_pending || 0 }}</p>
            </div>
            <div>
              <span class="text-[#C4B0A5]">Payout pending</span>
              <p class="text-sm font-bold text-[#2D1B14] mt-0.5">{{ s.payout_pending || 0 }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 📬 Recent Sent Emails Dispatch Log -->
      <div class="card p-5 mt-4 dark:bg-slate-900 dark:border-slate-800 shadow-sm">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <span class="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs">📬</span>
            <div>
              <h3 class="text-xs font-bold text-[#2D1B14] dark:text-slate-200">Riwayat Email Terkirim (Live Dispatch)</h3>
              <p class="text-[10px] text-slate-400">Log pengiriman invoice klien, surat tugas freelance, undangan seleksi, dan payroll</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-0.5 rounded-full font-bold">
              {{ (s.recent_sent_emails || []).length }} Terakhir
            </span>
            <router-link to="/admin/settings" class="text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:underline">
              Pengaturan SMTP →
            </router-link>
          </div>
        </div>

        <div v-if="s.recent_sent_emails && s.recent_sent_emails.length" class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-slate-200/80 dark:border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                <th class="pb-2 pl-1">Penerima &amp; Kontak</th>
                <th class="pb-2">Jenis Email</th>
                <th class="pb-2">Subjek Pesan</th>
                <th class="pb-2">Status</th>
                <th class="pb-2 pr-1 text-right">Waktu</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
              <tr v-for="em in s.recent_sent_emails" :key="em.id" class="hover:bg-slate-50/60 dark:hover:bg-slate-950/40 transition">
                <td class="py-2.5 pl-1">
                  <div class="font-bold text-[#2D1B14] dark:text-slate-200">{{ em.recipient_name || 'Penerima Email' }}</div>
                  <div class="text-[10px] text-slate-400 font-mono">{{ em.recipient_email }}</div>
                </td>
                <td class="py-2.5">
                  <span class="inline-flex px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {{ emailTemplateLabel(em.template_type) }}
                  </span>
                </td>
                <td class="py-2.5 max-w-[280px]">
                  <div class="text-slate-700 dark:text-slate-300 truncate" :title="em.subject">{{ em.subject }}</div>
                </td>
                <td class="py-2.5">
                  <span class="inline-flex items-center gap-1 text-[10px] font-bold" :class="em.status === 'sent' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
                    <span>{{ em.status === 'sent' ? '✓' : '✗' }}</span>
                    <span>{{ em.status === 'sent' ? 'Terkirim' : 'Gagal' }}</span>
                  </span>
                </td>
                <td class="py-2.5 pr-1 text-right whitespace-nowrap text-[10px] text-slate-400">
                  {{ timeAgo(em.created_at) || 'Baru saja' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="py-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
          <span class="text-2xl mb-1 opacity-60">📬</span>
          <span>Belum ada riwayat email transaksional yang tercatat</span>
        </div>
      </div>

      <!-- Monthly Revenue Performance Widget -->
      <div v-if="s.monthly_revenue && s.monthly_revenue.length" class="card p-5 mt-4">
        <h3 class="text-xs font-bold text-[#2D1B14] dark:text-slate-200 mb-4 flex items-center justify-between">
          <span class="flex items-center gap-2">
            <span class="w-5 h-5 rounded-md bg-[#FDECEA] dark:bg-amber-950/40 flex items-center justify-center text-[10px]">📈</span>
            Tren Pendapatan 6 Bulan Terakhir
          </span>
          <span class="text-[10px] text-[#C4B0A5] dark:text-slate-400">Total: {{ s.revenue_total }}</span>
        </h3>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div v-for="item in s.monthly_revenue" :key="item.month"
            class="p-3 rounded-xl bg-[#FAF9F6] dark:bg-slate-950/60 border border-[#E8D5C8]/60 dark:border-slate-800 flex flex-col justify-between space-y-2">
            <span class="text-[10px] font-semibold text-[#8A7A72] dark:text-slate-400">{{ formatMonthLabel(item.month) }}</span>
            <div class="space-y-1">
              <div class="h-1.5 w-full bg-[#E8D5C8]/40 dark:bg-slate-800 rounded-full overflow-hidden">
                <div class="h-full rounded-full bg-gradient-to-r from-[#C59B63] to-[#D94A3D]" :style="{ width: maxMonthRev > 0 ? Math.round(item.total / maxMonthRev * 100) + '%' : '0%' }"></div>
              </div>
              <p class="text-xs font-bold text-[#2D1B14] dark:text-slate-200 truncate">{{ formatPrice(item.total) }}</p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const API = '/api/admin'
const loading = ref(true)
const s = ref({})

const greeting = computed(() => {
  const h = new Date().getHours()
  return h < 12 ? 'Selamat pagi' : h < 18 ? 'Selamat siang' : 'Selamat malam'
})
const timeStr = computed(() => new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))

const maxMonthRev = computed(() => Math.max(...(s.value.monthly_revenue || []).map(r => r.total), 1))

function formatMonthLabel(mStr) {
  if (!mStr) return ''
  const [y, m] = mStr.split('-')
  const date = new Date(parseInt(y), parseInt(m) - 1, 1)
  return date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
}

function formatPrice(v) {
  if (!v) return 'Rp 0'
  if (typeof v === 'string' && v.startsWith('Rp')) return v
  const num = Number(String(v).replace(/[^0-9.-]+/g, ''))
  return isNaN(num) ? 'Rp 0' : 'Rp ' + num.toLocaleString('id-ID')
}

const pipeline = computed(() => {
  const inqTotal = s.value.inquiries_total || 0
  const clientActive = s.value.clients_active || 0
  const postProdTotal = s.value.post_production_total || s.value.drive_upload_pipeline?.total_clients || 0
  const completedTotal = s.value.bookings_completed || 0

  const totalAll = inqTotal + (s.value.bookings_total || 0)
  const baseScale = Math.max(totalAll, inqTotal, s.value.bookings_total || 0, 1)

  return [
    { 
      key: 'inquiry', 
      label: '1. Inquiry (Calon Klien)', 
      value: inqTotal, 
      pct: Math.min(100, Math.round((inqTotal / baseScale) * 100)), 
      color: 'linear-gradient(90deg, #F4A261, #E76F51)' 
    },
    { 
      key: 'client', 
      label: '2. Client (Produksi & Sesi Foto)', 
      value: clientActive, 
      pct: Math.min(100, Math.round((clientActive / baseScale) * 100)), 
      color: 'linear-gradient(90deg, #3B82F6, #2563EB)' 
    },
    { 
      key: 'post_production', 
      label: '3. Post Production (Seleksi & Edit)', 
      value: postProdTotal, 
      pct: Math.min(100, Math.round((postProdTotal / baseScale) * 100)), 
      color: 'linear-gradient(90deg, #8B5CF6, #7C3AED)' 
    },
    { 
      key: 'completed', 
      label: '4. Selesai (Completed)', 
      value: completedTotal, 
      pct: Math.min(100, Math.round((completedTotal / baseScale) * 100)), 
      color: 'linear-gradient(90deg, #10B981, #059669)' 
    },
  ]
})
const maxPkg = computed(() => Math.max(...(s.value.package_popularity || []).map(p => p.total), 0))

function formatDay(dateStr) {
  if (!dateStr) return '--'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}
function actionLabel(act) {
  if (act.type === 'booking_new') {
    const labels = { confirmed: 'Booking baru confirmed', shooting: 'Mulai shooting', delivered: 'Hasil dikirim', completed: 'Selesai' }
    return labels[act.status] || `Status: ${act.status}`
  }
  if (act.type === 'payment') {
    if (act.status === 'dp_paid') return 'DP dibayar ✓'
    if (act.status === 'balance_paid') return 'Pelunasan dibayar ✓'
    if (act.status === 'uploaded') return 'Bukti transfer diupload'
    return 'Pembayaran'
  }
  if (act.type === 'deliver') return 'Hasil fotografi dikirim'
  return act.status || ''
}
function timeAgo(dateStr) {
  if (!dateStr) return ''
  const ms = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m lalu`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}j lalu`
  const days = Math.floor(hours / 24)
  return `${days}h lalu`
}

function emailTemplateLabel(type) {
  const map = {
    'client_inquiry_received': 'Pendaftaran Masuk',
    'client_dp_invoice': 'Invoice DP 50%',
    'client_dp_verified': 'Verifikasi DP',
    'client_balance_invoice': 'Invoice Pelunasan',
    'client_balance_verified': 'Pelunasan Lunas',
    'client_photo_selection': 'Undangan Seleksi',
    'client_closing': 'Closing & Master Drive',
    'client_reminder_h3': 'Pengingat H-3',
    'client_reminder_h1': 'Pengingat H-1',
    'drive_retention': 'Retensi Drive',
    'fg_assignment': 'Surat Tugas FG',
    'fg_reminder_h3': 'Pengingat FG H-3',
    'fg_reminder_h1': 'Pengingat FG H-1',
    'fg_payroll': 'E-Slip Payroll FG',
    'fg_recruitment_approved': 'Kemitraan Disetujui',
    'fg_recruitment_rejected': 'Info Kemitraan',
    'smtp_test': 'Uji Coba SMTP'
  }
  return map[type] || type || 'Email Transaksional'
}

async function load() {
  try {
    const res = await fetch(`${API}/dashboard/stats`, { credentials: 'include' })
    s.value = await res.json()
  } catch {}
  loading.value = false
}
onMounted(load)
</script>
