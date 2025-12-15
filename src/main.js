// src/main.js

// 1. Impor CSS (Path yang benar)
import './style.css' 

// 2. Impor Core Vue dan Pinia
import { createApp } from 'vue'
import { createPinia } from 'pinia'

// 3. Impor Komponen dan Router
import App from './App.vue'
import router from './router'

// 4. Inisialisasi Aplikasi
const app = createApp(App)

// 5. Gunakan Plugins
app.use(createPinia())
app.use(router)

// 6. Mount Aplikasi
app.mount('#app')