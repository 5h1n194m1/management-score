<script setup>
import { ref, onMounted, computed } from 'vue';
import { supabase } from '@/supabaseClient.js';

const events = ref([]);
const loading = ref(true);
const error = ref(null);
const userId = ref(null); // Untuk menampilkan ID user di dashboard admin

const fetchAllEvents = async () => {
    loading.value = true;
    error.value = null;

    try {
        // Ambil ID user dari sesi Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            userId.value = user.id;
        }

        // Query Admin: Mengambil SEMUA event.
        const { data, error: fetchError } = await supabase
            .from('events') 
            .select('id, title, status, created_at'); 

        if (fetchError) {
            console.error("[ADMIN DASHBOARD ERROR]", fetchError);
            error.value = fetchError.message || "Gagal mengambil data event admin.";
        } else {
            events.value = data;
        }
    } catch (e) {
        console.error("Kesalahan umum di fetchAllEvents:", e);
        error.value = "Kesalahan umum saat memuat data.";
    } finally {
        loading.value = false;
    }
};

// Hitungan Komputasi untuk Metric Cards Admin
const liveEventsCount = computed(() => events.value.filter(e => e.status === 'live').length);
const draftEventsCount = computed(() => events.value.filter(e => e.status === 'draft').length);
const totalEvents = computed(() => events.value.length);


onMounted(() => {
    fetchAllEvents();
});
</script>

<template>
    <div>
        <div class="card welcome-card">
            <h1>ADMIN DASHBOARD</h1>
            <p class="lead">Selamat datang, Administrator. Anda dapat melihat, mengedit, dan mengelola semua data event.</p>
            <p class="role-info">Anda login sebagai Admin (ID: {{ userId || '...' }}).</p>
        </div>

        <div v-if="loading" class="loading-state">
            <div class="spinner"></div>
            Memuat semua event...
        </div>

        <div v-else-if="error" class="error-alert">
            🚨 Error saat mengambil data Admin: {{ error }}
            <p><strong>Cek RLS:</strong> Pastikan Policy RLS Admin Anda mengizinkan SELECT semua data.</p>
        </div>

        <div v-else>
            <div class="metrics-grid">
                <div class="metric-card card total-card">
                    <h3>Total Semua Event</h3>
                    <p class="metric-value">{{ totalEvents }}</p>
                </div>
                <div class="metric-card card draft-card">
                    <h3>Event DRAFT</h3>
                    <p class="metric-value">{{ draftEventsCount }}</p>
                </div>
                <div class="metric-card card live-card">
                    <h3>Event LIVE</h3>
                    <p class="metric-value">{{ liveEventsCount }}</p>
                </div>
            </div>

            <div class="card data-card">
                <h2>Management Event (Semua Status)</h2>

                <table class="event-table" v-if="events.length">
                    <thead>
                        <tr>
                            <th>No</th>
                            <th>Judul Event</th>
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
                                <button class="btn btn-action edit">Edit</button>
                                <button class="btn btn-action delete">Hapus</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <p v-else class="no-events-message">Tidak ada event di database saat ini.</p>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* ========================================= */
/* 🌙 THEME VARIABLES (Hanya untuk referensi) */
/* ========================================= */
:root {
    --color-primary: #3f51b5;
    --color-accent: #f0ad4e;
    --bg-card: #1e1e1e;
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
    color: var(--text-light);
}
h1, h2, h3 {
    color: var(--text-light);
}

/* 1. WELCOME CARD ADMIN */
.welcome-card h1 {
    font-size: 2em;
    color: #dc3545; /* Admin menggunakan warna merah untuk penekanan */
}
.welcome-card .lead, .role-info {
    color: var(--text-muted);
}
.role-info {
    font-weight: bold;
    margin-top: 10px;
}

/* 2. METRIC CARDS (Admin View) */
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
/* Warna Metrik Admin */
.total-card .metric-value { color: #dc3545; } /* Merah */
.draft-card .metric-value { color: #f0ad4e; } /* Orange */
.live-card .metric-value { color: #5cb85c; } /* Hijau */


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
.status-badge.draft { background-color: #f0ad4e; } /* Orange */
.status-badge.live { background-color: #5cb85c; } /* Hijau */
.status-badge.completed { background-color: #5bc0de; } /* Biru */

/* Action Buttons */
.btn-action {
    border: none;
    padding: 6px 10px;
    border-radius: 4px;
    cursor: pointer;
    margin-left: 5px;
    font-size: 0.8em;
    transition: opacity 0.2s;
}
.btn-action.edit {
    background-color: var(--color-primary);
    color: white;
}
.btn-action.delete {
    background-color: #dc3545;
    color: white;
}
.btn-action:hover {
    opacity: 0.9;
}

.text-right {
    text-align: right;
}
.no-events-message {
    font-style: italic;
    color: var(--text-muted);
    text-align: center;
    padding: 20px;
    background-color: #2b2b2b;
    border-radius: 8px;
}

.loading-state, .error-alert {
    text-align: center;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 25px;
}
.error-alert {
    background-color: #4a1e1e;
    color: #ffb3b3;
    border: 1px solid #723c3c;
}
</style>