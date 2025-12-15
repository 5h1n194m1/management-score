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

export const getTeamsByEvent = async (eventId) => {
  return supabase
    .from('teams')
    .select('id, name, members')
    .eq('event_id', eventId)
    .order('name', { ascending: true })
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
