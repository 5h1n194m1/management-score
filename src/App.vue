<script setup>
import { computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '@/stores/auth'; // Pastikan path ini benar
import AppLayout from '@/components/AppLayout.vue'; // Layout profesional
import { useThemeStore } from '@/stores/theme'; // Import theme store

const route = useRoute();
const router = useRouter();
const authStore = useAuth();
const themeStore = useThemeStore(); // Inisialisasi theme store 

// --- Computed Property untuk Menentukan Layout ---
const currentLayout = computed(() => {
  // Gunakan AppLayout jika meta.layout diset 'AppLayout' di router/index.js
  if (route.meta.layout === 'AppLayout') {
    return AppLayout;
  }
  // Default: tidak menggunakan layout wrapper (untuk PublicDashboardView, LoginView)
  return 'div';
});

// --- Logic Watcher untuk Autentikasi dan Redirect ---
watch(() => [route.path, authStore.isLoggedIn, authStore.userRole], ([newPath, newStatus, newRole]) => {

  const requiresAuth = route.meta.requiresAuth;
  const requiredRoles = route.meta.roles;

  // A. Guard: Jika Rute Membutuhkan Auth TAPI User TIDAK Login
  if (requiresAuth && !authStore.isLoggedIn) {
      if (newPath !== '/public-dashboard' && newPath !== '/login') {
          // Redirect ke Landing Page Publik jika mencoba mengakses rute terproteksi
          router.push('/public-dashboard');
      }
      return;
  }

  // B. Guard: Jika User SUDAH Login
  if (authStore.isLoggedIn) {
      // Jika mencoba akses /login atau /public-dashboard, redirect ke Dashboard utama (/)
      if (newPath === '/login' || newPath === '/public-dashboard') {
          router.push('/');
          return;
      }

      // C. Guard: Cek Role Access
      if (requiredRoles && !requiredRoles.includes(newRole)) {
          // Jika role tidak sesuai (misal: operator mencoba akses /admin)
          router.push('/');
          return;
      }
  }

}, { immediate: true });

// 3. Pastikan status auth dimuat saat aplikasi dijalankan
onMounted(() => {
    // Memuat status auth dari Local Storage saat aplikasi dimulai
    authStore.checkAuth();
});
</script>

<template>
  <component :is="currentLayout">
    <router-view />
  </component>
</template>
