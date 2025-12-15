import './assets/style.css'

import { createApp } from 'vue'
import { createApp } from 'pinia'
import App from './App.vue'
import './style.css'
import router from './router' // <-- IMPORT ROUTER DARI FILE INDEX.JS

const app = createApp(App)

app.use(createPinia())
app.use(router) // <-- INI ADALAH BARIS KRITIS YANG HILANG!

app.mount('#app')