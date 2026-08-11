<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between mb-2">
      <h2 class="text-xl font-bold text-[#2D1B14] dark:text-slate-200 tracking-tight">Pengaturan Sistem</h2>
    </div>

    <!-- Tabs Header -->
    <div class="flex gap-1 border-b border-[#E8D5C8]/80 dark:border-slate-800 mb-6 overflow-x-auto">
      <button v-for="tab in tabs" :key="tab.key" @click="selectTab(tab.key)"
        class="px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition border-b-2 -mb-[1px]"
        :class="activeTab === tab.key ? 'text-[#D94A3D] border-[#D94A3D] dark:text-amber-400 dark:border-amber-400' : 'text-[#8A7A72] border-transparent hover:text-[#2D1B14] dark:hover:text-slate-300'">
        {{ tab.label }}
      </button>
    </div>

    <!-- ============ TAB: GENERAL ============ -->
    <div v-show="activeTab === 'general'" class="max-w-2xl mx-auto animate-fade-in">
      <div class="card p-6 dark:bg-slate-900 dark:border-slate-800 space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">NAMA VENDOR / PERUSAHAAN</label>
            <input v-model="form.companyName" class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="Nama Perusahaan">
          </div>
          <div>
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">NO. TELEPON PERUSAHAAN</label>
            <input v-model="form.companyPhone" class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="08123456789">
          </div>
          <div class="md:col-span-2">
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">ALAMAT STUDIO / KANTOR</label>
            <input v-model="form.companyAddress" class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="Alamat Lengkap Studio">
          </div>
          <div>
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">NO. WHATSAPP GATEWAY/ADMIN</label>
            <input v-model="form.adminPhone" placeholder="628xxxxxxxxxx" class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
            <p class="text-[9px] text-slate-400 mt-1">Format angka diawali 62 (contoh: 628123456789)</p>
          </div>
          <div>
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">NILAI UANG MUKA / DP (%)</label>
            <input v-model.number="form.dp_percentage" type="number" min="10" max="100" class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
            <p class="text-[9px] text-slate-400 mt-1">Bawaan sistem: 50%</p>
          </div>
          <div>
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">DEADLINE SETOR FOTO FG (HARI)</label>
            <input v-model.number="form.upload_deadline_days" type="number" min="1" max="30" class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
            <p class="text-[9px] text-slate-400 mt-1">Bawaan sistem: 1 hari</p>
          </div>
          <div>
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">BATAS WAKTU AUTO-APPROVE CLIENT (JAM)</label>
            <input v-model.number="form.auto_approve_hours" type="number" min="1" max="168" class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
            <p class="text-[9px] text-slate-400 mt-1">Bawaan sistem: 24 jam</p>
          </div>
          <div>
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">MAKSIMAL PENGAMBILAN SESI / FG / HARI</label>
            <input v-model.number="form.max_photos_per_fg_per_day" type="number" min="1" max="10" class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
            <p class="text-[9px] text-slate-400 mt-1">Bawaan sistem: 5 sesi</p>
          </div>
          <div>
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">PREFIX NO. INVOICE</label>
            <input v-model="form.invoice_prefix" placeholder="INV" class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
            <p class="text-[9px] text-slate-400 mt-1">Bawaan sistem: INV</p>
          </div>
          <div>
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">SESSION TIMEOUT ADMIN (MENIT)</label>
            <input v-model.number="form.session_timeout_minutes" type="number" min="60" max="1440" class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
            <p class="text-[9px] text-slate-400 mt-1">Bawaan sistem: 1440 menit (24 jam)</p>
          </div>
          <div>
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">LIMIT FOTO PORTOFOLIO PUBLIK</label>
            <input v-model.number="form.portfolio_limit" type="number" min="1" max="10000" class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="50">
            <p class="text-[9px] text-slate-400 mt-1">Bawaan sistem: 50 foto</p>
          </div>
          <div class="md:col-span-2">
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">KOTA OPERASIONAL LAYANAN</label>
            <div class="flex flex-wrap gap-1.5 p-3 py-2 rounded-xl bg-[#FAF9F6] dark:bg-slate-950 border border-[#E8D5C8]/60 dark:border-slate-800 min-h-[42px] items-center">
              <span v-for="(city, idx) in form.supported_cities" :key="idx" class="inline-flex items-center gap-1 px-2.5 py-1 bg-[#1A1A2E]/5 dark:bg-slate-800/80 text-[#2D1B14] dark:text-slate-200 text-xs font-semibold rounded-lg border border-[#E8D5C8]/40 dark:border-slate-700">
                {{ city }}
                <button type="button" @click="removeCity(idx)" class="text-red-500 hover:text-red-400 font-bold ml-1 flex items-center justify-center w-3 h-3">&times;</button>
              </span>
              <input 
                v-model="newCityInput" 
                @keydown.enter.prevent="addCity" 
                type="text" 
                placeholder="Tambah kota + Enter" 
                class="flex-1 min-w-[120px] bg-transparent border-none text-xs focus:outline-none p-0.5 dark:text-slate-200 placeholder-slate-400"
              />
            </div>
            <p class="text-[9px] text-slate-400 mt-1">Ketik nama kota lalu tekan Enter untuk memasukkan ke daftar</p>
          </div>
        </div>
        <div class="flex items-center justify-between pt-2">
          <div class="flex items-center gap-3">
            <button @click="saveGeneral" class="px-5 py-2.5 bg-[#D94A3D] hover:bg-[#C0392B] text-white rounded-xl text-xs font-semibold transition">Simpan Konfigurasi</button>
            <span v-if="generalSaved" class="text-green-600 dark:text-green-400 text-xs font-bold animate-pulse">✓ Pengaturan disimpan</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ============ TAB: OPERATIONAL ============ -->
    <div v-show="activeTab === 'operational'" class="max-w-5xl mx-auto animate-fade-in space-y-6">
      <!-- Section 1: Tabel Master Otomatisasi & Cron Jobs Studio -->
      <div class="card p-6 dark:bg-slate-900 dark:border-slate-800 space-y-5 border-l-4 border-l-amber-500 shadow-sm">
        <div class="flex items-center justify-between flex-wrap gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div class="flex items-center gap-3">
            <span class="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl font-bold">⚙️</span>
            <div>
              <h3 class="font-bold text-base text-slate-800 dark:text-slate-200">Kontrol Otomatisasi & Cron Jobs Studio</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">Atur seluruh parameter jam, hari, durasi, dan sakelar tugas latar belakang (background jobs)</p>
            </div>
          </div>

          <button @click="fetchCronStatus" :disabled="cronLoading" class="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition cursor-pointer">
            <span v-if="cronLoading" class="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
            <span v-else>🔄</span>
            Refresh Status
          </button>
        </div>

        <!-- Master Control Table -->
        <div class="bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-slate-100/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th class="py-3.5 px-4">Tugas Otomatisasi</th>
                  <th class="py-3.5 px-4">Deskripsi & Peran</th>
                  <th class="py-3.5 px-4 text-center">Pengaturan Jam / Interval</th>
                  <th class="py-3.5 px-4 text-right">Status Running</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                <tr v-for="job in cronJobs" :key="job.id" class="hover:bg-slate-100/60 dark:hover:bg-slate-900/60 transition">
                  <!-- Column 1: Name & Category -->
                  <td class="py-3.5 px-4">
                    <div class="flex items-center gap-3">
                      <span class="text-xl flex-shrink-0">{{ job.icon }}</span>
                      <div>
                        <div class="font-bold text-slate-800 dark:text-slate-200 text-xs">{{ job.name }}</div>
                        <span class="inline-block mt-0.5 px-1.5 py-0.2 rounded-full text-[8px] font-bold"
                          :class="{
                            'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400': job.category === 'notification',
                            'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400': job.category === 'automation',
                            'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400': job.category === 'finance',
                            'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400': job.category === 'maintenance',
                            'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400': job.category === 'storage'
                          }">
                          {{ { notification: 'Notifikasi WA', automation: 'Otomasi System', finance: 'Keuangan', maintenance: 'Maintenance', storage: 'Storage Drive' }[job.category] }}
                        </span>
                      </div>
                    </div>
                  </td>

                  <!-- Column 2: Description -->
                  <td class="py-3.5 px-4">
                    <p class="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed max-w-md">{{ job.description }}</p>
                    <span class="text-[9px] font-semibold block mt-1"
                      :class="job.pendingCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'">
                      {{ job.pendingLabel }}
                    </span>
                  </td>

                  <!-- Column 3: Dynamic Time & H-Days Interval Dropdown -->
                  <td class="py-3.5 px-4 text-center">
                    <div class="inline-flex items-center gap-1.5 flex-wrap justify-center">
                      <!-- H-Days Selector (Dynamic Day Offset) -->
                      <select v-if="job.config_days_key"
                        :value="job.config_days_value"
                        @change="updateCronConfig(job.config_days_key, $event.target.value)"
                        class="text-[11px] font-mono font-bold bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700/60 rounded-lg px-2 py-1 text-amber-900 dark:text-amber-300 cursor-pointer focus:ring-2 focus:ring-amber-500/40 outline-none"
                        title="Ubah berapa hari sebelum pemotretan WA pengingat dikirim">
                        <option value="0">Hari H (H-0)</option>
                        <option value="1">H-1 Pemotretan</option>
                        <option value="2">H-2 Pemotretan</option>
                        <option value="3">H-3 Pemotretan</option>
                        <option value="4">H-4 Pemotretan</option>
                        <option value="5">H-5 Pemotretan</option>
                        <option value="7">H-7 (1 Minggu)</option>
                      </select>

                      <!-- Time Selector -->
                      <select v-if="job.config_type === 'time'"
                        :value="job.config_value"
                        @change="updateCronConfig(job.config_key, $event.target.value)"
                        class="text-[11px] font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 cursor-pointer focus:ring-2 focus:ring-amber-500/40 outline-none">
                        <option v-for="h in ['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00']" :key="h" :value="h">
                          Jam {{ h }} WITA
                        </option>
                      </select>

                      <!-- Default Schedule Text -->
                      <span v-if="!job.config_key || job.config_type === 'number'" class="text-[10px] font-bold text-slate-600 dark:text-slate-400 font-mono">
                        {{ job.schedule }}
                      </span>
                    </div>
                  </td>

                  <!-- Column 4: Status Badge -->
                  <td class="py-3.5 px-4 text-right">
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      AKTIF OTOMATIS
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Cron Log Monitor -->
        <div class="pt-2">
          <div class="flex items-center justify-between mb-2">
            <h4 class="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">📋 Log Aktivitas Sistem Terkini</h4>
            <div class="flex items-center gap-2">
              <select v-model="cronLogLines" @change="fetchCronLog" class="text-[9px] border border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 rounded-lg px-2 py-1">
                <option :value="50">50 baris</option>
                <option :value="100">100 baris</option>
                <option :value="200">200 baris</option>
                <option :value="500">500 baris</option>
              </select>
              <button @click="fetchCronLog" :disabled="cronLogLoading" class="px-2.5 py-1 text-[9px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition flex items-center gap-1">
                <span v-if="cronLogLoading" class="w-2.5 h-2.5 border border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                <span v-else>🔄</span>
                Refresh
              </button>
            </div>
          </div>
          <pre v-if="cronLog" class="bg-[#0D1117] text-[#E6EDF3] rounded-xl p-4 text-[9px] font-mono leading-relaxed overflow-y-auto max-h-48 whitespace-pre-wrap break-words border border-slate-800">{{ cronLog }}</pre>
          <div v-else class="bg-[#0D1117] rounded-xl p-4 text-center border border-slate-800">
            <p class="text-slate-500 text-[10px]">{{ cronLogLoading ? 'Memuat log...' : 'Belum ada log aktivitas cron.' }}</p>
          </div>
        </div>
      </div>

      <!-- Section 2: Form Parameter Operasional Studio -->
      <div class="card p-6 dark:bg-slate-900 dark:border-slate-800 space-y-4 border-l-4 border-l-violet-500 shadow-sm">
        <div class="flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-3">
          <span class="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center text-lg font-bold">⏱️</span>
          <div>
            <h3 class="font-bold text-sm text-slate-800 dark:text-slate-200">Batas Waktu & Deadlines Operasional Studio</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">Atur durasi auto-approve, deadline setor foto, dan batas pemotretan harian</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">BATAS WAKTU AUTO-APPROVE KLIEN (JAM)</label>
            <input v-model.number="form.auto_approve_hours" type="number" min="1" max="168" class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
            <p class="text-[9px] text-slate-400 mt-1">Bawaan sistem: 48 jam</p>
          </div>

          <div>
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">DEADLINE SETOR FOTO FG (HARI)</label>
            <input v-model.number="form.upload_deadline_days" type="number" min="1" max="30" class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
            <p class="text-[9px] text-slate-400 mt-1">Bawaan sistem: 1 hari</p>
          </div>

          <div>
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">BATAS KADALUARSA PENAWARAN / QUOTATION (HARI)</label>
            <input v-model.number="form.dp_expired_days" type="number" min="1" max="30" class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
            <p class="text-[9px] text-slate-400 mt-1">Bawaan sistem: 7 hari</p>
          </div>

          <div>
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">MAKSIMAL SESI FOTO PER FOTOGRAFER PER HARI</label>
            <input v-model.number="form.max_photos_per_fg_per_day" type="number" min="1" max="10" class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
            <p class="text-[9px] text-slate-400 mt-1">Bawaan sistem: 5 sesi</p>
          </div>

          <div>
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold uppercase">MASA SIMPAN FOLDER KLIEN DRIVE (BULAN)</label>
            <input v-model.number="form.drive_retention_months" type="number" min="1" max="12" class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
            <p class="text-[9px] text-slate-400 mt-1">Default 3 bulan. Robot akan menghitung expired date sejak tanggal release/delivery.</p>
          </div>

          <div>
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold uppercase">STATUS ROBOT PEMBERSIHAN OTOMATIS DRIVE</label>
            <select v-model="form.drive_auto_trash_enabled" class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
              <option :value="1">Aktif (Kirim WA Reminder H-14, H-3 &amp; Transfer/Trash di Hari-H)</option>
              <option :value="0">Non-Aktif (Folder disimpan tanpa pembersihan otomatis)</option>
            </select>
            <p class="text-[9px] text-slate-400 mt-1">Robot berjalan otomatis setiap jam 03.00 WITA.</p>
          </div>
        </div>

        <div class="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
          <div class="flex items-center gap-3">
            <button type="button" @click="saveGeneral" :disabled="saving" class="px-5 py-2.5 bg-violet-600 text-white rounded-xl text-xs font-bold hover:bg-violet-700 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50">
              <span v-if="saving" class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              💾 {{ saving ? 'Menyimpan...' : 'Simpan Pengaturan Operasional' }}
            </button>
            <span v-if="generalSaved" class="text-green-600 dark:text-green-400 text-xs font-bold animate-pulse">✓ Pengaturan disimpan</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ============ TAB: BANK ACCOUNTS ============ -->
    <div v-show="activeTab === 'bank'" class="max-w-2xl mx-auto animate-fade-in">
      <div class="card p-6 dark:bg-slate-900 dark:border-slate-800 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-xs text-[#2D1B14] dark:text-slate-200 uppercase tracking-wider">Rekening Bank Pembayaran</h3>
          <button @click="addBank" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1">+ Tambah Rekening</button>
        </div>
        <div v-if="!form.bank_accounts || form.bank_accounts.length === 0" class="text-slate-400 text-xs text-center py-8">
          Belum ada rekening terdaftar. Klik "+ Tambah Rekening" untuk menambahkan.
        </div>
        <div v-for="(bank, i) in form.bank_accounts" :key="i" class="group relative p-4 rounded-xl bg-[#FAF9F6] dark:bg-slate-950 border border-[#E8D5C8]/60 dark:border-slate-800 transition hover:border-[#E8D5C8] dark:hover:border-slate-700">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pr-8">
            <div>
              <label class="block text-[9px] text-[#8A7A72] dark:text-slate-500 mb-1 font-bold">NAMA BANK</label>
              <input v-model="bank.bank" placeholder="BCA / Mandiri" class="input-fancy !text-xs !py-2 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
            </div>
            <div>
              <label class="block text-[9px] text-[#8A7A72] dark:text-slate-500 mb-1 font-bold">NO. REKENING</label>
              <input v-model="bank.norek" placeholder="123456789" class="input-fancy !text-xs !py-2 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
            </div>
            <div>
              <label class="block text-[9px] text-[#8A7A72] dark:text-slate-500 mb-1 font-bold">ATAS NAMA (PEMILIK)</label>
              <input v-model="bank.atas_nama" placeholder="Nama Pemilik Rekening" class="input-fancy !text-xs !py-2 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
            </div>
          </div>
          <button @click="removeBank(i)" class="absolute top-3 right-3 text-slate-400 dark:text-slate-400 opacity-60 hover:opacity-100 hover:text-red-500 hover:bg-red-500/15 dark:hover:bg-red-950/40 p-1.5 rounded-lg transition-all duration-200" title="Hapus Rekening">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="flex items-center gap-3 pt-2">
          <button @click="saveBankAccounts" class="px-5 py-2.5 bg-[#D94A3D] hover:bg-[#C0392B] text-white rounded-xl text-xs font-semibold transition">Simpan Rekening</button>
          <span v-if="bankSaved" class="text-green-600 dark:text-green-400 text-xs font-bold animate-pulse">✓ Rekening disimpan</span>
        </div>
      </div>
    </div>

    <!-- ============ TAB: WA TEMPLATES ============ -->
    <div v-show="activeTab === 'wa'" class="max-w-4xl mx-auto animate-fade-in">
      <div class="card p-6 dark:bg-slate-900 dark:border-slate-800 space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
          <div>
            <h3 class="font-bold text-xs text-[#2D1B14] dark:text-slate-200 uppercase tracking-wider">Template Pesan WhatsApp Otomatis</h3>
            <p class="text-[10px] text-slate-400 mt-0.5">Kelola seluruh draf & template pesan WhatsApp yang digunakan oleh sistem untuk Notifikasi Client & Freelancer.</p>
          </div>
          <div class="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button @click="resetAllWaTemplates" class="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-lg text-xs font-semibold border border-amber-200 dark:border-amber-800 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap" title="Kembalikan Seluruh Draf Pesan WA ke Bawaan Sistem">
              <span>🔄</span> <span>Reset Seluruh Template</span>
            </button>
            <span class="text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-semibold px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800 whitespace-nowrap">
              {{ Object.keys(form.wa_templates || {}).length }} Template Aktif
            </span>
          </div>
        </div>

        <div class="max-h-[65vh] overflow-y-auto space-y-4 pr-2">
          <div v-for="(tpl, key) in form.wa_templates" :key="key" class="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800/80 pb-2">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xs font-bold text-[#2D1B14] dark:text-slate-200">
                  {{ templateLabels[key]?.label || key }}
                </span>
                <span class="text-[9px] font-mono text-slate-400">({{ key }})</span>
              </div>
              <button @click="resetSingleWaTemplate(key)" type="button" class="text-[10px] text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/50 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded-lg border border-amber-200/80 dark:border-amber-900/60 font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap self-start sm:self-auto transition" title="Reset template ini ke bawaan sistem">
                <span>🔄</span> <span>Reset ke Default</span>
              </button>
            </div>
            <p class="text-[10px] text-slate-500 dark:text-slate-400 italic" v-if="templateLabels[key]?.desc">
              💡 {{ templateLabels[key].desc }}
            </p>
            <textarea v-model="form.wa_templates[key]" rows="4" class="input-fancy !text-xs !py-2.5 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 font-mono leading-relaxed"></textarea>
            <div class="text-[9px] text-amber-700 dark:text-amber-400 bg-amber-50/60 dark:bg-amber-950/20 px-2.5 py-1 rounded-lg border border-amber-200/50 dark:border-amber-900/40" v-if="templateLabels[key]?.placeholders">
              <span class="font-bold uppercase tracking-wider">Placeholder:</span> {{ templateLabels[key].placeholders }}
            </div>
          </div>
        </div>

        <div class="flex items-center gap-3 pt-2">
          <button @click="saveWaTemplates" class="px-5 py-2.5 bg-[#D94A3D] hover:bg-[#C0392B] text-white rounded-xl text-xs font-semibold transition shadow-md">Simpan Seluruh Template WA</button>
          <span v-if="waSaved" class="text-green-600 dark:text-green-400 text-xs font-bold animate-pulse">✓ Template WA berhasil disimpan</span>
        </div>
      </div>
    </div>

    <!-- ============ TAB: SECURITY ============ -->
    <div v-show="activeTab === 'security'" class="animate-fade-in">
      <div class="flex flex-col md:flex-row gap-6 justify-center items-start max-w-4xl mx-auto">
        
        <!-- KOLOM KIRI: Detail Akun Summary (Minimalis - Lebar Tetap) -->
        <div class="w-full md:w-[448px] flex-shrink-0 card p-6 dark:bg-slate-900 dark:border-slate-800 space-y-5">
          <h3 class="font-bold text-xs text-[#2D1B14] dark:text-slate-200 uppercase tracking-wider mb-2">Informasi Akun Admin</h3>
          
          <!-- Avatar Section -->
          <div class="flex flex-col items-center space-y-3 pb-5 border-b border-[#E8D5C8]/20 dark:border-slate-800">
            <div class="relative group cursor-pointer" @click="$refs.avatarInput.click()">
              <!-- Current Avatar or Preview -->
              <div v-if="selectedAvatarPreview" class="w-20 h-20 rounded-full overflow-hidden border-2 border-[#D94A3D] shadow-md flex items-center justify-center bg-slate-100 dark:bg-slate-950">
                <img :src="selectedAvatarPreview" class="w-full h-full object-cover">
              </div>
              <div v-else-if="authStore.user?.avatar_url" class="w-20 h-20 rounded-full overflow-hidden border border-[#E8D5C8]/60 dark:border-slate-800 shadow-sm flex items-center justify-center bg-slate-100 dark:bg-slate-950">
                <img :src="authStore.user.avatar_url" class="w-full h-full object-cover">
              </div>
              <div v-else class="w-20 h-20 rounded-full bg-gradient-to-br from-[#111E36] to-[#C5A880] flex items-center justify-center text-2xl font-bold text-white shadow-md">
                {{ (profileForm.name || 'A')[0] }}
              </div>
              <!-- Overlay Camera Icon -->
              <div class="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              </div>
            </div>
            
            <input type="file" ref="avatarInput" accept="image/*" @change="onAvatarFileChange" class="hidden">
            
            <div class="flex items-center gap-2 text-xs">
              <span v-if="selectedAvatarPreview" class="text-[9px] text-[#D94A3D] font-bold uppercase animate-pulse">Pratinjau (Belum Disimpan)</span>
            </div>
            
            <div class="flex gap-2 w-full max-w-[200px]" v-if="selectedFileAvatar || authStore.user?.avatar_url">
              <!-- Save New Avatar -->
              <button v-if="selectedFileAvatar" @click="uploadAvatar" :disabled="isUploadingAvatar" class="flex-1 py-1.5 bg-[#D94A3D] hover:bg-[#C0392B] text-white rounded-lg font-semibold text-[10px] transition flex items-center justify-center gap-1 shadow-sm">
                <span v-if="isUploadingAvatar" class="w-2.5 h-2.5 border border-white border-t-transparent rounded-full animate-spin"></span>
                {{ isUploadingAvatar ? 'Simpan...' : 'Simpan Foto' }}
              </button>
              <!-- Cancel Preview -->
              <button v-if="selectedFileAvatar" @click="clearSelectedAvatar" :disabled="isUploadingAvatar" class="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] transition">
                Batal
              </button>
              <!-- Delete Avatar -->
              <button v-if="authStore.user?.avatar_url && !selectedFileAvatar" @click="deleteAvatar" :disabled="isDeletingAvatar" class="w-full py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg font-semibold text-[10px] transition flex items-center justify-center gap-1">
                <span v-if="isDeletingAvatar" class="w-2.5 h-2.5 border border-red-600 dark:border-red-400 border-t-transparent rounded-full animate-spin"></span>
                {{ isDeletingAvatar ? 'Hapus...' : 'Hapus Foto' }}
              </button>
            </div>
          </div>

          <!-- Account details list -->
          <div class="space-y-3 text-xs">
            <div class="flex items-center justify-between py-2 border-b border-[#E8D5C8]/20 dark:border-slate-800/60">
              <span class="text-[10px] font-bold text-[#8A7A72] dark:text-slate-400 uppercase tracking-wider">Nama Tampilan</span>
              <span class="font-bold text-[#2D1B14] dark:text-slate-200">{{ authStore.user?.name || '-' }}</span>
            </div>
            <div class="flex items-center justify-between py-2 border-b border-[#E8D5C8]/20 dark:border-slate-800/60">
              <span class="text-[10px] font-bold text-[#8A7A72] dark:text-slate-400 uppercase tracking-wider">Username Login</span>
              <span class="font-bold text-[#2D1B14] dark:text-slate-200 font-mono">{{ authStore.user?.username || '-' }}</span>
            </div>
            <div class="flex items-center justify-between py-2 border-b border-[#E8D5C8]/20 dark:border-slate-800/60">
              <span class="text-[10px] font-bold text-[#8A7A72] dark:text-slate-400 uppercase tracking-wider">Peran Sesi</span>
              <span class="px-2 py-0.5 bg-[#FDECEA] dark:bg-amber-950/20 text-[#D94A3D] dark:text-amber-400 rounded-md text-[10px] font-black uppercase tracking-wider">{{ authStore.user?.role }}</span>
            </div>
            <div class="flex items-center justify-between py-2 border-b border-[#E8D5C8]/20 dark:border-slate-800/60">
              <span class="text-[10px] font-bold text-[#8A7A72] dark:text-slate-400 uppercase tracking-wider">Password</span>
              <span class="font-bold text-[#8A7A72] tracking-widest">••••••••</span>
            </div>
          </div>

          <!-- Minimalist Toggle Buttons -->
          <div class="flex gap-2 pt-3">
            <button @click="toggleEditProfile" 
              class="flex-1 py-2 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 border shadow-sm"
              :class="activeForm === 'profile' 
                ? 'bg-[#FDECEA] text-[#D94A3D] border-[#D94A3D] dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-400' 
                : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 border-[#E8D5C8]/60 dark:border-slate-800'">
              ✏️ Edit Profil
            </button>
            <button @click="toggleEditPassword" 
              class="flex-1 py-2 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 border shadow-sm"
              :class="activeForm === 'password' 
                ? 'bg-[#FDECEA] text-[#D94A3D] border-[#D94A3D] dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-400' 
                : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 border-[#E8D5C8]/60 dark:border-slate-800'">
              🔑 Ganti Sandi
            </button>
          </div>
        </div>

        <!-- KOLOM KANAN: Form Edit Dinamis (Dengan Animasi Transisi Halus) -->
        <Transition name="slide-fade">
          <div v-if="activeForm" id="security-form-container" class="w-full md:w-[448px] flex-shrink-0">
            <!-- State A: Form Edit Profil -->
            <div v-if="activeForm === 'profile'" class="card p-6 dark:bg-slate-900 dark:border-slate-800 space-y-4 animate-scale-in">
              <div class="flex items-center justify-between border-b border-[#E8D5C8]/25 dark:border-slate-800/60 pb-2">
                <h3 class="font-bold text-xs text-[#2D1B14] dark:text-slate-200 uppercase tracking-wider">Edit Profil Admin</h3>
                <button @click="activeForm = null" class="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">✕</button>
              </div>
              <div>
                <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">NAMA TAMPILAN ADMIN</label>
                <input v-model="profileForm.name" type="text" class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="Contoh: Arman Syam">
              </div>
              <div>
                <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">USERNAME LOGIN ADMIN</label>
                <input v-model="profileForm.username" type="text" class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="admin">
              </div>
              <div v-if="profileError" class="text-red-500 font-semibold text-xs bg-red-50 px-3 py-2 rounded-lg border border-red-200">{{ profileError }}</div>
              <div v-if="profileSuccess" class="text-green-600 font-semibold text-xs bg-green-50 px-3 py-2 rounded-lg border border-green-200">{{ profileSuccess }}</div>
              <div class="flex gap-2 pt-2">
                <button @click="activeForm = null" class="flex-1 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-[#E8D5C8]/40 dark:border-slate-700 rounded-xl text-xs font-semibold transition">Batal</button>
                <button @click="saveProfile" class="flex-1 py-2 bg-[#1A1A2E] text-[#C59B63] hover:bg-[#2A2A4E] rounded-xl text-xs font-semibold transition shadow-md">Simpan Profil</button>
              </div>
            </div>

            <!-- State B: Form Ganti Password -->
            <div v-else-if="activeForm === 'password'" class="card p-6 dark:bg-slate-900 dark:border-slate-800 space-y-4 animate-scale-in">
              <div class="flex items-center justify-between border-b border-[#E8D5C8]/25 dark:border-slate-800/60 pb-2">
                <h3 class="font-bold text-xs text-[#2D1B14] dark:text-slate-200 uppercase tracking-wider">Ubah Password Admin</h3>
                <button @click="activeForm = null" class="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">✕</button>
              </div>
              <div>
                <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">PASSWORD SAAT INI</label>
                <input v-model="passwordForm.current" type="password" class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="••••••••">
              </div>
              <div>
                <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">PASSWORD BARU (MIN. 6 KARAKTER)</label>
                <input v-model="passwordForm.newPass" type="password" class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="••••••••">
              </div>
              <div>
                <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">KONFIRMASI PASSWORD BARU</label>
                <input v-model="passwordForm.confirm" type="password" class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="••••••••">
              </div>
              <div v-if="passError" class="text-red-500 font-semibold text-xs bg-red-50 px-3 py-2 rounded-lg border border-red-200">{{ passError }}</div>
              <div v-if="passSuccess" class="text-green-600 font-semibold text-xs bg-green-50 px-3 py-2 rounded-lg border border-green-200">{{ passSuccess }}</div>
              <div class="flex gap-2 pt-2">
                <button @click="activeForm = null" class="flex-1 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-[#E8D5C8]/40 dark:border-slate-700 rounded-xl text-xs font-semibold transition">Batal</button>
                <button @click="savePassword" class="flex-1 py-2 bg-[#D94A3D] hover:bg-[#C0392B] text-white rounded-xl text-xs font-semibold transition shadow-md">Ubah Password</button>
              </div>
            </div>
          </div>
        </Transition>

      </div>
    </div>

    <!-- ============ TAB: BRANDING & SEO ============ -->
    <div v-show="activeTab === 'branding'" class="max-w-2xl mx-auto animate-fade-in space-y-6">
      <!-- Section 1: Logo Platform & Favicon -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- Logo Card -->
        <div class="card p-6 dark:bg-slate-900 dark:border-slate-800 space-y-4">
          <h3 class="font-bold text-xs text-[#2D1B14] dark:text-slate-200 uppercase tracking-wider mb-2">Logo Platform / Vendor</h3>
          
          <!-- Logo Aktif -->
          <div v-if="form.logo_url && !selectedLogoPreview" class="mb-3">
            <span class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold uppercase">Logo Aktif Saat Ini</span>
            <div class="flex justify-center p-4 bg-[#FAF6F0]/30 border border-[#E8D5C8]/40 dark:bg-slate-950 dark:border-slate-800 rounded-xl">
              <img :src="form.logo_url" class="max-h-20 object-contain">
            </div>
          </div>

          <!-- Pratinjau Logo Baru -->
          <div v-if="selectedLogoPreview" class="mb-3">
            <span class="block text-[10px] text-[#D94A3D] mb-1.5 font-bold uppercase">Pratinjau Logo Baru (Belum Disimpan)</span>
            <div class="flex justify-center p-4 bg-amber-50/10 border border-[#D94A3D]/40 rounded-xl relative">
              <img :src="selectedLogoPreview" class="max-h-20 object-contain">
              <button @click="clearSelectedLogo" class="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-red-100 hover:bg-red-200 text-red-600 rounded-full font-bold text-xs transition" title="Batal">✕</button>
            </div>
          </div>

          <div>
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">UNGGAH FILE LOGO BARU (PNG/JPG)</label>
            <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/webp" @change="onFileChange" class="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-[#2D1B14] dark:file:bg-slate-800 file:text-white file:cursor-pointer cursor-pointer">
          </div>
          <div v-if="logoError" class="text-red-500 font-semibold text-xs bg-red-50 px-3 py-2 rounded-lg border border-red-200">{{ logoError }}</div>
          <div v-if="logoSaved" class="text-green-600 font-semibold text-xs bg-green-50 px-3 py-2 rounded-lg border border-green-200">✓ Logo berhasil diunggah!</div>
          <div class="flex gap-2">
            <button @click="uploadLogo" :disabled="!selectedFile || isUploadingLogo" class="flex-1 py-2.5 bg-[#D94A3D] hover:bg-[#C0392B] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5">
              <span v-if="isUploadingLogo" class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              {{ isUploadingLogo ? 'Sedang Mengunggah...' : 'Upload & Pasang Logo' }}
            </button>
            <button v-if="form.logo_url && !selectedLogoPreview" @click="deleteLogo" :disabled="isDeletingLogo" class="py-2.5 px-4 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5">
              <span v-if="isDeletingLogo" class="w-3 h-3 border-2 border-red-600 dark:border-red-400 border-t-transparent rounded-full animate-spin"></span>
              {{ isDeletingLogo ? 'Menghapus...' : 'Hapus Logo' }}
            </button>
          </div>
        </div>

        <!-- Favicon Card -->
        <div class="card p-6 dark:bg-slate-900 dark:border-slate-800 space-y-4">
          <div>
            <h3 class="font-bold text-xs text-[#2D1B14] dark:text-slate-200 uppercase tracking-wider mb-1">Favicon Website</h3>
            <p class="text-[10px] text-[#8A7A72] dark:text-slate-500 leading-relaxed">Ikon kecil yang tampil di tab browser. Ukuran ideal: 64×64px atau 128×128px.</p>
          </div>

          <!-- Favicon Aktif -->
          <div v-if="form.favicon_url && !selectedFaviconPreview" class="mb-3">
            <span class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold uppercase">Favicon Aktif Saat Ini</span>
            <div class="flex items-center gap-3 p-3 bg-[#FAF6F0]/30 border border-[#E8D5C8]/40 dark:bg-slate-950 dark:border-slate-800 rounded-xl">
              <div class="w-10 h-10 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shadow-sm">
                <img :src="form.favicon_url" class="w-8 h-8 object-contain">
              </div>
              <div class="flex-1 min-w-0">
                <span class="block text-[10px] font-semibold text-slate-700 dark:text-slate-300">Pratinjau Tab Browser</span>
                <div class="flex items-center gap-1.5 mt-1 bg-slate-100 dark:bg-slate-800 rounded px-2 py-1 w-fit">
                  <img :src="form.favicon_url" class="w-3 h-3 object-contain">
                  <span class="text-[9px] text-slate-500 dark:text-slate-400 truncate">Wisuda Platform</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Pratinjau Favicon Baru -->
          <div v-if="selectedFaviconPreview" class="mb-3">
            <span class="block text-[10px] text-[#D94A3D] mb-1.5 font-bold uppercase">Pratinjau Favicon Baru (Belum Disimpan)</span>
            <div class="flex items-center gap-3 p-3 bg-amber-50/10 border border-[#D94A3D]/40 rounded-xl relative">
              <div class="w-10 h-10 rounded-lg bg-white dark:bg-slate-800 border border-dashed border-[#D94A3D]/50 flex items-center justify-center overflow-hidden">
                <img :src="selectedFaviconPreview" class="w-8 h-8 object-contain">
              </div>
              <div class="flex-1 min-w-0">
                <span class="block text-[10px] font-semibold text-slate-700 dark:text-slate-300">Pratinjau Tab Browser</span>
                <div class="flex items-center gap-1.5 mt-1 bg-slate-100 dark:bg-slate-800 rounded px-2 py-1 w-fit">
                  <img :src="selectedFaviconPreview" class="w-3 h-3 object-contain">
                  <span class="text-[9px] text-slate-500 dark:text-slate-400 truncate">Wisuda Platform</span>
                </div>
              </div>
              <button @click="clearSelectedFavicon" class="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-red-100 hover:bg-red-200 text-red-600 rounded-full font-bold text-xs transition" title="Batal">✕</button>
            </div>
          </div>

          <div>
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">UNGGAH FILE FAVICON BARU (PNG/JPG/ICO)</label>
            <input ref="faviconInput" type="file" accept="image/png,image/jpeg,image/webp,image/x-icon" @change="onFaviconChange" class="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-[#2D1B14] dark:file:bg-slate-800 file:text-white file:cursor-pointer cursor-pointer">
          </div>
          <div v-if="faviconError" class="text-red-500 font-semibold text-xs bg-red-50 px-3 py-2 rounded-lg border border-red-200">{{ faviconError }}</div>
          <div v-if="faviconSaved" class="text-green-600 font-semibold text-xs bg-green-50 px-3 py-2 rounded-lg border border-green-200">✓ Favicon berhasil diunggah!</div>
          <div class="flex gap-2">
            <button @click="uploadFavicon" :disabled="!selectedFaviconFile || isUploadingFavicon" class="flex-1 py-2.5 bg-[#2D1B14] hover:bg-[#1a100c] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5">
              <span v-if="isUploadingFavicon" class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              {{ isUploadingFavicon ? 'Sedang Mengunggah...' : 'Upload & Pasang Favicon' }}
            </button>
            <button v-if="form.favicon_url && !selectedFaviconPreview" @click="deleteFavicon" :disabled="isDeletingFavicon" class="py-2.5 px-4 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5">
              <span v-if="isDeletingFavicon" class="w-3 h-3 border-2 border-red-600 dark:border-red-400 border-t-transparent rounded-full animate-spin"></span>
              {{ isDeletingFavicon ? 'Mereset...' : 'Reset Favicon' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Section 2: SEO & Meta Tag -->
      <div class="card p-6 dark:bg-slate-900 dark:border-slate-800 space-y-4">
        <h3 class="font-bold text-xs text-[#2D1B14] dark:text-slate-200 uppercase tracking-wider">Pengaturan SEO & Meta Social Media</h3>
        <p class="text-xs text-slate-500">Kelola tampilan judul, deskripsi, dan pratinjau banner saat link website di-share di WhatsApp, Google, atau Social Media.</p>

        <div class="space-y-4 pt-2">
          <div>
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">DOMAIN / URL WEBSITE UTAMA</label>
            <input v-model="form.seo_domain" class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="https://domainwebsite.com">
            <p class="text-[9px] text-slate-400 mt-1">Digunakan untuk Canonical URL dan pembuatan link otomatis</p>
          </div>

          <div>
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">JUDUL HALAMAN (META TITLE)</label>
            <input v-model="form.seo_title" class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="Nama Brand Anda — Dokumentasi Wisuda Premium">
          </div>

          <div>
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">DESKRIPSI WEBSITE (META DESCRIPTION)</label>
            <textarea v-model="form.seo_description" rows="3" class="input-fancy !text-xs !py-2 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="Abadikan momen wisuda Anda di Makassar dengan sentuhan foto timeless dan keanggunan."></textarea>
          </div>

          <div>
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">KATA KUNCI (META KEYWORDS)</label>
            <input v-model="form.seo_keywords" class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="foto wisuda makassar, dokumentasi wisuda, foto kelulusan unhas, unm">
          </div>

          <div>
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">GOOGLE SITE VERIFICATION CODE</label>
            <input v-model="form.google_site_verification" class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="Kode verifikasi Google Search Console">
          </div>

          <!-- OG Banner Upload -->
          <div class="pt-4 border-t border-slate-200 dark:border-slate-800">
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-2 font-bold uppercase">Banner Social Media / WhatsApp Share Card (OG Image)</label>
            <div class="flex items-center gap-4">
              <div class="w-36 h-20 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden">
                <img v-if="form.seo_og_image" :src="form.seo_og_image" class="w-full h-full object-cover" />
                <span v-else class="text-[10px] text-slate-400">Belum ada banner</span>
              </div>
              <div class="flex-1 space-y-2">
                <input type="file" ref="ogFileInput" @change="onOgFileSelect" accept="image/*" class="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-200 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-200 hover:file:bg-slate-300 cursor-pointer" />
                <button @click="uploadOgImage" :disabled="!selectedOgFile" class="px-4 py-2 bg-[#D94A3D] text-white rounded-xl text-xs font-semibold disabled:opacity-40 transition">Upload Banner Social Media</button>
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
          <div class="flex items-center gap-3">
            <button @click="saveSeo" class="px-5 py-2.5 bg-[#D94A3D] hover:bg-[#C0392B] text-white rounded-xl text-xs font-semibold transition">Simpan Pengaturan SEO</button>
            <span v-if="seoSaved" class="text-green-600 dark:text-green-400 text-xs font-bold animate-pulse">✓ Pengaturan SEO disimpan</span>
          </div>
          <button @click="resetCategoryDefaults('seo')" class="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold transition">🔄 Reset Ke Default</button>
        </div>
      </div>
    </div>

    <!-- ============ TAB: CRON JOBS / SISTEM & STORAGE ============ -->
    <div v-show="activeTab === 'cron'" class="animate-fade-in space-y-5">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h3 class="font-bold text-sm text-[#2D1B14] dark:text-slate-200 flex items-center gap-2">🖥️ Pengaturan Sistem &amp; Storage</h3>
          <p class="text-xs text-[#8A7A72] dark:text-slate-400 mt-0.5">Kelola lokasi backup database (.db), konfigurasi &amp; pantau integrasi Google Drive, serta tugas background</p>
        </div>
      </div>

      <!-- 💾 VISUAL MONITOR BACKUP DATABASE SYSTEM -->
      <div class="card p-5 dark:bg-slate-900 dark:border-slate-800 space-y-4 border-l-4 border-l-emerald-500 shadow-sm">
        <div class="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div class="flex items-center gap-2.5">
            <span class="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg font-bold">💾</span>
            <div>
              <h4 class="font-bold text-sm text-[#2D1B14] dark:text-slate-200 leading-tight">Database Backup Monitor & Status</h4>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Sistem cadangan otomatis database SQLite untuk pemulihan bencana (Disaster Recovery)</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              AUTOMATIC BACKUP ACTIVE
            </span>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <!-- Stat 1: Last Backup Time -->
          <div class="p-3 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">🕒 Backup Terakhir:</span>
            <p v-if="backupStatus?.latest_backup" class="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1">
              {{ timeAgo(backupStatus.latest_backup.created_at) }}
            </p>
            <p v-else class="text-xs text-slate-400 italic mt-1">Belum ada snapshot</p>
            <span v-if="backupStatus?.latest_backup" class="text-[10px] font-mono text-slate-400 block mt-0.5">
              {{ formatDateClean(backupStatus.latest_backup.created_at) }}
            </span>
          </div>

          <!-- Stat 2: Latest File Size -->
          <div class="p-3 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">📄 File Snapshot Utama:</span>
            <p v-if="backupStatus?.latest_backup" class="text-xs font-bold text-emerald-700 dark:text-emerald-400 font-mono mt-1 truncate" :title="backupStatus.latest_backup.filename">
              {{ backupStatus.latest_backup.filename }}
            </p>
            <p v-else class="text-xs text-slate-400 italic mt-1">-</p>
            <span v-if="backupStatus?.latest_backup" class="text-[10px] text-slate-500 dark:text-slate-400 font-bold block mt-0.5">
              Ukuran: {{ backupStatus.latest_backup.size_mb }} ({{ backupStatus.latest_backup.size_kb }})
            </span>
          </div>

          <!-- Stat 3: Total Files & Path -->
          <div class="p-3 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">📦 Total File Backup:</span>
            <p class="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1">
              {{ backupStatus?.total_backups || 0 }} File Snapshot (.db)
            </p>
            <span class="text-[10px] font-mono text-slate-400 block mt-0.5 truncate" :title="backupStatus?.backup_path">
              Path: {{ backupStatus?.backup_path || './DATA/backups' }}
            </span>
          </div>

          <!-- Stat 4: Schedule & Retention -->
          <div class="p-3 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">🔄 Jadwal & Retensi:</span>
            <p class="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-1">
              Setiap 02:00 WIB (Harian)
            </p>
            <span class="text-[10px] text-amber-600 dark:text-amber-400 font-medium block mt-0.5">
              Retensi 30 Hari Otomatis
            </span>
          </div>
        </div>

        <!-- Actions Bar -->
        <div class="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div class="flex items-center gap-2">
            <button type="button" @click="triggerBackupNow" :disabled="backupTriggering" class="px-3.5 py-1.5 bg-[#0f766e] text-white rounded-xl text-xs font-bold hover:bg-[#0d6860] transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50">
              <span v-if="backupTriggering" class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span v-else>⚡</span>
              {{ backupTriggering ? 'Membuat Backup...' : 'Backup Sekarang' }}
            </button>

            <a v-if="backupStatus?.latest_backup" :href="API + '/settings/backup-download'" target="_blank" class="px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 rounded-xl text-xs font-semibold hover:bg-emerald-100 transition flex items-center gap-1.5 cursor-pointer">
              ⬇️ Download Snapshot Terakhir
            </a>
          </div>

          <span class="text-[10px] text-slate-400 font-mono">Status diperbarui otomatis saat dipanggil</span>
        </div>
      </div>

      <!-- ☁️ INTEGRASI & STORAGE GOOGLE DRIVE -->
      <!-- ═══ MODE A: UNIFIED DASHBOARD CARD (Saat Integrasi 100% Selesai) ═══ -->
      <div v-if="isDriveFullyConfigured" class="card p-6 dark:bg-slate-900 dark:border-slate-800 space-y-4 shadow-lg border-emerald-500/30 border-l-4 border-l-emerald-500">
        <!-- Card Header -->
        <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h3 class="font-bold text-sm text-[#2D1B14] dark:text-slate-200 flex items-center gap-2">
              📁 Integrasi Google Drive Gmail Studio
            </h3>
            <p class="text-[10px] text-slate-400 mt-0.5">Sistem penyimpanan & pembuatan folder otomatis master wisuda</p>
          </div>
          <span class="text-[9px] px-2.5 py-1 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            INTEGRASI SELESAI & AKTIF ✓
          </span>
        </div>

        <!-- Top Green Box: Connected Gmail & Storage Capacity -->
        <div class="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-2.5">
          <div class="flex items-center justify-between text-xs font-bold">
            <span class="text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              👤 Akun Gmail Studio Terhubung:
            </span>
            <span class="font-mono text-slate-900 dark:text-slate-100 select-all">{{ driveOAuthEmail }}</span>
          </div>
          <div class="flex items-center justify-between text-xs font-bold pt-0.5">
            <span class="text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              📊 Kapasitas Storage Google Drive:
            </span>
            <span class="font-mono text-slate-800 dark:text-slate-200">
              {{ driveStorageUsedGB }} GB / {{ driveStorageTotalGB }} GB ({{ driveStoragePercent }}% Terpakai)
            </span>
          </div>
          <div class="w-full bg-emerald-200/60 dark:bg-emerald-950/80 h-2.5 rounded-full overflow-hidden mt-1">
            <div class="bg-emerald-600 h-full transition-all duration-500 rounded-full" :style="{ width: driveStoragePercent + '%' }"></div>
          </div>
        </div>

        <!-- Bottom Row: 4 Equal Columns Side-by-Side with Full Metrics & Actions -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <!-- Item 1: Folder Portofolio Publik -->
          <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">📁 Master Portofolio:</span>
              <span class="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">PUBLIC VIEW</span>
            </div>
            <div class="flex items-center justify-between gap-1">
              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{{ portfolioFolderName || 'Master Portofolio' }}</p>
                <p class="text-xs font-bold text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">
                  {{ storageStatus?.storage?.portfolio?.size_formatted || '0.44 MB' }}
                </p>
                <span class="text-[9px] text-slate-400 block truncate">
                  {{ storageStatus?.storage?.portfolio?.files_count || 2 }} File Galeri Publik
                </span>
              </div>
              <div class="flex flex-col gap-1 flex-shrink-0">
                <a v-if="portfolioMasterUrl" :href="portfolioMasterUrl" target="_blank" class="px-2 py-1 bg-violet-600 text-white rounded-lg text-[10px] font-bold hover:bg-violet-700 transition text-center">
                  📂 Buka
                </a>
                <button type="button" @click="openPortfolioFolderModal" class="px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-semibold hover:bg-slate-100 transition cursor-pointer">
                  ✏️ Ubah
                </button>
              </div>
            </div>
          </div>

          <!-- Item 2: Wisuda Clients -->
          <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">📁 Wisuda Clients:</span>
              <span class="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">PRIVATE</span>
            </div>
            <div class="flex items-center justify-between gap-1">
              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{{ driveFolderName || 'WISUDA CLIENTS' }}</p>
                <p class="text-xs font-bold text-blue-700 dark:text-blue-400 font-mono mt-0.5">
                  {{ storageStatus?.storage?.clients?.size_formatted || '0.00 MB' }}
                </p>
                <span class="text-[9px] text-slate-400 block truncate">
                  {{ storageStatus?.storage?.clients?.files_count || 1 }} File Transaksi Klien
                </span>
              </div>
              <div class="flex flex-col gap-1 flex-shrink-0">
                <a v-if="driveMasterUrl" :href="driveMasterUrl" target="_blank" class="px-2 py-1 bg-[#0f766e] text-white rounded-lg text-[10px] font-bold hover:bg-[#0d6860] transition text-center">
                  📂 Buka
                </a>
                <button type="button" @click="openMasterFolderModal" class="px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-semibold hover:bg-slate-100 transition cursor-pointer">
                  ✏️ Ubah
                </button>
              </div>
            </div>
          </div>

          <!-- Item 3: Sampah Drive -->
          <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">🗑️ Sampah Drive:</span>
              <span class="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">AUTO TRASH</span>
            </div>
            <p class="text-xs font-bold text-amber-700 dark:text-amber-400 font-mono mt-0.5">
              {{ storageStatus?.storage?.trash_mb || '0.00 MB' }}
            </p>
            <span class="text-[9px] text-slate-400 block">
              Dibersihkan otomatis H+60
            </span>
          </div>

          <!-- Item 4: OAuth Credentials / Gmail Studio -->
          <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">📧 Gmail Studio:</span>
              <span class="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">AUTHENTICATED</span>
            </div>
            <div class="flex items-center justify-between gap-1">
              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold text-slate-700 dark:text-slate-200 truncate" :title="driveOAuthEmail">{{ driveOAuthEmail || 'man09project@gmail.com' }}</p>
                <span class="text-[9px] text-slate-400 block mt-0.5">OAuth2 Owner Studio</span>
              </div>
              <button type="button" @click="openOAuthModal" class="px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-semibold hover:bg-slate-100 transition cursor-pointer flex-shrink-0">
                ✏️ Ubah
              </button>
            </div>
          </div>
        </div>

        <!-- Bottom Action Buttons: Ganti Akun / Putuskan Tautan -->
        <div class="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button type="button" @click="initiateOAuthLogin" class="px-3.5 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition cursor-pointer flex items-center gap-1.5">
            🔄 Ganti Akun Gmail Studio
          </button>
          <button type="button" @click="disconnectOAuth" class="px-3.5 py-2 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-semibold hover:bg-rose-100 transition cursor-pointer">
            🔴 Putuskan Tautan
          </button>
        </div>

        <!-- ── Modal Ubah OAuth Credentials ── -->
        <div v-if="showOAuthModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.65); backdrop-filter: blur(6px);" @click.self="showOAuthModal = false">
          <div class="card w-full max-w-lg p-6 animate-pop dark:bg-slate-900 dark:border-slate-800 relative max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <button @click="showOAuthModal = false" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold transition">✕</button>

            <h3 class="font-bold text-base text-[#2D1B14] dark:text-slate-100 flex items-center gap-2">
              ✏️ Ubah Google OAuth Credentials
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">Masukkan Client ID & Client Secret baru dari Google Cloud Console.</p>

            <div class="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
              <div class="flex items-center justify-between text-xs">
                <span class="font-bold text-amber-700 dark:text-amber-300">Authorized Redirect URI:</span>
                <button type="button" @click="copyRedirectUri" class="text-[10px] px-2 py-0.5 bg-amber-600 text-white rounded font-bold hover:bg-amber-700 transition cursor-pointer">
                  {{ redirectUriCopied ? '✓ Tersalin!' : '📋 Salin URI' }}
                </button>
              </div>
              <code class="block font-mono text-[11px] text-amber-800 dark:text-amber-200 break-all select-all">{{ currentRedirectUri }}</code>
            </div>

            <div class="space-y-3">
              <div>
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">GOOGLE OAUTH CLIENT ID *</label>
                <input v-model="form.google_oauth_client_id" placeholder="123456789-xxx.apps.googleusercontent.com" class="input-fancy !text-xs !py-2 font-mono dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 w-full" @input="oauthVerified = false">
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">GOOGLE OAUTH CLIENT SECRET *</label>
                <input v-model="form.google_oauth_client_secret" type="password" placeholder="GOCSPX-xxxxxxxx" class="input-fancy !text-xs !py-2 font-mono dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 w-full" @input="oauthVerified = false">
              </div>
            </div>

            <div v-if="oauthVerifyMsg" class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
              {{ oauthVerifyMsg }}
            </div>
            <div v-if="oauthVerifyError" class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-medium">
              {{ oauthVerifyError }}
            </div>

            <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button type="button" @click="showOAuthModal = false" class="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-medium hover:bg-slate-200 transition cursor-pointer">Batal</button>
              <button type="button" @click="verifyOAuthCredentials" :disabled="oauthVerifying" class="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition cursor-pointer disabled:opacity-50">
                {{ oauthVerifying ? '🔍 Memverifikasi...' : '🔍 1. Verifikasi' }}
              </button>
              <button type="button" @click="saveOAuthCredentials" :disabled="!oauthVerified || oauthCredentialsSaving" class="px-4 py-2 bg-[#0f766e] text-white rounded-xl text-xs font-bold hover:bg-[#0d6860] transition cursor-pointer disabled:opacity-50">
                {{ oauthCredentialsSaving ? '💾 Menyimpan...' : '💾 2. Simpan' }}
              </button>
            </div>
          </div>
        </div>

        <!-- ── Modal Ubah Master Root Folder ID ── -->
        <div v-if="showMasterFolderModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.65); backdrop-filter: blur(6px);" @click.self="showMasterFolderModal = false">
          <div class="card w-full max-w-lg p-6 animate-pop dark:bg-slate-900 dark:border-slate-800 relative max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <button @click="showMasterFolderModal = false" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold transition">✕</button>

            <h3 class="font-bold text-base text-[#2D1B14] dark:text-slate-100 flex items-center gap-2">
              ✏️ Ubah Master Root Folder ID Google Drive
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">Masukkan ID Folder Google Drive baru tempat penyimpanan otomatis master wisuda.</p>

            <div>
              <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">GOOGLE DRIVE MASTER ROOT FOLDER ID *</label>
              <input v-model="masterFolderIdInput" placeholder="Contoh: 1fh9xnNnNG6tuvC6..." class="input-fancy !text-xs !py-2 font-mono dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 w-full">
            </div>

            <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button type="button" @click="showMasterFolderModal = false" class="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-medium hover:bg-slate-200 transition cursor-pointer">Batal</button>
              <button type="button" @click="saveMasterFolderIdModal" :disabled="masterFolderIdSaving || !masterFolderIdInput.trim()" class="px-4 py-2 bg-[#0f766e] text-white rounded-xl text-xs font-bold hover:bg-[#0d6860] transition cursor-pointer disabled:opacity-50">
                {{ masterFolderIdSaving ? '💾 Menyimpan...' : '💾 Simpan & Tes Koneksi Folder' }}
              </button>
            </div>
          </div>
        </div>
        <!-- ── Modal Ubah Master Root Folder Portofolio ID ── -->
        <div v-if="showPortfolioFolderModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.65); backdrop-filter: blur(6px);" @click.self="showPortfolioFolderModal = false">
          <div class="card w-full max-w-lg p-6 animate-pop dark:bg-slate-900 dark:border-slate-800 relative max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <button @click="showPortfolioFolderModal = false" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold transition">✕</button>

            <h3 class="font-bold text-base text-[#2D1B14] dark:text-slate-100 flex items-center gap-2">
              🖼️ Ubah Master Root Folder Portofolio ID
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">Masukkan ID Folder Google Drive khusus penampung asset portofolio publik studio.</p>

            <div>
              <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">GOOGLE DRIVE PORTFOLIO MASTER FOLDER ID *</label>
              <input v-model="portfolioFolderInput" placeholder="Contoh: 1a2b3c4d5e6f..." class="input-fancy !text-xs !py-2 font-mono dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 w-full">
            </div>

            <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button type="button" @click="showPortfolioFolderModal = false" class="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-medium hover:bg-slate-200 transition cursor-pointer">Batal</button>
              <button type="button" @click="savePortfolioFolderIdModal" :disabled="portfolioFolderSaving || !portfolioFolderInput.trim()" class="px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-bold hover:bg-violet-700 transition cursor-pointer disabled:opacity-50">
                {{ portfolioFolderSaving ? '💾 Menyimpan...' : '💾 Simpan ID Portofolio' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══ MODE B: STEP-BY-STEP WIZARD (Saat Setup Belum Selesai) ═══ -->
      <div v-else class="space-y-5">
        <!-- ═══ STEP 1: Google OAuth Credentials (Client ID & Secret) ═══ -->
        <div class="card p-6 dark:bg-slate-900 dark:border-slate-800 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 class="font-bold text-sm text-[#2D1B14] dark:text-slate-200 flex items-center gap-2">
                ⚙️ STEP 1: Google OAuth Credentials (Client ID & Secret)
              </h3>
              <p class="text-[10px] text-slate-400 mt-0.5">Dapatkan Client ID & Secret dari Google Cloud Console untuk otorisasi login Gmail Studio</p>
            </div>
            <span v-if="isOAuthFullyConfigured" class="text-[9px] px-2.5 py-1 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">STEP 1 SELESAI ✓</span>
            <span v-else class="text-[9px] px-2.5 py-1 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">STEP 1: PERLU KONFIGURASI</span>
          </div>

          <!-- Mode 1: Display Mode (Tersimpan & Terverifikasi) -->
          <div v-if="isOAuthFullyConfigured && !showOAuthCredentialsForm" class="flex items-center justify-between gap-2 p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <div class="space-y-1 min-w-0 flex-1">
              <div class="flex items-center gap-2 text-xs">
                <span class="text-[10px] font-bold text-slate-400">Client ID:</span>
                <code class="font-mono text-emerald-700 dark:text-emerald-400 text-[11px] truncate block">{{ savedOAuthClientId }}</code>
              </div>
              <div class="flex items-center gap-2 text-xs">
                <span class="text-[10px] font-bold text-slate-400">Secret:</span>
                <code class="font-mono text-slate-500 text-[11px]">••••••••••••••••••••••••••••••••</code>
              </div>
            </div>
            <button @click="showOAuthCredentialsForm = true" class="px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 transition flex-shrink-0 cursor-pointer">
              ✏️ Ubah Kredensial
            </button>
          </div>

          <!-- Mode 2: Edit Form Mode -->
          <div v-else class="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-700 dark:text-slate-300">Form Pengisian Kredensial Google OAuth:</span>
              <button v-if="isOAuthFullyConfigured" @click="showOAuthCredentialsForm = false" class="text-[10px] text-slate-400 hover:underline">Batal</button>
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">GOOGLE OAUTH CLIENT ID <span class="text-rose-500">*Wajib</span></label>
              <input v-model="form.google_oauth_client_id" placeholder="123456789-xxx.apps.googleusercontent.com" class="input-fancy !text-xs !py-2 font-mono dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200" @input="oauthVerified = false">
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">GOOGLE OAUTH CLIENT SECRET <span class="text-rose-500">*Wajib</span></label>
              <div class="relative">
                <input v-model="form.google_oauth_client_secret" :type="showSecretText ? 'text' : 'password'" placeholder="GOCSPX-xxxxxxxxxxxxxx" class="input-fancy !text-xs !py-2 font-mono pr-9 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200" @input="oauthVerified = false">
                <button type="button" @click="showSecretText = !showSecretText" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer">
                  {{ showSecretText ? '🙈' : '👁️' }}
                </button>
              </div>
            </div>

            <!-- Alert Result Messages -->
            <div v-if="oauthVerifyMsg" class="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 animate-fade-in">
              {{ oauthVerifyMsg }}
            </div>
            <div v-if="oauthVerifyError" class="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1.5 animate-fade-in">
              {{ oauthVerifyError }}
            </div>

            <!-- 2 Separate Buttons: Verifikasi & Simpan -->
            <div class="flex items-center gap-2 pt-1">
              <button type="button" @click="verifyOAuthCredentials" class="px-3.5 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5" :disabled="oauthVerifying">
                <span v-if="oauthVerifying" class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                {{ oauthVerifying ? '🔍 Memverifikasi...' : '🔍 1. Verifikasi Kredensial' }}
              </button>

              <button type="button" @click="saveOAuthCredentials" class="px-4 py-2 bg-[#D94A3D] hover:bg-[#C0392B] text-white rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5" :disabled="oauthCredentialsSaving">
                <span v-if="oauthCredentialsSaving" class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                {{ oauthCredentialsSaving ? '💾 Menyimpan...' : '💾 2. Simpan Kredensial' }}
              </button>

              <button v-if="isOAuthFullyConfigured" @click="showOAuthCredentialsForm = false" class="px-3 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer">
                Batal
              </button>
            </div>
          </div>
        </div>

        <!-- ═══ STEP 2: Tautkan Akun Google Drive (OAuth2) ═══ -->
        <div class="card p-6 dark:bg-slate-900 dark:border-slate-800 space-y-4 transition-all" :class="{ 'opacity-50 pointer-events-none': !isOAuthFullyConfigured }">
          <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 class="font-bold text-sm text-[#2D1B14] dark:text-slate-200 flex items-center gap-2">
                🔗 STEP 2: Tautkan Akun Google Drive (OAuth2)
              </h3>
              <p class="text-[10px] text-slate-400 mt-0.5">Otorisasi login akun Gmail Studio utama untuk pembuatan folder otomatis &amp; transfer kepemilikan</p>
            </div>
            <span v-if="driveOAuthConnected" class="text-[9px] px-2.5 py-1 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">STEP 2 SELESAI ✓</span>
            <span v-else-if="isOAuthFullyConfigured" class="text-[9px] px-2.5 py-1 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">STEP 2: PERLU PENAUTAN</span>
            <span v-else class="text-[9px] px-2.5 py-1 rounded-full font-bold bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400">🔒 TERKUNCI (Selesaikan Step 1)</span>
          </div>

          <div v-if="!isOAuthFullyConfigured" class="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 rounded-xl text-xs">
            🔒 <strong>Selesaikan Step 1 Terlebih Dahulu:</strong> Masukkan &amp; verifikasi Google OAuth Client ID &amp; Secret di atas untuk membuka Step 2.
          </div>

          <div v-else class="space-y-3">
            <div v-if="driveOAuthConnected" class="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 space-y-3">
              <div class="flex items-center justify-between text-xs">
                <span class="font-medium text-emerald-800 dark:text-emerald-300">👤 Akun Gmail Studio Terhubung:</span>
                <span class="font-bold text-emerald-900 dark:text-emerald-200 select-all font-mono">{{ driveOAuthEmail }}</span>
              </div>
              <div>
                <div class="flex justify-between text-[10px] font-semibold text-emerald-800 dark:text-emerald-400 mb-1">
                  <span>📊 Kapasitas Storage Google Drive:</span>
                  <span>{{ driveStorageUsedGB }} GB / {{ driveStorageTotalGB }} GB ({{ driveStoragePercent }}% Terpakai)</span>
                </div>
                <div class="w-full h-2 bg-emerald-200 dark:bg-emerald-900/60 rounded-full overflow-hidden">
                  <div class="h-full bg-emerald-600 rounded-full transition-all duration-500" :style="{ width: driveStoragePercent + '%' }"></div>
                </div>
              </div>
            </div>

            <div v-else class="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-xs space-y-1.5">
              <p class="font-bold text-amber-900 dark:text-amber-300">⚠️ Belum ada akun Gmail Studio yang ditautkan</p>
              <p class="text-[10px] text-amber-800 dark:text-amber-400">Klik tombol di bawah untuk menautkan akun Google Studio utama agar fitur pembuat folder otomatis &amp; transfer kepemilikan klien berfungsi.</p>
            </div>

            <div class="flex flex-wrap gap-2 pt-1">
              <button v-if="!driveOAuthConnected" @click="initiateOAuthLogin" class="px-4 py-2.5 bg-[#111E35] text-[#D4AF37] rounded-xl text-xs font-bold shadow-md hover:bg-[#111E35]/90 transition cursor-pointer flex items-center gap-2">
                🔗 Tautkan Akun Google Drive (OAuth2)
              </button>
              <template v-else>
                <button @click="initiateOAuthLogin" class="px-3.5 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition cursor-pointer">
                  🔄 Ganti Akun Gmail Studio
                </button>
                <button @click="disconnectOAuth" class="px-3.5 py-2 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-semibold hover:bg-rose-100 transition cursor-pointer">
                  🔴 Putuskan Tautan
                </button>
              </template>
            </div>
          </div>
        </div>

        <!-- ═══ STEP 3: MASTER ROOT FOLDER DRIVE ═══ -->
        <div class="card p-6 dark:bg-slate-900 dark:border-slate-800 space-y-4 transition-all" :class="{ 'opacity-50 pointer-events-none': !driveOAuthConnected }">
          <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 class="font-bold text-sm text-[#2D1B14] dark:text-slate-200 flex items-center gap-2">
                📂 STEP 3: MASTER ROOT FOLDER DRIVE
              </h3>
              <p class="text-[10px] text-slate-400 mt-0.5">Folder utama penampungan seluruh Folder Master Client wisuda di Google Drive Gmail</p>
            </div>
            <span v-if="driveStatus === 'ok'" class="text-[9px] px-2.5 py-1 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">STEP 3 SELESAI ✓</span>
            <span v-else-if="driveOAuthConnected" class="text-[9px] px-2.5 py-1 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">STEP 3: PERLU ID FOLDER</span>
            <span v-else class="text-[9px] px-2.5 py-1 rounded-full font-bold bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400">🔒 TERKUNCI (Selesaikan Step 2)</span>
          </div>

          <div v-if="!driveOAuthConnected" class="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 rounded-xl text-xs">
            🔒 <strong>Selesaikan Step 2 Terlebih Dahulu:</strong> Tautkan Akun Google Drive (OAuth2) di atas untuk membuka Step 3.
          </div>

          <div v-else class="space-y-4">
            <!-- Sub-Card 1: Master Root Folder Client Bookings -->
            <div class="space-y-2 p-3.5 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  📁 1. Master Root Folder Client Bookings (<code class="font-mono">WISUDA CLIENTS</code>)
                </span>
                <span v-if="driveFolderId" class="text-[9px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">TERHUBUNG ✓</span>
              </div>

              <div v-if="(driveStatus === 'ok' || driveFolderId) && !showFolderEditForm" class="space-y-2">
                <div class="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <p class="text-xs font-bold text-emerald-800 dark:text-emerald-300 truncate">{{ driveFolderName || 'WISUDA CLIENTS' }}</p>
                    <p class="text-[10px] text-slate-400 font-mono truncate">ID: {{ driveFolderId || masterFolderIdInput }}</p>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <a :href="driveMasterUrl || ('https://drive.google.com/drive/folders/' + (driveFolderId || masterFolderIdInput))" target="_blank" class="px-3 py-1.5 bg-[#0f766e] hover:bg-[#0d6860] text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1">
                      📂 Buka Root Client
                    </a>
                    <button @click="showFolderEditForm = true" class="px-2.5 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-semibold hover:bg-slate-100 transition">
                      ✏️ Ubah ID
                    </button>
                  </div>
                </div>
              </div>

              <div v-else class="space-y-2">
                <div class="flex items-center justify-between">
                  <p class="text-[10px] text-slate-500 font-bold">Masukkan ID Master Root Folder Client (WISUDA CLIENTS):</p>
                  <button v-if="driveStatus === 'ok' || driveFolderId" @click="showFolderEditForm = false" class="text-[9px] text-slate-400 hover:underline">Batal</button>
                </div>
                <div class="flex gap-1.5">
                  <input v-model="masterFolderIdInput" class="input-fancy flex-1 !text-xs !py-2 font-mono dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="Contoh ID: 1fh9xnNNg6tuvC6K..." @keyup.enter="saveMasterFolderId" />
                  <button @click="saveMasterFolderId" class="px-4 py-2 bg-[#D94A3D] hover:bg-[#C0392B] text-white rounded-lg text-xs font-bold transition" :disabled="masterFolderIdSaving || !masterFolderIdInput.trim()">
                    {{ masterFolderIdSaving ? 'Simpan...' : 'Simpan ID Client' }}
                  </button>
                </div>
                <div v-if="driveErrorMsg" class="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1.5 animate-fade-in mt-2">
                  ⚠️ {{ driveErrorMsg }}
                </div>
              </div>
            </div>

            <!-- Sub-Card 2: Master Root Folder Portofolio Publik -->
            <div class="space-y-2 p-3.5 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  🖼️ 2. Master Root Folder Portofolio Publik (<code class="font-mono">Master Portofolio</code>)
                </span>
                <span v-if="portfolioFolderId" class="text-[9px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">TERHUBUNG ✓</span>
                <span v-else class="text-[9px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">AUTO-GENERATE ON SAVE</span>
              </div>

              <div v-if="portfolioFolderId && !showPortfolioFolderEditForm" class="space-y-2">
                <div class="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <p class="text-xs font-bold text-emerald-800 dark:text-emerald-300 truncate">{{ portfolioFolderName || 'Master Portofolio' }}</p>
                    <p class="text-[10px] text-slate-400 font-mono truncate">ID: {{ portfolioFolderId }}</p>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <a :href="portfolioMasterUrl || ('https://drive.google.com/drive/folders/' + portfolioFolderId)" target="_blank" class="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1">
                      📂 Buka Root Portofolio
                    </a>
                    <button @click="showPortfolioFolderEditForm = true" class="px-2.5 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-semibold hover:bg-slate-100 transition">
                      ✏️ Ubah ID
                    </button>
                  </div>
                </div>
              </div>

              <div v-else class="space-y-2">
                <div class="flex items-center justify-between">
                  <p class="text-[10px] text-slate-500 font-bold">Masukkan ID Master Root Folder Portofolio (Kosongkan untuk buat otomatis):</p>
                  <button v-if="portfolioFolderId" @click="showPortfolioFolderEditForm = false" class="text-[9px] text-slate-400 hover:underline">Batal</button>
                </div>
                <div class="flex gap-1.5">
                  <input v-model="portfolioFolderInput" class="input-fancy flex-1 !text-xs !py-2 font-mono dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="Contoh ID: 1a2b3c4d..." @keyup.enter="savePortfolioFolderId" />
                  <button @click="savePortfolioFolderId" class="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold transition" :disabled="portfolioFolderSaving">
                    {{ portfolioFolderSaving ? 'Simpan...' : 'Simpan ID Portofolio' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>



      <!-- ═══ SECTION 3: Panduan & Bantuan (Collapsible Accordion) ═══ -->
      <div class="card p-0 dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
        <button @click="showMigrasiGuide = !showMigrasiGuide"
          class="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
          <div class="flex items-center gap-2">
            <span class="text-base">❓</span>
            <div>
              <p class="text-xs font-bold text-[#2D1B14] dark:text-slate-200">Panduan Setup &amp; Migrasi Google Drive</p>
              <p class="text-[10px] text-[#8A7A72] dark:text-slate-400 mt-0.5">Petunjuk langkah setup atau mengganti Master Folder ke akun Gmail baru</p>
            </div>
          </div>
          <span class="text-[10px] text-[#8A7A72] dark:text-slate-500 flex-shrink-0 transition-transform" :class="showMigrasiGuide ? 'rotate-180' : ''">▼</span>
        </button>

        <div v-show="showMigrasiGuide" class="border-t border-[#E8D5C8]/40 dark:border-slate-800 p-5 space-y-4">
          <!-- Section 1: Dynamic Redirect URI Copy Box -->
          <div class="p-3.5 rounded-xl bg-blue-50/70 dark:bg-slate-800/80 border border-blue-100 dark:border-slate-700 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                🔗 Authorized Redirect URI untuk Google Cloud Console
              </span>
              <button @click="copyRedirectUri" class="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold transition cursor-pointer">
                {{ redirectUriCopied ? '✓ Tersalin!' : '📋 Salin URL Redirect' }}
              </button>
            </div>
            <code class="text-[10px] font-mono text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 block break-all select-all">
              {{ currentRedirectUri }}
            </code>
            <p class="text-[9px] text-slate-500 dark:text-slate-400">Tempelkan URL ini di Google Cloud Console &gt; Credentials &gt; Authorized Redirect URIs.</p>
          </div>

          <div class="space-y-2 pt-1">
            <p class="text-[10px] font-bold text-[#8A7A72] dark:text-slate-400 uppercase tracking-wider">Langkah Setup Awal (Otorisasi 1-2-3)</p>
            <ol class="space-y-2 text-[11px] text-[#8A7A72] dark:text-slate-400">
              <li class="flex gap-2">
                <span class="font-bold text-[#C59B63] flex-shrink-0">1.</span>
                <span>Buat <strong>OAuth Client ID</strong> (Web Application) di Google Cloud Console, lalu klik <strong>+ ADD URI</strong> di bagian Authorized Redirect URIs dan tempelkan URL yang disalin di atas.</span>
              </li>
              <li class="flex gap-2">
                <span class="font-bold text-[#C59B63] flex-shrink-0">2.</span>
                <span>Salin <strong>Client ID</strong> &amp; <strong>Client Secret</strong> yang diberikan Google, lalu tempelkan di form <strong>⚙️ Google OAuth Credentials</strong> di atas dan klik Simpan.</span>
              </li>
              <li class="flex gap-2">
                <span class="font-bold text-[#C59B63] flex-shrink-0">3.</span>
                <span>Klik tombol <strong>🔗 Tautkan Akun Google Drive (OAuth)</strong> untuk login dan menghubungkan akun Gmail utama studio Anda.</span>
              </li>
            </ol>
          </div>

          <div class="border-t border-[#E8D5C8]/40 dark:border-slate-800 pt-3 space-y-1.5">
            <p class="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              🔄 Cara Migrasi Jika Drive Penuh
            </p>
            <p class="text-[11px] text-[#8A7A72] dark:text-slate-400 leading-relaxed">
              Jika kapasitas Google Drive A hampir penuh (misal 95%), Anda tinggal klik tombol <strong>🔄 Ganti Akun Gmail</strong> di atas, lalu login menggunakan akun Gmail B baru yang masih kosong. Seluruh pengerjaan berikutnya otomatis masuk ke akun baru.
            </p>
          </div>
        </div>
      </div>

      <!-- 📧 KONFIGURASI EMAIL GATEWAY (SMTP) -->
      <div class="card p-5 dark:bg-slate-900 dark:border-slate-800 space-y-4 border-l-4 border-l-violet-500 shadow-sm">
        <div class="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div class="flex items-center gap-2.5">
            <span class="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center text-lg font-bold">📧</span>
            <div>
              <h4 class="font-bold text-sm text-[#2D1B14] dark:text-slate-200 leading-tight">Konfigurasi Email Gateway (SMTP Server)</h4>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Pengaturan server SMTP untuk pengiriman otomatis email invoice, booking, &amp; pengingat studio</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span v-if="smtpForm.smtp_host && smtpForm.smtp_user" class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              SMTP GATEWAY SIAP
            </span>
            <span v-else class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 flex items-center gap-1.5">
              ⚠️ BELUM TERKONFIGURASI
            </span>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- SMTP Host & Port -->
          <div class="space-y-3">
            <div>
              <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">HOST SERVER SMTP *</label>
              <input v-model="smtpForm.smtp_host" placeholder="Contoh: smtp.gmail.com atau mail.domain.com" class="input-fancy !text-xs !py-2 font-mono dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 w-full">
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">PORT SMTP *</label>
                <input v-model.number="smtpForm.smtp_port" type="number" placeholder="587" class="input-fancy !text-xs !py-2 font-mono dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 w-full">
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">ENKRIPSI / KEAMANAN</label>
                <select v-model="smtpForm.smtp_secure" class="input-fancy !text-xs !py-2 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 w-full">
                  <option value="0">STARTTLS (Port 587)</option>
                  <option value="1">SSL / TLS (Port 465)</option>
                </select>
              </div>
            </div>
          </div>

          <!-- SMTP User & Password -->
          <div class="space-y-3">
            <div>
              <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">USERNAME / EMAIL LOGIN SMTP *</label>
              <input v-model="smtpForm.smtp_user" placeholder="admin@domain.com atau email@gmail.com" class="input-fancy !text-xs !py-2 font-mono dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 w-full">
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">PASSWORD / APP PASSWORD *</label>
              <div class="relative">
                <input :type="showSmtpPassword ? 'text' : 'password'" v-model="smtpForm.smtp_pass" placeholder="••••••••••••••••" class="input-fancy !text-xs !py-2 font-mono dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 w-full pr-10">
                <button type="button" @click="showSmtpPassword = !showSmtpPassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">
                  {{ showSmtpPassword ? '🙈' : '👁️' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Sender Info & Actions -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div>
            <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">NAMA PENGIRIM RESMI (SENDER NAME)</label>
            <input v-model="smtpForm.smtp_from_name" placeholder="Contoh: Wisuda Official Studio" class="input-fancy !text-xs !py-2 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 w-full">
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">EMAIL PENGIRIM RESMI (FROM EMAIL)</label>
            <input v-model="smtpForm.smtp_from_email" placeholder="Opsional (Otomatis samakan dengan Email Login SMTP)" class="input-fancy !text-xs !py-2 font-mono dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 w-full">
          </div>
        </div>

        <!-- Feedback Alert Boxes -->
        <div v-if="smtpVerifyMsg" class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
          {{ smtpVerifyMsg }}
        </div>
        <div v-if="smtpVerifyError" class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-medium">
          {{ smtpVerifyError }}
        </div>

        <!-- Actions Toolbar -->
        <div class="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div class="flex items-center gap-2">
            <button type="button" @click="verifySmtpConnection" :disabled="smtpVerifying || !smtpForm.smtp_host || !smtpForm.smtp_user" class="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition cursor-pointer disabled:opacity-50">
              {{ smtpVerifying ? '🔍 Memverifikasi...' : '🔍 1. Verifikasi Koneksi SMTP' }}
            </button>
            <button type="button" @click="openSmtpTestModal" :disabled="!smtpForm.smtp_host || !smtpForm.smtp_user" class="px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-bold hover:bg-violet-700 transition cursor-pointer disabled:opacity-50">
              ⚡ 2. Kirim Email Uji Coba
            </button>
          </div>

          <div class="flex items-center gap-3">
            <span v-if="smtpSaved" class="text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-pulse">✓ Konfigurasi SMTP Disimpan!</span>
            <button type="button" @click="saveSmtpSettings" :disabled="smtpSaving" class="px-4 py-2 bg-[#0f766e] text-white rounded-xl text-xs font-bold hover:bg-[#0d6860] transition cursor-pointer disabled:opacity-50">
              {{ smtpSaving ? '💾 Menyimpan...' : '💾 3. Simpan Pengaturan SMTP' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ── Modal Kirim Email Uji Coba SMTP ── -->
      <div v-if="showSmtpTestModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(45,27,20,0.65); backdrop-filter: blur(6px);" @click.self="showSmtpTestModal = false">
        <div class="card w-full max-w-md p-6 animate-pop dark:bg-slate-900 dark:border-slate-800 relative max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
          <button @click="showSmtpTestModal = false" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold transition">✕</button>

          <h3 class="font-bold text-base text-[#2D1B14] dark:text-slate-100 flex items-center gap-2">
            ⚡ Kirim Email Uji Coba SMTP
          </h3>
          <p class="text-xs text-slate-500 dark:text-slate-400">Masukkan alamat email tujuan untuk menguji pengiriman pesan otomatis sistem.</p>

          <div>
            <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">EMAIL TUJUAN PENERIMA *</label>
            <input v-model="smtpTestEmailInput" type="email" placeholder="emailanda@gmail.com" class="input-fancy !text-xs !py-2 font-mono dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 w-full">
          </div>

          <div v-if="smtpTestResultMsg" class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
            {{ smtpTestResultMsg }}
          </div>
          <div v-if="smtpTestResultError" class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-medium">
            {{ smtpTestResultError }}
          </div>

          <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button type="button" @click="showSmtpTestModal = false" class="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-medium hover:bg-slate-200 transition cursor-pointer">Tutup</button>
            <button type="button" @click="sendSmtpTestEmail" :disabled="smtpTestSending || !smtpTestEmailInput.trim()" class="px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-bold hover:bg-violet-700 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5">
              <span v-if="smtpTestSending" class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>{{ smtpTestSending ? 'Mengirim Email...' : '⚡ Kirim Sekarang' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 🔒 PENGATURAN LOKASI BACKUP DATABASE MANAGER (STATE: TERKUNCI) -->
      <div v-if="isStoragePathLocked" class="card p-4 dark:bg-slate-900 dark:border-slate-800 border-l-4 border-l-amber-500 shadow-sm flex items-center justify-between flex-wrap gap-3 transition-all duration-300">
        <div class="flex items-center gap-3">
          <span class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg font-bold">🔒</span>
          <div>
            <div class="flex items-center gap-2">
              <h4 class="font-bold text-sm text-[#2D1B14] dark:text-slate-200">Pengaturan Lokasi Backup Database (.db)</h4>
              <span class="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">🟢 TERSETEL & TERKUNCI</span>
            </div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono truncate max-w-xl">
              Path Backup Aktif: {{ storageStatus?.backup_path || './DATA/backups' }}
            </p>
          </div>
        </div>

        <button type="button" @click="toggleLockStorage" class="px-3.5 py-1.5 bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-xl text-xs font-bold hover:bg-amber-500/20 transition cursor-pointer flex items-center gap-1.5 shadow-sm">
          🔓 Buka Kunci Pengaturan (Verifikasi Password)
        </button>
      </div>

      <!-- ⚙️ PENGATURAN LOKASI BACKUP DATABASE MANAGER (STATE: TERBUKA) -->
      <div v-else class="card p-5 dark:bg-slate-900 dark:border-slate-800 space-y-4 border-l-4 border-l-amber-500 shadow-sm animate-fade-in transition-all duration-300">
        <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 flex-wrap gap-2">
          <div class="flex items-center gap-2.5">
            <span class="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg font-bold">⚙️</span>
            <div>
              <h4 class="font-bold text-sm text-[#2D1B14] dark:text-slate-200 leading-tight">Pengaturan Lokasi Backup Database (.db)</h4>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Kelola lokasi folder penyimpanan file backup database (.db) tanpa perlu mengubah file .env di server</p>
            </div>
          </div>

          <button type="button" @click="toggleLockStorage" class="px-3 py-1.5 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5">
            🔒 Kunci Kembali
          </button>
        </div>

        <div class="space-y-3">
          <!-- Input Backup Path Only -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="text-[11px] font-bold text-slate-700 dark:text-slate-300">💾 Path Backup Database (.db) *</label>
              <button type="button" @click="verifyPath('backup_path')" :disabled="pathVerifying['backup_path']" class="text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer">
                {{ pathVerifying['backup_path'] ? '🔍 Memeriksa...' : '🔍 Tes Akses Path' }}
              </button>
            </div>
            <div class="flex items-center gap-2">
              <input v-model="pathForm.backup_path" placeholder="./DATA/backups atau /mnt/DATA1/wisuda/backups" class="input-fancy !text-xs !py-2 font-mono dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 flex-1">
              <button type="button" @click="openFolderExplorer('backup_path')" class="px-3 py-2 bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-xl text-xs font-bold hover:bg-amber-500/20 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap">
                📂 Jelajahi Server...
              </button>
            </div>
            <p v-if="pathFeedback['backup_path']" class="text-[10px] font-semibold mt-1" :class="pathFeedback['backup_path'].valid ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
              {{ pathFeedback['backup_path'].message || pathFeedback['backup_path'].error }}
            </p>
          </div>
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
          <span v-if="pathSaved" class="text-xs font-bold text-emerald-600 dark:text-emerald-400">✓ Pengaturan lokasi backup berhasil disimpan! Mengunci kembali...</span>
          <span v-else class="text-[10px] text-slate-400">Prioritas utama: Setting Admin UI ini akan meng-override konfigurasi .env</span>

          <button type="button" @click="saveStoragePaths" :disabled="pathSaving" class="px-4 py-2 bg-[#0f766e] text-white rounded-xl text-xs font-bold hover:bg-[#0d6860] transition cursor-pointer disabled:opacity-50">
            {{ pathSaving ? '💾 Menyimpan...' : '💾 Simpan Pengaturan Path Backup' }}
          </button>
        </div>
      </div>
    </div>

        <!-- ============ TAB: RESET SISTEM ============ -->
    <div v-show="activeTab === 'reset'" class="max-w-2xl mx-auto animate-fade-in">
      <div class="card p-6 dark:bg-slate-900 dark:border-slate-800 space-y-4 border-l-4 border-l-red-500">
        <h3 class="font-bold text-xs text-[#2D1B14] dark:text-slate-200 uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1.5">
          ⚠️ Zona Bahaya: Reset Data & Berkas
        </h3>
        <p class="text-xs text-slate-500">
          Aksi ini akan menghapus data di database dan file pada server secara permanen. Pastikan Anda telah mengamankan cadangan data (backup) sebelum melanjutkan.
        </p>

        <div class="space-y-4 pt-2">
          <!-- Reset Type Choice -->
          <div>
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-2 font-bold uppercase">Pilih Cakupan Reset</label>
            <div class="space-y-3">
              <label class="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-[#E8D5C8]/80 dark:border-slate-800 bg-[#FAF9F6]/50 dark:bg-slate-950/20 hover:bg-[#FFE5DA]/20 transition">
                <input type="radio" v-model="resetType" value="transactions" class="mt-1 accent-[#D94A3D]">
                <div>
                  <span class="text-xs font-bold text-[#2D1B14] dark:text-slate-200 block">Opsi A: Reset Transaksi & Media Saja</span>
                  <span class="text-[10px] text-slate-500 block mt-0.5">
                    Menghapus data pemesanan, inquiries/leads, riwayat pembayaran, payroll, dan berkas foto di server.
                    <strong class="text-emerald-600 dark:text-emerald-400 block mt-0.5">Fotografer, Paket Harga, Setelan WA, & Akun Anda tetap aman.</strong>
                  </span>
                </div>
              </label>
              
              <label class="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/20 dark:bg-red-950/5 hover:bg-red-50/40 transition">
                <input type="radio" v-model="resetType" value="full" class="mt-1 accent-red-600">
                <div>
                  <span class="text-xs font-bold text-red-600 dark:text-red-400 block">Opsi B: Hard Reset Total (Bawaan Pabrik)</span>
                  <span class="text-[10px] text-slate-500 block mt-0.5">
                    Menghapus seluruh database dan berkas di server, mengembalikan sistem ke bawaan awal.
                    <strong class="text-red-600 dark:text-red-400 block mt-0.5">Semua data hilang. Akun admin di-reset ke default (username: admin / sandi: admin123).</strong>
                  </span>
                </div>
              </label>
            </div>
          </div>

          <!-- Password verification -->
          <div>
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">MASUKKAN SANDI RESET SISTEM (DARI .env)</label>
            <input type="password" v-model="resetPassword" class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="••••••••" autocomplete="new-password">
          </div>

          <!-- Confirmation text input -->
          <div>
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">KETIK KATA KONFIRMASI: <span class="text-red-600 font-black">RESET SISTEM SEKARANG</span></label>
            <input type="text" v-model="resetConfirmText" class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="Tulis huruf besar semua">
          </div>
        </div>

        <!-- Alerts Message -->
        <div v-if="resetError" class="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 rounded-xl text-xs font-semibold">
          ⚠️ {{ resetError }}
        </div>
        <div v-if="resetSuccess" class="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/40 text-green-600 dark:text-green-400 rounded-xl text-xs font-bold animate-pulse">
          ✓ {{ resetSuccess }}
          <span class="block text-[10px] font-normal text-slate-500 mt-1">Mengalihkan halaman dalam 3 detik...</span>
        </div>

        <div class="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button @click="handleResetSystem" 
            :disabled="resetLoading || resetConfirmText !== 'RESET SISTEM SEKARANG' || !resetPassword"
            class="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-sm">
            <span v-if="resetLoading" class="loading-spinner w-3 h-3 !border-white border-2"></span>
            💥 Jalankan Reset Sistem
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Verifikasi Password untuk Reset Sistem -->
    <div v-if="showResetAuthModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div class="bg-white dark:bg-slate-900 border border-[#E8D5C8]/40 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scale-in">
        <div class="flex items-center gap-2.5 text-red-600 dark:text-red-400">
          <span class="text-xl">🔒</span>
          <h3 class="text-xs font-bold uppercase tracking-wider">Verifikasi Keamanan Akses</h3>
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Anda mencoba mengakses **Reset Sistem (Zona Bahaya)**. Silakan masukkan password akun admin Anda saat ini untuk memverifikasi identitas Anda.
        </p>
        <div>
          <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">PASSWORD ADMIN</label>
          <input type="password" v-model="resetAuthPassword" @keyup.enter="verifyResetAccess" class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="Masukkan password admin Anda" autofocus>
        </div>
        <div v-if="resetAuthError" class="p-2.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 rounded-lg text-xs font-semibold">
          ⚠️ {{ resetAuthError }}
        </div>
        <div class="flex gap-2 pt-2">
          <button @click="closeResetAuthModal" class="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition">
            Batal
          </button>
          <button @click="verifyResetAccess" :disabled="isVerifyingResetAuth" class="flex-1 py-2 bg-[#D94A3D] hover:bg-[#C0392B] text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5">
            <span v-if="isVerifyingResetAuth" class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            Verifikasi & Buka
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Pemotong Gambar (Cropper) -->
    <div v-if="showCropModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div class="bg-white dark:bg-slate-900 border border-[#E8D5C8]/40 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scale-in">
        <div class="flex items-center justify-between pb-2 border-b border-[#E8D5C8]/40 dark:border-slate-800">
          <h3 class="text-xs font-bold uppercase tracking-wider text-[#2D1B14] dark:text-slate-200">Sesuaikan Foto Profil</h3>
          <button @click="closeCropModal" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
        </div>
        
        <!-- Cropper View Area -->
        <div class="max-h-[350px] overflow-hidden flex items-center justify-center bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 relative">
          <img ref="cropImageElement" :src="cropImageSrc" class="max-w-full max-h-[350px] block">
        </div>
        
        <!-- Controls -->
        <div class="flex items-center justify-center gap-4 py-2">
          <button @click="rotateCropper(-90)" class="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5" title="Putar Kiri">
            ↩️ Kiri
          </button>
          <button @click="zoomCropper(0.1)" class="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5" title="Perbesar">
            ➕ Zoom In
          </button>
          <button @click="zoomCropper(-0.1)" class="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5" title="Perkecil">
            ➖ Zoom Out
          </button>
          <button @click="rotateCropper(90)" class="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5" title="Putar Kanan">
            ↪️ Kanan
          </button>
        </div>
        
        <!-- Action buttons -->
        <div class="flex gap-3 pt-2">
          <button @click="closeCropModal" class="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition">
            Batal
          </button>
          <button @click="applyCrop" class="flex-1 py-2 bg-[#D94A3D] hover:bg-[#C0392B] text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-md">
            Terapkan
          </button>
      </div>
    </div>
  </div>

    <!-- 📂 POP-UP DIRECTORY EXPLORER MODAL -->
    <div v-if="showFolderExplorerModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-5 space-y-4 shadow-2xl flex flex-col max-h-[85vh] animate-scale-in">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 flex-shrink-0">
          <div class="flex items-center gap-2">
            <span class="text-xl">📂</span>
            <div>
              <h3 class="font-bold text-sm text-slate-800 dark:text-slate-200">Jelajahi Direktori Server</h3>
              <p class="text-[10px] text-slate-500 dark:text-slate-400">Pilih folder lokasi penyimpanan untuk {{ activePathFieldKeyLabel }}</p>
            </div>
          </div>
          <button type="button" @click="showFolderExplorerModal = false" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold cursor-pointer">✕</button>
        </div>

        <!-- Breadcrumb & Parent Nav -->
        <div class="flex items-center gap-2 bg-slate-100 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono flex-shrink-0 overflow-x-auto">
          <button type="button" v-if="explorerParentPath" @click="fetchDirectories(explorerParentPath)" class="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-50 cursor-pointer flex items-center gap-1">
            ⬆️ Parent
          </button>
          <span class="text-slate-500 dark:text-slate-400 truncate" :title="explorerCurrentPath">Path: {{ explorerCurrentPath }}</span>
        </div>

        <!-- Directory List -->
        <div class="flex-1 overflow-y-auto min-h-[200px] max-h-[300px] border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-950 p-1">
          <div v-if="explorerLoading" class="p-8 text-center text-xs text-slate-400 animate-pulse">
            🔍 Membaca direktori server...
          </div>
          <div v-else-if="!explorerDirectories.length" class="p-6 text-center text-xs text-slate-400">
            Tidak ada subfolder di lokasi ini. Anda dapat membuat folder baru di bawah ini.
          </div>
          <div v-else v-for="dir in explorerDirectories" :key="dir.path" @click="fetchDirectories(dir.path)" class="flex items-center justify-between p-2.5 hover:bg-amber-500/10 dark:hover:bg-slate-900 rounded-lg cursor-pointer transition group">
            <div class="flex items-center gap-2 truncate">
              <span class="text-base">📁</span>
              <span class="text-xs font-semibold text-slate-700 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 truncate">{{ dir.name }}</span>
            </div>
            <button type="button" @click.stop="selectFolder(dir.path)" class="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-700 transition opacity-0 group-hover:opacity-100 cursor-pointer">
              Pilih
            </button>
          </div>
        </div>

        <!-- Create New Folder Form -->
        <div class="bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200/60 dark:border-amber-900/40 flex items-center gap-2 flex-shrink-0">
          <input v-model="newFolderName" placeholder="Nama folder baru (contoh: uploads_2026)" class="input-fancy !text-xs !py-1.5 font-mono dark:bg-slate-900 dark:border-slate-800 flex-1">
          <button type="button" @click="createNewFolder" :disabled="creatingFolder || !(newFolderName || '').trim()" class="px-3 py-1.5 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition disabled:opacity-50 whitespace-nowrap cursor-pointer">
            {{ creatingFolder ? 'Membuat...' : '➕ Buat Folder' }}
          </button>
        </div>

        <!-- Footer Actions -->
        <div class="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
          <button type="button" @click="showFolderExplorerModal = false" class="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
            Batal
          </button>

          <button type="button" @click="selectFolder(explorerCurrentPath)" class="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition cursor-pointer flex items-center gap-1.5 shadow-sm">
            ✅ Pilih Folder Ini ({{ explorerCurrentPath.split('/').pop() || '/' }})
          </button>
        </div>
      </div>
    </div>

    <!-- 🔒 MODAL VERIFIKASI PASSWORD BUKA KUNCI STORAGE -->
    <div v-if="showUnlockStorageModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scale-in">
        <div class="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
          <span class="text-xl">🔒</span>
          <h3 class="text-xs font-bold uppercase tracking-wider">Verifikasi Password Admin</h3>
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Untuk keamanan, masukkan password admin Anda untuk membuka kunci form pengaturan lokasi storage disk & backup.
        </p>
        <div>
          <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">PASSWORD ADMIN</label>
          <input type="password" v-model="unlockStoragePassword" @keyup.enter="verifyUnlockStorageAccess" class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="Masukkan password admin Anda" autofocus>
        </div>
        <div v-if="unlockStorageError" class="p-2.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 rounded-lg text-xs font-semibold">
          ⚠️ {{ unlockStorageError }}
        </div>
        <div class="flex gap-2 pt-2">
          <button type="button" @click="showUnlockStorageModal = false" class="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer">
            Batal
          </button>
          <button type="button" @click="verifyUnlockStorageAccess" :disabled="isVerifyingUnlockStorage" class="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50">
            <span v-if="isVerifyingUnlockStorage" class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            🔓 Buka Kunci
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import 'cropperjs/dist/cropper.css'
import Cropper from 'cropperjs'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const API = '/api/admin'
const activeTab = ref('general')

// ── Cron Job State ──
const cronJobs = ref([
  { id: 'reminder_h3', name: 'Pengingat WA Awal (H-3)', icon: '📅', category: 'notification', description: 'Kirim WA reminder ke Client & Fotografer 3 hari sebelum jadwal pemotretan', schedule: 'Setiap hari jam 09:00 WITA', cron: '0 9 * * *', config_key: 'reminder_h3_time', config_value: '09:00', config_days_key: 'reminder_1_days', config_days_value: 3, config_type: 'time', pendingCount: null, pendingLabel: 'Memuat status...' },
  { id: 'reminder_h1', name: 'Pengingat WA Utama (H-1)', icon: '⏰', category: 'notification', description: 'Kirim WA reminder ke Client & Fotografer 1 hari sebelum jadwal pemotretan', schedule: 'Setiap hari jam 08:00 WITA', cron: '0 8 * * *', config_key: 'reminder_h1_time', config_value: '08:00', config_days_key: 'reminder_2_days', config_days_value: 1, config_type: 'time', pendingCount: null, pendingLabel: 'Memuat status...' },
  { id: 'auto_approve', name: 'Auto-Approve Pengiriman Hasil', icon: '✅', category: 'automation', description: 'Otomatis approve deliverable yang belum dikonfirmasi klien berdasarkan batas jam di form bawah', schedule: 'Setiap jam (Hourly)', cron: '0 * * * *', pendingCount: null, pendingLabel: 'Memuat status...' },
  { id: 'dp_expired', name: 'Pengecekan Quotation Kadaluarsa', icon: '🗓️', category: 'automation', description: 'Tandai inquiry berstatus "quoted" sebagai expired berdasarkan batas hari di form bawah', schedule: 'Setiap hari jam 00:00 WITA', cron: '0 0 * * *', pendingCount: null, pendingLabel: 'Memuat status...' },
  { id: 'payout_run', name: 'Proses Payout Mingguan Fotografer', icon: '💰', category: 'finance', description: 'Buat catatan payout otomatis untuk assignment yang sudah selesai & booking completed dalam 7 hari terakhir', schedule: 'Setiap Minggu jam 20:00 WITA', cron: '0 20 * * 0', pendingCount: null, pendingLabel: 'Memuat status...' },
  { id: 'drive_retention', name: 'Pembersihan Folder Google Drive', icon: '📁', category: 'storage', description: 'Kirim reminder H-14 & H-3 ke klien, transfer ownership, dan trash folder yang sudah expired (3 bulan retensi)', schedule: 'Setiap hari jam 02:00 WITA', cron: '0 2 * * *', config_key: 'drive_retention_hour', config_value: '02:00', config_type: 'time', pendingCount: null, pendingLabel: 'Memuat status...' },
  { id: 'db_maintenance', name: 'Pemeliharaan Database (Maintenance)', icon: '🛠️', category: 'maintenance', description: 'Bersihkan notifikasi lama (>90 hari), token booking kadaluarsa, data proses booking lama (>30 hari), dan optimasi index database', schedule: 'Setiap hari jam 03:00 WITA', cron: '0 3 * * *', config_key: 'db_maintenance_hour', config_value: '03:00', config_type: 'time', pendingCount: null, pendingLabel: 'Memuat status...' }
])
const isCronGridExpanded = ref(false)
const cronLoading = ref(false)
const cronTriggering = reactive({})
const cronTriggerResult = reactive({})
const cronLog = ref('')
const cronLogLines = ref(100)
const cronLogLoading = ref(false)
const cronLogMeta = ref({ lines: 0, total_lines: 0 })
const cronLogContainer = ref(null)

const backupStatus = ref(null)
const backupTriggering = ref(false)
const storageStatus = ref(null)

async function fetchBackupStatus() {
  try {
    const res = await fetch(`${API}/settings/backup-status`, { credentials: 'include' })
    if (res.ok) {
      backupStatus.value = await res.json()
    }
  } catch (e) {
    console.error('fetchBackupStatus error', e)
  }
}

async function fetchStorageStatus() {
  try {
    const res = await fetch(`${API}/settings/storage-status`, { credentials: 'include' })
    if (res.ok) {
      storageStatus.value = await res.json()
    }
  } catch (e) {
    console.error('fetchStorageStatus error', e)
  }
}

// ── Directory Explorer Modal State ──
const showFolderExplorerModal = ref(false)
const activePathFieldKey = ref('')
const explorerCurrentPath = ref('')
const explorerParentPath = ref('')
const explorerDirectories = ref([])
const explorerLoading = ref(false)
const newFolderName = ref('')
const creatingFolder = ref(false)

const activePathFieldKeyLabel = computed(() => {
  if (activePathFieldKey.value === 'upload_path') return 'Path Storage Utama (Disk 1)'
  if (activePathFieldKey.value === 'upload_path_secondary') return 'Path Storage Tambahan (Disk 2)'
  if (activePathFieldKey.value === 'backup_path') return 'Path Backup Database'
  return 'Storage Disk'
})

async function openFolderExplorer(key) {
  activePathFieldKey.value = key
  showFolderExplorerModal.value = true
  const initialPath = pathForm[key] || ''
  await fetchDirectories(initialPath)
}

async function fetchDirectories(targetPath) {
  explorerLoading.value = true
  try {
    const res = await fetch(`${API}/settings/browse-directories?target_path=${encodeURIComponent(targetPath || '')}`, { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      explorerCurrentPath.value = data.current_path
      explorerParentPath.value = data.parent_path
      explorerDirectories.value = data.directories || []
    }
  } catch (e) {
    console.error('fetchDirectories error', e)
  } finally {
    explorerLoading.value = false
  }
}

async function createNewFolder() {
  if (!newFolderName.value.trim() || !explorerCurrentPath.value) return
  creatingFolder.value = true
  try {
    const res = await fetch(`${API}/settings/create-directory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        parent_path: explorerCurrentPath.value,
        folder_name: newFolderName.value.trim()
      })
    })
    const data = await res.json()
    if (res.ok && data.success) {
      newFolderName.value = ''
      await fetchDirectories(data.new_path)
    } else {
      alert(data.error || 'Gagal membuat folder baru')
    }
  } catch (e) {
    alert('Terjadi kesalahan koneksi.')
  } finally {
    creatingFolder.value = false
  }
}

function selectFolder(folderPath) {
  if (activePathFieldKey.value && folderPath) {
    pathForm[activePathFieldKey.value] = folderPath
    verifyPath(activePathFieldKey.value)
  }
  showFolderExplorerModal.value = false
}

const isStoragePathLocked = ref(true)
const showUnlockStorageModal = ref(false)
const unlockStoragePassword = ref('')
const unlockStorageError = ref('')
const isVerifyingUnlockStorage = ref(false)

function toggleLockStorage() {
  if (isStoragePathLocked.value) {
    unlockStoragePassword.value = ''
    unlockStorageError.value = ''
    showUnlockStorageModal.value = true
  } else {
    isStoragePathLocked.value = true
  }
}

async function verifyUnlockStorageAccess() {
  if (!unlockStoragePassword.value) {
    unlockStorageError.value = 'Password wajib diisi'
    return
  }
  isVerifyingUnlockStorage.value = true
  unlockStorageError.value = ''
  try {
    const res = await fetch(`${API}/settings/verify-admin-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ password: unlockStoragePassword.value })
    })
    const data = await res.json()
    if (res.ok && data.success) {
      isStoragePathLocked.value = false
      showUnlockStorageModal.value = false
      unlockStoragePassword.value = ''
    } else {
      unlockStorageError.value = data.error || 'Password admin salah'
    }
  } catch (e) {
    unlockStorageError.value = 'Gagal terhubung ke server'
  } finally {
    isVerifyingUnlockStorage.value = false
  }
}

const pathForm = reactive({
  upload_path: './DATA/uploads',
  upload_path_secondary: '',
  backup_path: './DATA/backups'
})
const pathVerifying = reactive({})
const pathFeedback = reactive({})
const pathSaving = ref(false)
const pathSaved = ref(false)

async function verifyPath(key) {
  const targetPath = (pathForm[key] || '').trim()
  if (!targetPath) return
  pathVerifying[key] = true
  delete pathFeedback[key]
  try {
    const res = await fetch(`${API}/settings/verify-path`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ target_path: targetPath })
    })
    const data = await res.json()
    pathFeedback[key] = data
  } catch (e) {
    pathFeedback[key] = { valid: false, error: e.message }
  } finally {
    pathVerifying[key] = false
  }
}

async function saveStoragePaths() {
  pathSaving.value = true
  try {
    const res = await fetch(`${API}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        upload_path: pathForm.upload_path.trim(),
        upload_path_secondary: pathForm.upload_path_secondary.trim(),
        backup_path: pathForm.backup_path.trim()
      })
    })
    if (res.ok) {
      pathSaved.value = true
      await fetchBackupStatus()
      await fetchStorageStatus()
      setTimeout(() => {
        pathSaved.value = false
        isStoragePathLocked.value = true
      }, 2000)
    } else {
      const d = await res.json()
      alert(d.error || 'Gagal menyimpan path storage')
    }
  } catch (e) {
    alert('Terjadi kesalahan koneksi.')
  } finally {
    pathSaving.value = false
  }
}

async function triggerBackupNow() {
  if (backupTriggering.value) return
  if (!await confirm('Jalankan backup database instan sekarang? File .db cadangan terbaru akan langsung dibuat.')) return
  backupTriggering.value = true
  try {
    const res = await fetch(`${API}/cron/trigger/backup_db`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    })
    const data = await res.json()
    if (res.ok) {
      alert('⚡ Backup database berhasil dibuat: ' + (data.message || 'Snapshot .db tersimpan'))
      await fetchBackupStatus()
    } else {
      alert('⚠️ Gagal backup: ' + (data.error || 'Terjadi kesalahan'))
    }
  } catch (e) {
    alert('⚠️ Error koneksi: ' + e.message)
  } finally {
    backupTriggering.value = false
  }
}

function timeAgo(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000)
  if (seconds < 60) return 'Baru saja'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} menit lalu`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  return `${days} hari lalu`
}

function formatDateClean(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

async function fetchCronStatus() {
  cronLoading.value = true
  try {
    const res = await fetch(`${API}/cron/status`, { credentials: 'include' })
    const data = await res.json()
    if (res.ok) {
      cronJobs.value = data.jobs || []
    }
    await fetchBackupStatus()
    await fetchStorageStatus()
  } catch (e) {
    console.error('fetchCronStatus error', e)
  } finally {
    cronLoading.value = false
  }
}

async function fetchCronLog() {
  cronLogLoading.value = true
  try {
    const res = await fetch(`${API}/cron/log?lines=${cronLogLines.value}`, { credentials: 'include' })
    const data = await res.json()
    if (res.ok) {
      cronLog.value = data.log || ''
      cronLogMeta.value = { lines: data.lines || 0, total_lines: data.total_lines || 0 }
    }
  } catch (e) {
    cronLog.value = ''
  } finally {
    cronLogLoading.value = false
  }
}

async function updateCronConfig(key, val) {
  try {
    const res = await fetch(`${API}/cron/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ key, value: val })
    })
    if (res.ok) {
      await fetchCronStatus()
    }
  } catch (e) {
    console.error('Failed to update cron config:', e)
  }
}

async function triggerCronJob(jobId) {
  if (cronTriggering[jobId]) return
  cronTriggering[jobId] = true
  delete cronTriggerResult[jobId]
  try {
    const res = await fetch(`${API}/cron/trigger/${jobId}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    })
    const data = await res.json()
    cronTriggerResult[jobId] = {
      success: res.ok && (data.success !== false),
      message: data.message || data.error || (res.ok ? 'Selesai' : 'Gagal')
    }
    // Refresh status & log after trigger
    await fetchCronStatus()
    await fetchCronLog()
    setTimeout(() => { delete cronTriggerResult[jobId] }, 8000)
  } catch (e) {
    cronTriggerResult[jobId] = { success: false, message: e.message }
  } finally {
    cronTriggering[jobId] = false
  }
}

function scrollCronLogToBottom() {
  nextTick(() => {
    const el = document.querySelector('.cron-log-pre')
    if (el) el.scrollTop = el.scrollHeight
  })
}

// ── Google Drive Smart Hybrid OAuth State ──
const driveOAuthConnected = ref(false)
const driveOAuthEmail = ref('')
const driveStorageUsedGB = ref('0.0')
const driveStorageTotalGB = ref('-')
const driveStoragePercent = ref(0)

async function fetchDriveOAuthStatus() {
  try {
    const res = await fetch(`${API}/settings/drive-status`, { credentials: 'include' })
    const data = await res.json()
    if (res.ok) {
      driveOAuthConnected.value = data.oauth_connected || false
      driveOAuthEmail.value = data.oauth_email || ''
      driveStorageUsedGB.value = data.storage_used_gb || '0.0'
      driveStorageTotalGB.value = data.storage_total_gb || '-'
      driveStoragePercent.value = data.storage_percent || 0
    }
  } catch (e) {
    console.warn('fetchDriveOAuthStatus error', e)
  }
}

async function initiateOAuthLogin() {
  try {
    const res = await fetch(`${API}/auth/google`, { credentials: 'include' })
    const data = await res.json()
    if (res.ok && data.url) {
      // Open Google OAuth consent page in dedicated popup window
      const popup = window.open(data.url, 'google_oauth_popup', 'width=600,height=750')
      
      // Continuous background poll while waiting for OAuth completion
      const pollTimer = setInterval(async () => {
        await fetchDriveOAuthStatus()
        if (driveOAuthConnected.value) {
          clearInterval(pollTimer)
          await fetchSettings()
        } else if (popup && popup.closed) {
          // Final check when user closes popup window
          setTimeout(async () => {
            clearInterval(pollTimer)
            await fetchDriveOAuthStatus()
            await fetchSettings()
          }, 800)
        }
      }, 1000)
    } else {
      alert(data.error || 'Gagal memulai otorisasi OAuth. Konfigurasi Client ID & Client Secret di Settings.')
    }
  } catch (e) {
    alert('Error OAuth: ' + e.message)
  }
}

async function disconnectOAuth() {
  if (!await confirm('Apakah Anda yakin ingin memutuskan tautan akun Google Drive Gmail Studio ini?')) return
  try {
    const res = await fetch(`${API}/settings/drive-disconnect`, {
      method: 'POST',
      credentials: 'include'
    })
    const data = await res.json()
    if (res.ok && data.success) {
      alert(data.message || '✓ Tautan akun Google Drive berhasil diputuskan.')
      await fetchDriveOAuthStatus()
      await fetchSettings()
    } else {
      alert(data.error || 'Gagal memutuskan tautan.')
    }
  } catch (e) {
    alert('Error: ' + e.message)
  }
}

const showOAuthModal = ref(false)
const showMasterFolderModal = ref(false)
const showPortfolioFolderModal = ref(false)

function openOAuthModal() {
  form.google_oauth_client_id = savedOAuthClientId.value || ''
  form.google_oauth_client_secret = savedOAuthClientSecret.value || ''
  oauthVerified.value = true
  oauthVerifyMsg.value = ''
  oauthVerifyError.value = ''
  showOAuthModal.value = true
}

function openMasterFolderModal() {
  masterFolderIdInput.value = driveFolderId.value || ''
  showMasterFolderModal.value = true
}

function openPortfolioFolderModal() {
  portfolioFolderInput.value = portfolioFolderId.value || ''
  showPortfolioFolderModal.value = true
}

const savedOAuthClientId = ref('')
const savedOAuthClientSecret = ref('')
const isOAuthFullyConfigured = computed(() => {
  return !!(savedOAuthClientId.value && savedOAuthClientSecret.value)
})
const isDriveFullyConfigured = computed(() => {
  return !!(savedOAuthClientId.value && savedOAuthClientSecret.value && driveOAuthConnected.value && driveStatus.value === 'ok')
})

const showOAuthCredentialsForm = ref(false)
const oauthCredentialsSaving = ref(false)
const oauthCredentialsSaved = ref(false)

const redirectUriCopied = ref(false)
const currentRedirectUri = computed(() => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/admin/auth/google/callback`
  }
  return 'http://localhost:8081/api/admin/auth/google/callback'
})

function copyRedirectUri() {
  navigator.clipboard.writeText(currentRedirectUri.value)
  redirectUriCopied.value = true
  setTimeout(() => { redirectUriCopied.value = false }, 3000)
}

const showSecretText = ref(false)
const oauthVerifying = ref(false)
const oauthVerified = ref(false)
const oauthVerifyMsg = ref('')
const oauthVerifyError = ref('')

async function verifyOAuthCredentials() {
  const clientId = (form.google_oauth_client_id || '').trim()
  const clientSecret = (form.google_oauth_client_secret || '').trim()

  if (!clientId || clientId.length < 10) {
    alert('⚠️ GOOGLE OAUTH CLIENT ID wajib diisi dengan format valid.')
    return false
  }
  if (!clientSecret || clientSecret.length < 5) {
    alert('⚠️ GOOGLE OAUTH CLIENT SECRET wajib diisi! Tidak dapat verifikasi tanpa Client Secret.')
    return false
  }
  if (clientSecret.includes('•') || clientSecret.includes('...')) {
    alert('⚠️ Client Secret tidak valid! Terdeteksi karakter simbol titik (•••••). Mohon salin Client Secret ASLI dari Google Cloud Console (biasanya diawali dengan GOCSPX-).')
    return false
  }

  oauthVerifying.value = true
  oauthVerifyMsg.value = ''
  oauthVerifyError.value = ''
  try {
    const res = await fetch(`${API}/settings/verify-oauth-credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        google_oauth_client_id: clientId,
        google_oauth_client_secret: clientSecret
      })
    })
    const d = await res.json()
    if (res.ok && d.success) {
      oauthVerified.value = true
      oauthVerifyMsg.value = '✅ Google API: Kredensial Valid & Cocok 100%! Silakan klik tombol "💾 2. Simpan Kredensial" untuk menyimpan.'
      return true
    } else {
      oauthVerified.value = false
      oauthVerifyError.value = d.error || '❌ Google Menolak Kredensial Ini.'
      return false
    }
  } catch (e) {
    oauthVerified.value = false
    oauthVerifyError.value = '❌ Kesalahan Koneksi: ' + e.message
    return false
  } finally {
    oauthVerifying.value = false
  }
}

async function saveOAuthCredentials() {
  const clientId = (form.google_oauth_client_id || '').trim()
  const clientSecret = (form.google_oauth_client_secret || '').trim()

  if (!oauthVerified.value) {
    const isOk = await verifyOAuthCredentials()
    if (!isOk) return
  }

  oauthCredentialsSaving.value = true
  try {
    const res = await fetch(`${API}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        google_oauth_client_id: clientId,
        google_oauth_client_secret: clientSecret
      })
    })
    if (res.ok) {
      savedOAuthClientId.value = clientId
      savedOAuthClientSecret.value = clientSecret
      oauthCredentialsSaved.value = true
      showOAuthCredentialsForm.value = false
      showOAuthModal.value = false
      alert('💾 Kredensial Google OAuth berhasil disimpan!')
      setTimeout(() => { oauthCredentialsSaved.value = false }, 3000)
    } else {
      const d = await res.json()
      alert(d.error || 'Gagal menyimpan OAuth Client ID/Secret.')
    }
  } catch (e) {
    console.error('saveOAuthCredentials error', e)
    alert('Terjadi kesalahan koneksi saat menyimpan.')
  } finally {
    oauthCredentialsSaving.value = false
  }
}

// ── Google Drive State ──
const driveStatus = ref('idle')
const driveFolderName = ref('')
const driveFolderId = ref('')
const driveMasterUrl = ref('')
const driveErrorMsg = ref('')
const driveServiceAccountEmail = ref('')
const driveEmailLoading = ref(false)
const botEmailCopied = ref(false)
const showMigrasiGuide = ref(false)
const masterFolderIdInput = ref('')
const masterFolderIdSaving = ref(false)
const masterFolderIdSaved = ref(false)

const saUploading = ref(false)
const saUploadMsg = ref('')
const saUploadError = ref('')
const apiKeySaving = ref(false)
const apiKeySaved = ref(false)

const showSaUploadForm = ref(false)
const showFolderEditForm = ref(false)
const showApiKeyEditForm = ref(false)

async function handleSaFileUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return
  saUploading.value = true
  saUploadMsg.value = ''
  saUploadError.value = ''
  try {
    const text = await file.text()
    let jsonContent
    try {
      jsonContent = JSON.parse(text)
    } catch (parseErr) {
      throw new Error('File tidak valid. Harap unggah file JSON yang didownload dari Google Cloud Console.')
    }
    if (!jsonContent.client_email || !jsonContent.private_key) {
      throw new Error('File JSON tidak valid — harus memiliki field client_email dan private_key.')
    }
    const res = await fetch(`${API}/settings/drive-upload-sa`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ json_content: jsonContent })
    })
    const data = await res.json()
    if (res.ok && data.success) {
      showSaUploadForm.value = false
      saUploadMsg.value = `✓ Berhasil di-upload! Email bot: ${data.service_account_email}`
      driveServiceAccountEmail.value = data.service_account_email
      if (masterFolderIdInput.value) {
        await testDriveConnection()
      }
      setTimeout(() => { saUploadMsg.value = '' }, 5000)
    } else {
      saUploadError.value = data.error || 'Gagal menyimpan file service account'
    }
  } catch (e) {
    saUploadError.value = e.message || 'Gagal membaca file JSON'
  } finally {
    saUploading.value = false
    event.target.value = ''
  }
}

async function saveDriveApiKey() {
  apiKeySaving.value = true
  apiKeySaved.value = false
  try {
    const res = await fetch(`${API}/settings`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ google_drive_api_key: (form.google_drive_api_key || '').trim() })
    })
    if (res.ok) {
      apiKeySaved.value = true
      showApiKeyEditForm.value = false
      setTimeout(() => { apiKeySaved.value = false }, 3000)
    }
  } catch (e) {
    console.error('saveDriveApiKey error', e)
  } finally {
    apiKeySaving.value = false
  }
}

// Load email bot otomatis (tanpa perlu cek koneksi)
async function loadBotEmail() {
  if (driveServiceAccountEmail.value) return // sudah ada, skip
  driveEmailLoading.value = true
  try {
    const res = await fetch(`${API}/settings/drive-test`, { credentials: 'include' })
    const data = await res.json()
    if (data.service_account_email) driveServiceAccountEmail.value = data.service_account_email
  } catch (e) {
    // silent fail — email tetap kosong
  } finally {
    driveEmailLoading.value = false
  }
}

async function copyBotEmail() {
  if (!driveServiceAccountEmail.value) return
  try {
    await navigator.clipboard.writeText(driveServiceAccountEmail.value)
    botEmailCopied.value = true
    setTimeout(() => { botEmailCopied.value = false }, 2500)
  } catch (e) {
    // fallback untuk browser yang tidak support clipboard API
    const el = document.createElement('textarea')
    el.value = driveServiceAccountEmail.value
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
    botEmailCopied.value = true
    setTimeout(() => { botEmailCopied.value = false }, 2500)
  }
}

const portfolioFolderId = ref('')
const portfolioFolderName = ref('Master Portofolio')
const portfolioMasterUrl = ref('')
const portfolioFolderInput = ref('')
const showPortfolioFolderEditForm = ref(false)
const portfolioFolderSaving = ref(false)
const portfolioFolderSaved = ref(false)

async function testDriveConnection() {
  driveStatus.value = 'loading'
  driveFolderName.value = ''
  driveFolderId.value = ''
  driveMasterUrl.value = ''
  driveErrorMsg.value = ''
  try {
    const res = await fetch(`${API}/settings/drive-test`, { credentials: 'include' })
    const data = await res.json()
    if (data.service_account_email) driveServiceAccountEmail.value = data.service_account_email
    if (res.ok && data.ok) {
      driveStatus.value = 'ok'
      driveFolderName.value = data.folder_name || ''
      driveFolderId.value = data.folder_id || ''
      driveMasterUrl.value = `https://drive.google.com/drive/folders/${data.folder_id}`

      if (data.portfolio_folder_id) {
        portfolioFolderId.value = data.portfolio_folder_id
        portfolioFolderInput.value = data.portfolio_folder_id
        portfolioFolderName.value = data.portfolio_folder_name || 'Master Portofolio'
        portfolioMasterUrl.value = data.portfolio_folder_url || `https://drive.google.com/drive/folders/${data.portfolio_folder_id}`
      }
    } else {
      driveStatus.value = 'error'
      driveErrorMsg.value = data.error || 'Koneksi gagal'
    }
  } catch (e) {
    driveStatus.value = 'error'
    driveErrorMsg.value = e.message || 'Network error'
  }
}

async function saveMasterFolderId() {
  if (!masterFolderIdInput.value.trim()) return
  masterFolderIdSaving.value = true
  masterFolderIdSaved.value = false
  driveErrorMsg.value = ''
  try {
    // Simpan via settings API (key: google_drive_master_folder_id)
    const res = await fetch(`${API}/settings`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ google_drive_master_folder_id: masterFolderIdInput.value.trim() })
    })
    if (res.ok) {
      masterFolderIdSaved.value = true
      driveFolderId.value = masterFolderIdInput.value.trim()
      showFolderEditForm.value = false
      // Auto-test setelah save
      await testDriveConnection()
      await fetchDriveOAuthStatus()
      await fetchSettings()
      setTimeout(() => { masterFolderIdSaved.value = false }, 3000)
    } else {
      const errData = await res.json()
      driveErrorMsg.value = errData.error || 'Gagal menyimpan ID Folder'
    }
  } catch (e) {
    driveErrorMsg.value = e.message
  } finally {
    masterFolderIdSaving.value = false
  }
}

async function savePortfolioFolderId() {
  if (!portfolioFolderInput.value.trim()) return
  portfolioFolderSaving.value = true
  portfolioFolderSaved.value = false
  try {
    const res = await fetch(`${API}/settings`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ google_drive_portfolio_folder_id: portfolioFolderInput.value.trim() })
    })
    if (res.ok) {
      portfolioFolderSaved.value = true
      portfolioFolderId.value = portfolioFolderInput.value.trim()
      portfolioMasterUrl.value = `https://drive.google.com/drive/folders/${portfolioFolderInput.value.trim()}`
      showPortfolioFolderEditForm.value = false
      await testDriveConnection()
      await fetchSettings()
      setTimeout(() => { portfolioFolderSaved.value = false }, 3000)
    }
  } catch (e) {
    console.error(e)
  } finally {
    portfolioFolderSaving.value = false
  }
}

async function saveMasterFolderIdModal() {
  await saveMasterFolderId()
  if (driveStatus.value === 'ok') {
    showMasterFolderModal.value = false
  }
}

async function savePortfolioFolderIdModal() {
  await savePortfolioFolderId()
  showPortfolioFolderModal.value = false
}

const tabs = [
  { key: 'general', label: 'Umum' },
  { key: 'bank', label: 'Rekening Bank' },
  { key: 'operational', label: '⚙️ Operasional' },
  { key: 'wa', label: 'WA Templates' },
  { key: 'security', label: 'Keamanan & Profil' },
  { key: 'branding', label: 'Branding & SEO' },
  { key: 'cron', label: '🖥️ Sistem & Storage' },
  { key: 'reset', label: 'Reset Sistem' },
]

const form = reactive({
  companyName: '',
  companyPhone: '',
  companyAddress: '',
  adminPhone: '',
  dp_percentage: 50,
  upload_deadline_days: 1,
  auto_approve_hours: 24,
  dp_expired_days: 7,
  reminder_h1_time: '09:00',
  max_photos_per_fg_per_day: 5,
  invoice_prefix: 'INV',
  session_timeout_minutes: 1440,
  portfolio_limit: 50,
  enable_freelance_portal: '0',
  fg_auto_rotate_tokens_enabled: '1',
  app_url: '',
  drive_retention_months: 3,
  drive_auto_trash_enabled: 1,
  google_drive_api_key: '',
  google_oauth_client_id: '',
  google_oauth_client_secret: '',
  bank_accounts: [],
  supported_cities: [],
  wa_templates: {},
  logo_url: '',
  favicon_url: '',
  seo_domain: '',
  seo_title: '',
  seo_description: '',
  seo_keywords: '',
  seo_og_image: '',
  google_site_verification: ''
})

const enableFreelancePortalBool = computed({
  get: () => String(form.enable_freelance_portal) === '1' || form.enable_freelance_portal === true,
  set: (val) => { form.enable_freelance_portal = val ? '1' : '0' }
})

const fgAutoRotateTokensBool = computed({
  get: () => String(form.fg_auto_rotate_tokens_enabled) === '1' || form.fg_auto_rotate_tokens_enabled === true,
  set: (val) => { form.fg_auto_rotate_tokens_enabled = val ? '1' : '0' }
})

const newCityInput = ref('')

function addCity() {
  const val = newCityInput.value.trim()
  if (val && !form.supported_cities.includes(val)) {
    form.supported_cities.push(val)
  }
  newCityInput.value = ''
}

function removeCity(idx) {
  form.supported_cities.splice(idx, 1)
}

const profileForm = reactive({
  name: '',
  username: ''
})
const profileError = ref('')
const profileSuccess = ref('')
const activeForm = ref(null)

const avatarInput = ref(null)
const selectedFileAvatar = ref(null)
const selectedAvatarPreview = ref(null)
const isUploadingAvatar = ref(false)
const isDeletingAvatar = ref(false)

const generalSaved = ref(false)
const bankSaved = ref(false)
const waSaved = ref(false)
const seoSaved = ref(false)

const templateLabels = {
  client_new_inquiry: { label: 'Chat Inquiry Client ke Admin (WA Client)', desc: 'Pesan otomatis dari Client ke Admin saat Client mengeklik tombol "Hubungi Admin via WA" setelah mengisi formulir inquiry.', placeholders: '{company_name}, {client_name}, {graduation_date}, {location}, {university}' },
  admin_new_inquiry: { label: 'Log System Inquiry Baru (Internal Admin)', desc: 'Format notifikasi sistem internal untuk rekap inquiry masuk.', placeholders: '{company_name}, {client_name}, {graduation_date}, {location}, {university}, {package_name}, {notes}, {client_phone}' },
  client_auto_book: { label: 'Reservasi Booking (ke Client)', desc: 'Pesan konfirmasi reservasi & tagihan DP otomatis saat client memilih paket.', placeholders: '{company_name}, {client_name}, {package_name}, {total_price}, {dp_amount}, {bank_list}, {admin_phone}, {booking_url}' },
  client_booking_token: { label: 'Link Reservasi Booking (ke Client)', desc: 'Pesan kirim link reservasi saat admin membuat link khusus untuk client.', placeholders: '{company_name}, {client_name}, {booking_url}' },
  client_quotation: { label: 'Penawaran / Quotation (ke Client)', desc: 'Pesan rincian penawaran resmi dari Admin ke Client.', placeholders: '{company_name}, {client_name}, {graduation_date}, {package_name}, {total_price}, {dp_amount}, {bank_list}, {admin_phone}' },
  client_dp_uploaded: { label: 'Notifikasi Bukti DP (ke Admin)', desc: 'Notifikasi laporan saat client mengirimkan bukti transfer DP.', placeholders: '{client_name}, {booking_id}, {admin_url}' },
  client_dp_verified: { label: 'DP Terverifikasi (ke Client)', desc: 'Notifikasi saat Admin menyetujui verifikasi pembayaran DP Client.', placeholders: '{company_name}, {client_name}, {booking_id}, {contract_url}, {tracking_url}, {admin_phone}' },
  client_balance_uploaded: { label: 'Notifikasi Bukti Pelunasan (ke Admin)', desc: 'Notifikasi laporan saat client mengunggah bukti pelunasan.', placeholders: '{client_name}, {booking_id}, {admin_url}' },
  client_fully_paid: { label: 'Pelunasan Terverifikasi (ke Client)', desc: 'Notifikasi saat Admin menyetujui verifikasi pembayaran pelunasan Client.', placeholders: '{company_name}, {client_name}, {booking_id}, {tracking_url}' },
  fg_assigned: { label: 'Job Pemotretan Baru (ke Fotografer)', desc: 'Pesan tugas pemotretan baru yang dikirimkan ke Fotografer / FG.', placeholders: '{company_name}, {client_name}, {location}, {university}, {shooting_time}, {duration_hours}, {portal_url}' },
  fg_confirm_job: { label: 'Konfirmasi Terima Job (ke Admin)', desc: 'Notifikasi laporan saat FG menyetujui job pemotretan.', placeholders: '{fg_name}, {client_name}, {booking_id}' },
  reminder_h3_fg: { label: 'Pengingat H-3 Pemotretan (ke Fotografer)', desc: 'Pengingat otomatis H-3 jadwal pemotretan untuk Fotografer.', placeholders: '{company_name}, {client_name}, {location}, {shooting_time}, {brief}' },
  reminder_h3_client: { label: 'Pengingat H-3 Pemotretan (ke Client)', desc: 'Pengingat otomatis H-3 jadwal pemotretan untuk Client.', placeholders: '{company_name}, {client_name}, {shooting_time}, {location}, {fg_name}, {fg_phone}' },
  fg_file_submitted: { label: 'Setor File Foto FG (ke Admin)', desc: 'Notifikasi saat FG telah mengonfirmasi penyerahan file foto.', placeholders: '{fg_name}, {client_name}, {booking_id}' },
  fg_upload_ready: { label: 'Foto FG Siap QC (ke Admin)', desc: 'Notifikasi saat FG mengunggah foto ke staging.', placeholders: '{fg_name}, {company_name}, {admin_url}, {assignment_id}' },
  delivery_ready: { label: 'Foto Wisuda Siap (ke Client)', desc: 'Pesan penyerahan link Google Drive & PIN privasi ke Client.', placeholders: '{company_name}, {tracking_url}, {password}, {admin_phone}' },
  balance_due: { label: 'Tagihan Pelunasan (ke Client)', desc: 'Pesan penagihan sisa pembayaran pelunasan ke Client.', placeholders: '{company_name}, {balance_amount}, {bank_list}, {admin_phone}' },
  fg_payout_sent: { label: 'Payout / Gaji Dikirim (ke Fotografer)', desc: 'Notifikasi konfirmasi transfer gaji / pencairan komisi ke Fotografer.', placeholders: '{company_name}, {period_start}, {period_end}, {total_payout}, {slip_url}' },
  client_rekap: { label: 'Rekap Akses Dokumentasi & Invoice (ke Client)', desc: 'Pesan ringkasan invoice, link tracking bertoken, PIN privasi, & link master folder Google Drive yang dikirimkan Admin ke Client.', placeholders: '{company_name}, {client_name}, {invoice_no}, {university}, {package_name}, {tracking_url}, {password}, {drive_parent_url}' }
}

const passwordForm = reactive({ current: '', newPass: '', confirm: '' })
const passError = ref('')
const passSuccess = ref('')

const selectedFile = ref(null)
const selectedLogoPreview = ref(null)
const isUploadingLogo = ref(false)
const isDeletingLogo = ref(false)
const logoError = ref('')
const logoSaved = ref(false)
const fileInput = ref(null)

const selectedFaviconFile = ref(null)
const selectedFaviconPreview = ref(null)
const isUploadingFavicon = ref(false)
const isDeletingFavicon = ref(false)
const faviconError = ref('')
const faviconSaved = ref(false)
const faviconInput = ref(null)

const showResetAuthModal = ref(false)
const resetAuthPassword = ref('')
const resetAuthError = ref('')
const isVerifyingResetAuth = ref(false)

const showCropModal = ref(false)
const cropImageSrc = ref('')
const cropImageElement = ref(null)
let cropperInstance = null

const selectedOgFile = ref(null)
const ogFileInput = ref(null)

function onOgFileSelect(e) {
  const f = e.target.files[0]
  if (f) selectedOgFile.value = f
}

async function uploadOgImage() {
  if (!selectedOgFile.value) return
  try {
    const formData = new FormData()
    formData.append('og_image', selectedOgFile.value)

    const res = await fetch(`${API}/settings/og-image`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    })
    const d = await res.json()
    if (res.ok) {
      form.seo_og_image = d.og_image_url
      alert('✓ Banner Social Media berhasil diunggah!')
      selectedOgFile.value = null
      if (ogFileInput.value) ogFileInput.value.value = ''
    } else {
      alert(d.error || 'Gagal mengunggah banner')
    }
  } catch (err) {
    alert('Terjadi kesalahan koneksi saat mengunggah banner')
  }
}

// ── SMTP Email Gateway State & Functions ──
const smtpForm = reactive({
  smtp_host: '',
  smtp_port: 587,
  smtp_user: '',
  smtp_pass: '',
  smtp_secure: '0',
  smtp_from_name: 'Wisuda Official Studio',
  smtp_from_email: ''
})
const showSmtpPassword = ref(false)
const smtpVerifying = ref(false)
const smtpVerifyMsg = ref('')
const smtpVerifyError = ref('')
const showSmtpTestModal = ref(false)
const smtpTestEmailInput = ref('')
const smtpTestSending = ref(false)
const smtpTestResultMsg = ref('')
const smtpTestResultError = ref('')
const smtpSaving = ref(false)
const smtpSaved = ref(false)

async function verifySmtpConnection() {
  smtpVerifying.value = true
  smtpVerifyMsg.value = ''
  smtpVerifyError.value = ''
  try {
    const res = await fetch(`${API}/settings/verify-smtp`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(smtpForm)
    })
    const data = await res.json()
    if (res.ok && data.ok) {
      smtpVerifyMsg.value = data.message || '✓ Terhubung ke server SMTP'
    } else {
      smtpVerifyError.value = data.error || 'Gagal verifikasi koneksi SMTP'
    }
  } catch (e) {
    smtpVerifyError.value = e.message || 'Network error'
  } finally {
    smtpVerifying.value = false
  }
}

function openSmtpTestModal() {
  smtpTestEmailInput.value = smtpForm.smtp_from_email || smtpForm.smtp_user || ''
  smtpTestResultMsg.value = ''
  smtpTestResultError.value = ''
  showSmtpTestModal.value = true
}

async function sendSmtpTestEmail() {
  if (!smtpTestEmailInput.value.trim()) return
  smtpTestSending.value = true
  smtpTestResultMsg.value = ''
  smtpTestResultError.value = ''
  try {
    const res = await fetch(`${API}/settings/send-test-email`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...smtpForm,
        target_email: smtpTestEmailInput.value.trim()
      })
    })
    const data = await res.json()
    if (res.ok && data.ok) {
      smtpTestResultMsg.value = data.message || '✓ Email uji coba berhasil dikirim!'
    } else {
      smtpTestResultError.value = data.error || 'Gagal mengirim email uji coba'
    }
  } catch (e) {
    smtpTestResultError.value = e.message || 'Network error'
  } finally {
    smtpTestSending.value = false
  }
}

async function saveSmtpSettings() {
  smtpSaving.value = true
  smtpSaved.value = false
  try {
    const res = await fetch(`${API}/settings`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        smtp_host: smtpForm.smtp_host,
        smtp_port: smtpForm.smtp_port,
        smtp_user: smtpForm.smtp_user,
        smtp_pass: smtpForm.smtp_pass,
        smtp_secure: smtpForm.smtp_secure,
        smtp_from_name: smtpForm.smtp_from_name,
        smtp_from_email: smtpForm.smtp_from_email
      })
    })
    if (res.ok) {
      smtpSaved.value = true
      setTimeout(() => { smtpSaved.value = false }, 3000)
    }
  } catch (e) {
    console.error('saveSmtpSettings error', e)
  } finally {
    smtpSaving.value = false
  }
}

async function fetchSettings() {
  try {
    const res = await fetch(`${API}/settings`, { credentials: 'include' })
    const data = await res.json()
    const s = data.settings || data || {}

    smtpForm.smtp_host = s.smtp_host || ''
    smtpForm.smtp_port = s.smtp_port !== undefined ? Number(s.smtp_port) : 587
    smtpForm.smtp_user = s.smtp_user || ''
    smtpForm.smtp_pass = s.smtp_pass || ''
    smtpForm.smtp_secure = s.smtp_secure !== undefined ? String(s.smtp_secure) : '0'
    smtpForm.smtp_from_name = s.smtp_from_name || 'Wisuda Official Studio'
    smtpForm.smtp_from_email = s.smtp_from_email || ''

    form.companyName = s.companyName || s.company_name || form.companyName
    form.companyPhone = s.companyPhone || s.company_phone || ''
    form.companyAddress = s.companyAddress || s.company_address || ''
    form.adminPhone = s.adminPhone || s.admin_phone || ''
    form.dp_percentage = s.dp_percentage || 50
    form.upload_deadline_days = s.upload_deadline_days || 1
    form.auto_approve_hours = s.auto_approve_hours || 24
    form.dp_expired_days = s.dp_expired_days || 7
    form.max_photos_per_fg_per_day = s.max_photos_per_fg_per_day || 5
    form.drive_retention_months = s.drive_retention_months !== undefined ? Number(s.drive_retention_months) : 3
    form.drive_auto_trash_enabled = s.drive_auto_trash_enabled !== undefined ? Number(s.drive_auto_trash_enabled) : 1
    form.invoice_prefix = s.invoice_prefix || 'INV'
    form.session_timeout_minutes = s.session_timeout_minutes || 1440
    form.portfolio_limit = s.portfolio_limit || 50
    form.enable_freelance_portal = s.enable_freelance_portal !== undefined ? String(s.enable_freelance_portal) : '0'
    form.fg_auto_rotate_tokens_enabled = s.fg_auto_rotate_tokens_enabled !== undefined ? String(s.fg_auto_rotate_tokens_enabled) : '1'
    form.app_url = s.app_url || s.domain_url || window.location.origin
    form.bank_accounts = Array.isArray(s.bank_accounts) ? s.bank_accounts : []
    form.supported_cities = Array.isArray(s.supported_cities) ? s.supported_cities : []
    form.logo_url = s.logo_url || ''
    form.favicon_url = s.favicon_url || ''
    form.wa_templates = data.wa_templates || {}

    form.seo_domain = s.seo_domain || ''
    form.seo_title = s.seo_title || ''
    form.seo_description = s.seo_description || ''
    form.seo_keywords = s.seo_keywords || ''
    form.seo_og_image = s.seo_og_image || ''
    form.google_site_verification = s.google_site_verification || ''
    form.google_drive_api_key = s.google_drive_api_key || ''
    form.google_oauth_client_id = s.google_oauth_client_id || ''
    form.google_oauth_client_secret = s.google_oauth_client_secret || ''
    savedOAuthClientId.value = s.google_oauth_client_id || ''
    savedOAuthClientSecret.value = s.google_oauth_client_secret || ''
    // Load Master Folder ID ke input field Drive & auto-verify
    if (s.google_drive_master_folder_id) {
      masterFolderIdInput.value = s.google_drive_master_folder_id
      driveFolderId.value = s.google_drive_master_folder_id
      driveMasterUrl.value = `https://drive.google.com/drive/folders/${s.google_drive_master_folder_id}`
      testDriveConnection()
    }
    if (s.google_drive_portfolio_folder_id) {
      portfolioFolderInput.value = s.google_drive_portfolio_folder_id
      portfolioFolderId.value = s.google_drive_portfolio_folder_id
      portfolioMasterUrl.value = `https://drive.google.com/drive/folders/${s.google_drive_portfolio_folder_id}`
    }
    pathForm.upload_path = s.upload_path || s.uploadPath || pathForm.upload_path
    pathForm.upload_path_secondary = s.upload_path_secondary || ''
    pathForm.backup_path = s.backup_path || s.backupPath || pathForm.backup_path

    if (s.storage_needs_setup) {
      isStoragePathLocked.value = false
    } else {
      isStoragePathLocked.value = true
    }
  } catch {}
}

async function fetchProfile() {
  try {
    const res = await fetch(`${API}/profile`, { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      if (data.user) {
        profileForm.name = data.user.name || ''
        profileForm.username = data.user.username || ''
      }
    }
  } catch {}
}

async function saveProfile() {
  profileError.value = ''
  profileSuccess.value = ''
  try {
    const res = await fetch(`${API}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: profileForm.name, username: profileForm.username })
    })
    const d = await res.json()
    if (!res.ok) {
      profileError.value = d.error || 'Gagal menyimpan profil'
      return
    }
    profileSuccess.value = '✓ Profil admin berhasil diperbarui!'
    await authStore.checkAuth()
    setTimeout(() => profileSuccess.value = '', 3000)
  } catch {
    profileError.value = 'Gagal memperbarui profil'
  }
}

function buildPayload() {
  return {
    companyName: form.companyName,
    companyPhone: form.companyPhone,
    companyAddress: form.companyAddress,
    adminPhone: form.adminPhone,
    dp_percentage: Number(form.dp_percentage),
    upload_deadline_days: Number(form.upload_deadline_days),
    auto_approve_hours: Number(form.auto_approve_hours),
    dp_expired_days: Number(form.dp_expired_days),
    max_photos_per_fg_per_day: Number(form.max_photos_per_fg_per_day),
    invoice_prefix: form.invoice_prefix,
    session_timeout_minutes: Number(form.session_timeout_minutes),
    portfolio_limit: Number(form.portfolio_limit || 50),
    enable_freelance_portal: form.enable_freelance_portal,
    fg_auto_rotate_tokens_enabled: form.fg_auto_rotate_tokens_enabled,
    app_url: form.app_url,
    drive_retention_months: Number(form.drive_retention_months),
    drive_auto_trash_enabled: Number(form.drive_auto_trash_enabled),
    bank_accounts: form.bank_accounts,
    supported_cities: form.supported_cities
  }
}

async function saveGeneral() {
  try {
    const res = await fetch(`${API}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(buildPayload())
    })
    const d = await res.json()
    if (!res.ok) {
      const msg = d.error || (d.details ? d.details.map(e => e.msg).join(', ') : 'Gagal menyimpan konfigurasi');
      alert(`⚠️ ${msg}`);
      return;
    }
    generalSaved.value = true
    await authStore.fetchSettings()
    await fetchSettings()
    setTimeout(() => generalSaved.value = false, 3000)
  } catch (err) {
    alert('⚠️ Gagal terhubung ke server');
  }
}

function addBank() {
  form.bank_accounts.push({ bank: '', norek: '', atas_nama: '' })
}

function removeBank(idx) {
  form.bank_accounts.splice(idx, 1)
  saveBankAccounts()
}

async function saveBankAccounts() {
  try {
    await fetch(`${API}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ bank_accounts: form.bank_accounts })
    })
    bankSaved.value = true
    setTimeout(() => bankSaved.value = false, 3000)
  } catch {}
}

async function saveWaTemplates() {
  try {
    await fetch(`${API}/settings/wa-templates`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ templates: form.wa_templates })
    })
    waSaved.value = true
    setTimeout(() => waSaved.value = false, 3000)
  } catch {}
}

async function saveSeo() {
  try {
    const res = await fetch(`${API}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        seo_domain: form.seo_domain,
        seo_title: form.seo_title,
        seo_description: form.seo_description,
        seo_keywords: form.seo_keywords,
        google_site_verification: form.google_site_verification
      })
    })
    const d = await res.json()
    if (!res.ok) {
      alert(`⚠️ ${d.error || 'Gagal menyimpan pengaturan SEO'}`);
      return;
    }
    seoSaved.value = true
    await authStore.fetchSettings()
    await fetchSettings()
    setTimeout(() => seoSaved.value = false, 3000)
  } catch (err) {
    alert('⚠️ Gagal terhubung ke server');
  }
}

async function resetSingleWaTemplate(key) {
  const label = templateLabels[key]?.label || key
  if (!await confirm(`Reset template '${label}' ke draf default bawaan sistem saat ini?`)) return
  try {
    const res = await fetch(`${API}/settings/reset-wa-templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ key })
    })
    const d = await res.json()
    if (res.ok && d.wa_templates) {
      form.wa_templates = d.wa_templates
      waSaved.value = true
      setTimeout(() => waSaved.value = false, 3000)
      alert(`✓ Template '${label}' berhasil direset ke draf bawaan sistem!`)
    } else {
      alert(d.error || 'Gagal mereset template')
    }
  } catch (e) {
    alert('Gagal terhubung ke server')
  }
}

async function resetAllWaTemplates() {
  if (!await confirm('Apakah Anda yakin ingin mereset SELURUH template WA ke draf default bawaan sistem saat ini? Seluruh kustomisasi pesan akan dikembalikan ke draf awal.')) return
  try {
    const res = await fetch(`${API}/settings/reset-wa-templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    })
    const d = await res.json()
    if (res.ok && d.wa_templates) {
      form.wa_templates = d.wa_templates
      waSaved.value = true
      setTimeout(() => waSaved.value = false, 3000)
      alert('✓ Seluruh template WA berhasil direset ke draf bawaan sistem!')
    } else {
      alert(d.error || 'Gagal mereset template')
    }
  } catch (e) {
    alert('Gagal terhubung ke server')
  }
}

async function resetCategoryDefaults(category) {
  const catLabel = category === 'general' ? 'Umum' : (category === 'seo' ? 'Branding & SEO' : 'Semua')
  if (!await confirm(`Apakah Anda yakin ingin mereset Pengaturan ${catLabel} ke default bawaan sistem?`)) return
  try {
    const res = await fetch(`${API}/settings/reset-defaults`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ category })
    })
    const d = await res.json()
    if (res.ok) {
      await authStore.fetchSettings()
      await fetchSettings()
      alert(`✓ Pengaturan ${catLabel} berhasil direset ke default sistem!`)
    } else {
      alert(d.error || 'Gagal mereset pengaturan')
    }
  } catch (e) {
    alert('Gagal terhubung ke server')
  }
}

async function savePassword() {
  passError.value = ''
  passSuccess.value = ''
  if (passwordForm.newPass !== passwordForm.confirm) {
    passError.value = 'Konfirmasi password tidak cocok'
    return
  }
  if (passwordForm.newPass.length < 6) {
    passError.value = 'Password minimal 6 karakter'
    return
  }

  try {
    const res = await fetch(`${API}/settings/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ current_password: passwordForm.current, new_password: passwordForm.newPass })
    })
    const d = await res.json()
    if (!res.ok) {
      passError.value = d.error || 'Gagal'
      return
    }
    passSuccess.value = '✓ Password berhasil diubah!'
    passwordForm.current = ''
    passwordForm.newPass = ''
    passwordForm.confirm = ''
    setTimeout(() => passSuccess.value = '', 3000)
  } catch {
    passError.value = 'Gagal koneksi server'
  }
}

function onFileChange(e) {
  const file = e.target.files[0] || null
  selectedFile.value = file
  logoError.value = ''
  if (file) {
    selectedLogoPreview.value = URL.createObjectURL(file)
  } else {
    selectedLogoPreview.value = null
  }
}

function clearSelectedLogo() {
  selectedFile.value = null
  selectedLogoPreview.value = null
  if (fileInput.value) fileInput.value.value = ''
  logoError.value = ''
}

async function uploadLogo() {
  if (!selectedFile.value) return
  logoError.value = ''
  logoSaved.value = false
  isUploadingLogo.value = true
  const reader = new FileReader()
  reader.onload = async (e) => {
    const base64Data = e.target.result
    try {
      const res = await fetch(`${API}/settings/logo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ logo_data: base64Data })
      })
      const d = await res.json()
      if (!res.ok) {
        logoError.value = d.error || 'Gagal'
        isUploadingLogo.value = false
        return
      }
      form.logo_url = d.logo_url
      logoSaved.value = true
      selectedFile.value = null
      selectedLogoPreview.value = null
      if (fileInput.value) fileInput.value.value = ''
      await authStore.fetchSettings()
      setTimeout(() => logoSaved.value = false, 3000)
    } catch {
      logoError.value = 'Gagal upload'
    } finally {
      isUploadingLogo.value = false
    }
  }
  reader.readAsDataURL(selectedFile.value)
}

async function deleteLogo() {
  if (!await confirm('Apakah Anda yakin ingin menghapus logo ini? Tampilan web akan kembali menggunakan inisial default.')) return
  logoError.value = ''
  logoSaved.value = false
  isDeletingLogo.value = true
  try {
    const res = await fetch(`${API}/settings/logo`, {
      method: 'DELETE',
      credentials: 'include'
    })
    const d = await res.json()
    if (!res.ok) {
      logoError.value = d.error || 'Gagal menghapus logo'
      isDeletingLogo.value = false
      return
    }
    form.logo_url = ''
    selectedLogoPreview.value = null
    await authStore.fetchSettings()
    alert('✓ Logo berhasil dihapus')
  } catch (err) {
    logoError.value = 'Gagal menghubungi server'
  } finally {
    isDeletingLogo.value = false
  }
}

function onFaviconChange(e) {
  const file = e.target.files[0] || null
  selectedFaviconFile.value = file
  faviconError.value = ''
  if (file) {
    selectedFaviconPreview.value = URL.createObjectURL(file)
  } else {
    selectedFaviconPreview.value = null
  }
}

function clearSelectedFavicon() {
  selectedFaviconFile.value = null
  selectedFaviconPreview.value = null
  if (faviconInput.value) faviconInput.value.value = ''
  faviconError.value = ''
}

async function uploadFavicon() {
  if (!selectedFaviconFile.value) return
  faviconError.value = ''
  faviconSaved.value = false
  isUploadingFavicon.value = true
  const reader = new FileReader()
  reader.onload = async (e) => {
    const base64Data = e.target.result
    try {
      const res = await fetch(`${API}/settings/favicon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ favicon_data: base64Data })
      })
      const d = await res.json()
      if (!res.ok) {
        faviconError.value = d.error || 'Gagal'
        isUploadingFavicon.value = false
        return
      }
      form.favicon_url = d.favicon_url
      faviconSaved.value = true
      selectedFaviconFile.value = null
      selectedFaviconPreview.value = null
      if (faviconInput.value) faviconInput.value.value = ''
      await authStore.fetchSettings()
      setTimeout(() => faviconSaved.value = false, 3000)
    } catch {
      faviconError.value = 'Gagal upload favicon'
    } finally {
      isUploadingFavicon.value = false
    }
  }
  reader.readAsDataURL(selectedFaviconFile.value)
}

async function deleteFavicon() {
  if (!await confirm('Apakah Anda yakin ingin me-reset favicon ini? Tampilan favicon akan kembali mengikuti logo platform.')) return
  faviconError.value = ''
  faviconSaved.value = false
  isDeletingFavicon.value = true
  try {
    const res = await fetch(`${API}/settings/favicon`, {
      method: 'DELETE',
      credentials: 'include'
    })
    const d = await res.json()
    if (!res.ok) {
      faviconError.value = d.error || 'Gagal mereset favicon'
      isDeletingFavicon.value = false
      return
    }
    form.favicon_url = d.favicon_url || ''
    selectedFaviconPreview.value = null
    await authStore.fetchSettings()
    alert('✓ Favicon berhasil di-reset')
  } catch (err) {
    faviconError.value = 'Gagal menghubungi server'
  } finally {
    isDeletingFavicon.value = false
  }
}

const resetType = ref('transactions')
const resetPassword = ref('')
const resetConfirmText = ref('')
const resetLoading = ref(false)
const resetError = ref('')
const resetSuccess = ref('')

watch(() => route.query.tab, (newTab) => {
  if (newTab) {
    activeTab.value = newTab
  }
})

async function handleResetSystem() {
  if (resetConfirmText.value !== 'RESET SISTEM SEKARANG') {
    resetError.value = 'Teks konfirmasi tidak cocok.'
    return
  }
  
  resetLoading.value = true
  resetError.value = ''
  resetSuccess.value = ''
  
  try {
    const res = await fetch(`${API}/system/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        password: resetPassword.value,
        type: resetType.value
      })
    })
    const d = await res.json()
    if (!res.ok) {
      resetError.value = d.error || 'Gagal melakukan reset sistem.'
      return
    }
    resetSuccess.value = d.message || 'Reset berhasil!'
    resetPassword.value = ''
    resetConfirmText.value = ''
    // Logout and redirect to login page after 3 seconds
    setTimeout(async () => {
      await authStore.logout()
      router.push('/admin/login')
    }, 3000)
  } catch (err) {
    resetError.value = 'Gagal terhubung ke server.'
  } finally {
    resetLoading.value = false
  }
}

function selectTab(tabKey) {
  if (tabKey === 'reset') {
    resetAuthPassword.value = ''
    resetAuthError.value = ''
    showResetAuthModal.value = true
  } else {
    activeTab.value = tabKey
    // Auto-test Drive connection when switching to drive tab
    if (tabKey === 'drive' && driveStatus.value === 'idle') {
      testDriveConnection()
    }
    // Auto-load cron data when switching to cron tab
    if (tabKey === 'cron') {
      fetchCronStatus()
      fetchCronLog()
    }
  }
}

function closeResetAuthModal() {
  showResetAuthModal.value = false
  resetAuthPassword.value = ''
  resetAuthError.value = ''
}

async function verifyResetAccess() {
  if (!resetAuthPassword.value) {
    resetAuthError.value = 'Password wajib diisi'
    return
  }
  resetAuthError.value = ''
  isVerifyingResetAuth.value = true
  try {
    const res = await fetch(`${API}/settings/verify-admin-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ password: resetAuthPassword.value })
    })
    const d = await res.json()
    if (!res.ok) {
      resetAuthError.value = d.error || 'Password admin salah'
      return
    }
    showResetAuthModal.value = false
    activeTab.value = 'reset'
  } catch (err) {
    resetAuthError.value = 'Gagal terhubung ke server'
  } finally {
    isVerifyingResetAuth.value = false
  }
}

function onAvatarFileChange(e) {
  const file = e.target.files[0] || null
  if (file) {
    cropImageSrc.value = URL.createObjectURL(file)
    showCropModal.value = true
    nextTick(() => {
      initCropper()
    })
  }
}

function initCropper() {
  if (cropperInstance) {
    cropperInstance.destroy()
  }
  if (!cropImageElement.value) return
  cropperInstance = new Cropper(cropImageElement.value, {
    aspectRatio: 1,
    viewMode: 1,
    dragMode: 'move',
    autoCropArea: 1,
    restore: false,
    guides: false,
    center: false,
    highlight: false,
    cropBoxMovable: false,
    cropBoxResizable: false,
    toggleDragModeOnDblclick: false
  })
}

function closeCropModal() {
  showCropModal.value = false
  cropImageSrc.value = ''
  if (cropperInstance) {
    cropperInstance.destroy()
    cropperInstance = null
  }
  if (avatarInput.value) avatarInput.value.value = ''
}

function zoomCropper(ratio) {
  if (cropperInstance) {
    cropperInstance.zoom(ratio)
  }
}

function rotateCropper(degree) {
  if (cropperInstance) {
    cropperInstance.rotate(degree)
  }
}

function applyCrop() {
  if (!cropperInstance) return
  
  const canvas = cropperInstance.getCroppedCanvas({
    width: 256,
    height: 256,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'high'
  })
  
  const base64Data = canvas.toDataURL('image/png')
  selectedAvatarPreview.value = base64Data
  
  const byteString = atob(base64Data.split(',')[1])
  const mimeString = base64Data.split(',')[0].split(':')[1].split(';')[0]
  const ab = new ArrayBuffer(byteString.length)
  const ia = new Uint8Array(ab)
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i)
  }
  const blob = new Blob([ab], { type: mimeString })
  selectedFileAvatar.value = new File([blob], 'avatar.png', { type: mimeString })
  
  closeCropModal()
}

function clearSelectedAvatar() {
  selectedFileAvatar.value = null
  selectedAvatarPreview.value = null
  if (avatarInput.value) avatarInput.value.value = ''
}

async function uploadAvatar() {
  if (!selectedFileAvatar.value) return
  isUploadingAvatar.value = true
  const reader = new FileReader()
  reader.onload = async (e) => {
    const base64Data = e.target.result
    try {
      const res = await fetch(`${API}/profile/avatar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ avatar_data: base64Data })
      })
      const d = await res.json()
      if (!res.ok) {
        alert(d.error || 'Gagal menyimpan foto profil')
        return
      }
      selectedFileAvatar.value = null
      selectedAvatarPreview.value = null
      if (avatarInput.value) avatarInput.value.value = ''
      await authStore.checkAuth()
      alert('✓ Foto profil berhasil diperbarui!')
    } catch {
      alert('Gagal mengunggah foto profil')
    } finally {
      isUploadingAvatar.value = false
    }
  }
  reader.readAsDataURL(selectedFileAvatar.value)
}

async function deleteAvatar() {
  if (!await confirm('Apakah Anda yakin ingin menghapus foto profil?')) return
  isDeletingAvatar.value = true
  try {
    const res = await fetch(`${API}/profile/avatar`, {
      method: 'DELETE',
      credentials: 'include'
    })
    const d = await res.json()
    if (!res.ok) {
      alert(d.error || 'Gagal menghapus foto profil')
      return
    }
    selectedFileAvatar.value = null
    selectedAvatarPreview.value = null
    if (avatarInput.value) avatarInput.value.value = ''
    await authStore.checkAuth()
    alert('✓ Foto profil berhasil dihapus!')
  } catch {
    alert('Gagal menghapus foto profil')
  } finally {
    isDeletingAvatar.value = false
  }
}

function toggleEditProfile() {
  if (activeForm.value === 'profile') {
    activeForm.value = null
  } else {
    activeForm.value = 'profile'
    scrollToForm()
  }
}

function toggleEditPassword() {
  if (activeForm.value === 'password') {
    activeForm.value = null
  } else {
    activeForm.value = 'password'
    scrollToForm()
  }
}

function scrollToForm() {
  nextTick(() => {
    const el = document.getElementById('security-form-container')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  })
}

onMounted(() => {
  fetchSettings()
  fetchProfile()
  loadBotEmail()
  fetchDriveOAuthStatus() // Load email bot otomatis tanpa perlu klik "Cek Koneksi"
  fetchStorageStatus()

  // Listen for BroadcastChannel message from OAuth popup window
  try {
    const channel = new BroadcastChannel('wisuda_oauth_channel')
    channel.onmessage = (event) => {
      if (event.data === 'GOOGLE_OAUTH_SUCCESS') {
        fetchDriveOAuthStatus()
        fetchStorageStatus()
        fetchSettings()
      }
    }
  } catch (e) {}

  // Listen for postMessage from OAuth popup window
  window.addEventListener('message', (event) => {
    if (event.data === 'GOOGLE_OAUTH_SUCCESS' || (event.data && event.data.type === 'GOOGLE_OAUTH_SUCCESS')) {
      fetchDriveOAuthStatus()
      fetchStorageStatus()
      fetchSettings()
    }
  })

  if (route.query.tab) {
    const mappedTab = route.query.tab === 'seo' ? 'branding' : (route.query.tab === 'drive' ? 'cron' : route.query.tab)
    activeTab.value = mappedTab
    if (mappedTab === 'cron') {
      fetchCronStatus()
      fetchCronLog()
      fetchStorageStatus()
    }
  }
})
</script>

<style>
/* Custom style to make cropper crop-box look circular */
.cropper-view-box,
.cropper-face {
  border-radius: 50%;
}

/* Slide Fade Transition for Settings Profile Form */
.slide-fade-enter-active {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-fade-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0 !important;
  transform: translateX(45px) scale(0.95) !important;
  max-width: 0 !important;
  margin-left: -24px !important;
  overflow: hidden !important;
}
.slide-fade-enter-to,
.slide-fade-leave-from {
  opacity: 1 !important;
  transform: translateX(0) scale(1) !important;
  max-width: 448px !important;
  overflow: hidden !important;
}
</style>
