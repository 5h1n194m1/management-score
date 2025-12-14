import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import LoginView from '../views/LoginView.vue'
import AdminDashboardView from '../views/AdminDashboardView.vue'
import { supabase } from '@/supabaseClient.js'; // Pastikan alias @ di sini benar

const router = createRouter({
  // Gunakan mode history (URL bersih tanpa hash #)
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/admin', // Rute baru untuk Admin Dashboard
      name: 'admin-dashboard',
      component: AdminDashboardView,
      meta: { requiresAuth: true } // Menandai rute ini memerlukan login
    }
  ]
})

/**
 * Navigation Guard: Memeriksa autentikasi sebelum setiap rute
 * Jika rute memerlukan login (meta: { requiresAuth: true }) dan user belum login,
 * user akan diarahkan ke halaman login.
 */
router.beforeEach(async (to, from, next) => {
    // Ambil sesi user saat ini dari Supabase
    const { data: { session } } = await supabase.auth.getSession();
    
    // Cek apakah rute tujuan membutuhkan autentikasi (seperti '/admin')
    if (to.meta.requiresAuth && !session) {
      // Jika butuh login TAPI user belum login, arahkan ke halaman login
      next('/login');
    } else if (to.name === 'login' && session) {
      // Jika user sudah login TAPI mencoba mengakses halaman login, arahkan ke dashboard
      next('/');
    } else {
      // Lanjutkan ke rute tujuan
      next();
    }
})

export default router