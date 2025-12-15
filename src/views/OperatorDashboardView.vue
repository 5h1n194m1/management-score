<script setup>
import { useAuth } from '@/stores/auth';
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from '@/supabaseClient.js';

const authStore = useAuth();
const router = useRouter();
const operatorData = ref(null);
const isLoading = ref(true);

const fetchOperatorData = async () => {
    isLoading.value = true;
    // --- Lakukan Fetch Data DARI API yang membutuhkan token Auth ---
    // Contoh: Data score yang bisa di-edit
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulasi loading API
    operatorData.value = {
        title: 'Manajemen Skor Event Aktif',
        scores: [
            { id: 1, team: 'Tim Alpha', score: 95, action: 'Edit/Delete' },
            { id: 2, team: 'Tim Beta', score: 88, action: 'Edit/Delete' },
        ]
    };
    isLoading.value = false;
};

onMounted(fetchOperatorData);

const handleLogin = () => {
  router.push('/login');
};

const handleLogout = async () => {
  await supabase.auth.signOut();
  authStore.clearAuth();
  router.push('/');
};
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-end">
      <button
        v-if="!authStore.isLoggedIn"
        @click="handleLogin"
        class="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
      >
        Login
      </button>
      <button
        v-else
        @click="handleLogout"
        class="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
      >
        Logout
      </button>
    </div>
    <div class="rounded-xl bg-white border border-slate-200 p-4 shadow">
      <h1 class="text-2xl font-bold text-slate-900">
        Dashboard Operator
      </h1>
      <div class="text-slate-500">Role: {{ authStore.userRole.toUpperCase() }}</div>
    </div>
    
    <div v-if="isLoading" class="p-8 bg-white rounded-xl shadow text-center text-indigo-600">
        Memuat data manajemen...
    </div>

    <div v-else class="bg-white p-6 rounded-xl shadow border border-slate-200 animate-fade-in">
      <p class="text-xl font-semibold mb-4 text-slate-900">{{ operatorData.title }}</p>
      
      <button class="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
        + Tambah Skor Baru
      </button>

      <table class="min-w-full divide-y divide-slate-200 mt-6 animate-slide-up">
        <thead class="bg-slate-50">
          <tr>
            <th class="px-3 py-2 text-left text-slate-600">Tim</th>
            <th class="px-3 py-2 text-left text-slate-600">Skor Saat Ini</th>
            <th class="px-3 py-2 text-left text-slate-600">Aksi</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-slate-100">
          <tr v-for="item in operatorData.scores" :key="item.id">
            <td class="px-3 py-2 text-slate-900">{{ item.team }}</td>
            <td class="px-3 py-2 text-slate-700">{{ item.score }}</td>
            <td class="px-3 py-2">
                <button class="text-indigo-600 hover:text-indigo-800 mr-3">Edit</button>
                <button class="text-rose-600 hover:text-rose-800">Hapus</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
