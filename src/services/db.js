import { supabase } from '@/supabaseClient.js'

export const getPublicEvents = async () => {
  return supabase
    .from('events')
    .select('id, title, status, created_at')
    .in('status', ['live', 'completed'])
}

export const getAllEvents = async () => {
  return supabase
    .from('events')
    .select('id, title, status, created_at')
}

export const setEventStatus = async (eventId, status) => {
  return supabase
    .from('events')
    .update({ status })
    .eq('id', eventId)
    .select()
}

export const createEvent = async (adminId, title, status = 'draft') => {
  return supabase
    .from('events')
    .insert({ admin_id: adminId, title, status })
    .select()
}

export const getEventSettings = async (eventId) => {
  return supabase
    .from('event_settings')
    .select('*')
    .eq('event_id', eventId)
    .maybeSingle()
}

export const upsertEventSettings = async (eventId, payload) => {
  return supabase
    .from('event_settings')
    .upsert({ event_id: eventId, ...payload })
    .select()
}

export const getPotsByEvent = async (eventId) => {
  return supabase
    .from('pots')
    .select('id, name, display_order, is_hidden')
    .eq('event_id', eventId)
    .order('display_order', { ascending: true })
}

export const togglePotHidden = async (potId, isHidden) => {
  return supabase
    .from('pots')
    .update({ is_hidden: isHidden })
    .eq('id', potId)
    .select()
}

export const createPot = async (eventId, name, display_order = 1) => {
  return supabase
    .from('pots')
    .insert({ event_id: eventId, name, display_order })
    .select()
}

export const deletePot = async (potId) => {
  return supabase
    .from('pots')
    .delete()
    .eq('id', potId)
}

export const getTeamsByEvent = async (eventId) => {
  return supabase
    .from('teams')
    .select('id, name, members')
    .eq('event_id', eventId)
    .order('name', { ascending: true })
}

export const getTeamsByPot = async (potId) => {
  return supabase
    .from('team_pot_mapping')
    .select('team_id, is_finalist, teams(id, name, members)')
    .eq('pot_id', potId)
}

export const addTeamToPot = async (teamId, potId) => {
  return supabase
    .from('team_pot_mapping')
    .upsert({ team_id: teamId, pot_id: potId }, { onConflict: 'team_id,pot_id' })
    .select()
}

export const removeTeamFromPot = async (teamId, potId) => {
  return supabase
    .from('team_pot_mapping')
    .delete()
    .eq('team_id', teamId)
    .eq('pot_id', potId)
}

export const createTeam = async (eventId, name, members = []) => {
  return supabase
    .from('teams')
    .insert({ event_id: eventId, name, members })
    .select()
}

export const deleteTeam = async (teamId) => {
  return supabase
    .from('teams')
    .delete()
    .eq('id', teamId)
}

export const getGamesByPot = async (potId) => {
  return supabase
    .from('games')
    .select('id, pot_id, game_number, screenshot_url')
    .eq('pot_id', potId)
    .order('game_number', { ascending: true })
}

export const addGameToPot = async (potId, nextNumber) => {
  return supabase
    .from('games')
    .insert({ pot_id: potId, game_number: nextNumber })
    .select()
}

export const deleteGame = async (gameId) => {
  return supabase
    .from('games')
    .delete()
    .eq('id', gameId)
}

export const uploadGameScreenshot = async (eventId, gameId, file) => {
  const ext = file.name.split('.').pop()
  const path = `event/${eventId}/game_${gameId}/${crypto.randomUUID()}.${ext}`
  const { data: up, error: upErr } = await supabase.storage.from('screenshots').upload(path, file, {
    cacheControl: '3600',
    upsert: false
  })
  if (upErr) return { data: null, error: upErr }
  const { data: urlData } = await supabase.storage.from('screenshots').getPublicUrl(up.path)
  const publicUrl = urlData?.publicUrl || null
  if (!publicUrl) return { data: null, error: new Error('Gagal mendapatkan URL publik') }
  const { data, error } = await supabase.from('games').update({ screenshot_url: publicUrl }).eq('id', gameId).select()
  return { data, error }
}

export const upsertRawScore = async ({ game_id, team_id, rank, p_rank, kill }) => {
  return supabase
    .from('raw_scores')
    .upsert({ game_id, team_id, rank, p_rank, kill })
    .select()
}

export const getLeaderboardByPot = async (potId) => {
  return supabase
    .from('v_pot_leaderboard')
    .select('team_id, team_name, total_points, total_kill')
    .eq('pot_id', potId)
    .order('total_points', { ascending: false })
    .order('total_kill', { ascending: false })
    .order('team_name', { ascending: true })
}

export const getRawScoresByPot = async (potId) => {
  return supabase
    .from('raw_scores')
    .select('game_id, team_id, rank, p_rank, kill, teams(name), games(game_number)')
    .in('game_id', (await supabase.from('games').select('id').eq('pot_id', potId)).data?.map(g => g.id) || [])
}

export const getPointMapping = async (eventId) => {
  return supabase
    .from('point_mapping')
    .select('id, rank_position, points')
    .eq('event_id', eventId)
    .order('rank_position', { ascending: true })
}

export const upsertPointMapping = async (eventId, rows) => {
  const payload = rows.map(r => ({ event_id: eventId, rank_position: r.rank_position, points: r.points }))
  return supabase
    .from('point_mapping')
    .upsert(payload, { onConflict: 'event_id,rank_position' })
    .select()
}

export const moveTeamToGrandFinal = async (eventId, teamId) => {
  return supabase.rpc('move_team_to_grand_final', { e_id: eventId, t_id: teamId })
}

export const resetScoresValues = async (eventId) => {
  return supabase.rpc('reset_scores_values', { e_id: eventId })
}

export const resetAllData = async (eventId) => {
  return supabase.rpc('reset_all_data', { e_id: eventId })
}

export const subscribeRawScoresByEvent = (eventId, handler) => {
  return supabase
    .channel(`raw_scores_event_${eventId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'raw_scores' },
      handler
    )
    .subscribe()
}

// Profile helpers (theme preference)
export const getProfileTheme = async (userId) => {
  if (!userId) return { data: null, error: new Error('User tidak valid') }
  const { data, error } = await supabase
    .from('profiles')
    .select('id, theme')
    .eq('id', userId)
    .maybeSingle()
  return { data, error }
}

export const upsertProfileTheme = async (userId, theme) => {
  if (!userId) return { data: null, error: new Error('User tidak valid') }
  // Upsert akan membuat atau memperbarui baris profil pengguna
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, theme }, { onConflict: 'id' })
    .select()
  return { data: data?.[0] || null, error }
}
