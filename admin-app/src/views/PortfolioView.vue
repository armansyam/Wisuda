<template>
  <div>
    <h2 class="font-serif text-2xl font-bold text-white mb-6">Portfolio</h2>
    <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <div v-for="item in data" :key="item.id" class="bg-gray-800/40 border border-gray-700/50 rounded-xl overflow-hidden group cursor-pointer">
        <div class="aspect-[4/3] bg-gray-800 relative overflow-hidden">
          <img :src="item.cover_photo_url" class="w-full h-full object-cover group-hover:scale-105 transition" v-if="item.cover_photo_url">
          <div v-else class="flex items-center justify-center h-full text-gray-600 text-sm">No photo</div>
        </div>
        <div class="p-3">
          <p class="font-medium text-white text-sm">{{ item.client_initial }}</p>
          <p class="text-xs text-gray-500">{{ item.graduation_year }} • {{ item.university }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue'
const API = '/api/admin'
const data = ref([])
async function load() {
  try { const r = await fetch(`${API}/portfolio`, { credentials: 'include' }); data.value = (await r.json()).data || [] } catch {}
}
load()
</script>