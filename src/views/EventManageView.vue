<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  getAllEvents,
  getPotsByEvent,
  getTeamsByEvent,
  getGamesByPot,
  addGameToPot,
  deleteGame,
  togglePotHidden,
  getEventSettings,
  upsertEventSettings,
  upsertRawScore,
  getLeaderboardByPot,
  getPointMapping,
  upsertPointMapping,
  moveTeamToGrandFinal,
  resetScoresValues,
  resetAllData,
  subscribeRawScoresByEvent
} from '@/services/db.js'

const route = useRoute()
const eventId = ref(route.params.id)

const events = ref([])
const selectedPotId = ref(null)
const pots = ref([])
const games = ref([])
const teams = ref([])
const settings = ref({
  input_columns: { rank: true, p_rank: true, kill: true },
  hidden_action: false,
  sorting_mode: 'points_then_kill',
  allow_public_recaps: true,
})
const pointMap = ref([])
const currentGameId = ref(null)
const leaderboard = ref([])
const overlayVisible = ref(false)

const loading = ref(true)
const error = ref(null)
let subscription = null

const loadEventData = async () => {
  loading.value = true
  error.value = null
  try {
    const [{ data: ev }, { data: ps }, { data: ts }, { data: setg }, { data: pm }] = await Promise.all([
      getAllEvents(),
      getPotsByEvent(eventId.value),
      getTeamsByEvent(eventId.value),
      getEventSettings(eventId.value),
      getPointMapping(eventId.value)
    ])
    events.value = ev || []
    pots.value = ps || []
    teams.value = ts || []
    settings.value = setg || settings.value
    pointMap.value = pm || []
    if (pots.value.length) {
      selectedPotId.value = pots.value[0].id
      await loadPotDetail()
    }
    if (subscription) {
      subscription.unsubscribe()
    }
    subscription = subscribeRawScoresByEvent(eventId.value, () => {
      refreshLeaderboard()
    })
  } catch (e) {
    error.value = 'Gagal memuat data event'
  } finally {
    loading.value = false
  }
}

const loadPotDetail = async () => {
  const { data: gs } = await getGamesByPot(selectedPotId.value)
  games.value = gs || []
  currentGameId.value = games.value[0]?.id || null
  await refreshLeaderboard()
}

const refreshLeaderboard = async () => {
  if (!selectedPotId.value) return
  const { data } = await getLeaderboardByPot(selectedPotId.value)
  leaderboard.value = data || []
}

const addGame = async () => {
  const next = (games.value[games.value.length - 1]?.game_number || 0) + 1
  if (next > 20) return
  await addGameToPot(selectedPotId.value, next)
  await loadPotDetail()
}

const removeLastGame = async () => {
  const last = games.value[games.value.length - 1]
  if (!last) return
  await deleteGame(last.id)
  await loadPotDetail()
}

const toggleHiddenAction = async () => {
  const payload = { hidden_action: !settings.value.hidden_action }
  const { data } = await upsertEventSettings(eventId.value, payload)
  settings.value = { ...settings.value, ...data?.[0] || payload }
}

const toggleColumn = async (key) => {
  const next = { ...settings.value.input_columns, [key]: !settings.value.input_columns[key] }
  const { data } = await upsertEventSettings(eventId.value, { input_columns: next })
  settings.value.input_columns = data?.[0]?.input_columns || next
}

const togglePotVisibility = async () => {
  const pot = pots.value.find(p => p.id === selectedPotId.value)
  if (!pot) return
  await togglePotHidden(pot.id, !pot.is_hidden)
  const { data } = await getPotsByEvent(eventId.value)
  pots.value = data || []
}

const transferToGrandFinal = async (teamId) => {
  await moveTeamToGrandFinal(eventId.value, teamId)
}

const resetValues = async () => {
  await resetScoresValues(eventId.value)
  await refreshLeaderboard()
}

const resetAll = async () => {
  await resetAllData(eventId.value)
  await refreshLeaderboard()
}

const saveScore = async (teamId, field, value) => {
  if (!currentGameId.value) return
  const payload = { game_id: currentGameId.value, team_id: teamId, rank: null, p_rank: null, kill: 0 }
  const existing = {}
  if (settings.value.input_columns.rank) existing.rank = null
  if (settings.value.input_columns.p_rank) existing.p_rank = null
  if (settings.value.input_columns.kill) existing.kill = 0
  payload[field] = value
  await upsertRawScore(payload)
  await refreshLeaderboard()
}

const updatePointMap = async () => {
  await upsertPointMapping(eventId.value, pointMap.value)
  await refreshLeaderboard()
}

const setCurrentGame = (id) => {
  currentGameId.value = id
}

const toggleOverlay = () => {
  overlayVisible.value = !overlayVisible.value
}

onMounted(loadEventData)
watch(selectedPotId, async () => {
  await loadPotDetail()
})
</script>

<template>
  <div class="grid grid-cols-12 gap-6 animate-fade-in">
    <div class="col-span-4 bg-white p-4 rounded-xl shadow hover-lift">
      <h2 class="text-xl font-bold mb-3">Panel Kontrol</h2>

      <div class="mb-4">
        <label class="block text-sm font-semibold mb-1">Pilih Pot</label>
        <select v-model="selectedPotId" class="w-full border rounded p-2">
          <option v-for="p in pots" :key="p.id" :value="p.id">
            {{ p.name }} <span v-if="p.is_hidden">(hidden)</span>
          </option>
        </select>
      </div>

      <div class="flex gap-2 mb-4">
        <button @click="addGame" class="px-3 py-2 bg-indigo-600 text-white rounded">+ Game</button>
        <button @click="removeLastGame" class="px-3 py-2 bg-indigo-600 text-white rounded">- Game</button>
        <button @click="togglePotVisibility" class="px-3 py-2 bg-gray-700 text-white rounded">Sembunyikan/Tampilkan Pot</button>
      </div>

      <div class="mb-4">
        <h3 class="font-semibold">Checklist Kolom Input</h3>
        <div class="flex flex-col gap-2 mt-2">
          <label><input type="checkbox" :checked="settings.input_columns.rank" @change="toggleColumn('rank')" /> Rank</label>
          <label><input type="checkbox" :checked="settings.input_columns.p_rank" @change="toggleColumn('p_rank')" /> P. Rank</label>
          <label><input type="checkbox" :checked="settings.input_columns.kill" @change="toggleColumn('kill')" /> Kill</label>
        </div>
      </div>

      <div class="mb-4">
        <label class="inline-flex items-center gap-2">
          <input type="checkbox" :checked="settings.hidden_action" @change="toggleHiddenAction" />
          Hidden Action (sembunyikan kolom aksi)
        </label>
      </div>

      <div class="mb-4">
        <h3 class="font-semibold">Kustomisasi Poin Rank</h3>
        <div class="space-y-2">
          <div v-for="row in pointMap" :key="row.rank_position" class="flex items-center gap-2">
            <span class="w-16">Rank {{ row.rank_position }}</span>
            <input type="number" v-model.number="row.points" class="border rounded p-1 w-24" />
          </div>
        </div>
        <button @click="updatePointMap" class="mt-2 px-3 py-2 bg-green-600 text-white rounded">Simpan Poin</button>
      </div>

      <div class="flex gap-2">
        <button @click="resetValues" class="px-3 py-2 bg-yellow-500 text-white rounded">Reset Score Value</button>
        <button @click="resetAll" class="px-3 py-2 bg-red-600 text-white rounded">Reset Semua Data</button>
      </div>
    </div>

    <div class="col-span-8 bg-white p-4 rounded-xl shadow">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-xl font-bold">Spreadsheet Input</h2>
        <div class="flex items-center gap-2">
          <label>Game:</label>
          <select v-model="currentGameId" @change="setCurrentGame(currentGameId)" class="border rounded p-1">
            <option v-for="g in games" :key="g.id" :value="g.id">Game {{ g.game_number }}</option>
          </select>
          <button @click="toggleOverlay" class="px-3 py-2 bg-gray-800 text-white rounded hover-lift">
            {{ overlayVisible ? 'Hide Overlay' : 'Show Overlay' }}
          </button>
        </div>
      </div>

      <div v-if="overlayVisible" class="mb-4">
        <div v-for="g in games" :key="g.id" v-show="g.id === currentGameId" class="relative border rounded">
          <img v-if="g.screenshot_url" :src="g.screenshot_url" alt="Screenshot" class="max-h-96 mx-auto object-contain" />
          <p v-else class="p-4 text-gray-500">Tidak ada screenshot untuk game ini.</p>
        </div>
      </div>

      <div class="overflow-x-auto animate-fade-in">
        <table class="min-w-full divide-y divide-gray-200 animate-slide-up">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-3 py-2 text-left">Tim</th>
              <th v-if="settings.input_columns.rank" class="px-3 py-2 text-center">Rank</th>
              <th v-if="settings.input_columns.p_rank" class="px-3 py-2 text-center">P. Rank</th>
              <th v-if="settings.input_columns.kill" class="px-3 py-2 text-center">Kill</th>
              <th v-if="!settings.hidden_action" class="px-3 py-2 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-100">
            <tr v-for="t in teams" :key="t.id">
              <td class="px-3 py-2">
                <span title="Anggota: {{ (t.members || []).join(', ') }}">{{ t.name }}</span>
              </td>
              <td v-if="settings.input_columns.rank" class="px-3 py-2 text-center">
                <input type="number" min="1" max="30" class="border rounded p-1 w-20" @change="saveScore(t.id, 'rank', parseInt($event.target.value))" />
              </td>
              <td v-if="settings.input_columns.p_rank" class="px-3 py-2 text-center">
                <input type="number" min="0" class="border rounded p-1 w-20" @change="saveScore(t.id, 'p_rank', parseInt($event.target.value))" />
              </td>
              <td v-if="settings.input_columns.kill" class="px-3 py-2 text-center">
                <input type="number" min="0" class="border rounded p-1 w-20" @change="saveScore(t.id, 'kill', parseInt($event.target.value))" />
              </td>
              <td v-if="!settings.hidden_action" class="px-3 py-2 text-right">
                <button class="text-blue-600 mr-2" @click="transferToGrandFinal(t.id)">Grand Final</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-6">
        <h3 class="text-lg font-semibold mb-2">Leaderboard Pot</h3>
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-3 py-2 text-left">Tim</th>
              <th class="px-3 py-2 text-right">Total Poin</th>
              <th class="px-3 py-2 text-right">Total Kill</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-100">
            <tr v-for="row in leaderboard" :key="row.team_id">
              <td class="px-3 py-2">{{ row.team_name }}</td>
              <td class="px-3 py-2 text-right">{{ row.total_points }}</td>
              <td class="px-3 py-2 text-right">{{ row.total_kill }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
