<template>
  <div>
    <div class="flex items-center justify-between mb-5">
      <h2 class="text-xl font-bold text-[#2D1B14] dark:text-slate-200">Freelancers & Rekrutmen</h2>
      <button @click="openForm(null)" class="px-3.5 py-2 bg-[#1A1A2E] text-[#C59B63] rounded-xl text-xs font-semibold hover:bg-[#2A2A4E] transition shadow-md shadow-[#1A1A2E]/8 flex items-center gap-1.5">+ Tambah FG</button>
    </div>

    <!-- Tabs Nav -->
    <div class="flex border-b border-[#E8D5C8] dark:border-slate-800 mb-6">
      <button @click="activeTab = 'active'; currentPage = 1; selectedCity = 'all'" class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition flex items-center gap-2 cursor-pointer" 
        :class="activeTab === 'active' ? 'border-[#1A1A2E] text-[#1A1A2E] dark:border-[#C59B63] dark:text-[#C59B63] font-bold' : 'border-transparent text-[#8A7A72] hover:text-[#2D1B14]'">
        <span>👥 Partner Aktif</span>
        <span class="px-1.5 py-0.2 text-[10px] rounded-full bg-[#FAF6F0] text-[#C59B63] dark:bg-slate-800 dark:text-amber-300 border border-[#E8D5C8]/60 dark:border-slate-700 font-extrabold">{{ activeFreelancersCount }}</span>
      </button>

      <button @click="activeTab = 'alumni'; currentPage = 1; selectedCity = 'all'" class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition flex items-center gap-2 cursor-pointer" 
        :class="activeTab === 'alumni' ? 'border-[#1A1A2E] text-[#1A1A2E] dark:border-[#C59B63] dark:text-[#C59B63] font-bold' : 'border-transparent text-[#8A7A72] hover:text-[#2D1B14]'">
        <span>📦 Alumni / Non-Aktif</span>
        <span v-if="alumniFreelancersCount > 0" class="px-1.5 py-0.2 text-[10px] rounded-full bg-[#FAF9F6] dark:bg-slate-800 text-[#8A7A72] dark:text-slate-300 border border-[#E5E0D8] dark:border-slate-700 font-extrabold">{{ alumniFreelancersCount }}</span>
      </button>

      <button @click="activeTab = 'applications'; currentPage = 1" class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition flex items-center gap-2 cursor-pointer" 
        :class="activeTab === 'applications' ? 'border-[#1A1A2E] text-[#1A1A2E] dark:border-[#C59B63] dark:text-[#C59B63] font-bold' : 'border-transparent text-[#8A7A72] hover:text-[#2D1B14]'">
        <span>📩 Pendaftar Baru</span>
        <span v-if="pendingAppsCount > 0" class="px-2 py-0.5 bg-[#C59B63] text-white text-[9px] font-bold rounded-full shadow-sm">{{ pendingAppsCount }}</span>
      </button>
    </div>

    <div v-if="loading || (activeTab === 'applications' && loadingApps)" class="flex justify-center py-12">
      <div class="loading-spinner"></div>
    </div>

    <div v-else class="space-y-4">
      <!-- TAB PARTNER AKTIF & ALUMNI -->
      <template v-if="activeTab === 'active' || activeTab === 'alumni'">
        <!-- Filter Kota & Search Bar -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <!-- City Segmented Filter Tabs -->
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button @click="selectedCity = 'all'; currentPage = 1"
              class="px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer"
              :class="selectedCity === 'all' ? 'bg-[#1A1A2E] text-[#C59B63] shadow-sm font-bold' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50'">
              <span>🌐 Semua Kota</span>
              <span class="px-1.5 py-0.2 text-[10px] rounded-full bg-[#FAF6F0] text-[#C59B63] dark:bg-slate-800 dark:text-amber-300 font-extrabold">{{ filteredFreelancers.length }}</span>
            </button>

            <button v-for="(cnt, city) in cityCounts" :key="city"
              @click="selectedCity = city; currentPage = 1"
              class="px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer"
              :class="selectedCity === city ? 'bg-[#1A1A2E] text-[#C59B63] shadow-sm font-bold' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50'">
              <span>📍 {{ city }}</span>
              <span class="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold">{{ cnt }}</span>
            </button>
          </div>

          <!-- Search Input -->
          <div class="w-full sm:w-64 shrink-0">
            <input type="text" v-model="searchQuery" @input="currentPage = 1" placeholder="🔍 Cari nama, WA, spesialisasi..." class="input-fancy !text-xs w-full dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
          </div>
        </div>

        <!-- Desktop Table (Hidden on Mobile) -->
        <div class="card overflow-hidden dark:bg-slate-900 dark:border-slate-800 hidden md:block">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-[#8A7A72] dark:text-slate-400 border-b border-[#E8D5C8] dark:border-slate-800 text-left text-xs">
                <th class="p-3 font-medium">Nama &amp; Spesialisasi</th>
                <th class="p-3 font-medium text-center">Kota</th>
                <th class="p-3 font-medium">No. WhatsApp</th>
                <th class="p-3 font-medium">Rate Default</th>
                <th class="p-3 font-medium text-center">Status</th>
                <th class="p-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in paginatedFreelancers" :key="item.id" class="border-b border-[#E8D5C8]/40 dark:border-slate-800/60 hover:bg-[#FFF8F3] dark:hover:bg-slate-800/50 text-[#2D1B14] dark:text-slate-200 text-xs transition">
                <td class="p-3">
                  <div class="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <span>{{ item.name }}</span>
                  </div>
                  <div class="flex flex-wrap gap-1 mt-0.5">
                    <span v-for="s in (item.specialties || []).slice(0, 2)" :key="s" class="px-1.5 py-0.2 bg-[#FAF6F0] text-[#C59B63] dark:bg-slate-800 dark:text-amber-300 rounded text-[9px] font-bold">{{ s }}</span>
                    <span v-if="(item.specialties || []).length > 2" class="text-[9px] text-[#8A7A72]">+{{ item.specialties.length - 2 }}</span>
                  </div>
                </td>
                <td class="p-3 text-center">
                  <span class="px-2 py-0.5 bg-[#FAF6F0] dark:bg-slate-800 text-[#8A7A72] dark:text-slate-300 rounded text-[10px] font-bold uppercase tracking-wider">{{ item.city || '-' }}</span>
                </td>
                <td class="p-3 font-mono text-[11px]">+{{ item.phone }}</td>
                <td class="p-3 font-semibold text-[#2D1B14] dark:text-slate-100">
                  <div>Rp {{ (item.default_rate || 0).toLocaleString('id-ID') }}</div>
                  <div v-if="item.pending_rate" class="text-[9px] text-[#C59B63] font-bold mt-0.5" title="Pengajuan rate baru">
                    ⏳ Rp {{ item.pending_rate.toLocaleString('id-ID') }}
                  </div>
                </td>
                <td class="p-3 text-center">
                  <span class="status-chip" :class="item.active ? 'bg-[#FAF6F0] text-[#C59B63] border border-[#E8D5C8]/80 dark:bg-slate-800 dark:text-amber-300 dark:border-slate-700' : 'bg-[#FAF9F6] text-[#8A7A72] border border-[#E5E0D8] dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800'">
                    {{ item.active ? 'Aktif' : 'Nonaktif' }}
                  </span>
                </td>
                <td class="p-3">
                  <div class="flex gap-1.5 items-center justify-end flex-wrap">
                    <button @click="openDetail(item)" class="px-2.5 py-1.5 bg-[#1A1A2E] text-[#C59B63] hover:bg-[#2A2A4E] rounded-lg text-[10px] font-bold transition shadow-sm cursor-pointer flex items-center gap-1">
                      <span>👁️</span> <span>Detail</span>
                    </button>
                    <a :href="getWaFgPortalLink(item)" target="_blank" class="px-2 py-1.5 bg-[#FAF6F0] dark:bg-slate-800 text-[#8A7A72] dark:text-slate-300 border border-[#E8D5C8]/80 dark:border-slate-700 rounded-lg text-[10px] font-semibold hover:bg-[#FFF0E8] transition" title="Hubungi WhatsApp">
                      💬 WA
                    </a>
                    <button v-if="item.pending_rate" @click="approveRate(item)" class="px-2.5 py-1.5 bg-[#1A1A2E] text-[#C59B63] border border-[#C59B63]/30 rounded-lg text-[10px] font-bold transition">✓ Setujui Rate</button>
                    <button @click="openForm(item)" class="px-2 py-1.5 bg-[#FAF6F0] dark:bg-slate-800 text-[#8A7A72] dark:text-slate-300 border border-[#E8D5C8]/80 dark:border-slate-700 rounded-lg text-[10px] font-medium hover:bg-[#FFF0E8] hover:text-[#2D1B14] transition">Edit</button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredFreelancers.length === 0">
                <td colspan="6" class="p-12 text-center text-[#C4B0A5] dark:text-slate-500">Tidak ada fotografer ditemukan.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Cards List (Visible on Mobile) -->
        <div class="md:hidden space-y-3">
          <div v-for="item in paginatedFreelancers" :key="item.id" class="card p-4 space-y-3 dark:bg-slate-900 dark:border-slate-800">
            <div class="flex justify-between items-start">
              <div>
                <h4 class="font-bold text-sm text-[#2D1B14] dark:text-slate-200">{{ item.name }}</h4>
                <div class="flex items-center gap-1.5 mt-1">
                  <span class="px-1.5 py-0.5 bg-[#FAF6F0] dark:bg-slate-800 text-[#8A7A72] dark:text-slate-400 rounded text-[9px] font-bold uppercase tracking-wider">{{ item.city || '-' }}</span>
                  <p class="text-[10px] text-[#8A7A72] font-mono">+{{ item.phone }}</p>
                </div>
              </div>
              <span class="status-chip flex-shrink-0 text-[10px]" :class="item.active ? 'bg-[#E8F5E9] text-[#2E7D32] dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-[#FFF5F0] text-[#C4B0A5] dark:bg-slate-800 dark:text-slate-400'">
                {{ item.active ? 'Aktif' : 'Nonaktif' }}
              </span>
            </div>

            <div class="text-[11px] space-y-1.5 pt-2 border-t border-[#E8D5C8]/40 dark:border-slate-800/60 text-[#8A7A72] dark:text-slate-400">
              <div class="flex justify-between">
                <span>Rate Default:</span>
                <div class="text-right">
                  <span class="font-bold text-amber-600 dark:text-amber-400">Rp {{ (item.default_rate || 0).toLocaleString('id-ID') }}</span>
                  <div v-if="item.pending_rate" class="text-[9px] text-amber-500 font-bold mt-0.5">
                    ⏳ Ajuan: Rp {{ item.pending_rate.toLocaleString('id-ID') }}
                  </div>
                </div>
              </div>
              <div class="flex justify-between items-center" v-if="item.specialties?.length">
                <span>Spesialisasi:</span>
                <div>
                  <span v-for="s in item.specialties" :key="s" class="status-chip bg-[#FAF6F0] text-[#8A7A72] dark:bg-slate-800 dark:text-slate-300 ml-1 text-[9px]">{{ s }}</span>
                </div>
              </div>
              <div class="flex justify-between" v-if="item.access_code">
                <span>Kode Akses:</span>
                <div class="flex items-center gap-1" @click.stop>
                  <code class="px-1.5 py-0.5 bg-[#FAF6F0] dark:bg-slate-950 border border-[#E8D5C8]/60 dark:border-slate-800 rounded font-mono text-[9px] text-[#C59B63] font-bold">{{ item.access_code }}</code>
                  <button @click="copyCode(item)" class="text-[#8A7A72] hover:text-[#2D1B14] text-[10px] p-0.5 rounded transition">
                    {{ copiedId === item.id ? '✓' : '📋' }}
                  </button>
                  <button @click="regenerateCode(item)" class="text-[#8A7A72] hover:text-[#D94A3D] text-[10px] p-0.5 rounded transition">
                    🔄
                  </button>
                </div>
              </div>
              <div class="flex flex-col gap-0.5 pt-1">
                <span class="text-[10px] text-[#C4B0A5] uppercase tracking-wider font-bold">Rekening</span>
                <div v-if="item.bank_account" class="text-[11px] text-[#2D1B14] dark:text-slate-200 font-medium">
                  {{ item.bank_account.bank }} - {{ item.bank_account.number || item.bank_account.norek }}
                  <div class="text-[9px] text-[#8A7A72]">a.n. {{ item.bank_account.name || item.bank_account.atas_nama }}</div>
                </div>
                <div class="else text-[11px] text-slate-400 font-medium">-</div>
              </div>
            </div>

            <div class="flex flex-wrap gap-2 pt-2 border-t border-[#E8D5C8]/40 dark:border-slate-800/60" @click.stop>
              <a :href="getWaFgPortalLink(item)" target="_blank" class="flex-1 px-3 py-2 bg-[#FAF6F0] dark:bg-slate-800 text-[#8A7A72] dark:text-slate-300 border border-[#E8D5C8]/80 dark:border-slate-700 rounded-xl text-xs font-semibold text-center hover:bg-[#FFF0E8] transition">
                💬 Hubungi
              </a>
              <button @click="openForm(item)" class="flex-1 px-3 py-2 bg-[#FFF0E8] dark:bg-amber-950/40 text-[#D94A3D] dark:text-amber-400 rounded-xl text-xs font-semibold text-center hover:bg-[#FFE5DA] transition">
                Edit
              </button>
              <button @click="toggleActive(item)" class="flex-1 px-3 py-2 rounded-xl text-xs font-semibold text-center transition"
                :class="item.active ? 'bg-[#FEF2F2] text-[#EF4444] hover:bg-[#FEE2E2]' : 'bg-[#FDECEA] text-[#D94A3D] hover:bg-[#FCE8E6]'">
                {{ item.active ? 'Nonaktif' : 'Aktifkan' }}
              </button>
              <button @click="hapus(item)" class="px-3 py-2 bg-[#FEF2F2] dark:bg-rose-950/40 text-[#EF4444] dark:text-rose-400 rounded-xl text-xs font-semibold text-center hover:bg-[#FEE2E2] transition">
                Hapus
              </button>
            </div>
          </div>
          <div v-if="filteredFreelancers.length === 0" class="text-center py-12 text-[#C4B0A5] dark:text-slate-500">Tidak ada fotografer ditemukan.</div>
        </div>

        <!-- Pagination Controls Bar -->
        <div v-if="filteredFreelancers.length > 0" class="card p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400 mt-3">
          <div class="flex items-center gap-2">
            <span>Tampilkan:</span>
            <select v-model="itemsPerPage" @change="currentPage = 1" class="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold dark:text-slate-200">
              <option :value="10">10 / Hal</option>
              <option :value="25">25 / Hal</option>
              <option :value="50">50 / Hal</option>
              <option :value="999999">Semua</option>
            </select>
            <span class="text-[11px] text-slate-500 font-medium">
              Menampilkan {{ filteredFreelancers.length > 0 ? (currentPage - 1) * (itemsPerPage === 999999 ? filteredFreelancers.length : itemsPerPage) + 1 : 0 }} - {{ Math.min(currentPage * (itemsPerPage === 999999 ? filteredFreelancers.length : itemsPerPage), filteredFreelancers.length) }} dari {{ filteredFreelancers.length }} Fotografer
            </span>
          </div>

          <div class="flex items-center gap-1.5" v-if="totalPages > 1 && itemsPerPage !== 999999">
            <button @click="currentPage > 1 && currentPage--" :disabled="currentPage === 1" class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-30 disabled:cursor-not-allowed font-medium">
              ❮ Sebelumnya
            </button>
            <span class="px-3 py-1 font-bold text-slate-900 dark:text-slate-200 text-xs">Halaman {{ currentPage }} dari {{ totalPages }}</span>
            <button @click="currentPage < totalPages && currentPage++" :disabled="currentPage === totalPages" class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-30 disabled:cursor-not-allowed font-medium">
              Selanjutnya ❯
            </button>
          </div>
        </div>

        <!-- Portal Link Info -->
        <div class="mt-4 p-4 card border-l-4 border-l-[#F4A261] dark:bg-slate-900 dark:border-slate-800">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-[10px] font-semibold text-[#8A7A72]/80 dark:text-slate-400 uppercase tracking-wider">🔗 Link Portal Freelance (Publik)</span>
          </div>
          <p class="text-xs text-[#8A7A72] dark:text-slate-400">Bagikan link berikut ke freelancer agar bisa cek jadwal client mereka:</p>
          <div class="flex items-center gap-2 mt-2">
            <code class="flex-1 px-3 py-2 bg-[#FFF0E8] dark:bg-slate-950 rounded-xl text-[11px] text-[#2D1B14] dark:text-slate-200 font-mono select-all overflow-hidden">{{ portalUrl }}</code>
            <button @click="copyPortalLink" class="px-3 py-2 bg-[#D94A3D] text-white rounded-xl text-[10px] font-semibold hover:bg-[#C0392B] transition whitespace-nowrap">
              {{ portalLinkCopied ? '✓ Tersalin' : '📋 Salin' }}
            </button>
          </div>
        </div>
      </template>

      <!-- TAB PENDAFTAR BARU -->
      <template v-else-if="activeTab === 'applications'">
        <!-- Desktop Applications Table -->
        <div class="card overflow-hidden dark:bg-slate-900 dark:border-slate-800 hidden md:block">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-[#8A7A72] dark:text-slate-400 border-b border-[#E8D5C8] dark:border-slate-800 text-left text-xs">
                <th class="p-3 font-medium">Nama Pelamar</th>
                <th class="p-3 font-medium">Kota</th>
                <th class="p-3 font-medium">WhatsApp</th>
                <th class="p-3 font-medium">Spesialisasi</th>
                <th class="p-3 font-medium">Link Portofolio</th>
                <th class="p-3 font-medium">Tanggal Daftar</th>
                <th class="p-3 font-medium">Status</th>
                <th class="p-3 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="app in applications" :key="app.id" class="border-b border-[#E8D5C8]/40 dark:border-slate-800/60 hover:bg-[#FFF8F3] dark:hover:bg-slate-800/50 text-[#2D1B14] dark:text-slate-200 text-xs transition">
                <td class="p-3 font-semibold">{{ app.name }}</td>
                <td class="p-3">
                  <span class="px-2 py-0.5 bg-[#FAF6F0] dark:bg-slate-800 text-[#8A7A72] dark:text-slate-300 rounded text-[10px] font-bold uppercase tracking-wider">{{ app.city }}</span>
                </td>
                <td class="p-3 font-mono text-[11px]">+{{ app.phone }}</td>
                <td class="p-3">
                  <span v-for="s in parseSpecialties(app.specialties)" :key="s" class="status-chip bg-[#FAF6F0] text-[#8A7A72] dark:bg-slate-800 dark:text-slate-300 mr-1 text-[10px]">{{ s }}</span>
                </td>
                <td class="p-3">
                  <a :href="app.portfolio_url" target="_blank" class="text-cyan-600 dark:text-cyan-400 underline font-medium truncate max-w-[150px] inline-block">Buka Portofolio ↗</a>
                </td>
                <td class="p-3 text-[#8A7A72] dark:text-slate-400">{{ new Date(app.created_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'}) }}</td>
                <td class="p-3">
                  <span class="status-chip" :class="{
                    'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400': app.status === 'pending',
                    'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400': app.status === 'approved',
                    'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400': app.status === 'rejected'
                  }">
                    {{ app.status === 'pending' ? 'Menunggu' : app.status === 'approved' ? 'Diterima' : 'Ditolak' }}
                  </span>
                </td>
                <td class="p-3">
                  <button v-if="app.status === 'pending'" @click="openReview(app)" class="px-3 py-1.5 bg-[#1A1A2E] text-[#C59B63] hover:bg-[#2A2A4E] transition rounded-lg text-[10px] font-semibold whitespace-nowrap">
                    ⭐ Review & Approval
                  </button>
                  <span v-else class="text-[10px] text-[#8A7A72] dark:text-slate-500 italic">- Sudah diproses</span>
                </td>
              </tr>
              <tr v-if="applications.length === 0">
                <td colspan="8" class="p-12 text-center text-[#C4B0A5] dark:text-slate-500">Belum ada pelamar baru</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Applications Cards -->
        <div class="md:hidden space-y-3">
          <div v-for="app in applications" :key="app.id" class="card p-4 space-y-3 dark:bg-slate-900 dark:border-slate-800">
            <div class="flex justify-between items-start">
              <div>
                <h4 class="font-bold text-sm text-[#2D1B14] dark:text-slate-200">{{ app.name }}</h4>
                <div class="flex items-center gap-1.5 mt-1">
                  <span class="px-1.5 py-0.5 bg-[#FAF6F0] dark:bg-slate-800 text-[#8A7A72] dark:text-slate-400 rounded text-[9px] font-bold uppercase tracking-wider">{{ app.city }}</span>
                  <p class="text-[10px] text-[#8A7A72] font-mono">+{{ app.phone }}</p>
                </div>
              </div>
              <span class="status-chip text-[10px]" :class="{
                'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400': app.status === 'pending',
                'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400': app.status === 'approved',
                'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400': app.status === 'rejected'
              }">
                {{ app.status === 'pending' ? 'Menunggu' : app.status === 'approved' ? 'Diterima' : 'Ditolak' }}
              </span>
            </div>

            <div class="text-[11px] space-y-1.5 pt-2 border-t border-[#E8D5C8]/40 dark:border-slate-800/60 text-[#8A7A72] dark:text-slate-400">
              <div>
                <span class="block text-[9px] font-bold uppercase tracking-wider text-[#C4B0A5] mb-0.5">Spesialisasi</span>
                <span v-for="s in parseSpecialties(app.specialties)" :key="s" class="status-chip bg-[#FAF6F0] text-[#8A7A72] dark:bg-slate-800 dark:text-slate-300 mr-1 text-[9px]">{{ s }}</span>
              </div>
              <div class="pt-1">
                <span class="block text-[9px] font-bold uppercase tracking-wider text-[#C4B0A5] mb-0.5">Link Portofolio</span>
                <a :href="app.portfolio_url" target="_blank" class="text-cyan-600 dark:text-cyan-400 underline font-medium">Buka Portofolio Pelamar ↗</a>
              </div>
              <div v-if="app.gear_info" class="pt-1">
                <span class="block text-[9px] font-bold uppercase tracking-wider text-[#C4B0A5] mb-0.5">Spesifikasi Alat</span>
                <p class="text-xs text-[#2D1B14] dark:text-slate-200 leading-normal">{{ app.gear_info }}</p>
              </div>
              <div class="pt-1 text-[9px] text-[#C4B0A5]">
                Daftar pada: {{ new Date(app.created_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}) }}
              </div>
            </div>

            <div class="pt-2 border-t border-[#E8D5C8]/40 dark:border-slate-800/60" v-if="app.status === 'pending'">
              <button @click="openReview(app)" class="w-full py-2 bg-[#1A1A2E] text-[#C59B63] hover:bg-[#2A2A4E] transition rounded-xl text-xs font-semibold text-center">
                ⭐ Review & Approval
              </button>
            </div>
          </div>
          <div v-if="applications.length === 0" class="text-center py-12 text-[#C4B0A5] dark:text-slate-500">Belum ada pelamar baru</div>
        </div>
      </template>
    </div>

    <!-- Form Modal (Tambah/Edit FG Manual) -->
    <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" @click.self="showForm=false">
      <div class="card w-full max-w-lg p-6 animate-pop dark:bg-slate-900 dark:border-slate-800">
        <h3 class="font-bold text-xl text-[#2D1B14] dark:text-slate-100 mb-5">{{ editing ? 'Edit FG' : 'Tambah FG' }}</h3>
        <form @submit.prevent="simpan" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold uppercase tracking-wider">NAMA *</label>
              <input v-model="form.name" required class="input-fancy dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="Nama Lengkap FG">
            </div>
            <div>
              <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold uppercase tracking-wider">NO. WA *</label>
              <div class="flex items-center overflow-hidden rounded-xl border border-[#E5E0D8] dark:border-slate-800 bg-[#FAF6F0] dark:bg-slate-950">
                <span class="px-3 text-xs font-bold text-[#8A7A72] dark:text-slate-400 shrink-0 border-r border-[#E5E0D8] dark:border-slate-800 py-2.5">+62</span>
                <input v-model="phoneDisplay" @input="onPhoneInput" required type="tel" class="w-full px-3 py-2 text-xs bg-transparent border-0 outline-none focus:outline-none dark:text-slate-200" placeholder="8123456789">
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold uppercase tracking-wider">KOTA DOMISILI *</label>
              <select v-model="form.city" required class="input-fancy dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 bg-white">
                <option value="" disabled>Pilih kota...</option>
                <option v-for="city in supportedCities" :key="city" :value="city">{{ city }}</option>
              </select>
            </div>
            <div>
              <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold uppercase tracking-wider">SPESIALISASI (PISAH KOMA)</label>
              <input v-model="form.specialties" class="input-fancy dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="wisuda, studio, prewisuda">
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold uppercase tracking-wider">RATE DEFAULT (RP / SESI)</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8A7A72] dark:text-slate-400">Rp</span>
                <input v-model="rateDisplay" @input="onRateInput" type="text" placeholder="0" class="input-fancy !pl-9 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 font-bold text-amber-600 dark:text-amber-400">
              </div>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold uppercase tracking-wider">BANK</label>
              <input v-model="form.bank_account" class="input-fancy dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="BCA">
            </div>
            <div>
              <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold uppercase tracking-wider">NO REK</label>
              <input v-model="form.bank_number" class="input-fancy dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="123456789">
            </div>
            <div>
              <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold uppercase tracking-wider">AN. REK</label>
              <input v-model="form.bank_name" class="input-fancy dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="Atas Nama">
            </div>
          </div>

          <div class="flex gap-2 justify-end pt-2">
            <button type="button" @click="showForm=false" class="px-4 py-2.5 bg-[#FAF9F6] text-[#8A7A72] border border-[#E5E0D8] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition">Batal</button>
            <button type="submit" class="px-5 py-2.5 bg-[#1A1A2E] text-[#C59B63] rounded-xl text-xs font-semibold hover:bg-[#2A2A4E] transition shadow-md">{{ editing ? 'Simpan' : 'Tambah FG' }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Review & Approval Modal Dialog -->
    <div v-if="showAppReview && reviewingApp" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" @click.self="showAppReview=false">
      <div class="card w-full max-w-lg p-6 animate-pop dark:bg-slate-900 dark:border-slate-800 space-y-4">
        <h3 class="font-bold text-xl text-[#2D1B14] dark:text-slate-100 border-b border-[#E8D5C8] pb-2">Review Pendaftaran Partner</h3>
        
        <div class="text-xs space-y-2 text-[#2D1B14] dark:text-slate-300">
          <div class="flex justify-between"><span class="text-[#8A7A72]">Nama Pelamar:</span><span class="font-bold">{{ reviewingApp.name }}</span></div>
          <div class="flex justify-between"><span class="text-[#8A7A72]">WhatsApp:</span><span class="font-mono font-bold">+{{ reviewingApp.phone }}</span></div>
          <div class="flex justify-between"><span class="text-[#8A7A72]">Email:</span><span>{{ reviewingApp.email || '-' }}</span></div>
          <div class="flex justify-between"><span class="text-[#8A7A72]">Kota Domisili:</span><span class="font-bold text-amber-600 uppercase">{{ reviewingApp.city }}</span></div>
          <div class="flex justify-between"><span class="text-[#8A7A72]">Spesialisasi:</span><span>{{ parseSpecialties(reviewingApp.specialties).join(', ') }}</span></div>
          <div class="flex justify-between"><span class="text-[#8A7A72]">Portofolio:</span><a :href="reviewingApp.portfolio_url" target="_blank" class="text-cyan-600 dark:text-cyan-400 font-bold underline">Lihat Portofolio Kandidat ↗</a></div>
          <div class="flex flex-col gap-0.5 pt-1 border-t border-[#E8D5C8]/40">
            <span class="text-[#8A7A72] font-semibold">Spesifikasi Alat & Keterangan Tambahan:</span>
            <p class="p-2 bg-[#FAF6F0] dark:bg-slate-950 rounded-lg text-slate-700 dark:text-slate-300 font-mono text-[11px] leading-normal whitespace-pre-wrap">{{ reviewingApp.gear_info || 'Tidak ada keterangan gear' }}</p>
          </div>
        </div>

        <form @submit.prevent class="space-y-4 pt-2 border-t border-[#E8D5C8]/40">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold uppercase tracking-wider">SET RATE DEFAULT (RP / SESI)</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8A7A72] dark:text-slate-400">Rp</span>
                <input v-model="reviewRateDisplay" @input="onReviewRateInput" type="text" placeholder="0" class="input-fancy !pl-9 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 font-bold text-amber-600 dark:text-amber-400">
              </div>
              <p class="text-[9px] text-[#8A7A72] mt-1">Hanya diperlukan jika disetujui (Approved)</p>
            </div>
            <div>
              <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold uppercase tracking-wider">CATATAN REVIEWER / INTERNAL</label>
              <textarea v-model="reviewForm.reviewer_notes" class="w-full px-3 py-2 input-fancy text-xs dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 resize-none h-12" placeholder="Masukkan catatan di sini..."></textarea>
            </div>
          </div>

          <div class="flex gap-2 justify-end pt-2">
            <button type="button" @click="showAppReview=false" class="px-4 py-2.5 bg-[#FAF9F6] text-[#8A7A72] border border-[#E5E0D8] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition">Batal</button>
            <button type="button" @click="submitDecision('rejected')" class="px-5 py-2.5 bg-[#FAF9F6] text-[#8A7A72] hover:text-rose-600 border border-[#E5E0D8] hover:border-rose-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition">Tolak (Reject)</button>
            <button type="button" @click="submitDecision('approved')" class="px-5 py-2.5 bg-[#1A1A2E] text-[#C59B63] hover:bg-[#2A2A4E] rounded-xl text-xs font-semibold transition shadow-md">Setujui (Approve)</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Detail Modal Dialog -->
    <div v-if="showDetailModal && selectedFgDetail" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-md" @click.self="showDetailModal=false">
      <div class="card w-full max-w-lg p-6 animate-pop dark:bg-slate-900 dark:border-slate-800 relative max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
        <button @click="showDetailModal = false" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold transition">✕</button>

        <!-- Header Profil -->
        <div class="flex items-center gap-3 border-b border-[#E8D5C8]/80 dark:border-slate-800 pb-4">
          <div class="w-12 h-12 rounded-full bg-gradient-to-tr from-[#1A1A2E] to-[#2D1B14] flex items-center justify-center text-[#C59B63] font-bold text-lg shadow">
            {{ selectedFgDetail.name ? selectedFgDetail.name.charAt(0).toUpperCase() : 'F' }}
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <h3 class="font-bold text-lg text-[#2D1B14] dark:text-slate-100">{{ selectedFgDetail.name }}</h3>
              <button @click="toggleActive(selectedFgDetail)" class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer shadow-sm bg-[#1A1A2E] text-[#C59B63] border border-[#C59B63]/30 hover:bg-[#2A2A4E]" title="Klik untuk ubah status aktif/alumni">
                <span>{{ selectedFgDetail.active ? '🟢 Status: Aktif' : '📦 Status: Alumni (Non-Aktif)' }}</span>
                <span class="text-[9px] opacity-75 underline">(Klik Ubah)</span>
              </button>
            </div>
            <div class="flex items-center gap-2 mt-0.5 text-xs text-[#8A7A72] dark:text-slate-400">
              <span>📍 {{ selectedFgDetail.city || 'Domisili Umum' }}</span>
              <span>•</span>
              <span class="font-bold text-[#2D1B14] dark:text-slate-100">Rp {{ (selectedFgDetail.default_rate || 0).toLocaleString('id-ID') }} / Sesi</span>
            </div>
          </div>
        </div>

        <!-- Informasi Detail Grid -->
        <div class="space-y-3 text-xs">
          <!-- Kode Akses Portal -->
          <div class="p-3 bg-[#FAF6F0] dark:bg-slate-950 border border-[#E8D5C8]/80 dark:border-slate-800 rounded-xl space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-[10px] font-bold text-[#8A7A72] dark:text-slate-400 uppercase tracking-wider">🔑 KODE AKSES PORTAL</span>
              <code class="px-2.5 py-1 bg-white dark:bg-slate-900 border border-[#E8D5C8] dark:border-slate-700 rounded font-mono text-xs text-[#C59B63] font-bold">{{ selectedFgDetail.access_code || '-' }}</code>
            </div>
            <div class="flex gap-2 justify-end pt-1">
              <button @click="copyCode(selectedFgDetail)" class="px-2.5 py-1 bg-white dark:bg-slate-900 border border-[#E8D5C8] dark:border-slate-700 text-[#8A7A72] dark:text-slate-300 rounded text-[10px] font-bold hover:bg-[#FFF0E8] transition">
                {{ copiedId === selectedFgDetail.id ? '✓ Tersalin!' : '📋 Salin Kode' }}
              </button>
              <button @click="regenerateCode(selectedFgDetail)" class="px-2.5 py-1 bg-[#1A1A2E] text-[#C59B63] border border-[#C59B63]/30 rounded text-[10px] font-bold hover:bg-[#2A2A4E] transition">
                🔄 Reset &amp; Email Kode Baru
              </button>
            </div>
          </div>

          <!-- Kontak & Email -->
          <div class="grid grid-cols-2 gap-3 p-3 bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div>
              <span class="text-[10px] font-bold text-[#8A7A72] dark:text-slate-400 block mb-0.5 uppercase tracking-wider">📱 WHATSAPP</span>
              <a :href="getWaFgPortalLink(selectedFgDetail)" target="_blank" class="font-mono font-semibold text-[#C59B63] dark:text-amber-400 hover:underline flex items-center gap-1">
                +{{ selectedFgDetail.phone }} ↗
              </a>
            </div>
            <div>
              <span class="text-[10px] font-bold text-[#8A7A72] dark:text-slate-400 block mb-0.5 uppercase tracking-wider">📧 EMAIL</span>
              <span class="font-semibold text-slate-700 dark:text-slate-200 break-all">{{ selectedFgDetail.email || '-' }}</span>
            </div>
          </div>

          <!-- Detail Rekening Bank -->
          <div class="p-3 bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
            <span class="text-[10px] font-bold text-[#8A7A72] dark:text-slate-400 block mb-1 uppercase tracking-wider">🏦 REKENING BANK PAYROLL</span>
            <template v-if="selectedFgDetail.bank_account">
              <div class="font-semibold text-slate-800 dark:text-slate-200">
                {{ selectedFgDetail.bank_account.bank }} — <span class="font-mono text-[#C59B63] font-bold">{{ selectedFgDetail.bank_account.number || selectedFgDetail.bank_account.norek }}</span>
              </div>
              <div class="text-[11px] text-[#8A7A72] dark:text-slate-400">a.n. {{ selectedFgDetail.bank_account.name || selectedFgDetail.bank_account.atas_nama }}</div>
            </template>
            <template v-else>
              <span class="text-slate-400 italic">Belum diisi</span>
            </template>
          </div>

          <!-- Spesialisasi Tags -->
          <div class="p-3 bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5">
            <span class="text-[10px] font-bold text-[#8A7A72] dark:text-slate-400 block uppercase tracking-wider">🏷️ SPESIALISASI</span>
            <div class="flex flex-wrap gap-1">
              <span v-for="s in (selectedFgDetail.specialties || [])" :key="s" class="px-2 py-0.5 bg-[#FAF6F0] text-[#C59B63] dark:bg-slate-800 dark:text-amber-300 rounded text-[10px] font-semibold">{{ s }}</span>
              <span v-if="!selectedFgDetail.specialties || selectedFgDetail.specialties.length === 0" class="text-slate-400 italic">Tidak ada spesialisasi</span>
            </div>
          </div>

          <!-- Portofolio Link & Peralatan -->
          <div v-if="selectedFgDetail.portfolio_url || selectedFgDetail.gear_info" class="p-3 bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
            <div v-if="selectedFgDetail.portfolio_url">
              <span class="text-[10px] font-bold text-[#8A7A72] dark:text-slate-400 block mb-0.5 uppercase tracking-wider">🌐 PORTOFOLIO / INSTAGRAM</span>
              <a :href="selectedFgDetail.portfolio_url" target="_blank" class="text-[#C59B63] dark:text-amber-400 font-semibold hover:underline break-all">{{ selectedFgDetail.portfolio_url }} ↗</a>
            </div>
            <div v-if="selectedFgDetail.gear_info">
              <span class="text-[10px] font-bold text-[#8A7A72] dark:text-slate-400 block mb-0.5 uppercase tracking-wider">📷 INFORMASI GEAR / DOKUMEN</span>
              <p class="text-slate-700 dark:text-slate-300 font-mono text-[11px] whitespace-pre-wrap">{{ selectedFgDetail.gear_info }}</p>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2 justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-800">
          <button @click="hapus(selectedFgDetail); showDetailModal=false" class="px-3.5 py-2 bg-[#FAF9F6] text-[#8A7A72] hover:text-rose-600 dark:bg-slate-800 dark:text-slate-400 border border-[#E5E0D8] dark:border-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer">
            🗑️ Hapus
          </button>
          
          <div class="flex gap-2 items-center">
            <button @click="openForm(selectedFgDetail); showDetailModal=false" class="px-3.5 py-2 bg-[#FAF6F0] text-[#8A7A72] border border-[#E8D5C8] hover:text-[#2D1B14] dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold transition">✏️ Edit</button>
            <button @click="showDetailModal=false" class="px-4 py-2 bg-[#1A1A2E] text-[#C59B63] rounded-xl text-xs font-semibold hover:bg-[#2A2A4E] transition">Tutup</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const API = '/api/admin'
const data = ref([])
const loading = ref(true)
const showForm = ref(false)
const editing = ref(null)

// Modal Detail Profile FG
const showDetailModal = ref(false)
const selectedFgDetail = ref(null)

function openDetail(item) {
  selectedFgDetail.value = item
  showDetailModal.value = true
}

// State Filter Kota, Search & Pagination
const selectedCity = ref('all')
const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(10)

const activeFreelancersList = computed(() => {
  return data.value.filter(fg => fg.active === 1 || fg.active === true)
})

const alumniFreelancersList = computed(() => {
  return data.value.filter(fg => !fg.active || fg.active === 0)
})

const activeFreelancersCount = computed(() => activeFreelancersList.value.length)
const alumniFreelancersCount = computed(() => alumniFreelancersList.value.length)

const cityCounts = computed(() => {
  const targetList = activeTab.value === 'alumni' ? alumniFreelancersList.value : activeFreelancersList.value
  const counts = {}
  targetList.forEach(fg => {
    const c = fg.city || 'Lainnya'
    counts[c] = (counts[c] || 0) + 1
  })
  return counts
})

const filteredFreelancers = computed(() => {
  let list = activeTab.value === 'alumni' ? alumniFreelancersList.value : activeFreelancersList.value
  if (selectedCity.value !== 'all') {
    list = list.filter(fg => (fg.city || 'Lainnya') === selectedCity.value)
  }
  if (searchQuery.value && searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(fg => 
      (fg.name || '').toLowerCase().includes(q) ||
      (fg.phone || '').includes(q) ||
      (fg.city || '').toLowerCase().includes(q) ||
      (fg.email || '').toLowerCase().includes(q) ||
      (fg.access_code || '').toLowerCase().includes(q) ||
      (Array.isArray(fg.specialties) ? fg.specialties.join(' ') : String(fg.specialties || '')).toLowerCase().includes(q)
    )
  }
  return list
})

const totalPages = computed(() => {
  if (itemsPerPage.value === 999999) return 1
  return Math.ceil(filteredFreelancers.value.length / itemsPerPage.value) || 1
})

const paginatedFreelancers = computed(() => {
  if (itemsPerPage.value === 999999) return filteredFreelancers.value
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredFreelancers.value.slice(start, start + itemsPerPage.value)
})

// State Rekrutmen & Tab
const activeTab = ref('active') // 'active' | 'alumni' | 'applications'
const applications = ref([])
const loadingApps = ref(false)
const supportedCities = ref([])
const showAppReview = ref(false)
const reviewingApp = ref(null)
const reviewRateDisplay = ref('')
const reviewForm = ref({
  default_rate: 0,
  reviewer_notes: ''
})

const phoneDisplay = ref('')
const rateDisplay = ref('')

const form = ref({
  name: '',
  phone: '',
  specialties: '',
  bank_account: '',
  bank_number: '',
  bank_name: '',
  default_rate: 0,
  city: ''
})

const copiedId = ref(null)
const portalLinkCopied = ref(false)

const portalUrl = computed(() => {
  return `${window.location.origin}/freelance-portal.html`
})

// Hitung jumlah pelamar berstatus pending
const pendingAppsCount = computed(() => {
  return applications.value.filter(app => app.status === 'pending').length
})

function onPhoneInput() {
  if (!phoneDisplay.value) {
    form.value.phone = ''
    return
  }
  let raw = phoneDisplay.value.replace(/[^0-9]/g, '')
  if (raw.startsWith('62')) {
    raw = raw.slice(2)
  } else if (raw.startsWith('0')) {
    raw = raw.slice(1)
  }
  phoneDisplay.value = raw
  form.value.phone = '62' + raw
}

function onRateInput() {
  let raw = rateDisplay.value.replace(/[^0-9]/g, '')
  const num = parseInt(raw || '0', 10)
  form.value.default_rate = num
  rateDisplay.value = num > 0 ? num.toLocaleString('id-ID') : ''
}

function onReviewRateInput() {
  let raw = reviewRateDisplay.value.replace(/[^0-9]/g, '')
  const num = parseInt(raw || '0', 10)
  reviewForm.value.default_rate = num
  reviewRateDisplay.value = num > 0 ? num.toLocaleString('id-ID') : ''
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

async function loadApps() {
  loadingApps.value = true
  try {
    const res = await fetch(`${API}/recruitment/applications`, { credentials: 'include' })
    if (res.ok) {
      const d = await res.json()
      applications.value = d.data || []
    }
  } catch {}
  loadingApps.value = false
}

async function load() {
  loading.value = true
  try {
    const r = await fetch(`${API}/freelancers`, { credentials: 'include' })
    const d = await r.json()
    data.value = d.data || []
    await loadApps()
  } catch {}
  loading.value = false
}

function openForm(item) {
  editing.value = item || null
  if (item) {
    const ba = item.bank_account || {}
    let rawPhone = (item.phone || '').replace(/[^0-9]/g, '')
    if (rawPhone.startsWith('62')) rawPhone = rawPhone.slice(2)
    else if (rawPhone.startsWith('0')) rawPhone = rawPhone.slice(1)
    phoneDisplay.value = rawPhone

    const rate = item.default_rate || 0
    rateDisplay.value = rate > 0 ? rate.toLocaleString('id-ID') : ''

    form.value = {
      name: item.name,
      phone: item.phone ? ('62' + rawPhone) : '',
      specialties: Array.isArray(item.specialties) ? item.specialties.join(', ') : item.specialties || '',
      bank_account: ba.bank || '',
      bank_number: ba.number || ba.norek || '',
      bank_name: ba.name || ba.atas_nama || '',
      default_rate: rate,
      city: item.city || ''
    }
  } else {
    phoneDisplay.value = ''
    rateDisplay.value = ''
    form.value = {
      name: '',
      phone: '',
      specialties: '',
      bank_account: '',
      bank_number: '',
      bank_name: '',
      default_rate: 0,
      city: supportedCities.value[0] || ''
    }
  }
  showForm.value = true
}

async function simpan() {
  const payload = {
    name: form.value.name,
    phone: form.value.phone,
    specialties: form.value.specialties ? form.value.specialties.split(',').map(s => s.trim()).filter(Boolean) : [],
    bank_account: {
      bank: form.value.bank_account,
      number: form.value.bank_number,
      norek: form.value.bank_number,
      name: form.value.bank_name,
      atas_nama: form.value.bank_name
    },
    default_rate: parseInt(form.value.default_rate || 0, 10),
    city: form.value.city
  }
  const url = editing.value ? `${API}/freelancers/${editing.value.id}` : `${API}/freelancers`
  const method = editing.value ? 'PUT' : 'POST'
  
  try {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) })
    const resData = await res.json()
    if (!res.ok) {
      alert(resData.error || 'Gagal menyimpan data')
      return
    }
    showForm.value = false
    editing.value = null
    await load()
  } catch (err) {
    alert('Terjadi kesalahan koneksi: ' + err.message)
  }
}

async function approveRate(item) {
  if (!await confirm(`Setujui pengajuan perubahan rate default untuk "${item.name}" menjadi Rp ${item.pending_rate.toLocaleString('id-ID')}/Jam?`)) return
  try {
    const res = await fetch(`${API}/freelancers/${item.id}/approve-rate`, {
      method: 'POST',
      credentials: 'include'
    })
    const data = await res.json()
    if (!res.ok) {
      alert(data.error || 'Gagal menyetujui perubahan rate')
    } else {
      alert('Rate berhasil disetujui!')
      await load()
    }
  } catch (e) {
    console.error(e)
    alert('Terjadi kesalahan jaringan')
  }
}

async function toggleActive(item) {
  if (!item) return
  const newActive = !item.active
  item.active = newActive ? 1 : 0
  if (selectedFgDetail.value && selectedFgDetail.value.id === item.id) {
    selectedFgDetail.value.active = item.active
  }
  await fetch(`${API}/freelancers/${item.id}/active`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ active: newActive }) })
  
  if (newActive) {
    await regenerateCode(item)
  } else {
    await load()
  }
}

async function hapus(item) {
  if (!await confirm(`Hapus data freelancer "${item.name}" secara permanen? Akun dan riwayat penugasannya akan terhapus.`)) return
  try {
    const res = await fetch(`${API}/freelancers/${item.id}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    const d = await res.json()
    if (res.ok) {
      alert(d.message || 'Freelancer berhasil dihapus')
      await load()
    } else {
      alert(d.error || 'Gagal menghapus freelancer')
    }
  } catch (e) {
    alert('Terjadi kesalahan jaringan: ' + e.message)
  }
}

function copyCode(item) {
  if (!item.access_code) return
  navigator.clipboard.writeText(item.access_code)
  copiedId.value = item.id
  setTimeout(() => { copiedId.value = null }, 2000)
}

async function regenerateCode(item) {
  if (!await confirm(`Reset & Generate kode akses baru untuk "${item.name}"? Kredensial baru akan langsung dikirimkan ke email fotografer.`)) return
  try {
    const res = await fetch(`${API}/freelancers/${item.id}/regenerate-code`, { method: 'POST', credentials: 'include' })
    const data_res = await res.json()
    if (res.ok) {
      item.access_code = data_res.access_code
      if (selectedFgDetail.value && selectedFgDetail.value.id === item.id) {
        selectedFgDetail.value.access_code = data_res.access_code
      }
      await load()
      alert(`Kode akses baru berhasil dibuat & dikirimkan via email: ${data_res.access_code}`)
    } else {
      alert(data_res.error || 'Gagal mereset kode akses')
    }
  } catch (e) {
    alert('Terjadi kesalahan jaringan: ' + e.message)
  }
}

function copyPortalLink() {
  navigator.clipboard.writeText(portalUrl.value)
  portalLinkCopied.value = true
  setTimeout(() => { portalLinkCopied.value = false }, 2000)
}

function getWaFgPortalLink(item) {
  if (!item || !item.phone) return '#'
  const portalUrlVal = `http://${window.location.host}/freelance-portal.html?code=${item.access_code}`
  const msg = `Halo Kak ${item.name},\n\nBerikut adalah link portal freelance Anda untuk memantau jadwal dan progres foto wisuda:\n${portalUrlVal}\n\nLink ini sudah otomatis login ke akun Anda. Terima kasih!`
  return `https://api.whatsapp.com/send?phone=${item.phone}&text=${encodeURIComponent(msg)}`
}

function openReview(app) {
  reviewingApp.value = app
  reviewForm.value = {
    default_rate: 0,
    reviewer_notes: ''
  }
  reviewRateDisplay.value = ''
  showAppReview.value = true
}

async function submitDecision(status) {
  const isApprove = status === 'approved'
  if (isApprove && !await confirm(`Setujui pendaftaran "${reviewingApp.value.name}"? Kandidat akan disalin ke daftar Freelancer aktif.`)) return
  if (!isApprove && !await confirm(`Tolak pendaftaran "${reviewingApp.value.name}"?`)) return
  
  const payload = {
    status: status,
    default_rate: reviewForm.value.default_rate,
    reviewer_notes: reviewForm.value.reviewer_notes
  }
  
  try {
    const res = await fetch(`${API}/recruitment/applications/${reviewingApp.value.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    })
    const d = await res.json()
    if (res.ok) {
      showAppReview.value = false
      reviewingApp.value = null
      await load()
      
      // Jika ada wa_link, buka di tab baru agar admin bisa kirim pesan WA otomatis
      if (d.wa_link) {
        window.open(d.wa_link, '_blank')
      }
    } else {
      alert(d.error || 'Gagal menyimpan keputusan')
    }
  } catch (e) {
    alert('Terjadi kesalahan jaringan: ' + e.message)
  }
}

function parseSpecialties(spec) {
  if (!spec) return []
  try {
    return typeof spec === 'string' ? JSON.parse(spec) : spec
  } catch {
    return [spec]
  }
}

onMounted(async () => {
  await loadCities()
  await load()
})
</script>