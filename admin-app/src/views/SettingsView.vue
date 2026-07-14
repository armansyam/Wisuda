<template>
  <div>
    <h2 class="font-serif text-2xl font-bold text-white mb-6">Settings</h2>

    <!-- Tab bar -->
    <div class="flex gap-1 border-b border-gray-700/50 mb-6 overflow-x-auto">
      <button v-for="t in tabs" :key="t.key"
        @click="activeTab = t.key"
        class="px-4 py-2.5 text-sm font-medium whitespace-nowrap transition border-b-2 -mb-[1px]"
        :class="activeTab === t.key ? 'text-amber-400 border-amber-400' : 'text-gray-500 border-transparent hover:text-gray-300'">
        {{ t.label }}
      </button>
    </div>

    <!-- ============ TAB: GENERAL ============ -->
    <div v-show="activeTab === 'general'" class="max-w-2xl">
      <div class="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6 space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-gray-400 mb-1">Nama Perusahaan</label>
            <input v-model="form.companyName" class="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">No. Telepon Perusahaan</label>
            <input v-model="form.companyPhone" class="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm">
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm text-gray-400 mb-1">Alamat</label>
            <input v-model="form.companyAddress" class="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">No. WA Admin</label>
            <input v-model="form.adminPhone" placeholder="628xxxxxxxxxx" class="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm">
            <p class="text-xs text-gray-600 mt-0.5">Format 62, tanpa + atau spasi</p>
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">DP (%)</label>
            <input v-model.number="form.dp_percentage" type="number" min="10" max="100" class="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Deadline Upload (hari)</label>
            <input v-model.number="form.upload_deadline_days" type="number" min="1" max="30" class="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Auto-approve (jam)</label>
            <input v-model.number="form.auto_approve_hours" type="number" min="1" max="168" class="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Maks Foto/FG/Hari</label>
            <input v-model.number="form.max_photos_per_fg_per_day" type="number" min="1" max="10" class="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Prefix Invoice</label>
            <input v-model="form.invoice_prefix" placeholder="INV-2026" class="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Jam Operasional</label>
            <input v-model="form.operational_hours" placeholder="08:00 - 20:00 WITA" class="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Session Timeout (menit)</label>
            <input v-model.number="form.session_timeout_minutes" type="number" min="60" max="1440" class="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm">
          </div>
        </div>
        <div class="flex items-center gap-3 pt-2">
          <button @click="saveGeneral" class="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition text-sm font-medium">Simpan</button>
          <span v-if="saved" class="text-green-400 text-sm">✓ Tersimpan</span>
        </div>
      </div>
    </div>

    <!-- ============ TAB: BANK ACCOUNTS ============ -->
    <div v-show="activeTab === 'bank'" class="max-w-2xl">
      <div class="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="font-semibold text-white">Rekening Bank</h3>
          <button @click="addBank" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition">+ Tambah Rekening</button>
        </div>
        <div v-if="!form.bank_accounts?.length" class="text-gray-500 text-sm text-center py-6">Belum ada rekening. Klik "Tambah Rekening"</div>
        <div v-for="(bank, i) in form.bank_accounts" :key="i" class="flex items-end gap-3 bg-gray-900/50 border border-gray-700/30 rounded-lg p-3">
          <div class="flex-1 grid grid-cols-3 gap-2">
            <div>
              <label class="block text-xs text-gray-400 mb-1">Bank</label>
              <input v-model="bank.bank" placeholder="BCA/Mandiri/BNI" class="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded px-2 py-1.5 text-sm">
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">No. Rekening</label>
              <input v-model="bank.norek" placeholder="1234567890" class="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded px-2 py-1.5 text-sm">
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">Atas Nama</label>
              <input v-model="bank.atas_nama" placeholder="Budi Santoso" class="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded px-2 py-1.5 text-sm">
            </div>
          </div>
          <button @click="removeBank(i)" class="text-red-400 hover:text-red-300 transition p-1 flex-shrink-0" title="Hapus">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
        <div class="flex items-center gap-3 pt-2">
          <button @click="saveBankAccounts" class="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition text-sm font-medium">Simpan Rekening</button>
          <span v-if="bankSaved" class="text-green-400 text-sm">✓ Tersimpan</span>
        </div>
      </div>
    </div>

    <!-- ============ TAB: WA TEMPLATES ============ -->
    <div v-show="activeTab === 'wa'" class="max-w-3xl">
      <div class="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6">
        <div class="max-h-[70vh] overflow-y-auto space-y-3">
          <div v-for="(tmpl, key) in form.wa_templates" :key="key" class="border border-gray-700/30 rounded-lg">
            <label class="block text-xs text-gray-400 px-3 pt-2 capitalize">{{ key.replace(/_/g,' ') }}</label>
            <textarea v-model="form.wa_templates[key]" rows="3" class="w-full bg-gray-800 border-0 text-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-xs"></textarea>
          </div>
        </div>
        <div class="flex items-center gap-3 pt-4">
          <button @click="saveWaTemplates" class="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition text-sm font-medium">Simpan WA Templates</button>
          <span v-if="waSaved" class="text-green-400 text-sm">✓ Tersimpan</span>
        </div>
      </div>
    </div>

    <!-- ============ TAB: SECURITY ============ -->
    <div v-show="activeTab === 'security'" class="max-w-md">
      <div class="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6 space-y-4">
        <h3 class="font-semibold text-white">Ganti Password</h3>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Password Saat Ini</label>
          <input v-model="passwordForm.current" type="password" class="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm">
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Password Baru</label>
          <input v-model="passwordForm.newPass" type="password" class="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm">
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Konfirmasi Password Baru</label>
          <input v-model="passwordForm.confirm" type="password" class="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm">
        </div>
        <div v-if="passError" class="text-red-400 text-sm">{{ passError }}</div>
        <div v-if="passSuccess" class="text-green-400 text-sm">{{ passSuccess }}</div>
        <button @click="savePassword" class="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition text-sm font-medium">Ubah Password</button>
      </div>
    </div>

    <!-- ============ TAB: BRANDING ============ -->
    <div v-show="activeTab === 'branding'" class="max-w-md">
      <div class="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6 space-y-4">
        <h3 class="font-semibold text-white">Logo Perusahaan</h3>
        <div v-if="form.logo_url" class="mb-3">
          <img :src="form.logo_url" class="max-h-24 object-contain rounded border border-gray-700/50 bg-gray-900/50 p-2">
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-2">Upload Logo Baru</label>
          <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/webp" @change="onFileChange" class="w-full text-sm text-gray-400 file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-amber-600 file:text-white hover:file:bg-amber-500 file:cursor-pointer cursor-pointer">
        </div>
        <div v-if="logoError" class="text-red-400 text-sm">{{ logoError }}</div>
        <div v-if="logoSaved" class="text-green-400 text-sm">✓ Logo tersimpan</div>
        <div class="flex gap-2">
          <button @click="uploadLogo" :disabled="!selectedFile" class="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition text-sm font-medium">Upload Logo</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'

const API = '/api/admin'
const activeTab = ref('general')

const tabs = [
  { key: 'general', label: 'Umum' },
  { key: 'bank', label: 'Rekening Bank' },
  { key: 'wa', label: 'WA Templates' },
  { key: 'security', label: 'Keamanan' },
  { key: 'branding', label: 'Branding' },
]

const form = reactive({
  companyName: '', companyPhone: '', companyAddress: '', adminPhone: '',
  dp_percentage: 50, upload_deadline_days: 1, auto_approve_hours: 24,
  max_photos_per_fg_per_day: 5, invoice_prefix: 'INV', operational_hours: '',
  session_timeout_minutes: 1440,
  bank_accounts: [],
  wa_templates: {},
  logo_url: '',
})

const saved = ref(false)
const bankSaved = ref(false)
const waSaved = ref(false)

// Password form
const passwordForm = reactive({ current: '', newPass: '', confirm: '' })
const passError = ref('')
const passSuccess = ref('')

// Logo
const selectedFile = ref(null)
const fileInput = ref(null)
const logoError = ref('')
const logoSaved = ref(false)

async function loadSettings() {
  try {
    const r = await fetch(`${API}/settings`, { credentials: 'include' })
    const d = await r.json()
    const s = d.settings || {}
    form.companyName = s.company_name || form.companyName
    form.companyPhone = s.company_phone || ''
    form.companyAddress = s.company_address || ''
    form.adminPhone = s.admin_phone || ''
    form.dp_percentage = s.dp_percentage || 50
    form.upload_deadline_days = s.upload_deadline_days || 1
    form.auto_approve_hours = s.auto_approve_hours || 24
    form.max_photos_per_fg_per_day = s.max_photos_per_fg_per_day || 5
    form.invoice_prefix = s.invoice_prefix || 'INV'
    form.operational_hours = s.operational_hours || ''
    form.session_timeout_minutes = s.session_timeout_minutes || 1440
    form.bank_accounts = Array.isArray(s.bank_accounts) ? s.bank_accounts : []
    form.logo_url = s.logo_url || ''
    form.wa_templates = d.wa_templates || {}
  } catch {}
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
    bank_accounts: form.bank_accounts,
  }
}

async function saveGeneral() {
  try {
    await fetch(`${API}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(buildPayload()),
    })
    saved.value = true; setTimeout(() => saved.value = false, 3000)
  } catch {}
}

function addBank() {
  form.bank_accounts.push({ bank: '', norek: '', atas_nama: '' })
}
function removeBank(i) {
  form.bank_accounts.splice(i, 1)
  // Auto-save on remove
  saveBankAccounts()
}

async function saveBankAccounts() {
  try {
    await fetch(`${API}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ bank_accounts: form.bank_accounts }),
    })
    bankSaved.value = true; setTimeout(() => bankSaved.value = false, 3000)
  } catch {}
}

async function saveWaTemplates() {
  try {
    await fetch(`${API}/settings/wa-templates`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ templates: form.wa_templates }),
    })
    waSaved.value = true; setTimeout(() => waSaved.value = false, 3000)
  } catch {}
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
    const r = await fetch(`${API}/settings/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ current_password: passwordForm.current, new_password: passwordForm.newPass }),
    })
    const d = await r.json()
    if (!r.ok) { passError.value = d.error || 'Gagal'; return }
    passSuccess.value = 'Password berhasil diubah!'
    passwordForm.current = ''; passwordForm.newPass = ''; passwordForm.confirm = ''
  } catch { passError.value = 'Gagal koneksi server' }
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
  reader.onload = async (ev) => {
    const base64 = ev.target.result
    try {
      const r = await fetch(`${API}/settings/logo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ logo_data: base64 }),
      })
      const d = await r.json()
      if (!r.ok) { logoError.value = d.error || 'Gagal'; return }
      form.logo_url = d.logo_url
      logoSaved.value = true
      selectedFile.value = null
      if (fileInput.value) fileInput.value.value = ''
      setTimeout(() => logoSaved.value = false, 3000)
    } catch { logoError.value = 'Gagal upload' }
  }
  reader.readAsDataURL(selectedFile.value)
}

onMounted(loadSettings)
</script>
