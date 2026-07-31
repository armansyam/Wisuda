import { useUploadStore } from '../stores/upload'

export function useDirectUpload() {
  const uploadStore = useUploadStore()

  function startDirectUpload(files, bookingId, subfolderType) {
    if (!files || files.length === 0) return
    uploadStore.addFilesToQueue(files, bookingId, subfolderType)
    uploadStore.isMinimized = false
  }

  return {
    startDirectUpload,
    uploadStore
  }
}
