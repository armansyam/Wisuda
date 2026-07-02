<template>
  <div>
    <h2 class="font-serif text-2xl font-bold text-white mb-6">Settings</h2>

    <!-- General -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div class="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6">
        <h3 class="font-semibold text-white mb-4">General Settings</h3>
        <div v-for="(item, key) in filteredGeneral" :key="key" class="mb-3">
          <label class="block text-sm text-gray-400 mb-1 capitalize">{{ key.replace(/_/g,' ') }}</label>
          <input v-model="generalSettings[key]" class="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm" :type="key.includes('phone')||key.includes('percentage')||key.includes('days')||key.includes('hours')?'text':'text'">
        </div>
        <button @click="saveGeneral" class="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition text-sm">Simpan</button>
        <div v-if="saved" class="mt-2 text-green-400 text-sm">Tersimpan</div>
      </div>

      <!-- WA Templates -->
      <div class="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6">
        <h3 class="font-semibold text-white mb-4">WA Templates</h3>
        <div class="max-h-[70vh] overflow-y-auto space-y-3">
          <div v-for="(tmpl, key) in waTemplates" :key="key" class="border border-gray-700/30 rounded-lg">
            <label class="block text-xs text-gray-400 px-3 pt-2 capitalize">{{ key.replace(/_/g,' ') }}</label>
            <textarea v-model="waTemplates[key]" rows="2" class="w-full bg-gray-800 border-0 text-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-xs"></textarea>
          </div>
        </div>
        <button @click="saveTemplates" class="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition text-sm">Simpan WA Templates</button>
        <div v-if="templateSaved" class="mt-2 text-green-400 text-sm">Tersimpan</div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
const API = '/api/admin'
const generalSettings = ref({})
const waTemplates = ref({})
const saved = ref(false)
const templateSaved = ref(false)

const filteredGeneral = computed(() => {
  const o = {}
  for (const [k, v] of Object.entries(generalSettings.value)) {
    if (k !== 'wa_templates') o[k] = v
  }
  return o
})

async function saveGeneral() {
  try {
    await fetch(`${API}/settings`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(generalSettings.value) })
    saved.value = true; setTimeout(() => saved.value = false, 3000)
  } catch {}
}
async function saveTemplates() {
  try {
    await fetch(`${API}/settings/wa-templates`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(waTemplates.value) })
    templateSaved.value = true; setTimeout(() => templateSaved.value = false, 3000)
  } catch {}
}

onMounted(async () => {
  try {
    const r = await fetch(`${API}/settings`, { credentials: 'include' })
    const d = await r.json()
    if (d.settings) generalSettings.value = d.settings
    if (d.wa_templates) waTemplates.value = d.wa_templates
    else if (generalSettings.value.wa_templates) {
      waTemplates.value = generalSettings.value.wa_templates
    }
  } catch {}
})
</script>