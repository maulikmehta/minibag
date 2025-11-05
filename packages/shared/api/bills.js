/**
 * Bills API Routes
 * Endpoints for generating time-limited bill access tokens and fetching bill data
 */

import { supabase } from '../db/supabase.js';
import crypto from 'crypto';

/**
 * POST /api/sessions/:session_id/bill-token
 * Generate a time-limited access token for viewing a bill
 * Body: { participant_id?: string } - Optional for group mode, null for solo/host
 */
export async function generateBillToken(req, res) {
  try {
    const { session_id } = req.params;
    const { participant_id = null } = req.body;

    // Verify session exists
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, session_id, session_type, created_at')
      .eq('session_id', session_id)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // If participant_id provided, verify participant exists
    if (participant_id) {
      const { data: participant, error: participantError } = await supabase
        .from('participants')
        .select('id')
        .eq('id', participant_id)
        .eq('session_id', session_id)
        .single();

      if (participantError || !participant) {
        return res.status(404).json({
          success: false,
          error: 'Participant not found'
        });
      }
    }

    // Generate unique access token
    const accessToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

    // Check if token already exists for this session/participant combo (use session.id UUID)
    let tokenQuery = supabase
      .from('bill_access_tokens')
      .select('id, access_token, expires_at')
      .eq('session_id', session.id); // Use the UUID id

    // Handle NULL participant_id correctly
    if (participant_id) {
      tokenQuery = tokenQuery.eq('participant_id', participant_id);
    } else {
      tokenQuery = tokenQuery.is('participant_id', null);
    }

    const { data: existingToken } = await tokenQuery.maybeSingle();

    let tokenData;

    if (existingToken && new Date(existingToken.expires_at) > new Date()) {
      // Return existing valid token
      tokenData = existingToken;
    } else {
      // Delete existing expired token and create new one
      if (existingToken) {
        await supabase
          .from('bill_access_tokens')
          .delete()
          .eq('id', existingToken.id);
      }

      // Insert new token (use session.id which is the UUID)
      const { data: newToken, error: tokenError } = await supabase
        .from('bill_access_tokens')
        .insert({
          session_id: session.id, // Use the UUID id, not the TEXT session_id
          participant_id,
          access_token: accessToken,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (tokenError) {
        console.error('Failed to create bill token:', tokenError);
        return res.status(500).json({
          success: false,
          error: 'Failed to generate bill token'
        });
      }

      tokenData = newToken;
    }

    // Generate bill URL using request origin for correct domain (localhost vs tunnel)
    // This ensures local dev uses localhost:5173, and tunnel uses minibag.cc
    const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/') || process.env.FRONTEND_URL || 'http://localhost:5173';
    const billUrl = `${origin}/bill/${tokenData.access_token}`;

    res.json({
      success: true,
      token: tokenData.access_token,
      expires_at: tokenData.expires_at,
      bill_url: billUrl
    });
  } catch (error) {
    console.error('Error generating bill token:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

/**
 * GET /api/bill/:token
 * Fetch bill data using access token
 */
export async function getBillByToken(req, res) {
  try {
    const { token } = req.params;

    // Fetch and validate token
    const { data: tokenData, error: tokenError } = await supabase
      .from('bill_access_tokens')
      .select('*')
      .eq('access_token', token)
      .single();

    if (tokenError || !tokenData) {
      return res.status(404).json({
        success: false,
        error: 'Invalid bill link',
        message: 'This bill link is not valid'
      });
    }

    // Check if token has expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return res.status(403).json({
        success: false,
        error: 'Bill link expired',
        message: 'This bill link has expired. Please request a new one.'
      });
    }

    // Update access tracking
    await supabase
      .from('bill_access_tokens')
      .update({
        accessed_at: tokenData.accessed_at || new Date().toISOString(),
        access_count: (tokenData.access_count || 0) + 1
      })
      .eq('id', tokenData.id);

    // Fetch session data
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, session_id, session_type, created_at')
      .eq('id', tokenData.session_id)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Fetch payments first to get the item_ids
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('session_id', session.session_id);

    if (paymentsError) {
      console.error('Failed to fetch payments:', paymentsError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch payments'
      });
    }

    // Extract unique item_ids from payments
    const itemIds = [...new Set(payments.map(p => p.item_id))];

    // Handle case where there are no items
    if (itemIds.length === 0) {
      // Return empty bill
      if (tokenData.participant_id) {
        return await getParticipantBill(res, tokenData, session, [], payments);
      } else {
        return await getHostBill(res, tokenData, session, [], payments);
      }
    }

    // Fetch catalog items for those specific items
    const { data: catalogItems, error: catalogError } = await supabase
      .from('catalog_items')
      .select('*')
      .in('item_id', itemIds);

    if (catalogError) {
      console.error('Failed to fetch catalog items:', catalogError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch catalog items'
      });
    }

    // If participant_id is set, fetch participant-specific bill
    if (tokenData.participant_id) {
      return await getParticipantBill(res, tokenData, session, catalogItems, payments);
    } else {
      // Return host/solo bill (full session)
      return await getHostBill(res, tokenData, session, catalogItems, payments);
    }
  } catch (error) {
    console.error('Error fetching bill:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

/**
 * Helper: Get participant-specific bill
 */
async function getParticipantBill(res, tokenData, session, catalogItems, payments) {
  // Fetch participant data
  const { data: participant, error: participantError } = await supabase
    .from('participants')
    .select('*')
    .eq('id', tokenData.participant_id)
    .single();

  if (participantError || !participant) {
    return res.status(404).json({
      success: false,
      error: 'Participant not found'
    });
  }

  // Fetch participant items
  const { data: participantItems, error: itemsError } = await supabase
    .from('participant_items')
    .select('*')
    .eq('participant_id', tokenData.participant_id);

  if (itemsError) {
    console.error('Failed to fetch participant items:', itemsError);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch items'
    });
  }

  // Build payment map and skipped items
  const paymentMap = {};
  const skippedItems = {};
  payments.forEach(p => {
    if (p.skipped) {
      skippedItems[p.item_id] = p;
    } else {
      paymentMap[p.item_id] = p;
    }
  });

  // Fetch all participant items for total quantity calculation
  const { data: allParticipantItems, error: allItemsError } = await supabase
    .from('participant_items')
    .select('*')
    .in('item_id', participantItems.map(i => i.item_id));

  if (allItemsError) {
    console.error('Failed to fetch all participant items:', allItemsError);
    return res.status(500).json({
      success: false,
      error: 'Failed to calculate bill'
    });
  }

  // Calculate total quantities per item
  const itemTotals = {};
  allParticipantItems.forEach(item => {
    if (!skippedItems[item.item_id]) {
      itemTotals[item.item_id] = (itemTotals[item.item_id] || 0) + item.quantity;
    }
  });

  // Build catalog map
  const catalogMap = {};
  catalogItems.forEach(item => {
    catalogMap[item.item_id] = item;
  });

  // Calculate bill items
  const billItems = [];
  let totalAmount = 0;

  participantItems.forEach(item => {
    const catalog = catalogMap[item.item_id];
    const payment = paymentMap[item.item_id];

    if (catalog && payment && !skippedItems[item.item_id]) {
      const totalQty = itemTotals[item.item_id];
      const pricePerKg = payment.amount / totalQty;
      const itemCost = pricePerKg * item.quantity;

      billItems.push({
        item_name: catalog.name,
        emoji: catalog.emoji,
        quantity: item.quantity,
        unit: catalog.unit,
        price_per_unit: Math.round(pricePerKg * 100) / 100,
        total: Math.round(itemCost * 100) / 100
      });

      totalAmount += itemCost;
    }
  });

  res.json({
    success: true,
    bill_type: 'participant',
    session: {
      session_id: session.session_id,
      created_at: session.created_at,
      session_type: session.session_type
    },
    participant: {
      nickname: participant.nickname,
      avatar_emoji: participant.avatar_emoji
    },
    items: billItems,
    total_amount: Math.round(totalAmount * 100) / 100,
    expires_at: tokenData.expires_at
  });
}

/**
 * Helper: Get host/solo bill (full session)
 */
async function getHostBill(res, tokenData, session, catalogItems, payments) {

  // Build catalog map
  const catalogMap = {};
  catalogItems.forEach(item => {
    catalogMap[item.item_id] = item;
  });

  // Build bill items from payments
  const billItems = [];
  let totalAmount = 0;
  let totalItemsPaid = 0;
  let totalItemsSkipped = 0;

  payments.forEach(payment => {
    const catalog = catalogMap[payment.item_id];

    if (catalog) {
      if (payment.skipped) {
        totalItemsSkipped++;
        billItems.push({
          item_name: catalog.name,
          emoji: catalog.emoji,
          quantity: 0,
          unit: catalog.unit,
          price_per_unit: 0,
          total: 0,
          skipped: true,
          skip_reason: payment.skip_reason
        });
      } else {
        totalItemsPaid++;
        totalAmount += payment.amount;

        billItems.push({
          item_name: catalog.name,
          emoji: catalog.emoji,
          quantity: null, // Host bill doesn't show quantity breakdown
          unit: catalog.unit,
          price_per_unit: null,
          total: Math.round(payment.amount * 100) / 100,
          payment_method: payment.method,
          vendor_name: payment.vendor_name
        });
      }
    }
  });


  res.json({
    success: true,
    bill_type: 'host',
    session: {
      session_id: session.session_id,
      created_at: session.created_at,
      session_type: session.session_type
    },
    items: billItems,
    total_amount: Math.round(totalAmount * 100) / 100,
    total_items_paid: totalItemsPaid,
    total_items_skipped: totalItemsSkipped,
    expires_at: tokenData.expires_at
  });
}
