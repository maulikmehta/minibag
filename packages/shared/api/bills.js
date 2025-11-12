/**
 * Bills API Routes
 * Endpoints for generating time-limited bill access tokens and fetching bill data
 */

import { supabase } from '../db/supabase.js';
import crypto from 'crypto';
import logger from '../utils/logger.js';
import { buildPaymentMaps, buildCatalogMap, calculateItemTotals } from '../utils/billCalculations.js';

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
        .eq('session_id', session.id) // Use session UUID, not short session_id
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
        logger.error({ err: tokenError, sessionId: session.id, participantId: participant_id }, 'Failed to create bill token');
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
    logger.error({ err: error, sessionId: req.params.session_id }, 'Error generating bill token');
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

    logger.debug({ token }, '[getBillByToken] Fetching bill for token');

    // Fetch and validate token
    const { data: tokenData, error: tokenError } = await supabase
      .from('bill_access_tokens')
      .select('*')
      .eq('access_token', token)
      .single();

    logger.debug({
      hasToken: !!tokenData,
      participantId: tokenData?.participant_id,
      sessionId: tokenData?.session_id,
      expiresAt: tokenData?.expires_at
    }, '[getBillByToken] Token data');

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

    // Fetch session data with host information
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, session_id, session_type, created_at, creator_nickname, title, completed_at')
      .eq('id', tokenData.session_id)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Fetch host (creator) real name
    const { data: hostParticipant } = await supabase
      .from('participants')
      .select('real_name, nickname')
      .eq('session_id', tokenData.session_id)
      .eq('is_creator', true)
      .single();

    const hostRealName = hostParticipant?.real_name || session.creator_nickname || 'Your MiniBag Host';

    // Fetch participant count for the session
    const { count: participantCount } = await supabase
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', tokenData.session_id);

    // Fetch payments first to get the item_ids
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('session_id', session.session_id);

    if (paymentsError) {
      logger.error({ err: paymentsError, sessionId: session.session_id }, 'Failed to fetch payments');
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
        return await getParticipantBill(res, tokenData, session, [], payments, hostRealName, participantCount);
      } else {
        return await getHostBill(res, tokenData, session, [], payments, hostRealName, participantCount);
      }
    }

    // Fetch catalog items for those specific items
    const { data: catalogItems, error: catalogError } = await supabase
      .from('catalog_items')
      .select('*')
      .in('item_id', itemIds);

    if (catalogError) {
      logger.error({ err: catalogError, itemIds }, 'Failed to fetch catalog items');
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch catalog items'
      });
    }

    // If participant_id is set, fetch participant-specific bill
    if (tokenData.participant_id) {
      logger.debug({ participantId: tokenData.participant_id }, '[getBillByToken] Calling getParticipantBill');
      return await getParticipantBill(res, tokenData, session, catalogItems, payments, hostRealName, participantCount);
    } else {
      logger.debug('[getBillByToken] Calling getHostBill (no participant_id)');
      // Return host/solo bill (full session)
      return await getHostBill(res, tokenData, session, catalogItems, payments, hostRealName, participantCount);
    }
  } catch (error) {
    logger.error({ err: error, token: req.params.token }, 'Error fetching bill');
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

/**
 * Helper: Get participant-specific bill
 */
async function getParticipantBill(res, tokenData, session, catalogItems, payments, hostRealName, participantCount) {
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
    logger.error({ err: itemsError, participantId: tokenData.participant_id }, 'Failed to fetch participant items');
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch items'
    });
  }

  // Build payment map and skipped items using shared utility
  const { paymentMap, skippedItems } = buildPaymentMaps(payments);

  logger.debug({
    participantId: tokenData.participant_id,
    participantNickname: participant.nickname,
    participantItemsCount: participantItems?.length,
    paymentsCount: payments?.length,
    paymentMapKeys: Object.keys(paymentMap),
    participantItemsSample: participantItems?.slice(0, 2)
  }, '[getParticipantBill] Debug data');

  // Fetch all participant items for total quantity calculation (filtered by session)
  // CRITICAL: Must filter by session to avoid cross-session data leak that inflates totals
  const { data: allParticipantItems, error: allItemsError } = await supabase
    .from('participant_items')
    .select(`
      *,
      participant:participants!inner(session_id)
    `)
    .in('item_id', participantItems.map(i => i.item_id))
    .eq('participant.session_id', tokenData.session_id);

  if (allItemsError) {
    logger.error({ err: allItemsError, participantId: tokenData.participant_id }, 'Failed to fetch all participant items');
    return res.status(500).json({
      success: false,
      error: 'Failed to calculate bill'
    });
  }

  // Build catalog map keyed by UUID (primary key) for proper lookup using shared utility
  const catalogMap = buildCatalogMap(catalogItems, 'id');

  // Calculate total quantities per item (excluding skipped items) using shared utility
  const itemTotals = calculateItemTotals(allParticipantItems, catalogMap, skippedItems);

  // Calculate bill items
  const billItems = [];
  let totalAmount = 0;

  participantItems.forEach(item => {
    const catalog = catalogMap[item.item_id];
    if (!catalog) {
      logger.warn({ itemUUID: item.item_id }, '[getParticipantBill] No catalog entry for item UUID');
      return;  // Skip if no catalog entry
    }

    // Use TEXT item_id from catalog for payment lookup (not UUID from participant_items)
    const itemId = catalog.item_id;
    const payment = paymentMap[itemId];

    logger.debug({
      itemUUID: item.item_id,
      catalogItemId: itemId,
      catalogName: catalog.name,
      hasPayment: !!payment,
      isSkipped: !!skippedItems[itemId],
      quantity: item.quantity
    }, '[getParticipantBill] Processing item');

    if (payment && !skippedItems[itemId]) {
      const totalQty = itemTotals[item.item_id];  // UUID is correct for itemTotals
      const pricePerKg = payment.amount / totalQty;
      const itemCost = pricePerKg * item.quantity;

      logger.debug({
        name: catalog.name,
        totalQty,
        paymentAmount: payment.amount,
        pricePerKg,
        participantQty: item.quantity,
        itemCost
      }, '[getParticipantBill] Adding bill item');

      billItems.push({
        item_name: catalog.name,
        item_name_hi: catalog.name_hi,
        item_name_gu: catalog.name_gu,
        emoji: catalog.emoji,
        quantity: item.quantity,
        unit: catalog.unit,
        price_per_unit: Math.round(pricePerKg),
        total: Math.round(itemCost),
        payment_method: payment.method,
        billed_to: [participant.real_name || participant.nickname]
      });

      totalAmount += itemCost;
    } else {
      logger.debug({
        reason: !payment ? 'No payment' : 'Item skipped',
        itemId,
        hasPayment: !!payment,
        isSkipped: !!skippedItems[itemId]
      }, '[getParticipantBill] Skipping item');
    }
  });

  res.json({
    success: true,
    bill_type: 'participant',
    session: {
      session_id: session.session_id,
      created_at: session.created_at,
      completed_at: session.completed_at,
      session_type: session.session_type,
      title: session.title
    },
    host: {
      real_name: hostRealName
    },
    participant: {
      nickname: participant.nickname,
      avatar_emoji: participant.avatar_emoji,
      real_name: participant.real_name
    },
    items: billItems,
    total_amount: Math.round(totalAmount),
    participant_count: participantCount || 0,
    expires_at: tokenData.expires_at
  });
}

/**
 * Helper: Get host/solo bill (full session)
 */
async function getHostBill(res, tokenData, session, catalogItems, payments, hostRealName, participantCount) {

  // Build catalog map using shared utility (keyed by TEXT item_id for payment lookup)
  const catalogMap = buildCatalogMap(catalogItems, 'item_id');

  // Fetch all participant items for the session to calculate quantities
  const { data: allParticipantItems } = await supabase
    .from('participant_items')
    .select(`
      *,
      participant:participants!inner(session_id, real_name, nickname)
    `)
    .eq('participant.session_id', tokenData.session_id);

  // Build payment map and skipped items using shared utility
  const { paymentMap, skippedItems } = buildPaymentMaps(payments);

  // Build catalog map keyed by UUID for itemTotals calculation
  const catalogMapByUuid = buildCatalogMap(catalogItems, 'id');

  // Calculate total quantities per item (excluding skipped items)
  const itemTotals = calculateItemTotals(allParticipantItems || [], catalogMapByUuid, skippedItems);

  // Build participant names map per item (keyed by UUID)
  const itemParticipants = {};
  (allParticipantItems || []).forEach(pi => {
    if (!itemParticipants[pi.item_id]) {
      itemParticipants[pi.item_id] = [];
    }
    const displayName = pi.participant?.real_name || pi.participant?.nickname || 'Unknown';
    if (!itemParticipants[pi.item_id].includes(displayName)) {
      itemParticipants[pi.item_id].push(displayName);
    }
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
          item_name_hi: catalog.name_hi,
          item_name_gu: catalog.name_gu,
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

        // Calculate quantity and price per unit if participant items exist
        const catalog_uuid = catalogItems.find(c => c.item_id === payment.item_id)?.id;
        const totalQty = itemTotals[catalog_uuid] || 0;
        const pricePerKg = totalQty > 0 ? payment.amount / totalQty : 0;

        // Get participants who ordered this item
        const billedTo = itemParticipants[catalog_uuid] || [];

        billItems.push({
          item_name: catalog.name,
          item_name_hi: catalog.name_hi,
          item_name_gu: catalog.name_gu,
          emoji: catalog.emoji,
          quantity: totalQty > 0 ? totalQty : null,
          unit: catalog.unit,
          price_per_unit: totalQty > 0 ? Math.round(pricePerKg) : null,
          total: Math.round(payment.amount),
          payment_method: payment.method,
          vendor_name: payment.vendor_name,
          billed_to: billedTo
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
      completed_at: session.completed_at,
      session_type: session.session_type,
      title: session.title
    },
    host: {
      real_name: hostRealName
    },
    items: billItems,
    total_amount: Math.round(totalAmount),
    total_items_paid: totalItemsPaid,
    total_items_skipped: totalItemsSkipped,
    participant_count: participantCount || 0,
    expires_at: tokenData.expires_at
  });
}
