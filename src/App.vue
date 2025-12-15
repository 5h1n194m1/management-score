<script setup>
import { computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '@/stores/auth'; // PASTIKAN PATH INI BENAR
import AppLayout from '@/components/AppLayout.vue'; // Layout profesional

const route = useRoute();
const router = useRouter();
const authStore = useAuth();

// --- Computed Property untuk Menentukan Layout ---
// Layout 'AppLayout' digunakan untuk dashboard yang butuh sidebar, 
// sisanya menggunakan layout default (div)
const currentLayout = computed(() => {
  if (route.meta.layout === 'AppLayout') {
    return AppLayout;
  }
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