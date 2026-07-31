import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const STORAGE_KEY = 'wisuda_direct_upload_queue'

export const useUploadStore = defineStore('upload', () => {
  const uploadQueue = ref([])
  const isMinimized = ref(false)
  const activeWorkers = ref(0)
  const maxConcurrency = 5

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
    fileList.forEach(fileObj => {
      const taskId = 'up_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)
      uploadQueue.value.push({
        id: taskId,
        file: fileObj,
        name: fileObj.name,
        size: fileObj.size,
        mimeType: fileObj.type || 'application/octet-stream',
        bookingId,
        subfolderType,
        status: 'queued',
        progress: 0,
        driveFileId: '',
        error: ''
      })
    })

    persistQueue()
    processQueue()
  }

  async function processQueue() {
    if (activeWorkers.value >= maxConcurrency) return

    const pendingTasks = uploadQueue.value.filter(t => t.status === 'queued' && t.file)
    if (pendingTasks.length === 0) return

    const availableSlots = maxConcurrency - activeWorkers.value
    const tasksToRun = pendingTasks.slice(0, availableSlots)

    tasksToRun.forEach(task => {
      uploadSingleTask(task)
    })
  }

  function uploadSingleTask(task) {
    task.status = 'uploading'
    activeWorkers.value++
    persistQueue()

    const targetType = task.subfolderType === 'jpg' ? 'staging' : task.subfolderType
    const formData = new FormData()
    formData.append('file', task.file)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `/api/admin/bookings/${task.bookingId}/upload-to-drive?target=${targetType}`, true)
    xhr.withCredentials = true

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
          if (resData.success) {
            task.driveFileId = resData.file?.id || ''
            task.progress = 100
            task.status = 'completed'
          } else {
            task.status = 'error'
            task.error = resData.error || 'Gagal Upload'
          }
        } catch (err) {
          task.status = 'completed'
        }
      } else {
        try {
          const errRes = JSON.parse(xhr.responseText)
          task.status = 'error'
          task.error = errRes.error || `HTTP ${xhr.status}`
        } catch (e) {
          task.status = 'error'
          task.error = `HTTP ${xhr.status}: Gagal Upload`
        }
      }

      persistQueue()
      processQueue()
    }

    xhr.onerror = () => {
      activeWorkers.value--
      task.status = 'error'
      task.error = 'Kesalahan koneksi jaringan saat upload'
      persistQueue()
      processQueue()
    }

    xhr.send(formData)
  }

  function retryTask(taskId) {
    const task = uploadQueue.value.find(t => t.id === taskId)
    if (task) {
      task.status = 'queued'
      task.error = ''
      task.progress = 0
      persistQueue()
      processQueue()
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
