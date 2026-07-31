<template>
  <div
    v-if="uploadStore.uploadQueue.length > 0"
    class="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl text-white text-xs overflow-hidden transition-all duration-300 font-sans"
  >
    <!-- Header Bar -->
    <div class="px-4 py-3 bg-slate-800/90 flex items-center justify-between border-b border-slate-700/60 select-none">
      <div class="flex items-center space-x-2.5">
        <div class="w-2.5 h-2.5 rounded-full" :class="uploadStore.isUploading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'"></div>
        <span class="font-semibold text-slate-100 text-sm">
          {{ uploadStore.isUploading ? `Mengunggah ke Drive (${uploadStore.activeTasks.length})` : 'Upload Selesai' }}
        </span>
      </div>

      <div class="flex items-center space-x-1.5">
        <button
          @click="uploadStore.isMinimized = !uploadStore.isMinimized"
          class="p-1 hover:bg-slate-700/70 rounded-md text-slate-400 hover:text-white transition"
          :title="uploadStore.isMinimized ? 'Perbesar Panel' : 'Kecilkan Panel'"
        >
          <svg v-if="uploadStore.isMinimized" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
        </button>
        <button
          @click="uploadStore.clearCompleted"
          v-if="!uploadStore.isUploading"
          class="p-1 hover:bg-slate-700/70 rounded-md text-slate-400 hover:text-white transition"
          title="Tutup Panel"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
    </div>

    <!-- Overall Progress Bar -->
    <div v-if="uploadStore.isUploading" class="w-full bg-slate-800 h-1.5">
      <div
        class="bg-gradient-to-r from-amber-500 to-emerald-400 h-1.5 transition-all duration-300"
        :style="{ width: uploadStore.totalProgress + '%' }"
      ></div>
    </div>

    <!-- Panel Body (Expanded) -->
    <div v-if="!uploadStore.isMinimized" class="max-h-72 overflow-y-auto divide-y divide-slate-800/80 p-2">
      <div
        v-for="task in uploadStore.uploadQueue"
        :key="task.id"
        class="p-2.5 hover:bg-slate-800/50 rounded-xl transition flex items-center justify-between space-x-2"
      >
        <div class="min-w-0 flex-1">
          <div class="flex items-center justify-between mb-1">
            <span class="truncate font-medium text-slate-200 text-xs max-w-[200px]" :title="task.name">
              {{ task.name }}
            </span>
            <span class="text-[10px] text-slate-400 uppercase font-mono ml-2">
              {{ formatSubfolder(task.subfolderType) }}
            </span>
          </div>

          <!-- Status & File Size -->
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-slate-400">{{ formatBytes(task.size) }}</span>
            <span v-if="task.status === 'uploading'" class="text-amber-400 font-semibold font-mono">
              {{ task.progress }}%
            </span>
            <span v-else-if="task.status === 'finalizing'" class="text-blue-400 font-medium animate-pulse">
              Sync DB...
            </span>
            <span v-else-if="task.status === 'completed'" class="text-emerald-400 font-medium flex items-center space-x-1">
              <span>✓ Berhasil</span>
            </span>
            <span v-else-if="task.status === 'error'" class="text-rose-400 font-medium truncate max-w-[150px]" :title="task.error">
              ⚠ {{ task.error }}
            </span>
            <span v-else class="text-slate-400">Antrian...</span>
          </div>

          <!-- File Progress Bar -->
          <div v-if="task.status === 'uploading'" class="w-full bg-slate-800 rounded-full h-1 mt-1.5 overflow-hidden">
            <div class="bg-amber-400 h-1 transition-all duration-150" :style="{ width: task.progress + '%' }"></div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center space-x-1">
          <button
            v-if="task.status === 'error'"
            @click="uploadStore.retryTask(task.id)"
            class="p-1 hover:bg-amber-500/20 text-amber-400 rounded transition"
            title="Coba Lagi"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          </button>
          <button
            @click="uploadStore.cancelTask(task.id)"
            class="p-1 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded transition"
            title="Hapus / Batal"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useUploadStore } from '../stores/upload'

const uploadStore = useUploadStore()

function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

function formatSubfolder(type) {
  if (type === 'jpg') return 'Folder JPG'
  if (type === 'highlight') return 'Highlight'
  if (type === 'final') return 'Final Editing'
  return type || 'Drive'
}
</script>
