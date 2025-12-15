<script setup>
import { supabase } from '@/supabaseClient.js'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuth()

const props = defineProps({
  userRole: { type: String, default: 'guest' }
})

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

const currentMenu = props.userRole === 'admin'
  ? adminMenu
  : (props.userRole === 'operator' ? operatorMenu : publicMenu)

const handleLogout = async () => {
  const { error } = await supabase.auth.signOut()
  if (!error) router.push('/login')
}

const userEmail = () => authStore.userData?.email || ''
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex">
    <aside class="w-72 bg-white border-r border-slate-200 flex flex-col">
      <div class="px-6 py-5 border-b border-slate-200">
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 rounded bg-gradient-to-br from-indigo-600 to-purple-600"></div>
          <div>
            <div class="text-slate-900 font-bold">Management Score</div>
            <div class="text-xs text-slate-500">{{ (props.userRole || 'guest').toUpperCase() }}</div>
          </div>
        </div>
      </div>
      <nav class="flex-1 px-3 py-4 space-y-1 animate-fade-in">
        <RouterLink
          v-for="item in currentMenu"
          :key="item.name"
          :to="item.path"
          class="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-all duration-200"
          active-class="bg-slate-100 text-slate-900"
        >
          <span>{{ item.icon }}</span>
          <span class="font-medium">{{ item.name }}</span>
        </RouterLink>
      </nav>
      <div class="px-6 py-4 border-t border-slate-200">
        <div class="text-sm text-slate-500 mb-2 truncate">{{ userEmail() }}</div>
        <button
          v-if="props.userRole !== 'guest'"
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
      <header class="bg-white border-b border-slate-200">
        <div class="px-6 py-4 flex items-center justify-between">
          <div class="text-lg font-semibold text-slate-900">
            {{ (route.name ? route.name.toString().toUpperCase().replace(/-/g, ' ') : 'DASHBOARD') }}
          </div>
          <div class="flex items-center gap-2"></div>
        </div>
      </header>
      <div class="p-6 animate-fade-in">
        <slot></slot>
      </div>
    </main>
  </div>
</template>
