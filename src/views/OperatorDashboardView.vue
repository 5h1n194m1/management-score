<script setup>
import { useAuth } from '@/stores/auth';
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from '@/supabaseClient.js';
import { getAllEvents, createEvent } from '@/services/db.js'

const authStore = useAuth();
const router = useRouter();
const isLoading = ref(true);
const error = ref(null)
const events = ref([])
const adding = ref(false)
const newTitle = ref('')
const newStatus = ref('draft')
const userId = ref(null)
const displayRole = () => (authStore.userRole === 'admin' ? 'Administrator' : authStore.userRole.toUpperCase())

const fetchEvents = async () => {
    isLoading.value = true;
    error.value = null
    const { data: session } = await supabase.auth.getUser()
    userId.value = session?.user?.id || null
    const { data, error: fetchError } = await getAllEvents()
    if (fetchError) {
        error.value = fetchError.message || 'Gagal memuat event'
        events.value = []
    } else {
        events.value = data || []
    }
    isLoading.value = false;
}

onMounted(fetchEvents);

const handleLogin = () => {
  router.push('/login');
};

const handleLogout = async () => {
  await supabase.auth.signOut();
  authStore.clearAuth();
  router.push('/');
};

const addEvent = async () => {
  if (authStore.userRole !== 'admin') return
  if (!newTitle.value.trim()) return
  adding.value = true
  error.value = null
  const { data, error: insErr } = await createEvent(userId.value, newTitle.value.trim(), newStatus.value)
  if (!insErr) {
    newTitle.value = ''
    newStatus.value = 'draft'
    await fetchEvents()
  } else {
    error.value = insErr.message || 'Gagal menambah event'
  }
  adding.value = false
}
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
    <div class="rounded-xl bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-700 p-4 shadow">
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
      <div class="text-slate-500 dark:text-slate-400">Role: {{ displayRole() }}</div>
    </div>
    
    <div v-if="isLoading" class="p-8 bg-white rounded-xl shadow text-center text-indigo-600">Memuat data...</div>
    <div v-else class="bg-white p-6 rounded-xl shadow border border-slate-200 animate-fade-in">
      <div class="mb-4 flex items-end gap-3" v-if="authStore.userRole==='admin'">
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
        <button @click="addEvent" :disabled="adding" class="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
          {{ adding ? 'Menambah...' : 'Tambah Event' }}
        </button>
      </div>
      <div v-if="error" class="mb-3 text-rose-600">{{ error }}</div>
      <div class="overflow-x-auto animate-slide-up">
        <table class="min-w-full divide-y divide-slate-200">
          <thead class="bg-slate-50">
            <tr>
              <th class="px-3 py-2 text-left text-slate-600">No</th>
              <th class="px-3 py-2 text-left text-slate-600">Judul</th>
              <th class="px-3 py-2 text-left text-slate-600">Status</th>
              <th class="px-3 py-2 text-left text-slate-600">Dibuat</th>
              <th class="px-3 py-2 text-right text-slate-600">Aksi</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-slate-100">
            <tr v-for="(e, i) in events" :key="e.id">
              <td class="px-3 py-2">{{ i + 1 }}</td>
              <td class="px-3 py-2">{{ e.title }}</td>
              <td class="px-3 py-2">
                <span class="px-2 py-1 rounded text-xs font-semibold"
                  :class="{
                    'bg-amber-100 text-amber-700': e.status==='draft',
                    'bg-emerald-100 text-emerald-700': e.status==='live',
                    'bg-sky-100 text-sky-700': e.status==='completed'
                  }"
                >
                  {{ e.status.toUpperCase() }}
                </span>
              </td>
              <td class="px-3 py-2">{{ new Date(e.created_at).toLocaleDateString('id-ID') }}</td>
              <td class="px-3 py-2 text-right">
                <RouterLink :to="`/events/${e.id}`" class="text-indigo-600 hover:text-indigo-800 mr-3">Kelola</RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
