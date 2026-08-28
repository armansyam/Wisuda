<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Kode Promo & Referal</h1>
        <p class="text-sm text-gray-500 dark:text-slate-400 mt-1">Kelola kode diskon untuk klien dan program afiliasi.</p>
      </div>
      <div class="flex gap-2">
        <button v-if="activeTab === 'promo'" @click="openModal('promo')" class="px-4 py-2 bg-[#0f766e] text-white rounded-lg text-sm font-semibold hover:bg-[#0d6860] transition shadow-sm flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Buat Kode Promo
        </button>
        <button v-if="activeTab === 'partner'" @click="openModal('partner')" class="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition shadow-sm flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Buat Partner Baru
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-200">
      <nav class="-mb-px flex space-x-8">
        <button 
          @click="activeTab = 'promo'"
          :class="[activeTab === 'promo' ? 'border-[#0f766e] text-[#0f766e]' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:text-slate-200 hover:border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white', 'whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm']"
        >
          Kode Promo (Reguler)
        </button>
        <button 
          @click="activeTab = 'partner'"
          :class="[activeTab === 'partner' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:text-slate-200 hover:border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white', 'whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm']"
        >
          Partner & Afiliasi
        </button>
      </nav>
    </div>

    <!-- Error/Loading -->
    <div v-if="loading" class="flex justify-center p-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0f766e]"></div>
    </div>
    <div v-if="error" class="bg-red-50 text-red-500 p-4 rounded-lg text-sm mb-4">
      {{ error }}
    </div>

    <!-- Tab 1: Promo -->
    <div v-show="activeTab === 'promo'">
      <div v-if="!loading" class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm whitespace-nowrap">
            <thead class="bg-gray-50 dark:bg-slate-800 border-b border-gray-200">
              <tr>
                <th class="px-6 py-4 font-semibold text-gray-900 dark:text-white">Kode Promo</th>
                <th class="px-6 py-4 font-semibold text-gray-900 dark:text-white">Jumlah Diskon</th>
                <th class="px-6 py-4 font-semibold text-gray-900 dark:text-white">Quota Limit</th>
                <th class="px-6 py-4 font-semibold text-gray-900 dark:text-white">Status</th>
                <th class="px-6 py-4 font-semibold text-gray-900 dark:text-white text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-if="promos.length === 0">
                <td colspan="5" class="px-6 py-8 text-center text-gray-500 dark:text-slate-400">Belum ada kode promo.</td>
              </tr>
              <tr v-for="promo in promos" :key="promo.id" class="hover:bg-gray-50 dark:bg-slate-800 transition-colors">
                <td class="px-6 py-4">
                  <span class="inline-block px-2.5 py-1 bg-gray-100 text-gray-800 dark:text-slate-200 font-mono font-bold text-xs rounded border border-gray-200">{{ promo.code }}</span>
                </td>
                <td class="px-6 py-4 font-medium text-emerald-600">
                  <span v-if="promo.discount_type === 'percent'">{{ promo.discount_value }}%</span>
                  <span v-else>Rp {{ promo.discount_value.toLocaleString('id-ID') }}</span>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center gap-2">
                    <span class="text-gray-900 dark:text-white font-semibold">{{ promo.current_usage }}</span>
                    <span class="text-gray-400 text-xs">/ {{ promo.quota ? promo.quota : '∞' }}</span>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <button @click="toggleActivePromo(promo)" 
                    :class="promo.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500 dark:text-slate-400'"
                    class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors">
                    {{ promo.active ? 'Aktif' : 'Nonaktif' }}
                  </button>
                </td>
                <td class="px-6 py-4 text-right">
                  <button @click="deletePromo(promo.id)" class="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors" title="Hapus">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Tab 2: Partner -->
    <div v-show="activeTab === 'partner'">
      <div v-if="!loading" class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm whitespace-nowrap">
            <thead class="bg-gray-50 dark:bg-slate-800 border-b border-gray-200">
              <tr>
                <th class="px-6 py-4 font-semibold text-gray-900 dark:text-white">Nama Partner</th>
                <th class="px-6 py-4 font-semibold text-gray-900 dark:text-white">Profesi</th>
                <th class="px-6 py-4 font-semibold text-gray-900 dark:text-white">Kode</th>
                <th class="px-6 py-4 font-semibold text-gray-900 dark:text-white">Diskon Klien</th>
                <th class="px-6 py-4 font-semibold text-gray-900 dark:text-white">Fee Komisi</th>
                <th class="px-6 py-4 font-semibold text-gray-900 dark:text-white">Pemakaian</th>
                <th class="px-6 py-4 font-semibold text-gray-900 dark:text-white">Status</th>
                <th class="px-6 py-4 font-semibold text-gray-900 dark:text-white text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-if="partners.length === 0">
                <td colspan="8" class="px-6 py-8 text-center text-gray-500 dark:text-slate-400">Belum ada partner/afiliasi.</td>
              </tr>
              <tr v-for="partner in partners" :key="partner.id" class="hover:bg-gray-50 dark:bg-slate-800 transition-colors">
                <td class="px-6 py-4 font-medium text-gray-900 dark:text-white">{{ partner.name }}</td>
                <td class="px-6 py-4 text-gray-500 dark:text-slate-400 text-xs">{{ partner.profession }}</td>
                <td class="px-6 py-4">
                  <span class="inline-block px-2.5 py-1 bg-gray-100 text-gray-800 dark:text-slate-200 font-mono font-bold text-xs rounded border border-gray-200">{{ partner.code }}</span>
                </td>
                <td class="px-6 py-4 font-medium text-emerald-600">
                  <span v-if="partner.discount_value > 0">
                    {{ partner.discount_type === 'percent' ? partner.discount_value + '%' : 'Rp ' + partner.discount_value.toLocaleString('id-ID') }}
                  </span>
                  <span v-else class="text-gray-400 italic text-xs">Tanpa Diskon</span>
                </td>
                <td class="px-6 py-4 font-medium text-amber-600">
                  <span v-if="partner.fee_value > 0">
                    {{ partner.fee_type === 'percent' ? partner.fee_value + '%' : 'Rp ' + partner.fee_value.toLocaleString('id-ID') }}
                  </span>
                  <span v-else class="text-gray-400 italic text-xs">Tanpa Fee</span>
                </td>
                <td class="px-6 py-4 text-gray-900 dark:text-white font-semibold">{{ partner.usage_count }}</td>
                <td class="px-6 py-4">
                  <button @click="toggleActivePartner(partner)" 
                    :class="partner.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500 dark:text-slate-400'"
                    class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors">
                    {{ partner.active ? 'Aktif' : 'Nonaktif' }}
                  </button>
                </td>
                <td class="px-6 py-4 text-right">
                  <button @click="deletePartner(partner.id)" class="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors" title="Hapus">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal Form Promo -->
    <div v-if="showPromoModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm">
      <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden" @click.stop>
        <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800">
          <h3 class="font-bold text-gray-900 dark:text-white text-lg">Buat Kode Promo Reguler</h3>
          <button @click="showPromoModal = false" class="text-gray-400 hover:text-gray-600 dark:text-slate-300 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        
        <form @submit.prevent="savePromo" class="p-6 space-y-4">
          <div v-if="formError" class="bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-100">{{ formError }}</div>
          
          <div>
            <label class="block text-xs font-bold text-gray-700 dark:text-slate-200 mb-1">Kode Promo <span class="text-red-500">*</span></label>
            <input type="text" v-model="formPromo.code" required class="w-full text-sm rounded-lg border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:border-[#0f766e] focus:ring focus:ring-[#0f766e]/20 uppercase font-mono" placeholder="MISAL: SINTA100">
            <p class="text-[10px] text-gray-500 dark:text-slate-400 mt-1">Hanya huruf besar, angka, dan underscore.</p>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-gray-700 dark:text-slate-200 mb-1">Tipe Diskon</label>
              <select v-model="formPromo.discount_type" class="w-full text-sm rounded-lg border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:border-[#0f766e] focus:ring focus:ring-[#0f766e]/20">
                <option value="nominal">Nominal (Rp)</option>
                <option value="percent">Persen (%)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-700 dark:text-slate-200 mb-1">Nilai Diskon <span class="text-red-500">*</span></label>
              <input type="number" v-model="formPromo.discount_value" required min="1" class="w-full text-sm rounded-lg border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:border-[#0f766e] focus:ring focus:ring-[#0f766e]/20" placeholder="50000">
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 dark:text-slate-200 mb-1">Batas Kuota Pemakaian</label>
            <input type="number" v-model="formPromo.quota" min="1" class="w-full text-sm rounded-lg border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:border-[#0f766e] focus:ring focus:ring-[#0f766e]/20" placeholder="Kosongkan jika unlimited">
          </div>

          <div class="pt-4 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3">
            <button type="button" @click="showPromoModal = false" class="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-100 rounded-lg transition-colors">Batal</button>
            <button type="submit" :disabled="saving" class="px-4 py-2 text-sm font-semibold bg-[#0f766e] text-white rounded-lg hover:bg-[#0d6860] transition-colors disabled:opacity-50 flex items-center gap-2">
              <span v-if="saving" class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
              Simpan Kode
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Form Partner -->
    <div v-if="showPartnerModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm">
      <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto" @click.stop>
        <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800 sticky top-0 z-10">
          <h3 class="font-bold text-gray-900 dark:text-white text-lg">Buat Partner / Afiliasi Baru</h3>
          <button @click="showPartnerModal = false" class="text-gray-400 hover:text-gray-600 dark:text-slate-300 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        
        <form @submit.prevent="savePartner" class="p-6 space-y-4">
          <div v-if="formError" class="bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-100">{{ formError }}</div>
          
          <div>
            <label class="block text-xs font-bold text-gray-700 dark:text-slate-200 mb-1">Nama Partner <span class="text-red-500">*</span></label>
            <input type="text" v-model="formPartner.name" required class="w-full text-sm rounded-lg border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:border-emerald-600 focus:ring focus:ring-emerald-600/20" placeholder="Cth: Budi Santoso">
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 dark:text-slate-200 mb-1">Profesi / Tipe Partner <span class="text-red-500">*</span></label>
            <select v-model="formPartner.profession" required class="w-full text-sm rounded-lg border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:border-emerald-600 focus:ring focus:ring-emerald-600/20">
              <option value="MUA">MUA</option>
              <option value="Vendor Gedung">Vendor Gedung</option>
              <option value="Teman">Teman</option>
              <option value="Klien Lama">Klien Lama</option>
              <option value="Afiliator Online">Afiliator Online</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 dark:text-slate-200 mb-1">Kode Referal Unik <span class="text-red-500">*</span></label>
            <input type="text" v-model="formPartner.code" required class="w-full text-sm rounded-lg border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:border-emerald-600 focus:ring focus:ring-emerald-600/20 uppercase font-mono" placeholder="MISAL: BUDI123">
            <p class="text-[10px] text-gray-500 dark:text-slate-400 mt-1">Klien memasukkan kode ini saat booking.</p>
          </div>

          <div class="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700">
            <h4 class="text-xs font-semibold text-gray-800 dark:text-slate-200 mb-3">Pengaturan Diskon Klien</h4>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-gray-700 dark:text-slate-200 mb-1">Tipe Diskon</label>
                <select v-model="formPartner.discount_type" class="w-full text-sm rounded-lg border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:border-emerald-600 focus:ring focus:ring-emerald-600/20">
                  <option value="nominal">Nominal (Rp)</option>
                  <option value="percent">Persen (%)</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold text-gray-700 dark:text-slate-200 mb-1">Nilai Diskon</label>
                <input type="number" v-model="formPartner.discount_value" required min="0" class="w-full text-sm rounded-lg border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:border-emerald-600 focus:ring focus:ring-emerald-600/20" placeholder="0">
              </div>
            </div>
          </div>

          <div class="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-900/30">
            <h4 class="text-xs font-semibold text-amber-800 dark:text-amber-200 mb-3">Pengaturan Fee / Komisi Partner</h4>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-amber-700 dark:text-amber-300 mb-1">Tipe Komisi</label>
                <select v-model="formPartner.fee_type" class="w-full text-sm rounded-lg border-amber-300 focus:border-amber-600 focus:ring focus:ring-amber-600/20">
                  <option value="nominal">Nominal (Rp)</option>
                  <option value="percent">Persen (%)</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold text-amber-700 dark:text-amber-300 mb-1">Nilai Komisi</label>
                <input type="number" v-model="formPartner.fee_value" required min="0" class="w-full text-sm rounded-lg border-amber-300 focus:border-amber-600 focus:ring focus:ring-amber-600/20" placeholder="0">
              </div>
            </div>
          </div>

          <div class="pt-4 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-slate-900">
            <button type="button" @click="showPartnerModal = false" class="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-100 rounded-lg transition-colors">Batal</button>
            <button type="submit" :disabled="saving" class="px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2">
              <span v-if="saving" class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
              Simpan Partner
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const activeTab = ref('promo')
const promos = ref([])
const partners = ref([])
const loading = ref(true)
const error = ref('')
const API = '/api/admin'

const showPromoModal = ref(false)
const showPartnerModal = ref(false)
const saving = ref(false)
const formError = ref('')

const formPromo = ref({
  code: '',
  discount_type: 'nominal',
  discount_value: '',
  quota: ''
})

const formPartner = ref({
  name: '',
  profession: 'MUA',
  code: '',
  discount_type: 'nominal',
  discount_value: 0,
  fee_type: 'nominal',
  fee_value: 0
})

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const [resPromo, resPartner] = await Promise.all([
      fetch(`${API}/promo`, { credentials: 'include' }),
      fetch(`${API}/partners`, { credentials: 'include' })
    ])
    
    if (!resPromo.ok) throw new Error('Gagal memuat data Promo')
    if (!resPartner.ok) throw new Error('Gagal memuat data Partner')
    
    const dataPromo = await resPromo.json()
    const dataPartner = await resPartner.json()
    
    promos.value = dataPromo.promos || []
    partners.value = dataPartner.partners || []
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function openModal(type) {
  formError.value = ''
  if (type === 'promo') {
    formPromo.value = {
      code: '',
      discount_type: 'nominal',
      discount_value: '',
      quota: ''
    }
    showPromoModal.value = true
  } else {
    formPartner.value = {
      name: '',
      profession: 'MUA',
      code: '',
      discount_type: 'nominal',
      discount_value: 0,
      fee_type: 'nominal',
      fee_value: 0
    }
    showPartnerModal.value = true
  }
}

async function savePromo() {
  saving.value = true
  formError.value = ''
  
  const payload = {
    code: formPromo.value.code.toUpperCase(),
    discount_type: formPromo.value.discount_type,
    discount_value: parseInt(formPromo.value.discount_value),
    quota: formPromo.value.quota ? parseInt(formPromo.value.quota) : null
  }

  try {
    const res = await fetch(`${API}/promo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    })
    
    const data = await res.json()
    if (!res.ok) {
      if (data.errors) {
        formError.value = data.errors.map(e => e.msg).join(', ')
      } else {
        formError.value = data.error || 'Gagal menyimpan kode promo'
      }
      return
    }
    
    showPromoModal.value = false
    loadData()
  } catch (err) {
    formError.value = 'Terjadi kesalahan jaringan'
  } finally {
    saving.value = false
  }
}

async function savePartner() {
  saving.value = true
  formError.value = ''
  
  const payload = {
    name: formPartner.value.name,
    profession: formPartner.value.profession,
    code: formPartner.value.code.toUpperCase(),
    discount_type: formPartner.value.discount_type,
    discount_value: parseInt(formPartner.value.discount_value) || 0,
    fee_type: formPartner.value.fee_type,
    fee_value: parseInt(formPartner.value.fee_value) || 0
  }

  try {
    const res = await fetch(`${API}/partners`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    })
    
    const data = await res.json()
    if (!res.ok) {
      if (data.errors) {
        formError.value = data.errors.map(e => e.msg).join(', ')
      } else {
        formError.value = data.error || 'Gagal menyimpan partner'
      }
      return
    }
    
    showPartnerModal.value = false
    loadData()
  } catch (err) {
    formError.value = 'Terjadi kesalahan jaringan'
  } finally {
    saving.value = false
  }
}

async function toggleActivePromo(promo) {
  try {
    const res = await fetch(`${API}/promo/${promo.id}/toggle`, {
      method: 'PUT',
      credentials: 'include'
    })
    if (res.ok) {
      promo.active = promo.active === 1 ? 0 : 1
    }
  } catch (e) {
    console.error(e)
  }
}

async function toggleActivePartner(partner) {
  try {
    const res = await fetch(`${API}/partners/${partner.id}/toggle`, {
      method: 'PUT',
      credentials: 'include'
    })
    if (res.ok) {
      partner.active = partner.active === 1 ? 0 : 1
    }
  } catch (e) {
    console.error(e)
  }
}

async function deletePromo(id) {
  if (!confirm('Hapus kode promo ini secara permanen?')) return
  try {
    const res = await fetch(`${API}/promo/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    const data = await res.json()
    if (!res.ok) {
      alert(data.error || 'Gagal menghapus promo')
      return
    }
    loadData()
  } catch (e) {
    alert('Terjadi kesalahan jaringan')
  }
}

async function deletePartner(id) {
  if (!confirm('Hapus partner ini secara permanen?')) return
  try {
    const res = await fetch(`${API}/partners/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    const data = await res.json()
    if (!res.ok) {
      alert(data.error || 'Gagal menghapus partner')
      return
    }
    loadData()
  } catch (e) {
    alert('Terjadi kesalahan jaringan')
  }
}

onMounted(() => {
  loadData()
})
</script>
