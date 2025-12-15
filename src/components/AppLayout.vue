<script setup>
// import { defineProps } from 'vue';
import { supabase } from '@/supabaseClient.js';
import { useRouter, useRoute } from 'vue-router'; // <-- Tambahkan useRoute
import { useAuth } from '@/stores/auth'

// Inisialisasi router dan route
const router = useRouter();
const route = useRoute(); // <-- Digunakan untuk mengakses nama rute
const authStore = useAuth()

const props = defineProps({
    userRole: {
        type: String,
        default: 'guest' 
    }
});

// Menu navigasi sesuai dengan role
const adminMenu = [
    { name: 'Dashboard Admin', path: '/admin', icon: '📈' },
    { name: 'Management Event', path: '/admin/events', icon: '🗓️' },
    { name: 'Input Score', path: '/admin/scores', icon: '✏️' },
    { name: 'User & Role', path: '/admin/users', icon: '👤' },
];

const operatorMenu = [
    { name: 'Dashboard Operator', path: '/dashboard', icon: '🏠' },
    { name: 'Input Score', path: '/input', icon: '✏️' },
];

const publicMenu = [
    { name: 'Dashboard Publik', path: '/', icon: '🏆' },
];

// Menentukan menu berdasarkan role
const currentMenu = props.userRole === 'admin' 
    ? adminMenu 
    : (props.userRole === 'operator' ? operatorMenu : publicMenu);

// Logout handler
const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error("Logout Error:", error.message);
        alert("Gagal logout. Silakan coba lagi.");
    } else {
        router.push('/login');
    }
};

const getCurrentUserEmail = () => {
    return authStore.userData?.email || 'Authenticated User';
}
</script>

<template>
    <div class="app-layout">
        <aside class="sidebar">
            <div class="logo-area">
                <h2 class="logo-text">Score CMS</h2>
                <small class="role-tag">{{ (props.userRole || 'guest').toUpperCase() }}</small>
            </div>

            <nav class="main-nav">
                <RouterLink 
                    v-for="item in currentMenu" 
                    :key="item.name" 
                    :to="item.path"
                    class="nav-item"
                    active-class="active"
                >
                    {{ item.icon }} {{ item.name }}
                </RouterLink>
            </nav>

            <div v-if="props.userRole !== 'guest'" class="logout-section">
                <button @click="handleLogout" class="btn-logout">
                    🚪 Logout
                </button>
            </div>
        </aside>

        <main class="main-content">
            <header class="top-header">
                <div class="header-left">
                    <span class="page-title">{{ (route.name ? route.name.toString().toUpperCase().replace(/-/g, ' ') : 'BERANDA') }}</span>
                </div>
                <div class="header-right">
                    <span v-if="props.userRole !== 'guest'" class="user-info">
                        👤 {{ getCurrentUserEmail() }}
                    </span>
                    <RouterLink v-else to="/login" class="btn-login">Login</RouterLink>
                </div>
            </header>

            <div class="content-wrapper">
                <slot></slot> </div>
        </main>
    </div>
</template>

<style scoped>
/* ========================================= */
/* CSS Variables */
:root {
    --color-primary: #3f51b5; /* Biru/Indigo */
    --color-accent: #f0ad4e; /* Oranye/Kuning */
    --bg-main: #121212; /* Latar Belakang Gelap */
    --bg-sidebar: #1e1e1e; /* Sidebar Lebih Gelap */
    --text-light: #e0e0e0; /* Teks terang */
    --text-muted: #aaaaaa; /* Teks redup */
    --border-light: #333333; /* Border */
    --padding-base: 20px;
}
/* ========================================= */

.app-layout {
    display: flex;
    min-height: 100vh;
    background-color: var(--bg-main);
}

/* Sidebar */
.sidebar {
    width: 250px;
    background-color: var(--bg-sidebar);
    padding: var(--padding-base) 0;
    display: flex;
    flex-direction: column;
    color: var(--text-light);
    border-right: 1px solid var(--border-light);
    box-shadow: 2px 0 5px rgba(0, 0, 0, 0.5);
}

.logo-area {
    padding: 0 var(--padding-base) var(--padding-base) var(--padding-base);
    border-bottom: 1px solid var(--border-light);
    margin-bottom: var(--padding-base);
}
.logo-text {
    margin-bottom: 5px;
    color: white;
}
.role-tag {
    font-size: 0.8em;
    color: var(--color-accent);
    font-weight: bold;
    display: block;
}

.main-nav {
    flex-grow: 1; 
}

.nav-item {
    display: block;
    padding: 12px var(--padding-base); 
    color: var(--text-light);
    text-decoration: none;
    transition: background-color 0.2s, border-left 0.2s;
}

.nav-item:hover {
    background-color: #3a3a3a;
}

.nav-item.active {
    background-color: var(--color-primary);
    color: white;
    border-left: 5px solid var(--color-accent); 
    padding-left: 15px; /* Mengimbangi border 5px */
}

.logout-section {
    padding: var(--padding-base);
    border-top: 1px solid var(--border-light);
    margin-top: auto; 
}

/* Main Content and Header */
.main-content {
    flex-grow: 1;
    background-color: var(--bg-main);
    display: flex;
    flex-direction: column;
}

.top-header {
    padding: 15px 30px;
    background-color: var(--bg-sidebar); 
    border-bottom: 1px solid var(--border-light);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.page-title {
    font-size: 1.5em;
    color: var(--color-accent);
    font-weight: bold;
}

.user-info {
    color: var(--text-muted);
}

.content-wrapper {
    padding: 30px; 
    flex-grow: 1;
}

/* Buttons */
.btn-login {
    background-color: var(--color-primary);
    color: white;
    padding: 8px 15px;
    text-decoration: none;
    border-radius: 6px;
}

.btn-logout {
    width: 100%;
    background-color: #dc3545;
    color: white;
    padding: 10px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: bold;
    transition: background-color 0.2s;
}
.btn-logout:hover {
    background-color: #c82333;
}
</style>
