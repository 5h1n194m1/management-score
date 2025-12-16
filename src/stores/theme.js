// src/stores/theme.js

import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export const useThemeStore = defineStore('theme', () => {
  // Menggunakan 'isDark' sebagai kunci LocalStorage
  const isDark = ref(JSON.parse(localStorage.getItem('isDark') || 'false')); 

  // Watcher: Sinkronisasi state Vue dengan DOM (class HTML) dan LocalStorage
  watch(isDark, (newVal) => {
    if (newVal) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('isDark', JSON.stringify(newVal));
  }, { immediate: true }); // Jalankan segera saat aplikasi dimuat

  const toggleDark = () => {
    isDark.value = !isDark.value;
  };

  return {
    isDark,
    toggleDark,
  };
});