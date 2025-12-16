<script setup>
import { supabase } from '@/supabaseClient.js'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/stores/auth'
import { ref, onMounted, computed } from 'vue'
import { getProfileTheme, upsertProfileTheme } from '@/services/db.js'
import { useThemeStore } from '@/stores/theme' // Import theme store

const router = useRouter()
const route = useRoute()
const authStore = useAuth()
const themeStore = useThemeStore() // Inisialisasi theme store 

const adminMenu = [
  { name: 'Dashboard Admin', path: '/admin', icon: '📈' }
]

const operatorMenu = [
  { name: 'Dashboard', path: '/', icon: '🏠' },
  { name: 'Recap', path: '/recap/:eventId', icon: '📄' }
]

const publicMenu = [
  { name: 'Dashboard Publik', path: '/', icon: '🏆' }
]

const currentMenuBase = computed(() => {
  return authStore.userRole === 'admin'
    ? adminMenu
    : (authStore.userRole === 'operator' ? operatorMenu : publicMenu)
})
const menuItems = computed(() => {
  const id = route.params.id || route.params.eventId
  return currentMenuBase.value.map(item => {
    if (item.path.startsWith('/recap/:')) {
      return { ...item, path: id ? `/recap/${id}` : '/public-dashboard', disabled: !id }
    }
    return item
  })
})

const collapsed = ref(false)
const isFullMode = ref(false)
const syncFullModeFromStorage = () => {
  isFullMode.value = localStorage.getItem('full_screen_mode') === '1'
}
onMounted(() => {
  syncFullModeFromStorage()
  window.addEventListener('storage', (e) => {
    if (e.key === 'full_screen_mode') {
      syncFullModeFromStorage()
    }
  })
  window.addEventListener('full_screen_mode_change', (e) => {
    isFullMode.value = !!(e?.detail)
  })
})

const handleLogout = async () => {
  const { error } = await supabase.auth.signOut()
  if (!error) {
    authStore.clearAuth()
    router.push('/login')
  }
}

const userEmail = () => authStore.userData?.email || ''

const roleLabel = () => (authStore.userRole === 'admin' ? 'Administrator' : (authStore.userRole || 'guest'))

const isDark = ref(false)
const applyTheme = (dark) => {
  isDark.value = dark
  document.documentElement.classList.toggle('dark', dark)
  localStorage.setItem('theme', dark ? 'dark' : 'light')
  const uid = authStore.userData?.id
  if (uid) {
    // Sinkronisasi ke profil (jika kolom theme tersedia)
    upsertProfileTheme(uid, dark ? 'dark' : 'light').catch(() => {})
  }
}
const toggleTheme = () => applyTheme(!isDark.value)
onMounted(() => {
  const uid = authStore.userData?.id
  const saved = localStorage.getItem('theme')
  const prefers = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  const initial = saved === 'dark' ? true : saved === 'light' ? false : prefers
  applyTheme(initial)
  if (uid) {
    getProfileTheme(uid).then(({ data }) => {
      if (data?.theme === 'dark' || data?.theme === 'light') {
        applyTheme(data.theme === 'dark')
      }
    }).catch(() => {})
  }
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-[#121212] flex">
    <aside v-if="!isFullMode" :class="[collapsed ? 'w-20' : 'w-72', 'bg-white dark:bg-[#1a1a1a] border-r border-slate-200 dark:border-slate-700 flex flex-col transition-[width] duration-300']">
      <div class="px-6 py-5 border-b border-slate-200">
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 rounded bg-gradient-to-br from-indigo-600 to-purple-600"></div>
          <div>
            <div class="text-slate-900 dark:text-white font-bold">Management Score</div>
            <div class="text-xs text-slate-500 dark:text-slate-400">{{ roleLabel().toUpperCase() }}</div>
          </div>
        </div>
      </div>
      <nav class="flex-1 px-3 py-4 space-y-1 animate-fade-in">
        <RouterLink
          v-for="item in menuItems"
          :key="item.name"
          :to="item.path"
          :aria-disabled="item.disabled ? 'true' : 'false'"
          class="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200
                 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800
                 focus:outline-none focus:ring-2 focus:ring-brand-primary"
          active-class="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
        >
          <span>{{ item.icon }}</span>
          <span class="font-medium" :class="item.disabled ? 'opacity-60' : ''">{{ item.name }}</span>
        </RouterLink>
      </nav>
      <div class="px-6 py-4 border-t border-slate-200 dark:border-slate-700">
        <div class="text-sm text-slate-500 dark:text-slate-400 mb-2 truncate">{{ userEmail() }}</div>
        <div class="mb-3 flex items-center justify-between">
          <span class="text-xs text-slate-600 dark:text-slate-300">Tema</span>
          <button
            @click="toggleTheme"
            class="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition duration-300"
          >
            {{ isDark ? 'Dark' : 'Light' }}
          </button>
        </div>
        <button
          v-if="authStore.isLoggedIn"
          @click="handleLogout"
          class="w-full px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Logout
        </button>
        <RouterLink v-else to="/login" class="w-full inline-block text-center px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          Login
        </RouterLink>
      </div>
    </aside>
    <main class="flex-1 flex flex-col">
      <header v-if="!isFullMode" class="bg-white dark:bg-[#1a1a1a] border-b border-slate-200 dark:border-slate-700">
        <div class="px-6 py-4 flex items-center justify-between">
          <div class="text-lg font-semibold text-slate-900 dark:text-white">
            {{ (route.name ? route.name.toString().toUpperCase().replace(/-/g, ' ') : 'DASHBOARD') }}
          </div>
          <div class="flex items-center gap-2">
            <button @click="collapsed = !collapsed" class="px-3 py-2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition duration-300">
              {{ collapsed ? 'Expand' : 'Collapse' }}
            </button>
          </div>
        </div>
      </header>
      <div class="p-6 animate-fade-in text-slate-900 dark:text-slate-200">
        <slot></slot>
      </div>
    </main>
  </div>
</template>
