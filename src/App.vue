<script setup>
import { ref, onMounted } from 'vue';
import { RouterView, useRouter } from 'vue-router';
import { supabase } from '@/supabaseClient.js'; 
import AppLayout from '@/components/AppLayout.vue'; 

const router = useRouter();
const loading = ref(true);
const session = ref(null);
const userRole = ref('guest'); 

/**
 * Fungsi untuk mengambil role pengguna dari tabel profiles
 */
// C:\management-score\src\App.vue

/**
 * Fungsi untuk mengambil role pengguna dari tabel profiles
 */
const fetchUserRole = async (userId) => {
    console.log(`LOG: Starting fetchUserRole for ID: ${userId}`);
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('role') // Kita hanya butuh kolom 'role'
            .eq('id', userId) 
            .single(); // Gunakan single untuk memastikan hanya satu baris

        if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found (ini normal jika user belum punya profile)
            console.error("LOG: Supabase Query Error:", error.message, error.code);
            throw error; 
        }
        
        // Mengembalikan role, atau 'user' sebagai default jika profile tidak ditemukan
        const role = profile?.role || 'user';
        console.log(`LOG: Successfully fetched role: ${role}`);
        return role; 
    } catch (e) {
        console.error("LOG: FATAL Error during fetchUserRole. Returning 'user'.", e.message);
        // Jika ada error fatal (timeout, koneksi, dll.), kita tetap kembalikan default
        return 'user'; 
    }
};

/**
 * Menangani redirect berdasarkan role dan rute saat ini.
 */
const handleAuthRedirect = (role, currentRoute) => {
    const currentPath = currentRoute.path;
    const requiresAuth = currentRoute.meta.requiresAuth;
    const targetPath = (role === 'admin') 
        ? '/admin' 
        : (role === 'operator' ? '/dashboard' : '/');

    // 1. Redirect Login ke Dashboard jika sudah Auth
    if (session.value && currentPath === '/login') {
        router.push(targetPath);
        return;
    }

    // 2. Redirect jika mencoba akses rute terlarang (Admin Area)
    if (currentPath.startsWith('/admin') && role !== 'admin') {
        router.push(targetPath); 
        return;
    }

    // 3. Redirect ke Login jika rute memerlukan otentikasi tetapi tidak ada sesi
    if (requiresAuth && !session.value && currentPath !== '/login') {
        router.push('/login');
        return;
    }
    
    // 4. Redirect default untuk user baru jika login berhasil ke non-dashboard
    if (session.value && (currentPath === '/' || currentPath === '/login') && currentPath !== targetPath) {
        if (role !== 'guest') {
             router.push(targetPath);
        }
    }
};


// Setup Supabase listener dan inisialisasi sesi
onMounted(() => {
    console.log("APP INIT: Component Mounted, Starting Supabase Check...");
    
    // 1. Listener utama untuk menangani perubahan state (login/logout)
    supabase.auth.onAuthStateChange(async (event, currentSession) => {
        console.log(`AUTH CHANGE DETECTED: Event: ${event}, Session Exists: ${!!currentSession}`);
        session.value = currentSession;
        
        try {
            if (currentSession) {
                userRole.value = await fetchUserRole(currentSession.user.id);
            } else {
                userRole.value = 'guest';
            }
        } catch (e) {
            console.error("LOG: Critical Auth State Change Error during fetchRole:", e);
            userRole.value = 'guest'; 
        } finally {
            handleAuthRedirect(userRole.value, router.currentRoute.value);
            loading.value = false;
            console.log("LOG: onAuthStateChange FINISHED. Loading = false.");
        }
    });
    
    // 2. Cek Sesi Awal untuk Inisialisasi
    console.log("LOG: Calling supabase.auth.getSession() for initial load...");
    
    supabase.auth.getSession()
        .then(async ({ data: { session: currentSession } }) => {
            console.log(`LOG: getSession() RESOLVED. Session Exists: ${!!currentSession}`);
            
            if (!currentSession) {
                session.value = null;
                userRole.value = 'guest';
            } else {
                session.value = currentSession;
                // Ambil role hanya jika sesi ada dan listener belum memicu
                if (loading.value) {
                    userRole.value = await fetchUserRole(currentSession.user.id);
                }
            }

            if (loading.value) {
                 handleAuthRedirect(userRole.value, router.currentRoute.value);
                 loading.value = false; // FINALLY, hentikan loading.
                 console.log("LOG: Initial getSession FINISHED. Loading = false.");
            }

        })
        .catch(e => {
            // TANGANI KEGAGALAN JARINGAN/API FATAL
            console.error("FATAL ERROR: getSession FAILED (Network/API Key Error)", e);
            session.value = null;
            userRole.value = 'guest';
            loading.value = false;
            handleAuthRedirect(userRole.value, router.currentRoute.value);
            console.log("LOG: getSession CATCH finished. Loading = false.");
        });
});

// Watcher untuk menangani redirect navigasi (dibiarkan sama)
router.afterEach((to) => {
    if (!loading.value) { 
        handleAuthRedirect(userRole.value, to);
    }
});
</script>

<template>
    <div v-if="loading" class="full-page-loading">
        <div class="spinner"></div>
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
/* (Styles tetap sama seperti sebelumnya) */
.full-page-loading {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100vh;
    font-size: 1.2em;
    color: #aaaaaa; 
    background-color: #121212; 
}
.spinner {
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-top: 4px solid var(--color-primary, #3f51b5);
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
    margin-bottom: 15px;
}
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
</style>