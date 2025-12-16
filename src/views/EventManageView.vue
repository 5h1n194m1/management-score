<template>
  <div class="event-manager-view">
    <!-- Navbar -->
    <div class="navbar" id="navbar">
      <div class="nav-left">
        <button @click="toggleNavbar" class="nav-toggle" id="navToggleBtn">Toggle Navbar</button>
        <div class="nav-menu">
          <a href="#" class="nav-link">Home</a>
          <a href="#" class="nav-link">Pots</a>
          <a href="#" class="nav-link">Recap</a>
        </div>
      </div>
      <div class="nav-right">
        <button @click="toggleFullscreen" class="nav-toggle" id="fullScreenBtn">Full Screen Mode</button>
      </div>
    </div>

    <!-- Controls Bar -->
    <div class="controls-bar" id="controlsBar">
      <div class="theme-toggle">
        <input type="checkbox" id="darkModeToggle" @change="toggleDarkMode">
        <label for="darkModeToggle">🌙 Dark Mode</label>
      </div>
      <label>Ukuran Judul Turnamen: 
        <input type="range" id="titleSizeRange" min="20" max="40" v-model="titleSize" />
      </label>
      <label>Ukuran Judul Pot: 
        <input type="range" id="potTitleSizeRange" min="16" max="30" v-model="potTitleSize" />
      </label>
      <label>Warna Latar: 
        <input type="color" id="bgPicker" v-model="bgColor" />
      </label>
      <label>Warna Kartu: 
        <input type="color" id="cardPicker" v-model="cardColor" />
      </label>
      <label>Warna Tombol: 
        <input type="color" id="btnPicker" v-model="btnColor" />
      </label>
      <label>Warna Header Tabel: 
        <input type="color" id="headerPicker" v-model="headerColor" />
      </label>
    </div>

    <!-- Main Container -->
    <div class="container" id="mainCard">
      <div class="top-row">
        <input v-model="tournamentName" class="title-editable" placeholder="Nama Turnamen" />
        
        <div class="top-actions-group">
          <button class="action-btn" @click="toggleDisplay">👀 Tampilkan Tampilan</button>
          <button class="action-btn" @click="toggleDataActions">✏️ Tampilkan Aksi Data</button>
          <button class="action-btn" @click="resetAllData">🗑️ Reset Semua Data</button>
          <button class="action-btn" @click="addPot">+ Pot Baru</button>
        </div>
      </div>

      <div id="potsHolder" class="pots-holder">
        <div v-for="(pot, index) in pots" :key="index" class="pot-container">
          <!-- Pot Content -->
          <div class="pot-header">
            <input class="title-editable" v-model="pot.name" />
          </div>

          <!-- Pot Actions -->
          <div class="pot-actions">
            <button class="action-btn small" @click="addTeam(pot)">＋ Tim</button>
            <button class="action-btn small" @click="openImportModal(pot)">➕ Impor Tim</button>
            <button class="action-btn small" @click="removeTeam(pot)">− Tim</button>
            <button class="action-btn small" @click="addGame(pot)">＋ Game</button>
            <button class="action-btn small" @click="removeGame(pot)">− Game</button>
          </div>

          <!-- Pot Table -->
          <div class="overflow-x">
            <table>
              <thead>
                <tr class="head-row-1">
                  <th>No</th>
                  <th>Nama Tim</th>
                  <th v-for="game in pot.games" :key="game">Game {{ game }}</th>
                  <th>Total</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(team, index) in pot.teams" :key="index">
                  <td>{{ index + 1 }}</td>
                  <td>{{ team.name }}</td>
                  <td v-for="game in pot.games" :key="game">
                    <input type="number" v-model="team.scores[game - 1].rank" />
                  </td>
                  <td>{{ calculateTotal(team) }}</td>
                  <td>
                    <button @click="deleteTeam(pot, index)">✖</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pot Footer -->
          <div class="bottom-actions-pot">
            <button class="action-btn small" @click="exportPotCSV(pot)">📤 Export XLSX</button>
            <button class="action-btn small" @click="exportToGoogleSheet(pot)" style="background: #28a745;">💾 Simpan ke Sheet</button>
            <button class="action-btn small" @click="deletePot(pot)">🗑️ Hapus Pot</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Import Teams -->
    <div id="importTeamModal" class="modal" v-if="isModalVisible">
      <div class="modal-content">
        <span @click="closeModal" class="close-btn">&times;</span>
        <h3>➕ Impor Daftar Tim</h3>
        <textarea v-model="importText" placeholder="Contoh:&#10;Team A&#10;Team B&#10;Team C"></textarea>
        <button class="action-btn" @click="importTeams">Tambahkan Tim</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { supabase } from '@/supabaseClient.js'

const tournamentName = ref("Nama Turnamen FF/PUBG")
const titleSize = ref(26)
const potTitleSize = ref(20)
const bgColor = ref("#f4f4f9")
const cardColor = ref("#ffffff")
const btnColor = ref("#6200ea")
const headerColor = ref("#6200ea")
const isModalVisible = ref(false)
const importText = ref('')
const pots = ref([])

const toggleNavbar = () => {
  const navbar = document.getElementById("navbar")
  navbar.classList.toggle("hidden")
}

const toggleFullscreen = () => {
  document.body.classList.toggle("display-hidden")
}

const toggleDarkMode = (e) => {
  if (e.target.checked) {
    document.body.classList.add("dark-mode")
  } else {
    document.body.classList.remove("dark-mode")
  }
}

const toggleDisplay = () => {
  document.body.classList.toggle("display-hidden")
}

const toggleDataActions = () => {
  document.body.classList.toggle("data-actions-hidden")
}

const addPot = () => {
  pots.value.push({
    name: `Pot ${pots.value.length + 1}`,
    teams: [],
    games: [1] // Default game
  })
}

const addTeam = (pot) => {
  pot.teams.push({
    name: `Team ${pot.teams.length + 1}`,
    scores: [{ rank: 0, placement: 0, kill: 0 }]
  })
}

const removeTeam = (pot) => {
  if (pot.teams.length > 0) {
    pot.teams.pop()
  }
}

const addGame = (pot) => {
  pot.games.push(pot.games.length + 1)
}

const removeGame = (pot) => {
  if (pot.games.length > 1) {
    pot.games.pop()
  }
}

const calculateTotal = (team) => {
  return team.scores.reduce((total, score) => total + score.rank + score.kill, 0)
}

const deleteTeam = (pot, index) => {
  pot.teams.splice(index, 1)
}

const deletePot = (pot) => {
  pots.value = pots.value.filter(p => p !== pot)
}

const exportPotCSV = (pot) => {
  // Logic to export pot to CSV
}

const exportToGoogleSheet = (pot) => {
  // Logic to export to Google Sheets using Supabase
}

const importTeams = () => {
  const teamNames = importText.value.split('\n').map(name => name.trim()).filter(name => name.length > 0)
  if (teamNames.length === 0) {
    alert("Masukkan minimal satu nama tim.")
    return
  }
  pots.value[0].teams = pots.value[0].teams.concat(teamNames.map(name => ({
    name,
    scores: Array(pots.value[0].games.length).fill({ rank: 0, placement: 0, kill: 0 })
  })))
  closeModal()
}

const openImportModal = () => {
  isModalVisible.value = true
}

const closeModal = () => {
  isModalVisible.value = false
}
</script>

<style scoped>
/* Use the same CSS styles from your earlier code */
</style>
