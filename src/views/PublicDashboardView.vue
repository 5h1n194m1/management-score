<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getPublicEvents } from '@/services/db.js'

const router = useRouter();
const isLoading = ref(true);
const fetchError = ref(null);
const events = ref([]);

const fetchPublicEvents = async () => {
  isLoading.value = true;
  fetchError.value = null;
  const { data, error } = await getPublicEvents();
  if (error) {
    fetchError.value = error.message || 'Gagal mengambil data dari server.';
    events.value = [];
  } else {
    events.value = data || [];
  }
  isLoading.value = false;
};

const goToLogin = () => router.push('/login');
const goToRecap = (id) => router.push(`/recap/${id}`);

onMounted(fetchPublicEvents);
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-10">
    <div class="w-full max-w-5xl bg-white p-10 rounded-2xl shadow space-y-8 border border-slate-200 animate-slide-up">
      <div class="flex items-center justify-between">
        <h1 class="text-3xl font-extrabold text-slate-900">Arctic Gorilla Live Score</h1>
        <button @click="goToLogin" class="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow hover:bg-indigo-700">
          Login
        </button>
      </div>

      <div v-if="isLoading" class="py-10 text-indigo-600">
        <p>Memuat event publik...</p>
      </div>
      <div v-else-if="fetchError" class="py-10 text-rose-600 font-semibold">
        <p>{{ fetchError }}</p>
      </div>
      <div v-else-if="events.length === 0" class="py-10 text-slate-500">
        <p>Tidak ada event LIVE/COMPLETED saat ini.</p>
      </div>
      <div v-else class="overflow-x-auto animate-fade-in">
        <table class="min-w-full divide-y divide-slate-200">
          <thead class="bg-slate-50">
            <tr>
              <th class="px-6 py-3 text-left text-sm font-semibold text-slate-700">No</th>
              <th class="px-6 py-3 text-left text-sm font-semibold text-slate-700">Nama Event</th>
              <th class="px-6 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
              <th class="px-6 py-3 text-right text-sm font-semibold text-slate-700">Aksi</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-slate-100">
            <tr v-for="(e, i) in events" :key="e.id" class="transition-colors duration-150 hover:bg-slate-50">
              <td class="px-6 py-3">{{ i + 1 }}</td>
              <td class="px-6 py-3">{{ e.title }}</td>
              <td class="px-6 py-3">
                <span class="px-2 py-1 rounded text-xs font-semibold"
                  :class="{
                    'bg-emerald-100 text-emerald-700': e.status==='live',
                    'bg-sky-100 text-sky-700': e.status==='completed'
                  }"
                >
                  {{ e.status.toUpperCase() }}
                </span>
              </td>
              <td class="px-6 py-3 text-right">
                <button @click="goToRecap(e.id)" class="px-3 py-2 bg-slate-700 text-white rounded hover:bg-slate-900">Lihat</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
