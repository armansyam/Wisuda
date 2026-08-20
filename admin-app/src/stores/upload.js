import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const STORAGE_KEY = 'wisuda_direct_upload_queue'

export const useUploadStore = defineStore('upload', () => {
  const uploadQueue = ref([])
  const isMinimized = ref(false)
  const activeWorkers = ref(0)
  const maxConcurrency = 4

  const activeTasks = computed(() => uploadQueue.value.filter(t => t.status === 'uploading' || t.status === 'queued' || t.status === 'initiating'))
  const completedTasks = computed(() => uploadQueue.value.filter(t => t.status === 'completed'))
  const failedTasks = computed(() => uploadQueue.value.filter(t => t.status === 'error'))
  const isUploading = computed(() => activeTasks.value.length > 0)

  const totalProgress = computed(() => {
    if (uploadQueue.value.length === 0) return 0
    const total = uploadQueue.value.reduce((acc, t) => acc + (t.progress || 0), 0)
    return Math.round(total / uploadQueue.value.length)
  })

  function persistQueue() {
    try {
      const serializable = uploadQueue.value.map(t => ({
        id: t.id,
        name: t.name,
        size: t.size,
        mimeType: t.mimeType,
        bookingId: t.bookingId,
        subfolderType: t.subfolderType,
        status: t.status === 'uploading' ? 'queued' : t.status,
        progress: t.progress,
        sessionUrl: t.sessionUrl,
        driveFileId: t.driveFileId,
        error: t.error
      }))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable))
    } catch {}
  }

  async function addFilesToQueue(files, bookingId, subfolderType) {
    if (!files || files.length === 0) return

    const fileList = Array.from(files)
    const newTasks = []
    const cleanSubfolderType = subfolderType === 'staging' ? 'jpg' : subfolderType

    fileList.forEach(fileObj => {
      const taskId = 'up_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)
      const task = {
        id: taskId,
        file: fileObj,
        name: fileObj.name,
        size: fileObj.size,
        mimeType: fileObj.type || 'image/jpeg',
        bookingId,
        subfolderType: cleanSubfolderType,
        status: 'initiating',
        progress: 0,
        sessionUrl: '',
        driveFileId: '',
        error: ''
      }
      uploadQueue.value.push(task)
      newTasks.push(task)
    })

    persistQueue()

    // 1. Batch Request Resumable Session URLs from Google Drive API via backend
    try {
      const initPayload = {
        booking_id: bookingId,
        subfolder_type: cleanSubfolderType,
        files: newTasks.map(t => ({ name: t.name, mimeType: t.mimeType, size: t.size }))
      }

      const res = await fetch('/api/v2/admin/uploads/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(initPayload)
      })
      const initData = await res.json()

      if (res.ok && initData.success && Array.isArray(initData.sessions)) {
        initData.sessions.forEach((s, idx) => {
          if (newTasks[idx]) {
            if (s.session_url) {
              newTasks[idx].sessionUrl = s.session_url
              newTasks[idx].status = 'queued'
            } else {
              newTasks[idx].status = 'error'
              newTasks[idx].error = s.error || 'Gagal inisialisasi session Google Drive'
            }
          }
        })
      } else {
        newTasks.forEach(t => {
          t.status = 'error'
          t.error = initData.error || 'Gagal inisialisasi Google Drive'
        })
      }
    } catch (err) {
      newTasks.forEach(t => {
        t.status = 'error'
        t.error = err.message || 'Koneksi inisialisasi gagal'
      })
    }

    persistQueue()
    processQueue()
  }

  async function processQueue() {
    if (activeWorkers.value >= maxConcurrency) return

    const pendingTasks = uploadQueue.value.filter(t => t.status === 'queued' && t.file && t.sessionUrl)
    if (pendingTasks.length === 0) return

    const availableSlots = maxConcurrency - activeWorkers.value
    const tasksToRun = pendingTasks.slice(0, availableSlots)

    tasksToRun.forEach(task => {
      uploadSingleDirectTask(task)
    })
  }

  function uploadSingleDirectTask(task) {
    task.status = 'uploading'
    activeWorkers.value++
    persistQueue()

    const xhr = new XMLHttpRequest()
    // 100% Direct PUT to Google Drive API (Zero VPS Transit)
    xhr.open('PUT', task.sessionUrl, true)
    xhr.setRequestHeader('Content-Type', task.mimeType || 'image/jpeg')

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        task.progress = Math.round((e.loaded / e.total) * 100)
      }
    }

    xhr.onload = async () => {
      activeWorkers.value--
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          const resData = JSON.parse(xhr.responseText)
          task.driveFileId = resData.id || ''
          task.progress = 100
          task.status = 'completed'

          // Notify backend finalize to update database record
          try {
            await fetch('/api/v2/admin/uploads/finalize', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                booking_id: task.bookingId,
                subfolder_type: task.subfolderType,
                files: [{ drive_file_id: task.driveFileId, name: task.name, size: task.size }]
              })
            })
          } catch (finErr) {
            console.warn('[Upload Finalize Warn]:', finErr)
          }
        } catch (err) {
          task.status = 'completed'
        }
      } else {
        try {
          const errRes = JSON.parse(xhr.responseText)
          task.status = 'error'
          task.error = errRes.error?.message || `HTTP ${xhr.status} Google Drive Error`
        } catch (e) {
          task.status = 'error'
          task.error = `HTTP ${xhr.status}: Gagal Upload ke Google Drive`
        }
      }

      persistQueue()
      processQueue()
    }

    xhr.onerror = () => {
      activeWorkers.value--
      task.status = 'error'
      task.error = 'Koneksi ke Google Drive terputus saat upload'
      persistQueue()
      processQueue()
    }

    // Direct binary streaming to Google Cloud
    xhr.send(task.file)
  }

  function retryTask(taskId) {
    const task = uploadQueue.value.find(t => t.id === taskId)
    if (task) {
      if (task.sessionUrl) {
        task.status = 'queued'
        task.error = ''
        task.progress = 0
        persistQueue()
        processQueue()
      } else {
        addFilesToQueue([task.file], task.bookingId, task.subfolderType)
        cancelTask(taskId)
      }
    }
  }

  function cancelTask(taskId) {
    const index = uploadQueue.value.findIndex(t => t.id === taskId)
    if (index !== -1) {
      uploadQueue.value.splice(index, 1)
      persistQueue()
    }
  }

  function clearCompleted() {
    uploadQueue.value = uploadQueue.value.filter(t => t.status !== 'completed')
    persistQueue()
  }

  return {
    uploadQueue,
    isMinimized,
    isUploading,
    activeTasks,
    completedTasks,
    failedTasks,
    totalProgress,
    addFilesToQueue,
    retryTask,
    cancelTask,
    clearCompleted
  }
})
