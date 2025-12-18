const handleAddPot = async () => {
  if (!newPotName.value) return;
  
  try {
    // AMBIL DARI ROUTE PARAMS (Ini paling aman)
    const idEvent = route.params.eventId; 

    const { data, error } = await supabase
      .from('pots')
      .insert([{ 
        event_id: idEvent, 
        name: newPotName.value,
        display_order: pots.value.length + 1 
      }])
      .select();

    if (error) throw error;
    
    showAddPotModal.value = false;
    newPotName.value = '';
    await fetchPotsAndTeams(); // Refresh data setelah tambah
  } catch (err) {
    alert("Gagal: " + err.message);
  }
};