import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/main.css'
import { confirmDialog, alertDialog } from './utils/dialog'

// Global override for native browser dialogs
window.alert = (msg) => {
  if (!msg) return
  alertDialog({
    title: 'Informasi',
    text: String(msg)
  })
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