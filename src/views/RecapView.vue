<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getPotsByEvent, getLeaderboardByPot, getGamesByPot, getRawScoresByPot } from '@/services/db.js'

const route = useRoute()
const eventId = ref(route.params.eventId)
const pots = ref([])
const selectedPotId = ref(null)
const leaderboard = ref([])
const games = ref([])
const scoresMap = ref(new Map())
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
  const [{ data: lb }, { data: gs }, { data: raw }] = await Promise.all([
    getLeaderboardByPot(selectedPotId.value),
    getGamesByPot(selectedPotId.value),
    getRawScoresByPot(selectedPotId.value)
  ])
  leaderboard.value = lb || []
  games.value = gs || []
  const map = new Map()
  for (const s of (raw || [])) {
    map.set(`${s.team_id}-${s.game_id}`, s)
  }
  scoresMap.value = map
}

const hasScore = (teamId) => {
  for (const g of games.value) {
    if (scoresMap.value.get(`${teamId}-${g.id}`)) return true
  }
  return false
}

const placeOf = (teamId) => {
  const idx = leaderboard.value.findIndex(r => r.team_id === teamId)
  return idx >= 0 ? (idx + 1) : ''
}

onMounted(load)
</script>

<template>
  <div class="max-w-6xl mx-auto bg-white p-6 rounded-xl shadow animate-fade-in">
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

    <div v-else class="animate-fade-in overflow-x-auto">
      <table class="min-w-full border border-black">
        <thead>
          <tr>
            <th rowspan="2" class="px-3 py-2 text-center font-semibold border border-black" style="background-color:#ffe600">No</th>
            <th rowspan="2" class="px-3 py-2 text-left font-semibold border border-black" style="background-color:#ffe600">Nama Tim</th>
            <th :colspan="games.length * 3" class="px-3 py-2 text-center font-semibold border border-black" style="background-color:#ffe600">
              POT {{ (pots.find(p => p.id === selectedPotId)?.name || '') }}
            </th>
            <th rowspan="2" class="px-3 py-2 text-center font-semibold border border-black" style="background-color:#ffe600">Total Point</th>
            <th rowspan="2" class="px-3 py-2 text-center font-semibold border border-black" style="background-color:#ffe600">Juara</th>
          </tr>
          <tr>
            <template v-for="g in games" :key="g.id">
              <th colspan="3" class="px-3 py-2 text-center font-semibold border border-black" style="background-color:#ffe600">
                GAME {{ g.game_number }}
              </th>
            </template>
          </tr>
          <tr>
            <template v-for="g in games" :key="'sub-'+g.id">
              <th class="px-3 py-2 text-center border border-black" style="background-color:#ffe600">Rank</th>
              <th class="px-3 py-2 text-center border border-black" style="background-color:#ffe600">P.Rank</th>
              <th class="px-3 py-2 text-center border border-black" style="background-color:#ffe600">P.Kill</th>
            </template>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, idx) in leaderboard"
            :key="row.team_id"
            :class="hasScore(row.team_id) ? 'bg-green-400' : ''"
          >
            <td class="px-3 py-2 text-center border border-black">{{ idx + 1 }}</td>
            <td class="px-3 py-2 text-left border border-black">{{ row.team_name }}</td>
            <template v-for="g in games" :key="'row-'+row.team_id+'-'+g.id">
              <td class="px-3 py-2 text-center border border-black">
                {{ (scoresMap.get(`${row.team_id}-${g.id}`)?.rank ?? '-') }}
              </td>
              <td class="px-3 py-2 text-center border border-black">
                {{ (scoresMap.get(`${row.team_id}-${g.id}`)?.p_rank ?? '-') }}
              </td>
              <td class="px-3 py-2 text-center border border-black">
                {{ (scoresMap.get(`${row.team_id}-${g.id}`)?.kill ?? '-') }}
              </td>
            </template>
            <td class="px-3 py-2 text-center border border-black">{{ row.total_points }}</td>
            <td class="px-3 py-2 text-center border border-black">{{ placeOf(row.team_id) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
