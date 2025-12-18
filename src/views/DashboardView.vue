<template>
  <div class="p-6 max-w-7xl mx-auto">
    <!-- Header Section -->
    <div class="flex justify-between items-center mb-8">
      <h1 class="text-2xl font-bold dark:text-white">Daftar Event</h1>
      <button @click="handleCreateEvent" :disabled="isCreating" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
        {{ isCreating ? 'Menyiapkan...' : '+ Buat Event Baru' }}
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-10 text-gray-500">Memuat event...</div>
    
    <!-- Event Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div v-for="event in events" :key="event.id" class="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border dark:border-gray-700">
        <h3 class="font-bold text-lg mb-2 dark:text-white">{{ event.title }}</h3>
        <p class="text-sm text-gray-500 mb-4">Dibuat: {{ new Date(event.created_at).toLocaleDateString() }}</p>
        <div class="flex gap-2">
          <router-link :to="`/manager/${event.id}`" class="flex-1 text-center py-2 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 font-medium">
            Kelola
          </router-link>
          <router-link :to="`/live/${event.id}`" class="px-3 py-2 bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100">
            👁️
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from '@/supabaseClient';

const events = ref([]);
const isLoading = ref(true);
const isCreating = ref(false);
const router = useRouter();

const fetchEvents = async () => {
  isLoading.value = true;
  const { data, error } = await supabase.from('events').select('*').order('created_at', { ascending: false });
  if (!error) events.value = data;
  isLoading.value = false;
};

const handleCreateEvent = async () => {
  isCreating.value = true;
  try {
    // 1. Ambil user yang sedang login
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      alert("Sesi berakhir, silakan login kembali.");
      return;
    }

    // 2. Insert ke tabel events
    const { data: newEvent, error: evError } = await supabase
      .from('events')
      .insert([{
        title: 'Turnamen Baru ' + new Date().toLocaleDateString(),
        admin_id: user.id, // WAJIB ADA
        status: 'draft'
      }])
      .select()
      .single();

    if (evError) throw evError;

    // 3. (Opsional) Langsung buatkan 1 Pot default agar tidak kosong
    await supabase.from('pots').insert([{
      event_id: newEvent.id,
      name: 'Group Stage',
      display_order: 1
    }]);

    // 4. Redirect ke halaman manager
    router.push(`/manager/${newEvent.id}`);
    
  } catch (err) {
    console.error("Gagal membuat event:", err);
    alert("Gagal: " + err.message);
  } finally {
    isCreating.value = false;
  }
};

onMounted(fetchEvents);
</script>

<style scoped>
/* Styling for Event List */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.card {
  padding: 20px;
  background-color: #fff;
  color: #333;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.card h1 {
  font-size: 1.5em;
  margin-bottom: 10px;
}

.card .card-title {
  font-size: 1.2em;
  font-weight: bold;
  margin-bottom: 10px;
}

.card .metric-value {
  font-size: 2em;
  font-weight: bold;
}

.card .live-card { background-color: #5cb85c; }
.card .completed-card { background-color: #5bc0de; }
.card .total-card { background-color: #f0ad4e; }

.event-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95em;
  margin-top: 20px;
}

.event-table th, .event-table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #444;
}

.event-table th {
  background-color: #3a3a3a;
  color: white;
}

.event-table tr:hover {
  background-color: #2b2b2b;
}

.status-badge {
  padding: 5px 10px;
  border-radius: 12px;
  font-weight: bold;
  color: #fff;
}

.status-badge.live { background-color: #5cb85c; }
.status-badge.completed { background-color: #5bc0de; }

.btn-view {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 5px;
  cursor: pointer;
}

.btn-view:hover {
  background-color: #218838;
}

.no-events-message {
  font-style: italic;
  color: #aaa;
  text-align: center;
}

/* Additional Styling for Buttons */
button:disabled {
  opacity: 0.5;
}
</style>
