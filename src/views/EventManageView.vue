<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '@/stores/auth'
import SectionCard from '@/components/ui/SectionCard.vue'
import {
  getAllEvents,
  getPotsByEvent,
  createPot,
  deletePot,
  getTeamsByEvent,
  getTeamsByPot,
  createTeam,
  deleteTeam,
  updateTeam,
  addTeamToPot,
  removeTeamFromPot,
  getGamesByPot,
  addGameToPot,
  deleteGame,
  uploadGameScreenshot,
  togglePotHidden,
  updatePotName,
  getEventSettings,
  upsertEventSettings,
  upsertRawScore,
  getLeaderboardByPot,
  getPointMapping,
  upsertPointMapping,
  moveTeamToGrandFinal,
  resetScoresValues,
  resetAllData,
  getRawScoresByPot,
  subscribeRawScoresByEvent
} from '@/services/db.js'

const route = useRoute()
const eventId = ref(route.params.id)
const authStore = useAuth()

const events = ref([])
const selectedPotId = ref(null)
const pots = ref([])
const games = ref([])
const teams = ref([])
const teamsInPot = ref([])
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
const overlayScale = ref(1)
const screenshotFile = ref(null)
const hover = ref({ team: null, x: 0, y: 0 })
let hoverTimer = null
const notice = ref({ type: '', text: '' })
const scoresMap = ref(new Map())
const searchQuery = ref('')
const onlyWithScores = ref(false)
const sortKey = ref('name')
const sortDir = ref('asc')
const pageSize = ref(10)
const currentPage = ref(1)
const editingTeamId = ref(null)
const editNameValue = ref('')
const inputErrors = ref({})
const editingPotName = ref(false)
const potNameDraft = ref('')

const loading = ref(true)
const error = ref(null)
let subscription = null
const newPotName = ref('')
const newTeamName = ref('')
const newTeamMembersText = ref('')
const teamsToTransfer = ref(new Set())
const hideDisplay = ref(false)
const hideDataActions = ref(false)
const showImportModal = ref(false)
const bulkTeamNames = ref('')
const multiPotView = ref(false)
const multiPotTables = ref([])

// Fitur Utama - state, filter, sorting, pagination
const featuresRows = ref([
  { name: 'Kontrol Pot & Game', desc: 'Kelola pot, game, dan visibilitas', status: 'aktif' },
  { name: 'Spreadsheet Input', desc: 'Input cepat skor per tim dan game', status: 'aktif' },
  { name: 'Transfer Grand Final', desc: 'Pindahkan tim terpilih ke final', status: 'aktif' },
  { name: 'Kustom Poin Rank', desc: 'Atur poin per peringkat', status: 'aktif' },
  { name: 'Export Excel', desc: 'Ekspor data skor ke XLS', status: 'aktif' },
])
const featuresEditing = ref(false)
const featuresSearch = ref('')
const featuresSortKey = ref('status')
const featuresSortDir = ref('asc')
const featuresPage = ref(1)
const featuresPageSize = ref(10)

const setFeaturesSort = (key) => {
  if (featuresSortKey.value === key) {
    featuresSortDir.value = featuresSortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    featuresSortKey.value = key
    featuresSortDir.value = 'asc'
  }
}

const featuredSortedFiltered = computed(() => {
  const q = featuresSearch.value.trim().toLowerCase()
  let list = featuresRows.value.filter(r =>
    !q || r.name.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q) || r.status.toLowerCase().includes(q)
  )
  const dir = featuresSortDir.value === 'asc' ? 1 : -1
  list.sort((a, b) => {
    if (featuresSortKey.value === 'status') {
      const aw = a.status === 'aktif' ? 1 : 0
      const bw = b.status === 'aktif' ? 1 : 0
      return (aw - bw) * dir
    }
    return (String(a[featuresSortKey.value] || '').localeCompare(String(b[featuresSortKey.value] || ''))) * dir
  })
  return list
})

const featuresDisplay = computed(() => {
  const list = featuredSortedFiltered.value
  const start = (featuresPage.value - 1) * featuresPageSize.value
  return list.slice(start, start + featuresPageSize.value)
})

const featuresTotalPages = computed(() => {
  return Math.max(1, Math.ceil(featuredSortedFiltered.value.length / featuresPageSize.value))
})

const onAddFeature = () => {
  const name = prompt('Nama Fitur?')?.trim()
  if (!name) return
  const desc = prompt('Deskripsi Singkat?')?.trim() || ''
  featuresRows.value.push({ name, desc, status: 'aktif' })
}

const onToggleEditFeatures = () => {
  featuresEditing.value = !featuresEditing.value
}

const onRefreshFeatures = () => {
  featuresSearch.value = ''
  featuresSortKey.value = 'status'
  featuresSortDir.value = 'asc'
  featuresPage.value = 1
}
const featureSearch = ref('')
const featureSortKey = ref('status')
const featureSortDir = ref('desc')
const featurePageSize = ref(10)
const featurePage = ref(1)
const showAddFeature = ref(false)
const newFeatureName = ref('')
const newFeatureDesc = ref('')
const newFeatureStatus = ref(true)
const customFeatures = ref([])
const scoreCriteria = ref([
  { id: 1, name: 'Placement', weight: 0.6, actual: 0 },
  { id: 2, name: 'Kill', weight: 0.4, actual: 0 }
])

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
  const { data: tp } = await getTeamsByPot(selectedPotId.value)
  teamsInPot.value = (tp || []).map(r => ({
    id: r.team_id,
    name: r.teams?.name,
    members: r.teams?.members || [],
    is_finalist: r.is_finalist
  }))
  const { data: raw } = await getRawScoresByPot(selectedPotId.value)
  const map = new Map()
  for (const s of (raw || [])) {
    map.set(`${s.team_id}-${s.game_id}`, s)
  }
  scoresMap.value = map
  await refreshLeaderboard()
  notice.value = { type: 'success', text: 'Data pot dimuat' }
}

const buildScoresMap = (raw) => {
  const map = new Map()
  for (const s of (raw || [])) {
    map.set(`${s.team_id}-${s.game_id}`, s)
  }
  return map
}

const loadAllPotsTables = async () => {
  const result = []
  for (const p of pots.value) {
    const [{ data: gs }, { data: lb }, { data: raw }] = await Promise.all([
      getGamesByPot(p.id),
      getLeaderboardByPot(p.id),
      getRawScoresByPot(p.id)
    ])
    result.push({
      pot: p,
      games: gs || [],
      leaderboard: lb || [],
      scoresMap: buildScoresMap(raw || [])
    })
  }
  multiPotTables.value = result
}

const refreshLeaderboard = async () => {
  if (!selectedPotId.value) return
  const { data } = await getLeaderboardByPot(selectedPotId.value)
  const list = data || []
  if (settings.value.sorting_mode === 'kill_then_points') {
    leaderboard.value = [...list].sort((a,b) => (b.total_kill - a.total_kill) || (b.total_points - a.total_points))
  } else {
    leaderboard.value = [...list].sort((a,b) => (b.total_points - a.total_points) || (b.total_kill - a.total_kill))
  }
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
  notice.value = { type: 'success', text: 'Game dihapus' }
}

const toggleHiddenAction = async () => {
  const payload = { hidden_action: !settings.value.hidden_action }
  const { data } = await upsertEventSettings(eventId.value, payload)
  settings.value = { ...settings.value, ...data?.[0] || payload }
  const enabled = settings.value.hidden_action
  try {
    localStorage.setItem('full_screen_mode', enabled ? '1' : '0')
  } catch {}
}
const toggleHideDisplay = () => { hideDisplay.value = !hideDisplay.value }
const toggleHideDataActions = () => { hideDataActions.value = !hideDataActions.value }

const toggleColumn = async (key) => {
  const next = { ...settings.value.input_columns, [key]: !settings.value.input_columns[key] }
  const { data } = await upsertEventSettings(eventId.value, { input_columns: next })
  settings.value.input_columns = data?.[0]?.input_columns || next
}

const toggleSortingMode = async () => {
  const next = settings.value.sorting_mode === 'points_then_kill' ? 'kill_then_points' : 'points_then_kill'
  const { data } = await upsertEventSettings(eventId.value, { sorting_mode: next })
  settings.value.sorting_mode = data?.[0]?.sorting_mode || next
  await refreshLeaderboard()
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

const transferSelectedToGrandFinal = async () => {
  for (const id of teamsToTransfer.value) {
    await moveTeamToGrandFinal(eventId.value, id)
  }
  teamsToTransfer.value = new Set()
  await loadPotDetail()
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
  const key = `${teamId}-${field}`
  const errs = { ...inputErrors.value }
  if (field === 'rank') {
    if (!Number.isInteger(value) || value < 1 || value > 30) {
      errs[key] = 'Rank 1-30'
      inputErrors.value = errs
      return
    }
  }
  if (field === 'p_rank' || field === 'kill') {
    if (!Number.isFinite(value) || value < 0) {
      errs[key] = 'Harus >= 0'
      inputErrors.value = errs
      return
    }
  }
  delete errs[key]
  inputErrors.value = errs
  const existingScore = scoresMap.value.get(`${teamId}-${currentGameId.value}`) || {}
  const payload = {
    game_id: currentGameId.value,
    team_id: teamId,
    rank: existingScore.rank ?? null,
    p_rank: existingScore.p_rank ?? null,
    kill: existingScore.kill ?? 0
  }
  const existing = {}
  if (settings.value.input_columns.rank) existing.rank = null
  if (settings.value.input_columns.p_rank) existing.p_rank = null
  if (settings.value.input_columns.kill) existing.kill = 0
  payload[field] = value
  if (field === 'rank' && settings.value.input_columns.p_rank) {
    const map = getPotPlacementMap(selectedPotId.value)
    payload.p_rank = map[value] ?? 0
  }
  await upsertRawScore(payload)
  scoresMap.value.set(`${teamId}-${currentGameId.value}`, {
    ...(scoresMap.value.get(`${teamId}-${currentGameId.value}`) || {}),
    game_id: currentGameId.value,
    team_id: teamId,
    [field]: value
  })
  await refreshLeaderboard()
  notice.value = { type: 'success', text: 'Skor disimpan' }
}

const updatePointMap = async () => {
  // Validasi nilai poin (non-negatif dan integer)
  for (const row of pointMap.value) {
    if (typeof row.points !== 'number' || !Number.isFinite(row.points) || row.points < 0) {
      alert('Nilai poin harus angka >= 0.')
      return
    }
    row.points = Math.round(row.points)
  }
  await upsertPointMapping(eventId.value, pointMap.value)
  await refreshLeaderboard()
  notice.value = { type: 'success', text: 'Poin rank disimpan' }
  notice.value = { type: 'success', text: 'Template poin diimpor' }
}

const setCurrentGame = (id) => {
  currentGameId.value = id
}

const toggleOverlay = () => {
  overlayVisible.value = !overlayVisible.value
}

const onWheelOverlay = (e) => {
  e.preventDefault()
  const delta = Math.sign(e.deltaY)
  overlayScale.value = Math.max(0.5, Math.min(3, overlayScale.value - delta * 0.1))
}

const chooseScreenshot = (e) => {
  screenshotFile.value = e.target.files?.[0] || null
}

const uploadScreenshot = async () => {
  if (!screenshotFile.value || !currentGameId.value) return
  await uploadGameScreenshot(eventId.value, currentGameId.value, screenshotFile.value)
  await loadPotDetail()
  screenshotFile.value = null
  notice.value = { type: 'success', text: 'Screenshot diunggah' }
}
// Drag-and-drop support
const dragTeamId = ref(null)

const addPot = async () => {
  if (!newPotName.value.trim()) return
  const nextOrder = (pots.value[pots.value.length - 1]?.display_order || 0) + 1
  await createPot(eventId.value, newPotName.value.trim(), nextOrder)
  newPotName.value = ''
  const { data } = await getPotsByEvent(eventId.value)
  pots.value = data || []
  notice.value = { type: 'success', text: 'Pot ditambahkan' }
}

const removeSelectedPot = async () => {
  if (!selectedPotId.value) return
  await deletePot(selectedPotId.value)
  const { data } = await getPotsByEvent(eventId.value)
  pots.value = data || []
  selectedPotId.value = pots.value[0]?.id || null
  await loadPotDetail()
}

const addTeam = async () => {
  if (!newTeamName.value.trim()) return
  // Batasi jumlah tim per pot maksimal 30
  if ((teamsInPot.value?.length || 0) >= 30) {
    alert('Maksimal 30 tim per pot.')
    return
  }
  const members = newTeamMembersText.value.split('\n').map(s => s.trim()).filter(Boolean)
  const { data } = await createTeam(eventId.value, newTeamName.value.trim(), members)
  newTeamName.value = ''
  newTeamMembersText.value = ''
  if (selectedPotId.value && data?.[0]?.id) {
    await addTeamToPot(data[0].id, selectedPotId.value)
  }
  await loadPotDetail()
  notice.value = { type: 'success', text: 'Tim ditambahkan' }
}
const openImportModal = () => { showImportModal.value = true }
const closeImportModal = () => { showImportModal.value = false; bulkTeamNames.value = '' }
const importTeamsBulk = async () => {
  const names = bulkTeamNames.value.split('\n').map(s => s.trim()).filter(Boolean)
  if (!names.length) { alert('Masukkan minimal satu nama tim.'); return }
  const limit = 30 - (teamsInPot.value?.length || 0)
  if (limit <= 0) { alert('Maksimal 30 tim per pot.'); return }
  const list = names.slice(0, limit)
  for (const name of list) {
    const { data } = await createTeam(eventId.value, name, [])
    if (selectedPotId.value && data?.[0]?.id) {
      await addTeamToPot(data[0].id, selectedPotId.value)
    }
  }
  await loadPotDetail()
  notice.value = { type: 'success', text: 'Tim ditambahkan (bulk)' }
  closeImportModal()
}

const removeTeam = async (teamId) => {
  if (!confirm('Hapus tim ini dari pot?')) return
  await removeTeamFromPot(teamId, selectedPotId.value)
  await loadPotDetail()
  notice.value = { type: 'success', text: 'Tim dihapus dari pot' }
}

const exportExcel = async () => {
  if (!selectedPotId.value) return
  const { data: scores } = await getRawScoresByPot(selectedPotId.value)
  const gamesList = games.value
  const teamList = teamsInPot.value
  const map = new Map()
  for (const s of (scores || [])) {
    const key = `${s.team_id}-${s.game_id}`
    map.set(key, s)
  }
  let html = '<table border="1"><thead><tr><th rowspan="2">Team</th>'
  for (const g of gamesList) {
    html += `<th colspan="3">Game ${g.game_number}</th>`
  }
  html += '</tr><tr>'
  for (let i = 0; i < gamesList.length; i++) {
    html += '<th>Rank</th><th>P. Rank</th><th>Kill</th>'
  }
  html += '</tr></thead><tbody>'
  for (const t of teamList) {
    html += `<tr><td>${t.name}</td>`
    for (const g of gamesList) {
      const s = map.get(`${t.id}-${g.id}`) || {}
      html += `<td>${s.rank ?? ''}</td><td>${s.p_rank ?? ''}</td><td>${s.kill ?? ''}</td>`
    }
    html += '</tr>'
  }
  html += '</tbody></table>'
  const blob = new Blob([`\ufeff${html}`], { type: 'application/vnd.ms-excel' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `export_pot_${selectedPotId.value}.xls`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Export/Import Template Poin (JSON)
const exportPointTemplate = () => {
  const template = {
    name: `Template Poin Event ${eventId.value}`,
    version: '1.0.0',
    points: pointMap.value.map(r => ({ rank_position: r.rank_position, points: r.points })),
    metadata: { created_at: new Date().toISOString() }
  }
  const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `point_template_${eventId.value}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const importInputRef = ref(null)
const importPointTemplate = async (e) => {
  const file = e?.target?.files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    const json = JSON.parse(text)
    if (!Array.isArray(json.points)) throw new Error('Format template tidak valid.')
    pointMap.value = json.points.map(p => ({ rank_position: Number(p.rank_position), points: Number(p.points) }))
    await upsertPointMapping(eventId.value, pointMap.value)
    await refreshLeaderboard()
    alert('Template poin berhasil diimpor.')
  } catch (err) {
    alert('Gagal mengimpor template: ' + (err?.message || 'Unknown error'))
  } finally {
  if (importInputRef.value) importInputRef.value.value = ''
  }
}

// Hover preview tim (delay 300ms, floating window)
const onEnterTeam = (team, evt) => {
  clearTimeout(hoverTimer)
  const { clientX, clientY } = evt
  hoverTimer = setTimeout(() => {
    hover.value = { team, x: clientX + 12, y: clientY + 12 }
  }, 300)
}
const onLeaveTeam = () => {
  clearTimeout(hoverTimer)
  hoverTimer = setTimeout(() => {
    hover.value = { team: null, x: 0, y: 0 }
  }, 50)
}

const getScoreValue = (teamId, field) => {
  const s = scoresMap.value.get(`${teamId}-${currentGameId.value}`)
  return s ? s[field] ?? '' : ''
}

const defaultPlacementMap = {1:12,2:9,3:8,4:7,5:6,6:5,7:4,8:3,9:2,10:1,11:0,12:0}
const getPotPlacementMap = (potId) => {
  try {
    const raw = localStorage.getItem(`pot_points_${potId}`)
    const json = raw ? JSON.parse(raw) : null
    if (json && typeof json === 'object') return json
  } catch {}
  return defaultPlacementMap
}
const setPotPlacementMap = (potId, map) => {
  try {
    localStorage.setItem(`pot_points_${potId}`, JSON.stringify(map))
    notice.value = { type: 'success', text: 'Poin placement tersimpan untuk pot ini' }
  } catch {}
}

const startEditName = (t) => {
  editingTeamId.value = t.id
  editNameValue.value = t.name || ''
}

const saveEditName = async () => {
  if (!editingTeamId.value) return
  const name = editNameValue.value.trim()
  if (!name) { notice.value = { type: 'error', text: 'Nama tim wajib' }; return }
  const { error: err } = await updateTeam(editingTeamId.value, { name })
  if (err) { notice.value = { type: 'error', text: 'Gagal menyimpan nama tim' }; return }
  editingTeamId.value = null
  editNameValue.value = ''
  await loadPotDetail()
  notice.value = { type: 'success', text: 'Nama tim diperbarui' }
}

const cancelEditName = () => {
  editingTeamId.value = null
  editNameValue.value = ''
}

const setSort = (key) => {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

const displayTeams = computed(() => {
  let list = [...teamsInPot.value]
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(t => (t.name || '').toLowerCase().includes(q))
  }
  if (onlyWithScores.value && currentGameId.value) {
    list = list.filter(t => !!scoresMap.value.get(`${t.id}-${currentGameId.value}`))
  }
  list.sort((a, b) => {
    const dir = sortDir.value === 'asc' ? 1 : -1
    if (sortKey.value === 'name') {
      return ((a.name || '').localeCompare(b.name || '')) * dir
    }
    const av = Number(getScoreValue(a.id, sortKey.value) || 0)
    const bv = Number(getScoreValue(b.id, sortKey.value) || 0)
    return (av - bv) * dir
  })
  const total = list.length
  const pages = Math.max(1, Math.ceil(total / pageSize.value))
  if (currentPage.value > pages) currentPage.value = pages
  const start = (currentPage.value - 1) * pageSize.value
  return list.slice(start, start + pageSize.value)
})

const hasScore = (teamId) => {
  for (const g of games.value) {
    if (scoresMap.value.get(`${teamId}-${g.id}`)) return true
  }
  return false
}

const placeOf = (teamId) => {
  const idx = leaderboard.value.findIndex(r => r.team_id === teamId)
  return idx >= 0 ? (idx + 1) : '-'
}

const features = computed(() => {
  const pot = pots.value.find(p => p.id === selectedPotId.value)
  const builtins = [
    { name: 'Full Screen Mode', desc: 'Sembunyikan kontrol dan navigasi', status: !!settings.value.hidden_action },
    { name: 'Mode Multi Tabel Pot', desc: 'Tampilkan tabel semua pot', status: !!multiPotView.value },
    { name: 'Overlay Screenshot', desc: 'Pratinjau screenshot untuk game aktif', status: !!overlayVisible.value },
    { name: 'Pot Tersembunyi', desc: 'Sembunyikan pot terpilih dari publik', status: !!(pot && pot.is_hidden) },
    { name: 'Input Rank', desc: 'Aktifkan kolom input Rank', status: !!settings.value.input_columns.rank },
    { name: 'Input Placement Rank', desc: 'Aktifkan kolom input P.Rank', status: !!settings.value.input_columns.p_rank },
    { name: 'Input Kill', desc: 'Aktifkan kolom input Kill', status: !!settings.value.input_columns.kill }
  ]
  return [...builtins, ...customFeatures.value.map(f => ({ ...f }))].map((f, idx) => ({ id: idx + 1 + (f.id || 0), ...f }))
})

const featureDisplayRows = computed(() => {
  const q = featureSearch.value.trim().toLowerCase()
  let list = features.value.filter(r => {
    if (!q) return true
    return (r.name || '').toLowerCase().includes(q) || (r.desc || '').toLowerCase().includes(q)
  })
  const dir = featureSortDir.value === 'asc' ? 1 : -1
  if (featureSortKey.value === 'status') {
    list = list.sort((a, b) => ((a.status === b.status) ? 0 : (a.status ? -1 : 1)) * dir)
  } else if (featureSortKey.value === 'name') {
    list = list.sort((a, b) => (a.name || '').localeCompare(b.name || '') * dir)
  }
  const total = list.length
  const pages = Math.max(1, Math.ceil(total / featurePageSize.value))
  if (featurePage.value > pages) featurePage.value = pages
  const start = (featurePage.value - 1) * featurePageSize.value
  return list.slice(start, start + featurePageSize.value)
})

const setFeatureSort = (key) => {
  if (featureSortKey.value === key) {
    featureSortDir.value = featureSortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    featureSortKey.value = key
    featureSortDir.value = 'asc'
  }
}

const addFeature = () => {
  if (!newFeatureName.value.trim()) return
  customFeatures.value = [
    ...customFeatures.value,
    { id: Date.now(), name: newFeatureName.value.trim(), desc: newFeatureDesc.value.trim(), status: !!newFeatureStatus.value }
  ]
  newFeatureName.value = ''
  newFeatureDesc.value = ''
  newFeatureStatus.value = true
  showAddFeature.value = false
}

const refreshFeatures = async () => {
  await loadEventData()
}

const totalKills = computed(() => {
  let total = 0
  for (const g of games.value) {
    for (const t of teamsInPot.value) {
      const s = scoresMap.value.get(`${t.id}-${g.id}`)
      if (s && typeof s.kill === 'number') total += s.kill
    }
  }
  return total
})

const totalPlacement = computed(() => {
  let total = 0
  for (const g of games.value) {
    for (const t of teamsInPot.value) {
      const s = scoresMap.value.get(`${t.id}-${g.id}`)
      if (s && typeof s.p_rank === 'number') total += s.p_rank
    }
  }
  return total
})

const scoreRows = computed(() => {
  return scoreCriteria.value.map(c => {
    const actual = c.name.toLowerCase().includes('kill') ? totalKills.value : totalPlacement.value
    const subtotal = Number(((c.weight || 0) * (actual || 0)).toFixed(2))
    return { ...c, actual, subtotal }
  })
})

onMounted(loadEventData)
watch(selectedPotId, async () => {
  await loadPotDetail()
})
</script>

<template>
  <div class="grid grid-cols-12 gap-6 animate-fade-in">
    <div v-if="notice.text" class="col-span-12">
      <div :class="[
        'mb-2 px-4 py-2 rounded border',
        notice.type==='success' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' :
        notice.type==='error' ? 'bg-rose-50 border-rose-300 text-rose-800' :
        'bg-slate-50 border-slate-300 text-slate-800'
      ]">
        {{ notice.text }}
      </div>
    </div>
    <div class="col-span-12"></div>
    <div class="col-span-12">
      <SectionCard title="Fitur Utama">
        <div class="p-5 bg-white rounded w-full" style="box-shadow:0 2px 4px rgba(0,0,0,0.1)">
          <div class="flex flex-col md:flex-row items-center justify-between gap-3 mb-4 w-full">
            <button aria-label="Edit fitur" class="px-4 py-2 rounded text-white" style="background-color:#007bff" @click="showAddFeature = !showAddFeature">Edit</button>
            <button aria-label="Tambah fitur" class="px-4 py-2 rounded text-white" style="background-color:#28a745" @click="showAddFeature = true">Tambah Fitur</button>
            <button aria-label="Refresh fitur" class="px-4 py-2 rounded text-white" style="background-color:#6c757d" @click="refreshFeatures">Refresh</button>
            <div class="flex items-center gap-2">
              <input aria-label="Cari fitur" v-model="featureSearch" class="border rounded px-3 py-2 min-w-[220px]" placeholder="Cari fitur..." />
              <label class="text-sm" style="color:#212529">Rows</label>
              <select v-model.number="featurePageSize" class="border rounded px-2 py-2">
                <option :value="5">5</option>
                <option :value="10">10</option>
                <option :value="15">15</option>
                <option :value="30">30</option>
              </select>
            </div>
          </div>
          <div v-if="showAddFeature" class="mb-4">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
              <input v-model="newFeatureName" class="border rounded px-3 py-2" placeholder="Nama fitur" />
              <input v-model="newFeatureDesc" class="border rounded px-3 py-2" placeholder="Deskripsi singkat" />
              <select v-model="newFeatureStatus" class="border rounded px-3 py-2">
                <option :value="true">Aktif</option>
                <option :value="false">Tidak Aktif</option>
              </select>
            </div>
            <div class="mt-3 flex items-center justify-between gap-2 w-full">
              <button aria-label="Simpan fitur baru" class="px-4 py-2 rounded text-white" style="background-color:#28a745" @click="addFeature">Simpan</button>
              <button aria-label="Batal tambah fitur" class="px-4 py-2 rounded text-white" style="background-color:#6c757d" @click="showAddFeature=false">Batal</button>
            </div>
          </div>
          <div class="overflow-x-auto w-full">
            <table class="w-full" style="background:#ffffff;border-collapse:collapse">
              <thead>
                <tr style="background:#e3f2fd;color:#212529">
                  <th style="width:25%;border:1px solid #e0e0e0;padding:12px;text-align:left">
                    <button aria-label="Sort nama fitur" class="font-semibold" @click="setFeatureSort('name')">Nama Fitur</button>
                  </th>
                  <th style="width:50%;border:1px solid #e0e0e0;padding:12px;text-align:left;color:#666666">Deskripsi Singkat</th>
                  <th style="width:25%;border:1px solid #e0e0e0;padding:12px;text-align:left">
                    <button aria-label="Sort status" class="font-semibold" @click="setFeatureSort('status')">Status</button>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in featureDisplayRows" :key="r.id" style="color:#212529" class="hover:bg-[#f8f9fa]">
                  <td style="border:1px solid #e0e0e0;padding:12px">{{ r.name }}</td>
                  <td style="border:1px solid #e0e0e0;padding:12px;color:#666666">{{ r.desc }}</td>
                  <td style="border:1px solid #e0e0e0;padding:12px">
                    <span :style="{display:'inline-flex',alignItems:'center',gap:'8px',color:'#212529'}">
                      <span :style="{display:'inline-block',width:'10px',height:'10px',borderRadius:'50%',background: r.status ? '#28a745' : '#dc3545'}"></span>
                      {{ r.status ? 'Aktif' : 'Tidak Aktif' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
            <div class="flex items-center justify-between mt-3 w-full">
              <div class="text-sm" style="color:#212529">Halaman {{ featurePage }}</div>
              <div class="flex items-center gap-2">
                <button aria-label="Halaman sebelumnya" class="px-3 py-1 rounded" style="background:#e3f2fd;color:#212529" @click="featurePage = Math.max(1, featurePage - 1)">Prev</button>
                <button aria-label="Halaman berikutnya" class="px-3 py-1 rounded" style="background:#e3f2fd;color:#212529" @click="featurePage = featurePage + 1">Next</button>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
    <div class="col-span-12" style="margin-top:40px">
      <div class="bg-white rounded w-full p-5" style="box-shadow:0 2px 4px rgba(0,0,0,0.1)">
        <div class="overflow-x-auto w-full">
          <table class="w-full" style="background:#ffffff;border-collapse:collapse">
            <thead>
              <tr style="background:#bbdefb;color:#212529">
                <th style="width:40%;border:1px solid #e0e0e0;padding:12px;text-align:left">Kriteria Penilaian</th>
                <th style="width:20%;border:1px solid #e0e0e0;padding:12px;text-align:right">Bobot Skor</th>
                <th style="width:20%;border:1px solid #e0e0e0;padding:12px;text-align:right">Nilai Aktual</th>
                <th style="width:20%;border:1px solid #e0e0e0;padding:12px;text-align:right;font-weight:600">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in scoreRows" :key="row.id" style="color:#212529">
                <td style="border:1px solid #e0e0e0;padding:12px">{{ row.name }}</td>
                <td style="border:1px solid #e0e0e0;padding:12px;text-align:right">{{ (row.weight * 100).toFixed(0) }}%</td>
                <td style="border:1px solid #e0e0e0;padding:12px;text-align:right">{{ row.actual }}</td>
                <td style="border:1px solid #e0e0e0;padding:12px;text-align:right;font-weight:600">{{ row.subtotal }}</td>
              </tr>
              <tr style="background:#fff9c4;color:#212529">
                <td style="border:1px solid #e0e0e0;padding:12px">Total</td>
                <td style="border:1px solid #e0e0e0;padding:12px;text-align:right"></td>
                <td style="border:1px solid #e0e0e0;padding:12px;text-align:right"></td>
                <td style="border:1px solid #e0e0e0;padding:12px;text-align:right;font-weight:700">
                  {{ scoreRows.reduce((sum, r) => sum + r.subtotal, 0).toFixed(2) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <div class="col-span-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <SectionCard title="Kontrol Pot & Game">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-xl font-bold">Manajemen Skor</h2>
          <div class="flex items-center gap-2">
            <label class="block text-sm font-semibold">Pilih Pot</label>
            <select v-model="selectedPotId" class="border rounded p-2">
              <option v-for="p in pots" :key="p.id" :value="p.id">
                {{ p.name }}{{ p.is_hidden ? ' (hidden)' : '' }}
              </option>
            </select>
            <button class="px-2 py-1 bg-slate-200 rounded text-slate-700" @click="() => { editingPotName=true; potNameDraft=(pots.find(p=>p.id===selectedPotId)?.name||'') }">Edit Nama Pot</button>
          </div>
        </div>

      <div v-if="editingPotName" class="mb-3">
        <div class="flex items-center gap-2">
          <input v-model="potNameDraft" class="border rounded px-2 py-1 flex-1" />
          <button class="px-2 py-1 bg-emerald-600 text-white rounded" @click="async () => { await updatePotName(selectedPotId, potNameDraft); editingPotName=false; await loadPotDetail(); }">Simpan</button>
          <button class="px-2 py-1 bg-slate-500 text-white rounded" @click="() => { editingPotName=false; potNameDraft='' }">Batal</button>
        </div>
      </div>

        <div class="flex flex-wrap items-center gap-2 mb-4">
          <input v-model="newPotName" placeholder="Nama Pot" class="border rounded px-3 py-2" />
          <button @click="addPot" class="px-3 py-2 bg-emerald-600 text-white rounded active:scale-95 transition">+ Pot</button>
          <button @click="() => { if (confirm('Hapus pot terpilih?')) removeSelectedPot() }" class="px-3 py-2 bg-rose-600 text-white rounded active:scale-95 transition">- Pot</button>
          <button @click="addGame" class="px-3 py-2 bg-indigo-600 text-white rounded active:scale-95 transition">+ Game</button>
          <button @click="() => { if (confirm('Hapus game terakhir?')) removeLastGame() }" class="px-3 py-2 bg-indigo-600 text-white rounded active:scale-95 transition">- Game</button>
          <button @click="togglePotVisibility" class="px-3 py-2 bg-gray-700 text-white rounded active:scale-95 transition">Sembunyikan/Tampilkan Pot</button>
          <button @click="openImportModal" class="px-3 py-2 bg-slate-700 text-white rounded active:scale-95 transition">➕ Impor Tim</button>
          <button @click="toggleHideDisplay" class="px-3 py-2 bg-blue-600 text-white rounded active:scale-95 transition">
          {{ hideDisplay ? '👀 Tampilkan Tampilan' : '🙈 Sembunyikan Tampilan' }}
        </button>
          <button @click="toggleHideDataActions" class="px-3 py-2 bg-green-600 text-white rounded active:scale-95 transition">
          {{ hideDataActions ? '✏️ Tampilkan Aksi Data' : '🗄️ Sembunyikan Aksi Data' }}
        </button>
          <button @click="multiPotView ? (multiPotView=false) : (multiPotView=true, loadAllPotsTables())" class="px-3 py-2 bg-sky-600 text-white rounded active:scale-95 transition">
          {{ multiPotView ? 'Mode Satu Pot' : 'Mode Multi Tabel Pot' }}
        </button>
          <button @click="exportExcel" class="px-3 py-2 bg-purple-600 text-white rounded active:scale-95 transition">📤 Export XLS</button>
        </div>
      </SectionCard>

      <SectionCard title="Tampilan & Aksi">
        <div class="flex gap-2 mb-1">
          <button @click="addGame" class="px-3 py-2 bg-indigo-600 text-white rounded active:scale-95 transition">+ Game</button>
          <button @click="() => { if (confirm('Hapus game terakhir?')) removeLastGame() }" class="px-3 py-2 bg-indigo-600 text-white rounded active:scale-95 transition">- Game</button>
          <button @click="togglePotVisibility" class="px-3 py-2 bg-gray-700 text-white rounded active:scale-95 transition">Sembunyikan/Tampilkan Pot</button>
          <button @click="openImportModal" class="px-3 py-2 bg-slate-700 text-white rounded active:scale-95 transition">➕ Impor Tim</button>
        </div>
      </SectionCard>

      <div class="flex flex-wrap items-center gap-4 mb-4">
        <div class="flex items-center gap-2">
          <label class="font-semibold">Kolom Input:</label>
          <label><input type="checkbox" :checked="settings.input_columns.rank" @change="toggleColumn('rank')" /> Rank</label>
          <label><input type="checkbox" :checked="settings.input_columns.p_rank" @change="toggleColumn('p_rank')" /> P. Rank</label>
          <label><input type="checkbox" :checked="settings.input_columns.kill" @change="toggleColumn('kill')" /> Kill</label>
        </div>
        <label class="inline-flex items-center gap-2">
          <input type="checkbox" :checked="settings.hidden_action" @change="toggleHiddenAction" />
          FULL SCREEN MODE
        </label>
      </div>

      <div class="mb-4">
        <label class="inline-flex items-center gap-2">
          <input type="checkbox" :checked="settings.hidden_action" @change="toggleHiddenAction" />
          FULL SCREEN MODE (sembunyikan kontrol & navigasi)
        </label>
      </div>
      <div class="mb-4">
        <div class="flex gap-2">
          <button @click="toggleHideDisplay" class="px-3 py-2 bg-blue-600 text-white rounded">
            {{ hideDisplay ? '👀 Tampilkan Tampilan' : '🙈 Sembunyikan Tampilan' }}
          </button>
          <button @click="toggleHideDataActions" class="px-3 py-2 bg-green-600 text-white rounded">
            {{ hideDataActions ? '✏️ Tampilkan Aksi Data' : '🗄️ Sembunyikan Aksi Data' }}
          </button>
          <button @click="multiPotView ? (multiPotView=false) : (multiPotView=true, loadAllPotsTables())" class="px-3 py-2 bg-sky-600 text-white rounded">
            {{ multiPotView ? 'Mode Satu Pot' : 'Mode Multi Tabel Pot' }}
          </button>
          <button @click="exportExcel" class="px-3 py-2 bg-purple-600 text-white rounded">📤 Export XLS</button>
        </div>
      </div>

      <div class="mb-4">
      <SectionCard title="Sorting & Placement">
        <div class="flex items-center gap-2 mb-2">
          <h3 class="font-semibold">Sorting Peringkat</h3>
          <button @click="toggleSortingMode" class="px-3 py-2 bg-amber-600 text-white rounded">
            Mode: {{ settings.sorting_mode }}
          </button>
        </div>
        <div class="mt-2">
          <div class="text-sm font-semibold mb-1">Poin Placement (khusus pot ini)</div>
          <div class="grid grid-cols-6 gap-2">
            <template v-for="r in [1,2,3,4,5,6,7,8,9,10,11,12]" :key="'rank-'+r">
              <div class="flex items-center gap-2">
                <span class="w-14">Rank {{ r }}</span>
                <input type="number" class="border rounded px-2 py-1 w-20"
                  :value="getPotPlacementMap(selectedPotId)[r] ?? 0"
                  @change="(e) => { const m = { ...getPotPlacementMap(selectedPotId) }; m[r] = Number(e.target.value)||0; setPotPlacementMap(selectedPotId, m) }"
                />
              </div>
            </template>
          </div>
        </div>
      </SectionCard>
      </div>

      <SectionCard v-if="authStore.userRole==='admin'" title="Kustom Poin Rank">
        <h3 class="font-semibold">Kustomisasi Poin Rank</h3>
        <div class="space-y-2">
          <div v-for="row in pointMap" :key="row.rank_position" class="flex items-center gap-2">
            <span class="w-16">Rank {{ row.rank_position }}</span>
            <input type="number" v-model.number="row.points" class="border rounded p-1 w-24" />
          </div>
        </div>
        <button @click="updatePointMap" class="mt-2 px-3 py-2 bg-green-600 text-white rounded">Simpan Poin</button>
        <div class="mt-3 flex gap-2">
          <button @click="exportPointTemplate" class="px-3 py-2 bg-slate-700 text-white rounded">Export Template (JSON)</button>
          <input ref="importInputRef" type="file" accept="application/json" @change="importPointTemplate" class="hidden" />
          <button @click="importInputRef && importInputRef.click()" class="px-3 py-2 bg-slate-500 text-white rounded">Import Template</button>
        </div>
      </SectionCard>

      <SectionCard title="Transfer GF & Reset">
        <h3 class="font-semibold mb-2">Transfer ke Grand Final</h3>
        <button @click="transferSelectedToGrandFinal" class="px-3 py-2 bg-indigo-600 text-white rounded">Transfer yang Diceklis</button>
        <div class="mt-3 flex gap-2">
          <button @click="resetValues" class="px-3 py-2 bg-yellow-500 text-white rounded active:scale-95 transition">Reset Score Value</button>
          <button @click="() => { if (confirm('Reset semua data untuk event ini?')) resetAll() }" class="px-3 py-2 bg-red-600 text-white rounded active:scale-95 transition">Reset Semua Data</button>
        </div>
      </SectionCard>
      <!-- Spreadsheet + Tables -->
      <SectionCard title="Spreadsheet Input & Upload">
      <div v-if="!settings.hidden_action && !hideDisplay" class="flex items-center justify-between mb-3">
        <h2 class="text-xl font-bold">Spreadsheet Input</h2>
        <div class="flex items-center gap-2">
          <label>Game:</label>
          <select v-model="currentGameId" @change="setCurrentGame(currentGameId)" class="border rounded p-1">
            <option v-for="g in games" :key="g.id" :value="g.id">Game {{ g.game_number }}</option>
          </select>
          <button @click="toggleOverlay" class="px-3 py-2 bg-gray-800 text-white rounded hover-lift">
            {{ overlayVisible ? 'Hide Overlay' : 'Show Overlay' }}
          </button>
          <label class="text-sm">Upload Screenshot</label>
          <input type="file" accept="image/*" @change="chooseScreenshot" />
          <button @click="uploadScreenshot" class="px-3 py-2 bg-indigo-600 text-white rounded">Unggah</button>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2 mb-3">
        <input v-model="searchQuery" class="border rounded px-3 py-2 flex-1 min-w-[200px]" placeholder="Cari tim..." />
        <label class="inline-flex items-center gap-2">
          <input type="checkbox" v-model="onlyWithScores" />
          Hanya tim dengan skor di game ini
        </label>
        <div class="ml-auto flex items-center gap-2">
          <label class="text-sm">Rows per page</label>
          <select v-model.number="pageSize" class="border rounded px-2 py-1">
            <option :value="5">5</option>
            <option :value="10">10</option>
            <option :value="15">15</option>
            <option :value="30">30</option>
          </select>
        </div>
      </div>
      </SectionCard>

      <div v-if="overlayVisible" class="mb-4">
        <div
          v-for="g in games"
          :key="g.id"
          v-show="g.id === currentGameId"
          class="relative border rounded overflow-auto"
          @wheel="onWheelOverlay"
        >
          <div class="inline-block origin-top-left" :style="{ transform: 'scale(' + overlayScale + ')' }">
            <img
              v-if="g.screenshot_url"
              :src="g.screenshot_url"
              alt="Screenshot"
              class="max-h-[32rem] object-contain"
            />
            <p v-else class="p-4 text-gray-500">Tidak ada screenshot untuk game ini.</p>
          </div>
        </div>
      </div>

      <SectionCard v-if="!multiPotView" title="Daftar Tim">
        <table class="min-w-full divide-y divide-gray-200 animate-slide-up">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-3 py-2 text-left">
                <button class="font-semibold" @click="setSort('name')">Tim</button>
              </th>
              <th v-if="settings.input_columns.rank" class="px-3 py-2 text-center">
                <button class="font-semibold" @click="setSort('rank')">Rank</button>
              </th>
              <th v-if="settings.input_columns.p_rank" class="px-3 py-2 text-center">
                <button class="font-semibold" @click="setSort('p_rank')">P. Rank</button>
              </th>
              <th v-if="settings.input_columns.kill" class="px-3 py-2 text-center">
                <button class="font-semibold" @click="setSort('kill')">Kill</button>
              </th>
              <th v-if="!settings.hidden_action && !hideDataActions" class="px-3 py-2 text-right">Aksi</th>
            </tr>
          </thead>
        <tbody class="bg-white divide-y divide-gray-100">
          <tr v-for="t in displayTeams" :key="t.id">
            <td class="px-3 py-2" draggable="true" @dragstart="dragTeamId=t.id">
              <div class="flex items-center gap-2">
                <template v-if="editingTeamId === t.id">
                  <input v-model="editNameValue" class="border rounded px-2 py-1 flex-1" />
                  <button class="px-2 py-1 bg-emerald-600 text-white rounded" @click="saveEditName">Simpan</button>
                  <button class="px-2 py-1 bg-slate-500 text-white rounded" @click="cancelEditName">Batal</button>
                </template>
                <template v-else>
                  <span
                    class="relative"
                    @mouseenter="onEnterTeam(t, $event)"
                    @mouseleave="onLeaveTeam"
                  >
                    {{ t.name }}
                  </span>
                  <button class="px-2 py-1 bg-slate-200 rounded text-slate-700" @click="startEditName(t)">Edit</button>
                </template>
              </div>
              <label class="ml-2 text-xs"><input type="checkbox" :checked="teamsToTransfer.has(t.id)" @change="(e) => { const set=teamsToTransfer; if(e.target.checked) set.add(t.id); else set.delete(t.id); teamsToTransfer=set }" /> GF</label>
            </td>
            <td v-if="settings.input_columns.rank" class="px-3 py-2 text-center">
              <input :value="getScoreValue(t.id, 'rank')" type="number" min="1" max="30" class="border rounded p-1 w-20" :class="inputErrors[t.id + '-rank'] ? 'border-rose-500' : ''" @change="saveScore(t.id, 'rank', parseInt($event.target.value))" />
              <div v-if="inputErrors[t.id + '-rank']" class="text-xs text-rose-600 mt-1">{{ inputErrors[t.id + '-rank'] }}</div>
            </td>
            <td v-if="settings.input_columns.p_rank" class="px-3 py-2 text-center">
              <input :value="getScoreValue(t.id, 'p_rank')" type="number" min="0" class="border rounded p-1 w-20" :class="inputErrors[t.id + '-p_rank'] ? 'border-rose-500' : ''" @change="saveScore(t.id, 'p_rank', parseInt($event.target.value))" />
              <div v-if="inputErrors[t.id + '-p_rank']" class="text-xs text-rose-600 mt-1">{{ inputErrors[t.id + '-p_rank'] }}</div>
            </td>
            <td v-if="settings.input_columns.kill" class="px-3 py-2 text-center">
              <input :value="getScoreValue(t.id, 'kill')" type="number" min="0" class="border rounded p-1 w-20" :class="inputErrors[t.id + '-kill'] ? 'border-rose-500' : ''" @change="saveScore(t.id, 'kill', parseInt($event.target.value))" />
              <div v-if="inputErrors[t.id + '-kill']" class="text-xs text-rose-600 mt-1">{{ inputErrors[t.id + '-kill'] }}</div>
            </td>
            <td v-if="!settings.hidden_action && !hideDataActions" class="px-3 py-2 text-right">
              <button class="text-blue-600 mr-2" @click="transferToGrandFinal(t.id)">Grand Final</button>
              <button class="text-rose-600" @click="removeTeam(t.id)">Hapus</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="flex items-center justify-between mt-3">
        <div class="text-sm text-slate-600">
          Halaman {{ currentPage }} dari {{ Math.max(1, Math.ceil((teamsInPot.length) / pageSize)) }}
        </div>
        <div class="flex items-center gap-2">
          <button class="px-3 py-1 bg-slate-200 rounded" @click="currentPage = Math.max(1, currentPage - 1)">Prev</button>
          <button class="px-3 py-1 bg-slate-200 rounded" @click="currentPage = currentPage + 1">Next</button>
        </div>
      </div>
      </SectionCard>

      <!-- Floating hover preview window -->
      <div
        v-if="hover.team"
        :style="{ top: hover.y + 'px', left: hover.x + 'px' }"
        class="fixed z-50 w-64 rounded-lg shadow-lg border border-slate-200 bg-white"
      >
        <div class="px-3 py-2 rounded-t-lg" style="background-color:#2c3e50">
          <div class="text-white text-sm font-semibold">Team: {{ hover.team.name }}</div>
        </div>
        <div class="p-3">
          <table class="w-full text-sm">
            <thead>
              <tr>
                <th class="text-left">Username</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(m, idx) in (hover.team.members || [])"
                :key="idx"
                class="hover:bg-slate-100"
                :class="idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'"
              >
                <td class="px-2 py-1">{{ m }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="mt-6">
        <h3 class="text-lg font-semibold mb-2">Tabel Penghitungan Point</h3>
        <div class="mb-2 flex items-center gap-2">
          <button @click="exportExcel" class="px-3 py-2 bg-indigo-600 text-white rounded">Export Excel</button>
          <span class="ml-3 inline-flex items-center gap-2">
            <span class="text-sm text-slate-600">Drop tim ke sini untuk GRAND FINAL:</span>
            <span
              class="px-3 py-2 rounded border border-amber-400 bg-amber-50 text-amber-700"
              @dragover.prevent
              @drop="dragTeamId && transferToGrandFinal(dragTeamId)"
            >
              Drop Zone GF
            </span>
          </span>
        </div>
        <div class="animate-fade-in overflow-x-auto">
          <table class="min-w-full border border-slate-900 dark:border-slate-200">
            <thead>
              <tr>
                <th rowspan="2" class="px-3 py-2 text-center font-semibold border border-slate-900 dark:border-slate-200 bg-amber-300 dark:bg-amber-400">No</th>
                <th rowspan="2" class="px-3 py-2 text-left font-semibold border border-slate-900 dark:border-slate-200 bg-amber-300 dark:bg-amber-400">Nama Tim</th>
                <th :colspan="games.length * 3" class="px-3 py-2 text-center font-semibold border border-slate-900 dark:border-slate-200 bg-amber-300 dark:bg-amber-400">
                  POT {{ (pots.find(p => p.id === selectedPotId)?.name || '') }}
                </th>
                <th rowspan="2" class="px-3 py-2 text-center font-semibold border border-slate-900 dark:border-slate-200 bg-amber-300 dark:bg-amber-400">Total Point</th>
                <th rowspan="2" class="px-3 py-2 text-center font-semibold border border-slate-900 dark:border-slate-200 bg-amber-300 dark:bg-amber-400">Juara</th>
              </tr>
              <tr>
                <th v-for="g in games" :key="g.id" colspan="3" class="px-3 py-2 text-center font-semibold border border-slate-900 dark:border-slate-200 bg-amber-300 dark:bg-amber-400">
                  GAME {{ g.game_number }}
                </th>
              </tr>
              <tr>
                <th
                  v-for="cell in games.map(g => [{k:g.id+'-rank', label:'Rank'},{k:g.id+'-prank', label:'P.Rank'},{k:g.id+'-pkill', label:'P.Kill'}]).flat()"
                  :key="cell.k"
                  class="px-3 py-2 text-center border border-slate-900 dark:border-slate-200 bg-amber-200 dark:bg-amber-300"
                >
                  {{ cell.label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, idx) in leaderboard"
                :key="row.team_id"
                :class="hasScore(row.team_id) ? 'bg-green-100' : ''"
              >
                <td class="px-3 py-2 text-center border border-slate-900 dark:border-slate-200">{{ idx + 1 }}</td>
                <td class="px-3 py-2 text-left border border-slate-900 dark:border-slate-200">{{ row.team_name }}</td>
                <template v-for="g in games" :key="'row-'+row.team_id+'-'+g.id">
                  <td class="px-3 py-2 text-center border border-slate-900 dark:border-slate-200">
                    {{ (scoresMap.get(`${row.team_id}-${g.id}`)?.rank ?? '-') }}
                  </td>
                  <td class="px-3 py-2 text-center border border-slate-900 dark:border-slate-200">
                    {{ (scoresMap.get(`${row.team_id}-${g.id}`)?.p_rank ?? '-') }}
                  </td>
                  <td class="px-3 py-2 text-center border border-slate-900 dark:border-slate-200">
                    {{ (scoresMap.get(`${row.team_id}-${g.id}`)?.kill ?? '-') }}
                  </td>
                </template>
                <td class="px-3 py-2 text-center border border-slate-900 dark:border-slate-200">{{ row.total_points }}</td>
                <td class="px-3 py-2 text-center border border-slate-900 dark:border-slate-200">{{ placeOf(row.team_id) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <SectionCard v-if="!settings.hidden_action" title="Tambah Tim">
        <div class="font-semibold mb-2">Tambah Tim ke Pot</div>
        <div class="flex items-end gap-2">
          <div class="flex-1">
            <label class="block text-sm text-slate-600 mb-1">Nama Tim</label>
            <input v-model="newTeamName" type="text" class="w-full border rounded px-3 py-2" />
          </div>
          <div class="flex-1">
            <label class="block text-sm text-slate-600 mb-1">Anggota (pisah baris)</label>
            <textarea v-model="newTeamMembersText" rows="3" class="w-full border rounded px-3 py-2" placeholder="Nama anggota per baris"></textarea>
          </div>
          <button @click="addTeam" class="px-3 py-2 bg-emerald-600 text-white rounded">+ Tim</button>
        </div>
      </SectionCard>
    </div>
    <div v-if="showImportModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-lg w-full max-w-md p-4">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-lg font-semibold">Impor Daftar Tim</h3>
          <button @click="closeImportModal" class="text-slate-600">✖</button>
        </div>
        <p class="text-sm text-slate-600 mb-2">Masukkan satu nama tim per baris:</p>
        <textarea
          v-model="bulkTeamNames"
          class="w-full border rounded p-2 h-40"
          :placeholder="'Contoh:\\nTeam A\\nTeam B\\nTeam C'"
        ></textarea>
        <button @click="importTeamsBulk" class="mt-3 w-full px-3 py-2 bg-indigo-600 text-white rounded">Tambahkan Tim</button>
      </div>
    </div>
    <div class="col-span-12" style="margin-top:40px">
      <div class="bg-white rounded">
        <div class="overflow-x-auto">
          <table class="min-w-full" style="background:#ffffff;border-collapse:collapse">
            <thead>
              <tr style="background:#bbdefb;color:#212529">
                <th style="width:40%;border:1px solid #e0e0e0;padding:12px;text-align:left">Kriteria Penilaian</th>
                <th style="width:20%;border:1px solid #e0e0e0;padding:12px;text-align:right">Bobot Skor</th>
                <th style="width:20%;border:1px solid #e0e0e0;padding:12px;text-align:right">Nilai Aktual</th>
                <th style="width:20%;border:1px solid #e0e0e0;padding:12px;text-align:right;font-weight:600">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in scoreRows" :key="row.id" style="color:#212529">
                <td style="border:1px solid #e0e0e0;padding:12px">{{ row.name }}</td>
                <td style="border:1px solid #e0e0e0;padding:12px;text-align:right">{{ (row.weight * 100).toFixed(0) }}%</td>
                <td style="border:1px solid #e0e0e0;padding:12px;text-align:right">{{ row.actual }}</td>
                <td style="border:1px solid #e0e0e0;padding:12px;text-align:right;font-weight:600">{{ row.subtotal }}</td>
              </tr>
              <tr style="background:#fff9c4;color:#212529">
                <td style="border:1px solid #e0e0e0;padding:12px">Total</td>
                <td style="border:1px solid #e0e0e0;padding:12px;text-align:right"></td>
                <td style="border:1px solid #e0e0e0;padding:12px;text-align:right"></td>
                <td style="border:1px solid #e0e0e0;padding:12px;text-align:right;font-weight:700">
                  {{ scoreRows.reduce((sum, r) => sum + r.subtotal, 0).toFixed(2) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
