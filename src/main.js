import '@/style.css' 
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { initAuthListener } from '@/services/authListener.js'
import App from './App.vue'
import router from './router'
const app = createApp(App)
const pinia = createPinia()
app.use(createPinia())
app.use(pinia)
app.use(router)
initAuthListener(pinia)
app.mount('#app')

