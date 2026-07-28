<template>
  <!-- Full-screen self-contained monitoring dashboard -->
  <div class="fixed inset-0 z-[45] flex flex-col bg-[#FFF8F3] dark:bg-slate-950 text-slate-800 dark:text-slate-100 overflow-hidden">

    <!-- ═══════════ HEADER ═══════════ -->
    <header class="flex items-center justify-between px-3 md:px-5 h-13 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-[#E8D5C8] dark:border-slate-800 flex-shrink-0">
      <!-- Left: Logo + Title -->
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-[#111E36] to-[#C5A880] flex items-center justify-center shadow-sm">
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
        </div>
        <div>
          <h1 class="text-sm font-bold text-[#2D1B14] dark:text-slate-200 tracking-tight leading-tight">Studio Monitor</h1>
          <p class="text-[8px] md:text-[9px] text-[#C4B0A5] dark:text-slate-500 leading-tight">Read-only · Auto-refresh</p>
        </div>
      </div>

      <!-- Right: Controls -->
      <div class="flex items-center gap-1.5 md:gap-2">
        <!-- Auto-refresh pill -->
        <span class="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-full text-[8px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          30s
        </span>
        <!-- Clock -->
        <span class="text-[10px] md:text-xs font-mono text-[#8A7A72] dark:text-slate-400 tabular-nums hidden sm:block">{{ clock }}</span>
        <!-- Manual refresh -->
        <button @click="loadAll()" class="monitor-btn" :class="{ 'animate-spin-slow': refreshing }" title="Refresh sekarang">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0115.36-4.36M20 15a9 9 0 01-15.36 4.36"/></svg>
        </button>
        <!-- Back to Admin -->
        <a href="/admin" class="monitor-btn" title="Kembali ke Admin">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        </a>
        <!-- Theme toggle -->
        <button @click="toggleTheme()" class="monitor-btn" title="Toggle theme">
          <svg v-if="!isDark" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
          <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
        </button>
        <!-- Logout -->
        <button @click="doLogout()" class="monitor-btn text-[#C4B0A5] hover:!text-[#D94A3D] dark:hover:!text-red-400" title="Logout">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
        </button>
      </div>
    </header>

    <!-- ═══════════ LOADING ═══════════ -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div class="loading-spinner mx-auto mb-3" style="width:32px;height:32px;border-width:3px"></div>
        <p class="text-xs text-[#8A7A72] dark:text-slate-400 animate-pulse">Memuat data monitor...</p>
      </div>
    </div>

    <!-- ═══════════ MAIN CONTENT ═══════════ -->
    <div v-else class="flex-1 flex flex-col overflow-hidden">

      <!-- ── Summary Cards ── -->
      <div class="grid grid-cols-3 gap-2 md:gap-3 p-3 md:px-5 md:py-3 flex-shrink-0">
        <div v-for="s in summaryCards" :key="s.key"
          class="rounded-2xl p-2.5 md:p-4 border cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97]"
          :class="[s.bg, activeTab === s.key ? 'ring-2 ring-offset-1 dark:ring-offset-slate-950 ' + s.ring : '']"
          @click="setTab(s.key)">
          <p class="text-[8px] md:text-[10px] font-bold uppercase tracking-widest" :class="s.labelColor">{{ s.label }}</p>
          <p class="text-xl md:text-4xl lg:text-5xl font-black mt-0.5 md:mt-1 tabular-nums" :class="s.numColor">{{ s.count }}</p>
          <p class="text-[8px] md:text-[10px] mt-0.5" :class="s.subColor">{{ s.sub }}</p>
        </div>
      </div>

      <!-- ── MOBILE: Tab Navigation ── -->
      <div class="flex md:hidden border-b border-[#E8D5C8] dark:border-slate-800 px-3 flex-shrink-0 bg-white/50 dark:bg-slate-900/50">
        <button v-for="t in tabs" :key="t.key" @click="activeTab = t.key"
          class="flex-1 py-2 text-center text-[10px] font-bold transition-all border-b-2"
          :class="activeTab === t.key
            ? 'border-[#D94A3D] text-[#D94A3D] dark:border-amber-400 dark:text-amber-400'
            : 'border-transparent text-[#C4B0A5] dark:text-slate-500 hover:text-[#8A7A72]'">
          {{ t.icon }} {{ t.label }}
        </button>
      </div>

      <!-- ── DESKTOP: 3 Columns ── -->
      <div class="hidden md:grid md:grid-cols-3 flex-1 overflow-hidden">
        <!-- Inquiry Column -->
        <div class="flex flex-col border-r border-[#E8D5C8]/60 dark:border-slate-800/60 overflow-hidden">
          <div class="px-4 py-2 bg-amber-50/60 dark:bg-amber-950/10 border-b border-[#E8D5C8]/60 dark:border-slate-800/60 flex-shrink-0 flex items-center justify-between">
            <p class="text-[11px] font-bold text-amber-800 dark:text-amber-400">📬 Inquiry</p>
            <span class="text-[9px] text-amber-600/70 dark:text-amber-500/60 font-medium">{{ inquiries.length }} total</span>
          </div>
          <div class="flex-1 overflow-y-auto p-2 space-y-1.5 monitor-scroll">
            <div v-if="inquiries.length === 0" class="flex flex-col items-center justify-center py-12 text-[#C4B0A5] dark:text-slate-600">
              <span class="text-2xl mb-1">📭</span>
              <span class="text-[10px]">Belum ada inquiry</span>
            </div>
            <div v-for="item in inquiries" :key="'inq-'+item.id" @click="openDetail(item, 'inquiry')"
              class="monitor-card group hover:border-amber-300 dark:hover:border-amber-700">
              <div class="flex items-center justify-between gap-1">
                <div class="flex items-center gap-2 min-w-0">
                  <div class="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center text-[10px] font-bold text-amber-700 dark:text-amber-400 flex-shrink-0">{{ (item.client_name||'?')[0] }}</div>
                  <div class="min-w-0">
                    <p class="text-[11px] font-semibold text-[#2D1B14] dark:text-slate-200 truncate">{{ item.client_name }}</p>
                    <p class="text-[9px] text-[#C4B0A5] dark:text-slate-500 truncate">{{ item.university || '-' }}</p>
                  </div>
                </div>
                <span class="status-chip text-[7px] ml-1 flex-shrink-0" :class="inqStatusClass(item.status)">{{ inqStatusLabel(item.status) }}</span>
              </div>
              <div class="flex items-center justify-between mt-1.5 text-[8px] text-[#8A7A72] dark:text-slate-500">
                <span>📅 {{ item.graduation_date || '-' }}</span>
                <span v-if="item.location" class="truncate max-w-[80px]">📍 {{ item.location }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Client Column -->
        <div class="flex flex-col border-r border-[#E8D5C8]/60 dark:border-slate-800/60 overflow-hidden">
          <div class="px-4 py-2 bg-emerald-50/60 dark:bg-emerald-950/10 border-b border-[#E8D5C8]/60 dark:border-slate-800/60 flex-shrink-0 flex items-center justify-between">
            <p class="text-[11px] font-bold text-emerald-800 dark:text-emerald-400">📅 Client</p>
            <span class="text-[9px] text-emerald-600/70 dark:text-emerald-500/60 font-medium">{{ bookings.length }} total</span>
          </div>
          <div class="flex-1 overflow-y-auto p-2 space-y-1.5 monitor-scroll">
            <div v-if="bookings.length === 0" class="flex flex-col items-center justify-center py-12 text-[#C4B0A5] dark:text-slate-600">
              <span class="text-2xl mb-1">📋</span>
              <span class="text-[10px]">Belum ada client</span>
            </div>
            <div v-for="item in bookings" :key="'bk-'+item.id" @click="openDetail(item, 'client')"
              class="monitor-card group hover:border-emerald-300 dark:hover:border-emerald-700">
              <div class="flex items-center justify-between gap-1">
                <div class="flex items-center gap-2 min-w-0">
                  <div class="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex-shrink-0">{{ (item.client_name||'?')[0] }}</div>
                  <div class="min-w-0">
                    <p class="text-[11px] font-semibold text-[#2D1B14] dark:text-slate-200 truncate">{{ item.client_name }}</p>
                    <p class="text-[9px] text-[#C4B0A5] dark:text-slate-500 truncate">{{ item.university || '-' }}</p>
                  </div>
                </div>
                <span class="status-chip text-[7px] ml-1 flex-shrink-0" :class="bookingStatusClass(item.status)">{{ getBookingStatusLabel(item) }}</span>
              </div>
              <div class="flex items-center justify-between mt-1.5 text-[8px] text-[#8A7A72] dark:text-slate-500">
                <span>📅 {{ item.graduation_date || '-' }}</span>
                <span class="status-chip text-[7px] px-1.5 py-0" :class="paymentChipClass(item)">{{ getPaymentLabel(item) }}</span>
              </div>
              <div v-if="item.fg_name" class="mt-1 text-[8px] text-[#8A7A72] dark:text-slate-500">
                📸 {{ item.fg_name }}
              </div>
            </div>
          </div>
        </div>

        <!-- Post-Pro Column -->
        <div class="flex flex-col overflow-hidden">
          <div class="px-4 py-2 bg-violet-50/60 dark:bg-violet-950/10 border-b border-[#E8D5C8]/60 dark:border-slate-800/60 flex-shrink-0 flex items-center justify-between">
            <p class="text-[11px] font-bold text-violet-800 dark:text-violet-400">🎬 Post Production</p>
            <span class="text-[9px] text-violet-600/70 dark:text-violet-500/60 font-medium">{{ deliverables.length }} total</span>
          </div>
          <div class="flex-1 overflow-y-auto p-2 space-y-1.5 monitor-scroll">
            <div v-if="deliverables.length === 0" class="flex flex-col items-center justify-center py-12 text-[#C4B0A5] dark:text-slate-600">
              <span class="text-2xl mb-1">🎞️</span>
              <span class="text-[10px]">Belum ada post-pro</span>
            </div>
            <div v-for="item in deliverables" :key="'pp-'+(item.booking_id||item.id)" @click="openDetail(item, 'postpro')"
              class="monitor-card group hover:border-violet-300 dark:hover:border-violet-700">
              <div class="flex items-center justify-between gap-1">
                <div class="flex items-center gap-2 min-w-0">
                  <div class="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-950/30 flex items-center justify-center text-[10px] font-bold text-violet-700 dark:text-violet-400 flex-shrink-0">{{ (item.client_name||'?')[0] }}</div>
                  <div class="min-w-0">
                    <p class="text-[11px] font-semibold text-[#2D1B14] dark:text-slate-200 truncate">{{ item.client_name || '-' }}</p>
                    <p class="text-[9px] text-[#C4B0A5] dark:text-slate-500 truncate">{{ item.university || '-' }}</p>
                  </div>
                </div>
                <span class="status-chip text-[7px] ml-1 flex-shrink-0" :class="ppChipClass(item.pp_status)">{{ ppShortLabel(item.pp_status) }}</span>
              </div>
              <div class="flex items-center justify-between mt-1.5 text-[8px] text-[#8A7A72] dark:text-slate-500">
                <span v-if="item.fg_name">📸 {{ item.fg_name }}</span>
                <span v-else class="text-amber-500 dark:text-amber-400">⏳ Belum ada FG</span>
                <span v-if="item.balance_status === 'paid'" class="text-emerald-600 dark:text-emerald-400 font-bold text-[7px]">✓ Lunas</span>
                <span v-else class="text-amber-600 dark:text-amber-400 text-[7px]">Belum Lunas</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── MOBILE: Active Tab Content ── -->
      <div class="flex-1 md:hidden overflow-y-auto p-3 space-y-2 monitor-scroll">
        <!-- Inquiry Tab -->
        <template v-if="activeTab === 'inquiry'">
          <div v-if="inquiries.length === 0" class="flex flex-col items-center justify-center py-16 text-[#C4B0A5] dark:text-slate-600">
            <span class="text-3xl mb-2">📭</span>
            <span class="text-xs">Belum ada inquiry</span>
          </div>
          <div v-for="item in inquiries" :key="'m-inq-'+item.id" @click="openDetail(item, 'inquiry')"
            class="monitor-card-mobile group">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center text-xs font-bold text-amber-700 dark:text-amber-400 flex-shrink-0">{{ (item.client_name||'?')[0] }}</div>
                <div class="min-w-0">
                  <p class="text-xs font-semibold text-[#2D1B14] dark:text-slate-200 truncate">{{ item.client_name }}</p>
                  <p class="text-[10px] text-[#C4B0A5] dark:text-slate-500 truncate">{{ item.university || '-' }}</p>
                </div>
              </div>
              <span class="status-chip text-[8px] flex-shrink-0" :class="inqStatusClass(item.status)">{{ inqStatusLabel(item.status) }}</span>
            </div>
            <div class="flex items-center justify-between mt-2 text-[9px] text-[#8A7A72] dark:text-slate-500">
              <span>📅 {{ item.graduation_date || '-' }}</span>
              <span v-if="item.location">📍 {{ item.location }}</span>
            </div>
          </div>
        </template>

        <!-- Client Tab -->
        <template v-if="activeTab === 'client'">
          <div v-if="bookings.length === 0" class="flex flex-col items-center justify-center py-16 text-[#C4B0A5] dark:text-slate-600">
            <span class="text-3xl mb-2">📋</span>
            <span class="text-xs">Belum ada client</span>
          </div>
          <div v-for="item in bookings" :key="'m-bk-'+item.id" @click="openDetail(item, 'client')"
            class="monitor-card-mobile group">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center text-xs font-bold text-emerald-700 dark:text-emerald-400 flex-shrink-0">{{ (item.client_name||'?')[0] }}</div>
                <div class="min-w-0">
                  <p class="text-xs font-semibold text-[#2D1B14] dark:text-slate-200 truncate">{{ item.client_name }}</p>
                  <p class="text-[10px] text-[#C4B0A5] dark:text-slate-500 truncate">{{ item.university || '-' }}</p>
                </div>
              </div>
              <span class="status-chip text-[8px] flex-shrink-0" :class="bookingStatusClass(item.status)">{{ getBookingStatusLabel(item) }}</span>
            </div>
            <div class="flex items-center justify-between mt-2 text-[9px] text-[#8A7A72] dark:text-slate-500">
              <span>📅 {{ item.graduation_date || '-' }}</span>
              <span class="status-chip text-[8px] px-1.5 py-0" :class="paymentChipClass(item)">{{ getPaymentLabel(item) }}</span>
            </div>
            <div v-if="item.fg_name || item.package_name" class="flex items-center justify-between mt-1 text-[9px] text-[#8A7A72] dark:text-slate-500">
              <span v-if="item.package_name">📦 {{ item.package_name }}</span>
              <span v-if="item.fg_name">📸 {{ item.fg_name }}</span>
            </div>
          </div>
        </template>

        <!-- Post-Pro Tab -->
        <template v-if="activeTab === 'postpro'">
          <div v-if="deliverables.length === 0" class="flex flex-col items-center justify-center py-16 text-[#C4B0A5] dark:text-slate-600">
            <span class="text-3xl mb-2">🎞️</span>
            <span class="text-xs">Belum ada post-production</span>
          </div>
          <div v-for="item in deliverables" :key="'m-pp-'+(item.booking_id||item.id)" @click="openDetail(item, 'postpro')"
            class="monitor-card-mobile group">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950/30 flex items-center justify-center text-xs font-bold text-violet-700 dark:text-violet-400 flex-shrink-0">{{ (item.client_name||'?')[0] }}</div>
                <div class="min-w-0">
                  <p class="text-xs font-semibold text-[#2D1B14] dark:text-slate-200 truncate">{{ item.client_name || '-' }}</p>
                  <p class="text-[10px] text-[#C4B0A5] dark:text-slate-500 truncate">{{ item.university || '-' }}</p>
                </div>
              </div>
              <span class="status-chip text-[8px] flex-shrink-0" :class="ppChipClass(item.pp_status)">{{ ppShortLabel(item.pp_status) }}</span>
            </div>
            <div class="flex items-center justify-between mt-2 text-[9px] text-[#8A7A72] dark:text-slate-500">
              <span v-if="item.fg_name">📸 {{ item.fg_name }}</span>
              <span v-else class="text-amber-500">⏳ Belum ada FG</span>
              <span v-if="item.balance_status === 'paid'" class="text-emerald-600 dark:text-emerald-400 font-bold">✓ Lunas</span>
              <span v-else class="text-amber-600 dark:text-amber-400">Belum Lunas</span>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- ═══════════ BOTTOM SHEET (Detail) ═══════════ -->
    <teleport to="body">
      <div v-if="selectedItem" class="fixed inset-0 z-[60]" @keydown.escape="selectedItem = null">
        <!-- Overlay -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" @click="selectedItem = null"></div>
        <!-- Sheet -->
        <div class="absolute bottom-0 left-0 right-0 max-h-[75vh] bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl overflow-hidden animate-slide-up">
          <!-- Handle -->
          <div class="flex justify-center pt-3 pb-1 cursor-pointer" @click="selectedItem = null">
            <div class="w-10 h-1 rounded-full bg-[#E8D5C8] dark:bg-slate-700"></div>
          </div>

          <div class="overflow-y-auto max-h-[calc(75vh-20px)] px-5 pb-8">
            <!-- Header -->
            <div class="flex items-center gap-3 mb-4">
              <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold flex-shrink-0"
                :class="selectedType === 'inquiry' ? 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
                  : selectedType === 'client' ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                  : 'bg-violet-100 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400'">
                {{ (selectedItem.client_name||'?')[0] }}
              </div>
              <div class="min-w-0">
                <h3 class="text-base font-bold text-[#2D1B14] dark:text-slate-200 truncate">{{ selectedItem.client_name }}</h3>
                <p class="text-[11px] text-[#8A7A72] dark:text-slate-400">{{ selectedItem.university || '-' }}</p>
              </div>
            </div>

            <!-- Info Grid -->
            <div class="grid grid-cols-2 gap-2 mb-4">
              <div v-if="selectedItem.client_phone" class="detail-info-box">
                <span class="detail-label">📱 Telepon</span>
                <span class="detail-value">{{ selectedItem.client_phone }}</span>
              </div>
              <div v-if="selectedItem.graduation_date" class="detail-info-box">
                <span class="detail-label">📅 Tanggal</span>
                <span class="detail-value">{{ selectedItem.graduation_date }}</span>
              </div>
              <div v-if="selectedItem.location" class="detail-info-box">
                <span class="detail-label">📍 Lokasi</span>
                <span class="detail-value">{{ selectedItem.location }}</span>
              </div>
              <div v-if="selectedItem.package_name" class="detail-info-box">
                <span class="detail-label">📦 Paket</span>
                <span class="detail-value">{{ selectedItem.package_name }}</span>
              </div>
              <div v-if="selectedItem.shooting_time" class="detail-info-box">
                <span class="detail-label">🕐 Jam Foto</span>
                <span class="detail-value">{{ selectedItem.shooting_time }} · {{ selectedItem.duration_hours || 2 }} Jam</span>
              </div>
              <div v-if="selectedItem.fg_name" class="detail-info-box">
                <span class="detail-label">📸 Fotografer</span>
                <span class="detail-value">{{ selectedItem.fg_name }}</span>
              </div>
              <div v-if="selectedItem.quoted_price" class="detail-info-box">
                <span class="detail-label">💰 Harga</span>
                <span class="detail-value">{{ formatRp(selectedItem.quoted_price) }}</span>
              </div>
            </div>

            <!-- ── Inquiry Detail ── -->
            <template v-if="selectedType === 'inquiry'">
              <div class="mb-3">
                <span class="text-[10px] font-bold text-[#8A7A72] dark:text-slate-500 uppercase tracking-wider">Status</span>
                <div class="mt-1">
                  <span class="status-chip text-[9px]" :class="inqStatusClass(selectedItem.status)">{{ inqStatusLabel(selectedItem.status) }}</span>
                </div>
              </div>
              <div v-if="selectedItem.notes" class="mb-3">
                <span class="text-[10px] font-bold text-[#8A7A72] dark:text-slate-500 uppercase tracking-wider">Catatan</span>
                <p class="mt-1 text-xs text-[#2D1B14] dark:text-slate-300 bg-[#FFF8F3] dark:bg-slate-800 rounded-xl p-3">{{ selectedItem.notes }}</p>
              </div>
            </template>

            <!-- ── Client/Booking Detail ── -->
            <template v-if="selectedType === 'client'">
              <div class="mb-3">
                <span class="text-[10px] font-bold text-[#8A7A72] dark:text-slate-500 uppercase tracking-wider mb-2 block">Progress</span>
                <div class="space-y-1.5">
                  <div class="progress-row" :class="progressDp(selectedItem).color">
                    <span class="text-sm">{{ progressDp(selectedItem).icon }}</span>
                    <span class="text-[11px]">{{ progressDp(selectedItem).text }}</span>
                  </div>
                  <div class="progress-row" :class="progressFg(selectedItem).color">
                    <span class="text-sm">{{ progressFg(selectedItem).icon }}</span>
                    <span class="text-[11px]">{{ progressFg(selectedItem).text }}</span>
                  </div>
                  <div class="progress-row" :class="progressShooting(selectedItem).color">
                    <span class="text-sm">{{ progressShooting(selectedItem).icon }}</span>
                    <span class="text-[11px]">{{ progressShooting(selectedItem).text }}</span>
                  </div>
                  <div class="progress-row" :class="progressBalance(selectedItem).color">
                    <span class="text-sm">{{ progressBalance(selectedItem).icon }}</span>
                    <span class="text-[11px]">{{ progressBalance(selectedItem).text }}</span>
                  </div>
                  <div class="progress-row" :class="progressComplete(selectedItem).color">
                    <span class="text-sm">{{ progressComplete(selectedItem).icon }}</span>
                    <span class="text-[11px]">{{ progressComplete(selectedItem).text }}</span>
                  </div>
                </div>
              </div>
            </template>

            <!-- ── Post-Pro Detail ── -->
            <template v-if="selectedType === 'postpro'">
              <div class="mb-3">
                <span class="text-[10px] font-bold text-[#8A7A72] dark:text-slate-500 uppercase tracking-wider mb-2 block">Tahap Post-Production</span>
                <div class="space-y-1.5">
                  <div v-for="step in ppProgress(selectedItem)" :key="step.label" class="progress-row" :class="step.color">
                    <span class="text-sm">{{ step.icon }}</span>
                    <span class="text-[11px]">{{ step.label }}</span>
                  </div>
                </div>
              </div>
              <div v-if="selectedItem.delivery_type" class="mb-3">
                <span class="text-[10px] font-bold text-[#8A7A72] dark:text-slate-500 uppercase tracking-wider">Pengiriman</span>
                <p class="mt-1 text-xs text-[#2D1B14] dark:text-slate-300">
                  {{ selectedItem.delivery_type === 'link' ? '🔗 Via Google Drive' : selectedItem.delivery_type === 'fisik' ? '📦 Fisik' : '⏳ Belum ditentukan' }}
                </p>
              </div>
            </template>
          </div>
        </div>
      </div>
    </teleport>

    <!-- ═══════════ FOOTER (Desktop) ═══════════ -->
    <footer class="hidden md:flex items-center justify-between px-5 h-9 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border-t border-[#E8D5C8]/60 dark:border-slate-800/60 flex-shrink-0">
      <span class="text-[9px] text-[#8A7A72] dark:text-slate-500 font-medium">
        📬 {{ inquiries.length }} Inquiry · 📅 {{ bookings.length }} Client · 🎬 {{ deliverables.length }} Post-Pro
      </span>
      <span class="text-[9px] text-[#C4B0A5] dark:text-slate-600 tabular-nums">
        Terakhir: {{ lastRefreshTime }} · {{ clock }}
      </span>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'

const API = '/api/admin'
const auth = useAuthStore()

// ═══ State ═══
const loading = ref(true)
const refreshing = ref(false)
const inquiries = ref([])
const bookings = ref([])
const deliverables = ref([])
const activeTab = ref('inquiry')
const selectedItem = ref(null)
const selectedType = ref('')
const clock = ref('')
const lastRefreshTime = ref('')
const isDark = ref(false)

// ═══ Tabs Config ═══
const tabs = [
  { key: 'inquiry', label: 'Inquiry', icon: '📬' },
  { key: 'client', label: 'Client', icon: '📅' },
  { key: 'postpro', label: 'Post-Pro', icon: '🎬' }
]

// ═══ Summary Cards Config ═══
const summaryCards = computed(() => [
  {
    key: 'inquiry',
    label: 'Inquiry',
    count: inquiries.value.length,
    sub: `${inquiryNewCount.value} baru masuk`,
    bg: 'bg-gradient-to-br from-amber-50 to-orange-50/80 dark:from-amber-950/30 dark:to-orange-950/20 border-amber-200/60 dark:border-amber-800/40',
    ring: 'ring-amber-400 dark:ring-amber-600',
    labelColor: 'text-amber-700 dark:text-amber-400',
    numColor: 'text-amber-800 dark:text-amber-300',
    subColor: 'text-amber-600/60 dark:text-amber-500/60'
  },
  {
    key: 'client',
    label: 'Client',
    count: bookings.value.length,
    sub: `${bookingActiveCount.value} aktif`,
    bg: 'bg-gradient-to-br from-emerald-50 to-teal-50/80 dark:from-emerald-950/30 dark:to-teal-950/20 border-emerald-200/60 dark:border-emerald-800/40',
    ring: 'ring-emerald-400 dark:ring-emerald-600',
    labelColor: 'text-emerald-700 dark:text-emerald-400',
    numColor: 'text-emerald-800 dark:text-emerald-300',
    subColor: 'text-emerald-600/60 dark:text-emerald-500/60'
  },
  {
    key: 'postpro',
    label: 'Post-Pro',
    count: deliverables.value.length,
    sub: `${ppPendingCount.value} dalam proses`,
    bg: 'bg-gradient-to-br from-violet-50 to-purple-50/80 dark:from-violet-950/30 dark:to-purple-950/20 border-violet-200/60 dark:border-violet-800/40',
    ring: 'ring-violet-400 dark:ring-violet-600',
    labelColor: 'text-violet-700 dark:text-violet-400',
    numColor: 'text-violet-800 dark:text-violet-300',
    subColor: 'text-violet-600/60 dark:text-violet-500/60'
  }
])

// ═══ Computed Counts ═══
const inquiryNewCount = computed(() => inquiries.value.filter(i => i.status === 'new').length)
const bookingActiveCount = computed(() => bookings.value.filter(b => !['completed', 'cancelled'].includes(b.status)).length)
const ppPendingCount = computed(() => deliverables.value.filter(d => d.pp_status !== 'Terkirim ke Client (Final)').length)

// ═══ API Load Functions ═══
async function loadInquiries() {
  try {
    const res = await fetch(`${API}/inquiries?limit=100`, { credentials: 'include' })
    if (res.ok) {
      const result = await res.json()
      inquiries.value = result.data || []
    }
  } catch (e) {
    console.error('[Monitor] Error loading inquiries:', e)
  }
}

async function loadBookings() {
  try {
    const res = await fetch(`${API}/bookings?limit=100`, { credentials: 'include' })
    if (res.ok) {
      const result = await res.json()
      bookings.value = result.data || []
    }
  } catch (e) {
    console.error('[Monitor] Error loading bookings:', e)
  }
}

async function loadDeliverables() {
  try {
    const res = await fetch(`${API}/deliverables`, { credentials: 'include' })
    if (res.ok) {
      const result = await res.json()
      deliverables.value = result.data || []
    }
  } catch (e) {
    console.error('[Monitor] Error loading deliverables:', e)
  }
}

async function loadAll(silent = false) {
  if (!silent) loading.value = true
  refreshing.value = true
  await Promise.all([loadInquiries(), loadBookings(), loadDeliverables()])
  refreshing.value = false
  if (!silent) loading.value = false
  updateLastRefresh()
}

// ═══ Status Helpers — Inquiry ═══
function inqStatusLabel(s) {
  const map = {
    new: 'Baru',
    quoted: 'Penawaran',
    converted: 'Booking',
    expired: 'Expired',
    lost: 'Tidak Jadi',
    archived: 'Arsip'
  }
  return map[s] || s
}

function inqStatusClass(s) {
  const map = {
    new: 'bg-[#FDECEA] text-[#D94A3D] dark:bg-red-950/20 dark:text-red-400',
    quoted: 'bg-[#EBF5FF] text-[#1E40AF] dark:bg-blue-950/20 dark:text-blue-400',
    converted: 'bg-[#E8F5E9] text-[#2E7D32] dark:bg-green-950/20 dark:text-green-400',
    expired: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
    lost: 'bg-[#FEF2F2] text-[#EF4444] dark:bg-red-950/20 dark:text-red-400',
    archived: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
  }
  return map[s] || 'bg-slate-100 text-slate-500'
}

// ═══ Status Helpers — Booking ═══
function bookingStatusClass(s) {
  const map = {
    pending: 'bg-[#FFF7ED] text-[#C2410C] dark:bg-amber-950/20 dark:text-amber-500',
    confirmed: 'bg-[#EDF2EB] text-[#2E7D32] dark:bg-green-950/20 dark:text-green-400',
    shooting: 'bg-[#FFF7ED] text-[#C2410C] dark:bg-amber-950/20 dark:text-amber-500',
    editing: 'bg-[#EFF6FF] text-[#1E40AF] dark:bg-blue-950/20 dark:text-blue-400',
    delivered: 'bg-[#EDF2EB] text-[#2E7D32] dark:bg-green-950/20 dark:text-green-400',
    completed: 'bg-[#D1E8CF] text-[#4A7A4A] dark:bg-green-900/20 dark:text-green-400',
    cancelled: 'bg-[#FEF2F2] text-[#EF4444] dark:bg-red-950/20 dark:text-red-400'
  }
  return map[s] || 'bg-slate-100 text-slate-500'
}

function getBookingStatusLabel(item) {
  if (item.dp_status === 'uploaded') return 'Verifikasi DP'
  if (item.balance_status === 'uploaded') return 'Verifikasi Lunas'
  if (item.status === 'pending') return 'Menunggu DP'
  if (item.status === 'confirmed') {
    if (!item.fg_name) return 'Belum Assign FG'
    if (item.assignment_status === 'assigned') return 'FG Ditugaskan'
    if (item.assignment_status === 'confirmed') return 'FG Siap'
    return 'Confirmed'
  }
  if (item.status === 'shooting') return 'Sesi Foto'
  if (item.status === 'editing') return 'Post-Pro'
  if (item.status === 'delivered') return 'Terkirim'
  if (item.status === 'completed') return 'Selesai'
  if (item.status === 'cancelled') return 'Batal'
  return item.status
}

function getPaymentLabel(item) {
  if (item.dp_status === 'refunded' || item.balance_status === 'refunded') return 'Refunded'
  if (item.dp_status === 'paid' && item.balance_status === 'paid') return '✓ Lunas'
  if (item.balance_status === 'uploaded') return 'Konfirm Lunas'
  if (item.dp_status === 'paid' && item.balance_status === 'unpaid') return 'DP 50%'
  if (item.dp_status === 'uploaded') return 'Konfirm DP'
  return 'Belum Bayar'
}

function paymentChipClass(item) {
  const label = getPaymentLabel(item)
  if (label === '✓ Lunas') return 'bg-emerald-50 text-emerald-700 dark:bg-green-950/20 dark:text-green-400 border border-emerald-200 dark:border-green-900 font-bold'
  if (label.startsWith('Konfirm')) return 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200 dark:border-amber-800 animate-pulse'
  if (label === 'DP 50%') return 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
  if (label === 'Refunded') return 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 border border-red-200 dark:border-red-900'
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
}

// ═══ Status Helpers — Post-Pro ═══
function ppChipClass(s) {
  if (s === 'Terkirim ke Client (Final)') return 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400 border border-green-200 font-bold'
  if (s === 'Highlight Siap') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200'
  if (s === 'Proses Edit Highlight') return 'bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 border border-purple-200'
  if (s === 'Menunggu Pilihan Client') return 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-200'
  if (s === 'Proses Import Staging') return 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 animate-pulse'
  if (s === 'Menunggu Staging Upload') return 'bg-sky-50 text-sky-700 dark:bg-sky-950/20 dark:text-sky-400 border border-sky-200'
  if (s === 'Menunggu File dari FG') return 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 animate-pulse'
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
}

function ppShortLabel(s) {
  if (!s) return '-'
  if (s === 'Terkirim ke Client (Final)') return 'Final ✓'
  if (s === 'Menunggu File dari FG') return 'Tunggu FG'
  if (s === 'Menunggu Staging Upload') return 'Upload'
  if (s === 'Proses Import Staging') return 'Import'
  if (s === 'Menunggu Pilihan Client') return 'Seleksi'
  if (s === 'Proses Edit Highlight') return 'Editing'
  if (s === 'Highlight Siap') return 'Highlight ✓'
  return s.length > 15 ? s.slice(0, 15) + '…' : s
}

// ═══ Progress Helpers — Client Detail ═══
function progressDp(item) {
  if (item.dp_status === 'paid') return { icon: '✅', text: 'DP Terverifikasi', color: 'text-emerald-700 dark:text-emerald-400' }
  if (item.dp_status === 'uploaded') return { icon: '🔄', text: 'Menunggu Verifikasi DP', color: 'text-amber-600 dark:text-amber-400' }
  return { icon: '⬜', text: 'Belum Bayar DP', color: 'text-slate-400 dark:text-slate-500' }
}

function progressFg(item) {
  if (item.assignment_status === 'confirmed') return { icon: '✅', text: `FG Siap: ${item.fg_name}`, color: 'text-emerald-700 dark:text-emerald-400' }
  if (item.fg_name) return { icon: '🔄', text: `FG Ditugaskan: ${item.fg_name}`, color: 'text-amber-600 dark:text-amber-400' }
  return { icon: '⬜', text: 'Belum Assign FG', color: 'text-slate-400 dark:text-slate-500' }
}

function progressShooting(item) {
  if (['editing', 'delivered', 'completed'].includes(item.status)) return { icon: '✅', text: 'Sesi Foto Selesai', color: 'text-emerald-700 dark:text-emerald-400' }
  if (item.status === 'shooting') return { icon: '🔄', text: 'Sesi Foto Berlangsung', color: 'text-amber-600 dark:text-amber-400' }
  return { icon: '⬜', text: 'Belum Mulai Sesi Foto', color: 'text-slate-400 dark:text-slate-500' }
}

function progressBalance(item) {
  if (item.balance_status === 'paid') return { icon: '✅', text: 'Pelunasan Terverifikasi', color: 'text-emerald-700 dark:text-emerald-400' }
  if (item.balance_status === 'uploaded') return { icon: '🔄', text: 'Menunggu Verifikasi Pelunasan', color: 'text-amber-600 dark:text-amber-400' }
  return { icon: '⬜', text: 'Belum Bayar Pelunasan', color: 'text-slate-400 dark:text-slate-500' }
}

function progressComplete(item) {
  if (item.status === 'completed') return { icon: '✅', text: 'Selesai', color: 'text-emerald-700 dark:text-emerald-400' }
  if (item.status === 'delivered') return { icon: '🔄', text: 'Hasil Foto Terkirim', color: 'text-amber-600 dark:text-amber-400' }
  if (item.status === 'cancelled') return { icon: '❌', text: 'Dibatalkan', color: 'text-red-500 dark:text-red-400' }
  return { icon: '⬜', text: 'Belum Selesai', color: 'text-slate-400 dark:text-slate-500' }
}

// ═══ Progress Helpers — Post-Pro Detail ═══
function ppProgress(item) {
  const stages = [
    { label: 'File dari FG', key: 0 },
    { label: 'Staging Upload', key: 1 },
    { label: 'Seleksi Client', key: 2 },
    { label: 'Edit Highlight', key: 3 },
    { label: 'Kirim ke Client', key: 4 }
  ]
  const statusMap = {
    'Menunggu File dari FG': 0,
    'Menunggu Staging Upload': 1,
    'Proses Import Staging': 1,
    'Menunggu Pilihan Client': 2,
    'Proses Edit Highlight': 3,
    'Highlight Siap': 4,
    'Terkirim ke Client (Final)': 5
  }
  const current = statusMap[item.pp_status] ?? 0
  return stages.map(s => {
    if (s.key < current) return { ...s, icon: '✅', color: 'text-emerald-700 dark:text-emerald-400' }
    if (s.key === current) return { ...s, icon: '🔄', color: 'text-amber-600 dark:text-amber-400' }
    return { ...s, icon: '⬜', color: 'text-slate-400 dark:text-slate-500' }
  })
}

// ═══ Utility ═══
function formatRp(n) {
  if (!n) return '-'
  return 'Rp ' + Number(n).toLocaleString('id-ID')
}

function openDetail(item, type) {
  selectedItem.value = item
  selectedType.value = type
}

function setTab(t) {
  activeTab.value = t
}

function updateClock() {
  const now = new Date()
  clock.value = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function updateLastRefresh() {
  const now = new Date()
  lastRefreshTime.value = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function toggleTheme() {
  isDark.value = !isDark.value
  if (isDark.value) {
    document.documentElement.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', 'light')
  }
}

function doLogout() {
  auth.logout()
}

// ═══ Lifecycle ═══
let refreshTimer, clockTimer, keepAliveTimer

onMounted(() => {
  // Init theme from current state
  isDark.value = document.documentElement.classList.contains('dark')

  // Load all data
  loadAll()

  // Start clock (update every second)
  updateClock()
  clockTimer = setInterval(updateClock, 1000)

  // Auto-refresh every 30 seconds
  refreshTimer = setInterval(() => loadAll(true), 30000)

  // Keep session alive — prevent idle auto-logout on unattended monitor
  // Dispatches a synthetic event so auth store's idle watcher resets
  keepAliveTimer = setInterval(() => {
    document.dispatchEvent(new Event('mousemove'))
  }, 60000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
  if (clockTimer) clearInterval(clockTimer)
  if (keepAliveTimer) clearInterval(keepAliveTimer)
})
</script>

<style scoped>
/* ═══ Monitor-specific styles ═══ */

.monitor-btn {
  @apply w-7 h-7 md:w-8 md:h-8 rounded-xl flex items-center justify-center
         border border-[#E8D5C8] dark:border-slate-800
         bg-white dark:bg-slate-900
         text-[#8A7A72] dark:text-slate-400
         hover:text-[#D4AF37] dark:hover:text-amber-400
         hover:bg-[#FFF0E8] dark:hover:bg-slate-800
         transition-all duration-200;
}

.monitor-card {
  @apply rounded-xl p-2.5 bg-white dark:bg-slate-900
         border border-[#E8D5C8]/50 dark:border-slate-800/60
         hover:shadow-md transition-all duration-200 cursor-pointer;
}

.monitor-card-mobile {
  @apply rounded-2xl p-3.5 bg-white dark:bg-slate-900
         border border-[#E8D5C8]/60 dark:border-slate-800
         active:scale-[0.98] transition-all duration-200 cursor-pointer
         shadow-sm;
}

.monitor-scroll {
  scrollbar-width: thin;
  scrollbar-color: #E8D5C8 transparent;
}
.monitor-scroll::-webkit-scrollbar {
  width: 4px;
}
.monitor-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.monitor-scroll::-webkit-scrollbar-thumb {
  background: #E8D5C8;
  border-radius: 999px;
}
:is(.dark) .monitor-scroll {
  scrollbar-color: #334155 transparent;
}
:is(.dark) .monitor-scroll::-webkit-scrollbar-thumb {
  background: #334155;
}

.detail-info-box {
  @apply bg-[#FFF8F3] dark:bg-slate-800/60 rounded-xl p-2.5 flex flex-col gap-0.5;
}
.detail-label {
  @apply text-[9px] font-semibold text-[#8A7A72] dark:text-slate-500 uppercase tracking-wider;
}
.detail-value {
  @apply text-[11px] font-medium text-[#2D1B14] dark:text-slate-200;
}

.progress-row {
  @apply flex items-center gap-2 py-1.5 px-3 rounded-xl bg-[#FFF8F3] dark:bg-slate-800/40 font-medium;
}

/* Animations */
@keyframes slide-up {
  from { transform: translateY(100%); opacity: 0.8; }
  to { transform: translateY(0); opacity: 1; }
}
.animate-slide-up {
  animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
.animate-fade-in {
  animation: fade-in 0.2s ease-out;
}

.animate-spin-slow {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

.h-13 { height: 3.25rem; }
</style>
