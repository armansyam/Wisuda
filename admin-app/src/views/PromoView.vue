<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Kode Promo & Referal</h1>
        <p class="text-sm text-gray-500 mt-1">Kelola kode diskon untuk klien dan program afiliasi MUA.</p>
      </div>
      <button @click="openModal()" class="px-4 py-2 bg-[#0f766e] text-white rounded-lg text-sm font-semibold hover:bg-[#0d6860] transition shadow-sm flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        Buat Kode Baru
      </button>
    </div>

    <!-- Error/Loading -->
    <div v-if="loading" class="flex justify-center p-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0f766e]"></div>
    </div>
    <div v-if="error" class="bg-red-50 text-red-500 p-4 rounded-lg text-sm mb-4">
      {{ error }}
    </div>

    <!-- Table -->
    <div v-if="!loading" class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm whitespace-nowrap">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="px-6 py-4 font-semibold text-gray-900">Kode Promo</th>
              <th class="px-6 py-4 font-semibold text-gray-900">Diskon Klien</th>
              <th class="px-6 py-4 font-semibold text-gray-900">Fee Afiliasi (MUA)</th>
              <th class="px-6 py-4 font-semibold text-gray-900">Pemakaian</th>
              <th class="px-6 py-4 font-semibold text-gray-900">Status</th>
              <th class="px-6 py-4 font-semibold text-gray-900 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-if="promos.length === 0">
              <td colspan="6" class="px-6 py-8 text-center text-gray-500">Belum ada kode promo.</td>
            </tr>
            <tr v-for="promo in promos" :key="promo.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4">
                <span class="inline-block px-2.5 py-1 bg-gray-100 text-gray-800 font-mono font-bold text-xs rounded border border-gray-200">{{ promo.code }}</span>
              </td>
              <td class="px-6 py-4 font-medium text-emerald-600">
                <span v-if="promo.discount_type === 'percent'">{{ promo.discount_value }}%</span>
                <span v-else>Rp {{ promo.discount_value.toLocaleString('id-ID') }}</span>
              </td>
              <td class="px-6 py-4">
                <span v-if="promo.affiliate_fee_value > 0" class="text-amber-600 font-medium">Rp {{ promo.affiliate_fee_value.toLocaleString('id-ID') }}</span>
                <span v-else class="text-gray-400 italic text-xs">Tanpa Fee</span>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                  <span class="text-gray-900 font-semibold">{{ promo.current_usage }}</span>
                  <span class="text-gray-400 text-xs">/ {{ promo.quota ? promo.quota : '∞' }}</span>
                </div>
              </td>
              <td class="px-6 py-4">
                <button @click="toggleActive(promo)" 
                  :class="promo.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'"
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

    <!-- Modal Form -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden" @click.stop>
        <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 class="font-bold text-gray-900 text-lg">Buat Kode Promo Baru</h3>
          <button @click="showModal = false" class="text-gray-400 hover:text-gray-600 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        
        <form @submit.prevent="savePromo" class="p-6 space-y-4">
          <div v-if="formError" class="bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-100">{{ formError }}</div>
          
          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1">Kode Promo <span class="text-red-500">*</span></label>
            <input type="text" v-model="form.code" required class="w-full text-sm rounded-lg border-gray-300 focus:border-[#0f766e] focus:ring focus:ring-[#0f766e]/20 uppercase font-mono" placeholder="MISAL: SINTA100">
            <p class="text-[10px] text-gray-500 mt-1">Hanya huruf besar, angka, dan underscore.</p>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1">Tipe Diskon</label>
              <select v-model="form.discount_type" class="w-full text-sm rounded-lg border-gray-300 focus:border-[#0f766e] focus:ring focus:ring-[#0f766e]/20">
                <option value="nominal">Nominal (Rp)</option>
                <option value="percent">Persen (%)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1">Nilai Diskon <span class="text-red-500">*</span></label>
              <input type="number" v-model="form.discount_value" required min="1" class="w-full text-sm rounded-lg border-gray-300 focus:border-[#0f766e] focus:ring focus:ring-[#0f766e]/20" placeholder="50000">
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1">Fee Afiliasi MUA (Rp)</label>
            <input type="number" v-model="form.affiliate_fee_value" min="0" class="w-full text-sm rounded-lg border-gray-300 focus:border-[#0f766e] focus:ring focus:ring-[#0f766e]/20" placeholder="0 (Kosongkan jika tanpa fee)">
            <p class="text-[10px] text-gray-500 mt-1">Uang komisi yang akan dibayarkan ke pembuat referal (Misal: 20000).</p>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1">Batas Kuota Pemakaian</label>
            <input type="number" v-model="form.quota" min="1" class="w-full text-sm rounded-lg border-gray-300 focus:border-[#0f766e] focus:ring focus:ring-[#0f766e]/20" placeholder="Kosongkan jika unlimited">
          </div>

          <div class="pt-4 border-t border-gray-100 flex justify-end gap-3">
            <button type="button" @click="showModal = false" class="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Batal</button>
            <button type="submit" :disabled="saving" class="px-4 py-2 text-sm font-semibold bg-[#0f766e] text-white rounded-lg hover:bg-[#0d6860] transition-colors disabled:opacity-50 flex items-center gap-2">
              <span v-if="saving" class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
              Simpan Kode
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const promos = ref([])
const loading = ref(true)
const error = ref('')
const API = import.meta.env.VITE_API_URL || '/api/admin'

const showModal = ref(false)
const saving = ref(false)
const formError = ref('')
const form = ref({
  code: '',
  discount_type: 'nominal',
  discount_value: '',
  affiliate_fee_value: '',
  quota: ''
})

async function loadPromos() {
  loading.value = true
  try {
    const res = await fetch(`${API}/promo`, { credentials: 'include' })
    if (!res.ok) throw new Error('Gagal memuat data')
    const data = await res.json()
    promos.value = data.promos || []
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function openModal() {
  form.value = {
    code: '',
    discount_type: 'nominal',
    discount_value: '',
    affiliate_fee_value: '',
    quota: ''
  }
  formError.value = ''
  showModal.value = true
}

async function savePromo() {
  saving.value = true
  formError.value = ''
  
  const payload = {
    code: form.value.code.toUpperCase(),
    discount_type: form.value.discount_type,
    discount_value: parseInt(form.value.discount_value),
    affiliate_fee_value: form.value.affiliate_fee_value ? parseInt(form.value.affiliate_fee_value) : 0,
    quota: form.value.quota ? parseInt(form.value.quota) : null
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
    
    showModal.value = false
    loadPromos()
  } catch (err) {
    formError.value = 'Terjadi kesalahan jaringan'
  } finally {
    saving.value = false
  }
}

async function toggleActive(promo) {
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
    loadPromos()
  } catch (e) {
    alert('Terjadi kesalahan jaringan')
  }
}

onMounted(() => {
  loadPromos()
})
</script>
