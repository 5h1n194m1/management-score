<script setup>
import { ref, computed } from 'vue';
import { useAuth } from '@/stores/auth'; // Asumsi store Auth ada
import { useThemeStore } from '@/stores/theme'; // Asumsi store Theme ada

// --- STATE DAN DUMMY DATA ---
const authStore = useAuth();
const themeStore = useThemeStore();

const potData = ref({
    title: 'Turnamen Final M4',
    // Data Tim Dummy: Sesuaikan jumlah scores dengan jumlah game yang diinginkan
    teams: [
        { id: 't1', name: 'Team Alpha', members: ['P1', 'P2', 'P3', 'P4'], scores: [
            { rank: '1', kill: '15', pRank: 0 },
            { rank: '3', kill: '8', pRank: 0 },
            { rank: '2', kill: '10', pRank: 0 },
        ]},
        { id: 't2', name: 'Team Beta', members: ['P5', 'P6', 'P7', 'P8'], scores: [
            { rank: '5', kill: '5', pRank: 0 },
            { rank: '1', kill: '12', pRank: 0 },
            { rank: '4', kill: '6', pRank: 0 },
        ]},
        { id: 't3', name: 'Team Gamma', members: ['P9', 'P10', 'P11', 'P12'], scores: [
            { rank: '2', kill: '9', pRank: 0 },
            { rank: '5', kill: '7', pRank: 0 },
            { rank: '1', kill: '18', pRank: 0 },
        ]},
    ],
    games: 3,
});

// --- STATE KONTROL UI ---
const isSettingsModalOpen = ref(false); // Kontrol Modal Pengaturan Poin
const isImportModalOpen = ref(false); // Kontrol Modal Impor Tim
const teamNamesInput = ref(''); // Input Textarea untuk Impor
const sortingMode = ref('default'); // 'default', 'points_then_kill'
const hideActionColumn = ref(false); // Toggle Sembunyikan Kolom Aksi

// --- STATE POIN DINAMIS (Mengganti hardcoded placementPoints) ---
const dynamicPlacementPoints = ref([
    { rank: 1, points: 12 },
    { rank: 2, points: 9 },
    { rank: 3, points: 8 },
    { rank: 4, points: 7 },
    { rank: 5, points: 6 },
    { rank: 6, points: 5 },
    { rank: 7, points: 4 },
    { rank: 8, points: 3 },
    { rank: 9, points: 2 },
    { rank: 10, points: 1 },
    { rank: 11, points: 0 },
    { rank: 12, points: 0 },
]);

const placementPointsLookup = computed(() => {
    return dynamicPlacementPoints.value.reduce((acc, item) => {
        // Pastikan Rank adalah angka positif
        if (item.rank > 0) {
             acc[item.rank] = item.points;
        }
        return acc;
    }, {});
});

// --- KOMPUTASI PERINGKAT DAN SKOR (TERPUSAT) ---
const rankedTeams = computed(() => {
    // 1. Hitung Skor Dasar untuk Semua Tim
    const teamsCalculated = potData.value.teams.map((team) => {
        let totalScore = 0;
        let totalKills = 0;

        const updatedScores = team.scores.map(score => {
            const rank = parseInt(score.rank) || 0;
            const kill = parseInt(score.kill) || 0;
            
            // Menggunakan Lookup Poin Dinamis
            const pRank = placementPointsLookup.value[rank] || 0; 
            
            totalScore += pRank + kill;
            totalKills += kill;

            return {
                ...score,
                pRank, 
                // Tampilkan sebagai string kosong jika nilainya 0
                rank: rank > 0 ? String(rank) : '', 
                kill: kill > 0 ? String(kill) : ''
            };
        });

        return {
            ...team,
            scores: updatedScores,
            totalScore: totalScore,
            totalKills: totalKills,
        };
    });

    // 2. Terapkan Sorting berdasarkan mode yang dipilih
    if (sortingMode.value === 'points_then_kill') {
        const sorted = [...teamsCalculated].sort((a, b) => {
            // Urutan 1: Total Score (Descending)
            if (b.totalScore !== a.totalScore) {
                return b.totalScore - a.totalScore;
            }
            // Urutan 2: Total Kill (Descending - tie breaker)
            return b.totalKills - a.totalKills;
        });

        // 3. Tambahkan Current Rank (Peringkat) setelah sorting
        return sorted.map((team, rankIndex) => ({
            ...team,
            currentRank: rankIndex + 1, // Peringkat setelah sorting
        }));
    }

    // Jika sortingMode === 'default', kembalikan data dengan urutan input
    return teamsCalculated.map((team, index) => ({
        ...team,
        currentRank: index + 1, // Jika tidak diurutkan, rank = index
    }));
});

// --- KOMPUTASI METRIK LAIN ---
const totalTeams = computed(() => rankedTeams.value.length);
const overallTotalScore = computed(() => {
    return rankedTeams.value.reduce((sum, team) => sum + team.totalScore, 0);
});
const gameHeaders = computed(() => {
    const headers = [];
    for (let i = 1; i <= potData.value.games; i++) {
        headers.push({ colspan: 3, text: `Game ${i}` });
    }
    return headers;
});

// --- HANDLER UI ---
const handleScoreChange = (teamIndex, gameIndex, type, event) => {
    // ⚠️ PENTING: Jika sudah terintegrasi Supabase, hapus baris ini,
    // dan ganti dengan API call ke database untuk update skor
    let value = event.target.value;
    
    // Clean input: hanya angka
    value = value.replace(/[^0-9]/g, ''); 
    if (value === '') value = '0'; // Gunakan 0 untuk perhitungan

    const team = potData.value.teams[teamIndex];
    if (team && team.scores[gameIndex]) {
        team.scores[gameIndex][type] = value;
    }
};

// --- HANDLER MODAL PENGATURAN POIN ---
const openSettingsModal = () => { isSettingsModalOpen.value = true; };
const closeSettingsModal = () => { isSettingsModalOpen.value = false; };

// --- HANDLER MODAL IMPOR TIM ---
const openImportModal = () => {
  teamNamesInput.value = ''; 
  isImportModalOpen.value = true;
};
const closeImportModal = () => { isImportModalOpen.value = false; };

const importTeams = () => {
    const teamNames = teamNamesInput.value
                                    .split('\n')
                                    .map(name => name.trim())
                                    .filter(name => name.length > 0);

    if (teamNames.length === 0) {
        alert("Masukkan minimal satu nama tim.");
        return;
    }
    
    // Tentukan jumlah game yang ada
    const gamesCount = potData.value.games; 
    
    // Hapus baris default "Team 1" jika hanya ada 1 tim (logic dummy)
    if (potData.value.teams.length === 1 && potData.value.teams[0].name === 'Team 1' && potData.value.teams[0].totalScore === 0) {
        potData.value.teams.splice(0, 1);
    }

    // Tambahkan tim baru ke state
    teamNames.forEach((name, index) => {
        const newTeam = {
            id: `temp-${Date.now()}-${index}`,
            name: name,
            members: [], // Kosongkan, nanti bisa diisi via modal lain
            scores: Array(gamesCount).fill().map(() => ({ rank: '', kill: '', pRank: 0 })),
        };
        potData.value.teams.push(newTeam);
    });

    closeImportModal();
};

// --- HANDLER STRUKTUR DATA (CRUD Game & Team) ---

const addTeam = () => {
    const gamesCount = potData.value.games;
    const newIndex = potData.value.teams.length + 1;
    
    // Hapus baris default "Team 1" jika hanya ada 1 tim
    if (potData.value.teams.length === 1 && potData.value.teams[0].name === 'Team 1' && potData.value.teams[0].totalScore === 0) {
        potData.value.teams.splice(0, 1);
    }

    potData.value.teams.push({
        id: `t${newIndex}`,
        name: `Team ${newIndex}`,
        members: [],
        scores: Array(gamesCount).fill().map(() => ({ rank: '', kill: '', pRank: 0 })),
    });
};

const deleteTeam = (teamId) => {
    if (confirm("Apakah Anda yakin ingin menghapus tim ini?")) {
        potData.value.teams = potData.value.teams.filter(t => t.id !== teamId);
    }
};

const addGame = () => {
    potData.value.games += 1;
    // Tambahkan skor default untuk game baru ke setiap tim yang ada
    potData.value.teams.forEach(team => {
        team.scores.push({ rank: '', kill: '', pRank: 0 });
    });
};

const removeGame = () => {
    if (potData.value.games > 1) {
        if(confirm("Apakah Anda yakin ingin menghapus Game terakhir?")) {
            potData.value.games -= 1;
            // Hapus skor game terakhir dari setiap tim
            potData.value.teams.forEach(team => {
                team.scores.pop();
            });
        }
    } else {
        alert("Minimal harus ada 1 Game.");
    }
};

const deleteAllScores = () => {
    if (confirm("YAKIN? Semua skor Rank dan Kill akan direset menjadi 0.")) {
        potData.value.teams.forEach(team => {
            team.scores.forEach(score => {
                score.rank = '';
                score.kill = '';
            });
        });
    }
};

const resetAllData = () => {
    if (confirm("ANDA YAKIN? Semua data (Tim, Skor, Games) akan direset ke kondisi awal.")) {
        potData.value.teams = [{ 
            id: 't1', 
            name: 'Team 1', 
            members: [], 
            scores: [{ rank: '', kill: '', pRank: 0 }] 
        }];
        potData.value.games = 1;
    }
};

</script>

<template>
    <div class="p-4 md:p-8">
        <div class="flex justify-between items-center mb-6 border-b pb-4 border-gray-200 dark:border-gray-700">
            <h1 class="text-3xl font-extrabold text-gray-900 dark:text-white">
                <input 
                    class="bg-transparent border-none focus:ring-0 focus:border-0 w-full dark:text-white" 
                    v-model="potData.title"
                    placeholder="Nama Turnamen/Event"
                />
            </h1>
            
            <button @click="openSettingsModal" class="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition duration-150 shadow" title="Pengaturan Poin Placement">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21a9 9 0 006.18-15.65.5.5 0 00-.54-.03l-1.57.85a7 7 0 11-8.5 0l-1.57-.85a.5.5 0 00-.54.03A9 9 0 0012 21zM12 5a7 7 0 00-4.6 1.77l.5.27.05.02 1.5.82a.5.5 0 00.54-.03L12 5zM4 12c0-1.6.5-3.08 1.34-4.32l.74.4c.06.03.13.04.2.04.07 0 .14-.02.2-.05l1.64-.89A5 5 0 0112 7.02V12h-8zM20 12h-8v-4.98a5 5 0 013.02 1.39l1.64.89a.5.5 0 00.2.05c.07 0 .14-.01.2-.04l.74-.4C19.5 8.92 20 10.4 20 12z"/></svg>
            </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Tim</p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ totalTeams }}</p>
            </div>
            <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Game</p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ potData.games }}</p>
            </div>
            <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Poin Akumulasi</p>
                <p class="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{{ overallTotalScore }}</p>
            </div>
        </div>

        <div class="flex flex-wrap gap-3 mb-6">
            <button 
                @click="sortingMode = (sortingMode === 'default' ? 'points_then_kill' : 'default')" 
                class="flex items-center space-x-2 px-4 py-2 rounded-lg transition duration-150 shadow-md font-semibold"
                :class="sortingMode === 'points_then_kill' ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'"
            >
                <span>
                    {{ sortingMode === 'points_then_kill' ? '✅ Peringkat Aktif (Poin/Kill)' : 'Urutkan (Default)' }}
                </span>
            </button>
            
            <button @click="addTeam" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-150 font-semibold">＋ Tim</button>
            <button @click="openImportModal" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-150 font-semibold">➕ Impor Tim Massal</button>
            <button @click="addGame" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-150 font-semibold">＋ Game</button>
            <button @click="removeGame" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-150 font-semibold">− Game</button>
            
            <button @click="deleteAllScores" class="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition duration-150 font-semibold">⚡ Reset Skor Saja</button>
            <button @click="resetAllData" class="px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 transition duration-150 font-semibold">🗑️ Reset Semua Data</button>
            
            <button 
                @click="hideActionColumn = !hideActionColumn"
                class="px-4 py-2 rounded-lg transition duration-150 font-semibold"
                :class="hideActionColumn ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'"
            >
                {{ hideActionColumn ? '✅ Kolom Aksi Tersembunyi' : 'Sembunyikan Kolom Aksi' }}
            </button>
        </div>

        <div class="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                    <tr>
                        <th rowspan="2" class="p-3 bg-indigo-600 text-white sticky left-0 z-10">Rank</th>
                        <th rowspan="2" class="p-3 bg-indigo-600 text-white sticky left-12 z-10">Nama Tim</th>
                        
                        <th v-for="(header, index) in gameHeaders" :key="index" :colspan="header.colspan" class="p-3 bg-indigo-600 text-white text-center border-l border-r border-indigo-700">
                            {{ header.text }}
                        </th>
                        
                        <th rowspan="2" class="p-3 bg-indigo-600 text-white text-center">Total Poin</th>
                        <th v-if="!hideActionColumn" rowspan="2" class="p-3 bg-indigo-600 text-white text-center">Aksi</th>
                    </tr>
                    <tr>
                        <template v-for="(header, gIndex) in gameHeaders" :key="gIndex">
                            <th class="p-2 bg-indigo-500 text-white text-center border-l border-r border-indigo-600 text-xs">Rank</th>
                            <th class="p-2 bg-indigo-500 text-white text-center border-r border-indigo-600 text-xs">P.Rank</th>
                            <th class="p-2 bg-indigo-500 text-white text-center border-r border-indigo-600 text-xs">Kill</th>
                        </template>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                    <tr v-for="(team, tIndex) in rankedTeams" :key="team.id" class="hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-100 text-gray-800 dark:text-gray-200">
                        
                        <td class="p-3 text-center font-extrabold sticky left-0 z-5"
                            :class="{
                                'text-white bg-yellow-500 text-lg': team.currentRank === 1,
                                'text-white bg-gray-400 text-lg': team.currentRank === 2,
                                'text-white bg-yellow-700 text-lg': team.currentRank === 3,
                                'bg-white dark:bg-gray-800': team.currentRank > 3,
                            }">
                            {{ team.currentRank }}
                        </td>

                        <td class="p-3 text-left font-medium sticky left-12 z-5 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700">
                            <input 
                                v-model="team.name"
                                class="bg-transparent border-none focus:ring-0 focus:border-0 w-full dark:text-white"
                            />
                        </td>

                        <template v-for="(score, gIndex) in team.scores" :key="gIndex">
                            
                            <td class="p-0 text-center">
                                <input 
                                    :value="score.rank"
                                    @input="event => handleScoreChange(tIndex, gIndex, 'rank', event)" 
                                    type="text"
                                    inputmode="numeric"
                                    class="w-full h-full text-center border-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white p-2 bg-white"
                                    maxlength="2"
                                />
                            </td>
                            
                            <td class="p-2 text-center bg-gray-100 dark:bg-gray-700 font-semibold text-sm">
                                {{ score.pRank }}
                            </td>
                            
                            <td class="p-0 text-center">
                                <input 
                                    :value="score.kill"
                                    @input="event => handleScoreChange(tIndex, gIndex, 'kill', event)" 
                                    type="text"
                                    inputmode="numeric"
                                    class="w-full h-full text-center border-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white p-2 bg-white"
                                    maxlength="3"
                                />
                            </td>
                        </template>

                        <td class="p-3 text-center font-bold bg-indigo-50 dark:bg-gray-700 text-indigo-700 dark:text-indigo-400">
                            {{ team.totalScore }}
                        </td>
                        
                        <td v-if="!hideActionColumn" class="p-3 text-center">
                            <button @click="deleteTeam(team.id)" class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 font-bold transition duration-150">
                                ✖ Hapus
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
    
    <div v-if="isSettingsModalOpen" class="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
        <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl max-w-lg w-full transform transition-all duration-300 border border-gray-200 dark:border-gray-700">
            <h3 class="text-2xl font-bold mb-4 text-gray-900 dark:text-white border-b pb-2 border-gray-200 dark:border-gray-700">
                Pengaturan Poin Placement
            </h3>
            
            <div class="max-h-96 overflow-y-auto pr-2 space-y-3">
                <div v-for="(item, index) in dynamicPlacementPoints" :key="index" class="flex items-center space-x-4">
                    <label :for="`rank-${item.rank}`" class="w-20 font-medium text-gray-700 dark:text-gray-300">
                        Rank {{ item.rank }}
                    </label>
                    <input 
                        type="number" 
                        v-model.number="item.points" 
                        :id="`rank-${item.rank}`"
                        class="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 dark:text-white"
                        min="0"
                    />
                </div>
                
                <button 
                    @click="dynamicPlacementPoints.push({ rank: dynamicPlacementPoints.length + 1, points: 0 })" 
                    class="mt-4 bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-400 px-4 py-2 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-800 transition duration-150 text-sm font-semibold w-full"
                >
                    + Tambah Rank
                </button>
            </div>
            
            <div class="mt-6 flex justify-end space-x-3">
                <button @click="closeSettingsModal" class="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition duration-150 font-semibold">
                    Tutup & Simpan
                </button>
            </div>
        </div>
    </div>
    
    <div v-if="isImportModalOpen" class="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
        <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl max-w-lg w-full transform transition-all duration-300 border border-gray-200 dark:border-gray-700">
            <div class="flex justify-between items-start mb-4">
                <h3 class="text-2xl font-bold text-gray-900 dark:text-white">
                    ➕ Impor Daftar Tim
                </h3>
                <button @click="closeImportModal" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none">&times;</button>
            </div>
            
            <p class="mb-3 text-gray-700 dark:text-gray-300">
                Masukkan satu nama tim per baris:
            </p>
            
            <textarea 
                v-model="teamNamesInput" 
                placeholder="Contoh:&#10;Team Alpha&#10;Team Beta&#10;Team Gamma"
                rows="10"
                class="w-full p-3 mb-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 dark:text-white resize-y"
            ></textarea>
            
            <div class="mt-4 flex justify-end">
                <button 
                    @click="importTeams" 
                    class="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition duration-150 font-semibold w-full"
                >
                    Tambahkan Tim
                </button>
            </div>
        </div>
    </div>
</template>