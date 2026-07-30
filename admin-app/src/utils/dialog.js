import Swal from 'sweetalert2'

const customSwal = Swal.mixin({
  customClass: {
    popup: '!rounded-2xl !bg-slate-900 !text-slate-100 !border !border-slate-800 !shadow-2xl !p-6 !font-sans',
    title: '!text-lg !font-bold !text-slate-100 !pt-2',
    htmlContainer: '!text-sm !text-slate-300 !mt-2 !leading-relaxed',
    confirmButton: '!px-5 !py-2.5 !rounded-xl !font-semibold !text-sm !transition-all !duration-200 !cursor-pointer !shadow-md focus:!outline-none',
    cancelButton: '!px-5 !py-2.5 !rounded-xl !font-semibold !text-sm !transition-all !duration-200 !cursor-pointer !bg-slate-800 hover:!bg-slate-700 !text-slate-300 !border !border-slate-700 focus:!outline-none',
    actions: '!gap-3 !mt-6',
  },
  buttonsStyling: false,
  background: '#0f172a',
  color: '#f8fafc',
})

/**
 * Modern confirm dialog replacing window.confirm
 * @param {string|object} titleOrOptions
 * @param {string} [text]
 * @param {object} [extraOptions]
 * @returns {Promise<boolean>}
 */
export async function confirmDialog(titleOrOptions, text = '', extraOptions = {}) {
  let options = {}
  if (typeof titleOrOptions === 'object' && titleOrOptions !== null) {
    options = titleOrOptions
  } else {
    options = {
      title: titleOrOptions,
      text: text,
      ...extraOptions
    }
  }

  const isDanger = options.isDanger || options.confirmButtonColor === 'red' || (options.title && options.title.toLowerCase().includes('hapus'))

  const result = await customSwal.fire({
    icon: options.icon || (isDanger ? 'warning' : 'question'),
    title: options.title || 'Apakah Anda Yakin?',
    text: options.text || '',
    html: options.html || undefined,
    showCancelButton: true,
    confirmButtonText: options.confirmButtonText || (isDanger ? 'Ya, Hapus' : 'Ya, Lanjutkan'),
    cancelButtonText: options.cancelButtonText || 'Batal',
    reverseButtons: true,
    customClass: {
      ...customSwal.customClass,
      confirmButton: `!px-5 !py-2.5 !rounded-xl !font-semibold !text-sm !transition-all !duration-200 !cursor-pointer !shadow-md !text-white ${
        isDanger
          ? '!bg-rose-600 hover:!bg-rose-700 focus:!ring-rose-500'
          : '!bg-amber-600 hover:!bg-amber-500 focus:!ring-amber-500'
      }`,
    }
  })

  return result.isConfirmed
}

/**
 * Modern alert dialog replacing window.alert
 * @param {string|object} titleOrOptions
 * @param {string} [text]
 * @param {'success'|'error'|'warning'|'info'} [icon]
 * @returns {Promise<void>}
 */
export async function alertDialog(titleOrOptions, text = '', icon = 'info') {
  let options = {}
  if (typeof titleOrOptions === 'object' && titleOrOptions !== null) {
    options = titleOrOptions
  } else {
    options = {
      title: titleOrOptions,
      text: text,
      icon: icon
    }
  }

  // Determine icon automatically if title indicates error or success
  if (!options.icon || options.icon === 'info') {
    const lowerTitle = (options.title || '').toLowerCase()
    if (lowerTitle.includes('gagal') || lowerTitle.includes('error') || lowerTitle.includes('salah')) {
      options.icon = 'error'
    } else if (lowerTitle.includes('berhasil') || lowerTitle.includes('sukses')) {
      options.icon = 'success'
    }
  }

  await customSwal.fire({
    icon: options.icon || 'info',
    title: options.title || 'Informasi',
    text: options.text || '',
    html: options.html || undefined,
    showCancelButton: false,
    confirmButtonText: options.confirmButtonText || 'Tutup',
    customClass: {
      ...customSwal.customClass,
      confirmButton: '!px-6 !py-2.5 !rounded-xl !font-semibold !text-sm !transition-all !duration-200 !cursor-pointer !bg-slate-800 hover:!bg-slate-700 !text-slate-100 !border !border-slate-700 !shadow-md',
    }
  })
}

/**
 * Toast notification for non-blocking feedback
 * @param {string} title
 * @param {'success'|'error'|'warning'|'info'} [icon]
 * @param {number} [timer]
 */
export function showToast(title, icon = 'success', timer = 2500) {
  const Toast = Swal.mixin({
    toast: true,
    position: 'bottom-end',
    showConfirmButton: false,
    timer: timer,
    timerProgressBar: true,
    background: '#1e293b',
    color: '#f8fafc',
    customClass: {
      popup: '!rounded-xl !border !border-slate-700 !shadow-xl !px-4 !py-3 !text-sm !font-sans !bg-slate-800 !text-slate-100',
    },
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer)
      toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
  })

  Toast.fire({
    icon,
    title
  })
}
