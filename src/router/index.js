// src/router/index.js

import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@/stores/auth' // <--- IMPORT AUTH STORE
import LoginView from '../views/LoginView.vue'
import OperatorDashboardView from '../views/OperatorDashboardView.vue'
import AdminDashboardView from '../views/AdminDashboardView.vue'
import PublicDashboardView from '../views/PublicDashboardView.vue' // Landing Page
import EventManageView from '../views/EventManageView.vue'
import RecapView from '../views/RecapView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // 1. Landing Page Publik (Tidak Butuh Auth)
    {
      path: '/public-dashboard',
      name: 'public-dashboard',
      component: PublicDashboardView,
      meta: { requiresAuth: false, layout: 'default' } 
    },
    
    // 2. Rute Root (Landing Dashboard)
    {
      path: '/',
      name: 'operator-dashboard',
      component: OperatorDashboardView,
      meta: { requiresAuth: false, roles: ['operator', 'admin'], layout: 'AppLayout' } 
    },
    
    // 3. Rute Login
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { requiresAuth: false }
    },

    // 4. Rute Admin
    {
      path: '/admin', 
      name: 'admin-dashboard',
      component: AdminDashboardView,
      meta: { requiresAuth: true, roles: ['admin'], layout: 'AppLayout' } 
    },
    // 5. Rute Manajemen Event (Operator/Admin)
    {
      path: '/events/:id',
      name: 'event-manage',
      component: EventManageView,
      meta: { requiresAuth: true, roles: ['operator','admin'], layout: 'AppLayout' }
    },
    // 6. Rute Recap Publik
    {
      path: '/recap/:eventId',
      name: 'recap',
      component: RecapView,
      meta: { requiresAuth: false, layout: 'default' }
    }
  ]
})

export default router;
