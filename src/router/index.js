// src/router/index.js

import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@/stores/auth' // Pastikan path ke store auth sudah benar
import LoginView from '../views/LoginView.vue'
import OperatorDashboardView from '../views/OperatorDashboardView.vue' // Rute utama saat login
import AdminDashboardView from '../views/AdminDashboardView.vue'
import PublicDashboardView from '../views/PublicDashboardView.vue' // Landing Page Publik

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Rute Baru: Landing Page Publik (Tidak Butuh Auth)
    {
      path: '/public-dashboard',
      name: 'public-dashboard',
      component: PublicDashboardView,
      meta: { requiresAuth: false, layout: 'default' } // Layout 'default' berarti tanpa sidebar/header
    },
    
    // Rute Root: Akan otomatis di-redirect ke /public-dashboard jika belum login
    {
      path: '/',
      name: 'operator-dashboard',
      component: OperatorDashboardView,
      // Menggunakan AppLayout yang profesional
      meta: { requiresAuth: true, roles: ['operator', 'admin'], layout: 'AppLayout' } 
    },
    
    // Rute Login (Tetap)
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { requiresAuth: false }
    },

    // Rute Admin (Butuh Auth, Role Admin)
    {
      path: '/admin', 
      name: 'admin-dashboard',
      component: AdminDashboardView,
      meta: { requiresAuth: true, roles: ['admin'], layout: 'AppLayout' } 
    },
  ]
})

// Catatan: Karena Anda menghapus router.beforeEach, 
// pastikan logic redirect ke /public-dashboard saat 
// belum login (khususnya untuk rute '/') sudah ada di App.vue atau store.

export default router;