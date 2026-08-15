<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-2">
      <h2 class="text-xl font-bold text-[#2D1B14] dark:text-slate-200 tracking-tight">Laporan Keuangan & Analisis</h2>
    </div>

    <!-- Tab bar -->
    <div class="flex gap-1 border-b border-[#E8D5C8]/80 dark:border-slate-800 mb-6 overflow-x-auto">
      <button v-for="t in tabs" :key="t.key"
        @click="activeTab = t.key"
        class="px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition border-b-2 -mb-[1px]"
        :class="activeTab === t.key ? 'text-[#D94A3D] border-[#D94A3D] dark:text-amber-400 dark:border-amber-400' : 'text-[#8A7A72] border-transparent hover:text-[#2D1B14] dark:hover:text-slate-300'">
        {{ t.label }}
      </button>
    </div>

    <!-- ============ TAB: RINGKASAN ============ -->
    <div v-if="activeTab === 'summary'" class="space-y-6 animate-fade-in">
      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-20">
        <div class="loading-spinner animate-spin"></div>
      </div>

      <div v-else class="space-y-6">
        <!-- Keuangan Summary Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="card p-5 dark:bg-slate-900 dark:border-slate-800">
            <span class="text-[9px] uppercase tracking-wider text-[#C4B0A5] dark:text-slate-500 font-bold block">Total Omzet Booking</span>
            <p class="text-xl font-black text-[#D94A3D] dark:text-amber-400 mt-1.5">{{ summary.revenueLabel }}</p>
            <span class="text-[10px] text-[#8A7A72] dark:text-slate-400 mt-1 block">Semua booking terkonfirmasi DP</span>
          </div>

          <div class="card p-5 dark:bg-slate-900 dark:border-slate-800">
            <span class="text-[9px] uppercase tracking-wider text-[#C4B0A5] dark:text-slate-500 font-bold block">DP Masuk (50%)</span>
            <p class="text-xl font-black text-[#2D1B14] dark:text-slate-200 mt-1.5">{{ summary.total_dp_paid_label }}</p>
            <span class="text-[10px] text-[#8A7A72] dark:text-slate-400 mt-1 block">Akumulasi uang muka</span>
          </div>

          <div class="card p-5 dark:bg-slate-900 dark:border-slate-800">
            <span class="text-[9px] uppercase tracking-wider text-[#C4B0A5] dark:text-slate-500 font-bold block">Pelunasan Masuk</span>
            <p class="text-xl font-black text-[#2D1B14] dark:text-slate-200 mt-1.5">{{ summary.total_balance_paid_label }}</p>
            <span class="text-[10px] text-[#8A7A72] dark:text-slate-400 mt-1 block">Pembayaran pelunasan terverifikasi</span>
          </div>

          <div class="card p-5 dark:bg-slate-900 dark:border-slate-800">
            <span class="text-[9px] uppercase tracking-wider text-[#C4B0A5] dark:text-slate-500 font-bold block">Sisa Piutang Client</span>
            <p class="text-xl font-black text-amber-600 dark:text-amber-400 mt-1.5">{{ summary.total_receivables_label }}</p>
            <span class="text-[10px] text-[#8A7A72] dark:text-slate-400 mt-1 block">Pelunasan tertunda/belum lunas</span>
          </div>
        </div>

        <!-- Beban & Konversi Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div class="card p-5 dark:bg-slate-900 dark:border-slate-800">
            <span class="text-[9px] uppercase tracking-wider text-[#C4B0A5] dark:text-slate-500 font-bold block">Payroll Freelancer Terbayar</span>
            <p class="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5">{{ summary.total_fg_payout_paid_label }}</p>
            <span class="text-[10px] text-[#8A7A72] dark:text-slate-400 mt-1 block">Dana terklaim & dibayarkan</span>
          </div>

          <div class="card p-5 dark:bg-slate-900 dark:border-slate-800">
            <span class="text-[9px] uppercase tracking-wider text-[#C4B0A5] dark:text-slate-500 font-bold block">Hutang Payroll Freelancer</span>
            <p class="text-xl font-black text-rose-500 dark:text-rose-400 mt-1.5">{{ summary.total_fg_payout_pending_label }}</p>
            <span class="text-[10px] text-[#8A7A72] dark:text-slate-400 mt-1 block">Fee belum diklaim / belum dibayar</span>
          </div>

          <div class="card p-5 dark:bg-slate-900 dark:border-slate-800">
            <span class="text-[9px] uppercase tracking-wider text-[#C4B0A5] dark:text-slate-500 font-bold block">Rasio Konversi Lead</span>
            <p class="text-xl font-black text-blue-600 dark:text-blue-400 mt-1.5">{{ summary.conversionRate }}%</p>
            <span class="text-[10px] text-[#8A7A72] dark:text-slate-400 mt-1 block">{{ summary.totalInquiries }} leads → {{ summary.booked }} booking</span>
          </div>
        </div>

        <!-- Volume Sesi -->
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
          <div class="card p-4 dark:bg-slate-900 dark:border-slate-800 text-center">
            <span class="text-lg block">📞</span>
            <span class="text-lg font-bold text-[#2D1B14] dark:text-slate-200 mt-1 block">{{ summary.totalInquiries }}</span>
            <span class="text-[10px] text-[#8A7A72] dark:text-slate-500 uppercase tracking-wider font-semibold">Total Inquiries</span>
          </div>
          <div class="card p-4 dark:bg-slate-900 dark:border-slate-800 text-center">
            <span class="text-lg block">📋</span>
            <span class="text-lg font-bold text-[#2D1B14] dark:text-slate-200 mt-1 block">{{ summary.quoted }}</span>
            <span class="text-[10px] text-[#8A7A72] dark:text-slate-500 uppercase tracking-wider font-semibold">Link Booking Terkirim</span>
          </div>
          <div class="card p-4 dark:bg-slate-900 dark:border-slate-800 text-center">
            <span class="text-lg block">🤝</span>
            <span class="text-lg font-bold text-[#2D1B14] dark:text-slate-200 mt-1 block">{{ summary.booked }}</span>
            <span class="text-[10px] text-[#8A7A72] dark:text-slate-500 uppercase tracking-wider font-semibold">Booked / DP Paid</span>
          </div>
          <div class="card p-4 dark:bg-slate-900 dark:border-slate-800 text-center">
            <span class="text-lg block">🎓</span>
            <span class="text-lg font-bold text-[#2D1B14] dark:text-slate-200 mt-1 block">{{ summary.completed }}</span>
            <span class="text-[10px] text-[#8A7A72] dark:text-slate-500 uppercase tracking-wider font-semibold">Project Selesai</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ============ TAB: OMZET BERKALA ============ -->
    <div v-show="activeTab === 'periodic'" class="space-y-4 animate-fade-in">
      <div class="flex items-center justify-between">
        <div class="flex gap-2">
          <button v-for="p in periods" :key="p.key"
            @click="activePeriod = p.key; loadPeriodic()"
            class="px-3 py-1.5 rounded-lg text-[10px] font-bold border transition"
            :class="activePeriod === p.key ? 'bg-[#2D1B14] text-[#D4AF37] border-transparent dark:bg-amber-950/40 dark:text-amber-400' : 'bg-white dark:bg-slate-900 border-[#E8D5C8]/80 dark:border-slate-800 text-[#8A7A72] dark:text-slate-400 hover:bg-[#FFF8F3] dark:hover:bg-slate-800'">
            {{ p.label }}
          </button>
        </div>
      </div>

      <!-- Table -->
      <div class="card overflow-hidden dark:bg-slate-900 dark:border-slate-800">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-[#8A7A72] dark:text-slate-400 border-b border-[#E8D5C8] dark:border-slate-800 text-left text-xs">
              <th class="p-3 font-medium">Periode</th>
              <th class="p-3 font-medium text-center">Jumlah Booking</th>
              <th class="p-3 font-medium text-right">Total Omzet</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in periodicData" :key="row.period"
              class="border-b border-[#E8D5C8]/40 dark:border-slate-800/60 hover:bg-[#FFF8F3] dark:hover:bg-slate-800/50 text-[#2D1B14] dark:text-slate-200 text-xs transition">
              <td class="p-3 font-mono font-bold">{{ row.period }}</td>
              <td class="p-3 text-center">{{ row.bookings }}</td>
              <td class="p-3 text-right font-bold text-[#D94A3D] dark:text-amber-400">{{ row.revenue }}</td>
            </tr>
            <tr v-if="periodicData.length === 0">
              <td class="p-8 text-center text-[#C4B0A5] dark:text-slate-500" colspan="3">
                <span class="text-xs">Tidak ada data untuk periode ini</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ============ TAB: PAYROLL & BEBAN FG ============ -->
    <div v-show="activeTab === 'freelancers'" class="space-y-4 animate-fade-in">
      <div class="card overflow-hidden dark:bg-slate-900 dark:border-slate-800">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-[#8A7A72] dark:text-slate-400 border-b border-[#E8D5C8] dark:border-slate-800 text-left text-xs">
              <th class="p-3 font-medium">Nama Freelancer</th>
              <th class="p-3 font-medium text-center">Total Penugasan</th>
              <th class="p-3 font-medium text-center">Sesi Selesai</th>
              <th class="p-3 font-medium text-right">Total Payroll Terbayar</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="fg in fgData" :key="fg.id"
              class="border-b border-[#E8D5C8]/40 dark:border-slate-800/60 hover:bg-[#FFF8F3] dark:hover:bg-slate-800/50 text-[#2D1B14] dark:text-slate-200 text-xs transition">
              <td class="p-3 font-bold">{{ fg.name }}</td>
              <td class="p-3 text-center">{{ fg.total_assignments }}</td>
              <td class="p-3 text-center">{{ fg.completed_assignments }}</td>
              <td class="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{{ fg.total_payout }}</td>
            </tr>
            <tr v-if="fgData.length === 0">
              <td class="p-8 text-center text-[#C4B0A5] dark:text-slate-500" colspan="4">
                <span class="text-xs">Belum ada data kinerja freelancer</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ============ TAB: ANALISIS TREN & GRAFIK ============ -->
    <div v-show="activeTab === 'analytics'" class="space-y-6 animate-fade-in">
      <div v-if="loadingAnalytics" class="flex justify-center py-20">
        <div class="loading-spinner animate-spin"></div>
      </div>
      <div v-else class="space-y-6">
        
        <!-- Row 1: Line Chart + Donut Chart -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <!-- Monthly Trend (Line Chart) -->
          <div class="lg:col-span-2 card p-5 relative overflow-hidden dark:bg-slate-900 dark:border-slate-800">
            <h3 class="text-xs font-bold text-[#2D1B14] dark:text-slate-200 mb-4 flex items-center gap-2">
              <span class="w-5 h-5 rounded-md bg-[#FFF0E8] dark:bg-amber-950/20 flex items-center justify-center text-[10px]">📈</span>
              Tren Booking Bulanan (6 Bulan Terakhir)
            </h3>
            
            <div class="relative w-full h-[200px] flex items-center justify-center">
              <svg :viewBox="`0 0 ${lineChart.width} ${lineChart.height}`" class="w-full h-full">
                <defs>
                  <!-- Gradient Area -->
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#D94A3D" stop-opacity="0.25"/>
                    <stop offset="100%" stop-color="#D94A3D" stop-opacity="0.0"/>
                  </linearGradient>
                  <!-- Line Gradient -->
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stop-color="#F4A261"/>
                    <stop offset="100%" stop-color="#D94A3D"/>
                  </linearGradient>
                </defs>
                
                <!-- Grid Lines -->
                <line v-for="i in 4" :key="i"
                  x1="40" :y1="25 + (i-1)*32.5" :x2="lineChart.width - 40" :y2="25 + (i-1)*32.5"
                  stroke="#E8D5C8" stroke-dasharray="3 3" stroke-opacity="0.4"
                />
                
                <!-- Area Path -->
                <path :d="lineChart.area" fill="url(#areaGrad)" />
                
                <!-- Line Path -->
                <path :d="lineChart.path" fill="none" stroke="url(#lineGrad)" stroke-width="3" stroke-linecap="round" />
                
                <!-- Data Points (Circles) -->
                <g v-for="(p, idx) in lineChart.points" :key="idx">
                  <circle :cx="p.x" :cy="p.y" r="5" fill="#ffffff" stroke="#D94A3D" stroke-width="2"
                    class="transition-all duration-200 cursor-pointer hover:r-7 hover:fill-[#D94A3D]"
                    @mouseenter="hoverPoint = p"
                    @mouseleave="hoverPoint = null"
                  />
                  <!-- X Labels -->
                  <text :x="p.x" :y="lineChart.height - 5" text-anchor="middle" class="text-[9px] font-semibold fill-[#8A7A72] dark:fill-slate-400 font-mono">{{ p.label }}</text>
                </g>
              </svg>

              <!-- Hover Tooltip -->
              <div v-if="hoverPoint" class="absolute bg-[#2D1B14] text-white text-[10px] font-bold px-2 py-1 rounded shadow-md pointer-events-none transition duration-150 animate-fade-in"
                :style="{ left: (hoverPoint.x / lineChart.width * 100) + '%', top: (hoverPoint.y / lineChart.height * 100 - 15) + '%' }">
                {{ hoverPoint.fullLabel }}: {{ hoverPoint.val }} Order
              </div>
            </div>
          </div>

          <!-- Top Locations (Donut Chart) -->
          <div class="card p-5 flex flex-col items-center dark:bg-slate-900 dark:border-slate-800">
            <h3 class="text-xs font-bold text-[#2D1B14] dark:text-slate-200 self-start mb-4 flex items-center gap-2">
              <span class="w-5 h-5 rounded-md bg-[#FAF0DD] dark:bg-amber-950/20 flex items-center justify-center text-[10px]">📍</span>
              Top 5 Lokasi Sesi Foto
            </h3>
            
            <div v-if="donutData.length === 0" class="flex flex-col items-center justify-center flex-1 text-[#C4B0A5] py-8">
              <span class="text-3xl mb-1">📍</span>
              <p class="text-[10px]">Belum ada data lokasi</p>
            </div>
            
            <div v-else class="flex flex-col items-center justify-center flex-1 w-full gap-4">
              <!-- SVG Donut -->
              <div class="relative w-36 h-36 flex items-center justify-center">
                <svg viewBox="0 0 120 120" class="w-full h-full">
                  <circle cx="60" cy="60" r="40" fill="transparent" stroke="#E8D5C8" stroke-opacity="0.2" stroke-width="10" />
                  <circle v-for="(seg, idx) in donutData" :key="idx"
                    cx="60" cy="60" r="40"
                    fill="transparent"
                    :stroke="seg.color"
                    stroke-width="10"
                    :stroke-dasharray="seg.dashArray"
                    :stroke-dashoffset="seg.dashOffset"
                    transform="rotate(-90 60 60)"
                    class="transition-all duration-300 hover:stroke-[12px] cursor-pointer"
                    style="stroke-linecap: round;"
                  />
                </svg>
                <div class="absolute text-center">
                  <span class="text-[9px] uppercase tracking-wider text-[#C4B0A5] font-bold block">Total</span>
                  <span class="text-lg font-black text-[#2D1B14] dark:text-slate-200">
                    {{ donutData.reduce((sum, d) => sum + d.count, 0) }}
                  </span>
                </div>
              </div>
              
              <!-- Legend Grid -->
              <div class="grid grid-cols-2 gap-2 w-full text-[10px] pt-2 border-t border-[#E8D5C8]/40 dark:border-slate-800">
                <div v-for="(seg, idx) in donutData" :key="idx" class="flex items-center gap-1.5 min-w-0">
                  <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ backgroundColor: seg.color }"></span>
                  <span class="text-[#8A7A72] dark:text-slate-400 truncate flex-1" :title="seg.name">{{ seg.name }}</span>
                  <span class="font-bold text-[#2D1B14] dark:text-slate-200">{{ seg.count }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Row 2: Top Kampus + Jam Terpadat -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <!-- Top Kampus (Universitas) -->
          <div class="card p-5 dark:bg-slate-900 dark:border-slate-800">
            <h3 class="text-xs font-bold text-[#2D1B14] dark:text-slate-200 mb-4 flex items-center gap-2">
              <span class="w-5 h-5 rounded-md bg-[#FFF5F0] dark:bg-amber-950/20 flex items-center justify-center text-[10px]">🏫</span>
              Top 5 Universitas
            </h3>
            
            <div v-if="analyticsData.universities.length === 0" class="flex flex-col items-center justify-center py-12 text-[#C4B0A5]">
              <span class="text-3xl mb-1">🏫</span>
              <p class="text-[10px]">Belum ada data universitas</p>
            </div>
            
            <div v-else class="space-y-4">
              <div v-for="(item, idx) in analyticsData.universities" :key="idx" class="space-y-1">
                <div class="flex justify-between text-xs font-semibold">
                  <span class="text-[#2D1B14] dark:text-slate-200 truncate max-w-[80%]" :title="item.name">{{ item.name }}</span>
                  <span class="text-[#D94A3D] dark:text-amber-400 font-bold">{{ item.count }} Order</span>
                </div>
                <div class="h-3 bg-[#E8D5C8]/40 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-[#F4A261] to-[#D94A3D]"
                    :style="{ width: (item.count / Math.max(...analyticsData.universities.map(u => u.count), 1) * 100) + '%' }">
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Jam Terpadat (Shooting Slots) -->
          <div class="card p-5 dark:bg-slate-900 dark:border-slate-800">
            <h3 class="text-xs font-bold text-[#2D1B14] dark:text-slate-200 mb-4 flex items-center gap-2">
              <span class="w-5 h-5 rounded-md bg-[#FDECEA] dark:bg-amber-950/20 flex items-center justify-center text-[10px]">⏰</span>
              Jam Sesi Foto Terpadat
            </h3>
            
            <div v-if="hourChartData.length === 0" class="flex flex-col items-center justify-center py-12 text-[#C4B0A5]">
              <span class="text-3xl mb-1">⏰</span>
              <p class="text-[10px]">Belum ada data jadwal</p>
            </div>
            
            <div v-else class="flex items-end justify-between h-44 pt-6 px-2">
              <div v-for="(item, idx) in hourChartData" :key="idx" class="flex flex-col items-center flex-1 group">
                <!-- Tooltip -->
                <span class="opacity-0 group-hover:opacity-100 transition duration-200 text-[9px] font-bold text-white bg-[#2D1B14] px-1.5 py-0.5 rounded shadow-sm mb-1.5 -translate-y-2 pointer-events-none whitespace-nowrap">
                  {{ item.count }} Sesi
                </span>
                <!-- Vertical Bar -->
                <div class="w-6 sm:w-8 rounded-t-lg bg-gradient-to-t from-[#B5942B] to-[#F4A261] hover:from-[#F4A261] hover:to-[#D94A3D] transition-all duration-300"
                  :style="{ height: (item.pct * 0.8 + 10) + '%' }">
                </div>
                <!-- Label -->
                <span class="text-[9px] text-[#8A7A72] dark:text-slate-400 mt-2 font-mono font-semibold">{{ item.label }}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- ============ TAB: ANALISIS STORAGE & FOTO ============ -->
    <div v-if="activeTab === 'storage'" class="space-y-6 animate-fade-in">
      <!-- Loading -->
      <div v-if="loadingStorage" class="flex justify-center py-20">
        <div class="loading-spinner animate-spin"></div>
      </div>

      <div v-else class="space-y-6">
        <!-- 5 Hero Summary Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <!-- 1. Total Semua Foto -->
          <div class="card p-4 dark:bg-slate-900 dark:border-slate-800">
            <span class="text-[9px] uppercase tracking-wider text-[#C4B0A5] dark:text-slate-500 font-bold block">📸 Total Semua Foto</span>
            <p class="text-xl font-black text-[#D94A3D] dark:text-amber-400 mt-1">
              {{ (storageData.summary?.total_all_photos || 0).toLocaleString('id-ID') }}
            </p>
            <span class="text-[10px] text-[#8A7A72] dark:text-slate-400 mt-0.5 block">Akumulasi seluruh file</span>
          </div>

          <!-- 2. Total JPG Mentah -->
          <div class="card p-4 dark:bg-slate-900 dark:border-slate-800">
            <span class="text-[9px] uppercase tracking-wider text-[#C4B0A5] dark:text-slate-500 font-bold block">📁 Semua JPG Mentah</span>
            <p class="text-xl font-black text-[#2D1B14] dark:text-slate-200 mt-1">
              {{ (storageData.summary?.total_jpg || 0).toLocaleString('id-ID') }}
            </p>
            <span class="text-[10px] text-[#8A7A72] dark:text-slate-400 mt-0.5 block">Hasil jepretan fotografer</span>
          </div>

          <!-- 3. Total Highlight -->
          <div class="card p-4 dark:bg-slate-900 dark:border-slate-800">
            <span class="text-[9px] uppercase tracking-wider text-[#C4B0A5] dark:text-slate-500 font-bold block">⭐ Foto Highlight</span>
            <p class="text-xl font-black text-[#2D1B14] dark:text-slate-200 mt-1">
              {{ (storageData.summary?.total_highlight || 0).toLocaleString('id-ID') }}
            </p>
            <span class="text-[10px] text-[#8A7A72] dark:text-slate-400 mt-0.5 block">Sneak peek cepat</span>
          </div>

          <!-- 4. Total Final Editing -->
          <div class="card p-4 dark:bg-slate-900 dark:border-slate-800">
            <span class="text-[9px] uppercase tracking-wider text-[#C4B0A5] dark:text-slate-500 font-bold block">🎨 Final Retouch</span>
            <p class="text-xl font-black text-[#2D1B14] dark:text-slate-200 mt-1">
              {{ (storageData.summary?.total_final || 0).toLocaleString('id-ID') }}
            </p>
            <span class="text-[10px] text-[#8A7A72] dark:text-slate-400 mt-0.5 block">Hasil edit siap cetak</span>
          </div>

          <!-- 5. Total Storage GB -->
          <div class="card p-4 dark:bg-slate-900 dark:border-slate-800">
            <span class="text-[9px] uppercase tracking-wider text-[#C4B0A5] dark:text-slate-500 font-bold block">☁️ Storage Terpakai</span>
            <p class="text-xl font-black text-sky-600 dark:text-sky-400 mt-1 font-mono">
              {{ storageData.summary?.total_drive_gb || '0.00' }} GB
            </p>
            <span class="text-[10px] text-[#8A7A72] dark:text-slate-400 mt-0.5 block">Estimasi kapasitas Drive</span>
          </div>
        </div>

        <!-- 📈 Interactive Timeline Line Chart (Volume Foto Per Klien / Minggu / Bulan) -->
        <div class="card p-5 dark:bg-slate-900 dark:border-slate-800 shadow-sm space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8D5C8]/80 dark:border-slate-800 pb-3">
            <div class="flex items-center gap-2">
              <span class="w-6 h-6 rounded-lg bg-[#FDECEA] dark:bg-slate-800 flex items-center justify-center text-xs">📈</span>
              <div>
                <h3 class="text-xs font-bold text-[#2D1B14] dark:text-slate-200">Grafik Timeline Volume Foto Studio</h3>
                <p class="text-[10px] text-slate-400">Fluktuasi jumlah foto per klien dan akumulasi timeline produksi</p>
              </div>
            </div>

            <!-- Timeframe Filter Toggle -->
            <div class="flex items-center bg-[#FAF9F6] dark:bg-slate-950 p-1 rounded-xl border border-[#E8D5C8]/80 dark:border-slate-800 text-[10px] font-semibold">
              <button @click="storageTimelineMode = 'client'"
                class="px-3 py-1 rounded-lg transition"
                :class="storageTimelineMode === 'client' ? 'bg-[#2D1B14] text-[#F4A261] shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'">
                Per Klien (Sesi)
              </button>
              <button @click="storageTimelineMode = 'weekly'"
                class="px-3 py-1 rounded-lg transition"
                :class="storageTimelineMode === 'weekly' ? 'bg-[#2D1B14] text-[#F4A261] shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'">
                Tren Mingguan
              </button>
              <button @click="storageTimelineMode = 'monthly'"
                class="px-3 py-1 rounded-lg transition"
                :class="storageTimelineMode === 'monthly' ? 'bg-[#2D1B14] text-[#F4A261] shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'">
                Tren Bulanan
              </button>
            </div>
          </div>

          <!-- Line Legend -->
          <div class="flex items-center gap-4 text-[10px] text-slate-500 flex-wrap">
            <div class="flex items-center gap-1.5">
              <span class="w-3 h-1 bg-[#D94A3D] rounded-full"></span>
              <span class="font-semibold text-slate-700 dark:text-slate-300">Total Foto</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-3 h-1 bg-[#F4A261] rounded-full"></span>
              <span>Semua JPG Mentah</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-3 h-1 bg-[#8B5CF6] rounded-full"></span>
              <span>Final Retouch</span>
            </div>
          </div>

          <!-- SVG Multi-Line Chart -->
          <div class="relative w-full overflow-x-auto pt-2 pb-2">
            <div v-if="!storageLineChart.points.length" class="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
              <span class="text-3xl mb-1 opacity-60">📷</span>
              <span>Belum ada data foto pada timeline ini</span>
            </div>

            <div v-else class="min-w-[650px]">
              <svg :viewBox="`0 0 ${storageLineChart.width} ${storageLineChart.height}`" class="w-full h-56 overflow-visible">
                <defs>
                  <linearGradient id="storageTotalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#D94A3D" stop-opacity="0.25" />
                    <stop offset="100%" stop-color="#D94A3D" stop-opacity="0.0" />
                  </linearGradient>
                </defs>

                <!-- Grid horizontal lines -->
                <line v-for="n in 4" :key="n"
                  :x1="storageLineChart.paddingX"
                  :y1="storageLineChart.paddingY + (n - 1) * ((storageLineChart.height - 2 * storageLineChart.paddingY) / 3)"
                  :x2="storageLineChart.width - storageLineChart.paddingX"
                  :y2="storageLineChart.paddingY + (n - 1) * ((storageLineChart.height - 2 * storageLineChart.paddingY) / 3)"
                  stroke="#E8D5C8"
                  stroke-opacity="0.4"
                  stroke-dasharray="4 4" />

                <!-- Area Fill for Total -->
                <path :d="storageLineChart.areaTotal" fill="url(#storageTotalGradient)" />

                <!-- Line 2: JPG Mentah (Orange) -->
                <path :d="storageLineChart.pathJpg" fill="none" stroke="#F4A261" stroke-width="2" stroke-dasharray="3 3" class="transition-all duration-500" />

                <!-- Line 3: Final Retouch (Purple) -->
                <path :d="storageLineChart.pathFinal" fill="none" stroke="#8B5CF6" stroke-width="2" class="transition-all duration-500" />

                <!-- Line 1: Total Foto (Red/Coral Bold) -->
                <path :d="storageLineChart.pathTotal" fill="none" stroke="#D94A3D" stroke-width="3" stroke-linecap="round" class="transition-all duration-500" />

                <!-- Interactive Data Points -->
                <g v-for="(p, idx) in storageLineChart.points" :key="idx" class="cursor-pointer group"
                  @mouseenter="hoverStoragePoint = p" @mouseleave="hoverStoragePoint = null">
                  <!-- Node Circle -->
                  <circle :cx="p.x" :cy="p.yTotal" r="5" fill="#FFFFFF" stroke="#D94A3D" stroke-width="2.5"
                    class="transition-transform group-hover:scale-150" />
                  
                  <!-- Label on X Axis -->
                  <text :x="p.x" :y="storageLineChart.height - 8" font-size="9" fill="#8A7A72" text-anchor="middle" font-weight="600" class="truncate">
                    {{ p.label }}
                  </text>
                </g>
              </svg>

              <!-- Interactive Floating Tooltip -->
              <div v-if="hoverStoragePoint"
                class="card p-3 shadow-xl dark:bg-slate-950 dark:border-slate-800 text-xs border border-slate-200 mt-2 flex items-center justify-between gap-4 flex-wrap bg-white/95 backdrop-blur">
                <div class="flex items-center gap-2">
                  <span class="text-base">🎓</span>
                  <div>
                    <strong class="text-slate-800 dark:text-slate-200 block">{{ hoverStoragePoint.item?.client_name || hoverStoragePoint.label }}</strong>
                    <span class="text-[10px] text-slate-400">
                      {{ hoverStoragePoint.item?.university || 'Wisuda Photography' }} · {{ hoverStoragePoint.item?.graduation_date || '' }}
                    </span>
                  </div>
                </div>

                <div class="flex items-center gap-3 text-[11px] font-mono">
                  <span class="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold">
                    📁 JPG: {{ hoverStoragePoint.item?.jpg_count || 0 }}
                  </span>
                  <span class="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 font-bold">
                    🎨 Final: {{ hoverStoragePoint.item?.final_count || 0 }}
                  </span>
                  <span class="px-2.5 py-0.5 rounded bg-[#D94A3D] text-white font-black">
                    📸 Total: {{ hoverStoragePoint.item?.total_photos || 0 }} Foto
                  </span>
                  <span v-if="hoverStoragePoint.item?.formatted_size" class="text-slate-500 font-bold">
                    ({{ hoverStoragePoint.item?.formatted_size }})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 2-Column: Productivity Metrics + Detailed Client Table -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <!-- Column 1: Productivity & Composition -->
          <div class="card p-5 dark:bg-slate-900 dark:border-slate-800 space-y-4">
            <h3 class="text-xs font-bold text-[#2D1B14] dark:text-slate-200 flex items-center gap-2">
              <span class="w-5 h-5 rounded-md bg-[#FDECEA] flex items-center justify-center text-[10px]">📊</span>
              Statistik Produksi Studio
            </h3>

            <div class="space-y-3">
              <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span class="text-[10px] text-slate-400 block">Rata-rata Foto / Klien:</span>
                  <strong class="text-sm font-black text-slate-800 dark:text-slate-200">
                    {{ storageData.summary?.avg_photos_per_client || 0 }} Foto
                  </strong>
                </div>
                <span class="text-xl">📸</span>
              </div>

              <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span class="text-[10px] text-slate-400 block">Rata-rata JPG Mentah / Klien:</span>
                  <strong class="text-sm font-black text-slate-800 dark:text-slate-200">
                    {{ storageData.summary?.avg_jpg_per_client || 0 }} JPG
                  </strong>
                </div>
                <span class="text-xl">📁</span>
              </div>

              <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span class="text-[10px] text-slate-400 block">Rasio Seleksi Foto Klien:</span>
                  <strong class="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {{ storageData.summary?.selection_rate || '0.0' }}%
                  </strong>
                </div>
                <span class="text-xl">🎯</span>
              </div>
            </div>

            <!-- Composition Progress Bars -->
            <div class="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Proporsi Komposisi Berkas:</span>
              <div v-for="c in storageCompositionData" :key="c.label" class="space-y-1 text-xs">
                <div class="flex justify-between text-[11px]">
                  <span class="text-slate-600 dark:text-slate-300 font-medium">{{ c.label }}</span>
                  <span class="font-bold text-slate-800 dark:text-slate-200">{{ c.count }} ({{ c.pct }}%)</span>
                </div>
                <div class="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-700" :style="{ width: c.pct + '%', backgroundColor: c.color }"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Column 2: Detailed Client Storage Table (Span 2) -->
          <div class="lg:col-span-2 card p-5 dark:bg-slate-900 dark:border-slate-800 space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8D5C8]/80 dark:border-slate-800 pb-3">
              <div class="flex items-center gap-2">
                <span class="w-6 h-6 rounded-lg bg-[#FDECEA] flex items-center justify-center text-xs">📋</span>
                <h3 class="text-xs font-bold text-[#2D1B14] dark:text-slate-200">Daftar Kapasitas Berkas Per Klien</h3>
              </div>

              <!-- Search Input -->
              <div class="relative min-w-[200px]">
                <input v-model="searchStorageClient" type="text" placeholder="Cari nama / kampus..."
                  class="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 focus:outline-none focus:border-amber-500 dark:text-slate-200">
                <span class="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
              </div>
            </div>

            <!-- Table -->
            <div class="overflow-x-auto max-h-[380px] overflow-y-auto pr-1">
              <table class="w-full text-xs">
                <thead>
                  <tr class="text-left text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/80 sticky top-0 bg-white dark:bg-slate-900 z-10">
                    <th class="pb-2 pl-1 font-semibold">Klien &amp; Kampus</th>
                    <th class="pb-2 text-center font-semibold">JPG</th>
                    <th class="pb-2 text-center font-semibold">Highlight</th>
                    <th class="pb-2 text-center font-semibold">Final</th>
                    <th class="pb-2 text-right font-semibold">Total Foto</th>
                    <th class="pb-2 text-right font-semibold">Ukuran</th>
                    <th class="pb-2 pr-1 text-right font-semibold">Drive</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                  <tr v-for="c in filteredStorageClients" :key="c.id" class="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition">
                    <td class="py-2.5 pl-1">
                      <div class="font-bold text-[#2D1B14] dark:text-slate-200">{{ c.client_name }}</div>
                      <div class="text-[10px] text-slate-400">{{ c.university || '-' }} · {{ c.graduation_date || '' }}</div>
                    </td>
                    <td class="py-2.5 text-center font-mono font-semibold">{{ c.jpg_count }}</td>
                    <td class="py-2.5 text-center font-mono font-semibold">{{ c.highlight_count }}</td>
                    <td class="py-2.5 text-center font-mono font-semibold text-purple-600 dark:text-purple-400 font-bold">{{ c.final_count }}</td>
                    <td class="py-2.5 text-right font-mono font-black text-[#D94A3D]">{{ c.total_photos }}</td>
                    <td class="py-2.5 text-right font-mono text-slate-500 font-semibold">{{ c.formatted_size }}</td>
                    <td class="py-2.5 pr-1 text-right whitespace-nowrap">
                      <a v-if="c.drive_parent_url" :href="c.drive_parent_url" target="_blank"
                        class="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[10px] font-bold inline-flex items-center gap-1">
                        <span>📂 Drive</span>
                      </a>
                      <span v-else class="text-[10px] text-slate-400 italic">-</span>
                    </td>
                  </tr>

                  <tr v-if="!filteredStorageClients.length">
                    <td colspan="7" class="py-10 text-center text-slate-400 text-xs">
                      Tidak ada data klien yang cocok
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const API = '/api/admin'
const activeTab = ref('summary')
const activePeriod = ref('monthly')
const loading = ref(true)
const loadingAnalytics = ref(false)
const loadingStorage = ref(false)

const tabs = [
  { key: 'summary', label: 'Ringkasan Finansial' },
  { key: 'periodic', label: 'Omzet Berkala' },
  { key: 'freelancers', label: 'Kinerja & Beban Freelancer' },
  { key: 'analytics', label: 'Analisis Tren & Grafik' },
  { key: 'storage', label: '☁️ Analisis Storage & Foto' }
]

const periods = [
  { key: 'daily', label: 'Harian' },
  { key: 'weekly', label: 'Mingguan' },
  { key: 'monthly', label: 'Bulanan' },
  { key: 'yearly', label: 'Tahunan' }
]

const summary = ref({
  revenueLabel: 'Rp 0',
  total_dp_paid_label: 'Rp 0',
  total_balance_paid_label: 'Rp 0',
  total_receivables_label: 'Rp 0',
  total_fg_payout_paid_label: 'Rp 0',
  total_fg_payout_pending_label: 'Rp 0',
  conversionRate: 0,
  totalInquiries: 0,
  quoted: 0,
  booked: 0,
  completed: 0
})

const periodicData = ref([])
const fgData = ref([])
const analyticsData = ref({ locations: [], universities: [], hours: [], trend: [] })

const hoverPoint = ref(null)

// ☁️ Storage & Photo Asset Report States
const storageData = ref({
  summary: {
    total_clients: 0,
    total_all_photos: 0,
    total_jpg: 0,
    total_highlight: 0,
    total_final: 0,
    total_drive_gb: '0.00',
    avg_photos_per_client: 0,
    avg_jpg_per_client: 0,
    selection_rate: '0.0'
  },
  client_timeline: [],
  weekly_timeline: [],
  monthly_timeline: [],
  clients_list: []
})
const storageTimelineMode = ref('client')
const searchStorageClient = ref('')
const hoverStoragePoint = ref(null)

// Computed for line chart (last 6 months trend)
const lineChart = computed(() => {
  const data = analyticsData.value.trend || [];
  if (data.length === 0) return { path: '', area: '', points: [], width: 500, height: 180 };
  
  const maxVal = Math.max(...data.map(d => d.count), 5);
  const width = 500;
  const height = 180;
  const paddingX = 40;
  const paddingY = 25;
  
  const pts = data.map((d, i) => {
    const x = paddingX + (i * (width - 2 * paddingX) / (data.length - 1 || 1));
    const y = height - paddingY - (d.count / maxVal * (height - 2 * paddingY));
    let monthLabel = d.month;
    try {
      const [year, month] = d.month.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      monthLabel = date.toLocaleDateString('id-ID', { month: 'short' });
    } catch (e) {}
    return { x, y, label: monthLabel, fullLabel: d.month, val: d.count };
  });
  
  const path = pts.reduce((acc, p, i) => {
    return acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`);
  }, '');
  
  const area = pts.length > 0 
    ? `${path} L ${pts[pts.length - 1].x} ${height - paddingY} L ${pts[0].x} ${height - paddingY} Z`
    : '';
    
  return { path, area, points: pts, width, height, paddingX, paddingY, maxVal };
});

// Computed for SVG Line Chart Storage Timeline
const storageLineChart = computed(() => {
  let source = []
  if (storageTimelineMode.value === 'client') {
    source = storageData.value.client_timeline || []
  } else if (storageTimelineMode.value === 'weekly') {
    source = (storageData.value.weekly_timeline || []).map(w => ({
      short_name: w.week_key,
      client_name: 'Minggu ' + w.week_key,
      total_photos: w.total_photos,
      jpg_count: w.total_jpg,
      highlight_count: w.total_highlight,
      final_count: w.total_final,
      client_count: w.client_count
    }))
  } else {
    source = (storageData.value.monthly_timeline || []).map(m => ({
      short_name: m.month_key,
      client_name: 'Bulan ' + m.month_key,
      total_photos: m.total_photos,
      jpg_count: m.total_jpg,
      highlight_count: m.total_highlight,
      final_count: m.total_final,
      client_count: m.client_count
    }))
  }

  if (source.length === 0) {
    return { pathTotal: '', pathJpg: '', pathFinal: '', areaTotal: '', points: [], width: 700, height: 220, paddingX: 50, paddingY: 30, maxVal: 10 }
  }

  const maxVal = Math.max(...source.map(d => d.total_photos || d.jpg_count || 0), 10)
  const width = 700
  const height = 220
  const paddingX = 50
  const paddingY = 30

  const pts = source.map((d, i) => {
    const x = paddingX + (i * (width - 2 * paddingX) / (source.length - 1 || 1))
    const yTotal = height - paddingY - (((d.total_photos || 0) / maxVal) * (height - 2 * paddingY))
    const yJpg = height - paddingY - (((d.jpg_count || 0) / maxVal) * (height - 2 * paddingY))
    const yFinal = height - paddingY - (((d.final_count || 0) / maxVal) * (height - 2 * paddingY))
    return {
      x,
      yTotal,
      yJpg,
      yFinal,
      label: d.short_name || d.client_name,
      item: d
    }
  })

  const pathTotal = pts.reduce((acc, p, i) => acc + (i === 0 ? `M ${p.x} ${p.yTotal}` : ` L ${p.x} ${p.yTotal}`), '')
  const pathJpg = pts.reduce((acc, p, i) => acc + (i === 0 ? `M ${p.x} ${p.yJpg}` : ` L ${p.x} ${p.yJpg}`), '')
  const pathFinal = pts.reduce((acc, p, i) => acc + (i === 0 ? `M ${p.x} ${p.yFinal}` : ` L ${p.x} ${p.yFinal}`), '')

  const areaTotal = pts.length > 0
    ? `${pathTotal} L ${pts[pts.length - 1].x} ${height - paddingY} L ${pts[0].x} ${height - paddingY} Z`
    : ''

  return { pathTotal, pathJpg, pathFinal, areaTotal, points: pts, width, height, paddingX, paddingY, maxVal }
})

// Computed for filtered client storage list
const filteredStorageClients = computed(() => {
  const q = searchStorageClient.value.toLowerCase().trim()
  const list = storageData.value.clients_list || []
  if (!q) return list
  return list.filter(c =>
    (c.client_name && c.client_name.toLowerCase().includes(q)) ||
    (c.university && c.university.toLowerCase().includes(q))
  )
})

// Computed for composition breakdown
const storageCompositionData = computed(() => {
  const sum = storageData.value.summary || {}
  const total = (sum.total_all_photos || 0) || 1
  const jpgPct = Math.round(((sum.total_jpg || 0) / total) * 100)
  const hlPct = Math.round(((sum.total_highlight || 0) / total) * 100)
  const fnPct = Math.round(((sum.total_final || 0) / total) * 100)
  return [
    { label: 'JPG Mentah', count: sum.total_jpg || 0, pct: jpgPct, color: '#F4A261' },
    { label: 'Highlight', count: sum.total_highlight || 0, pct: hlPct, color: '#E07A3A' },
    { label: 'Final Retouch', count: sum.total_final || 0, pct: fnPct, color: '#D94A3D' }
  ]
})

// Computed for donut chart (locations)
const donutData = computed(() => {
  const data = analyticsData.value.locations || [];
  const total = data.reduce((sum, d) => sum + d.count, 0) || 1;
  let accumulatedPercent = 0;
  const r = 40;
  const circumference = 2 * Math.PI * r;
  
  const colors = ['#D94A3D', '#F4A261', '#E07A3A', '#B5942B', '#8A7A72'];
  
  return data.map((d, i) => {
    const pct = d.count / total;
    const strokeDasharray = `${pct * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += pct;
    return {
      ...d,
      pctLabel: Math.round(pct * 100) + '%',
      color: colors[i % colors.length],
      dashArray: strokeDasharray,
      dashOffset: strokeDashoffset
    };
  });
});

// Computed for hour slot column chart
const hourChartData = computed(() => {
  const data = analyticsData.value.hours || [];
  if (data.length === 0) return [];
  const maxVal = Math.max(...data.map(d => d.count), 1);
  return data.map(d => ({
    label: d.hr + ':00',
    count: d.count,
    pct: (d.count / maxVal) * 100
  }));
});

async function loadSummary() {
  loading.value = true
  try {
    const r = await fetch(`${API}/reports`, { credentials: 'include' })
    summary.value = await r.json()
  } catch (e) {
    console.error(e)
  }
  loading.value = false
}

async function loadPeriodic() {
  try {
    const r = await fetch(`${API}/reports/revenue?period=${activePeriod.value}`, { credentials: 'include' })
    const d = await r.json()
    periodicData.value = d.data || []
  } catch (e) {
    console.error(e)
  }
}

async function loadFgPerformance() {
  try {
    const r = await fetch(`${API}/reports/fg-performance`, { credentials: 'include' })
    fgData.value = await r.json()
  } catch (e) {
    console.error(e)
  }
}

async function loadAnalytics() {
  loadingAnalytics.value = true
  try {
    const r = await fetch(`${API}/reports/analytics`, { credentials: 'include' })
    analyticsData.value = await r.json()
  } catch (e) {
    console.error(e)
  } finally {
    loadingAnalytics.value = false
  }
}

async function loadStorageReport() {
  loadingStorage.value = true
  try {
    const r = await fetch(`${API}/reports/storage`, { credentials: 'include' })
    storageData.value = await r.json()
  } catch (e) {
    console.error('Failed to load storage report:', e)
  } finally {
    loadingStorage.value = false
  }
}

onMounted(() => {
  loadSummary()
  loadPeriodic()
  loadFgPerformance()
  loadAnalytics()
  loadStorageReport()
})
</script>