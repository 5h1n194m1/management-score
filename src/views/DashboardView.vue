<template>
  <div class="p-6 max-w-7xl mx-auto min-h-screen bg-gray-50 dark:bg-gray-900">
    <div class="flex justify-between items-center mb-8">
      <div>
        <h1 class="text-2xl font-bold dark:text-white">Tournament Dashboard</h1>
        <p class="text-sm text-gray-500">Selamat datang, {{ userProfile?.username || 'Admin' }}</p>
      </div>
      
      <button 
        @click="handleCreateEvent" 
        :disabled="isCreating"
        class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
      >
        <span v-if="isCreating" class="animate-spin text-lg">⏳</span>
        {{ isCreating ? 'Creating...' : '+ Create New Event' }}
      </button>
    </div>

    <div v-if="isLoading" class="flex justify-center py-20">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
    </div>

    <div v-else-if="events.length === 0" class="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
      <p class="text-gray-500 dark:text-gray-400">Belum ada event. Mulai dengan membuat event baru!</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="event in events" :key="event.id" class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
        <div class="flex justify-between items-start mb-4">
          <div class="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600">🏆</div>
          <span :class="['px-2 py-1 text-[10px] font-bold rounded uppercase', event.status === 'live' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600']">
            {{ event.status }}
          </span>
        </div>
        <h3 class="font-bold text-lg dark:text-white mb-1">{{ event.title }}</h3>
        <p class="text-xs text-gray-500 mb-6 font-mono">{{ event.id }}</p>
        
        <div class="flex gap-3">
          <router-link :to="`/manager/${event.id}`" class="flex-1 text-center py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition">
            Kelola
          </router-link>
          <router-link :to="`/live/${event.id}`" class="px-3 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 transition">
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
const userProfile = ref(null);
const router = useRouter();

const fetchUserAndEvents = async () => {
  isLoading.value = true;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    // Ambil profile user
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    userProfile.value = profile;

    // Ambil semua event (Jika admin, ambil semua. Jika operator, ambil yang relevan)
    const { data: eventsData, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    events.value = eventsData || [];
  } catch (err) {
    console.error(err);
  } finally {
    isLoading.value = false;
  }
};

const handleCreateEvent = async () => {
  if (isCreating.value) return;
  isCreating.value = true;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // 1. Insert Event
    const { data: newEvent, error: evError } = await supabase
      .from('events')
      .insert([{
        title: 'New Tournament ' + new Date().toLocaleDateString(),
        admin_id: user.id, // Pastikan ini UUID yang valid
        status: 'draft'
      }])
      .select()
      .single();

    if (evError) throw evError;

    // 2. Default Point Mapping (12 Slot)
    const pts = [12, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0];
    const mappings = pts.map((p, i) => ({
      event_id: newEvent.id,
      rank_position: i + 1,
      points: p
    }));
    await supabase.from('point_mapping').insert(mappings);

    // 3. Langsung buat 1 Pot awal
    await supabase.from('pots').insert([{
      event_id: newEvent.id,
      name: 'Pot A',
      display_order: 1
    }]);

    // Berhasil, refresh list
    await fetchUserAndEvents();
    alert('Event Berhasil Dibuat!');
    
  } catch (err) {
    alert('Gagal membuat event: ' + err.message);
  } finally {
    isCreating.value = false;
  }
};

onMounted(fetchUserAndEvents);
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
