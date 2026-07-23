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
            <span class="text-[10px] text-[#8A7A72] dark:text-slate-500 uppercase tracking-wider font-semibold">Inquiries Quoted</span>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const API = '/api/admin'
const activeTab = ref('summary')
const activePeriod = ref('monthly')
const loading = ref(true)
const loadingAnalytics = ref(false)

const tabs = [
  { key: 'summary', label: 'Ringkasan Finansial' },
  { key: 'periodic', label: 'Omzet Berkala' },
  { key: 'freelancers', label: 'Kinerja & Beban Freelancer' },
  { key: 'analytics', label: 'Analisis Tren & Grafik' }
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
    // Label formatting: e.g. "2026-07" -> "Jul"
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

// Computed for donut chart (locations)
const donutData = computed(() => {
  const data = analyticsData.value.locations || [];
  const total = data.reduce((sum, d) => sum + d.count, 0) || 1;
  let accumulatedPercent = 0;
  const r = 40;
  const circumference = 2 * Math.PI * r;
  
  // Custom curated aesthetics colors matching graduation theme
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

onMounted(() => {
  loadSummary()
  loadPeriodic()
  loadFgPerformance()
  loadAnalytics()
})
</script>