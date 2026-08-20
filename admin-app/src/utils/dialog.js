import Swal from 'sweetalert2'

/**
 * Modern Minimalist Confirm Dialog replacing window.confirm
 * @param {string|object} titleOrOptions
 * @param {string} [text]
 * @param {object} [extraOptions]
 * @returns {Promise<boolean>}
 */
export async function confirmDialog(titleOrOptions, text = '', extraOptions = {}) {
  let title = ''
  let message = ''
  let isDanger = false
  let confirmButtonText = ''
  let cancelButtonText = 'Batal'

  if (typeof titleOrOptions === 'object' && titleOrOptions !== null) {
    title = titleOrOptions.title || ''
    message = titleOrOptions.text || titleOrOptions.message || ''
    isDanger = titleOrOptions.isDanger || titleOrOptions.confirmButtonColor === 'red' || (title && title.toLowerCase().includes('hapus')) || (message && message.toLowerCase().includes('hapus'))
    confirmButtonText = titleOrOptions.confirmButtonText || (isDanger ? 'Ya, Hapus' : 'Ya, Lanjutkan')
    cancelButtonText = titleOrOptions.cancelButtonText || 'Batal'
  } else {
    const rawMsg = String(titleOrOptions || '')
    if (text) {
      title = rawMsg
      message = text
    } else {
      isDanger = rawMsg.toLowerCase().includes('hapus') || rawMsg.toLowerCase().includes('reset') || rawMsg.toLowerCase().includes('putuskan')
      title = isDanger ? 'Konfirmasi Tindakan' : 'Konfirmasi Tindakan'
      message = rawMsg
    }
    isDanger = isDanger || extraOptions.isDanger || (title && title.toLowerCase().includes('hapus'))
    confirmButtonText = extraOptions.confirmButtonText || (isDanger ? 'Ya, Hapus' : 'Ya, Lanjutkan')
    cancelButtonText = extraOptions.cancelButtonText || 'Batal'
  }

  const iconEmoji = isDanger ? '⚠️' : '⚡'
  const iconBg = isDanger ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'

  const customHtml = `
    <div class="flex flex-col items-center text-center space-y-2.5">
      <div class="w-11 h-11 rounded-2xl ${iconBg} border flex items-center justify-center text-xl shadow-inner mb-0.5">
        ${iconEmoji}
      </div>
      <h3 class="text-sm font-bold text-slate-100 tracking-tight leading-snug">${title}</h3>
      <p class="text-xs text-slate-300 font-normal leading-relaxed max-w-xs">${message}</p>
    </div>
  `

  const result = await Swal.fire({
    html: customHtml,
    showCancelButton: true,
    confirmButtonText: confirmButtonText,
    cancelButtonText: cancelButtonText,
    reverseButtons: false,
    focusCancel: true,
    allowOutsideClick: true,
    allowEscapeKey: true,
    backdrop: `rgba(0, 0, 0, 0.65)`,
    customClass: {
      popup: 'swal2-custom-minimal-popup',
      htmlContainer: '!p-0 !m-0',
      actions: 'swal2-custom-actions',
      confirmButton: isDanger ? 'swal2-custom-btn-danger' : 'swal2-custom-btn-primary',
      cancelButton: 'swal2-custom-btn-cancel'
    },
    buttonsStyling: false
  })

  return result.isConfirmed
}

/**
 * Modern Minimalist Alert Dialog replacing window.alert
 * @param {string|object} titleOrOptions
 * @param {string} [text]
 * @param {'success'|'error'|'warning'|'info'} [icon]
 * @returns {Promise<void>}
 */
export async function alertDialog(titleOrOptions, text = '', icon = 'info') {
  let title = 'Informasi'
  let message = ''
  let confirmButtonText = 'Mengerti'

  if (typeof titleOrOptions === 'object' && titleOrOptions !== null) {
    title = titleOrOptions.title || 'Informasi'
    message = titleOrOptions.text || titleOrOptions.message || ''
    confirmButtonText = titleOrOptions.confirmButtonText || 'Mengerti'
    icon = titleOrOptions.icon || icon
  } else {
    if (text) {
      title = String(titleOrOptions)
      message = text
    } else {
      message = String(titleOrOptions || '')
    }
  }

  const iconEmoji = icon === 'error' ? '❌' : (icon === 'success' ? '✅' : (icon === 'warning' ? '⚠️' : 'ℹ️'))
  const iconBg = icon === 'error' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : (icon === 'success' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-sky-500/10 text-sky-500 border-sky-500/20')

  const customHtml = `
    <div class="flex flex-col items-center text-center space-y-2.5">
      <div class="w-11 h-11 rounded-2xl ${iconBg} border flex items-center justify-center text-xl shadow-inner mb-0.5">
        ${iconEmoji}
      </div>
      <h3 class="text-sm font-bold text-slate-100 tracking-tight leading-snug">${title}</h3>
      <p class="text-xs text-slate-300 font-normal leading-relaxed max-w-xs">${message}</p>
    </div>
  `

  await Swal.fire({
    html: customHtml,
    showCancelButton: false,
    confirmButtonText: confirmButtonText,
    allowOutsideClick: true,
    allowEscapeKey: true,
    backdrop: `rgba(0, 0, 0, 0.65)`,
    customClass: {
      popup: 'swal2-custom-minimal-popup',
      htmlContainer: '!p-0 !m-0',
      actions: 'swal2-custom-actions',
      confirmButton: 'swal2-custom-btn-primary'
    },
    buttonsStyling: false
  })
}

/**
 * Modern Toast notification (Non-blocking, Floating Top-End)
 */
export function showToast(title, icon = 'success', timer = 2500) {
  const iconEmoji = icon === 'error' ? '❌' : (icon === 'warning' ? '⚠️' : (icon === 'info' ? 'ℹ️' : '✅'))
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: timer,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer
      toast.onmouseleave = Swal.resumeTimer
    },
    customClass: {
      popup: 'swal2-custom-toast'
    }
  })

  Toast.fire({
    html: `<div class="flex items-center gap-2 text-xs font-semibold"><span>${iconEmoji}</span><span>${String(title).replace(/^[⚠️✓❌ℹ️\s]+/, '')}</span></div>`
  })
}
