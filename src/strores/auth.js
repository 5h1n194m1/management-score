// src/stores/auth.js (Pinia Store)

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import router from '@/router'; // Import router untuk redirect

export const useAuth = defineStore('auth', () => {
  // State
  const isLoggedIn = ref(false);
  const userData = ref(null); // Menyimpan data user dari API/DB (id, name, role)
  
  // Ambil data dari Local Storage saat inisialisasi
  const storedUser = localStorage.getItem('user_data');
  if (storedUser) {
    userData.value = JSON.parse(storedUser);
    isLoggedIn.value = true;
  }

  // Getters
  const userRole = computed(() => userData.value?.role || 'guest');
  
  // Actions
  
  // 1. Fungsi Simulasi Login (Nanti dihubungkan ke API/DB)
  const signIn = async (email, password) => {
    // --- Simulasi Proses Autentikasi API ---
    await new Promise(resolve => setTimeout(resolve, 500)); 
    
    // Logika Simulasi: 
    if (email === 'admin@mail.com' && password === 'admin') {
      userData.value = { id: 1, email: email, name: 'Admin Utama', role: 'admin' };
    } else if (email === 'operator@mail.com' && password === 'operator') {
      userData.value = { id: 2, email: email, name: 'Operator Event', role: 'operator' };
    } else {
      throw new Error('Email atau password salah.');
    }
    
    // Update State & Local Storage
    isLoggedIn.value = true;
    localStorage.setItem('user_data', JSON.stringify(userData.value));
    
    // Redirect setelah login
    router.push('/');
  };

  // 2. Fungsi Logout
  const signOut = async () => {
    isLoggedIn.value = false;
    userData.value = null;
    localStorage.removeItem('user_data');
    
    // Redirect ke Landing Page Publik
    router.push('/public-dashboard'); 
  };
  
  // 3. Cek Status Auth (Dipanggil di App.vue)
  const checkAuth = () => {
      // Logic ini memastikan state Pinia konsisten dengan Local Storage
      const storedUser = localStorage.getItem('user_data');
      if (storedUser) {
          userData.value = JSON.parse(storedUser);
          isLoggedIn.value = true;
      } else {
          isLoggedIn.value = false;
          userData.value = null;
      }
  }

  return { isLoggedIn, userData, userRole, signIn, signOut, checkAuth };
});