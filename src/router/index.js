// C:\management-score\src\router\index.js

import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import LoginView from '../views/LoginView.vue'
import AdminDashboardView from '../views/AdminDashboardView.vue'
// Hapus import { supabase } karena kita tidak lagi menggunakan Navigation Guard

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true } // Pertahankan meta tag untuk keperluan App.vue
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { requiresAuth: false } // Secara eksplisit menandai login tidak butuh auth
    },
    {
      path: '/admin', 
      name: 'admin-dashboard',
      component: AdminDashboardView,
      meta: { requiresAuth: true, role: 'admin' } // Menambahkan meta role (Opsional, tapi berguna)
    }
    // Tambahkan rute untuk Operator di sini jika diperlukan, misal:
    // { path: '/dashboard', name: 'operator-dashboard', component: DashboardView, meta: { requiresAuth: true } },
  ]
})

// HAPUS Navigation Guard router.beforeEach() ENTIRELY!
// Logic autentikasi dan role sudah ditangani secara sentral di App.vue

export default router;