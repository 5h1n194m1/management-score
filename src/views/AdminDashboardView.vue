<script setup>
import { ref, onMounted, computed } from 'vue';
import { supabase } from '@/supabaseClient.js';
import MetricCard from '@/components/ui/MetricCard.vue'
import SectionCard from '@/components/ui/SectionCard.vue'

const events = ref([]);
const loading = ref(true);
const error = ref(null);
const userId = ref(null);

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
              <tr v-for="(event, index) in events" :key="event.id">
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
                  <button class="text-rose-600 hover:text-rose-800">Hapus</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  </div>
</template>
