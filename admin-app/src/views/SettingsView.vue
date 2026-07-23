<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between mb-2">
      <h2 class="text-xl font-bold text-[#2D1B14] dark:text-slate-200 tracking-tight">Pengaturan Sistem</h2>
    </div>

    <!-- Tabs Header -->
    <div class="flex gap-1 border-b border-[#E8D5C8]/80 dark:border-slate-800 mb-6 overflow-x-auto">
      <button v-for="tab in tabs" :key="tab.key" @click="activeTab = tab.key"
        class="px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition border-b-2 -mb-[1px]"
        :class="activeTab === tab.key ? 'text-[#D94A3D] border-[#D94A3D] dark:text-amber-400 dark:border-amber-400' : 'text-[#8A7A72] border-transparent hover:text-[#2D1B14] dark:hover:text-slate-300'">
        {{ tab.label }}
      </button>
    </div>

    <!-- ============ TAB: GENERAL ============ -->
    <div v-show="activeTab === 'general'" class="max-w-2xl animate-fade-in">
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
          </div>
          <div>
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">DEADLINE SETOR FOTO FG (HARI)</label>
            <input v-model.number="form.upload_deadline_days" type="number" min="1" max="30" class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
          </div>
          <div>
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">BATAS WAKTU AUTO-APPROVE CLIENT (JAM)</label>
            <input v-model.number="form.auto_approve_hours" type="number" min="1" max="168" class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
          </div>
          <div>
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">MAKSIMAL PENGAMBILAN SESI / FG / HARI</label>
            <input v-model.number="form.max_photos_per_fg_per_day" type="number" min="1" max="10" class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
          </div>
          <div>
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">PREFIX NO. INVOICE</label>
            <input v-model="form.invoice_prefix" placeholder="INV" class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
          </div>
          <div>
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">JAM OPERASIONAL</label>
            <input v-model="form.operational_hours" placeholder="08:00 - 20:00 WITA" class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
          </div>
          <div>
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">SESSION TIMEOUT ADMIN (MENIT)</label>
            <input v-model.number="form.session_timeout_minutes" type="number" min="60" max="1440" class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
          </div>
          <div>
            <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">LIMIT FOTO PORTOFOLIO PUBLIK</label>
            <input v-model.number="form.portfolio_limit" type="number" min="1" max="10000" class="input-fancy !text-xs !py-2.5 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" placeholder="50">
            <p class="text-[9px] text-slate-400 mt-1">Jumlah maksimal foto yang dirender di galeri portofolio publik</p>
          </div>
        </div>
        <div class="flex items-center gap-3 pt-2">
          <button @click="saveGeneral" class="px-5 py-2.5 bg-[#D94A3D] hover:bg-[#C0392B] text-white rounded-xl text-xs font-semibold transition">Simpan Konfigurasi</button>
          <span v-if="generalSaved" class="text-green-600 dark:text-green-400 text-xs font-bold animate-pulse">✓ Pengaturan disimpan</span>
        </div>
      </div>
    </div>

    <!-- ============ TAB: BANK ACCOUNTS ============ -->
    <div v-show="activeTab === 'bank'" class="max-w-2xl animate-fade-in">
      <div class="card p-6 dark:bg-slate-900 dark:border-slate-800 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-xs text-[#2D1B14] dark:text-slate-200 uppercase tracking-wider">Rekening Bank Pembayaran</h3>
          <button @click="addBank" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1">+ Tambah Rekening</button>
        </div>
        <div v-if="!form.bank_accounts || form.bank_accounts.length === 0" class="text-slate-400 text-xs text-center py-8">
          Belum ada rekening terdaftar. Klik "+ Tambah Rekening" untuk menambahkan.
        </div>
        <div v-for="(bank, i) in form.bank_accounts" :key="i" class="flex items-end gap-2.5 p-3 rounded-xl bg-[#FAF9F6] dark:bg-slate-950 border border-[#E8D5C8]/60 dark:border-slate-800">
          <div class="flex-1 grid grid-cols-3 gap-2">
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
          <button @click="removeBank(i)" class="text-red-500 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 p-2 rounded-xl transition flex-shrink-0 mb-[1px]" title="Hapus Rekening">
            <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
        <div class="flex items-center gap-3 pt-2">
          <button @click="saveBankAccounts" class="px-5 py-2.5 bg-[#D94A3D] hover:bg-[#C0392B] text-white rounded-xl text-xs font-semibold transition">Simpan Rekening</button>
          <span v-if="bankSaved" class="text-green-600 dark:text-green-400 text-xs font-bold animate-pulse">✓ Rekening disimpan</span>
        </div>
      </div>
    </div>

    <!-- ============ TAB: WA TEMPLATES ============ -->
    <div v-show="activeTab === 'wa'" class="max-w-4xl animate-fade-in">
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

    <!-- ============ TAB: SECURITY & PROFILE ============ -->
    <div v-show="activeTab === 'security'" class="max-w-md animate-fade-in space-y-6">
      <!-- Admin Profile Settings Card -->
      <div class="card p-6 dark:bg-slate-900 dark:border-slate-800 space-y-4">
        <h3 class="font-bold text-xs text-[#2D1B14] dark:text-slate-200 uppercase tracking-wider mb-2">Profil Pengguna Admin</h3>
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
        <button @click="saveProfile" class="w-full py-2.5 bg-[#1A1A2E] text-[#C59B63] hover:bg-[#2A2A4E] rounded-xl text-xs font-semibold transition shadow-md">Simpan Profil Admin</button>
      </div>

      <!-- Password Change Card -->
      <div class="card p-6 dark:bg-slate-900 dark:border-slate-800 space-y-4">
        <h3 class="font-bold text-xs text-[#2D1B14] dark:text-slate-200 uppercase tracking-wider mb-2">Ganti Password Admin</h3>
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
        <button @click="savePassword" class="w-full py-2.5 bg-[#D94A3D] hover:bg-[#C0392B] text-white rounded-xl text-xs font-semibold transition">Ubah Password Admin</button>
      </div>
    </div>

    <!-- ============ TAB: BRANDING ============ -->
    <div v-show="activeTab === 'branding'" class="max-w-md animate-fade-in">
      <div class="card p-6 dark:bg-slate-900 dark:border-slate-800 space-y-4">
        <h3 class="font-bold text-xs text-[#2D1B14] dark:text-slate-200 uppercase tracking-wider mb-2">Logo Platform / Vendor</h3>
        <div v-if="form.logo_url" class="mb-3 flex justify-center p-4 bg-[#FAF6F0]/30 border border-[#E8D5C8]/40 dark:bg-slate-950 dark:border-slate-800 rounded-xl">
          <img :src="form.logo_url" class="max-h-20 object-contain">
        </div>
        <div>
          <label class="block text-[10px] text-[#8A7A72] dark:text-slate-400 mb-1.5 font-bold">UNGGAH FILE LOGO BARU (PNG/JPG)</label>
          <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/webp" @change="onFileChange" class="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-[#2D1B14] dark:file:bg-slate-800 file:text-white file:cursor-pointer cursor-pointer">
        </div>
        <div v-if="logoError" class="text-red-500 font-semibold text-xs bg-red-50 px-3 py-2 rounded-lg border border-red-200">{{ logoError }}</div>
        <div v-if="logoSaved" class="text-green-600 font-semibold text-xs bg-green-50 px-3 py-2 rounded-lg border border-green-200">✓ Logo berhasil diunggah!</div>
        <div class="flex gap-2">
          <button @click="uploadLogo" :disabled="!selectedFile" class="w-full py-2.5 bg-[#D94A3D] hover:bg-[#C0392B] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold transition">Upload & Pasang Logo</button>
        </div>
      </div>
    </div>

    <!-- ============ TAB: SEO & META TAG ============ -->
    <div v-show="activeTab === 'seo'" class="max-w-2xl animate-fade-in">
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

        <div class="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button @click="saveSeo" class="px-5 py-2.5 bg-[#D94A3D] hover:bg-[#C0392B] text-white rounded-xl text-xs font-semibold transition">Simpan Pengaturan SEO</button>
          <span v-if="seoSaved" class="text-green-600 dark:text-green-400 text-xs font-bold animate-pulse">✓ Pengaturan SEO disimpan</span>
        </div>
      </div>
    </div>
    <!-- ============ TAB: RESET SISTEM ============ -->
    <div v-show="activeTab === 'reset'" class="max-w-2xl animate-fade-in">
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
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const API = '/api/admin'
const activeTab = ref('general')

const tabs = [
  { key: 'general', label: 'Umum' },
  { key: 'bank', label: 'Rekening Bank' },
  { key: 'wa', label: 'WA Templates' },
  { key: 'security', label: 'Keamanan & Profil' },
  { key: 'branding', label: 'Branding Logo' },
  { key: 'seo', label: 'SEO & Meta Tag' },
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
  max_photos_per_fg_per_day: 5,
  invoice_prefix: 'INV',
  operational_hours: '',
  session_timeout_minutes: 1440,
  portfolio_limit: 50,
  bank_accounts: [],
  wa_templates: {},
  logo_url: '',
  seo_domain: '',
  seo_title: '',
  seo_description: '',
  seo_keywords: '',
  seo_og_image: '',
  google_site_verification: ''
})

const profileForm = reactive({
  name: '',
  username: ''
})
const profileError = ref('')
const profileSuccess = ref('')

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
  client_rekap: { label: 'Rekap Akses Dokumentasi & Invoice (ke Client)', desc: 'Pesan ringkasan invoice, link tracking bertoken, & PIN privasi yang dikirimkan Admin ke Client.', placeholders: '{company_name}, {client_name}, {invoice_no}, {university}, {package_name}, {tracking_url}, {password}' }
}

const passwordForm = reactive({ current: '', newPass: '', confirm: '' })
const passError = ref('')
const passSuccess = ref('')

const selectedFile = ref(null)
const logoError = ref('')
const logoSaved = ref(false)
const fileInput = ref(null)

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

async function fetchSettings() {
  try {
    const res = await fetch(`${API}/settings`, { credentials: 'include' })
    const data = await res.json()
    const s = data.settings || data || {}

    form.companyName = s.companyName || s.company_name || form.companyName
    form.companyPhone = s.companyPhone || s.company_phone || ''
    form.companyAddress = s.companyAddress || s.company_address || ''
    form.adminPhone = s.adminPhone || s.admin_phone || ''
    form.dp_percentage = s.dp_percentage || 50
    form.upload_deadline_days = s.upload_deadline_days || 1
    form.auto_approve_hours = s.auto_approve_hours || 24
    form.max_photos_per_fg_per_day = s.max_photos_per_fg_per_day || 5
    form.invoice_prefix = s.invoice_prefix || 'INV'
    form.operational_hours = s.operational_hours || ''
    form.session_timeout_minutes = s.session_timeout_minutes || 1440
    form.portfolio_limit = s.portfolio_limit || 50
    form.bank_accounts = Array.isArray(s.bank_accounts) ? s.bank_accounts : []
    form.logo_url = s.logo_url || ''
    form.wa_templates = data.wa_templates || {}

    form.seo_domain = s.seo_domain || ''
    form.seo_title = s.seo_title || ''
    form.seo_description = s.seo_description || ''
    form.seo_keywords = s.seo_keywords || ''
    form.seo_og_image = s.seo_og_image || ''
    form.google_site_verification = s.google_site_verification || ''
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
    max_photos_per_fg_per_day: Number(form.max_photos_per_fg_per_day),
    invoice_prefix: form.invoice_prefix,
    operational_hours: form.operational_hours,
    session_timeout_minutes: Number(form.session_timeout_minutes),
    portfolio_limit: Number(form.portfolio_limit || 50),
    bank_accounts: form.bank_accounts
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

async function resetSingleWaTemplate(key) {
  const label = templateLabels[key]?.label || key
  if (!confirm(`Reset template '${label}' ke draf default bawaan sistem saat ini?`)) return
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
  if (!confirm('Apakah Anda yakin ingin mereset SELURUH template WA ke draf default bawaan sistem saat ini? Seluruh kustomisasi pesan akan dikembalikan ke draf awal.')) return
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
  selectedFile.value = e.target.files[0] || null
  logoError.value = ''
}

async function uploadLogo() {
  if (!selectedFile.value) return
  logoError.value = ''
  logoSaved.value = false
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
        return
      }
      form.logo_url = d.logo_url
      logoSaved.value = true
      selectedFile.value = null
      if (fileInput.value) fileInput.value.value = ''
      await authStore.fetchSettings()
      setTimeout(() => logoSaved.value = false, 3000)
    } catch {
      logoError.value = 'Gagal upload'
    }
  }
  reader.readAsDataURL(selectedFile.value)
}

const resetType = ref('transactions')
const resetPassword = ref('')
const resetConfirmText = ref('')
const resetLoading = ref(false)
const resetError = ref('')
const resetSuccess = ref('')

import { useRouter } from 'vue-router'
const router = useRouter()

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

onMounted(() => {
  fetchSettings()
  fetchProfile()
})
</script>
