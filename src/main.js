import { createApp } from 'vue'
import App from './App.vue'
import './style.css'
import router from './router' // <-- IMPORT ROUTER DARI FILE INDEX.JS

const app = createApp(App)

app.use(router) // <-- INI ADALAH BARIS KRITIS YANG HILANG!

app.mount('#app')