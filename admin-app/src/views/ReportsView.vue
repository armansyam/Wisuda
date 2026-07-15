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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const API = '/api/admin'
const activeTab = ref('summary')
const activePeriod = ref('monthly')
const loading = ref(true)

const tabs = [
  { key: 'summary', label: 'Ringkasan Finansial' },
  { key: 'periodic', label: 'Omzet Berkala' },
  { key: 'freelancers', label: 'Kinerja & Beban Freelancer' }
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

onMounted(() => {
  loadSummary()
  loadPeriodic()
  loadFgPerformance()
})
</script>