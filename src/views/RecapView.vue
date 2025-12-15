<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getPotsByEvent, getLeaderboardByPot } from '@/services/db.js'

const route = useRoute()
const eventId = ref(route.params.eventId)
const pots = ref([])
const selectedPotId = ref(null)
const leaderboard = ref([])
const loading = ref(true)
const error = ref(null)

const load = async () => {
  loading.value = true
  error.value = null
  try {
    const { data: ps } = await getPotsByEvent(eventId.value)
    pots.value = ps || []
    selectedPotId.value = pots.value[0]?.id || null
    await refresh()
  } catch (e) {
    error.value = 'Gagal memuat recap'
  } finally {
    loading.value = false
  }
}

const refresh = async () => {
  if (!selectedPotId.value) return
  const { data } = await getLeaderboardByPot(selectedPotId.value)
  leaderboard.value = data || []
}

onMounted(load)
</script>

<template>
  <div class="max-w-5xl mx-auto bg-white p-6 rounded-xl shadow animate-fade-in">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">Recap Raw Data</h1>
      <div class="flex items-center gap-2">
        <label>Pilih Pot:</label>
        <select v-model="selectedPotId" @change="refresh" class="border rounded p-2">
          <option v-for="p in pots" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="p-4 text-indigo-600">Memuat recap...</div>
    <div v-else-if="error" class="p-4 text-red-600">{{ error }}</div>

    <div v-else class="animate-fade-in">
      <table class="min-w-full animate-slide-up">
        <thead>
          <tr>
            <th class="text-left p-2">Tim</th>
            <th class="text-right p-2">Total Poin</th>
            <th class="text-right p-2">Total Kill</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in leaderboard" :key="row.team_id">
            <td class="p-2">{{ row.team_name }}</td>
            <td class="p-2 text-right">{{ row.total_points }}</td>
            <td class="p-2 text-right">{{ row.total_kill }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
