<script setup>
// (Script setup tetap sama, tidak ada perubahan di logika)
import { ref, onMounted, computed } from 'vue';
import { supabase } from '@/supabaseClient.js'; 

const events = ref([]);
const loading = ref(true);
const error = ref(null);

const fetchEvents = async () => {
    loading.value = true;
    error.value = null;

    // RLS bekerja di sini: hanya user Public/Operator yang melihat LIVE dan COMPLETED
    const { data, error: fetchError } = await supabase
        .from('events') 
        .select('id, title, status, created_at'); 

    if (fetchError) {
        console.error("Gagal mengambil data event:", fetchError);
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

<style scoped>
/* ========================================= */
/* 🌙 THEME VARIABLES (Hanya untuk referensi, aslinya di AppLayout) */
/* ========================================= */
:root {
    --color-primary: #3f51b5;
    --color-accent: #f0ad4e;
    --bg-card: #1e1e1e; /* Warna card sama dengan background sidebar/konten di AppLayout */
    --text-light: #e0e0e0;
    --text-muted: #aaaaaa;
    --border-color: #333333;
}

/* Base Card Style */
.card {
    background-color: var(--bg-card);
    padding: 30px;
    border-radius: 8px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
    margin-bottom: 25px;
    border: 1px solid var(--border-color);
    color: var(--text-light); /* Pastikan teks di dalam card terang */
}
h1, h2, h3 {
    color: var(--text-light);
}

/* Menghilangkan styling page level yang bentrok dengan AppLayout */
/* .dashboard-page { /* DIHAPUS */
/* .jumbotron { /* DIHAPUS dan diganti .card.welcome-card */
/* .content-section { /* DIHAPUS dan diganti .card.data-card */

/* 1. WELCOME CARD */
.welcome-card h1 {
    font-size: 2em;
    color: var(--color-primary); /* Aksen Biru/Indigo */
}
.welcome-card .lead {
    color: var(--text-muted);
}

/* 2. METRIC CARDS */
.metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
}
.metric-card {
    padding: 20px;
    transition: transform 0.2s;
}
.metric-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
}
.metric-card h3 {
    font-size: 1em;
    color: var(--text-muted);
    margin-bottom: 10px;
}
.metric-value {
    font-size: 2.2em;
    font-weight: bold;
}
/* Warna Metrik (Tetap Kontras) */
.live-card .metric-value { color: #5cb85c; }
.completed-card .metric-value { color: #5bc0de; }
.total-card .metric-value { color: #f0ad4e; }


/* 3. DATA TABLE */
.data-card h2 {
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 10px;
    margin-bottom: 15px;
}
.event-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.95em;
}
.event-table th, .event-table td {
    padding: 12px 15px;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-light);
}
.event-table th {
    background-color: #2b2b2b;
    color: var(--text-muted);
    font-weight: 600;
}
.event-table tr:hover {
    background-color: #242424; /* Hover row */
}

/* Status Badges */
.status-badge {
    padding: 4px 10px;
    border-radius: 12px;
    font-weight: bold;
    font-size: 0.85em;
    color: #121212;
}
.status-badge.live { background-color: #5cb85c; }
.status-badge.completed { background-color: #5bc0de; }

.btn-view {
    background-color: var(--color-accent);
    color: #121212;
    border: none;
    padding: 8px 15px;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.2s;
}
.btn-view:hover {
    background-color: #e8a03f;
}

.no-events-message {
    font-style: italic;
    color: var(--text-muted);
    text-align: center;
    padding: 20px;
    background-color: #2b2b2b;
    border-radius: 8px;
}
.text-right {
    text-align: right;
}
</style>