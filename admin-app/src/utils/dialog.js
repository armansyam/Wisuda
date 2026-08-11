import Swal from 'sweetalert2'

const customSwal = Swal.mixin({
  customClass: {
    popup: '!rounded-2xl !bg-[#1A1A2E] !text-slate-100 !border !border-[#C59B63]/30 !shadow-2xl !p-6 !font-sans',
    title: '!text-base !font-bold !text-[#C59B63] !pt-1',
    htmlContainer: '!text-xs !text-slate-300 !mt-2 !leading-relaxed',
    confirmButton: '!px-5 !py-2.5 !rounded-xl !font-semibold !text-xs !transition-all !duration-200 !cursor-pointer !shadow-md !bg-[#C59B63] hover:!bg-[#b08752] !text-[#1A1A2E] focus:!outline-none',
    cancelButton: '!px-4 !py-2.5 !rounded-xl !font-semibold !text-xs !transition-all !duration-200 !cursor-pointer !bg-slate-800 hover:!bg-slate-700 !text-slate-300 !border !border-slate-700 focus:!outline-none',
    actions: '!gap-2.5 !mt-5',
  },
  buttonsStyling: false,
  background: '#1A1A2E',
  color: '#FAF9F6',
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
    icon: false, // Clean luxury dialog without big ugly question mark icons
    title: options.title || 'Konfirmasi Tindakan',
    text: options.text || '',
    html: options.html || undefined,
    showCancelButton: true,
    confirmButtonText: options.confirmButtonText || (isDanger ? 'Ya, Hapus' : 'Ya, Lanjutkan'),
    cancelButtonText: options.cancelButtonText || 'Batal',
    reverseButtons: true,
    customClass: {
      ...customSwal.customClass,
      confirmButton: `!px-5 !py-2.5 !rounded-xl !font-semibold !text-xs !transition-all !duration-200 !cursor-pointer !shadow-md ${
        isDanger
          ? '!bg-rose-950/80 !text-rose-300 !border !border-rose-800 hover:!bg-rose-900'
          : '!bg-[#C59B63] hover:!bg-[#b08752] !text-[#1A1A2E]'
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

  await customSwal.fire({
    icon: false, // Clean luxury dialog without big icons
    title: options.title || 'Informasi Studio',
    text: options.text || '',
    html: options.html || undefined,
    showCancelButton: false,
    confirmButtonText: options.confirmButtonText || 'Tutup',
    customClass: {
      ...customSwal.customClass,
      confirmButton: '!px-6 !py-2.5 !rounded-xl !font-semibold !text-xs !transition-all !duration-200 !cursor-pointer !bg-[#FAF6F0] hover:!bg-[#FFF0E8] !text-[#1A1A2E] !border !border-[#E8D5C8] !shadow-md',
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
    position: 'top-end',
    showConfirmButton: false,
    timer: timer,
    timerProgressBar: true,
    background: '#1A1A2E',
    color: '#FAF9F6',
    customClass: {
      popup: '!rounded-xl !border !border-[#C59B63]/40 !shadow-2xl !px-4 !py-3 !text-xs !font-sans !bg-[#1A1A2E] !text-[#C59B63]',
    },
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer)
      toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
  })

  Toast.fire({
    title
  })
}
