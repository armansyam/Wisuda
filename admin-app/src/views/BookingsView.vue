<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-5">
      <div class="flex items-center gap-2.5">
        <h2 class="text-xl font-bold text-[#2D1B14] dark:text-slate-200 tracking-tight">Client</h2>
        <span class="text-[10px] text-[#C4B0A5] bg-white dark:bg-slate-900 rounded-full px-2.5 py-0.5 border border-[#E8D5C8] dark:border-slate-800" v-if="!loading">{{ data.length }} item</span>
      </div>
      <div class="flex items-center gap-2">
        <!-- View Toggle -->
        <div class="flex bg-white dark:bg-slate-900 border border-[#E8D5C8] dark:border-slate-800 rounded-lg overflow-hidden">
          <button @click="setViewMode('card')" :class="viewMode === 'card' ? 'bg-[#2D1B14] dark:bg-amber-950/40 text-[#D4AF37]' : 'text-[#C4B0A5] hover:text-[#8A7A72] dark:hover:text-slate-300'" class="p-1.5 transition" title="Tampilan Card">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
          </button>
          <button @click="setViewMode('list')" :class="viewMode === 'list' ? 'bg-[#2D1B14] dark:bg-amber-950/40 text-[#D4AF37]' : 'text-[#C4B0A5] hover:text-[#8A7A72] dark:hover:text-slate-300'" class="p-1.5 transition" title="Tampilan List">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
          </button>
        </div>
        <input v-model="searchQ" @input.debounce.300ms="load()" class="input-fancy !w-32 !py-1.5 !text-[11px] dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200" placeholder="🔍 Cari nama...">
        <select v-model="filterStatus" @change="load()" class="input-fancy !w-28 !py-1.5 !text-[11px] appearance-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200" style="background-image: url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%23C4B0A5' stroke-width='2'%3E%3Cpath d='M3 4.5l3 3 3-3'/%3E%3C/svg%3E&quot;); background-repeat: no-repeat; background-position: right 8px center; padding-right: 28px;">
          <option value="">Semua</option>
          <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-16">
      <div class="loading-spinner animate-spin"></div>
    </div>

    <!-- Cards View -->
    <div v-else-if="viewMode === 'card'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      <div v-for="item in data" :key="item.id"
        class="card p-4 transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer dark:bg-slate-900 dark:border-slate-800"
        @click="showDetail(item)">
        <div class="flex items-start justify-between mb-2.5">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-[#FAF0DD] dark:bg-amber-950/20 flex items-center justify-center text-sm font-bold text-[#B5942B] dark:text-amber-400">{{ (item.client_name||'?')[0] }}</div>
            <div>
              <p class="text-sm font-semibold text-[#2D1B14] dark:text-slate-200 leading-tight">{{ item.client_name }}</p>
              <p class="text-[10px] text-[#C4B0A5]">{{ item.university || '-' }}</p>
            </div>
          </div>
          <span class="status-chip ml-2" :class="statusClass(item.status)">{{ getDetailedStatusLabel(item) }}</span>
        </div>
        <div class="space-y-1 text-[11px] text-[#8A7A72] dark:text-slate-400">
          <div class="flex justify-between">
            <span>Paket</span>
            <span class="font-medium text-[#2D1B14] dark:text-slate-200">{{ item.package_name || '-' }}</span>
          </div>
          <div class="flex justify-between">
            <span>Tanggal</span>
            <span>{{ item.graduation_date || '-' }}</span>
          </div>
          <div class="flex justify-between" v-if="!(item.dp_status === 'uploaded' && item.balance_status === 'uploaded')">
            <span>DP</span>
            <span :class="dpClass(item.dp_status)">{{ item.dp_status }}</span>
          </div>
          <div class="flex justify-between" v-if="item.balance_status !== 'unpaid' && !(item.dp_status === 'uploaded' && item.balance_status === 'uploaded')">
            <span>Pelunasan</span>
            <span :class="dpClass(item.balance_status)">{{ item.balance_status }}</span>
          </div>
          <div class="flex justify-between text-[#0f766e] dark:text-green-400 font-semibold" v-if="item.dp_status === 'uploaded' && item.balance_status === 'uploaded'">
            <span>Pembayaran</span>
            <span>Lunas 100% (Awal)</span>
          </div>
          <div class="flex justify-between" v-if="item.fg_name">
            <span>FG</span>
            <div class="flex flex-col items-end gap-0.5">
              <span class="text-[9px] px-1.5 py-0.5 bg-[#FAF0DD] dark:bg-amber-950/20 rounded text-[#B5942B] dark:text-amber-400 font-semibold">{{ item.fg_name }}</span>
              <span v-if="item.assignment_status === 'assigned'" class="text-[8px] text-amber-500 animate-pulse font-medium">⏳ Menunggu Konfirmasi</span>
              <span v-else-if="item.assignment_status === 'confirmed'" class="text-[8px] text-green-600 font-medium">✓ Diterima</span>
            </div>
          </div>
        </div>
        <div class="flex gap-1.5 mt-3 pt-2.5 border-t border-[#E8D5C8]/60 dark:border-slate-800" @click.stop>
          <button @click="showDetail(item)" class="flex-1 px-2 py-1.5 rounded-lg text-[9px] font-medium transition text-[#8A7A72] dark:text-slate-400 hover:bg-[#FFF0E8] dark:hover:bg-slate-800">Detail</button>
          
          <!-- Verification Buttons -->
          <!-- Case 1: Lunas 100% upfront (both uploaded) -->
          <button v-if="item.dp_status === 'uploaded' && item.balance_status === 'uploaded'" 
            @click="openVerifyModal(item, 'dp')" 
            class="flex-1 px-2 py-1.5 rounded-lg text-[9px] font-medium transition text-white bg-[#0f766e] hover:bg-[#0d6860]">
            ✓ Verifikasi Lunas
          </button>
          
          <!-- Case 2: Standard DP check -->
          <button v-else-if="item.dp_status === 'uploaded' || (item.status === 'pending' && item.dp_status === 'unpaid')" 
            @click="openVerifyModal(item, 'dp')" 
            class="flex-1 px-2 py-1.5 rounded-lg text-[9px] font-medium transition text-white bg-[#0f766e] hover:bg-[#0d6860]">
            ✓ DP
          </button>
          
          <button v-if="(item.status === 'confirmed' || item.dp_status === 'uploaded') && !item.fg_name && item.dp_status === 'paid'" @click="openAssign(item)" class="flex-1 px-2 py-1.5 rounded-lg text-[9px] font-medium transition text-[#8A7A72] bg-[#FAF0DD] dark:bg-amber-950/20 text-[#B5942B] dark:text-amber-400 hover:bg-[#FFE5DA]">👤 Assign</button>
          <button v-else-if="(item.status === 'confirmed' || item.dp_status === 'uploaded' || item.status === 'pending') && !item.fg_name && item.dp_status !== 'paid'" disabled class="flex-1 px-2 py-1.5 rounded-lg text-[9px] font-medium transition text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 cursor-not-allowed opacity-60 flex items-center justify-center gap-1" title="Verifikasi DP terlebih dahulu sebelum Assign FG">🔒 Assign (DP Pending)</button>
          <button v-if="item.status === 'confirmed' && item.fg_name" @click="setStatus(item, 'shooting')" class="flex-1 px-2 py-1.5 rounded-lg text-[9px] font-medium transition text-white bg-blue-600 hover:bg-blue-700">📸 Shoot</button>
          
          <!-- Case 3: Standard Pelunasan check (hide if both are uploaded since Verifikasi Lunas handles it) -->
          <button v-if="!(item.dp_status === 'uploaded' && item.balance_status === 'uploaded') && (item.balance_status === 'uploaded' || (item.status === 'shooting' && item.balance_status === 'unpaid'))" 
            @click="openVerifyModal(item, 'balance')" 
            class="flex-1 px-2 py-1.5 rounded-lg text-[9px] font-medium transition text-white bg-[#0f766e] hover:bg-[#0d6860]">
            ✓ Pelunasan
          </button>
          
          <button v-if="item.status === 'shooting'" @click="setStatus(item, 'editing')" class="flex-1 px-2 py-1.5 rounded-lg text-[9px] font-medium transition text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer" title="Konfirmasi sesi pemotretan telah selesai">📸 Selesai Sesi</button>
          <button v-if="item.status === 'editing' || item.status === 'uploaded'" @click="router.push('/admin/deliverables')" class="flex-1 px-2 py-1.5 rounded-lg text-[9px] font-medium transition text-white bg-purple-600 hover:bg-purple-700 cursor-pointer" title="Buka Post Production (Upload Staging & Seleksi Foto Client)">🎨 Post Production</button>
          <button v-if="item.status === 'delivered'" @click="complete(item)" class="flex-1 px-2 py-1.5 rounded-lg text-[9px] font-medium transition text-white bg-green-600 hover:bg-green-700">✅ Selesai</button>
          <button @click.stop="deleteBooking(item)" class="px-2 py-1.5 rounded-lg text-[9px] font-semibold transition text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20" title="Hapus Client & Booking">🗑️ Hapus</button>
        </div>
      </div>
    </div>

    <!-- List View -->
    <div v-else-if="viewMode === 'list' && !loading" class="card overflow-hidden dark:bg-slate-900 dark:border-slate-800">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-[#8A7A72] dark:text-slate-400 border-b border-[#E8D5C8] dark:border-slate-800 text-left text-[11px]">
            <th class="p-3 font-medium w-8">#</th>
            <th class="p-3 font-medium">Nama Client</th>
            <th class="p-3 font-medium hidden md:table-cell">Universitas</th>
            <th class="p-3 font-medium">Paket</th>
            <th class="p-3 font-medium">Jadwal</th>
            <th class="p-3 font-medium hidden lg:table-cell">DP</th>
            <th class="p-3 font-medium hidden lg:table-cell">Pelunasan</th>
            <th class="p-3 font-medium hidden md:table-cell">FG</th>
            <th class="p-3 font-medium">Status</th>
            <th class="p-3 font-medium">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, idx) in data" :key="item.id"
            class="border-b border-[#E8D5C8]/40 dark:border-slate-800/60 hover:bg-[#FFF8F3] dark:hover:bg-slate-800/50 text-[#2D1B14] dark:text-slate-200 cursor-pointer transition text-xs"
            @click="showDetail(item)">
            <td class="p-3 text-[#C4B0A5] dark:text-slate-500 font-mono text-[10px]">{{ idx + 1 }}</td>
            <td class="p-3">
              <div class="flex items-center gap-2">
                <div class="w-7 h-7 rounded-lg bg-[#FAF0DD] dark:bg-amber-950/20 flex items-center justify-center text-[10px] font-bold text-[#B5942B] dark:text-amber-400 flex-shrink-0">{{ (item.client_name||'?')[0] }}</div>
                <span class="font-semibold text-xs truncate max-w-[140px]">{{ item.client_name }}</span>
              </div>
            </td>
            <td class="p-3 hidden md:table-cell text-[#8A7A72] dark:text-slate-400 truncate max-w-[120px]">{{ item.university || '-' }}</td>
            <td class="p-3 font-medium">{{ item.package_name || '-' }}</td>
            <td class="p-3">
              <span class="font-medium">{{ item.graduation_date || '-' }}</span>
            </td>
            <td class="p-3 hidden lg:table-cell">
              <span :class="dpClass(item.dp_status)" class="text-[10px]">{{ item.dp_status }}</span>
            </td>
            <td class="p-3 hidden lg:table-cell">
              <span :class="dpClass(item.balance_status)" class="text-[10px]">{{ item.balance_status }}</span>
            </td>
            <td class="p-3 hidden md:table-cell">
              <div v-if="item.fg_name" class="flex flex-col gap-0.5">
                <span class="text-[9px] px-1.5 py-0.5 bg-[#FAF0DD] dark:bg-amber-950/20 rounded text-[#B5942B] dark:text-amber-400 font-semibold w-fit">{{ item.fg_name }}</span>
                <span v-if="item.assignment_status === 'assigned'" class="text-[8px] text-amber-500 animate-pulse font-medium">⏳ Menunggu Konfirmasi</span>
                <span v-else-if="item.assignment_status === 'confirmed'" class="text-[8px] text-green-600 font-medium">✓ Diterima</span>
              </div>
              <span v-else class="text-[#C4B0A5] dark:text-slate-500">-</span>
            </td>
            <td class="p-3">
              <span class="status-chip text-[9px]" :class="statusClass(item.status)">{{ getDetailedStatusLabel(item) }}</span>
            </td>
            <td class="p-3" @click.stop>
              <div class="flex items-center gap-1 flex-wrap">
                <button @click="showDetail(item)" class="px-1.5 py-1 rounded text-[9px] font-medium text-[#8A7A72] dark:text-slate-400 hover:bg-[#FFF0E8] dark:hover:bg-slate-800 transition">Detail</button>
                <button v-if="item.dp_status === 'uploaded' && item.balance_status === 'uploaded'" @click="openVerifyModal(item, 'dp')" class="px-1.5 py-1 rounded text-[9px] font-medium text-white bg-[#0f766e] hover:bg-[#0d6860] transition">✓ Lunas</button>
                <button v-else-if="item.dp_status === 'uploaded'" @click="openVerifyModal(item, 'dp')" class="px-1.5 py-1 rounded text-[9px] font-medium text-white bg-[#0f766e] hover:bg-[#0d6860] transition">✓ DP</button>
                <button v-if="(item.status === 'confirmed' || item.dp_status === 'uploaded') && !item.fg_name && item.dp_status === 'paid'" @click="openAssign(item)" class="px-1.5 py-1 rounded text-[9px] font-medium-[#B5942B] bg-[#FAF0DD] dark:bg-amber-950/20 hover:bg-[#FFE5DA] transition" title="Assign FG">👤</button>
                <button v-else-if="(item.status === 'confirmed' || item.dp_status === 'uploaded' || item.status === 'pending') && !item.fg_name && item.dp_status !== 'paid'" disabled class="px-1.5 py-1 rounded text-[9px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 opacity-60 cursor-not-allowed" title="Verifikasi DP terlebih dahulu sebelum Assign FG">🔒</button>
                <button v-if="item.status === 'confirmed' && item.fg_name" @click="setStatus(item, 'shooting')" class="px-1.5 py-1 rounded text-[9px] font-medium text-white bg-blue-600 hover:bg-blue-700 transition">📸</button>
                <button v-if="!(item.dp_status === 'uploaded' && item.balance_status === 'uploaded') && item.balance_status === 'uploaded'" @click="openVerifyModal(item, 'balance')" class="px-1.5 py-1 rounded text-[9px] font-medium text-white bg-[#0f766e] hover:bg-[#0d6860] transition">✓ Plns</button>
                <button v-if="item.status === 'shooting'" @click="setStatus(item, 'editing')" class="px-1.5 py-1 rounded text-[9px] font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition" title="Selesai Sesi Pemotretan">📸 Selesai</button>
                <button v-if="item.status === 'editing' || item.status === 'uploaded'" @click="router.push('/admin/deliverables')" class="px-1.5 py-1 rounded text-[9px] font-medium text-white bg-purple-600 hover:bg-purple-700 transition" title="Buka Post Production (Upload Staging & Seleksi Foto Client)">🎨 Post Prod</button>
                <button v-if="item.status === 'delivered'" @click="complete(item)" class="px-1.5 py-1 rounded text-[9px] font-medium text-white bg-green-600 hover:bg-green-700 transition">✅</button>
                <button @click.stop="deleteBooking(item)" class="px-1.5 py-1 rounded text-[9px] font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition" title="Hapus Client & Booking">🗑️</button>
              </div>
            </td>
          </tr>
          <tr v-if="data.length === 0">
            <td class="p-8 text-center text-[#C4B0A5] dark:text-slate-500" colspan="10">
              <span class="text-2xl block mb-1">📋</span>
              <span class="text-xs">Belum ada data client</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="data.length === 0 && !loading && viewMode === 'card'" class="text-center py-16 text-[#C4B0A5]">
      <span class="text-3xl block mb-2">📋</span>
      <p class="text-xs">Belum ada data client</p>
    </div>

    <!-- Detail Modal -->
    <div v-if="detailItem" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.6); backdrop-filter: blur(6px);" @click.self="detailItem=null">
      <div class="card w-full max-w-sm p-5 animate-pop relative max-h-[90vh] overflow-y-auto dark:bg-slate-900 dark:border-slate-800">
        <button @click="detailItem=null" class="absolute top-4 right-4 text-[#B8C6B8] hover:text-[#2D3A2E] dark:hover:text-slate-200">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
        <div class="flex items-center gap-3 mb-5">
          <div class="w-10 h-10 rounded-xl bg-[#FAF0DD] dark:bg-amber-950/20 flex items-center justify-center text-lg font-bold text-[#B5942B] dark:text-amber-400">{{ (detailItem.client_name||'?')[0] }}</div>
          <div>
            <h3 class="font-bold text-[#2D1B14] dark:text-slate-200">{{ detailItem.client_name }}</h3>
            <p class="text-xs text-[#C4B0A5]">{{ detailItem.university || '-' }}</p>
          </div>
          <span class="ml-auto status-chip" :class="statusClass(detailItem.status)">{{ detailItem.statusLabel || detailItem.status }}</span>
        </div>
        <dl class="space-y-2 text-sm text-[#475569] dark:text-slate-300">
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">WA</dt><dd class="font-medium text-[#2D1B14] dark:text-slate-200">{{ detailItem.client_phone }}</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">Paket</dt><dd class="text-[#2D1B14] dark:text-slate-200">{{ detailItem.package_name || '-' }}</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">Tgl Wisuda</dt><dd>{{ detailItem.graduation_date }}</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">Jam</dt><dd class="font-semibold text-[#2D1B14] dark:text-slate-200">{{ formatAmPm(detailItem.shooting_time) || '-' }}</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">Lokasi</dt><dd>{{ detailItem.location || '-' }}</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">Total</dt><dd class="font-semibold text-[#2D1B14] dark:text-slate-200">Rp {{ (detailItem.total_price||0).toLocaleString('id-ID') }}</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">DP</dt><dd class="font-medium">Rp {{ (detailItem.dp_amount||0).toLocaleString('id-ID') }} (<span :class="dpClass(detailItem.dp_status)">{{ detailItem.dp_status }}</span>)</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">Pelunasan</dt><dd class="font-medium">Rp {{ (detailItem.balance_amount||0).toLocaleString('id-ID') }} (<span :class="dpClass(detailItem.balance_status)">{{ detailItem.balance_status }}</span>)</dd></div>
          <div class="flex justify-between items-center border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5">
            <dt class="text-[#C4B0A5]">Token Tracking</dt>
            <dd class="flex items-center gap-2">
              <span class="font-mono text-xs font-bold text-[#C59B63] dark:text-amber-400 select-all">{{ detailItem.tracking_token || 'TRK-' + detailItem.id }}</span>
              <button @click="resetBookingToken(detailItem)" type="button" title="Reset Token & PIN Baru" class="text-[10px] font-semibold text-red-500 hover:underline flex items-center gap-0.5">
                🔄 Reset
              </button>
            </dd>
          </div>
          <div class="flex justify-between items-center border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5">
            <dt class="text-[#C4B0A5]">PIN Akses Drive</dt>
            <dd class="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 select-all">{{ detailItem.download_password || '-' }}</dd>
          </div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5" v-if="detailItem.fg_name">
            <dt class="text-[#C4B0A5]">FG</dt>
            <dd class="flex items-center gap-1.5">
              <span class="font-medium text-[#2d1b14] dark:text-slate-300">{{ detailItem.fg_name }}</span>
              <span v-if="detailItem.assignment_status === 'assigned'" class="text-[9px] text-amber-500 animate-pulse font-medium">⏳ Menunggu Konfirmasi</span>
              <span v-else-if="detailItem.assignment_status === 'confirmed'" class="text-[9px] text-green-600 font-medium">✓ Diterima</span>
               <a @click.prevent="sendFgPortalLink(detailItem)" href="#" class="text-blue-600 dark:text-blue-400 hover:underline text-[10px] font-semibold ml-1">
                💬 Kirim Portal
              </a>
            </dd>
          </div>
        </dl>
        
        <!-- Invoice & WA Links (Only shown if at least DP is paid) -->
        <div v-if="detailItem.dp_status === 'paid'" class="mt-4 p-3 bg-[#FAF6F0] dark:bg-slate-950 rounded-xl border border-[#E8D5C8]/60 dark:border-slate-800 space-y-2">
          <p class="text-[10px] text-[#C4B0A5] uppercase font-bold tracking-wider">Akses Cepat Admin</p>
          <div class="flex gap-2">
            <a :href="'/invoice.html?id=' + detailItem.id" target="_blank" class="flex-1 px-3 py-2 bg-[#FAF0DD] dark:bg-amber-950/20 text-[#B5942B] dark:text-amber-400 border border-[#FAF0DD]/80 rounded-lg text-center text-xs font-medium hover:bg-[#FFE5DA] transition">
              📄 Buka Invoice
            </a>
            <a :href="getWaConfirmLink(detailItem)" target="_blank" class="flex-1 px-3 py-2 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-900 rounded-lg text-center text-xs font-medium hover:bg-green-100 dark:hover:bg-green-950/40 transition">
              📤 Kirim WA Invoice
            </a>
          </div>
          <div class="flex gap-2">
            <a :href="'/tracking.html?code=' + encodeURIComponent(detailItem.tracking_token || detailItem.download_password || detailItem.id)" target="_blank" class="flex-1 px-3 py-2 bg-[#FAF6F0] dark:bg-slate-800 text-[#8A7A72] dark:text-slate-300 border border-[#E8D5C8]/80 dark:border-slate-700 rounded-lg text-center text-xs font-medium hover:bg-[#FFE5DA] transition">
              📍 Buka Tracking
            </a>
            <a :href="getWaTrackingLink(detailItem)" target="_blank" class="flex-1 px-3 py-2 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 rounded-lg text-center text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-950/40 transition">
              💬 Kirim WA Tracking
            </a>
          </div>
        </div>

        <div class="flex gap-2 mt-5">
          <button @click="deleteBooking(detailItem)" class="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1" title="Hapus Permanen">
            🗑️ Hapus Client
          </button>
          <button @click="detailItem=null" class="flex-1 px-4 py-2.5 bg-[#FFF0E8] dark:bg-slate-800 text-[#8A7A72] dark:text-slate-300 rounded-xl text-xs font-medium hover:bg-[#FFE5DA] transition">Tutup</button>
          <a :href="waAdminLink(detailItem)" target="_blank" class="flex-1 px-4 py-2.5 bg-[#0f766e] text-white rounded-xl text-xs font-medium hover:bg-[#0d6860] transition text-center flex items-center justify-center gap-1">💬 WA</a>
        </div>
      </div>
    </div>

    <!-- Verification Modal -->
    <div v-if="proofModalItem" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.6); backdrop-filter: blur(6px);" @click.self="proofModalItem=null">
      <div class="card w-full max-w-md p-5 animate-pop relative max-h-[90vh] overflow-y-auto dark:bg-slate-900 dark:border-slate-800">
        <button @click="proofModalItem=null" class="absolute top-4 right-4 text-[#B8C6B8] hover:text-[#2D3A2E] dark:hover:text-slate-200">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
        <h3 class="font-bold text-[#2D1B14] dark:text-slate-200 mb-1">🔍 Verifikasi Pembayaran ({{ proofModalType === 'dp' ? 'DP 50%' : 'Pelunasan' }})</h3>
        <p class="text-xs text-[#8A7A72] mb-3">— {{ proofModalItem.client_name }} ({{ proofModalItem.university || '-' }})</p>
        
        <!-- Rincian Tagihan & Nominal Verifikasi -->
        <div class="px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 mb-4 space-y-1.5 text-xs">
          <div class="flex justify-between items-center text-slate-700 dark:text-slate-300">
            <span>Nama Client:</span>
            <strong class="text-slate-900 dark:text-slate-100 font-semibold">{{ proofModalItem?.client_name }}</strong>
          </div>
          <div class="flex justify-between items-center pt-1 border-t border-amber-200/60 dark:border-amber-800/40 text-amber-900 dark:text-amber-200" v-if="proofModalType === 'dp'">
            <span class="font-bold uppercase tracking-wider text-[10px]">Nominal DP Wajib:</span>
            <strong class="font-mono text-sm text-emerald-700 dark:text-emerald-400 font-bold">
              Rp {{ Number(proofModalItem?.dp_amount || 0).toLocaleString('id-ID') }}
            </strong>
          </div>
          <div class="flex justify-between items-center pt-1 border-t border-amber-200/60 dark:border-amber-800/40 text-amber-900 dark:text-amber-200" v-else>
            <span class="font-bold uppercase tracking-wider text-[10px]">Sisa Nominal Pelunasan:</span>
            <strong class="font-mono text-sm text-emerald-700 dark:text-emerald-400 font-bold">
              Rp {{ Number(proofModalItem?.balance_amount || 0).toLocaleString('id-ID') }}
            </strong>
          </div>
        </div>

        <div class="mb-5">
          <label class="text-[10px] text-[#C4B0A5] block mb-1">Bukti Transfer</label>
          <div class="border border-[#E8D5C8] dark:border-slate-800 rounded-xl overflow-hidden bg-gray-50 dark:bg-slate-950 flex items-center justify-center min-h-[300px] max-h-[500px]">
            <iframe v-if="isPdf(proofUrl)" :src="proofUrl" class="w-full h-80" frameborder="0"></iframe>
            <img v-else :src="proofUrl" class="max-w-full max-h-[480px] object-contain" alt="Bukti Transfer" />
          </div>
        </div>

        <div class="flex gap-2">
          <button @click="proofModalItem=null" class="flex-1 px-4 py-2.5 bg-[#FFF0E8] dark:bg-slate-800 text-[#8A7A72] dark:text-slate-300 rounded-xl text-xs font-medium hover:bg-[#FFE5DA] transition">Batal</button>
          <button @click="submitVerification" class="flex-1 px-4 py-2.5 bg-[#0f766e] text-white rounded-xl text-xs font-semibold hover:bg-[#0d6860] transition">
            Verifikasi Sah ✓
          </button>
        </div>
      </div>
    </div>

    <!-- Assign FG Modal -->
    <div v-if="showAssign" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.6); backdrop-filter: blur(6px);" @click.self="showAssign=null">
      <div class="card w-full max-w-sm p-5 animate-pop dark:bg-slate-900 dark:border-slate-800">
        <h3 class="font-bold text-[#2D1B14] dark:text-slate-200">👤 Assign FG</h3>
        <p class="text-xs text-[#8A7A72] mb-4">— {{ assignItem.client_name }}</p>
        <form @submit.prevent="submitAssign" class="space-y-3">
          <div>
            <label class="text-[10px] text-[#C4B0A5] block mb-1.5">Pilih Fotografer</label>
            <select v-model="assignForm.fg_id" required class="input-fancy !text-xs dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" @change="onFgChange">
              <option value="">-- Pilih FG --</option>
              <option v-for="fg in fgList" :key="fg.id" :value="fg.id">{{ fg.name }} — {{ fg.phone }}</option>
            </select>
          </div>
          <!-- Info Ringkasan Pemotretan dari Client (Fixed/Read-only) -->
          <div class="p-3 bg-amber-50/70 dark:bg-slate-800/60 border border-amber-200/80 dark:border-slate-700/80 rounded-xl space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
            <div class="flex items-center justify-between text-[11px]">
              <span class="text-slate-500 dark:text-slate-400 font-medium">🕒 Jam Pemotretan:</span>
              <span class="font-bold text-amber-700 dark:text-amber-400 font-mono">{{ assignForm.shooting_time ? (assignForm.shooting_time + ' (' + formatAmPm(assignForm.shooting_time) + ')') : '-' }}</span>
            </div>
            <div class="flex items-center justify-between text-[11px]">
              <span class="text-slate-500 dark:text-slate-400 font-medium">⏳ Durasi Pemotretan:</span>
              <span class="font-bold text-slate-800 dark:text-slate-200 font-mono">{{ assignForm.duration_hours }} Jam</span>
            </div>
            <div class="flex items-center justify-between text-[11px]">
              <span class="text-slate-500 dark:text-slate-400 font-medium">📍 Lokasi Sesi Foto:</span>
              <span class="font-semibold text-slate-800 dark:text-slate-200">{{ assignForm.location || '-' }}</span>
            </div>
          </div>

          <textarea v-model="assignForm.brief" rows="2" class="input-fancy resize-none dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="Brief untuk FG..."></textarea>
          <!-- Fee Custom -->
          <div>
            <label class="text-[10px] text-[#C4B0A5] dark:text-slate-400 block mb-1 font-bold uppercase tracking-wider">Fee Freelance (Rp)</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8A7A72] dark:text-slate-400">Rp</span>
              <input v-model="fgFeeDisplay" @input="onFgFeeInput" type="text" placeholder="0" class="input-fancy !pl-9 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 font-bold text-amber-600 dark:text-amber-400">
            </div>
            <p class="text-[9px] text-[#8A7A72] dark:text-slate-400 mt-1">{{ selectedFgHint }}</p>
          </div>
          <div v-if="assignResult" class="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3.5 space-y-2 animate-fade-in">
            <div class="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
              <span>🟢</span>
              <span>Job Diterbitkan ke Portal Freelance!</span>
            </div>
            <p class="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
              Tugas telah dikirim ke portal fotografer. Status saat ini: <strong>Menunggu Konfirmasi FG (Pending)</strong>.
            </p>
            <div class="flex flex-col gap-1.5 pt-1">
              <a :href="assignResult.wa_link" target="_blank" class="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-semibold transition flex items-center justify-center gap-1 shadow-sm">
                💬 Kirim Undangan Job via WhatsApp
              </a>
              <button type="button" @click="copyPortalLink(assignResult.portal_url)" class="w-full py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-semibold hover:bg-slate-50 transition">
                📋 Salin Direct Link Portal
              </button>
            </div>
          </div>
          <div class="flex gap-2 pt-1">
            <button type="button" @click="showAssign=null; assignResult=null" 
              :class="assignResult ? 'bg-[#0f766e] text-white font-semibold hover:bg-[#0d6860]' : 'bg-[#FFF0E8] dark:bg-slate-800 text-[#8A7A72] dark:text-slate-300 hover:bg-[#FFE5DA]'"
              class="flex-1 px-4 py-2.5 rounded-xl text-xs font-medium transition">
              {{ assignResult ? 'OK / Selesai' : 'Batal' }}
            </button>
            <button v-if="!assignResult" type="submit" :disabled="!assignForm.fg_id" class="flex-1 px-4 py-2.5 bg-[#0f766e] text-white rounded-xl text-xs font-semibold disabled:opacity-40 hover:bg-[#0d6860] transition">Assign</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Deliver Modal -->
    <div v-if="showDeliver" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.6); backdrop-filter: blur(6px);" @click.self="showDeliver=null">
      <div class="card w-full max-w-sm p-5 animate-pop dark:bg-slate-900 dark:border-slate-800">
        <h3 class="font-bold text-[#2D1B14] dark:text-slate-200">📦 Kirim Hasil</h3>
        <p class="text-xs text-[#8A7A72] mb-4">— {{ deliverItem.client_name }}</p>
        <form @submit.prevent="submitDeliver" class="space-y-3">
          <input v-model="deliverForm.download_url" type="url" required class="input-fancy dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="https://drive.google.com/...">
          <input v-model="deliverForm.password" class="input-fancy dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="Password (auto jika kosong)">
          <div v-if="deliverResult" class="bg-[#FAF0DD] dark:bg-amber-950/20 rounded-xl p-3">
            <p class="text-[#B5942B] dark:text-amber-400 font-medium text-xs">✅ Hasil terkirim!</p>
            <a :href="deliverResult.wa_link_client" target="_blank" class="text-[#B5942B] dark:text-amber-400 text-[10px] underline mt-1 inline-block">💬 WA client</a>
          </div>
          <div class="flex gap-2 pt-1">
            <button type="button" @click="showDeliver=null; deliverResult=null" class="flex-1 px-4 py-2.5 bg-[#FFF0E8] dark:bg-slate-800 text-[#8A7A72] dark:text-slate-300 rounded-xl text-xs font-medium hover:bg-[#FFE5DA] transition">Tutup</button>
            <button v-if="!deliverResult" type="submit" :disabled="!deliverForm.download_url" class="flex-1 px-4 py-2.5 bg-[#0f766e] text-white rounded-xl text-xs font-semibold disabled:opacity-40 hover:bg-[#0d6860] transition">Kirim →</button>
          </div>
        </form>
      </div>
    </div>
    <!-- Verification Success Modal -->
    <div v-if="verificationResult" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.6); backdrop-filter: blur(6px);" @click.self="verificationResult=null">
      <div class="card w-full max-w-sm p-5 animate-pop dark:bg-slate-900 dark:border-slate-800 text-center">
        <div class="w-16 h-16 bg-green-50 dark:bg-green-950/20 text-[#0f766e] dark:text-green-400 rounded-3xl flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
        <h3 class="font-bold text-[#2D1B14] dark:text-slate-200 text-base mb-1">Verifikasi Berhasil!</h3>
        <p class="text-xs text-[#8A7A72] dark:text-slate-400 mb-5">Pembayaran client telah diverifikasi sah. Invoice pembayaran telah berhasil diterbitkan.</p>
        
        <div class="space-y-2.5 mb-5">
          <a :href="verificationResult.invoice_url" target="_blank" class="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#FAF0DD] dark:bg-amber-950/20 text-[#B5942B] dark:text-amber-400 border border-[#FAF0DD] rounded-xl text-xs font-semibold hover:bg-[#FFE5DA] transition">
            📄 Lihat / Cetak Invoice
          </a>
          <a :href="verificationResult.wa_link" target="_blank" class="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#0f766e] text-white rounded-xl text-xs font-semibold hover:bg-[#0d6860] transition">
            💬 Kirim Invoice via WhatsApp
          </a>
        </div>
        
        <button @click="verificationResult=null" class="w-full py-2 text-xs text-[#C4B0A5] hover:text-[#8A7A72] transition font-medium">Tutup</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const API = '/api/admin'
const data = ref([])
const loading = ref(true)
const filterStatus = ref('')
const searchQ = ref('')
const viewMode = ref(localStorage.getItem('client_view_mode') || 'card')
const statuses = ['pending', 'confirmed', 'shooting', 'delivered']

function setViewMode(mode) {
  viewMode.value = mode
  localStorage.setItem('client_view_mode', mode)
}
const detailItem = ref(null)
const showAssign = ref(null)
const assignItem = ref(null)
const assignForm = ref({ fg_id: '', shooting_time: '', duration_hours: 2, location: '', brief: '', fg_fee: '' })
const assignResult = ref(null)
const fgList = ref([])
const showDeliver = ref(null)
const deliverItem = ref(null)
const deliverForm = ref({ download_url: '', password: '' })
const deliverResult = ref(null)

// Verification Modal State
const proofModalItem = ref(null)
const proofModalType = ref('')
const proofUrl = ref('')
const verificationResult = ref(null)

function isPdf(url) {
  return url && url.toLowerCase().endsWith('.pdf')
}

function openVerifyModal(item, type) {
  const url = type === 'dp' ? item.dp_bukti_url : item.balance_bukti_url
  if (url) {
    proofModalItem.value = item
    proofModalType.value = type
    proofUrl.value = url
  } else {
    if (confirm(`Verifikasi pembayaran ${type === 'dp' ? 'DP 50%' : 'Pelunasan'} secara manual untuk ${item.client_name}?`)) {
      verifyManual(item, type)
    }
  }
}

async function verifyManual(item, type) {
  const endpoint = type === 'dp' ? 'verify-dp' : 'verify-balance'
  const body = type === 'dp' 
    ? { dp_bukti_url: '', dp_amount: item.dp_amount } 
    : { balance_bukti_url: '' }
  try {
    const r = await fetch(`${API}/bookings/${item.id}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body)
    })
    const d = await r.json()
    if (d.booking || d.status === 'ok') {
      verificationResult.value = {
        booking: d.booking,
        invoice_url: d.invoice_url,
        wa_link: d.wa_link || d.wa_link_client
      }
      // Auto open client WA link
      const link = d.wa_link || d.wa_link_client
      if (link) {
        window.open(link, '_blank')
      }
      load()
    } else {
      alert(d.error || 'Verifikasi manual gagal')
    }
  } catch (e) {
    alert('Error: ' + e.message)
  }
}

async function submitVerification() {
  const item = proofModalItem.value
  const type = proofModalType.value
  const endpoint = type === 'dp' ? 'verify-dp' : 'verify-balance'
  const body = type === 'dp' 
    ? { dp_bukti_url: item.dp_bukti_url, dp_amount: item.dp_amount } 
    : { balance_bukti_url: item.balance_bukti_url }
    
  try {
    const r = await fetch(`${API}/bookings/${item.id}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body)
    })
    const d = await r.json()
    if (d.booking || d.status === 'ok') {
      proofModalItem.value = null
      verificationResult.value = {
        booking: d.booking,
        invoice_url: d.invoice_url,
        wa_link: d.wa_link || d.wa_link_client
      }
      // Auto open client WA link
      const link = d.wa_link || d.wa_link_client
      if (link) {
        window.open(link, '_blank')
      }
      load()
    } else {
      alert(d.error || 'Verifikasi gagal')
    }
  } catch (e) {
    alert('Error: ' + e.message)
  }
}

async function load(silent = false) {
  if (!silent) loading.value = true
  try {
    let url = `${API}/bookings?limit=50`
    if (filterStatus.value) url += '&status=' + filterStatus.value
    if (searchQ.value) url += '&search=' + encodeURIComponent(searchQ.value)
    const r = await fetch(url, { credentials: 'include' })
    const d = await r.json()
    data.value = d.data || []
    if (detailItem.value) {
      const updated = data.value.find(b => b.id === detailItem.value.id)
      if (updated) detailItem.value = updated
    }
  } catch {}
  if (!silent) loading.value = false
}

let timer = null
onMounted(() => {
  load()
  timer = setInterval(() => load(true), 3000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

function showDetail(item) { detailItem.value = item }

function formatAmPm(timeStr) {
  if (!timeStr) return ''
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return timeStr
  let hours = parseInt(match[1], 10)
  const minutes = match[2]
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  hours = hours ? hours : 12
  const strHours = hours < 10 ? '0' + hours : hours
  return `${strHours}:${minutes} ${ampm}`
}

const fgFeeDisplay = ref('')

function onFgFeeInput() {
  let raw = fgFeeDisplay.value.replace(/[^0-9]/g, '')
  const num = parseInt(raw || '0', 10)
  assignForm.value.fg_fee = num > 0 ? num : ''
  fgFeeDisplay.value = num > 0 ? num.toLocaleString('id-ID') : ''
}

async function openAssign(item) {
  assignItem.value = item
  const initialDuration = item.duration_hours || 1
  const initialBrief = item.notes ? `[Catatan Client]: ${item.notes}` : ''
  assignForm.value = { fg_id: '', shooting_time: item.shooting_time || '', duration_hours: initialDuration, location: item.location || '', brief: initialBrief, fg_fee: '' }
  fgFeeDisplay.value = ''
  assignResult.value = null
  showAssign.value = item
  try {
    const r = await fetch(`${API}/freelancers?active=true&limit=50`, { credentials: 'include' })
    const d = await r.json()
    fgList.value = d.data || []
  } catch {}
}

function onFgChange() {
  // Auto-suggest rate based on rate_per_hour * duration_hours but let admin override
  const selected = fgList.value.find(fg => fg.id == assignForm.value.fg_id)
  if (selected && selected.default_rate > 0) {
    const hours = parseInt(assignForm.value.duration_hours) || 1
    const totalFee = selected.default_rate * hours
    assignForm.value.fg_fee = totalFee
    fgFeeDisplay.value = totalFee.toLocaleString('id-ID')
  }
}

const selectedFgRate = computed(() => {
  const fg = fgList.value.find(f => f.id == assignForm.value.fg_id)
  if (!fg) return 'Pilih FG terlebih dahulu'
  if (fg.default_rate > 0) return `Rp ${fg.default_rate.toLocaleString('id-ID')}/Jam (rate default FG)`
  return 'Kosongkan untuk pakai rate paket'
})

const selectedFgHint = computed(() => {
  const fg = fgList.value.find(f => f.id == assignForm.value.fg_id)
  if (!fg) return ''
  const hours = parseInt(assignForm.value.duration_hours) || 1
  if (fg.default_rate > 0) {
    const totalFee = fg.default_rate * hours
    return `💡 Rate FG: Rp ${fg.default_rate.toLocaleString('id-ID')}/Jam × ${hours} Jam = Rp ${totalFee.toLocaleString('id-ID')}`
  }
  return 'Rate default dari paket akan dipakai jika dikosongkan'
})

async function submitAssign() {
  try {
    const r = await fetch(`${API}/bookings/${assignItem.value.id}/assign-fg`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({
        fg_id: assignForm.value.fg_id,
        shooting_time: assignForm.value.shooting_time,
        duration_hours: parseInt(assignForm.value.duration_hours) || 1,
        location: assignForm.value.location,
        brief: assignForm.value.brief,
        fg_fee: assignForm.value.fg_fee !== '' ? parseInt(assignForm.value.fg_fee) : undefined
      })
    })
    const d = await r.json()
    if (d.assignment) {
      assignResult.value = d
      load()
    } else {
      const errMsg = d.details && Array.isArray(d.details) ? d.details.map(e => e.msg).join(', ') : (d.error || 'Gagal assign FG')
      alert(errMsg)
    }
  } catch (err) {
    alert('Terjadi kesalahan jaringan: ' + err.message)
  }
}

function copyPortalLink(url) {
  if (!url) return
  navigator.clipboard.writeText(url)
  alert('Direct link portal freelance berhasil disalin!')
}

async function setStatus(item, s) {
  if (!confirm(`Set status ke "${s}"?`)) return
  try {
    const r = await fetch(`${API}/bookings/${item.id}/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ status: s }) })
    const d = await r.json()
    if (d.status === 'ok') load()
    else alert(d.error)
  } catch {}
}

function openDeliver(item) {
  deliverItem.value = item
  deliverForm.value = { download_url: '', password: '' }
  deliverResult.value = null
  showDeliver.value = item
}

async function submitDeliver() {
  try {
    const r = await fetch(`${API}/bookings/${deliverItem.value.id}/deliver`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ download_url: deliverForm.value.download_url, password: deliverForm.value.password })
    })
    const d = await r.json()
    if (d.status === 'delivered') { deliverResult.value = d; load() }
    else { alert(d.error || 'Gagal') }
  } catch {}
}

async function complete(item) {
  if (!confirm(`Tandai selesai untuk ${item.client_name}?`)) return
  try {
    const r = await fetch(`${API}/bookings/${item.id}/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ status: 'completed' }) })
    const d = await r.json()
    if (d.status === 'ok') load()
    else alert(d.error)
  } catch {}
}

function getDetailedStatusLabel(item) {
  if (item.status === 'pending') return 'Menunggu Verifikasi DP'
  if (item.status === 'confirmed') {
    if (!item.fg_name) return 'Menunggu Assignment FG'
    if (item.assignment_status === 'assigned') return 'FG Ditugaskan (Menunggu Konfirmasi)'
    if (item.assignment_status === 'confirmed') return 'FG Siap'
  }
  if (item.status === 'shooting') return 'Sesi Foto Berlangsung'
  if (item.status === 'editing') return 'Post Production (Editing)'
  if (item.status === 'delivered') return 'Hasil Foto Terkirim'
  if (item.status === 'completed') return 'Selesai'
  if (item.status === 'cancelled') return 'Dibatalkan'
  return item.status
}

function statusClass(s) {
  const map = {
    pending: 'bg-[#FFF7ED] text-[#C2410C] dark:bg-amber-950/20 dark:text-amber-500',
    confirmed: 'bg-[#EDF2EB] text-[#2E7D32] dark:bg-green-950/20 dark:text-green-400',
    shooting: 'bg-[#FFF7ED] text-[#C2410C] dark:bg-amber-950/20 dark:text-amber-500',
    editing: 'bg-[#EFF6FF] text-[#1E40AF] dark:bg-blue-950/20 dark:text-blue-400',
    delivered: 'bg-[#EDF2EB] text-[#2E7D32] dark:bg-green-950/20 dark:text-green-400',
    completed: 'bg-[#D1E8CF] text-[#4A7A4A] dark:bg-green-900/20 dark:text-green-400',
    cancelled: 'bg-[#FEF2F2] text-[#EF4444] dark:bg-red-950/20 dark:text-red-400'
  }
  return map[s] || 'bg-[#F0F5EE] text-[#B8C6B8]'
}

function dpClass(s) {
  const map = { 
    unpaid: 'text-[#C4B0A5] dark:text-slate-500', 
    paid: 'text-green-600 dark:text-green-400 font-semibold', 
    refunded: 'text-red-500 dark:text-red-400', 
    uploaded: 'text-yellow-600 dark:text-yellow-400 font-semibold animate-pulse' 
  }
  return map[s] || 'text-[#B8C6B8]'
}

function waAdminLink(item) {
  if (!item) return '#'
  const msg = `Halo Kak ${item.client_name}, saya admin dari ${authStore.companyName}. Saya ingin menghubungi Kakak untuk konfirmasi detail sesi foto wisuda kamu untuk tanggal ${item.graduation_date} di ${item.location || '-'}. 😊`
  return `https://api.whatsapp.com/send?phone=${item.client_phone}&text=${encodeURIComponent(msg)}`
}

function getWaConfirmLink(item) {
  if (!item) return '#'
  const invoiceUrl = `http://${window.location.host}/invoice.html?id=${item.id}`
  const trackingUrl = `http://${window.location.host}/tracking.html?id=${item.id}`
  
  let msg = ''
  const isFullyPaid = item.dp_status === 'paid' && item.balance_status === 'paid';
  
  if (isFullyPaid) {
    msg = `✅ Pelunasan Terverifikasi\n\nInvoice pelunasan: ${invoiceUrl}\n\nTerima kasih atas kepercayaannya bersama ${authStore.companyName}!\n\nLacak status & progres foto wisuda kamu di sini:\n${trackingUrl}`;
  } else {
    msg = `DP Terverifikasi ✅\n\nInvoice kamu: ${invoiceUrl}\n\nFG akan diassign H-3 sebelum shoot.\n\nLacak status & progres foto wisuda kamu di sini:\n${trackingUrl}`;
  }
  
  return `https://api.whatsapp.com/send?phone=${item.client_phone}&text=${encodeURIComponent(msg)}`
}

function getWaFgPortalLink(item) {
  if (!item || !item.fg_phone) return '#'
  const portalUrl = `http://${window.location.host}/freelance-portal.html?code=${item.fg_code}`
  const msg = `Halo ${item.fg_name || 'FG'},\n\nBerikut adalah link portal jadwal wisuda kamu untuk client ${item.client_name}:\n${portalUrl}\n\nSilakan buka portal untuk menerima jadwal/penugasan kamu. Terima kasih!`
  return `https://api.whatsapp.com/send?phone=${item.fg_phone}&text=${encodeURIComponent(msg)}`
}

async function sendFgPortalLink(item) {
  if (!item || !item.fg_phone) return
  
  // Buka window kosong secara sinkron terlebih dahulu untuk menghindari pemblokir popup browser
  const newWindow = window.open('about:blank', '_blank')
  if (newWindow) {
    newWindow.document.write('<p style="font-family: sans-serif; font-size: 14px; text-align: center; margin-top: 50px;">Menghubungkan ke WhatsApp...</p>')
  }
  
  try {
    // Tarik data booking terbaru secara dinamis dari database untuk mendapatkan kode unik ter-update
    const r = await fetch(`${API}/bookings?search=${encodeURIComponent(item.client_name)}`, { credentials: 'include' })
    const d = await r.json()
    const latestBooking = d.data ? d.data.find(b => b.id === item.id) : null
    
    const fg_code = latestBooking ? latestBooking.fg_code : item.fg_code
    const fg_name = latestBooking ? latestBooking.fg_name : item.fg_name
    const fg_phone = latestBooking ? latestBooking.fg_phone : item.fg_phone
    
    const portalUrl = `http://${window.location.host}/freelance-portal.html?code=${fg_code}`
    const msg = `Halo Kak ${fg_name || 'FG'},\n\nBerikut adalah link portal freelance Anda untuk memantau jadwal dan progres foto wisuda:\n${portalUrl}\n\nLink ini sudah otomatis login ke akun Anda. Terima kasih!`
    const waLink = `https://api.whatsapp.com/send?phone=${fg_phone}&text=${encodeURIComponent(msg)}`
    
    if (newWindow) {
      newWindow.location.href = waLink
    } else {
      window.open(waLink, '_blank')
    }
  } catch (e) {
    console.error(e)
    if (newWindow) newWindow.close()
    alert('Gagal memuat kode unik fotografer terbaru.')
  }
}

function getWaTrackingLink(item) {
  if (!item) return '#'
  const token = item.tracking_token || item.download_password || item.id
  const trackingUrl = `http://${window.location.host}/tracking.html?code=${encodeURIComponent(token)}`
  const msg = `Halo Kak ${item.client_name},\n\nBerikut adalah link untuk memantau status dan progres sesi foto wisuda kamu bersama ${authStore.companyName}:\n${trackingUrl}\n\nTerima kasih!`
  return `https://api.whatsapp.com/send?phone=${item.client_phone}&text=${encodeURIComponent(msg)}`
}

async function deleteBooking(item) {
  if (!item) return
  if (!confirm(`Apakah Anda yakin ingin menghapus data client '${item.client_name}' (Booking #${item.id}) secara permanen? Seluruh data booking, invoice, bukti bayar, dan penugasan fotografer akan dihapus bersih tanpa sisa.`)) return

  try {
    const res = await fetch(`${API}/bookings/${item.id}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    const d = await res.json()
    if (!res.ok) {
      alert(d.error || 'Gagal menghapus client')
      return
    }
    alert(d.message || 'Data client berhasil dihapus bersih!')
    detailItem.value = null
    await load()
  } catch (e) {
    console.error('Delete booking error:', e)
    alert('Terjadi kesalahan koneksi.')
  }
}

async function resetBookingToken(item) {
  if (!item) return
  if (!confirm(`Reset token & PIN tracking untuk ${item.client_name}? Token lama akan hangus dan dibuatkan link baru.`)) return

  try {
    const res = await fetch(`${API}/bookings/${item.id}/reset-token`, {
      method: 'POST',
      credentials: 'include'
    })
    const d = await res.json()
    if (res.ok && d.tracking_token) {
      item.tracking_token = d.tracking_token
      item.download_password = d.download_password
      if (detailItem.value && detailItem.value.id === item.id) {
        detailItem.value.tracking_token = d.tracking_token
        detailItem.value.download_password = d.download_password
      }
      alert(`Token berhasil direset!\nToken Baru: ${d.tracking_token}\nPIN Baru: ${d.download_password}`)
      await load(true)
    } else {
      alert(d.error || 'Gagal mereset token.')
    }
  } catch (e) {
    alert('Terjadi kesalahan koneksi.')
  }
}
</script>
