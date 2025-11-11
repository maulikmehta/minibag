/**
 * Payments API Routes
 * Endpoints for recording and managing shopping payments
 */

import { supabase } from '../db/supabase.js';
import logger from '../utils/logger.js';

/**
 * POST /api/sessions/:session_id/payments
 * Record a payment for an item
 */
export async function recordPayment(req, res) {
  try {
    const { session_id } = req.params;
    const {
      item_id,
      amount,
      method, // 'upi' or 'cash'
      recorded_by, // participant_id
      vendor_name = null,
      skipped = false,
      skip_reason = 'Item wasn\'t good enough to buy'
    } = req.body;

    // Validation for skipped items
    if (skipped) {
      // Ensure amount and method are not provided or are explicitly null/0
      if (amount !== undefined && amount !== 0 && amount !== null) {
        return res.status(400).json({
          success: false,
          error: 'Skipped items cannot have amount > 0',
          details: { received: amount, expected: '0 or undefined' }
        });
      }

      // Method must be 'skip' for skipped items
      if (method !== undefined && method !== null && method !== 'skip') {
        return res.status(400).json({
          success: false,
          error: 'Skipped items must have method set to "skip"',
          details: { received: method, expected: '"skip", null, or undefined' }
        });
      }

      if (!item_id) {
        return res.status(400).json({
          success: false,
          error: 'item_id is required for skipped items'
        });
      }
    } else {
      // Validation for regular payments
      if (!item_id || amount === undefined || amount === null || !method) {
        return res.status(400).json({
          success: false,
          error: 'item_id, amount, and method are required for payments',
          details: {
            item_id: !!item_id,
            amount: amount !== undefined && amount !== null,
            method: !!method
          }
        });
      }

      if (!['upi', 'cash'].includes(method)) {
        return res.status(400).json({
          success: false,
          error: 'method must be "upi" or "cash"',
          details: { received: method, expected: '"upi" or "cash"' }
        });
      }

      if (amount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'amount must be greater than 0 for payments',
          details: { received: amount, expected: '> 0' }
        });
      }
    }

    // Insert payment record
    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        session_id,
        item_id,
        amount: skipped ? 0 : parseFloat(amount),
        method: skipped ? 'skip' : method, // Use 'skip' instead of null for DB constraint
        recorded_by,
        vendor_name: skipped ? null : vendor_name,
        status: skipped ? 'skipped' : 'paid',
        skipped,
        skip_reason: skipped ? skip_reason : null,
        recorded_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      logger.error({ err: error, sessionId: session_id }, 'Failed to record payment');
      return res.status(500).json({
        success: false,
        error: 'Failed to record payment'
      });
    }

    res.json({
      success: true,
      payment
    });
  } catch (error) {
    logger.error({ err: error, sessionId: req.params.session_id }, 'Error recording payment');
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

/**
 * GET /api/sessions/:session_id/payments
 * Get all payments for a session
 */
export async function getSessionPayments(req, res) {
  try {
    const { session_id } = req.params;

    const { data: payments, error } = await supabase
      .from('payments')
      .select('*')
      .eq('session_id', session_id)
      .order('recorded_at', { ascending: true });

    if (error) {
      logger.error({ err: error, sessionId: session_id }, 'Failed to fetch payments');
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch payments'
      });
    }

    res.json({
      success: true,
      payments: payments || []
    });
  } catch (error) {
    logger.error({ err: error, sessionId: req.params.session_id }, 'Error fetching payments');
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

/**
 * PUT /api/payments/:payment_id
 * Update a payment record
 */
export async function updatePayment(req, res) {
  try {
    const { payment_id } = req.params;
    const { amount, method, vendor_name } = req.body;

    // Build update object
    const updates = {};
    if (amount !== undefined) updates.amount = parseFloat(amount);
    if (method !== undefined) updates.method = method;
    if (vendor_name !== undefined) updates.vendor_name = vendor_name;

    // Validate method if provided
    if (method && !['upi', 'cash', 'skip'].includes(method)) {
      return res.status(400).json({
        success: false,
        error: 'method must be "upi", "cash", or "skip"'
      });
    }

    const { data: payment, error } = await supabase
      .from('payments')
      .update(updates)
      .eq('id', payment_id)
      .select()
      .single();

    if (error) {
      logger.error({ err: error, paymentId: payment_id }, 'Failed to update payment');
      return res.status(500).json({
        success: false,
        error: 'Failed to update payment'
      });
    }

    res.json({
      success: true,
      payment
    });
  } catch (error) {
    logger.error({ err: error, paymentId: req.params.payment_id }, 'Error updating payment');
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

/**
 * DELETE /api/payments/:payment_id
 * Delete a payment record
 */
export async function deletePayment(req, res) {
  try {
    const { payment_id } = req.params;

    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', payment_id);

    if (error) {
      logger.error({ err: error, paymentId: payment_id }, 'Failed to delete payment');
      return res.status(500).json({
        success: false,
        error: 'Failed to delete payment'
      });
    }

    res.json({
      success: true,
      message: 'Payment deleted successfully'
    });
  } catch (error) {
    logger.error({ err: error, paymentId: req.params.payment_id }, 'Error deleting payment');
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

/**
 * GET /api/sessions/:session_id/payments/summary
 * Get payment summary for a session
 */
export async function getPaymentSummary(req, res) {
  try {
    const { session_id } = req.params;

    // Get all payments
    const { data: payments, error } = await supabase
      .from('payments')
      .select('*')
      .eq('session_id', session_id);

    if (error) {
      logger.error({ err: error, sessionId: session_id }, 'Failed to fetch payments for summary');
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch payments'
      });
    }

    // Calculate summary
    const summary = {
      total_amount: 0,
      total_items_paid: 0,
      total_items_skipped: 0,
      upi_amount: 0,
      cash_amount: 0,
      payments_by_participant: {}
    };

    payments.forEach(payment => {
      if (payment.skipped) {
        summary.total_items_skipped++;
      } else {
        summary.total_amount += payment.amount;
        summary.total_items_paid++;

        if (payment.method === 'upi') {
          summary.upi_amount += payment.amount;
        } else {
          summary.cash_amount += payment.amount;
        }

        // Track by participant
        if (payment.recorded_by) {
          if (!summary.payments_by_participant[payment.recorded_by]) {
            summary.payments_by_participant[payment.recorded_by] = {
              total: 0,
              count: 0
            };
          }
          summary.payments_by_participant[payment.recorded_by].total += payment.amount;
          summary.payments_by_participant[payment.recorded_by].count++;
        }
      }
    });

    res.json({
      success: true,
      summary
    });
  } catch (error) {
    logger.error({ err: error, sessionId: req.params.session_id }, 'Error calculating payment summary');
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

/**
 * GET /api/sessions/:session_id/split
 * Calculate cost split for all participants
 */
export async function getPaymentSplit(req, res) {
  try {
    const { session_id } = req.params;

    // Get session with participants and items
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        *,
        participants (
          id,
          nickname,
          avatar_emoji,
          participant_items (
            item_id,
            quantity
          )
        )
      `)
      .eq('session_id', session_id)
      .single();

    if (sessionError) {
      logger.error({ err: sessionError, sessionId: session_id }, 'Failed to fetch session');
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch session data'
      });
    }

    // Get payments
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('session_id', session_id);

    if (paymentsError) {
      logger.error({ err: paymentsError, sessionId: session_id }, 'Failed to fetch payments for split');
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch payments'
      });
    }

    // Fetch catalog items to map UUID to TEXT item_id
    const { data: catalogItems, error: catalogError } = await supabase
      .from('catalog_items')
      .select('id, item_id')
      .eq('session_id', session_id);

    if (catalogError) {
      logger.error({ err: catalogError, sessionId: session_id }, 'Failed to fetch catalog items');
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch catalog data'
      });
    }

    // Build UUID to TEXT item_id mapping
    const uuidToTextMap = {};
    catalogItems.forEach(item => {
      uuidToTextMap[item.id] = item.item_id;
    });

    // Build payment map by item_id (exclude skipped items from calculations)
    const paymentMap = {};
    const skippedItems = {};
    payments.forEach(p => {
      if (p.skipped) {
        skippedItems[p.item_id] = p;
      } else {
        paymentMap[p.item_id] = p;
      }
    });

    // Calculate total quantities per item (exclude skipped items)
    const itemTotals = {};
    sessionData.participants.forEach(participant => {
      participant.participant_items.forEach(item => {
        const textItemId = uuidToTextMap[item.item_id]; // Convert UUID to TEXT
        // Only count non-skipped items
        if (textItemId && !skippedItems[textItemId]) {
          itemTotals[item.item_id] = (itemTotals[item.item_id] || 0) + item.quantity;
        }
      });
    });

    // Calculate split for each participant
    const splits = sessionData.participants.map(participant => {
      let totalCost = 0;
      const itemBreakdown = [];

      participant.participant_items.forEach(item => {
        const textItemId = uuidToTextMap[item.item_id]; // Convert UUID to TEXT
        const payment = paymentMap[textItemId]; // Use TEXT item_id for payment lookup
        if (payment && textItemId) {
          const totalQty = itemTotals[item.item_id];
          const pricePerKg = payment.amount / totalQty;
          const itemCost = pricePerKg * item.quantity;

          totalCost += itemCost;
          itemBreakdown.push({
            item_id: item.item_id,
            quantity: item.quantity,
            price_per_kg: Math.round(pricePerKg),
            item_cost: Math.round(itemCost)
          });
        }
      });

      return {
        participant_id: participant.id,
        nickname: participant.nickname,
        avatar_emoji: participant.avatar_emoji,
        total_cost: Math.round(totalCost),
        items: itemBreakdown
      };
    });

    const totalPaid = payments.reduce((sum, p) => p.skipped ? sum : sum + p.amount, 0);

    res.json({
      success: true,
      session_id,
      total_paid: Math.round(totalPaid),
      splits,
      skipped_items: Object.keys(skippedItems).map(item_id => ({
        item_id,
        skip_reason: skippedItems[item_id].skip_reason
      }))
    });
  } catch (error) {
    logger.error({ err: error, sessionId: req.params.session_id }, 'Error calculating payment split');
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
