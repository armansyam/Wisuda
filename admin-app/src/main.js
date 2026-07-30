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

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)
app.mount('#app')