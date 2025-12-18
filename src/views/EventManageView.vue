<script setup>
import { ref, computed, onMounted } from 'vue';
import { useThemeStore } from '@/stores/theme';
import { supabase } from '@/supabaseClient';
const EVENT_ID = '00000000-0000-0000-0000-000000000001'; 

const pots = ref([]); 

const selectedPotId = ref(null); 

// --- STATE KONTROL UI LAIN ---
const isSettingsModalOpen = ref(false); 
const isImportModalOpen = ref(false); 
const teamNamesInput = ref('');
const sortingMode = ref('points_then_kill'); 
const hideActionColumn = ref(false); 
const isLoading = ref(true); // State loading untuk fetching data
const error = ref(null); // State error

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
        if (item.rank > 0) {
             acc[item.rank] = item.points;
        }
        return acc;
    }, {});
});

// --- KOMPUTASI STATE AKTIF ---
const currentPot = computed(() => {
    return pots.value.find(p => p.id === selectedPotId.value);
});

const currentPotGamesCount = computed(() => {
    return currentPot.value?.games?.length || 0;
});

// --- KOMPUTASI PERINGKAT DAN SKOR ---
const rankedTeams = computed(() => {
    if (!currentPot.value || !currentPot.value.teams) return [];
    
    const gamesCount = currentPotGamesCount.value;

    // 1. Hitung Skor Dasar & Normalisasi Skor
    const teamsCalculated = currentPot.value.teams.map((team) => {
        let totalScore = 0;
        let totalKills = 0;

        // Pastikan scores array memiliki panjang yang sama dengan jumlah game
        const normalizedScores = Array(gamesCount).fill(null).map((_, gIndex) => {
            const gameNumber = gIndex + 1;
            // Temukan raw_score berdasarkan game_number
            const rawScore = team.raw_scores.find(rs => rs.game_number === gameNumber) || {};
            
            const rank = parseInt(rawScore.rank) || 0;
            const kill = parseInt(rawScore.kill) || 0;
            
            const pRank = placementPointsLookup.value[rank] || 0; 
            
            totalScore += pRank + kill;
            totalKills += kill;

            return {
                raw_score_id: rawScore.id, 
                game_id: rawScore.game_id, // Simpan game_id untuk update skor
                rank: rank > 0 ? String(rank) : '', 
                kill: kill > 0 ? String(kill) : '',
                pRank,
                game_number: gameNumber,
            };
        });

        return {
            ...team,
            scores: normalizedScores, 
            totalScore: totalScore,
            totalKills: totalKills,
        };
    });

    // 2. Terapkan Sorting
    const sorted = [...teamsCalculated].sort((a, b) => {
        if (sortingMode.value === 'points_then_kill') {
            if (b.totalScore !== a.totalScore) {
                return b.totalScore - a.totalScore;
            }
            return b.totalKills - a.totalKills;
        }
        return 0;
    });

    // 3. Tambahkan Current Rank
    return sorted.map((team, rankIndex) => ({
        ...team,
        currentRank: rankIndex + 1,
    }));
});

// --- KOMPUTASI METRIK LAIN ---
const totalTeams = computed(() => rankedTeams.value.length);
const overallTotalScore = computed(() => {
    return rankedTeams.value.reduce((sum, team) => sum + team.totalScore, 0);
});
const gameHeaders = computed(() => {
    const headers = [];
    for (let i = 1; i <= currentPotGamesCount.value; i++) {
        headers.push({ colspan: 3, text: `Game ${i}` });
    }
    return headers;
});

// ------------------------------------------------------------------
// --- FUNGSI PENGAMBILAN DATA (FETCHING) ---
// ------------------------------------------------------------------

/**
 * Mengambil data Pots, Games, dan Teams beserta Raw Scores dari Supabase
 */
const fetchPotsAndTeams = async () => {
    isLoading.value = true;
    error.value = null;

    try {
        // 1. Ambil semua data pot, game, tim, dan skor dalam satu kali fetch
        const { data: potsData, error: potError } = await supabase
            .from('pots')
            .select(`
                id,
                name,
                display_order,
                games (
                    id,
                    game_number
                ),
                team_pot_mapping (
                    teams (
                        id,
                        name,
                        members,
                        raw_scores (
                            id,
                            rank,
                            kill,
                            game_id,
                            games (game_number)
                        )
                    )
                )
            `)
            .eq('event_id', EVENT_ID)
            .order('display_order', { ascending: true });

        if (potError) throw potError;

        // 2. Rekonstruksi Data ke struktur lokal
        const newPots = potsData.map(pot => {
            
            const teamsInPot = pot.team_pot_mapping
                .map(tm => {
                    const team = tm.teams;
                    if (!team) return null;

                    // Normalisasi raw_scores
                    const raw_scores = team.raw_scores
                        .map(rs => ({
                            ...rs,
                            game_number: rs.games.game_number,
                            game_id: rs.game_id,
                        }))
                        .filter(rs => rs.game_number); 

                    return {
                        id: team.id,
                        name: team.name,
                        members: team.members || [],
                        raw_scores: raw_scores,
                    };
                }).filter(t => t !== null);

            return {
                id: pot.id,
                name: pot.name,
                // Simpan detail games (id, game_number)
                games: pot.games.sort((a, b) => a.game_number - b.game_number), 
                teams: teamsInPot,
            };
        });

        pots.value = newPots;
        
        // Pilih pot pertama jika belum ada yang terpilih
        if (!selectedPotId.value && newPots.length > 0) {
            selectedPotId.value = newPots[0].id;
        }

    } catch (err) {
        console.error('Error fetching data:', err);
        error.value = 'Gagal mengambil data dari Supabase: ' + err.message;
    } finally {
        isLoading.value = false;
    }
};

onMounted(() => {
    fetchPotsAndTeams();
    // ⚠️ TODO: Fetch point_mapping dari Supabase di sini
});


// ------------------------------------------------------------------
// --- HANDLER SKOR (UPDATE / INSERT raw_scores) ---
// ------------------------------------------------------------------

const handleScoreChange = async (teamId, gameIndex, type, event) => {
    if (!currentPot.value) return;
    let value = event.target.value;
    value = value.replace(/[^0-9]/g, ''); 
    // Kirim null jika input kosong agar kolom integer/numeric Supabase bisa menerima null
    const finalValue = value === '' ? null : parseInt(value); 

    const potGames = currentPot.value.games;
    const gameToUpdate = potGames[gameIndex];
    
    if (!gameToUpdate) return console.error('Game ID tidak ditemukan.');
    const gameId = gameToUpdate.id;

    // Temukan existing raw_score_id dari state lokal
    const team = currentPot.value.teams.find(t => t.id === teamId);
    const existingScore = team?.raw_scores.find(rs => rs.game_id === gameId);
    
    const updateData = { [type]: finalValue };

    try {
        if (existingScore) {
            // UPDATE existing raw_score
            const { error: updateError } = await supabase
                .from('raw_scores')
                .update(updateData)
                .eq('id', existingScore.id);
            
            if (updateError) throw updateError;
            
        } else {
            // INSERT new raw_score
            const insertPayload = {
                game_id: gameId,
                team_id: teamId,
                // Pastikan kedua kolom rank dan kill terisi untuk menghindari null
                rank: type === 'rank' ? finalValue : null, 
                kill: type === 'kill' ? finalValue : 0, 
            };
            const { error: insertError } = await supabase
                .from('raw_scores')
                .insert(insertPayload);

            if (insertError) throw insertError;
        }
        
        // Refresh data setelah update/insert sukses
        await fetchPotsAndTeams(); 

    } catch (err) {
        console.error(`Error ${existingScore ? 'updating' : 'inserting'} score:`, err);
        alert(`Gagal menyimpan skor: ${err.message}`);
        // Jika gagal, kembalikan nilai lama (walaupun ini butuh menyimpan nilai lama)
    }
};


// ------------------------------------------------------------------
// --- HANDLER CRUD TIM (Supabase) ---
// ------------------------------------------------------------------

/**
 * Menambahkan satu tim baru ke database dan memetakannya ke pot aktif.
 */
const addTeam = async (teamName = `Team Baru ${totalTeams.value + 1}`) => {
    if (!currentPot.value) return alert('Silakan buat atau pilih Pot Game terlebih dahulu.');
    
    const potId = currentPot.value.id;
    const gamesInPot = currentPot.value.games || [];
    let newTeamId;

    try {
        // 1. Insert ke tabel 'teams'
        const { data: teamData, error: teamError } = await supabase
            .from('teams')
            .insert({
                event_id: EVENT_ID,
                name: teamName,
                members: [],
            })
            .select('id')
            .single();
        
        if (teamError) throw teamError;
        
        newTeamId = teamData.id;

        // 2. Insert ke tabel 'team_pot_mapping'
        const { error: mappingError } = await supabase
            .from('team_pot_mapping')
            .insert({
                team_id: newTeamId,
                pot_id: potId,
            });

        if (mappingError) throw mappingError;
        
        // 3. Insert raw_scores default untuk setiap game yang ada
        if (gamesInPot.length > 0) {
            const scoreInserts = gamesInPot.map(game => ({
                game_id: game.id,
                team_id: newTeamId,
                rank: null, 
                kill: 0, 
            }));
            
            const { error: scoreError } = await supabase
                .from('raw_scores')
                .insert(scoreInserts);

            if (scoreError) console.warn('Gagal menambahkan skor default:', scoreError.message);
        }

        // 4. Refresh data setelah sukses
        fetchPotsAndTeams();

    } catch (err) {
        // Lakukan rollback sederhana jika langkah tengah gagal (opsional: implementasi lebih canggih)
        if (newTeamId) {
            await supabase.from('teams').delete().eq('id', newTeamId);
        }
        alert('Gagal menambahkan tim: ' + err.message);
        console.error('Add Team Error:', err);
    }
};

/**
 * Menghapus tim hanya dari pot aktif (dengan menghapus mapping dan skor di pot tersebut).
 */
const deleteTeam = async (teamId) => {
    if (!currentPot.value) return;
    if (!confirm("Apakah Anda yakin ingin menghapus tim ini dari POT AKTIF?")) return;
    
    try {
        // 1. Ambil game IDs di pot ini
        const gameIds = currentPot.value.games.map(g => g.id);
        
        // 2. Hapus raw_scores yang terkait
        const { error: scoreDelError } = await supabase
            .from('raw_scores')
            .delete()
            .eq('team_id', teamId)
            .in('game_id', gameIds); // Hapus skor hanya untuk game di pot ini
        
        if (scoreDelError) throw scoreDelError;

        // 3. Hapus dari team_pot_mapping (memisahkan tim dari pot)
        const { error: mappingDelError } = await supabase
            .from('team_pot_mapping')
            .delete()
            .eq('team_id', teamId)
            .eq('pot_id', currentPot.value.id);
        
        if (mappingDelError) throw mappingDelError;
        
        // 4. Refresh data
        fetchPotsAndTeams();

    } catch (err) {
        alert('Gagal menghapus tim dari pot: ' + err.message);
        console.error('Delete Team Error:', err);
    }
};

/**
 * Mengimpor banyak tim dari textarea.
 */
const importTeams = async () => {
    if (!currentPot.value) return;
    const teamNames = teamNamesInput.value
                                    .split('\n')
                                    .map(name => name.trim())
                                    .filter(name => name.length > 0);

    if (teamNames.length === 0) {
        alert("Masukkan minimal satu nama tim.");
        return;
    }
    
    const potId = currentPot.value.id;
    const gamesInPot = currentPot.value.games || [];
    
    try {
        // 1. Insert Tim ke tabel 'teams' (massal)
        const teamInserts = teamNames.map(name => ({
            event_id: EVENT_ID,
            name: name,
            members: [],
        }));
        
        const { data: newTeamsData, error: teamsError } = await supabase
            .from('teams')
            .insert(teamInserts)
            .select('id');
        
        if (teamsError) throw teamsError;
        
        const newTeamIds = newTeamsData.map(t => t.id);
        
        // 2. Insert ke tabel 'team_pot_mapping' (massal)
        const mappingInserts = newTeamIds.map(teamId => ({
            team_id: teamId,
            pot_id: potId,
        }));
        
        const { error: mappingError } = await supabase
            .from('team_pot_mapping')
            .insert(mappingInserts);

        if (mappingError) throw mappingError;

        // 3. Insert raw_scores default untuk setiap game
        if (gamesInPot.length > 0) {
            const scoreInserts = [];
            for (const teamId of newTeamIds) {
                for (const game of gamesInPot) {
                    scoreInserts.push({
                        game_id: game.id,
                        team_id: teamId,
                        rank: null, 
                        kill: 0, 
                    });
                }
            }
            
            const { error: scoreError } = await supabase
                .from('raw_scores')
                .insert(scoreInserts);
                
            if (scoreError) console.warn('Gagal menambahkan skor default massal:', scoreError.message);
        }
        
        // 4. Refresh data
        fetchPotsAndTeams();
        closeImportModal();

    } catch (err) {
        alert('Gagal mengimpor tim: ' + err.message);
        console.error('Import Teams Error:', err);
    }
};

// ------------------------------------------------------------------
// --- HANDLER CRUD POT & GAMES (Supabase) ---
// ------------------------------------------------------------------

const addPot = async () => {
    const newPotName = `Pot Baru ${pots.value.length + 1}`;
    const displayOrder = pots.value.length + 1;
    let newPotId;
    
    try {
        // 1. Insert ke tabel 'pots'
        const { data: potData, error: potError } = await supabase
            .from('pots')
            .insert({
                event_id: EVENT_ID,
                name: newPotName,
                display_order: displayOrder,
            })
            .select('id')
            .single();
        
        if (potError) throw potError;
        
        newPotId = potData.id;

        // 2. Tambahkan game default (Game 1) ke tabel 'games'
        const { error: gameError } = await supabase
            .from('games')
            .insert({
                pot_id: newPotId,
                game_number: 1,
            });

        if (gameError) console.warn('Gagal menambahkan game default untuk pot baru:', gameError.message);
        
        // 3. Refresh data
        fetchPotsAndTeams();
        selectedPotId.value = newPotId;

    } catch (err) {
        alert('Gagal menambahkan Pot: ' + err.message);
        console.error('Add Pot Error:', err);
    }
};

const addGame = async () => {
    if (!currentPot.value) return alert('Pilih atau buat Pot Game terlebih dahulu.');
    
    const potId = currentPot.value.id;
    const newGameNumber = currentPotGamesCount.value + 1;
    let newGameId;
    
    try {
        // 1. Insert Game baru
        const { data: newGameData, error: gameError } = await supabase
            .from('games')
            .insert({
                pot_id: potId,
                game_number: newGameNumber,
            })
            .select('id')
            .single();

        if (gameError) throw gameError;
        
        newGameId = newGameData.id;
        
        // 2. Insert raw_scores default untuk semua tim yang ada
        const teamIds = currentPot.value.teams.map(t => t.id);
        if (teamIds.length > 0) {
            const scoreInserts = teamIds.map(teamId => ({
                game_id: newGameId,
                team_id: teamId,
                rank: null, 
                kill: 0, 
            }));
            
            const { error: scoreError } = await supabase
                .from('raw_scores')
                .insert(scoreInserts);
                
            if (scoreError) console.warn('Gagal menambahkan skor default untuk game baru:', scoreError.message);
        }

        // 3. Refresh data
        fetchPotsAndTeams();

    } catch (err) {
        alert('Gagal menambahkan Game: ' + err.message);
        console.error('Add Game Error:', err);
    }
};

const removeGame = async () => {
    if (!currentPot.value || currentPotGamesCount.value <= 1) return alert('Setidaknya harus ada 1 Game.');
    
    if(!confirm("Apakah Anda yakin ingin menghapus Game terakhir? Ini akan menghapus semua skor di game tersebut secara permanen.")) return;
    
    const potId = currentPot.value.id;
    const gameToDelete = currentPot.value.games.find(g => g.game_number === currentPotGamesCount.value);
        
    if (!gameToDelete) return alert('Game yang akan dihapus tidak ditemukan.');
    const gameId = gameToDelete.id;
    
    try {
        // 1. Hapus raw_scores yang terkait dengan game ini
        const { error: scoreDelError } = await supabase
            .from('raw_scores')
            .delete()
            .eq('game_id', gameId);
        
        if (scoreDelError) throw scoreDelError;

        // 2. Hapus Game dari tabel 'games'
        const { error: gameDelError } = await supabase
            .from('games')
            .delete()
            .eq('id', gameId);
        
        if (gameDelError) throw gameDelError;

        // 3. Refresh data
        fetchPotsAndTeams();
    } catch (err) {
        alert('Gagal menghapus Game: ' + err.message);
        console.error('Remove Game Error:', err);
    }
};

// ------------------------------------------------------------------
// --- HANDLER MODAL & NON-CRUD ---
// ------------------------------------------------------------------

const openSettingsModal = () => { isSettingsModalOpen.value = true; };
const closeSettingsModal = () => { isSettingsModalOpen.value = false; };

const openImportModal = () => {
  if (!currentPot.value) return alert('Pilih atau buat Pot Game terlebih dahulu.');
  teamNamesInput.value = ''; 
  isImportModalOpen.value = true;
};
const closeImportModal = () => { isImportModalOpen.value = false; };

const deleteAllScores = () => {
    if (!currentPot.value) return;
    alert("⚠️ Peringatan: Logika 'Reset Skor Saja' memerlukan implementasi Supabase DELETE/UPDATE massal yang hati-hati. Saat ini belum diimplementasikan.");
};

const resetAllData = () => {
    if (!currentPot.value) return;
    alert("⚠️ Peringatan: Logika 'Reset Semua Data' adalah operasi yang sangat destruktif. Saat ini belum diimplementasikan.");
};

</script>

<template>
    <div class="p-4 md:p-8">
        
        <div class="flex flex-wrap gap-2 mb-6 border-b pb-4 border-gray-200 dark:border-gray-700">
            <button
                v-for="pot in pots"
                :key="pot.id"
                @click="selectedPotId = pot.id"
                class="px-4 py-2 rounded-lg transition duration-150 font-semibold text-sm"
                :class="selectedPotId === pot.id ? 
                    'bg-indigo-600 text-white shadow-lg' : 
                    'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'"
            >
                {{ pot.name }}
            </button>
            <button 
                @click="addPot" 
                class="px-4 py-2 rounded-lg transition duration-150 font-semibold text-sm bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-800"
            >
                ＋ Tambah Pot Baru
            </button>
        </div>
        
        <div v-if="isLoading" class="text-center p-10">
            <p class="text-xl font-semibold text-indigo-600 dark:text-indigo-400">
                Memuat data dari Supabase...
            </p>
        </div>
        
        <div v-else-if="error" class="text-center p-10 bg-red-100 dark:bg-red-900 border border-red-400 rounded-lg">
            <p class="text-red-700 dark:text-red-300 font-semibold">
                ⚠️ Terjadi Kesalahan: {{ error }}
            </p>
            <p class="text-sm text-red-500 dark:text-red-400 mt-2">Pastikan `EVENT_ID` dan konfigurasi Supabase di `src/supabaseClient.js` sudah benar.</p>
        </div>

        <div v-else-if="currentPot">
            <div class="flex justify-between items-center mb-6 border-b pb-4 border-gray-200 dark:border-gray-700">
                <h1 class="text-3xl font-extrabold text-gray-900 dark:text-white">
                    <input 
                        class="bg-transparent border-none focus:ring-0 focus:border-0 w-full dark:text-white" 
                        v-model="currentPot.name"
                        placeholder="Nama Pot/Grup"
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
                    <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Game (Pot Aktif)</p>
                    <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ currentPotGamesCount }}</p>
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
                
                <button @click="addTeam()" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-150 font-semibold">＋ Tim</button>
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
                                        @input="event => handleScoreChange(team.id, gIndex, 'rank', event)" 
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
                                        @input="event => handleScoreChange(team.id, gIndex, 'kill', event)" 
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
        
        <div v-else class="text-center p-10 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
            <p class="mb-4 text-gray-600 dark:text-gray-400 font-semibold text-lg">
                Tidak ada Pot Game yang dimuat atau dipilih. Silakan buat yang baru.
            </p>
            <button @click="addPot" class="px-6 py-3 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-md">
                Buat Pot Game Pertama
            </button>
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
                    ➕ Impor Daftar Tim (Pot: {{ currentPot ? currentPot.name : 'N/A' }})
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
                    :disabled="!currentPot"
                    class="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition duration-150 font-semibold w-full disabled:bg-indigo-400"
                >
                    Tambahkan Tim
                </button>
            </div>
        </div>
    </div>
</template>