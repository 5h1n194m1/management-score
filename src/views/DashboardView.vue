<template>
  <div>
    <div class="card welcome-card">
      <h1>Dashboard Publik</h1>
      <p class="lead">Ringkasan event yang sedang berlangsung dan telah selesai.</p>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      Memuat data event...
    </div>

    <div v-else-if="error" class="error-alert">
      🚨 Error Koneksi: {{ error }}. Harap periksa koneksi Supabase.
    </div>

    <div v-else>
      <div class="metrics-grid">
        <div class="metric-card card live-card">
          <h3>Event LIVE</h3>
          <p class="metric-value">{{ liveEventsCount }}</p>
        </div>
        <div class="metric-card card completed-card">
          <h3>Event SELESAI</h3>
          <p class="metric-value">{{ completedEventsCount }}</p>
        </div>
        <div class="metric-card card total-card">
          <h3>Total Event Publik</h3>
          <p class="metric-value">{{ totalPublicEvents }}</p>
        </div>
      </div>

      <div class="card data-card">
        <h2>Daftar Event Aktif</h2>

        <table class="event-table" v-if="totalPublicEvents > 0">
          <thead>
            <tr>
              <th>No</th>
              <th>Nama Event</th>
              <th>Status</th>
              <th>Dibuat Tanggal</th>
              <th class="text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(event, index) in events" :key="event.id">
              <td>{{ index + 1 }}</td>
              <td>{{ event.title }}</td>
              <td>
                <span :class="['status-badge', event.status]">{{ event.status.toUpperCase() }}</span>
              </td>
              <td>{{ new Date(event.created_at).toLocaleDateString('id-ID') }}</td>
              <td class="text-right">
                <button class="btn btn-view">Lihat Score</button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="no-events-message">
          Tidak ada event yang berstatus LIVE atau COMPLETED saat ini.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { supabase } from '@/supabaseClient.js';

const events = ref([]);
const loading = ref(true);
const error = ref(null);

const fetchEvents = async () => {
    loading.value = true;
    error.value = null;

    const { data, error: fetchError } = await supabase
        .from('events')
        .select('id, title, status, created_at');

    if (fetchError) {
        error.value = fetchError.message;
    } else {
        events.value = data;
    }
    loading.value = false;
};

const liveEventsCount = computed(() => {
    return events.value.filter(e => e.status === 'live').length;
});

const completedEventsCount = computed(() => {
    return events.value.filter(e => e.status === 'completed').length;
});

const totalPublicEvents = computed(() => {
    return liveEventsCount.value + completedEventsCount.value;
});

onMounted(() => {
    fetchEvents();
});
</script>

<style scoped>
/* Styling untuk Dashboard */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.metric-card {
  padding: 20px;
  background-color: #2d2d2d;
  color: white;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.card h3 {
  margin-bottom: 10px;
  font-size: 1.2em;
  font-weight: bold;
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
</style>
