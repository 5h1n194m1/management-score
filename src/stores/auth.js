// src/stores/auth.js (Pinia Store)

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import router from '@/router'; // Pastikan import ini berfungsi setelah vite.config diperbaiki

export const useAuth = defineStore('auth', () => {
  // State
  const isLoggedIn = ref(false);
  const userData = ref(null); 
  
  // Ambil data dari Local Storage saat inisialisasi
  const storedUser = localStorage.getItem('user_data');
  if (storedUser) {
    userData.value = JSON.parse(storedUser);
    isLoggedIn.value = true;
  }

  // Getters
  const userRole = computed(() => userData.value?.role || 'guest');
  
  // Actions (Nanti bisa dihubungkan ke API)
  const signIn = async (email, password) => {
    // ... (Logika signIn simulasi) ...
    // Logika Simulasi: 
    if (email === 'admin@mail.com' && password === 'admin') {
      userData.value = { id: 1, email: email, name: 'Admin Utama', role: 'admin' };
    } else if (email === 'operator@mail.com' && password === 'operator') {
      userData.value = { id: 2, email: email, name: 'Operator Event', role: 'operator' };
    } else {
      throw new Error('Email atau password salah.');
    }
    isLoggedIn.value = true;
    localStorage.setItem('user_data', JSON.stringify(userData.value));
    router.push('/');
  };

  const signOut = async () => {
    isLoggedIn.value = false;
    userData.value = null;
    localStorage.removeItem('user_data');
    router.push('/public-dashboard'); 
  };
  
  const checkAuth = () => {
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