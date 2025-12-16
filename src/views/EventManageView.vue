<template>
  <div>
    <div class="navbar" id="navbar">
      <div class="nav-left">
        <button class="nav-toggle" id="navToggleBtn">Toggle Navbar</button>
        <div class="nav-menu">
          <a href="#" class="nav-link">Home</a>
          <a href="#" class="nav-link">Pots</a>
          <a href="#" class="nav-link">Recap</a>
        </div>
      </div>
      <div class="nav-right">
        <button class="nav-toggle" id="fullScreenBtn">Full Screen Mode</button>
      </div>
    </div>
    <div class="controls-bar" id="controlsBar">
      <div class="theme-toggle">
        <input type="checkbox" id="darkModeToggle" style="height: auto; width: auto;">
        <label for="darkModeToggle">🌙 Dark Mode</label>
      </div>
      <label>Ukuran Judul Turnamen: <input type="range" id="titleSizeRange" min="20" max="40" value="26" step="1" /></label>
      <label>Ukuran Judul Pot: <input type="range" id="potTitleSizeRange" min="16" max="30" value="20" step="1" /></label>
      <label>Warna Latar: <input type="color" id="bgPicker" value="#f4f4f9" /></label>
      <label>Warna Kartu: <input type="color" id="cardPicker" value="#ffffff" /></label>
      <label>Warna Tombol: <input type="color" id="btnPicker" value="#6200ea" /></label>
      <label>Warna Header Tabel: <input type="color" id="headerPicker" value="#6200ea" /></label>
    </div>
    <div class="container" id="mainCard">
      <div class="top-row">
        <input id="tournamentName" class="title-editable" value="Nama Turnamen FF/PUBG" />
        <div class="top-actions-group">
          <button class="action-btn" id="hideDisplayBtn" style="background: #007bff;">👀 Tampilkan Tampilan</button>
          <button class="action-btn" id="hideDataBtn" style="background: #28a745;">✏️ Tampilkan Aksi Data</button>
          <button class="action-btn" id="resetAllBtn" style="background: #dc3545;">🗑️ Reset Semua Data</button>
          <button class="action-btn" id="addPotBtn">+ Pot Baru</button>
        </div>
      </div>
      <div id="potsHolder"></div>
      <div class="small-muted">
        Tip: Klik Nama Turnamen / Nama Pot untuk edit. Masukkan Rank (1-12) dan Kill di setiap sel — nilai P.Rank (Placement Points) dan Total akan terhitung otomatis.
      </div>
    </div>
    <div class="calc" id="calc">
      <input id="calcDisplay" class="calc-display" placeholder="Masukkan ekspresi, contoh: 12 + 3 * 4" />
      <div class="calc-grid" id="calcGrid">
        <button class="calc-btn" data-k="7">7</button>
        <button class="calc-btn" data-k="8">8</button>
        <button class="calc-btn" data-k="9">9</button>
        <button class="calc-btn" data-k="/">/</button>
        <button class="calc-btn" data-k="4">4</button>
        <button class="calc-btn" data-k="5">5</button>
        <button class="calc-btn" data-k="6">6</button>
        <button class="calc-btn" data-k="*">*</button>
        <button class="calc-btn" data-k="1">1</button>
        <button class="calc-btn" data-k="2">2</button>
        <button class="calc-btn" data-k="3">3</button>
        <button class="calc-btn" data-k="-">-</button>
        <button class="calc-btn" data-k="0">0</button>
        <button class="calc-btn" data-k=".">.</button>
        <button class="calc-btn" id="calcClear">C</button>
        <button class="calc-btn" data-k="+">+</button>
        <button class="calc-btn" id="calcEq" style="grid-column: span 4; background: var(--btn); color: var(--btn-text);">= Hitung</button>
      </div>
      <div class="calc-error" id="calcError"></div>
    </div>
    <div id="importTeamModal" class="modal">
      <div class="modal-content">
        <span class="close-btn" id="closeImportModalBtn">&times;</span>
        <h3>➕ Impor Daftar Tim</h3>
        <p>Masukkan satu nama tim per baris:</p>
        <textarea id="teamNamesInput" placeholder="Contoh:&#10;Team A&#10;Team B&#10;Team C"></textarea>
        <button class="action-btn" id="importTeamsFinalBtn" style="width: 100%;">Tambahkan Tim</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'

let hideDisplayBtn
let hideDataBtn
let potsHolder
let potCounter = 1
const placementPoints = {1:12,2:9,3:8,4:7,5:6,6:5,7:4,8:3,9:2,10:1,11:0,12:0}
const API_URL = "https://script.google.com/macros/s/AKfycbzaPPS24jDetXhlULFwt_V9rP6z4u5_lgjHh1gZp3hwLlZtZr9bL-Rf3c2tfYVOZSab_Q/exec"
const root = document.documentElement
const body = document.body
let currentPotForImport = null

function generateGameHeaders(n){
  let out=''
  for(let i=1;i<=n;i++) out+=`<th colspan="3">Game ${i}</th>`
  return out
}
function generateGameSubHeaders(n){
  let out=''
  for(let i=1;i<=n;i++) out+=`<th>Rank</th><th>P.Rank</th><th>Kill</th>`
  return out
}
function generateEmptyRowContent(idx,games){
  let cols = `<td class="no">${idx}</td><td class="team-name" contenteditable="true">Team ${idx}</td>`
  for(let g=0;g<games;g++){
    cols+=`<td class="rank" contenteditable="true" inputmode="numeric"></td>`
    cols+=`<td class="placement">0</td>`
    cols+=`<td class="kill" contenteditable="true" inputmode="numeric"></td>`
  }
  cols+=`<td class="total-point">0</td>`
  cols+=`<td class="row-actions"><button class="delete-row">✖</button></td>`
  return cols
}
function generateEmptyRowHTML(idx,games){
  return `<tr>${generateEmptyRowContent(idx, games)}</tr>`
}
function potTemplateHTML(potIndex){
  const defaultGames = 1
  return `
    <div class="pot-header">
      <input class="title-editable pot-title" value="POT ${potIndex}" />
    </div>
    <div class="pot-actions">
      <button class="action-btn small" data-action="addTeam">＋ Tim</button>
      <button class="action-btn small" data-action="openImport">➕ Impor Tim</button>
      <button class="action-btn small" data-action="removeTeamAbove">− Tim</button>
      <button class="action-btn small" data-action="addGame">＋ Game</button>
      <button class="action-btn small" data-action="removeGame">− Game</button>
    </div>
    <div class="overflow-x">
      <table>
        <thead>
          <tr class="head-row-1">
            <th rowspan="2" class="no">No</th>
            <th rowspan="2">Nama Tim</th>
            ${generateGameHeaders(defaultGames)}
            <th rowspan="2">Total</th>
            <th rowspan="2">Aksi</th>
          </tr>
          <tr class="head-row-2">${generateGameSubHeaders(defaultGames)}</tr>
        </thead>
        <tbody>${generateEmptyRowHTML(1,defaultGames)}</tbody>
      </table>
    </div>
    <div class="bottom-actions-pot">
      <button class="action-btn small" data-action="exportPotCSV">📤 Export XLSX</button>
      <button class="action-btn small" data-action="exportToGoogleSheet" style="background: #28a745;">💾 Simpan ke Sheet</button>
      <button class="action-btn small delete-pot-btn" data-action="deletePot">🗑️ Hapus Pot</button>
    </div>
  `
}
function createDefaultPot(){
  const pot=document.createElement('div')
  pot.className='pot-container'
  pot.dataset.games=1
  pot.dataset.potId = potCounter++
  pot.innerHTML=potTemplateHTML(pot.dataset.potId)
  return pot
}
function renumberRows(tbody){
  tbody.querySelectorAll('tr').forEach((r,i)=>{
    const no=r.querySelector('.no'); if(no) no.textContent=i+1
  })
}
function renumberAll(){
  document.querySelectorAll('.pot-container').forEach(p=>{
    renumberRows(p.querySelector('tbody'))
  })
  saveDataToLocal()
}
function findTableFromButton(btn){ return btn.closest('.pot-container').querySelector('table') }
function addTeam(button){
  const table=findTableFromButton(button)
  const tbody=table.querySelector('tbody')
  const games=parseInt(button.closest('.pot-container').dataset.games)
  if (tbody.querySelectorAll('tr').length === 1) {
    const firstRow = tbody.querySelector('tr')
    const firstTeamNameCell = firstRow.querySelector('.team-name')
    if (firstTeamNameCell && firstTeamNameCell.textContent.trim() === 'Team 1') {
      firstRow.remove()
    }
  }
  const idx=tbody.querySelectorAll('tr').length+1
  const tr=document.createElement('tr')
  tr.innerHTML=generateEmptyRowContent(idx,games)
  tbody.appendChild(tr)
  renumberRows(tbody)
  saveDataToLocal()
}
function removeTeamAbove(button){
  const tbody=findTableFromButton(button).querySelector('tbody')
  const rows=tbody.querySelectorAll('tr')
  if(rows.length >= 1){ rows[rows.length-1].remove(); renumberRows(tbody)}
  if(tbody.querySelectorAll('tr').length === 0){
    const games=parseInt(button.closest('.pot-container').dataset.games)
    const tr=document.createElement('tr')
    tr.innerHTML=generateEmptyRowContent(1,games)
    tbody.appendChild(tr)
    renumberRows(tbody)
  }
  saveDataToLocal()
}
function deleteTeam(button){ 
  const tr=button.closest('tr') 
  const tbody=tr.parentElement 
  if(confirm('Hapus tim ini?')) { 
    tr.remove() 
    renumberRows(tbody)
    if(tbody.querySelectorAll('tr').length === 0){
      const games=parseInt(button.closest('.pot-container').dataset.games)
      const tr_dummy=document.createElement('tr')
      tr_dummy.innerHTML=generateEmptyRowContent(1,games)
      tbody.appendChild(tr_dummy)
      renumberRows(tbody)
    }
    saveDataToLocal()
  }
}
function addGame(button){
  const pot=button.closest('.pot-container')
  let games=parseInt(pot.dataset.games)+1
  pot.dataset.games=games
  const table=pot.querySelector('table')
  table.querySelector('.head-row-1').innerHTML=`<th rowspan="2" class="no">No</th><th rowspan="2">Nama Tim</th>${generateGameHeaders(games)}<th rowspan="2">Total</th><th rowspan="2">Aksi</th>`
  table.querySelector('.head-row-2').innerHTML=generateGameSubHeaders(games)
  table.querySelectorAll('tbody tr').forEach(r=>{
    let rank=document.createElement('td'); rank.className='rank'; rank.contentEditable='true'; rank.setAttribute('inputmode','numeric')
    let place=document.createElement('td'); place.className='placement'; place.textContent='0'
    let kill=document.createElement('td'); kill.className='kill'; kill.contentEditable='true'; kill.setAttribute('inputmode','numeric')
    const total=r.querySelector('.total-point')
    r.insertBefore(rank,total)
    r.insertBefore(place,total)
    r.insertBefore(kill,total)
    updatePoints(rank)
  })
  saveDataToLocal()
}
function removeGame(button){
  const pot=button.closest('.pot-container')
  let games=parseInt(pot.dataset.games)
  if(games<=1) return alert('Setidaknya harus ada 1 Game.')
  games--
  pot.dataset.games=games
  const table=pot.querySelector('table')
  table.querySelector('.head-row-1').innerHTML=`<th rowspan="2" class="no">No</th><th rowspan="2">Nama Tim</th>${generateGameHeaders(games)}<th rowspan="2">Total</th><th rowspan="2">Aksi</th>`
  table.querySelector('.head-row-2').innerHTML=generateGameSubHeaders(games)
  table.querySelectorAll('tbody tr').forEach(r=>{
    const total=r.querySelector('.total-point')
    for(let i=0; i<3; i++) {
      if(total.previousElementSibling) r.removeChild(total.previousElementSibling)
    }
    updatePoints(r.querySelector('.rank') || r.querySelector('.kill') || total)
  })
  saveDataToLocal()
}
function updatePoints(cell){
  const tr=cell.closest('tr')
  const pot=cell.closest('.pot-container')
  if(!pot) return
  const games=parseInt(pot.dataset.games)
  const ranks=Array.from(tr.querySelectorAll('.rank'))
  const placements=Array.from(tr.querySelectorAll('.placement'))
  const kills=Array.from(tr.querySelectorAll('.kill'))
  let total=0
  for(let i=0;i<games;i++){
    const r=parseInt((ranks[i]?.textContent||'').trim().replace(/[^\d]/g,''))||0
    const k=parseInt((kills[i]?.textContent||'').trim().replace(/[^\d]/g,''))||0
    const p=placementPoints[r]||0
    if(placements[i]) placements[i].textContent=p
    total+=p+k
  }
  tr.querySelector('.total-point').textContent=total
  saveDataToLocal()
}
function deletePot(button){
  if(confirm('Hapus pot ini?')) {
    button.closest('.pot-container').remove()
    saveDataToLocal()
  }
}
function exportPotCSV(button){
  const pot=button.closest('.pot-container')
  const potName=pot.querySelector('.pot-title').value||'POT'
  const table=pot.querySelector('table')
  const games=parseInt(pot.dataset.games)
  const teamsData = []
  table.querySelectorAll('tbody tr').forEach(r => {
    const totalPointCell = r.querySelector('.total-point')
    const teamNameCell = r.querySelector('.team-name')
    if (!totalPointCell || !teamNameCell) return
    const teamName = teamNameCell.textContent.trim()
    const totalPoint = parseInt(totalPointCell.textContent) || 0
    if (totalPoint === 0 && teamName.startsWith('Team ')) return
    const rowValues = [
      (r.querySelector('.no')?.textContent || '').trim(),
      teamName,
    ]
    const scoreCells = Array.from(r.querySelectorAll('td:not(.no):not(.team-name):not(.total-point):not(.row-actions)'))
    scoreCells.forEach(cell => {
      let content = (cell.textContent || '').trim()
      if(cell.classList.contains('rank') || cell.classList.contains('kill')) {
        content = content.replace(/[^\d]/g,'')
      }
      rowValues.push(content)
    })
    rowValues.push(totalPoint.toString())
    teamsData.push({
      total: totalPoint,
      rawData: rowValues
    })
  })
  teamsData.sort((a, b) => b.total - a.total)
  let currentRank = 0
  let prevTotal = -1
  const finalRows = teamsData.map((team, index) => {
    if (team.total < prevTotal || prevTotal === -1) {
      currentRank = index + 1
    }
    prevTotal = team.total
    const juaraColumn = currentRank === 0 ? '' : currentRank
    return [...team.rawData, juaraColumn]
  })
  const gameHeaders = Array(games).fill(null).map((_, i) => [`Game ${i+1}`, `Game ${i+1}`, `Game ${i+1}`]).flat()
  const gameSubHeaders = Array(games).fill(['Rank', 'P.Rank', 'Kill']).flat()
  const header1 = ['No', 'Nama Tim', ...gameHeaders, 'Total', 'Juara']
  const header2 = ['','', ...gameSubHeaders, '', '']
  const separator = '\t'
  let csvContent = 
    potName.toUpperCase() + separator + '\n' +
    header1.join(separator) + '\n' +
    header2.join(separator) + '\n' +
    finalRows.map(e => e.join(separator)).join('\n')
  const blob = new Blob([csvContent], { type: 'text/tab-separated-values;charset=utf-8;' })
  const link = document.createElement("a")
  if (link.download !== undefined) { 
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `${potName.replace(/[^a-z0-9]/gi, '_')}_Skor.xls`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } else {
    alert("Browser Anda tidak mendukung fitur download.")
  }
}
function getDataToSave() {
  const data = {
    tournamentName: document.getElementById('tournamentName').value,
    darkMode: body.classList.contains('dark-mode'),
    titleSize: root.style.getPropertyValue('--title-size').replace('px', ''),
    potTitleSize: root.style.getPropertyValue('--pot-title-size').replace('px', ''),
    customColors: {
      bg: root.style.getPropertyValue('--bg'),
      card: root.style.getPropertyValue('--card'),
      btn: root.style.getPropertyValue('--btn'),
      headerBg: root.style.getPropertyValue('--header-bg')
    },
    pots: []
  }
  document.querySelectorAll('.pot-container').forEach(pot => {
    const potData = {
      id: pot.dataset.potId,
      name: pot.querySelector('.pot-title').value,
      games: parseInt(pot.dataset.games),
      teams: []
    }
    pot.querySelectorAll('tbody tr').forEach(r => {
      const team = {
        name: r.querySelector('.team-name')?.textContent || '',
        scores: []
      }
      const cells = Array.from(r.querySelectorAll('td:not(.no):not(.team-name):not(.total-point):not(.row-actions)'))
      for (let i = 0; i < cells.length; i += 3) {
        if (cells[i] && cells[i+1] && cells[i+2]) {
          team.scores.push({
            rank: cells[i].textContent,
            placement: cells[i+1].textContent,
            kill: cells[i+2].textContent
          })
        }
      }
      const totalPoint = parseInt(r.querySelector('.total-point')?.textContent) || 0
      const teamName = (team.name || '').trim()
      if (totalPoint > 0 || (teamName && !teamName.startsWith('Team ') && teamName.length > 0)) {
        potData.teams.push(team)
      }
    })
    if (potData.teams.length > 0) {
      data.pots.push(potData)
    }
  })
  return data
}
function saveDataToLocal() {
  try {
    const data = getDataToSave()
    localStorage.setItem('ffTournamentScoreData', JSON.stringify(data))
  } catch (e) {
  }
}
function loadDataFromLocal() {
  const dataString = localStorage.getItem('ffTournamentScoreData')
  if (!dataString) {
    potsHolder.appendChild(createDefaultPot())
    return
  }
  try {
    const data = JSON.parse(dataString)
    document.getElementById('tournamentName').value = data.tournamentName || 'Nama Turnamen FF/PUBG'
    if (data.darkMode) {
      document.getElementById('darkModeToggle').checked = true
      body.classList.add('dark-mode')
    }
    root.style.setProperty('--title-size', (data.titleSize || 26) + 'px')
    document.getElementById('titleSizeRange').value = data.titleSize || 26
    root.style.setProperty('--pot-title-size', (data.potTitleSize || 20) + 'px')
    document.getElementById('potTitleSizeRange').value = data.potTitleSize || 20
    if (data.customColors) {
      root.style.setProperty('--bg', data.customColors.bg)
      document.getElementById('bgPicker').value = data.customColors.bg
      root.style.setProperty('--card', data.customColors.card)
      document.getElementById('cardPicker').value = data.customColors.card
      root.style.setProperty('--btn', data.customColors.btn)
      document.getElementById('btnPicker').value = data.customColors.btn
      root.style.setProperty('--header-bg', data.customColors.headerBg)
      document.getElementById('headerPicker').value = data.customColors.headerBg
    }
    potsHolder.innerHTML = ''
    if (data.pots && data.pots.length > 0) {
      data.pots.forEach(potData => {
        const pot = document.createElement('div')
        pot.className = 'pot-container'
        pot.dataset.games = potData.games
        pot.dataset.potId = potData.id
        potCounter = Math.max(potCounter, parseInt(potData.id) + 1)
        pot.innerHTML = potTemplateHTML(potData.id)
        pot.querySelector('.pot-title').value = potData.name
        const table = pot.querySelector('table')
        const tbody = table.querySelector('tbody')
        table.querySelector('.head-row-1').innerHTML=`<th rowspan="2" class="no">No</th><th rowspan="2">Nama Tim</th>${generateGameHeaders(potData.games)}<th rowspan="2">Total</th><th rowspan="2">Aksi</th>`
        table.querySelector('.head-row-2').innerHTML=generateGameSubHeaders(potData.games)
        tbody.innerHTML = ''
        potData.teams.forEach((team, index) => {
          const idx = index + 1
          const tr = document.createElement('tr')
          let cols = `<td class="no">${idx}</td><td class="team-name" contenteditable="true">${team.name}</td>`
          let total = 0
          for (let g = 0; g < potData.games; g++) {
            const score = team.scores[g] || {rank: '', kill: '', placement: 0}
            cols += `<td class="rank" contenteditable="true" inputmode="numeric">${score.rank}</td>`
            cols += `<td class="placement">${score.placement}</td>`
            cols += `<td class="kill" contenteditable="true" inputmode="numeric">${score.kill}</td>`
            total += (parseInt(score.placement) || 0) + (parseInt(score.kill) || 0)
          }
          cols += `<td class="total-point">${total}</td>`
          cols += `<td class="row-actions"><button class="delete-row">✖</button></td>`
          tr.innerHTML = cols
          tbody.appendChild(tr)
        })
        potsHolder.appendChild(pot)
        renumberRows(tbody)
      })
    } else {
      potsHolder.appendChild(createDefaultPot())
    }
  } catch (e) {
    potsHolder.innerHTML = ''
    potsHolder.appendChild(createDefaultPot())
  }
}
function resetAllData() {
  if (confirm("ANDA YAKIN? Semua data (Tim, Skor, Pot, Tema) akan dihapus permanen.")) {
    localStorage.removeItem('ffTournamentScoreData')
    location.reload()
  }
}
function setupControls(){
  document.getElementById('darkModeToggle').addEventListener('change', (e) => {
    if(e.target.checked) body.classList.add('dark-mode')
    else body.classList.remove('dark-mode')
    saveDataToLocal()
  })
  document.getElementById('titleSizeRange').addEventListener('input', (e) => {
    root.style.setProperty('--title-size', e.target.value + 'px')
    saveDataToLocal()
  })
  document.getElementById('potTitleSizeRange').addEventListener('input', (e) => {
    root.style.setProperty('--pot-title-size', e.target.value + 'px')
    saveDataToLocal()
  })
  document.getElementById('bgPicker').addEventListener('input', (e) => {
    root.style.setProperty('--bg', e.target.value)
    saveDataToLocal()
  })
  document.getElementById('cardPicker').addEventListener('input', (e) => {
    root.style.setProperty('--card', e.target.value)
    saveDataToLocal()
  })
  document.getElementById('btnPicker').addEventListener('input', (e) => {
    root.style.setProperty('--btn', e.target.value)
    root.style.setProperty('--btn-hover', e.target.value)
    saveDataToLocal()
  })
  document.getElementById('headerPicker').addEventListener('input', (e) => {
    root.style.setProperty('--header-bg', e.target.value)
    saveDataToLocal()
  })
}
function exportToGoogleSheet(button) {
  const pot = button.closest('.pot-container')
  const potName = pot.querySelector('.pot-title').value || 'POT'
  const table = pot.querySelector('table')
  const teamsData = []
  table.querySelectorAll('tbody tr').forEach(r => {
    const totalPointCell = r.querySelector('.total-point')
    const teamNameCell = r.querySelector('.team-name')
    if (!totalPointCell || !teamNameCell) return
    const teamName = teamNameCell.textContent.trim()
    const totalPoint = parseInt(totalPointCell.textContent) || 0
    if (totalPoint > 0 || (teamName && !teamName.startsWith('Team ') && teamName.length > 0)) {
      teamsData.push({
        total: totalPoint,
        teamName: teamName
      })
    }
  })
  if (teamsData.length === 0) {
    alert("Tidak ada data tim valid (Total Poin > 0) atau nama tim diubah untuk dikirim.")
    return
  }
  teamsData.sort((a, b) => b.total - a.total)
  let currentRank = 0
  let prevTotal = -1
  const rankedData = teamsData.map((team, index) => {
    if (team.total < prevTotal || prevTotal === -1) {
      currentRank = index + 1
    }
    prevTotal = team.total
    return {
      rank: currentRank,
      teamName: team.teamName,
      totalPoint: team.total
    }
  })
  const payload = {
    potName: potName,
    allRows: rankedData
  }
  const originalText = button.textContent
  button.textContent = "⏳ Mengirim..."
  button.disabled = true
  fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    mode: 'no-cors',
    cache: 'no-cache',
    body: JSON.stringify(payload)
  })
  .then(() => {
  })
  .catch(error => {
    alert('FATAL ERROR saat mengirim data. Cek koneksi internet dan API_URL Anda.')
  })
  .finally(() => {
    button.textContent = originalText
    button.disabled = false
    alert(`Sukses! Skor ${potName} telah dikirim ke Google Sheet.\nSilakan cek sheet 'API_DATA' Anda.`)
  })
}
function toggleControls(type) {
  if (type === 'display') {
    body.classList.toggle('display-hidden')
    if (body.classList.contains('display-hidden')) {
      hideDisplayBtn.textContent = '👀 Tampilkan Tampilan'
      hideDisplayBtn.style.background = '#007bff'
    } else {
      hideDisplayBtn.textContent = '🙈 Sembunyikan Tampilan'
      hideDisplayBtn.style.background = 'var(--btn)'
    }
  } else if (type === 'data') {
    body.classList.toggle('data-actions-hidden')
    if (body.classList.contains('data-actions-hidden')) {
      hideDataBtn.textContent = '✏️ Tampilkan Aksi Data'
      hideDataBtn.style.background = '#28a745'
    } else {
      hideDataBtn.textContent = '🗄️ Sembunyikan Aksi Data'
      hideDataBtn.style.background = 'var(--btn)'
    }
  }
}
function openImportModal(button) {
  currentPotForImport = button.closest('.pot-container')
  document.getElementById('teamNamesInput').value = ''
  document.getElementById('importTeamModal').style.display = 'block'
}
function closeModal(id) {
  document.getElementById(id).style.display = 'none'
}
function importTeams() {
  if (!currentPotForImport) return
  const textarea = document.getElementById('teamNamesInput')
  const rawText = textarea.value
  const teamNames = rawText.split('\n').map(name => name.trim()).filter(name => name.length > 0)
  if (teamNames.length === 0) {
    alert("Masukkan minimal satu nama tim.")
    return
  }
  const table = currentPotForImport.querySelector('table')
  const tbody = table.querySelector('tbody')
  const games = parseInt(currentPotForImport.dataset.games)
  let currentRowCount = tbody.querySelectorAll('tr').length
  if (currentRowCount === 1) {
    const firstRow = tbody.querySelector('tr')
    const firstTeamNameCell = firstRow.querySelector('.team-name')
    if (firstTeamNameCell && firstTeamNameCell.textContent.trim() === 'Team 1') {
      firstRow.remove()
      currentRowCount = 0
    }
  }
  teamNames.forEach((name, index) => {
    const idx = currentRowCount + index + 1
    const tr = document.createElement('tr')
    let cols = `<td class="no">${idx}</td><td class="team-name" contenteditable="true">${name}</td>`
    for(let g=0;g<games;g++){
      cols+=`<td class="rank" contenteditable="true" inputmode="numeric"></td>`
      cols+=`<td class="placement">0</td>`
      cols+=`<td class="kill" contenteditable="true" inputmode="numeric"></td>`
    }
    cols+=`<td class="total-point">0</td>`
    cols+=`<td class="row-actions"><button class="delete-row">✖</button></td>`
    tr.innerHTML = cols
    tbody.appendChild(tr)
  })
  renumberRows(tbody)
  closeModal('importTeamModal')
  saveDataToLocal()
}

onMounted(() => {
  body.classList.add('display-hidden')
  body.classList.add('data-actions-hidden')
  hideDisplayBtn = document.getElementById('hideDisplayBtn')
  hideDataBtn = document.getElementById('hideDataBtn')
  potsHolder = document.getElementById('potsHolder')
  document.getElementById('tournamentName').addEventListener('blur', saveDataToLocal)
  document.getElementById('resetAllBtn').addEventListener('click', resetAllData)
  document.getElementById('addPotBtn').addEventListener('click',()=>{
    potsHolder.appendChild(createDefaultPot())
    renumberAll()
    saveDataToLocal()
  })
  const navbar=document.getElementById('navbar')
  const navToggleBtn=document.getElementById('navToggleBtn')
  const fullBtn=document.getElementById('fullScreenBtn')
  navToggleBtn.addEventListener('click',()=>navbar.classList.toggle('hidden'))
  fullBtn.addEventListener('click',()=>{
    const hidden=body.classList.toggle('display-hidden')
    if(hidden){hideDisplayBtn.textContent='👀 Tampilkan Tampilan'; hideDisplayBtn.style.background='#007bff'}
    else {hideDisplayBtn.textContent='🙈 Sembunyikan Tampilan'; hideDisplayBtn.style.background='var(--btn)'}
  })
  const calcDisplay=document.getElementById('calcDisplay')
  const calcGrid=document.getElementById('calcGrid')
  const calcError=document.getElementById('calcError')
  const clearBtn=document.getElementById('calcClear')
  const eqBtn=document.getElementById('calcEq')
  calcGrid.addEventListener('click',(e)=>{
    const k=e.target.getAttribute('data-k')
    if(!k) return
    calcDisplay.value+=k
    calcError.textContent=''
  })
  clearBtn.addEventListener('click',()=>{
    calcDisplay.value=''
    calcError.textContent=''
  })
  const sanitize=(s)=> s.replace(/[^0-9+\-*/().\s]/g,'')
  const isValid=(s)=> /^[-+*/().\d\s]+$/.test(s) && /[\d)]$/.test(s.replace(/\s+/g,''))
  const safeEval=(expr)=>{
    const sanitized=sanitize(expr)
    if(!isValid(sanitized)) throw new Error('Ekspresi tidak valid')
    const fn=new Function(`return (${sanitized})`)
    const res=fn()
    if(!Number.isFinite(res)) throw new Error('Hasil tidak valid')
    return res
  }
  eqBtn.addEventListener('click',()=>{
    try{
      calcError.textContent=''
      const result=safeEval(calcDisplay.value)
      calcDisplay.value=String(result)
    }catch(err){
      calcError.textContent=err.message || 'Error perhitungan'
    }
  })
  setupControls()
  loadDataFromLocal()
  window.addEventListener('click', (event) => {
    const modal = document.getElementById('importTeamModal')
    if (event.target == modal) {
      modal.style.display = 'none'
    }
  })
  document.getElementById('closeImportModalBtn').addEventListener('click', ()=> closeModal('importTeamModal'))
  document.getElementById('importTeamsFinalBtn').addEventListener('click', importTeams)
  document.addEventListener('click', (e) => {
    const target = e.target
    if (target && target.classList.contains('delete-row')) {
      deleteTeam(target)
    }
    if (target && target.dataset && target.dataset.action) {
      const action = target.dataset.action
      if (action === 'addTeam') addTeam(target)
      else if (action === 'openImport') openImportModal(target)
      else if (action === 'removeTeamAbove') removeTeamAbove(target)
      else if (action === 'addGame') addGame(target)
      else if (action === 'removeGame') removeGame(target)
      else if (action === 'exportPotCSV') exportPotCSV(target)
      else if (action === 'exportToGoogleSheet') exportToGoogleSheet(target)
      else if (action === 'deletePot') deletePot(target)
    }
    if (target && target.classList && target.classList.contains('rank')) {
      updatePoints(target)
    }
    if (target && target.classList && target.classList.contains('kill')) {
      updatePoints(target)
    }
  })
})
</script>

<style>
:root {
  --bg: #f4f4f9;
  --card: #ffffff;
  --muted: #e0e0e0;
  --btn: #6200ea;
  --btn-text: #ffffff;
  --btn-hover: #4500b5;
  --header-bg: #6200ea;
  --header-text: #ffffff;
  --text-color: #333;
  --pot-bg: #f7f7f7;
  --border-color: #ddd;
  --title-size: 26px;
  --pot-title-size: 20px;
  --delete-btn-bg: #dc3545;
  --delete-btn-hover: #c82333;
  --modal-overlay: rgba(0, 0, 0, 0.5);
}
.dark-mode {
  --bg: #121212;
  --card: #1e1e1e;
  --muted: #2c2c2c;
  --btn: #bb86fc;
  --btn-text: #000000;
  --btn-hover: #9c27b0;
  --header-bg: #bb86fc;
  --header-text: #000000;
  --text-color: #e0e0e0;
  --pot-bg: #2a2a2a;
  --border-color: #444;
  --delete-btn-bg: #e57373;
  --delete-btn-hover: #ef9a9a;
  --modal-overlay: rgba(255, 255, 255, 0.1);
}
body {
  margin: 0;
  font-family: 'Inter', Arial, sans-serif;
  background: var(--bg);
  padding: 20px;
  color: var(--text-color);
  transition: background 300ms ease-in-out, color 300ms ease-in-out;
}
.controls-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
  padding: 15px;
  background: var(--card);
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  transition: opacity 300ms ease-in-out;
}
.controls-bar label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  white-space: nowrap;
}
.controls-bar input[type="color"],
.controls-bar input[type="range"] {
  cursor: pointer;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  height: 24px;
}
.controls-bar input[type="range"] {
  width: 80px;
}
.theme-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
}
.container {
  max-width: 1500px;
  margin: auto;
  background: var(--card);
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1);
  transition: background 300ms ease-in-out, box-shadow 300ms ease-in-out;
}
.top-row {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 30px;
}
.title-editable {
  border: none;
  background: transparent;
  width: 100%;
  text-align: center;
  font-weight: 700;
  color: var(--text-color);
  font-size: var(--title-size);
  padding: 5px 0;
  box-sizing: border-box;
}
.title-editable.pot-title {
  font-size: var(--pot-title-size);
  text-align: left;
}
.top-actions-group {
  position: absolute;
  bottom: -35px;
  right: 0;
  display: flex;
  gap: 8px;
}
.action-btn {
  border: none;
  background: var(--btn);
  color: var(--btn-text);
  padding: 8px 15px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: background 300ms ease-in-out;
}
.action-btn:hover {
  background: var(--btn-hover);
}
.action-btn.small {
  padding: 5px 10px;
  font-size: 13px;
}
.pot-container {
  margin-top: 25px;
  padding: 18px;
  background: var(--pot-bg);
  border-radius: 10px;
  border: 1px solid var(--border-color);
  transition: background 300ms ease-in-out, border-color 300ms ease-in-out;
}
.pot-header {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 15px;
}
.pot-header .title-editable {
  width: 100%;
  margin: 0;
  text-align: center;
}
.pot-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-bottom: 10px;
  transition: opacity 300ms ease-in-out, height 300ms ease-in-out;
}
.bottom-actions-pot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 15px;
  transition: opacity 300ms ease-in-out, height 300ms ease-in-out;
}
.delete-pot-btn {
  background: var(--delete-btn-bg);
  color: var(--btn-text);
}
.delete-pot-btn:hover {
  background: var(--delete-btn-hover);
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  min-width: 900px;
}
th, td {
  border: 1px solid var(--border-color);
  padding: 8px;
  text-align: center;
}
th {
  background: var(--header-bg);
  color: var(--header-text);
  font-weight: 600;
}
td[contenteditable="true"] {
  background-color: var(--card);
}
td.team-name {
  text-align: left;
  padding-left: 10px;
  width: 200px;
  min-width: 120px;
}
td.placement, td.total-point {
  font-weight: 700;
  background-color: var(--muted);
}
.no { width: 30px; }
.row-actions button {
  background: transparent;
  border: none;
  cursor: pointer;
  color: #b00;
  font-weight: bold;
  font-size: 16px;
}
.small-muted {
  font-size: 12px;
  color: #888;
  margin-top: 15px;
  transition: opacity 300ms ease-in-out;
}
.overflow-x {
  overflow-x: auto;
}
.display-hidden .controls-bar {
  display: none;
  margin: 0;
  padding: 0;
}
.display-hidden .small-muted {
  opacity: 0;
  height: 0;
  margin: 0;
  pointer-events: none;
  overflow: hidden;
}
.data-actions-hidden #addPotBtn {
  display: none;
}
.data-actions-hidden .pot-actions,
.data-actions-hidden .bottom-actions-pot {
  opacity: 0;
  height: 0;
  padding: 0;
  margin: 0;
  pointer-events: none;
  overflow: hidden;
}
.data-actions-hidden .row-actions {
  display: none;
}
.data-actions-hidden .pot-header .title-editable {
  text-align: center;
}
.modal {
  display: none;
  position: fixed;
  z-index: 100;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  overflow: auto;
  background-color: var(--modal-overlay);
  padding-top: 60px;
}
.modal-content {
  background-color: var(--card);
  margin: 5% auto;
  padding: 20px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  width: 80%;
  max-width: 500px;
  box-shadow: 0 5px 15px rgba(0,0,0,0.3);
}
.modal-content h3 {
  color: var(--text-color);
  margin-top: 0;
}
.modal-content textarea {
  width: 95%;
  height: 150px;
  padding: 10px;
  margin-bottom: 15px;
  border: 1px solid var(--border-color);
  background: var(--pot-bg);
  color: var(--text-color);
  resize: vertical;
  font-family: monospace;
  font-size: 14px;
}
.modal-content .action-btn {
  background: var(--btn);
}
.close-btn {
  color: #aaa;
  float: right;
  font-size: 28px;
  font-weight: bold;
}
.close-btn:hover,
.close-btn:focus {
  color: var(--text-color);
  text-decoration: none;
  cursor: pointer;
}
@media(max-width:900px){
  .container{padding:15px}
  .title-editable{font-size: var(--title-size);}
  .controls-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding: 10px;
  }
  .top-actions-group {
    position: static;
    margin-top: 10px;
    width: 100%;
    justify-content: space-between;
  }
  .top-actions-group button {
    flex-grow: 1;
    font-size: 12px;
    padding: 8px 5px;
  }
  .pot-actions {
    flex-wrap: wrap;
    justify-content: center;
    gap: 5px;
  }
  .pot-actions .action-btn.small {
    flex-grow: 1;
    font-size: 11px;
    padding: 6px;
    min-width: 80px;
  }
  .bottom-actions-pot {
    justify-content: center;
    flex-wrap: wrap;
  }
  .bottom-actions-pot .action-btn.small {
    flex-grow: 1;
    font-size: 12px;
  }
  th, td {
    padding: 5px 3px;
  }
}
.navbar {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--card);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  margin-bottom: 16px;
  padding: 10px 14px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.06);
  transition: transform 300ms ease-in-out, opacity 300ms ease-in-out, height 300ms ease-in-out, padding 300ms ease-in-out, margin 300ms ease-in-out;
}
.navbar.hidden {
  transform: translateY(-8px);
  opacity: 0;
  height: 0;
  padding: 0;
  margin: 0;
  pointer-events: none;
  overflow: hidden;
}
.nav-left, .nav-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.nav-menu {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.nav-link {
  padding: 6px 10px;
  border-radius: 8px;
  color: var(--text-color);
  border: 1px solid var(--border-color);
  text-decoration: none;
}
.nav-toggle {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--pot-bg);
  cursor: pointer;
  transition: background 300ms ease-in-out;
}
.nav-toggle:hover {
  background: var(--muted);
}
.calc {
  margin-top: 16px;
  background: var(--card);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 12px;
  transition: background 300ms ease-in-out, border-color 300ms ease-in-out;
}
.calc-display {
  width: 100%;
  padding: 10px;
  font-size: 18px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  margin-bottom: 10px;
  background: var(--pot-bg);
  color: var(--text-color);
}
.calc-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(60px, 1fr));
  gap: 10px;
}
.calc-btn {
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--card);
  cursor: pointer;
  transition: transform 150ms ease, background 300ms ease-in-out;
}
.calc-btn:active {
  transform: scale(0.98);
}
.calc-error {
  margin-top: 8px;
  color: #b00020;
  font-size: 13px;
  min-height: 18px;
}
</style>

