<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
// PASTIKAN PATH INI MENUNJUK KE FILE KONFIGURASI SUPABASE ANDA
import { supabase } from '@/supabaseClient.js'; 

const router = useRouter();
// Gunakan ref untuk menyimpan data hasil query Supabase
const publicScores = ref([]); 
const eventName = ref('Memuat Data Event...');
const isLoading = ref(true);
const fetchError = ref(null);

const fetchPublicData = async () => {
    isLoading.value = true;
    fetchError.value = null;

    // --- Lakukan Query ke Supabase ---
    // Ganti 'scores' dengan nama tabel Anda jika berbeda.
    // Ganti kolom 'team_name' dan 'total_score' dengan nama kolom yang benar.
    const { data, error } = await supabase
        .from('scores') // Ganti dengan nama tabel yang menyimpan skor publik
        .select('team_name, total_score') // Kolom yang ingin ditampilkan
        .order('total_score', { ascending: false }) // Urutkan dari skor tertinggi
        .limit(10); // Ambil 10 data teratas saja

    if (error) {
        console.error('Error fetching public data:', error);
        fetchError.value = 'Gagal mengambil data dari server. Coba muat ulang.';
        publicScores.value = [];
    } else {
        // Data berhasil diambil
        publicScores.value = data.map((item, index) => ({
            rank: index + 1,
            team: item.team_name, // Pastikan nama kolom di sini benar
            score: item.total_score, // Pastikan nama kolom di sini benar
        }));
        eventName.value = 'Papan Peringkat Event Terbaru'; // Ganti judul dinamis
    }

    isLoading.value = false;
};

const goToLogin = () => {
    router.push('/login');
};

onMounted(fetchPublicData);
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-10">
    <div class="w-full max-w-4xl bg-white p-10 rounded-xl shadow-2xl text-center space-y-8">
        
        <h1 class="text-4xl font-extrabold text-indigo-700">
            {{ eventName }}
        </h1>
        
        <p class="text-xl text-gray-600">
            Selamat datang di papan peringkat publik. Data diperbarui secara real-time (setelah Anda mengimplementasikan fitur real-time).
        </p>

        <div v-if="isLoading" class="py-10 text-indigo-500">
            <p>Memuat papan peringkat...</p>
        </div>

        <div v-else-if="fetchError" class="py-10 text-red-600 font-semibold">
            <p>{{ fetchError }}</p>
        </div>
        
        <div v-else-if="publicScores.length === 0" class="py-10 text-gray-500">
            <p>Belum ada data skor yang tersedia saat ini.</p>
        </div>

        <div v-else class="space-y-6">
             <h2 class="text-2xl font-bold text-gray-800 border-b pb-2">Top Skor Saat Ini</h2>
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-indigo-50">
                        <tr>
                            <th class="px-6 py-3 text-center text-sm font-semibold text-indigo-700 uppercase tracking-wider">Rank</th>
                            <th class="px-6 py-3 text-left text-sm font-semibold text-indigo-700 uppercase tracking-wider">Nama Tim</th>
                            <th class="px-6 py-3 text-center text-sm font-semibold text-indigo-700 uppercase tracking-wider">Skor</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-100">
                        <tr v-for="item in publicScores" :key="item.team" 
                            :class="{'bg-yellow-50 font-bold': item.rank === 1}">
                            <td class="px-6 py-4 whitespace-nowrap text-center text-lg text-gray-900">{{ item.rank }}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-left text-gray-700">{{ item.team }}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-center text-gray-700">{{ item.score }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="mt-8 pt-6 border-t border-gray-200">
                <p class="text-lg text-gray-700 mb-4">
                    Apakah Anda seorang juri atau operator?
                </p>
                <button @click="goToLogin" class="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-150">
                    Login ke Dashboard Manajemen
                </button>
            </div>
        </div>

    </div>
  </div>
</template>
