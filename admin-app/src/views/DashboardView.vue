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
      <!-- Row 1: Revenue + Alerts -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <!-- Revenue -->
        <div class="lg:col-span-2 card overflow-hidden relative">
          <div class="absolute -top-20 -right-20 w-48 h-48 bg-[#F0784B]/8 rounded-full blur-3xl"></div>
          <div class="absolute -bottom-10 -left-10 w-32 h-32 bg-[#F4A261]/12 rounded-full blur-3xl"></div>
          <div class="relative z-10 p-6">
            <div class="flex items-center justify-between mb-1">
              <span class="text-[10px] font-semibold text-[#8A7A72]/70 uppercase tracking-widest">Pendapatan Bulan Ini</span>
              <span class="flex items-center gap-1 text-[10px] font-semibold status-chip"
                :class="s.revenue_trend > 0 ? 'bg-[#FDECEA] text-[#D94A3D]' : s.revenue_trend < 0 ? 'bg-[#FEF2F2] text-[#EF4444]' : 'bg-[#FFF0E8] text-[#C4B0A5]'">
                <svg v-if="s.revenue_trend > 0" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>
                <svg v-else class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg>
                {{ isNaN(s.revenue_trend) || s.revenue_trend == null ? 0 : Math.abs(s.revenue_trend) }}%
              </span>
            </div>
            <div class="text-4xl font-bold text-[#2D1B14] tracking-tight mt-1" v-html="s.revenue_this_month ? s.revenue_this_month.replace('Rp','').trim() : 'Rp 0'"></div>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-[#E8D5C8]/60 text-xs">
              <div>
                <span class="text-[#C4B0A5] text-[10px] block">Total Pendapatan</span>
                <span class="text-[#2D1B14] font-semibold" v-text="formatPrice(s.revenue_total)"></span>
              </div>
              <div>
                <span class="text-[#C4B0A5] text-[10px] block">Est. Sisa Pelunasan Klien</span>
                <span class="text-amber-600 font-bold" v-text="formatPrice(s.unpaid_balances_total)"></span>
              </div>
              <div>
                <span class="text-[#C4B0A5] text-[10px] block">Unpaid Fee FG (Payroll)</span>
                <span class="text-rose-600 font-bold" v-text="formatPrice(s.unpaid_fg_fees_total)"></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Alerts -->
        <div class="space-y-2.5">
          <!-- Inquiry Baru -->
          <div v-if="s.inquiries_new > 0" class="card p-4 border-l-4 border-l-emerald-500 dark:border-l-emerald-600">
            <div class="flex items-center justify-between mb-0.5">
              <span class="text-[10px] font-semibold text-[#8A7A72]/80 dark:text-slate-400 uppercase tracking-wider">Inquiry Baru</span>
              <span class="text-lg font-bold text-emerald-600 dark:text-emerald-400">{{ s.inquiries_new }}</span>
            </div>
            <p class="text-[10px] text-[#C4B0A5]">Perlu di-quote / follow up</p>
            <router-link to="/admin/inquiries" class="inline-block mt-1.5 text-[10px] text-[#D94A3D] font-semibold hover:underline">Follow Up →</router-link>
          </div>

          <!-- Booking Tanpa FG -->
          <div v-if="s.unassigned_bookings > 0" class="card p-4 border-l-4 border-l-rose-500 dark:border-l-rose-600">
            <div class="flex items-center justify-between mb-0.5">
              <span class="text-[10px] font-semibold text-[#8A7A72]/80 dark:text-slate-400 uppercase tracking-wider">Booking Tanpa FG</span>
              <span class="text-lg font-bold text-rose-600 dark:text-rose-400">{{ s.unassigned_bookings }}</span>
            </div>
            <p class="text-[10px] text-[#C4B0A5]">Perlu assign fotografer</p>
            <router-link to="/admin/bookings" class="inline-block mt-1.5 text-[10px] text-[#D94A3D] font-semibold hover:underline">Tugaskan →</router-link>
          </div>

          <!-- Klien Selesai Memilih -->
          <div v-if="s.client_selected > 0" class="card p-4 border-l-4 border-l-purple-500 dark:border-l-purple-600">
            <div class="flex items-center justify-between mb-0.5">
              <span class="text-[10px] font-semibold text-[#8A7A72]/80 dark:text-slate-400 uppercase tracking-wider">Klien Selesai Memilih</span>
              <span class="text-lg font-bold text-purple-600 dark:text-purple-400">{{ s.client_selected }}</span>
            </div>
            <p class="text-[10px] text-[#C4B0A5]">Perlu edit & upload foto final</p>
            <router-link to="/admin/deliverables" class="inline-block mt-1.5 text-[10px] text-[#D94A3D] font-semibold hover:underline">Proses →</router-link>
          </div>

          <div v-if="s.dp_uploaded > 0" class="card p-4 border-l-4 border-l-[#F4A261]">
            <div class="flex items-center justify-between mb-0.5">
              <span class="text-[10px] font-semibold text-[#8A7A72]/80 uppercase tracking-wider">DP Uploaded</span>
              <span class="text-lg font-bold text-[#F4A261]">{{ s.dp_uploaded }}</span>
            </div>
            <p class="text-[10px] text-[#C4B0A5]">Perlu verifikasi</p>
            <router-link to="/admin/bookings" class="inline-block mt-1.5 text-[10px] text-[#D94A3D] font-medium hover:underline font-semibold">Cek →</router-link>
          </div>
          <div v-if="s.balance_uploaded > 0" class="card p-4 border-l-4 border-l-[#D94A3D]">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-semibold text-[#8A7A72]/80 uppercase tracking-wider">Pelunasan</span>
              <span class="text-lg font-bold text-[#D94A3D]">{{ s.balance_uploaded }}</span>
            </div>
            <p class="text-[10px] text-[#C4B0A5]">Perlu verifikasi</p>
            <router-link to="/admin/bookings" class="inline-block mt-1.5 text-[10px] text-[#D94A3D] font-medium hover:underline font-semibold">Cek →</router-link>
          </div>
          <div v-if="s.payout_pending > 0" class="card p-4 border-l-4 border-l-amber-500">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-semibold text-[#8A7A72]/80 uppercase tracking-wider">Payroll Pending</span>
              <span class="text-lg font-bold text-amber-500">{{ s.payout_pending }}</span>
            </div>
            <p class="text-[10px] text-[#C4B0A5]">Perlu transfer fee FG</p>
            <router-link to="/admin/payroll" class="inline-block mt-1.5 text-[10px] text-[#D94A3D] font-medium hover:underline font-semibold">Cek →</router-link>
          </div>
          <div v-if="s.assignments_pending > 0" class="card p-4 border-l-4 border-l-blue-500">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-semibold text-[#8A7A72]/80 uppercase tracking-wider">FG Pending</span>
              <span class="text-lg font-bold text-blue-500">{{ s.assignments_pending }}</span>
            </div>
            <p class="text-[10px] text-[#C4B0A5]">Penugasan fotografer aktif</p>
            <router-link to="/admin/bookings" class="inline-block mt-1.5 text-[10px] text-[#D94A3D] font-medium hover:underline font-semibold">Cek →</router-link>
          </div>
          <div v-if="s.bookings_cancelled > 0" class="card p-4 border-l-4 border-l-[#EF4444]">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-semibold text-[#8A7A72]/80 uppercase tracking-wider">Cancelled</span>
              <span class="text-lg font-bold text-[#EF4444]">{{ s.bookings_cancelled }}</span>
            </div>
            <p class="text-[10px] text-[#C4B0A5]">Booking dibatalkan</p>
          </div>
          <div v-if="!s.dp_uploaded && !s.balance_uploaded && !s.payout_pending && !s.assignments_pending && !s.bookings_cancelled && !s.unassigned_bookings && !s.client_selected && !s.inquiries_new" class="card p-4 border-l-4 border-l-[#D94A3D]">
            <div class="flex items-center gap-2 text-[#D94A3D]">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <span class="text-xs font-semibold">Semua clear ✅</span>
            </div>
            <p class="text-[10px] text-[#C4B0A5] mt-0.5">No alert hari ini</p>
          </div>
        </div>
      </div>

      <!-- Today & Tomorrow Shoots Widget -->
      <div v-if="s.today_shoots && s.today_shoots.length" class="card p-5 mb-5 border-l-4 border-l-emerald-500">
        <h3 class="text-xs font-bold text-[#2D1B14] dark:text-slate-200 mb-3 flex items-center justify-between">
          <span class="flex items-center gap-2">
            <span class="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center text-[10px]">📸</span>
            Sesi Foto Hari Ini & Besok (Spot Monitor)
          </span>
          <span class="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
            {{ s.today_shoots.length }} Sesi Aktif
          </span>
        </h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div v-for="st in s.today_shoots" :key="st.id"
            class="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#E8D5C8]/80 flex flex-col justify-between space-y-2 shadow-sm">
            <div class="space-y-1">
              <div class="flex items-center justify-between">
                <span class="text-[9px] font-bold px-2 py-0.5 rounded-md tracking-wider uppercase bg-emerald-100 text-emerald-800">
                  {{ formatDay(st.graduation_date) }} · {{ st.shooting_time || 'Jam TBA' }}
                </span>
                <span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white border border-[#E8D5C8] text-[#D94A3D]">
                  #BKG-{{ st.id }}
                </span>
              </div>
              <h4 class="text-xs font-bold text-[#2D1B14] mt-1">{{ st.client_name }}</h4>
              <p class="text-[10px] text-[#8A7A72]">
                🎓 {{ st.university || '-' }}
              </p>
              <p class="text-[10px] text-[#8A7A72]">
                📍 {{ st.location || '-' }}
              </p>
            </div>
            
            <div class="pt-2 border-t border-[#E8D5C8]/40 flex items-center justify-between text-[10px]">
              <span class="text-[#8A7A72]">FG: <strong class="text-[#2D1B14]">{{ st.fg_name || 'Belum diassign' }}</strong></span>
              <router-link to="/admin/bookings" class="text-[9px] text-[#D94A3D] font-semibold hover:underline">Detail →</router-link>
            </div>
          </div>
        </div>
      </div>

      <!-- Reminders Alert Widget (Only shown if reminders exist) -->
      <div v-if="s.reminders && s.reminders.length" class="card p-5 mb-5 border-l-4 border-l-[#D94A3D]">
        <h3 class="text-xs font-bold text-[#2D1B14] mb-3.5 flex items-center justify-between">
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
            class="p-4 rounded-xl bg-[#FAF9F6] border border-[#E8D5C8] flex flex-col justify-between space-y-3 shadow-sm">
            <div class="space-y-1">
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-bold px-2 py-0.5 bg-[#FFF0E8] text-[#D94A3D] rounded-md tracking-wider">
                  {{ r.type_label }}
                </span>
                <span class="text-[9px] text-[#8A7A72]">
                  {{ formatDay(r.graduation_date) }}
                </span>
              </div>
              <h4 class="text-xs font-bold text-[#2D1B14] mt-1">{{ r.client_name }}</h4>
              <p class="text-[10px] text-[#8A7A72]">
                🎓 {{ r.university }} · 🕒 {{ r.shooting_time }}
              </p>
              <p class="text-[10px] text-[#8A7A72]">
                📍 {{ r.location }}
              </p>
              <p class="text-[10px] text-[#8A7A72] border-t border-[#E8D5C8]/40 pt-1 mt-1">
                📸 Fotografer: <strong class="text-[#2D1B14]">{{ r.fg_name }}</strong> ({{ r.fg_phone || '-' }})
              </p>
            </div>
            
            <div class="flex gap-2 border-t border-[#E8D5C8]/40 pt-2.5">
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
      <div v-if="s.drive_retention_alerts && s.drive_retention_alerts.length" class="card p-5 mb-5 border-l-4 border-l-amber-500 dark:border-l-amber-400">
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

      <!-- Row 2: Pipeline + Upcoming -->
      <div class="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-5">
        <!-- Pipeline -->
        <div class="lg:col-span-3 card p-5">
          <h3 class="text-xs font-bold text-[#2D1B14] mb-4 flex items-center gap-2">
            <span class="w-5 h-5 rounded-md bg-[#FDECEA] flex items-center justify-center text-[10px]">📊</span>
            Pipeline
          </h3>
          <div class="space-y-3.5">
            <div v-for="step in pipeline" :key="step.key">
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="font-medium text-[#8A7A72]">{{ step.label }}</span>
                <div class="flex items-center gap-2">
                  <span class="font-bold text-[#2D1B14]">{{ step.value }}</span>
                  <span class="text-[9px] text-[#C4B0A5] w-7 text-right">{{ step.pct }}%</span>
                </div>
              </div>
              <div class="h-2 bg-[#E8D5C8]/60 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all duration-700" :style="{ width: step.pct+'%', background: step.color }"></div>
              </div>
            </div>
          </div>
          <div class="flex flex-wrap gap-x-4 gap-y-1 mt-4 pt-3 border-t border-[#E8D5C8] text-[10px] text-[#C4B0A5]">
            <span>Conversion: <strong class="text-[#2D1B14]">{{ s.conversion_rate }}%</strong></span>
            <span>Shooting: <strong class="text-[#2D1B14]">{{ s.shooting_rate }}%</strong></span>
            <span>Delivered: <strong class="text-[#2D1B14]">{{ s.delivery_rate }}%</strong></span>
            <span>Completed: <strong class="text-[#2D1B14]">{{ s.completion_rate }}%</strong></span>
          </div>
        </div>

        <!-- Upcoming -->
        <div class="lg:col-span-2 card p-5">
          <h3 class="text-xs font-bold text-[#2D1B14] mb-4 flex items-center justify-between">
            <span class="flex items-center gap-2">
              <span class="w-5 h-5 rounded-md bg-[#FDECEA] flex items-center justify-center text-[10px]">📅</span>
              Jadwal Shooting
            </span>
            <span class="text-[9px] text-[#C4B0A5]">{{ s.this_week_shoots }} minggu ini · {{ s.next_week_shoots }} pekan depan</span>
          </h3>
          <div v-if="s.upcoming_shoots && s.upcoming_shoots.length" class="space-y-2">
            <div v-for="shoot in s.upcoming_shoots" :key="shoot.id"
              class="flex items-center gap-3 p-3 rounded-xl bg-[#FFF0E8] border border-[#E8D5C8] hover:border-[#F4A261]/50 transition cursor-pointer"
              @click="$router.push('/admin/bookings')">
              <div class="w-9 h-9 rounded-xl bg-white border border-[#E8D5C8] flex items-center justify-center text-[10px] font-bold text-[#D94A3D] flex-shrink-0">
                {{ formatDay(shoot.shooting_time) }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-semibold text-[#2D1B14] truncate">{{ shoot.client_name }}</p>
                <p class="text-[10px] text-[#8A7A72] truncate">
                  {{ shoot.location || '—' }}
                  <span v-if="shoot.fg_name" class="ml-1 px-1 py-0.5 bg-[#FDECEA] rounded text-[9px] text-[#D94A3D]">{{ shoot.fg_name }}</span>
                </p>
              </div>
              <span class="text-[9px] font-semibold status-chip rounded-lg"
                :class="shoot.status === 'shooting' ? 'bg-[#FDECEA] text-[#D94A3D]' : 'bg-[#FFF0E8] text-[#F4A261]'">
                {{ shoot.status === 'shooting' ? 'Shooting' : 'Confirmed' }}
              </span>
            </div>
          </div>
          <div v-else class="flex flex-col items-center justify-center py-8 text-[#C4B0A5]">
            <span class="text-3xl mb-2 opacity-50">📅</span>
            <p class="text-xs">Belum ada jadwal shooting</p>
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
  return v ? 'Rp ' + Number(v).toLocaleString('id-ID') : 'Rp 0'
}

const pipeline = computed(() => {
  const hasInquiries = (s.value.inquiries_total || 0) > 0
  const total = s.value.inquiries_total || 1
  const bTotal = s.value.bookings_total || 1
  return [
    { key: 'inquiry', label: 'Inquiry', value: s.value.inquiries_total || 0, pct: hasInquiries ? 100 : 0, color: 'linear-gradient(90deg, #F4A261, #D94A3D)' },
    { key: 'booked', label: 'Booking', value: s.value.bookings_total || 0, pct: hasInquiries ? Math.min(100, Math.round((s.value.bookings_total / total) * 100)) : 0, color: 'linear-gradient(90deg, #D94A3D, #C0392B)' },
    { key: 'shooting', label: 'Shooting', value: s.value.bookings_shooting || 0, pct: Math.min(100, Math.round((s.value.bookings_shooting / bTotal) * 100)), color: 'linear-gradient(90deg, #F4A261, #E07A3A)' },
    { key: 'delivered', label: 'Delivered', value: s.value.bookings_delivered || 0, pct: Math.min(100, Math.round((s.value.bookings_delivered / bTotal) * 100)), color: 'linear-gradient(90deg, #E8D5C8, #D94A3D)' },
    { key: 'completed', label: 'Completed', value: s.value.bookings_completed || 0, pct: Math.min(100, Math.round((s.value.bookings_completed / bTotal) * 100)), color: 'linear-gradient(90deg, #D94A3D, #F4A261)' },
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
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}j`
  const days = Math.floor(hours / 24)
  return `${days}h`
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
