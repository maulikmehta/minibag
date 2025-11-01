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

    // Get UUID mappings for item_ids from items to be saved
    const itemIds = items.map(item => item.item_id);

    if (itemIds.length > 0) {
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

      // Prepare items for upsert
      const itemsToUpsert = items.map(item => ({
        participant_id: participant_id,
        item_id: itemIdMap[item.item_id], // Use UUID
        quantity: item.quantity,
        unit: item.unit || 'kg'
      }));

      // Use upsert to handle both insert and update atomically
      // This prevents race conditions from concurrent updates
      const { error: upsertError } = await supabase
        .from('participant_items')
        .upsert(itemsToUpsert, {
          onConflict: 'participant_id,item_id',
          ignoreDuplicates: false
        });

      if (upsertError) {
        console.error('Error upserting items:', upsertError);
        throw upsertError;
      }
    }

    // Delete items that are no longer in the list
    // Get all current items for this participant
    const { data: currentItems } = await supabase
      .from('participant_items')
      .select('item_id')
      .eq('participant_id', participant_id);

    if (currentItems && currentItems.length > 0) {
      // Get UUIDs of items we want to keep
      const itemIds = items.map(item => item.item_id);
      const { data: catalogItems } = await supabase
        .from('catalog_items')
        .select('id, item_id')
        .in('item_id', itemIds);

      const uuidsToKeep = catalogItems?.map(item => item.id) || [];

      // Find items to delete (items that exist but aren't in the new list)
      const itemsToDelete = currentItems
        .filter(item => !uuidsToKeep.includes(item.item_id))
        .map(item => item.item_id);

      if (itemsToDelete.length > 0) {
        await supabase
          .from('participant_items')
          .delete()
          .eq('participant_id', participant_id)
          .in('item_id', itemsToDelete);
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
