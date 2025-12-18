<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
    <nav class="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-30 border-b dark:border-gray-700">
      <div class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <router-link to="/dashboard" class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </router-link>
          <h1 class="text-xl font-bold text-gray-800 dark:text-white truncate max-w-[200px] md:max-w-none">
            {{ eventDetails?.title || 'Loading Event...' }}
          </h1>
        </div>

        <div class="flex items-center gap-2">
          <button @click="fetchPotsAndTeams" class="p-2 text-gray-500 hover:text-indigo-600" title="Refresh Data">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" :class="{'animate-spin': isLoading}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <div class="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-2"></div>
          <button @click="showSettings = true" class="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg text-gray-600 dark:text-gray-300">
            ⚙️ <span class="hidden md:inline ml-1">Settings</span>
          </button>
        </div>
      </div>
    </nav>

    <main class="max-w-7xl mx-auto p-4 md:p-6">
      <div v-if="error" class="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-center justify-between">
        <div class="flex items-center">
          <span class="text-red-500 mr-3">⚠️</span>
          <p class="text-red-700 text-sm font-medium">{{ error }}</p>
        </div>
        <button @click="error = null" class="text-red-400 hover:text-red-600">✕</button>
      </div>

      <div class="flex overflow-x-auto pb-2 mb-6 no-scrollbar gap-2">
        <button 
          v-for="pot in pots" 
          :key="pot.id"
          @click="selectedPotId = pot.id"
          :class="[
            'flex-none px-6 py-2.5 rounded-full font-semibold transition-all duration-200 shadow-sm border',
            selectedPotId === pot.id 
              ? 'bg-indigo-600 text-white border-indigo-600' 
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
          ]"
        >
          {{ pot.name }}
        </button>
        <button @click="showAddPotModal = true" class="flex-none px-4 py-2.5 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 hover:border-indigo-500 hover:text-indigo-500 transition-all">
          + Pot Baru
        </button>
      </div>

      <div v-if="currentPot" class="space-y-6">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-2">
            <span class="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-md text-sm font-bold">
              {{ currentPot.teams?.length || 0 }} Tim Terdaftar
            </span>
            <span class="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-md text-sm font-bold">
              {{ currentPot.games?.length || 0 }} Games
            </span>
          </div>
          
          <div class="flex gap-2 w-full md:w-auto">
            <button @click="showAddTeamModal = true" class="flex-1 md:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow font-medium">
              + Tim
            </button>
            <button @click="handleAddGame" class="flex-1 md:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow font-medium">
              + Game
            </button>
            <button @click="exportData" class="p-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg text-gray-600">
              📥
            </button>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div class="overflow-x-auto overflow-y-visible">
            <table class="w-full text-left border-separate border-spacing-0">
              <thead>
                <tr>
                  <th class="sticky left-0 z-20 bg-gray-50 dark:bg-gray-900 p-4 border-b border-gray-200 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-300">
                    NAMA TIM
                  </th>
                  <th v-for="game in currentPot.games" :key="game.id" colspan="2" class="p-4 border-b border-l border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 text-center min-w-[140px]">
                    <div class="flex items-center justify-center gap-2">
                      <span class="font-black text-indigo-600 dark:text-indigo-400">G{{ game.game_number }}</span>
                      <button @click="handleDeleteGame(game.id)" class="text-[10px] text-red-400 hover:text-red-600">✕</button>
                    </div>
                  </th>
                  <th class="p-4 border-b border-l border-gray-200 dark:border-gray-700 bg-amber-50 dark:bg-amber-900/10 text-center font-black text-amber-600 w-24">
                    TOTAL
                  </th>
                </tr>
                <tr class="text-[10px] bg-gray-50 dark:bg-gray-900 uppercase tracking-wider">
                  <th class="sticky left-0 z-20 bg-gray-50 dark:bg-gray-900 p-2 border-b border-gray-200 dark:border-gray-700"></th>
                  <template v-for="n in currentPot.games?.length" :key="n">
                    <th class="p-2 border-b border-l border-gray-200 dark:border-gray-700 text-center">Placement</th>
                    <th class="p-2 border-b border-gray-200 dark:border-gray-700 text-center">Kill</th>
                  </template>
                  <th class="p-2 border-b border-l border-gray-200 dark:border-gray-700"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(team, index) in rankedTeams" :key="team.id" class="group hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                  <td class="sticky left-0 z-10 bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 font-bold">
                    <div class="flex items-center justify-between group">
                      <span class="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                        <span class="text-[10px] text-gray-400 w-4">#{{ index + 1 }}</span>
                        {{ team.name }}
                      </span>
                      <button @click="handleDeleteTeam(team.id)" class="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity">
                        ✕
                      </button>
                    </div>
                  </td>

                  <template v-for="game in currentPot.games" :key="game.id">
                    <td class="p-2 border-b border-l border-gray-200 dark:border-gray-700">
                      <input 
                        type="number" 
                        class="w-full bg-transparent text-center font-semibold text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded p-1"
                        :value="getScoreValue(team.id, game.id, 'rank')"
                        @change="e => handleScoreUpdate(team.id, game.id, 'rank', e.target.value)"
                        placeholder="0"
                      />
                    </td>
                    <td class="p-2 border-b border-gray-200 dark:border-gray-700">
                      <input 
                        type="number" 
                        class="w-full bg-transparent text-center font-semibold text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded p-1"
                        :value="getScoreValue(team.id, game.id, 'kill')"
                        @change="e => handleScoreUpdate(team.id, game.id, 'kill', e.target.value)"
                        placeholder="0"
                      />
                    </td>
                  </template>

                  <td class="p-4 border-b border-l border-gray-200 dark:border-gray-700 text-center font-black text-lg bg-gray-50/30 dark:bg-gray-900/20 text-indigo-600 dark:text-indigo-400">
                    {{ calculateTotalPoints(team) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div v-if="isLoading" class="fixed inset-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div class="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600"></div>
      </div>
    </main>

    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { supabase } from '@/supabaseClient';

const route = useRoute();
const router = useRouter();
const eventId = computed(() => route.params.eventId);

// --- RECOVERY STATES ---
const pots = ref([]);
const selectedPotId = ref(null);
const eventDetails = ref(null);
const pointMapping = ref([]);
const isLoading = ref(true);
const error = ref(null);
const showSettings = ref(false);
const showAddPotModal = ref(false);
const showAddTeamModal = ref(false);

const currentPot = computed(() => pots.value.find(p => p.id === selectedPotId.value));

// --- CORE DATABASE LOGIC ---

const fetchEventDetails = async () => {
    const { data, error: e } = await supabase.from('events').select('*').eq('id', eventId.value).single();
    if (e) throw e;
    eventDetails.value = data;
};

const fetchPointMapping = async () => {
    const { data } = await supabase.from('point_mapping').select('*').eq('event_id', eventId.value);
    pointMapping.value = data || [];
};

const fetchPotsAndTeams = async () => {
    if (!eventId.value) return;
    isLoading.value = true;
    try {
        await Promise.all([fetchEventDetails(), fetchPointMapping()]);

        const { data: potsData, error: potErr } = await supabase
            .from('pots')
            .select('*, games(*)')
            .eq('event_id', eventId.value)
            .order('display_order');
        
        if (potErr) throw potErr;

        const fullPots = await Promise.all(potsData.map(async (pot) => {
            const { data: teamMap } = await supabase
                .from('team_pot_mapping')
                .select('teams(*)')
                .eq('pot_id', pot.id);
            
            const teams = teamMap?.map(m => m.teams) || [];
            const gameIds = pot.games.map(g => g.id);

            let scores = [];
            if (teams.length > 0 && gameIds.length > 0) {
                const { data: sData } = await supabase
                    .from('raw_scores')
                    .select('*')
                    .in('game_id', gameIds)
                    .in('team_id', teams.map(t => t.id));
                scores = sData || [];
            }

            return {
                ...pot,
                games: pot.games.sort((a, b) => a.game_number - b.game_number),
                teams: teams.map(t => ({
                    ...t,
                    scores: scores.filter(s => s.team_id === t.id)
                }))
            };
        }));

        pots.value = fullPots;
        if (fullPots.length > 0 && !selectedPotId.value) selectedPotId.value = fullPots[0].id;
    } catch (err) {
        error.value = err.message;
        console.error(err);
    } finally {
        isLoading.value = false;
    }
};

// --- SCORE UPDATE LOGIC ---

const handleScoreUpdate = async (teamId, gameId, type, value) => {
    const val = parseInt(value) || 0;
    let pRank = 0;
    
    if (type === 'rank') {
        const mapping = pointMapping.value.find(m => m.rank_position === val);
        pRank = mapping ? mapping.points : 0;
    }

    try {
        // Upsert logic (Check if exists, then update or insert)
        const { data: existing } = await supabase
            .from('raw_scores')
            .select('id')
            .eq('team_id', teamId)
            .eq('game_id', gameId)
            .single();

        if (existing) {
            const upData = { [type]: val };
            if (type === 'rank') upData.p_rank = pRank;
            await supabase.from('raw_scores').update(upData).eq('id', existing.id);
        } else {
            await supabase.from('raw_scores').insert({
                team_id: teamId,
                game_id: gameId,
                rank: type === 'rank' ? val : 0,
                kill: type === 'kill' ? val : 0,
                p_rank: type === 'rank' ? pRank : 0
            });
        }
        
        // Update local state for reactive UI (Cepat & hemat kuota)
        updateLocalScore(teamId, gameId, type, val, pRank);
    } catch (err) {
        error.value = "Gagal simpan skor: " + err.message;
    }
};

const updateLocalScore = (teamId, gameId, type, val, pRank) => {
    const pot = pots.value.find(p => p.id === selectedPotId.value);
    const team = pot.teams.find(t => t.id === teamId);
    let score = team.scores.find(s => s.game_id === gameId);
    
    if (!score) {
        score = { team_id: teamId, game_id: gameId, rank: 0, kill: 0, p_rank: 0 };
        team.scores.push(score);
    }
    
    score[type] = val;
    if (type === 'rank') score.p_rank = pRank;
};

// --- HELPER FUNCTIONS ---

const getScoreValue = (teamId, gameId, type) => {
    const team = currentPot.value?.teams.find(t => t.id === teamId);
    const score = team?.scores.find(s => s.game_id === gameId);
    return score ? score[type] : '';
};

const calculateTotalPoints = (team) => {
    return team.scores.reduce((sum, s) => sum + (s.p_rank || 0) + (s.kill || 0), 0);
};

const rankedTeams = computed(() => {
    if (!currentPot.value) return [];
    return [...currentPot.value.teams].sort((a, b) => {
        const totalA = calculateTotalPoints(a);
        const totalB = calculateTotalPoints(b);
        if (totalB !== totalA) return totalB - totalA;
        const killA = a.scores.reduce((sum, s) => sum + s.kill, 0);
        const killB = b.scores.reduce((sum, s) => sum + s.kill, 0);
        return killB - killA;
    });
});

// --- ACTION LOGIC (STUBS FOR YOU TO COMPLETE) ---
const handleAddGame = async () => { /* Logic Insert to 'games' using currentPot.id */ };
const handleDeleteGame = async (id) => { /* Logic Delete */ };
const handleDeleteTeam = async (id) => { /* Logic Delete mapping/team */ };

onMounted(fetchPotsAndTeams);
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
</style>