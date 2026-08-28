import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/main.css'
import { confirmDialog, alertDialog, showToast } from './utils/dialog'

// Global override for native browser dialogs
// Alert dialihkan menjadi Non-blocking Toast Notification di pojok kanan atas
window.alert = (msg) => {
  if (!msg) return
  const text = String(msg)
  const isError = text.toLowerCase().includes('gagal') || text.toLowerCase().includes('error') || text.toLowerCase().includes('salah') || text.toLowerCase().includes('ditolak') || text.includes('❌')
  const isWarning = text.toLowerCase().includes('perhatian') || text.toLowerCase().includes('peringatan') || text.toLowerCase().includes('belum') || text.includes('⚠️')
  const icon = isError ? 'error' : (isWarning ? 'warning' : 'success')
  showToast(text, icon, 2500)
}

window.confirm = (msg) => {
  return confirmDialog({
    title: 'Konfirmasi',
    text: String(msg || '')
  })
}

// Global fetch interceptor to auto-attach Bearer token to all /api/admin requests
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  let [resource, config = {}] = args;
  const token = localStorage.getItem('admin_token');
  if (token && typeof resource === 'string' && resource.includes('/api/admin')) {
    config = { ...config };
    const headers = new Headers(config.headers || {});
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    config.headers = headers;
    config.credentials = config.credentials || 'include';
  }
  return originalFetch(resource, config);
};

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)
app.mount('#app')