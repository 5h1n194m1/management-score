<script setup>
import { ref, onMounted } from 'vue';
import { RouterView, useRouter } from 'vue-router'
import { supabase } from '@/supabaseClient.js';
// Pastikan path import AppLayout sudah benar, disarankan menggunakan alias @
import AppLayout from '@/components/AppLayout.vue'; 

const router = useRouter();
const loading = ref(true); 
const session = ref(null); 
const userRole = ref(null); 

const updateSession = async () => {
    loading.value = true;
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    session.value = currentSession;
    userRole.value = null; 
    
    if (currentSession) {
        // Ambil Role dari profiles
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', currentSession.user.id)
            .single();

        if (profile) {
            userRole.value = profile.role;
        }

        // Logic Redirect Otomatis
        if (userRole.value === 'admin' && router.currentRoute.value.path !== '/admin') {
            router.push('/admin');
        } else if (userRole.value !== 'admin' && router.currentRoute.value.path === '/admin') {
            // Jika non-admin mencoba akses /admin
            router.push('/');
        }
    } else {
        // Jika sesi hilang, pastikan user diarahkan ke login jika berada di area terproteksi
        if (router.currentRoute.value.meta.requiresAuth) {
            router.push('/login');
        }
    }
    
    loading.value = false;
};

// Cek status sesi saat komponen dimuat dan setiap ada perubahan auth
onMounted(() => {
    updateSession();
    supabase.auth.onAuthStateChange(() => {
        updateSession(); 
    });
});

// Logout handler dihapus dari sini karena sudah dipindahkan ke AppLayout.vue

</script>

<template>
    <div v-if="loading" class="full-page-loading">
        Mengautentikasi pengguna dan mengambil role...
    </div>
    
    <AppLayout 
        v-else-if="$route.path !== '/login'" 
        :userRole="userRole"
    >
        <RouterView />
    </AppLayout>

    <RouterView v-else />
</template>

<style scoped>
/* Tambahkan styling minimal untuk loading state agar lebih profesional */
.full-page-loading {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    font-size: 1.2em;
    color: #888;
    background-color: #f4f4f4; /* Atau gunakan warna gelap jika dark mode sudah aktif di body */
}
</style>