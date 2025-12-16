<script setup>
import { ref } from 'vue';
import { useAuth } from '@/stores/auth';
import { useRouter } from 'vue-router';
import { useThemeStore } from '@/stores/theme'; 

const authStore = useAuth();
const router = useRouter();
const themeStore = useThemeStore(); 

// State untuk mengontrol visibilitas sidebar
const isSidebarOpen = ref(true);

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value;
};

const handleLogout = () => {
  authStore.signOut();
  router.push('/login'); 
};
</script>

<template>
  <div class="min-h-screen flex bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
    
    <aside 
      class="flex-shrink-0 transition-all duration-300 ease-in-out 
             bg-white dark:bg-gray-800 shadow-lg border-r border-gray-200 dark:border-gray-700
             fixed md:static z-30" 
      :class="{ 
        'w-64': isSidebarOpen, 
        'w-0 overflow-hidden md:w-0': !isSidebarOpen,
        'hidden md:block': isSidebarOpen // Pastikan hanya terlihat jika terbuka di desktop
      }"
    >
      <div class="p-4 text-center border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-xl font-bold text-indigo-600 dark:text-indigo-400">Management Score</h2>
      </div>
      <nav class="p-4 space-y-2">
        <router-link 
          to="/" 
          class="block p-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-gray-700 transition duration-150"
          :class="{'bg-indigo-50 dark:bg-gray-700 font-semibold text-indigo-700 dark:text-indigo-400': $route.path === '/'}"
        >
            Dashboard Operator
        </router-link>
        <router-link 
          to="/manage-event" 
          class="block p-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-gray-700 transition duration-150"
          :class="{'bg-indigo-50 dark:bg-gray-700 font-semibold text-indigo-700 dark:text-indigo-400': $route.path === '/manage-event'}"
        >
            Manajemen Event
        </router-link>
      </nav>
    </aside>

    <div 
      class="flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out"
    >
      <header class="bg-white dark:bg-gray-800 shadow-md border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div class="max-w-full mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          
          <div class="flex items-center space-x-4">
              <button @click="toggleSidebar" class="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition duration-150" title="Toggle Sidebar">
                  
                  <svg v-if="!isSidebarOpen" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                  
                  <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7 7-7m4 14l7-7-7-7"></path></svg>
              </button>
              
              <h1 class="text-xl font-bold text-gray-900 dark:text-white hidden sm:block">
                Dashboard {{ authStore.userRole?.toUpperCase() || 'Operator' }}
              </h1>
          </div>


          <div class="flex items-center space-x-4">
            <button 
                @click="themeStore.toggleDark" 
                class="p-2 rounded-full transition duration-200"
                :class="themeStore.isDark ? 'text-yellow-400 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-200'"
                title="Toggle Dark/Light Mode"
            >
                <svg v-if="themeStore.isDark" class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3a9 9 0 00-8.631 7.15c.015.066-.022.13-.086.155A7.001 7.001 0 0012 21a9 9 0 008.631-7.15c-.015-.066.022-.13.086-.155A7.001 7.001 0 0012 3z"/></svg>
                <svg v-else class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm8.707 3.707a1 1 0 00-1.414 0L17.586 6.5a1 1 0 101.414 1.414l1.707-1.707a1 1 0 000-1.414zM21 12h-1a1 1 0 110-2h1a1 1 0 110 2zM3 12h1a1 1 0 110-2H3a1 1 0 110 2zm16.707 13.293a1 1 0 00-1.414 0L17.586 16.5a1 1 0 101.414 1.414l1.707-1.707a1 1 0 000-1.414zM5.293 17.707a1 1 0 001.414 0L6.5 17.586a1 1 0 10-1.414-1.414l-1.707 1.707a1 1 0 000 1.414zM12 21a1 1 0 01-1-1v-1a1 1 0 112 0v1a1 1 0 01-1 1z"/></svg>
            </button>
            
            <button 
              @click="handleLogout" 
              class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition duration-150 text-sm font-semibold shadow"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main class="flex-1 overflow-x-hidden overflow-y-auto">
        <slot />
      </main>
    </div>
  </div>
</template>