<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-5">
      <div>
        <h2 class="text-xl font-bold text-[#2D1B14] dark:text-slate-200 tracking-tight">Client</h2>
        <p class="text-[10px] text-[#8A7A72] dark:text-slate-400 mt-0.5">Kelola booking aktif — dari verifikasi DP hingga sesi foto selesai di lapangan</p>
      </div>
      <div class="flex items-center gap-2">
        <button v-if="rescheduleRequests.length > 0" @click="showRescheduleInbox = true" class="px-3 py-1.5 bg-amber-500/15 border border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 animate-pulse shadow-sm cursor-pointer">
          <span>📅 Permohonan Reschedule</span>
          <span class="px-1.5 py-0.5 bg-amber-600 text-white text-[9px] rounded-full font-extrabold">{{ rescheduleRequests.length }}</span>
        </button>

        <!-- View Toggle -->
        <div class="flex bg-white dark:bg-slate-900 border border-[#E8D5C8] dark:border-slate-800 rounded-lg overflow-hidden">
          <button @click="setViewMode('card')" :class="viewMode === 'card' ? 'bg-[#2D1B14] dark:bg-amber-950/40 text-[#D4AF37]' : 'text-[#C4B0A5] hover:text-[#8A7A72] dark:hover:text-slate-300'" class="p-1.5 transition" title="Tampilan Card">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
          </button>
          <button @click="setViewMode('list')" :class="viewMode === 'list' ? 'bg-[#2D1B14] dark:bg-amber-950/40 text-[#D4AF37]' : 'text-[#C4B0A5] hover:text-[#8A7A72] dark:hover:text-slate-300'" class="p-1.5 transition" title="Tampilan List">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
          </button>
        </div>
        <select v-model="filterStatus" class="input-fancy !w-56 !py-1.5 !text-[11px] font-semibold appearance-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200" style="background-image: url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%23C4B0A5' stroke-width='2'%3E%3Cpath d='M3 4.5l3 3 3-3'/%3E%3C/svg%3E&quot;); background-repeat: no-repeat; background-position: right 8px center; padding-right: 28px;">
          <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-16">
      <div class="loading-spinner animate-spin"></div>
    </div>

    <!-- Cards View -->
    <div v-else-if="viewMode === 'card'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      <div v-for="item in sortedBookings" :key="item.id"
        class="card group p-4 transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer dark:bg-slate-900 dark:border-slate-800 relative"
        @click="showDetail(item)">
        <div class="flex items-start justify-between mb-2.5">
          <div class="flex items-center gap-2.5">
            <input type="checkbox" :value="item.id" v-model="selectedBookingIds" @click.stop
                   class="w-4 h-4 rounded border-slate-300 dark:border-slate-700/70 bg-transparent text-amber-600 focus:ring-amber-500/30 focus:ring-offset-0 cursor-pointer transition-all duration-200"
                   :class="selectedBookingIds.length > 0 ? 'opacity-100' : 'opacity-30 group-hover:opacity-100 hover:opacity-100 checked:opacity-100'">
            <div class="w-9 h-9 rounded-xl bg-[#FAF0DD] dark:bg-amber-950/20 flex items-center justify-center text-sm font-bold text-[#B5942B] dark:text-amber-400 flex-shrink-0">{{ (item.client_name||'?')[0] }}</div>
            <div>
              <p class="text-sm font-semibold text-[#2D1B14] dark:text-slate-200 leading-tight truncate max-w-[120px]">{{ item.client_name }}</p>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span class="text-[10px] text-[#C4B0A5] truncate max-w-[100px]" :title="item.university">{{ item.university || '-' }}</span>
                <span class="text-[8px] px-1 py-0.2 rounded font-medium flex items-center gap-0.5 animate-fade-in"
                      :class="item.drive_parent_url ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-450 border border-emerald-250' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-450 border border-rose-250'">
                  📁 {{ item.drive_parent_url ? 'Set' : 'Empty' }}
                </span>
              </div>
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
          <div class="flex justify-between" v-if="item.shooting_time || item.duration_hours">
            <span>Sesi Foto</span>
            <span class="font-medium text-[#2D1B14] dark:text-slate-200">
              {{ item.shooting_time ? item.shooting_time : 'Jam -' }} · {{ item.duration_hours || 2 }} Jam
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span>Pembayaran</span>
            <span class="status-chip text-[9px] px-2 py-0.5" :class="paymentStatusClass(item)">
              {{ getPaymentStatusLabel(item) }}
            </span>
          </div>
          <div class="flex justify-between" v-if="item.fg_name">
            <span>FG</span>
            <div class="flex flex-col items-end gap-0.5">
              <span class="text-[9px] px-1.5 py-0.5 bg-[#FAF0DD] dark:bg-amber-950/20 rounded text-[#B5942B] dark:text-amber-400 font-semibold">{{ item.fg_name }}</span>
              <span class="text-[8px] text-green-600 font-medium">✓ Ditugaskan</span>
            </div>
          </div>
        </div>

        <!-- In-Card Reschedule Alert Banner -->
        <div v-if="getPendingReschedule(item.id)" 
             class="mt-2.5 p-2.5 bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/40 rounded-xl space-y-1.5 animate-pulse"
             @click.stop>
          <div class="flex items-center justify-between">
            <span class="text-[9px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <span>📅</span> Permohonan Reschedule
            </span>
            <span class="text-[8px] px-1.5 py-0.2 rounded font-bold"
                  :class="getPendingReschedule(item.id).is_conflicting ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-450' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-450'">
              {{ getPendingReschedule(item.id).is_conflicting ? '🔴 FG Bentrok' : '🟢 FG Bebas' }}
            </span>
          </div>
          <div class="text-[10px] text-[#2D1B14] dark:text-slate-200">
            <span class="text-[#8A7A72] dark:text-slate-400 line-through mr-1">{{ getPendingReschedule(item.id).old_graduation_date }} ({{ getPendingReschedule(item.id).old_shooting_time || '09:00' }})</span>
            ➜ <strong class="text-amber-600 dark:text-amber-400">{{ getPendingReschedule(item.id).new_graduation_date }} ({{ getPendingReschedule(item.id).new_shooting_time }})</strong>
          </div>
          <p v-if="getPendingReschedule(item.id).reason" class="text-[9px] text-[#8A7A72] dark:text-slate-400 italic truncate">
            "{{ getPendingReschedule(item.id).reason }}"
          </p>
          <div class="flex gap-1.5 pt-1">
            <button @click="rejectReschedule(getPendingReschedule(item.id))" 
                    :disabled="submittingAction === getPendingReschedule(item.id).id" 
                    class="flex-1 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-[9px] font-bold transition">
              ✕ Tolak
            </button>
            <button @click="approveReschedule(getPendingReschedule(item.id))" 
                    :disabled="submittingAction === getPendingReschedule(item.id).id" 
                    class="flex-1 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-bold transition shadow-sm flex items-center justify-center gap-1">
              <span>✓ Setujui</span>
            </button>
          </div>
        </div>

        <div class="flex gap-1.5 mt-3 pt-2.5 border-t border-[#E8D5C8]/60 dark:border-slate-800" @click.stop>
          <!-- Verification Buttons -->
          <!-- 1. Tahap Verifikasi Awal (Lunas 100% Upfront atau DP) -->
          <button v-if="item.dp_status === 'uploaded' && item.balance_status === 'uploaded'" 
            @click="openVerifyModal(item, 'dp')" 
            class="flex-1 px-2 py-1.5 rounded-lg text-[9px] font-medium transition text-white bg-[#0f766e] hover:bg-[#0d6860]">
            ✓ Verifikasi Lunas
          </button>
          
          <button v-else-if="item.dp_status === 'uploaded'"
            @click="openVerifyModal(item, 'dp')" 
            class="flex-1 px-2 py-1.5 rounded-lg text-[9px] font-medium transition text-white bg-[#0f766e] hover:bg-[#0d6860]">
            ✓ DP
          </button>
          
          <!-- 2. Tahap Assign FG (Belum ada FG) -->
          <button v-else-if="(item.status === 'confirmed' || item.dp_status === 'uploaded') && !item.fg_name && item.dp_status === 'paid' && item.drive_parent_url" 
            @click="openAssign(item)" 
            class="flex-1 px-2 py-1.5 rounded-lg text-[9px] font-medium transition text-[#8A7A72] bg-[#FAF0DD] dark:bg-amber-950/20 text-[#B5942B] dark:text-amber-400 hover:bg-[#FFE5DA]">
            👤 Assign
          </button>
          
          <button v-else-if="!item.fg_name && item.dp_status !== 'paid'" 
            disabled 
            class="flex-1 px-2 py-1.5 rounded-lg text-[9px] font-medium transition text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 cursor-not-allowed opacity-60 flex items-center justify-center gap-1" 
            title="Verifikasi DP terlebih dahulu sebelum Assign FG">
            🔒 Assign (DP Pending)
          </button>
          
          <button v-else-if="!item.fg_name && item.dp_status === 'paid' && !item.drive_parent_url" 
            @click="openDriveMapping(item)" 
            class="flex-1 px-2 py-1.5 rounded-lg text-[9px] font-medium transition text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 dark:bg-rose-950/20 dark:border-rose-900 cursor-pointer flex items-center justify-center gap-1" 
            title="Mapping folder Google Drive terlebih dahulu sebelum Assign FG (Klik untuk isi)">
            🔒 Assign (Drive Empty)
          </button>

          <!-- 3. Tahap Siap Shoot (FG sudah ada & status confirmed) -->
          <button v-else-if="item.status === 'confirmed' && item.fg_name" 
            @click="setStatus(item, 'shooting')" 
            class="flex-1 px-2 py-1.5 rounded-lg text-[9px] font-medium transition text-white bg-blue-600 hover:bg-blue-700">
            📸 Shoot
          </button>
          
          <!-- 4. Tahap Sesi Sedang Berlangsung (status shooting & sesi belum selesai) -> HANYA TOMBOL SELESAI SHOOT -->
          <button v-else-if="item.status === 'shooting' && !item.is_session_done" 
            @click="markShootDone(item)" 
            class="flex-1 px-2 py-1.5 rounded-lg text-[9px] font-medium transition text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer" 
            title="Tandai sesi pemotretan di lapangan telah selesai">
            📸 Selesai Shoot
          </button>

          <!-- 5. Tahap Selesai Shoot & Menunggu Pelunasan (Hanya jika is_session_done = 1 & belum lunas) -->
          <!-- 5a. Klien SUDAH upload bukti pelunasan (Warna Amber/Kuning Berkedip) -->
          <button v-else-if="item.is_session_done && item.balance_status === 'uploaded'" 
            @click="openVerifyModal(item, 'balance')" 
            class="flex-1 px-2 py-1.5 rounded-lg text-[9px] font-bold transition text-white bg-amber-500 hover:bg-amber-600 animate-pulse shadow-sm"
            title="Klien telah mengunggah bukti pelunasan. Klik untuk memverifikasi.">
            🔍 Verifikasi Pelunasan
          </button>
          
          <!-- 5b. Sesi Selesai & Klien BELUM upload bukti pelunasan (Terkunci / Disabled) -->
          <button v-else-if="item.is_session_done && item.balance_status !== 'paid' && Number(item.balance_amount || 0) > 0" 
            disabled
            class="flex-1 px-2 py-1.5 rounded-lg text-[9px] font-medium transition text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 cursor-not-allowed opacity-70 flex items-center justify-center gap-1 select-none"
            title="Terkunci: Klien belum mengunggah bukti transfer pelunasan">
            ⏳ Menunggu Pelunasan
          </button>
          
          <!-- 6. Tahap Post Production (Sudah Lunas & Sesi Selesai) -->
          <a v-else-if="item.status === 'post_production'" href="/admin/deliverables"
            class="flex-1 px-2 py-1.5 rounded-lg text-[9px] font-medium transition text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 hover:bg-purple-100 text-center flex items-center justify-center gap-0.5"
            title="Lihat di halaman Post Production">
            🎨 Di Post Pro →
          </a>

          <!-- 7. Tahap Delivered / Selesai -->
          <button v-else-if="item.status === 'delivered'" @click="complete(item)" class="flex-1 px-2 py-1.5 rounded-lg text-[9px] font-medium transition text-white bg-green-600 hover:bg-green-700">✅ Selesai</button>
        </div>
      </div>
    </div>

    <!-- List View -->
    <div v-else-if="viewMode === 'list' && !loading" class="space-y-4">
      <!-- Desktop List Table (Hidden on Mobile) -->
      <div class="card overflow-hidden dark:bg-slate-900 dark:border-slate-800 hidden md:block">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-[#8A7A72] dark:text-slate-400 border-b border-[#E8D5C8] dark:border-slate-800 text-left text-[11px]">
              <th class="p-3 font-medium w-8 text-center">
                <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll"
                       class="w-4 h-4 rounded border-slate-300 dark:border-slate-700/70 bg-transparent text-amber-600 focus:ring-amber-500/30 focus:ring-offset-0 cursor-pointer transition-all duration-200"
                       :class="selectedBookingIds.length > 0 ? 'opacity-100' : 'opacity-30 hover:opacity-100 checked:opacity-100'">
              </th>
              <th @click="handleSort('client_name')" class="p-3 font-medium cursor-pointer hover:text-[#C59B63] select-none transition">
                Nama Client <span v-if="sortBy === 'client_name'">{{ sortDesc ? '▴' : '▾' }}</span>
              </th>
              <th @click="handleSort('university')" class="p-3 font-medium hidden md:table-cell cursor-pointer hover:text-[#C59B63] select-none transition">
                Universitas <span v-if="sortBy === 'university'">{{ sortDesc ? '▴' : '▾' }}</span>
              </th>
              <th @click="handleSort('package_name')" class="p-3 font-medium cursor-pointer hover:text-[#C59B63] select-none transition">
                Paket <span v-if="sortBy === 'package_name'">{{ sortDesc ? '▴' : '▾' }}</span>
              </th>
              <th @click="handleSort('graduation_date')" class="p-3 font-medium cursor-pointer hover:text-[#C59B63] select-none transition">
                Jadwal <span v-if="sortBy === 'graduation_date'">{{ sortDesc ? '▴' : '▾' }}</span>
              </th>
              <th @click="handleSort('payment_status')" class="p-3 font-medium cursor-pointer hover:text-[#C59B63] select-none transition">
                Pembayaran <span v-if="sortBy === 'payment_status'">{{ sortDesc ? '▴' : '▾' }}</span>
              </th>
              <th @click="handleSort('fg_name')" class="p-3 font-medium hidden md:table-cell cursor-pointer hover:text-[#C59B63] select-none transition">
                FG <span v-if="sortBy === 'fg_name'">{{ sortDesc ? '▴' : '▾' }}</span>
              </th>
              <th @click="handleSort('status')" class="p-3 font-medium cursor-pointer hover:text-[#C59B63] select-none transition">
                Status <span v-if="sortBy === 'status'">{{ sortDesc ? '▴' : '▾' }}</span>
              </th>
              <th class="p-3 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in sortedBookings" :key="item.id"
              class="group border-b border-[#E8D5C8]/40 dark:border-slate-800/60 hover:bg-[#FFF8F3] dark:hover:bg-slate-800/50 text-[#2D1B14] dark:text-slate-200 cursor-pointer transition text-xs"
              @click="showDetail(item)">
              <td class="p-3 text-center" @click.stop>
                <input type="checkbox" :value="item.id" v-model="selectedBookingIds"
                       class="w-4 h-4 rounded border-slate-300 dark:border-slate-700/70 bg-transparent text-amber-600 focus:ring-amber-500/30 focus:ring-offset-0 cursor-pointer transition-all duration-200"
                       :class="selectedBookingIds.length > 0 ? 'opacity-100' : 'opacity-30 group-hover:opacity-100 hover:opacity-100 checked:opacity-100'">
              </td>
              <td class="p-3">
                <div class="flex items-center gap-2">
                  <div class="w-7 h-7 rounded-lg bg-[#FAF0DD] dark:bg-amber-950/20 flex items-center justify-center text-[10px] font-bold text-[#B5942B] dark:text-amber-400 flex-shrink-0">{{ (item.client_name||'?')[0] }}</div>
                  <div class="flex flex-col truncate">
                    <span class="font-semibold text-xs truncate max-w-[140px]">{{ item.client_name }}</span>
                    <span class="text-[9px] mt-0.5 flex items-center gap-1 font-medium animate-fade-in"
                          :class="item.drive_parent_url ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#8A7A72]'">
                      <span>📁</span>
                      <span>{{ item.drive_parent_url ? 'Drive Mapped' : 'Drive Empty' }}</span>
                    </span>
                  </div>
                </div>
              </td>
              <td class="p-3 hidden md:table-cell text-[#8A7A72] dark:text-slate-400 truncate max-w-[120px]">{{ item.university || '-' }}</td>
              <td class="p-3 font-medium">{{ item.package_name || '-' }}</td>
              <td class="p-3">
                <span class="font-medium">{{ item.graduation_date || '-' }}</span>
                <div v-if="getPendingReschedule(item.id)" class="mt-0.5 animate-pulse">
                  <span class="text-[8px] px-1.5 py-0.5 rounded font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300">
                    📅 Ajuan: {{ getPendingReschedule(item.id).new_graduation_date }} ({{ getPendingReschedule(item.id).new_shooting_time }})
                  </span>
                </div>
              </td>
              <td class="p-3">
                <span class="status-chip text-[9px] px-2 py-0.5" :class="paymentStatusClass(item)">
                  {{ getPaymentStatusLabel(item) }}
                </span>
              </td>
              <td class="p-3 hidden md:table-cell">
                <div v-if="item.fg_name" class="flex flex-col gap-0.5">
                  <span class="text-[9px] px-1.5 py-0.5 bg-[#FAF0DD] dark:bg-amber-950/20 rounded text-[#B5942B] dark:text-amber-400 font-semibold w-fit">{{ item.fg_name }}</span>
                  <span class="text-[8px] text-green-600 font-medium">✓ Ditugaskan</span>
                </div>
                <span v-else class="text-[#C4B0A5] dark:text-slate-500">-</span>
              </td>
              <td class="p-3">
                <span class="status-chip text-[9px]" :class="statusClass(item.status)">{{ getDetailedStatusLabel(item) }}</span>
              </td>
              <td class="p-3" @click.stop>
                <div class="flex items-center gap-1 flex-wrap">
                  <button v-if="getPendingReschedule(item.id)" @click="showRescheduleInbox = true" class="px-2 py-1 rounded text-[9px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition animate-pulse" title="Review Permohonan Reschedule">📅 Reschedule</button>
                  <button v-if="item.dp_status === 'uploaded' && item.balance_status === 'uploaded'" @click="openVerifyModal(item, 'dp')" class="px-1.5 py-1 rounded text-[9px] font-medium text-white bg-[#0f766e] hover:bg-[#0d6860] transition">✓ Lunas</button>
                  <button v-else-if="item.dp_status === 'uploaded'" @click="openVerifyModal(item, 'dp')" class="px-1.5 py-1 rounded text-[9px] font-medium text-white bg-[#0f766e] hover:bg-[#0d6860] transition">✓ DP</button>
                  <!-- Case: Enabled (DP Paid & Drive Mapped) -->
                  <button v-else-if="(item.status === 'confirmed' || item.dp_status === 'uploaded') && !item.fg_name && item.dp_status === 'paid' && item.drive_parent_url" @click="openAssign(item)" class="px-1.5 py-1 rounded text-[9px] font-medium text-[#B5942B] bg-[#FAF0DD] dark:bg-amber-950/20 hover:bg-[#FFE5DA] transition" title="Assign FG">👤</button>
                  
                  <!-- Case: Disabled (DP Pending) -->
                  <button v-else-if="!item.fg_name && item.dp_status !== 'paid'" disabled class="px-1.5 py-1 rounded text-[9px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 opacity-60 cursor-not-allowed" title="Verifikasi DP terlebih dahulu sebelum Assign FG">🔒</button>
                  
                  <!-- Case: Clickable to Map Drive (Drive Empty) -->
                  <button v-else-if="!item.fg_name && item.dp_status === 'paid' && !item.drive_parent_url" @click="openDriveMapping(item)" class="px-1.5 py-1 rounded text-[9px] font-medium text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 dark:bg-rose-950/20 dark:border-rose-900 cursor-pointer transition" title="Mapping folder Google Drive terlebih dahulu sebelum Assign FG (Klik untuk isi)">🔒 (Drive Empty)</button>
                  <button v-else-if="item.status === 'confirmed' && item.fg_name" @click="setStatus(item, 'shooting')" class="px-1.5 py-1 rounded text-[9px] font-medium text-white bg-blue-600 hover:bg-blue-700 transition" title="Mulai Sesi Shoot">📸 Shoot</button>
                  <button v-else-if="item.status === 'shooting' && !item.is_session_done" @click="markShootDone(item)" class="px-1.5 py-1 rounded text-[9px] font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition" title="Selesai Sesi Shoot">📸 Selesai Shoot</button>
                  <button v-else-if="item.is_session_done && item.balance_status === 'uploaded'" @click="openVerifyModal(item, 'balance')" class="px-1.5 py-1 rounded text-[9px] font-bold text-white bg-amber-500 hover:bg-amber-600 animate-pulse transition" title="Verifikasi Pelunasan">🔍 Verif Plns</button>
                  <button v-else-if="item.is_session_done && item.balance_status !== 'paid' && Number(item.balance_amount || 0) > 0" disabled class="px-1.5 py-1 rounded text-[9px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 opacity-70 cursor-not-allowed select-none" title="Terkunci: Klien belum mengunggah bukti transfer pelunasan">⏳ Plns</button>
                  <a v-else-if="item.status === 'post_production'" href="/admin/deliverables"
                    class="px-1.5 py-1 rounded text-[9px] font-medium transition text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 hover:bg-purple-100 flex items-center gap-0.5"
                    title="Lihat di halaman Post Production">
                    🎨 Post Pro →
                  </a>
                  <button v-else-if="item.status === 'delivered'" @click="complete(item)" class="px-1.5 py-1 rounded text-[9px] font-medium text-white bg-green-600 hover:bg-green-700 transition">✅</button>
                </div>
              </td>
            </tr>
            <tr v-if="sortedBookings.length === 0">
              <td class="p-8 text-center text-[#C4B0A5] dark:text-slate-500" colspan="9">
                <span class="text-2xl block mb-1">📋</span>
                <span class="text-xs">Belum ada data client</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile Fallback for List View (Visible on Mobile) -->
      <div class="md:hidden space-y-3">
        <div v-for="item in sortedBookings" :key="item.id"
          class="card p-4 transition-all hover:shadow-md cursor-pointer dark:bg-slate-900 dark:border-slate-800"
          @click="showDetail(item)">
          <!-- Top Row -->
          <div class="flex items-start justify-between mb-2.5">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-[#FAF0DD] dark:bg-amber-950/20 flex items-center justify-center text-sm font-bold text-[#B5942B] dark:text-amber-400 flex-shrink-0">{{ (item.client_name||'?')[0] }}</div>
              <div>
                <p class="text-sm font-semibold text-[#2D1B14] dark:text-slate-200 leading-tight">{{ item.client_name }}</p>
                <div class="flex items-center gap-1.5 mt-0.5">
                  <span class="text-[10px] text-[#C4B0A5]">{{ item.university || '-' }}</span>
                  <span class="text-[8px] px-1 rounded font-medium animate-fade-in"
                        :class="item.drive_parent_url ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-450 border border-emerald-250' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-450 border border-rose-250'">
                    📁 {{ item.drive_parent_url ? 'Set' : 'Empty' }}
                  </span>
                </div>
              </div>
            </div>
            <span class="status-chip ml-2 text-[10px]" :class="statusClass(item.status)">{{ getDetailedStatusLabel(item) }}</span>
          </div>

          <!-- Middle details -->
          <div class="space-y-1 text-[11px] text-[#8A7A72] dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
            <div class="flex justify-between">
              <span>Paket</span>
              <span class="font-medium text-[#2D1B14] dark:text-slate-200">{{ item.package_name || '-' }}</span>
            </div>
            <div class="flex justify-between">
              <span>Tanggal</span>
              <span>{{ item.graduation_date || '-' }}</span>
            </div>
            <div class="flex justify-between" v-if="item.shooting_time || item.duration_hours">
              <span>Sesi Foto</span>
              <span class="font-medium text-[#2D1B14] dark:text-slate-200">
                {{ item.shooting_time ? item.shooting_time : 'Jam -' }} · {{ item.duration_hours || 2 }} Jam
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span>Pembayaran</span>
              <span class="status-chip text-[9px] px-2 py-0.5" :class="paymentStatusClass(item)">
                {{ getPaymentStatusLabel(item) }}
              </span>
            </div>
            <div class="flex justify-between" v-if="item.fg_name">
              <span>FG</span>
              <div class="flex flex-col items-end gap-0.5">
                <span class="text-[9px] px-1.5 py-0.5 bg-[#FAF0DD] dark:bg-amber-950/20 rounded text-[#B5942B] dark:text-amber-400 font-semibold">{{ item.fg_name }}</span>
                <span class="text-[8px] text-green-600 font-medium">✓ Ditugaskan</span>
              </div>
            </div>
          </div>

          <!-- In-Card Reschedule Alert Banner for Mobile -->
          <div v-if="getPendingReschedule(item.id)" 
               class="mt-2.5 p-2.5 bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/40 rounded-xl space-y-1.5 animate-pulse"
               @click.stop>
            <div class="flex items-center justify-between">
              <span class="text-[9px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <span>📅</span> Permohonan Reschedule
              </span>
              <span class="text-[8px] px-1.5 py-0.2 rounded font-bold"
                    :class="getPendingReschedule(item.id).is_conflicting ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-450' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-450'">
                {{ getPendingReschedule(item.id).is_conflicting ? '🔴 FG Bentrok' : '🟢 FG Bebas' }}
              </span>
            </div>
            <div class="text-[10px] text-[#2D1B14] dark:text-slate-200">
              <span class="text-[#8A7A72] dark:text-slate-400 line-through mr-1">{{ getPendingReschedule(item.id).old_graduation_date }} ({{ getPendingReschedule(item.id).old_shooting_time || '09:00' }})</span>
              ➜ <strong class="text-amber-600 dark:text-amber-400">{{ getPendingReschedule(item.id).new_graduation_date }} ({{ getPendingReschedule(item.id).new_shooting_time }})</strong>
            </div>
            <div class="flex gap-1.5 pt-1">
              <button @click="rejectReschedule(getPendingReschedule(item.id))" 
                      :disabled="submittingAction === getPendingReschedule(item.id).id" 
                      class="flex-1 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-[9px] font-bold transition">
                ✕ Tolak
              </button>
              <button @click="approveReschedule(getPendingReschedule(item.id))" 
                      :disabled="submittingAction === getPendingReschedule(item.id).id" 
                      class="flex-1 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-bold transition shadow-sm flex items-center justify-center gap-1">
                <span>✓ Setujui</span>
              </button>
            </div>
          </div>

          <!-- Bottom Actions -->
          <div class="flex flex-wrap gap-2 mt-3 pt-2.5 border-t border-[#E8D5C8]/60 dark:border-slate-800" @click.stop>
            <button v-if="item.dp_status === 'uploaded' && item.balance_status === 'uploaded'" 
              @click="openVerifyModal(item, 'dp')" 
              class="flex-1 px-2.5 py-2 rounded-xl text-xs font-semibold text-center text-white bg-[#0f766e]">
              ✓ Verifikasi Lunas
            </button>
            <button v-else-if="item.dp_status === 'uploaded'" 
              @click="openVerifyModal(item, 'dp')" 
              class="flex-1 px-2.5 py-2 rounded-xl text-xs font-semibold text-center text-white bg-[#0f766e]">
              ✓ DP
            </button>
            
            <!-- Case: Enabled (DP Paid & Drive Mapped) -->
            <button v-if="(item.status === 'confirmed' || item.dp_status === 'uploaded') && !item.fg_name && item.dp_status === 'paid' && item.drive_parent_url" @click="openAssign(item)" class="flex-1 px-2.5 py-2 rounded-xl text-xs font-semibold text-center text-[#B5942B] bg-[#FAF0DD] dark:bg-amber-950/20">👤 Assign</button>
            
            <!-- Case: Switch FG (If FG already assigned) -->
            <button v-else-if="item.fg_name && item.status !== 'completed' && item.status !== 'cancelled'" @click="openAssign(item)" class="flex-1 px-2.5 py-2 rounded-xl text-xs font-semibold text-center text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900 cursor-pointer" title="Ganti/Switch FG">🔄 Switch FG</button>

            <!-- Case: Disabled (DP Pending) -->
            <button v-else-if="!item.fg_name && item.dp_status !== 'paid'" disabled class="flex-1 px-2.5 py-2 rounded-xl text-xs font-semibold text-center text-slate-400 bg-slate-100 dark:bg-slate-800 opacity-60 cursor-not-allowed">🔒 Assign (DP Pending)</button>
            
            <!-- Case: Clickable to Map Drive (Drive Empty) -->
            <button v-else-if="!item.fg_name && item.dp_status === 'paid' && !item.drive_parent_url" @click="openDriveMapping(item)" class="flex-1 px-2.5 py-2 rounded-xl text-xs font-semibold text-center text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 dark:bg-rose-950/20 dark:border-rose-900 cursor-pointer" title="Mapping folder Google Drive terlebih dahulu sebelum Assign FG (Klik untuk isi)">🔒 Assign (Drive Empty)</button>
            
            <button v-if="item.status === 'confirmed' && item.fg_name" @click="setStatus(item, 'shooting')" class="flex-1 px-2.5 py-2 rounded-xl text-xs font-semibold text-center text-white bg-blue-600">📸 Shoot</button>
            <button v-else-if="item.status === 'shooting' && !item.is_session_done" @click="markShootDone(item)" class="flex-1 px-2.5 py-2 rounded-xl text-xs font-semibold text-center text-white bg-indigo-600">📸 Selesai Shoot</button>
            <button v-else-if="item.is_session_done && item.balance_status === 'uploaded'" @click="openVerifyModal(item, 'balance')" class="flex-1 px-2.5 py-2 rounded-xl text-xs font-bold text-center text-white bg-amber-500 animate-pulse">🔍 Verifikasi Pelunasan</button>
            <button v-else-if="item.is_session_done && item.balance_status !== 'paid' && Number(item.balance_amount || 0) > 0" disabled class="flex-1 px-2.5 py-2 rounded-xl text-xs font-semibold text-center text-slate-400 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 opacity-70 cursor-not-allowed select-none" title="Terkunci: Klien belum mengunggah bukti transfer pelunasan">⏳ Menunggu Pelunasan</button>
            <a v-else-if="item.status === 'post_production'" href="/admin/deliverables"
              class="flex-1 px-2.5 py-2 rounded-xl text-xs font-semibold text-center text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 flex items-center justify-center gap-1"
              title="Lihat di halaman Post Production">
              🎨 Di Post Pro →
            </a>
            <button v-else-if="item.status === 'delivered'" @click="complete(item)" class="flex-1 px-2.5 py-2 rounded-xl text-xs font-semibold text-center text-white bg-green-600">✅</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="sortedBookings.length === 0 && !loading && viewMode === 'card'" class="text-center py-16 text-[#C4B0A5]">
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
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">Jam Pemotretan</dt><dd class="font-semibold text-amber-700 dark:text-amber-400 font-mono">{{ detailItem.shooting_time ? (detailItem.shooting_time + ' (' + formatAmPm(detailItem.shooting_time) + ')') : '-' }}</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">Durasi Sesi</dt><dd class="font-semibold text-[#2D1B14] dark:text-slate-200">{{ detailItem.duration_hours || 2 }} Jam</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">Lokasi</dt><dd>{{ detailItem.location || '-' }}</dd></div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5"><dt class="text-[#C4B0A5]">Total Biaya</dt><dd class="font-bold text-[#2D1B14] dark:text-slate-200">Rp {{ (detailItem.total_price||0).toLocaleString('id-ID') }}</dd></div>

          <!-- If Full Payment at start (balance_amount is 0 or null) -->
          <template v-if="!detailItem.balance_amount || detailItem.balance_amount === 0">
            <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5">
              <dt class="text-[#C4B0A5]">Pembayaran</dt>
              <dd class="font-bold text-emerald-700 dark:text-emerald-400">
                Lunas (100%) 
                <span v-if="detailItem.dp_status === 'paid'" class="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-md font-bold ml-1">✓ Lunas</span>
                <span v-else-if="detailItem.dp_status === 'uploaded'" class="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded-md font-bold ml-1 animate-pulse">⏳ Menunggu Verifikasi</span>
                <span v-else class="text-[10px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded-md font-bold ml-1">Belum Dibayar</span>
              </dd>
            </div>
          </template>

          <!-- If DP / Term Payment -->
          <template v-else>
            <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5">
              <dt class="text-[#C4B0A5]">DP ({{ detailItem.total_price > 0 ? Math.round((detailItem.dp_amount / detailItem.total_price) * 100) : 50 }}%)</dt>
              <dd class="font-medium text-[#2D1B14] dark:text-slate-200">
                Rp {{ (detailItem.dp_amount||0).toLocaleString('id-ID') }}
                <span v-if="detailItem.dp_status === 'paid'" class="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold ml-1">✓ Lunas</span>
                <span v-else-if="detailItem.dp_status === 'uploaded'" class="text-[10px] text-amber-700 dark:text-amber-400 font-bold ml-1 animate-pulse">⏳ Verif</span>
                <span v-else class="text-[10px] text-slate-400 font-bold ml-1">Belum</span>
              </dd>
            </div>
            <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5">
              <dt class="text-[#C4B0A5]">Sisa Pelunasan</dt>
              <dd class="font-medium text-[#2D1B14] dark:text-slate-200">
                Rp {{ (detailItem.balance_amount||0).toLocaleString('id-ID') }}
                <span v-if="detailItem.balance_status === 'paid'" class="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold ml-1">✓ Lunas</span>
                <span v-else-if="detailItem.balance_status === 'uploaded'" class="text-[10px] text-amber-700 dark:text-amber-400 font-bold ml-1 animate-pulse">⏳ Verif</span>
                <span v-else class="text-[10px] text-amber-600 dark:text-amber-400 font-bold ml-1">Belum Lunas</span>
              </dd>
            </div>
          </template>
          <div class="flex justify-between items-center border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5">
            <dt class="text-[#C4B0A5]">Token Tracking</dt>
            <dd class="flex items-center gap-2">
              <span class="font-mono text-xs font-bold text-[#C59B63] dark:text-amber-400 select-all">{{ detailItem.tracking_token || 'TRK-' + detailItem.id }}</span>
              <button @click="resetBookingToken(detailItem)" type="button" title="Reset Token Tracking Baru" class="text-[10px] font-semibold text-red-500 hover:underline flex items-center gap-0.5">
                🔄 Reset
              </button>
            </dd>
          </div>
          <div class="flex justify-between border-b border-[#E8D5C8]/60 dark:border-slate-800 pb-1.5" v-if="detailItem.fg_name">
            <dt class="text-[#C4B0A5]">FG</dt>
            <dd class="flex items-center gap-1.5">
              <span class="font-medium text-[#2d1b14] dark:text-slate-300">{{ detailItem.fg_name }}</span>
              <span class="text-[9px] text-green-600 font-medium">✓ Ditugaskan</span>
               <a @click.prevent="sendFgPortalLink(detailItem)" href="#" class="text-blue-600 dark:text-blue-400 hover:underline text-[10px] font-semibold ml-1">
                💬 Kirim Portal
              </a>
            </dd>
          </div>
        </dl>
        
        <!-- Reschedule Request Section in Detail Modal -->
        <div v-if="getPendingReschedule(detailItem.id)" 
             class="mt-4 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-xl space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[10px] text-amber-800 dark:text-amber-300 uppercase font-bold tracking-wider flex items-center gap-1">
              <span>📅</span> Permohonan Perubahan Jadwal (Reschedule)
            </span>
            <span class="text-[8px] px-1.5 py-0.5 rounded font-bold"
                  :class="getPendingReschedule(detailItem.id).is_conflicting ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'">
              {{ getPendingReschedule(detailItem.id).is_conflicting ? '🔴 FG Bentrok' : '🟢 FG Bebas' }}
            </span>
          </div>
          <div class="grid grid-cols-2 gap-2 text-xs p-2 bg-white dark:bg-slate-900 rounded-lg border border-amber-200 dark:border-slate-800">
            <div>
              <p class="text-[9px] text-slate-400 uppercase font-semibold">Jadwal Lama</p>
              <p class="font-medium text-slate-600 dark:text-slate-400">{{ getPendingReschedule(detailItem.id).old_graduation_date }} ({{ getPendingReschedule(detailItem.id).old_shooting_time || '09:00' }})</p>
            </div>
            <div>
              <p class="text-[9px] text-amber-600 dark:text-amber-400 uppercase font-semibold">Pengajuan Baru</p>
              <p class="font-bold text-amber-700 dark:text-amber-300">{{ getPendingReschedule(detailItem.id).new_graduation_date }} ({{ getPendingReschedule(detailItem.id).new_shooting_time }})</p>
            </div>
          </div>
          <p v-if="getPendingReschedule(detailItem.id).reason" class="text-[10px] text-slate-600 dark:text-slate-400 italic">
            "{{ getPendingReschedule(detailItem.id).reason }}"
          </p>
          <div class="flex gap-2 pt-1">
            <button @click="rejectReschedule(getPendingReschedule(detailItem.id))" 
                    :disabled="submittingAction === getPendingReschedule(detailItem.id).id" 
                    class="flex-1 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-bold transition">
              ✕ Tolak
            </button>
            <button @click="approveReschedule(getPendingReschedule(detailItem.id))" 
                    :disabled="submittingAction === getPendingReschedule(detailItem.id).id" 
                    class="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-sm flex items-center justify-center gap-1">
              <span>✓ Setujui</span>
            </button>
          </div>
        </div>

        <!-- Google Drive Mapping Section -->
        <div class="mt-4 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[10px] text-[#C4B0A5] uppercase font-bold tracking-wider">Google Drive Folder</span>
            <span class="text-[9px] px-1.5 py-0.5 rounded font-bold"
                  :class="detailItem.drive_parent_url ? 'bg-emerald-50 text-emerald-700 dark:bg-green-950/20 dark:text-green-400 border border-emerald-250' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-250'">
              {{ detailItem.drive_parent_url ? 'Sudah di-setup ✓' : 'Belum di-setup ⚠️' }}
            </span>
          </div>
          <button @click="openDriveMapping(detailItem); detailItem=null" class="w-full py-2 bg-[#1A1A2E] dark:bg-amber-950/40 text-[#C59B63] dark:text-amber-400 hover:bg-[#2A2A4E] rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-sm">
            📁 {{ detailItem.drive_parent_url ? 'Ubah Link Folder Drive' : 'Input Link Folder Drive' }}
          </button>
        </div>

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
            <a :href="'/tracking.html?code=' + encodeURIComponent(detailItem.tracking_token || detailItem.id)" target="_blank" class="flex-1 px-3 py-2 bg-[#FAF6F0] dark:bg-slate-800 text-[#8A7A72] dark:text-slate-300 border border-[#E8D5C8]/80 dark:border-slate-700 rounded-lg text-center text-xs font-medium hover:bg-[#FFE5DA] transition">
              📍 Buka Tracking
            </a>
            <a :href="getWaTrackingLink(detailItem)" target="_blank" class="flex-1 px-3 py-2 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 rounded-lg text-center text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-950/40 transition">
              💬 Kirim WA Tracking
            </a>
          </div>
          <div v-if="detailItem.has_moodboard">
            <a :href="'/api/public/moodboard/' + (detailItem.tracking_token || detailItem.id) + '/view'" target="_blank" class="w-full px-3 py-2 bg-[#111E35] text-[#D4AF37] border border-[#111E35] rounded-lg text-center text-xs font-semibold hover:bg-[#1A2B4C] transition flex items-center justify-center gap-1.5 shadow-sm">
              🖼️ Buka Moodboard Klien
            </a>
          </div>
        </div>

        <div class="flex gap-2 mt-5">
          <button v-if="detailItem?.status === 'cancelled'" @click="deleteBooking(detailItem)" class="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer" title="Hapus Permanen">
            🗑️ Hapus Permanen
          </button>
          <button v-else @click="cancelBooking(detailItem)" class="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer" title="Batalkan Booking & Simpan Rekam Keuangan">
            🚫 Batalkan Booking
          </button>
          <button @click="detailItem=null" class="flex-1 px-4 py-2.5 bg-[#FFF0E8] dark:bg-slate-800 text-[#8A7A72] dark:text-slate-300 rounded-xl text-xs font-medium hover:bg-[#FFE5DA] transition cursor-pointer">Tutup</button>
          <a :href="waAdminLink(detailItem)" target="_blank" class="flex-1 px-4 py-2.5 bg-[#0f766e] text-white rounded-xl text-xs font-medium hover:bg-[#0d6860] transition text-center flex items-center justify-center gap-1 cursor-pointer">💬 WA</a>
        </div>
      </div>
    </div>

    <!-- Verification Modal -->
    <div v-if="proofModalItem" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.6); backdrop-filter: blur(6px);" @click.self="proofModalItem=null">
      <div class="card w-full max-w-md p-5 animate-pop relative max-h-[90vh] overflow-y-auto dark:bg-slate-900 dark:border-slate-800">
        <button @click="proofModalItem=null" class="absolute top-4 right-4 text-[#B8C6B8] hover:text-[#2D3A2E] dark:hover:text-slate-200">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
        <h3 class="font-bold text-[#2D1B14] dark:text-slate-200 mb-1">🔍 Verifikasi Pembayaran ({{ verifyModalLabel(proofModalItem, proofModalType) }})</h3>
        <p class="text-xs text-[#8A7A72] mb-3">— {{ proofModalItem.client_name }} ({{ proofModalItem.university || '-' }})</p>
        
        <!-- Rincian Tagihan & Nominal Verifikasi -->
        <div class="px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 mb-4 space-y-1.5 text-xs">
          <div class="flex justify-between items-center text-slate-700 dark:text-slate-300">
            <span>Nama Client:</span>
            <strong class="text-slate-900 dark:text-slate-100 font-semibold">{{ proofModalItem?.client_name }}</strong>
          </div>
          <div class="flex justify-between items-center pt-1 border-t border-amber-200/60 dark:border-amber-800/40 text-amber-900 dark:text-amber-200" v-if="proofModalType === 'dp'">
            <span class="font-bold uppercase tracking-wider text-[10px]">{{ proofModalItem?.balance_amount === 0 ? 'Nominal Pembayaran Lunas:' : 'Nominal DP Wajib:' }}</span>
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

    <!-- Google Drive Folder Mapping Modal -->
    <div v-if="showDriveModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" @click.self="showDriveModal=false">
      <div class="card w-full max-w-md p-6 animate-pop dark:bg-slate-900 dark:border-slate-800" @click.stop>
        <div class="flex items-center gap-2 mb-3">
          <div class="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center text-[#B5942B]">📁</div>
          <div>
            <h3 class="font-bold text-[#2D1B14] dark:text-slate-200 text-sm">Google Drive Folder Mapping</h3>
            <p class="text-[10px] text-[#8A7A72] dark:text-slate-400">— {{ driveItem?.client_name }}</p>
          </div>
        </div>

        <div v-if="!driveForm.drive_parent_url" class="mb-3.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
          <div>
            <p class="text-xs font-bold text-amber-600 dark:text-amber-400">Folder Drive Belum Dibuat</p>
            <p class="text-[9px] text-amber-600/80 dark:text-amber-400/80">Buat struktur folder client & subfolder otomatis via bot.</p>
          </div>
          <button type="button" @click="autoGenerateDriveFolder(driveItem)" :disabled="generatingDrive" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition flex items-center gap-1">
            <span v-if="!generatingDrive">⚡ Generate Otomatis</span>
            <span v-else class="loading-spinner !w-3 !h-3 !border-white/40 !border-t-white"></span>
          </button>
        </div>

        <form @submit.prevent="saveDriveMapping" class="space-y-3.5">
          <!-- Folder Utama (Master Folder Client) -->
          <div>
            <label class="text-[10px] font-bold text-[#8A7A72] dark:text-slate-400 block mb-1">🔗 Link Master Folder Client</label>
            <input type="url" v-model="driveForm.drive_parent_url" class="input-fancy w-full !text-xs dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="https://drive.google.com/drive/folders/ParentFolderId...">
          </div>

          <!-- Folder JPG Kamera -->
          <div>
            <label class="text-[10px] font-bold text-[#8A7A72] dark:text-slate-400 block mb-1">🖼️ Link Subfolder JPG (Galeri Seleksi)</label>
            <input type="url" v-model="driveForm.staging_drive_url" class="input-fancy w-full !text-xs dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="https://drive.google.com/drive/folders/SubfolderJPGId...">
            <span class="text-[8px] text-gray-400 block mt-0.5">Folder ini akan digunakan freelancer untuk mengunggah JPG original kualitas rendah.</span>
          </div>

          <!-- Folder Highlight -->
          <div>
            <label class="text-[10px] font-bold text-[#8A7A72] dark:text-slate-400 block mb-1">⭐ Link Subfolder Highlight</label>
            <input type="url" v-model="driveForm.highlight_drive_url" class="input-fancy w-full !text-xs dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="https://drive.google.com/drive/folders/SubfolderHighlightId...">
            <span class="text-[8px] text-gray-400 block mt-0.5">Link ini akan muncul di tracking timeline client saat foto highlight selesai.</span>
          </div>

          <!-- Folder Final Editing -->
          <div>
            <label class="text-[10px] font-bold text-[#8A7A72] dark:text-slate-400 block mb-1">✅ Link Subfolder Final Editing</label>
            <input type="url" v-model="driveForm.download_url" class="input-fancy w-full !text-xs dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="https://drive.google.com/drive/folders/SubfolderFinalEditedId...">
            <span class="text-[8px] text-gray-400 block mt-0.5">Link ini akan muncul di tracking timeline client saat seluruh file selesai diproses.</span>
          </div>

          <div class="flex gap-2 pt-2.5">
            <button type="button" @click="showDriveModal=false" class="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#8A7A72] dark:text-slate-300 rounded-xl text-xs font-semibold transition">Batal</button>
            <button type="submit" :disabled="savingDrive" class="flex-1 px-4 py-2 bg-[#111E35] text-[#D4AF37] rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 hover:bg-[#111E35]/90">
              <span v-if="!savingDrive">💾 Simpan Mapping</span>
              <span v-else class="loading-spinner !w-3 !h-3 !border-[#D4AF37]/40 !border-t-[#D4AF37]"></span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Reschedule Requests Inbox Modal -->
    <div v-if="showRescheduleInbox" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.6); backdrop-filter: blur(6px);" @click.self="showRescheduleInbox=false">
      <div class="card w-full max-w-lg p-5 animate-pop dark:bg-slate-900 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-[#E8D5C8]/40 dark:border-slate-800 pb-3">
          <h3 class="font-bold text-[#2D1B14] dark:text-slate-200 flex items-center gap-2">
            <span>📅</span> Permohonan Perubahan Jadwal (Reschedule)
          </h3>
          <button @click="showRescheduleInbox=false" class="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 font-bold cursor-pointer">✕</button>
        </div>

        <div v-if="rescheduleRequests.length === 0" class="text-center py-8 text-xs text-gray-500">
          Tidak ada permohonan reschedule yang sedang pending.
        </div>

        <div v-else class="space-y-3">
          <div v-for="req in rescheduleRequests" :key="req.id" class="p-4 bg-amber-50/50 dark:bg-slate-800/50 border border-amber-200/80 dark:border-slate-700/80 rounded-xl space-y-3">
            <div class="flex justify-between items-start">
              <div>
                <p class="font-bold text-sm text-[#2D1B14] dark:text-slate-200">{{ req.client_name }} <span class="text-xs font-normal text-slate-500">(Booking #{{ req.booking_id }})</span></p>
                <p class="text-[11px] text-slate-500">WA: {{ req.client_phone }} | FG: {{ req.fg_name || 'Belum Assign' }}</p>
              </div>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold" :class="req.is_conflicting ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-450' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-450'">
                {{ req.is_conflicting ? '🔴 FG Bentrok Jam' : '🟢 FG Bebas' }}
              </span>
            </div>

            <div class="grid grid-cols-2 gap-2 text-xs p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800">
              <div>
                <p class="text-[10px] text-slate-400 uppercase font-semibold">Jadwal Lama</p>
                <p class="font-medium text-slate-700 dark:text-slate-300">{{ req.old_graduation_date }} ({{ req.old_shooting_time || '09:00' }})</p>
              </div>
              <div>
                <p class="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-semibold">Pengajuan Baru</p>
                <p class="font-bold text-amber-700 dark:text-amber-300">{{ req.new_graduation_date }} ({{ req.new_shooting_time }})</p>
              </div>
            </div>

            <p v-if="req.reason" class="text-xs text-slate-600 dark:text-slate-400 italic">
              "{{ req.reason }}"
            </p>

            <div v-if="req.is_conflicting && req.available_freelancers && req.available_freelancers.length > 0" class="space-y-1">
              <label class="text-[10px] font-bold text-slate-600 dark:text-slate-400 block">Pilih FG Alternatif Bebas Bentrok:</label>
              <select v-model="req.selected_fg_id" class="input-fancy !text-xs w-full dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
                <option value="">-- Tetap Gunakan FG Sekarang --</option>
                <option v-for="afg in req.available_freelancers" :key="afg.id" :value="afg.id">
                  {{ afg.name }} ({{ afg.phone }})
                </option>
              </select>
            </div>

            <div class="flex gap-2 pt-1">
              <button @click="rejectReschedule(req)" :disabled="submittingAction === req.id" class="flex-1 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-semibold transition cursor-pointer">
                ✕ Tolak
              </button>
              <button @click="approveReschedule(req)" :disabled="submittingAction === req.id" class="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 shadow-sm cursor-pointer">
                <span v-if="submittingAction !== req.id">✓ Setujui Perubahan</span>
                <span v-else class="loading-spinner !w-3 !h-3 !border-white/40 !border-t-white"></span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Floating Bulk Actions Bar -->
    <div v-if="selectedBookingIds.length > 0" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-[#111E35] text-white rounded-2xl shadow-2xl border border-[#D4AF37]/50 flex items-center gap-3 animate-slide-up backdrop-blur-md">
      <div class="flex items-center gap-2">
        <span class="w-6 h-6 rounded-full bg-[#D4AF37] text-[#111E35] font-extrabold text-xs flex items-center justify-center">{{ selectedBookingIds.length }}</span>
        <span class="text-xs font-semibold text-slate-200">Terpilih</span>
      </div>

      <div class="h-4 w-px bg-slate-700"></div>

      <div class="flex items-center gap-2">
        <button @click="bulkVerifyDp" :disabled="bulkLoading" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1 shadow-sm cursor-pointer disabled:opacity-50">
          <span>✓ Verifikasi DP ({{ selectedBookingIds.length }})</span>
        </button>

        <button @click="openBulkAssign" :disabled="bulkLoading" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm cursor-pointer disabled:opacity-50">
          <span>👤 Assign 1 FG ({{ selectedBookingIds.length }})</span>
        </button>

        <button @click="bulkDelete" :disabled="bulkLoading" class="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1 shadow-sm cursor-pointer disabled:opacity-50">
          <span>🗑️ Hapus ({{ selectedBookingIds.length }})</span>
        </button>

        <button @click="selectedBookingIds = []" class="p-1.5 text-slate-400 hover:text-white transition ml-1" title="Batal Pilih">
          ✕
        </button>
      </div>
    </div>

    <!-- Bulk Assign FG Modal -->
    <div v-if="showBulkAssignModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.6); backdrop-filter: blur(6px);" @click.self="showBulkAssignModal = false">
      <div class="card w-full max-w-md p-5 animate-pop dark:bg-slate-900 dark:border-slate-800 space-y-4">
        <div class="flex items-center justify-between border-b border-[#E8D5C8]/40 dark:border-slate-800 pb-3">
          <h3 class="font-bold text-[#2D1B14] dark:text-slate-200 flex items-center gap-2">
            <span>👤</span> Bulk Assign 1 Fotografer
          </h3>
          <button @click="showBulkAssignModal = false" class="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 font-bold cursor-pointer">✕</button>
        </div>

        <p class="text-xs text-slate-600 dark:text-slate-400">
          Tugaskan 1 fotografer untuk <strong>{{ selectedBookingIds.length }} client terpilih</strong>. Sistem akan otomatis mendeteksi bentrok jam pemotretan.
        </p>

        <form @submit.prevent="submitBulkAssign" class="space-y-3">
          <div>
            <label class="text-[10px] text-[#C4B0A5] block mb-1">Pilih Fotografer</label>
            <select v-model="bulkFgId" required class="input-fancy !text-xs w-full dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
              <option value="">-- Pilih FG --</option>
              <option v-for="fg in fgList" :key="fg.id" :value="fg.id">{{ fg.name }} — {{ fg.phone }} ({{ fg.city || 'Tanpa Kota' }})</option>
            </select>
          </div>

          <div>
            <label class="text-[10px] text-[#C4B0A5] block mb-1">Fee Penugasan Massal per Client (Opsional)</label>
            <input type="number" v-model="bulkFgFee" placeholder="Biarkan kosong untuk fee default..." class="input-fancy !text-xs w-full dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
          </div>

          <!-- Conflict Warning Display -->
          <div v-if="bulkConflictErrors.length > 0" class="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl space-y-1.5 text-xs text-rose-800 dark:text-rose-300">
            <p class="font-bold flex items-center gap-1">⚠️ Gagal Assign Massal! Terdeteksi Bentrok Jam:</p>
            <ul class="list-disc pl-4 text-[11px] space-y-1">
              <li v-for="(err, idx) in bulkConflictErrors" :key="idx">{{ err }}</li>
            </ul>
          </div>

          <div class="flex gap-2 pt-2">
            <button type="button" @click="showBulkAssignModal = false" class="flex-1 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 text-xs font-semibold rounded-xl hover:bg-gray-200 transition cursor-pointer">Batal</button>
            <button type="submit" :disabled="bulkLoading || !bulkFgId" class="flex-1 py-2.5 bg-[#111E35] text-[#D4AF37] text-xs font-bold rounded-xl hover:bg-[#1A2B4C] transition disabled:opacity-40 flex items-center justify-center gap-1.5 shadow-md cursor-pointer">
              <span v-if="!bulkLoading">✓ Eksekusi Assign ({{ selectedBookingIds.length }})</span>
              <span v-else class="loading-spinner !w-3.5 !h-3.5 !border-[#D4AF37]/40 !border-t-[#D4AF37]"></span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Assign FG Modal -->
    <div v-if="showAssign" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.6); backdrop-filter: blur(6px);" @click.self="showAssign=null">
      <div class="card w-full max-w-sm p-5 animate-pop dark:bg-slate-900 dark:border-slate-800">
        <h3 class="font-bold text-[#2D1B14] dark:text-slate-200">👤 Assign FG</h3>
        <p class="text-xs text-[#8A7A72] mb-4">— {{ assignItem.client_name }}</p>
        <form @submit.prevent="submitAssign" class="space-y-3">
          <div>
            <label class="text-[10px] text-[#C4B0A5] block mb-1">Filter Kota Domisili</label>
            <select v-model="selectedCityFilter" class="input-fancy !text-xs dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 mb-2 bg-white text-slate-800">
              <option value="">Semua Kota</option>
              <option v-for="city in supportedCities" :key="city" :value="city">{{ city }}</option>
            </select>
          </div>
          <div>
            <label class="text-[10px] text-[#C4B0A5] block mb-1.5">Pilih Fotografer</label>
            <select v-model="assignForm.fg_id" required class="input-fancy !text-xs dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" @change="onFgChange">
              <option value="">-- Pilih FG --</option>
              <option v-for="fg in filteredFgList" :key="fg.id" :value="fg.id">{{ fg.name }} — {{ fg.phone }} ({{ fg.city || 'Tanpa Kota' }})</option>
            </select>
          </div>
          <!-- Info Ringkasan Pemotretan (Dapat Disesuaikan Admin) -->
          <div class="p-3 bg-amber-50/70 dark:bg-slate-800/60 border border-amber-200/80 dark:border-slate-700/80 rounded-xl space-y-2 text-xs text-slate-700 dark:text-slate-300">
            <div>
              <label class="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-0.5">🕒 Jam Pemotretan</label>
              <input v-model="assignForm.shooting_time" type="text" class="input-fancy !text-xs !py-1 w-full dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="Contoh: 09:00 WIB atau 14:00 WITA...">
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-0.5">⏳ Durasi (Jam)</label>
                <input v-model.number="assignForm.duration_hours" type="number" min="1" max="12" class="input-fancy !text-xs !py-1 w-full dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
              </div>
              <div>
                <label class="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-0.5">📍 Lokasi Sesi Foto</label>
                <input v-model="assignForm.location" type="text" class="input-fancy !text-xs !py-1 w-full dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="Lokasi...">
              </div>
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
          <div v-if="assignResult" class="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3.5 space-y-2 animate-fade-in">
            <div class="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
              <span>✓</span>
              <span>Fotografer Berhasil Ditugaskan!</span>
            </div>
            <p class="text-[10px] text-emerald-700 dark:text-emerald-400 leading-relaxed">
              Jadwal pemotretan telah terkunci dan aktif di portal fotografer.
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
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import Swal from 'sweetalert2'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const API = '/api/admin'
const data = ref([])
const loading = ref(true)
const filterStatus = ref('')
const searchQ = ref(route.query.search || '')

const driveOAuthConnected = ref(false)

async function checkDriveOAuthStatus() {
  try {
    const res = await fetch(`${API}/settings/drive-status`, { credentials: 'include' })
    if (res.ok) {
      const d = await res.json()
      driveOAuthConnected.value = !!(d.oauth_connected || d.driveOAuthConnected || d.mode === 'direct_web_upload')
    }
  } catch (e) {
    driveOAuthConnected.value = false
  }
}

const sortBy = ref('')
const sortDesc = ref(false)

function handleSort(field) {
  if (sortBy.value === field) {
    sortDesc.value = !sortDesc.value
  } else {
    sortBy.value = field
    sortDesc.value = false
  }
}

const statusOptions = [
  { value: '', label: '🌐 Semua Client (Produksi)' },
  { value: 'pending_dp', label: '💳 Menunggu DP / Verifikasi DP' },
  { value: 'need_fg', label: '👤 Menunggu Assignment FG' },
  { value: 'fg_assigned', label: '🟢 FG Siap (Diterima)' },
  { value: 'shooting', label: '📸 Sesi Pemotretan (Shooting)' }
]

const sortedBookings = computed(() => {
  if (!data.value) return []
  let list = [...data.value]

  // Operational Status Filter (strictly for Client / Produksi stage)
  if (filterStatus.value) {
    if (filterStatus.value === 'pending_dp') {
      list = list.filter(b => b.dp_status !== 'paid')
    } else if (filterStatus.value === 'need_fg') {
      list = list.filter(b => b.dp_status === 'paid' && !b.fg_name)
    } else if (filterStatus.value === 'fg_assigned') {
      list = list.filter(b => b.fg_name && b.assignment_status === 'assigned')
    } else if (filterStatus.value === 'fg_ready') {
      list = list.filter(b => b.fg_name && b.assignment_status === 'confirmed')
    } else if (filterStatus.value === 'shooting') {
      list = list.filter(b => b.status === 'shooting')
    }
  }

  if (!sortBy.value) return list

  list.sort((a, b) => {
    let valA = a[sortBy.value]
    let valB = b[sortBy.value]

    if (sortBy.value === 'status') {
      valA = getDetailedStatusLabel(a) || ''
      valB = getDetailedStatusLabel(b) || ''
    } else if (sortBy.value === 'payment_status') {
      valA = getPaymentStatusLabel(a) || ''
      valB = getPaymentStatusLabel(b) || ''
    } else if (sortBy.value === 'package_name') {
      valA = a.package_name || ''
      valB = b.package_name || ''
    } else if (sortBy.value === 'fg_name') {
      valA = a.fg_name || ''
      valB = b.fg_name || ''
    }

    if (valA === undefined || valA === null) valA = ''
    if (valB === undefined || valB === null) valB = ''

    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortDesc.value 
        ? valB.localeCompare(valA, 'id') 
        : valA.localeCompare(valB, 'id')
    } else {
      if (valA < valB) return sortDesc.value ? 1 : -1
      if (valA > valB) return sortDesc.value ? -1 : 1
      return 0
    }
  })
  return list
})

function getPaymentStatusLabel(item) {
  if (item.dp_status === 'refunded' || item.balance_status === 'refunded') return 'Refunded'
  if (item.dp_status === 'paid' && item.balance_status === 'paid') return 'Lunas'
  if (item.balance_status === 'uploaded') return 'Menunggu Konfirmasi Pelunasan'
  if (item.dp_status === 'paid' && item.balance_status === 'unpaid') return 'DP 50%'
  if (item.dp_status === 'uploaded') return 'Menunggu Konfirmasi DP'
  return 'Belum Bayar'
}

function paymentStatusClass(item) {
  const label = getPaymentStatusLabel(item)
  if (label === 'Lunas') return 'bg-emerald-50 text-emerald-700 dark:bg-green-950/20 dark:text-green-400 border border-emerald-250 dark:border-green-900 font-bold'
  if (label.startsWith('Menunggu Konfirmasi')) return 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-300 dark:border-amber-800 animate-pulse'
  if (label === 'DP 50%') return 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-200 dark:border-blue-805'
  if (label === 'Refunded') return 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 border border-red-200 dark:border-red-900'
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
}
const viewMode = ref(localStorage.getItem('client_view_mode') || 'card')

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
const selectedCityFilter = ref('')
const supportedCities = ref([])
const filteredFgList = computed(() => {
  if (!selectedCityFilter.value) return fgList.value
  return fgList.value.filter(fg => (fg.city || '').toLowerCase() === selectedCityFilter.value.toLowerCase())
})
const showDeliver = ref(null)
const deliverItem = ref(null)
const deliverForm = ref({ download_url: '', password: '' })
const deliverResult = ref(null)

// Verification Modal State
const proofModalItem = ref(null)
const proofModalType = ref('')
const proofUrl = ref('')
const verificationResult = ref(null)

// Reschedule Requests Inbox State
const showRescheduleInbox = ref(false)
const rescheduleRequests = ref([])
const submittingAction = ref(null)

// Bulk Checkbox Operations State
const selectedBookingIds = ref([])
const bulkLoading = ref(false)
const showBulkAssignModal = ref(false)
const bulkFgId = ref('')
const bulkFgFee = ref('')
const bulkConflictErrors = ref([])

const isAllSelected = computed(() => {
  if (sortedBookings.value.length === 0) return false
  return sortedBookings.value.every(b => selectedBookingIds.value.includes(b.id))
})

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedBookingIds.value = []
  } else {
    selectedBookingIds.value = sortedBookings.value.map(b => b.id)
  }
}

async function bulkDelete() {
  if (selectedBookingIds.value.length === 0) return
  if (!await confirm(`Hapus ${selectedBookingIds.value.length} data client terpilih secara permanen? Seluruh booking, invoice, dan penugasan terkait akan dihapus bersih.`)) return

  bulkLoading.value = true
  try {
    const res = await fetch(`${API}/bookings/bulk-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ids: selectedBookingIds.value })
    })
    const d = await res.json()
    if (!res.ok) throw new Error(d.error || 'Gagal menghapus massal')

    alert(d.message || 'Data client berhasil dihapus massal!')
    selectedBookingIds.value = []
    await load()
  } catch (e) {
    alert(e.message)
  } finally {
    bulkLoading.value = false
  }
}

async function bulkVerifyDp() {
  if (selectedBookingIds.value.length === 0) return
  if (!await confirm(`Verifikasi pembayaran DP untuk ${selectedBookingIds.value.length} client terpilih secara massal?`)) return

  bulkLoading.value = true
  try {
    const res = await fetch(`${API}/bookings/bulk-verify-dp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ids: selectedBookingIds.value })
    })
    const d = await res.json()
    if (!res.ok) throw new Error(d.error || 'Gagal verifikasi DP massal')

    alert(d.message || 'Pembayaran DP berhasil diverifikasi massal!')
    selectedBookingIds.value = []
    await load()
  } catch (e) {
    alert(e.message)
  } finally {
    bulkLoading.value = false
  }
}

function openBulkAssign() {
  bulkConflictErrors.value = []
  bulkFgId.value = ''
  bulkFgFee.value = ''
  
  const selectedBookings = sortedBookings.value.filter(b => selectedBookingIds.value.includes(b.id))
  const cities = [...new Set(selectedBookings.map(b => b.city).filter(Boolean))]
  if (cities.length === 1) {
    const found = supportedCities.value.find(c => c.toLowerCase() === cities[0].toLowerCase());
    selectedCityFilter.value = found || cities[0];
  }
  
  showBulkAssignModal.value = true
}

async function submitBulkAssign() {
  if (!bulkFgId.value) return
  bulkLoading.value = true
  bulkConflictErrors.value = []

  try {
    const res = await fetch(`${API}/bookings/bulk-assign-fg`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        ids: selectedBookingIds.value,
        fg_id: parseInt(bulkFgId.value),
        fg_fee: bulkFgFee.value ? parseInt(bulkFgFee.value) : undefined
      })
    })
    const d = await res.json()
    if (!res.ok) {
      if (d.conflicts) {
        bulkConflictErrors.value = d.conflicts
      }
      throw new Error(d.error || 'Gagal Assign Massal')
    }

    alert(d.message || 'Penugasan massal berhasil!')
    showBulkAssignModal.value = false
    selectedBookingIds.value = []
    await load()
  } catch (e) {
    if (bulkConflictErrors.value.length === 0) {
      alert(e.message)
    }
  } finally {
    bulkLoading.value = false
  }
}

async function loadRescheduleRequests() {
  try {
    const res = await fetch(`${API}/reschedule-requests?status=pending`, { credentials: 'include' })
    const data = await res.json()
    if (res.ok && data.data) {
      rescheduleRequests.value = data.data
    }
  } catch (e) {
    console.error('Failed to load reschedule requests:', e)
  }
}

function getPendingReschedule(bookingId) {
  if (!bookingId || !rescheduleRequests.value) return null
  return rescheduleRequests.value.find(r => r.booking_id === bookingId) || null
}

async function approveReschedule(req) {
  if (!await confirm(`Setujui perubahan jadwal untuk ${req.client_name} ke tanggal ${req.new_graduation_date} jam ${req.new_shooting_time}?`)) return
  submittingAction.value = req.id
  try {
    const res = await fetch(`${API}/reschedule-requests/${req.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ new_fg_id: req.selected_fg_id || undefined })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Gagal menyetujui reschedule')

    alert(data.message || 'Perubahan jadwal berhasil disetujui!')
    await loadRescheduleRequests()
    await load()
  } catch (e) {
    alert(e.message)
  } finally {
    submittingAction.value = null
  }
}

async function rejectReschedule(req) {
  const reason = prompt(`Alasan penolakan reschedule untuk ${req.client_name}:`, 'Jadwal di jam tersebut sudah penuh')
  if (reason === null) return
  submittingAction.value = req.id
  try {
    const res = await fetch(`${API}/reschedule-requests/${req.id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ reason })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Gagal menolak reschedule')

    alert('Permohonan reschedule telah ditolak.')
    await loadRescheduleRequests()
  } catch (e) {
    alert(e.message)
  } finally {
    submittingAction.value = null
  }
}

function isPdf(url) {
  return url && url.toLowerCase().endsWith('.pdf')
}

async function openVerifyModal(item, type) {
  const url = type === 'dp' ? item.dp_bukti_url : item.balance_bukti_url
  if (url) {
    proofModalItem.value = item
    proofModalType.value = type
    proofUrl.value = url
  } else {
    const label = verifyModalLabel(item, type)
    if (await confirm(`Verifikasi pembayaran ${label} secara manual untuk ${item.client_name}?`)) {
      verifyManual(item, type)
    }
  }
}

function verifyModalLabel(item, type) {
  if (!item) return ''
  // Full payment: balance_amount = 0, both uploaded simultaneously
  if (type === 'dp' && (item.balance_amount === 0 || item.balance_amount == null)) {
    return 'Lunas (100%)'
  }
  if (type === 'dp') {
    const pct = item.total_price > 0 ? Math.round((item.dp_amount / item.total_price) * 100) : 50
    return `DP (${pct}%)`
  }
  return 'Pelunasan'
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
    let url = `${API}/bookings?limit=100`
    if (searchQ.value) url += '&search=' + encodeURIComponent(searchQ.value)
    const r = await fetch(url, { credentials: 'include' })
    const d = await r.json()
    data.value = d.data || []
    if (detailItem.value) {
      const updated = data.value.find(b => b.id === detailItem.value.id)
      if (updated) detailItem.value = updated
    }
    loadRescheduleRequests()
  } catch {}
  if (!silent) loading.value = false
}

async function loadCities() {
  try {
    const res = await fetch('/api/public/settings')
    if (res.ok) {
      const d = await res.json()
      supportedCities.value = d.supported_cities || ['Makassar', 'Jakarta', 'Surabaya', 'Yogyakarta', 'Bandung']
    }
  } catch {}
}

let timer = null
onMounted(() => {
  loadCities()
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
  
  // Auto-detect city filter based on booking city or location/university details
  let matchedCity = '';
  if (item.city) {
    const found = supportedCities.value.find(c => c.toLowerCase() === item.city.toLowerCase());
    matchedCity = found || item.city;
  }
  
  if (!matchedCity) {
    const locationText = ((item.location || '') + ' ' + (item.university || '')).toLowerCase();
    for (const city of supportedCities.value) {
      if (locationText.includes(city.toLowerCase())) {
        matchedCity = city;
        break;
      }
    }
  }
  selectedCityFilter.value = matchedCity;

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

const showDriveModal = ref(false)
const driveItem = ref(null)
const driveForm = ref({
  drive_parent_url: '',
  staging_drive_url: '',
  highlight_drive_url: '',
  download_url: ''
})
const savingDrive = ref(false)
const generatingDrive = ref(false)

function getDriveUploadButton(item) {
  if (!item) return null

  const isFinalDelivered = ['Terkirim ke Client (Final)', 'delivered', 'completed', 'Selesai'].includes(item.pp_status) || ['delivered', 'completed'].includes(item.booking_status || item.status)
  const isStagingDone = isFinalDelivered || ['ready', 'submitted', 'cleaned'].includes(item.selection_status) || ['Client Memilih', 'Proses Edit Highlight', 'Highlight Siap', 'Selesai'].includes(item.pp_status)
  const isHighlightDone = isFinalDelivered || !!(item.highlight_drive_url_unlocked || ['Highlight Siap', 'Terkirim ke Client (Final)', 'Selesai', 'delivered', 'completed'].includes(item.pp_status))

  // 4. TAHAP 4: Selesai / Terkirim ke Client
  if (isFinalDelivered) {
    return {
      label: 'Seluruh File Terkirim',
      icon: '✅',
      target: 'final',
      url: item.download_url || item.drive_parent_url,
      bgClass: 'bg-emerald-700 hover:bg-emerald-800',
      title: 'Seluruh file foto telah terkirim ke timeline klien. Klik untuk buka folder Drive'
    }
  }

  // 1. TAHAP 1: Unggah JPG Staging (Galeri Seleksi Foto Mentah)
  if (!isStagingDone && item.staging_drive_url) {
    return {
      label: 'Upload JPG / Galeri Photo',
      icon: '📁',
      target: 'staging',
      url: item.staging_drive_url,
      bgClass: 'bg-amber-600 hover:bg-amber-700',
      title: 'Buka Subfolder Staging JPG untuk drag & drop foto mentah seleksi'
    }
  }

  // 2. TAHAP 2: Unggah Hasil Photo Highlight (Fast Editing)
  if (isStagingDone && !isHighlightDone && item.highlight_drive_url) {
    return {
      label: 'Upload Highlight',
      icon: '⭐',
      target: 'highlight',
      url: item.highlight_drive_url,
      bgClass: 'bg-indigo-600 hover:bg-indigo-700',
      title: 'Buka Subfolder Highlight untuk upload foto editan cepat'
    }
  }

  // 3. TAHAP 3: Unggah Final All Edited Photos
  if (item.download_url) {
    return {
      label: 'Upload Final Edit',
      icon: '📦',
      target: 'final',
      url: item.download_url,
      bgClass: 'bg-emerald-600 hover:bg-emerald-700',
      title: 'Buka Subfolder Final Edit'
    }
  }

  // Fallback
  if (item.drive_parent_url) {
    return {
      label: 'Buka Master Folder',
      icon: '🔗',
      target: 'parent',
      url: item.drive_parent_url,
      bgClass: 'bg-slate-700 hover:bg-slate-800',
      title: 'Buka Folder Utama Client di Google Drive'
    }
  }

  return null
}

async function autoGenerateDriveFolder(item) {
  if (!item || !item.id) return
  if (!await confirm(`Generate otomatis folder Google Drive untuk client ${item.client_name}?`)) return
  generatingDrive.value = true
  try {
    const res = await fetch(`${API}/bookings/${item.id}/create-drive`, {
      method: 'POST',
      credentials: 'include'
    })
    const d = await res.json()
    if (res.ok && d.success) {
      alert(d.message || '✓ Folder Drive berhasil dibuat!')
      showDriveModal.value = false
      load()
    } else {
      alert(`⚠️ ${d.error || 'Gagal generate folder Drive'}`)
    }
  } catch (e) {
    alert(`⚠️ Error: ${e.message}`)
  } finally {
    generatingDrive.value = false
  }
}

function openDriveMapping(item) {
  driveItem.value = item
  driveForm.value = {
    drive_parent_url: item.drive_parent_url || '',
    staging_drive_url: item.staging_drive_url || '',
    highlight_drive_url: item.highlight_drive_url || '',
    download_url: item.download_url || ''
  }
  showDriveModal.value = true
}

async function saveDriveMapping() {
  savingDrive.value = true
  try {
    const res = await fetch(`${API}/bookings/${driveItem.value.id}/drive-mapping`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(driveForm.value)
    })
    const dataRes = await res.json()
    if (!res.ok) {
      alert(dataRes.error || 'Gagal menyimpan mapping')
    } else {
      showDriveModal.value = false
      alert('Mapping Google Drive berhasil disimpan!')
      // Update item in local data array
      const idx = data.value.findIndex(b => b.id === driveItem.value.id)
      if (idx !== -1) {
        data.value[idx].drive_parent_url = driveForm.value.drive_parent_url
        data.value[idx].staging_drive_url = driveForm.value.staging_drive_url
        data.value[idx].highlight_drive_url = driveForm.value.highlight_drive_url
        data.value[idx].download_url = driveForm.value.download_url
      }
      load() // reload bookings
    }
  } catch (e) {
    console.error(e)
    alert('Terjadi kesalahan jaringan')
  }
  savingDrive.value = false
}

async function setStatus(item, s) {
  if (!await confirm(`Set status ke "${s}"?`)) return
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
  if (!await confirm(`Tandai selesai untuk ${item.client_name}?`)) return
  try {
    const r = await fetch(`${API}/bookings/${item.id}/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ status: 'completed' }) })
    const d = await r.json()
    if (d.status === 'ok') load()
    else alert(d.error)
  } catch {}
}

function getDetailedStatusLabel(item) {
  if (item.dp_status === 'uploaded') return 'Menunggu Verifikasi DP'
  if (item.balance_status === 'uploaded') return 'Menunggu Verifikasi Pelunasan'
  if (item.is_session_done && item.balance_status !== 'paid' && Number(item.balance_amount || 0) > 0) {
    return 'Sesi Selesai (Menunggu Pelunasan)'
  }
  if (item.status === 'confirmed') {
    if (!item.fg_name) return 'Menunggu Assignment FG'
    return 'FG Ditugaskan'
  }
  if (item.status === 'shooting') return item.is_session_done ? 'Sesi Selesai (Menunggu Pelunasan)' : 'Sesi Foto Berlangsung'
  if (item.status === 'post_production') return 'Post Production'
  if (item.status === 'delivered') return 'Hasil Foto Terkirim'
  if (item.status === 'completed') return 'Selesai'
  if (item.status === 'cancelled') return 'Dibatalkan'
  return item.status
}

async function markShootDone(item) {
  const isPaid = item.balance_status === 'paid' || Number(item.balance_amount || 0) === 0
  const confirmText = isPaid 
    ? `Tandai sesi pemotretan selesai untuk ${item.client_name}? Karena pembayaran sudah lunas (100%), booking akan langsung masuk ke Post Production.`
    : `Tandai sesi pemotretan selesai untuk ${item.client_name}? Booking akan berstatus "Menunggu Pelunasan" sebelum dapat diproses ke Post Production.`
  
  if (!await confirm(confirmText)) return

  try {
    const r = await fetch(`${API}/bookings/${item.id}/mark-session-done`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    })
    const d = await r.json()
    if (r.ok && d.success) {
      alert(d.message || 'Sesi pemotretan berhasil ditandai selesai!')
      await load()
    } else {
      alert(d.error || 'Gagal menandai sesi selesai')
    }
  } catch (err) {
    alert('Terjadi kesalahan: ' + err.message)
  }
}

function statusClass(s) {
  const map = {
    confirmed: 'bg-[#EDF2EB] text-[#2E7D32] dark:bg-green-950/20 dark:text-green-400',
    shooting: 'bg-[#FFF7ED] text-[#C2410C] dark:bg-amber-950/20 dark:text-amber-500',
    post_production: 'bg-[#EFF6FF] text-[#1E40AF] dark:bg-blue-950/20 dark:text-blue-400',
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
  const token = item.tracking_token || item.id
  const trackingUrl = `${window.location.origin}/tracking.html?code=${encodeURIComponent(token)}`
  const waMessage = `Halo Kak ${item.client_name}! 👋\n\nBerikut link untuk melacak status reservasi & dokumentasi wisuda Anda:\n\n🔍 Link Tracking:\n${trackingUrl}\n\n🔗 Kode Tracking Client: ${token}\n\nTerima kasih! 🙏`;
  return `https://api.whatsapp.com/send?phone=${item.client_phone}&text=${encodeURIComponent(waMessage)}`;
}

async function cancelBooking(item) {
  if (!item) return
  if (!await confirm(`Apakah Anda yakin ingin membatalkan booking client '${item.client_name}' (Booking #${item.id})? Data pembayaran DP akan tetap tersimpan di laporan keuangan, dan jadwal fotografer akan dibebaskan.`)) return

  try {
    const res = await fetch(`${API}/bookings/${item.id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    })
    const d = await res.json()
    if (!res.ok) {
      alert(d.error || 'Gagal membatalkan booking')
      return
    }
    alert(d.message || 'Booking berhasil dibatalkan!')
    detailItem.value = null
    await load()
  } catch (e) {
    console.error('Cancel booking error:', e)
    alert('Terjadi kesalahan koneksi.')
  }
}

async function deleteBooking(item) {
  if (!item) return
  
  if (!await confirm(`Apakah Anda yakin ingin menghapus data client '${item.client_name}' (Booking #${item.id}) secara permanen? Seluruh data booking, invoice, bukti bayar, dan penugasan fotografer akan dihapus bersih tanpa sisa.`)) return

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
  if (!await confirm(`Reset token tracking untuk ${item.client_name}? Token lama akan hangus dan dibuatkan link baru.`)) return

  try {
    const res = await fetch(`/api/admin/bookings/${item.id}/reset-token`, {
      method: 'POST',
      credentials: 'include'
    })
    const d = await res.json()
    if (res.ok && d.tracking_token) {
      item.tracking_token = d.tracking_token
      if (detailItem.value && detailItem.value.id === item.id) {
        detailItem.value.tracking_token = d.tracking_token
      }
      alert(`Token berhasil direset!\nToken Baru: ${d.tracking_token}`)
      await load(true)
    } else {
      alert(d.error || 'Gagal mereset token.')
    }
  } catch (e) {
    alert('Terjadi kesalahan koneksi.')
  }
}
</script>
