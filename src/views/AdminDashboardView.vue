<script setup>
import { ref, onMounted, computed } from 'vue';
import { supabase } from '@/supabaseClient.js';
import MetricCard from '@/components/ui/MetricCard.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import { createEvent, deleteEvent } from '@/services/db.js'

const events = ref([]);
const loading = ref(true);
const error = ref(null);
const userId = ref(null);
const adding = ref(false)
const newTitle = ref('')
const newStatus = ref('draft')
const newDateTime = ref('')
const newDescription = ref('')
const newCategory = ref('')
const searchQuery = ref('')
const pageSize = ref(10)
const currentPage = ref(1)

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

const addEvent = async () => {
  if (!newTitle.value.trim()) return
  adding.value = true
  error.value = null
  try {
    const { error: insErr } = await createEvent(
      userId.value,
      newTitle.value.trim(),
      newStatus.value,
      newDateTime.value ? new Date(newDateTime.value).toISOString() : null,
      newDescription.value.trim() || null,
      newCategory.value.trim() || null
    )
    if (insErr) {
      error.value = insErr.message || 'Gagal menambah event'
    } else {
      newTitle.value = ''
      newStatus.value = 'draft'
      newDateTime.value = ''
      newDescription.value = ''
      newCategory.value = ''
      await fetchAllEvents()
    }
  } finally {
    adding.value = false
  }
}

const cancelAdd = () => {
  newTitle.value = ''
  newStatus.value = 'draft'
  newDateTime.value = ''
  newDescription.value = ''
  newCategory.value = ''
}

const filteredEvents = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return events.value
  return events.value.filter(e => (e.title || '').toLowerCase().includes(q))
})

const pagedEvents = computed(() => {
  const total = filteredEvents.value.length
  const pages = Math.max(1, Math.ceil(total / pageSize.value))
  if (currentPage.value > pages) currentPage.value = pages
  const start = (currentPage.value - 1) * pageSize.value
  return filteredEvents.value.slice(start, start + pageSize.value)
})

const handleDelete = async (id) => {
  if (!confirm('Hapus event ini? Tindakan tidak dapat dibatalkan.')) return
  const { error: delErr } = await deleteEvent(id)
  if (!delErr) {
    await fetchAllEvents()
  } else {
    error.value = delErr.message || 'Gagal menghapus event'
  }
}

// Hitungan Komputasi untuk Metric Cards Admin
const liveEventsCount = computed(() => events.value.filter(e => e.status === 'live').length);
const draftEventsCount = computed(() => events.value.filter(e => e.status === 'draft').length);
const totalEvents = computed(() => events.value.length);


onMounted(() => {
    fetchAllEvents();
});
</script>

<template>
  <div class="space-y-6 animate-fade-in">
    <SectionCard title="Admin Dashboard">
      <div class="text-slate-600">Anda login sebagai Admin (ID: {{ userId || '...' }}).</div>
    </SectionCard>

    <div v-if="loading" class="p-6 bg-white rounded-xl shadow text-indigo-600">Memuat semua event...</div>
    <div v-else-if="error" class="p-6 bg-white rounded-xl shadow text-rose-600">Error: {{ error }}</div>

    <div v-else class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard title="Total Semua Event" :value="totalEvents" color="rose" />
        <MetricCard title="Event DRAFT" :value="draftEventsCount" color="amber" />
        <MetricCard title="Event LIVE" :value="liveEventsCount" color="emerald" />
      </div>

      <SectionCard title="Management Event">
        <div class="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div class="flex-1">
            <label class="block text-sm text-slate-600 mb-1">Judul Event</label>
            <input v-model="newTitle" type="text" class="w-full border rounded px-3 py-2" placeholder="Masukkan judul event" />
          </div>
          <div>
            <label class="block text-sm text-slate-600 mb-1">Status</label>
            <select v-model="newStatus" class="border rounded px-3 py-2">
              <option value="draft">draft</option>
              <option value="live">live</option>
              <option value="completed">completed</option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-slate-600 mb-1">Tanggal & Waktu</label>
            <input v-model="newDateTime" type="datetime-local" class="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label class="block text-sm text-slate-600 mb-1">Kategori</label>
            <input v-model="newCategory" type="text" class="w-full border rounded px-3 py-2" placeholder="Masukkan kategori" />
          </div>
          <div class="md:col-span-4">
            <label class="block text-sm text-slate-600 mb-1">Deskripsi</label>
            <textarea v-model="newDescription" rows="3" class="w-full border rounded px-3 py-2" placeholder="Deskripsi event"></textarea>
          </div>
          <div class="md:col-span-4 flex items-center gap-2">
            <button @click="addEvent" :disabled="adding" class="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 active:scale-95 transition">
              {{ adding ? 'Menambah...' : 'Submit' }}
            </button>
            <button @click="cancelAdd" class="px-3 py-2 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 active:scale-95 transition">
              Cancel
            </button>
          </div>
        </div>
        <div class="mb-3 flex items-center justify-between">
          <input v-model="searchQuery" class="border rounded px-3 py-2 w-64" placeholder="Cari event..." />
          <div class="flex items-center gap-2">
            <label class="text-sm">Rows per page</label>
            <select v-model.number="pageSize" class="border rounded px-2 py-1">
              <option :value="5">5</option>
              <option :value="10">10</option>
              <option :value="20">20</option>
            </select>
          </div>
        </div>
        <div class="overflow-x-auto animate-fade-in">
          <table class="min-w-full divide-y divide-slate-200">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-3 py-2 text-left text-slate-600">No</th>
                <th class="px-3 py-2 text-left text-slate-600">Judul Event</th>
                <th class="px-3 py-2 text-left text-slate-600">Status</th>
                <th class="px-3 py-2 text-left text-slate-600">Dibuat</th>
                <th class="px-3 py-2 text-right text-slate-600">Aksi</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-slate-100">
              <tr v-for="(event, index) in pagedEvents" :key="event.id">
                <td class="px-3 py-2">{{ index + 1 }}</td>
                <td class="px-3 py-2">{{ event.title }}</td>
                <td class="px-3 py-2">
                  <span
                    class="px-2 py-1 rounded text-xs font-semibold"
                    :class="{
                      'bg-amber-100 text-amber-700': event.status === 'draft',
                      'bg-emerald-100 text-emerald-700': event.status === 'live',
                      'bg-sky-100 text-sky-700': event.status === 'completed'
                    }"
                  >
                    {{ event.status.toUpperCase() }}
                  </span>
                </td>
                <td class="px-3 py-2">{{ new Date(event.created_at).toLocaleDateString('id-ID') }}</td>
                <td class="px-3 py-2 text-right">
                  <RouterLink :to="`/events/${event.id}`" class="text-indigo-600 hover:text-indigo-800 mr-3">Kelola</RouterLink>
                  <button @click="handleDelete(event.id)" class="text-rose-600 hover:text-rose-800">Hapus</button>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="mt-3 flex items-center justify-between">
            <div class="text-sm text-slate-600">
              Halaman {{ currentPage }} dari {{ Math.max(1, Math.ceil((filteredEvents.length) / pageSize)) }}
            </div>
            <div class="flex items-center gap-2">
              <button class="px-3 py-1 bg-slate-200 rounded" @click="currentPage = Math.max(1, currentPage - 1)">Prev</button>
              <button class="px-3 py-1 bg-slate-200 rounded" @click="currentPage = currentPage + 1">Next</button>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  </div>
</template>
