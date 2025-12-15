<script setup>
import { useAuth } from '@/stores/auth';
import { ref, onMounted } from 'vue';

const authStore = useAuth();
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
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-3xl font-bold text-gray-800">
        Dashboard Operator - {{ authStore.userRole.toUpperCase() }}
    </h1>
    
    <div v-if="isLoading" class="p-8 bg-white rounded-xl shadow-lg text-center text-indigo-500">
        Memuat data manajemen...
    </div>

    <div v-else class="bg-white p-6 rounded-xl shadow-lg">
      <p class="text-xl font-semibold mb-4 text-gray-700">{{ operatorData.title }}</p>
      
      <button class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
        + Tambah Skor Baru
      </button>

      <table class="min-w-full divide-y divide-gray-200 mt-6">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tim</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Skor Saat Ini</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="item in operatorData.scores" :key="item.id">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ item.team }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ item.score }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
                <button class="text-indigo-600 hover:text-indigo-900 mr-3">Edit</button>
                <button class="text-red-600 hover:text-red-900">Hapus</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>