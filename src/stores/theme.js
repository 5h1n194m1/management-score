// src/stores/theme.js

import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

// Kunci untuk menyimpan preferensi di LocalStorage
const STORAGE_KEY = 'darkModeEnabled';

export const useThemeStore = defineStore('theme', () => {
  // 1. Inisialisasi state dari LocalStorage atau default ke false
  const isDark = ref(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'false'));

  // 2. Fungsi untuk mengubah status
  const toggleDark = () => {
    isDark.value = !isDark.value;
  };

  // 3. Watcher: Sinkronisasi state Vue dengan DOM (class HTML) dan LocalStorage
  watch(isDark, (newVal) => {
    // Terapkan/Hapus class 'dark' pada elemen HTML
    if (newVal) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Simpan preferensi di LocalStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newVal));
  }, { immediate: true }); // Jalankan segera saat aplikasi dimuat

  return {
    isDark,
    toggleDark,
  };
});