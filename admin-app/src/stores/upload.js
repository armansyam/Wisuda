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
    const fileMetadata = fileList.map(f => ({
      name: f.name,
      mimeType: f.type || 'application/octet-stream',
      size: f.size
    }))

    try {
      const res = await fetch('/api/v2/admin/uploads/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          booking_id: bookingId,
          subfolder_type: subfolderType,
          files: fileMetadata
        })
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menginisiasi token upload Direct-to-Cloud')
      }

      data.sessions.forEach((session, index) => {
        const fileObj = fileList[index]
        const taskId = 'up_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)

        uploadQueue.value.push({
          id: taskId,
          file: fileObj,
          name: fileObj ? fileObj.name : session.file_name,
          size: fileObj ? fileObj.size : session.size,
          mimeType: fileObj ? fileObj.type : session.mime_type,
          bookingId,
          subfolderType,
          status: session.error ? 'error' : 'queued',
          progress: 0,
          sessionUrl: session.session_url || '',
          driveFileId: '',
          error: session.error || ''
        })
      })

      persistQueue()
      processQueue()
    } catch (err) {
      console.error('[UploadStore] Initiate error:', err)
      alert('Gagal memulai upload: ' + err.message)
    }
  }

  async function processQueue() {
    if (activeWorkers.value >= maxConcurrency) return

    const pendingTasks = uploadQueue.value.filter(t => t.status === 'queued' && t.sessionUrl && t.file)
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

    const xhr = new XMLHttpRequest()
    xhr.open('PUT', task.sessionUrl, true)
    xhr.setRequestHeader('Content-Type', task.mimeType || 'application/octet-stream')

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
          task.driveFileId = resData.id
          task.progress = 100
          task.status = 'finalizing'

          // Finalize with backend
          await fetch('/api/v2/admin/uploads/finalize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              booking_id: task.bookingId,
              subfolder_type: task.subfolderType,
              files: [{ drive_file_id: resData.id, name: task.name, size: task.size }]
            })
          })

          task.status = 'completed'
        } catch (err) {
          task.status = 'completed' // Drive upload succeeded regardless of DB sync
        }
      } else {
        task.status = 'error'
        task.error = `HTTP ${xhr.status}: ${xhr.statusText || 'Gagal upload ke Drive'}`
      }

      persistQueue()
      processQueue()
    }

    xhr.onerror = () => {
      activeWorkers.value--
      task.status = 'error'
      task.error = 'Kesalahan koneksi jaringan saat upload ke Drive'
      persistQueue()
      processQueue()
    }

    xhr.send(task.file)
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
