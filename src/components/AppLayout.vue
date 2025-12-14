<script setup>
import { supabase } from '@/supabaseClient.js';
import { useRouter } from 'vue-router';
import { ref } from 'vue';

const router = useRouter();
const props = defineProps({
    userRole: String // Menerima role user dari App.vue
});

// Menu Navigasi disesuaikan berdasarkan role
const adminMenu = [
    { name: 'Dashboard Admin', path: '/admin', icon: '📈' },
    { name: 'Management Event', path: '/admin/events', icon: '🗓️' },
    { name: 'Input Score', path: '/admin/scores', icon: '✏️' },
    { name: 'User & Role', path: '/admin/users', icon: '👤' },
];

const operatorMenu = [
    { name: 'Dashboard Operator', path: '/', icon: '🏠' },
    { name: 'Input Score', path: '/input', icon: '✏️' },
];

const publicMenu = [
    { name: 'Dashboard Publik', path: '/', icon: '🏆' },
];

const currentMenu = ref(props.userRole === 'admin' ? adminMenu : props.userRole === 'operator' ? operatorMenu : publicMenu);

// Logout Handler
const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
};
</script>

<template>
    <div class="app-container">
        <aside class="sidebar">
            <div class="logo-area">
                <h2 class="logo-text">Score CMS</h2>
                <small class="role-tag">{{ props.userRole ? props.userRole.toUpperCase() : 'PUBLIK' }}</small>
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
            
            <div v-if="props.userRole" class="logout-section">
                <button @click="handleLogout" class="btn-logout">
                    🚪 Logout
                </button>
            </div>
        </aside>

        <main class="main-content">
            <header class="top-header">
                <div class="header-left">
                    <span class="page-title">{{ $route.name.toUpperCase().replace('-', ' ') }}</span>
                </div>
                <div class="header-right">
                    <span v-if="props.userRole" class="user-info">
                        👤 {{ supabase.auth.currentUser?.email || 'Authenticated User' }}
                    </span>
                    <RouterLink v-else to="/login" class="btn-login">Login</RouterLink>
                </div>
            </header>
            
            <div class="content-wrapper">
                <slot></slot>
            </div>
        </main>
    </div>
</template>

<style scoped>
/* ========================================= */
/* 🌙 DARK MODE LAYOUT VARIABLES */
/* ========================================= */
:root {
    --color-primary: #3f51b5; /* Biru/Indigo untuk Aksen */
    --color-accent: #ffc107; /* Kuning untuk Tombol/Highlight */
    --bg-main: #1e1e1e;      /* Latar Belakang Utama Gelap */
    --bg-sidebar: #2b2b2b;   /* Background Sidebar Lebih Gelap */
    --text-light: #e0e0e0;
    --text-muted: #aaaaaa;
    --border-light: #333333;
}

.app-container {
    display: flex;
    min-height: 100vh;
}

/* -------------------- SIDEBAR -------------------- */
.sidebar {
    width: 250px;
    background-color: var(--bg-sidebar);
    padding: 20px 0;
    display: flex;
    flex-direction: column;
    color: var(--text-light);
    border-right: 1px solid var(--border-light);
    box-shadow: 2px 0 5px rgba(0, 0, 0, 0.5);
}

.logo-area {
    text-align: center;
    padding: 0 20px 30px;
    border-bottom: 1px solid var(--border-light);
    margin-bottom: 20px;
}
.logo-text {
    color: var(--color-primary);
    margin-bottom: 5px;
}
.role-tag {
    color: var(--color-accent);
    font-size: 0.8em;
    padding: 3px 8px;
    border: 1px solid var(--color-accent);
    border-radius: 4px;
}

.main-nav {
    flex-grow: 1;
    padding: 0 10px;
}

.nav-item {
    display: block;
    padding: 12px 15px;
    margin: 5px 0;
    color: var(--text-light);
    text-decoration: none;
    border-radius: 6px;
    transition: background-color 0.2s, color 0.2s;
}

.nav-item:hover {
    background-color: #3a3a3a;
}

.nav-item.active {
    background-color: var(--color-primary);
    color: white;
    font-weight: bold;
}

.logout-section {
    padding: 20px;
    border-top: 1px solid var(--border-light);
}

.btn-logout {
    width: 100%;
    background-color: #dc3545; /* Merah untuk logout */
    color: white;
    border: none;
    padding: 10px;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.2s;
}
.btn-logout:hover {
    background-color: #c82333;
}

/* -------------------- MAIN CONTENT -------------------- */
.main-content {
    flex-grow: 1;
    background-color: var(--bg-main);
    display: flex;
    flex-direction: column;
}

.top-header {
    padding: 15px 30px;
    background-color: var(--bg-sidebar); /* Top header sama dengan sidebar */
    border-bottom: 1px solid var(--border-light);
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: var(--text-light);
}

.page-title {
    font-size: 1.2em;
    font-weight: bold;
    color: var(--color-accent); /* Judul Halaman di header */
}

.user-info {
    color: var(--text-muted);
}
.btn-login {
    background-color: var(--color-primary);
    color: white;
    padding: 8px 15px;
    text-decoration: none;
    border-radius: 6px;
    transition: background-color 0.2s;
}

.content-wrapper {
    padding: 30px;
    flex-grow: 1;
}

/* Global Dark Mode Style (untuk body app secara umum) */
body {
    background-color: var(--bg-main); 
}
</style>