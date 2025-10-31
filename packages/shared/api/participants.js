/**
 * Participants API Routes
 * Endpoints for managing participant items
 */

import { supabase } from '../db/supabase.js';

/**
 * PUT /api/participants/:participant_id/items
 * Update all items for a participant (bulk update/replace)
 */
export async function updateParticipantItems(req, res) {
  try {
    const { participant_id } = req.params;
    const { items = [] } = req.body; // Array of {item_id, quantity, unit}

    // Validation
    if (!participant_id) {
      return res.status(400).json({
        success: false,
        error: 'participant_id is required'
      });
    }

    // Verify participant exists
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('id, session_id')
      .eq('id', participant_id)
      .single();

    if (participantError || !participant) {
      return res.status(404).json({
        success: false,
        error: 'Participant not found'
      });
    }

    // Delete all existing items for this participant
    const { error: deleteError } = await supabase
      .from('participant_items')
      .delete()
      .eq('participant_id', participant_id);

    if (deleteError) {
      console.error('Error deleting old items:', deleteError);
      throw deleteError;
    }

    // Insert new items (if any)
    if (items.length > 0) {
      // Get UUID mappings for item_ids
      const itemIds = items.map(item => item.item_id);
      const { data: catalogItems, error: catalogError } = await supabase
        .from('catalog_items')
        .select('id, item_id')
        .in('item_id', itemIds);

      if (catalogError) throw catalogError;

      // Create mapping of item_id -> UUID
      const itemIdMap = {};
      catalogItems.forEach(item => {
        itemIdMap[item.item_id] = item.id;
      });

      // Prepare items for insertion
      const itemsToInsert = items.map(item => ({
        participant_id: participant_id,
        item_id: itemIdMap[item.item_id], // Use UUID
        quantity: item.quantity,
        unit: item.unit || 'kg'
      }));

      const { error: insertError } = await supabase
        .from('participant_items')
        .insert(itemsToInsert);

      if (insertError) {
        console.error('Error inserting items:', insertError);
        throw insertError;
      }
    }

    // Return updated participant with items
    const { data: updatedParticipant, error: fetchError } = await supabase
      .from('participants')
      .select(`
        *,
        items:participant_items(
          *,
          catalog_item:catalog_items(*)
        )
      `)
      .eq('id', participant_id)
      .single();

    if (fetchError) throw fetchError;

    res.json({
      success: true,
      data: updatedParticipant
    });
  } catch (error) {
    console.error('Error updating participant items:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * PATCH /api/participants/:participant_id/status
 * Update participant status (items_confirmed, marked_not_coming)
 */
export async function updateParticipantStatus(req, res) {
  try {
    const { participant_id } = req.params;
    const { items_confirmed, marked_not_coming } = req.body;

    // Build update object with only provided fields
    const updates = {};

    if (typeof items_confirmed === 'boolean') {
      updates.items_confirmed = items_confirmed;
    }

    if (typeof marked_not_coming === 'boolean') {
      updates.marked_not_coming = marked_not_coming;
      if (marked_not_coming) {
        updates.marked_not_coming_at = new Date().toISOString();
      } else {
        updates.marked_not_coming_at = null;
      }
    }

    // Validate at least one field is being updated
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    // Update participant
    const { data: participant, error: updateError } = await supabase
      .from('participants')
      .update(updates)
      .eq('id', participant_id)
      .select()
      .single();

    if (updateError) throw updateError;

    if (!participant) {
      return res.status(404).json({
        success: false,
        error: 'Participant not found'
      });
    }

    res.json({
      success: true,
      data: participant
    });
  } catch (error) {
    console.error('Error updating participant status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
