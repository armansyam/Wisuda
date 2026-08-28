<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Kas & Pengeluaran</h1>
        <p class="text-sm text-gray-500 mt-1">Catat semua pengeluaran operasional (Sewa, Transport, Tools, dll).</p>
      </div>
      <button @click="openModal()" class="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition shadow-sm flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        Catat Pengeluaran
      </button>
    </div>

    <!-- Error/Loading -->
    <div v-if="loading" class="flex justify-center p-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
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
              <th class="px-6 py-4 font-semibold text-gray-900">Tanggal</th>
              <th class="px-6 py-4 font-semibold text-gray-900">Kategori</th>
              <th class="px-6 py-4 font-semibold text-gray-900">Deskripsi</th>
              <th class="px-6 py-4 font-semibold text-gray-900 text-right">Total (Rp)</th>
              <th class="px-6 py-4 font-semibold text-gray-900 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-if="expenses.length === 0">
              <td colspan="5" class="px-6 py-8 text-center text-gray-500">Belum ada catatan pengeluaran.</td>
            </tr>
            <tr v-for="exp in expenses" :key="exp.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4 text-gray-600">{{ new Date(exp.date).toLocaleDateString('id-ID') }}</td>
              <td class="px-6 py-4">
                <span class="inline-block px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded capitalize">
                  {{ exp.category }}
                </span>
              </td>
              <td class="px-6 py-4 text-gray-900">{{ exp.description }}</td>
              <td class="px-6 py-4 text-right font-medium text-red-600">- Rp {{ exp.amount.toLocaleString('id-ID') }}</td>
              <td class="px-6 py-4 text-right">
                <button @click="deleteExpense(exp.id)" class="text-gray-400 hover:text-red-600 p-1 rounded transition-colors" title="Hapus">
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
          <h3 class="font-bold text-gray-900 text-lg">Catat Pengeluaran Baru</h3>
          <button @click="showModal = false" class="text-gray-400 hover:text-gray-600 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        
        <form @submit.prevent="saveExpense" class="p-6 space-y-4">
          <div v-if="formError" class="bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-100">{{ formError }}</div>
          
          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1">Kategori Pengeluaran <span class="text-red-500">*</span></label>
            <select v-model="form.category" required class="w-full text-sm rounded-lg border-gray-300 focus:border-red-600 focus:ring focus:ring-red-600/20">
              <option value="operational">Operasional (Listrik, Internet, dll)</option>
              <option value="marketing">Marketing (Iklan, Promo, dll)</option>
              <option value="transport">Transport / Akomodasi</option>
              <option value="equipment">Peralatan / Tools</option>
              <option value="other">Lain-lain</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1">Tanggal <span class="text-red-500">*</span></label>
            <input type="date" v-model="form.date" required class="w-full text-sm rounded-lg border-gray-300 focus:border-red-600 focus:ring focus:ring-red-600/20">
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1">Deskripsi Pengeluaran <span class="text-red-500">*</span></label>
            <textarea v-model="form.description" required rows="2" class="w-full text-sm rounded-lg border-gray-300 focus:border-red-600 focus:ring focus:ring-red-600/20" placeholder="Misal: Bayar langganan Google Drive..."></textarea>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1">Nominal (Rp) <span class="text-red-500">*</span></label>
            <input type="number" v-model="form.amount" required min="1" class="w-full text-sm rounded-lg border-gray-300 focus:border-red-600 focus:ring focus:ring-red-600/20" placeholder="50000">
          </div>

          <div class="pt-4 border-t border-gray-100 flex justify-end gap-3">
            <button type="button" @click="showModal = false" class="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Batal</button>
            <button type="submit" :disabled="saving" class="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2">
              <span v-if="saving" class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const expenses = ref([])
const loading = ref(true)
const error = ref('')
const API = import.meta.env.VITE_API_URL || '/api/admin'

const showModal = ref(false)
const saving = ref(false)
const formError = ref('')
const form = ref({
  category: 'operational',
  description: '',
  amount: '',
  date: new Date().toISOString().split('T')[0]
})

async function loadExpenses() {
  loading.value = true
  try {
    const res = await fetch(`${API}/expenses`, { credentials: 'include' })
    if (!res.ok) throw new Error('Gagal memuat data')
    const data = await res.json()
    expenses.value = data.expenses || []
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function openModal() {
  form.value = {
    category: 'operational',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  }
  formError.value = ''
  showModal.value = true
}

async function saveExpense() {
  saving.value = true
  formError.value = ''
  
  const payload = {
    category: form.value.category,
    description: form.value.description,
    amount: parseInt(form.value.amount),
    date: form.value.date
  }

  try {
    const res = await fetch(`${API}/expenses`, {
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
        formError.value = data.error || 'Gagal mencatat pengeluaran'
      }
      return
    }
    
    showModal.value = false
    loadExpenses()
  } catch (err) {
    formError.value = 'Terjadi kesalahan jaringan'
  } finally {
    saving.value = false
  }
}

async function deleteExpense(id) {
  if (!confirm('Hapus catatan pengeluaran ini secara permanen?')) return
  try {
    const res = await fetch(`${API}/expenses/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    const data = await res.json()
    if (!res.ok) {
      alert(data.error || 'Gagal menghapus pengeluaran')
      return
    }
    loadExpenses()
  } catch (e) {
    alert('Terjadi kesalahan jaringan')
  }
}

onMounted(() => {
  loadExpenses()
})
</script>
