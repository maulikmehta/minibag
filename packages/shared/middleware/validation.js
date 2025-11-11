import { body, param, validationResult } from 'express-validator';
import { supabase } from '../db/supabase.js';

// Validation middleware to check results
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array(),
      requestId: req.id
    });
  }
  next();
};

// Session creation validation
export const validateSessionCreation = [
  body('location_text')
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Location text is required and must be less than 200 characters'),
  body('scheduled_time')
    .isString()
    .notEmpty()
    .withMessage('Scheduled time is required'),
  body('selected_nickname')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Selected nickname must be between 2 and 50 characters'),
  body('selected_nickname_id')
    .optional()
    .custom((value) => {
      if (!value) return true; // null/undefined is okay
      // Accept UUID format (from nickname pool)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
      // Accept fallback format (generated client-side when pool empty)
      const isFallback = /^fallback-(male|female)-[a-f0-9]{16}$/.test(value);
      if (!isUUID && !isFallback) {
        throw new Error('Invalid nickname ID format');
      }
      return true;
    }),
  body('selected_avatar_emoji')
    .optional()
    .isString()
    .withMessage('Invalid avatar emoji'),
  body('real_name')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Real name must be less than 100 characters'),
  body('session_pin')
    .optional()
    .matches(/^\d{4,6}$/)
    .withMessage('Session PIN must be a 4-6 digit number'),
  body('generate_pin')
    .optional()
    .isBoolean()
    .withMessage('generate_pin must be a boolean'),
  validate
];

// Join session validation with duplicate nickname check
export const validateJoinSession = [
  param('session_id')
    .isString()
    .isLength({ min: 6, max: 12 })
    .withMessage('Invalid session ID format'),
  body('selected_nickname')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Selected nickname must be between 2 and 50 characters'),
  body('selected_nickname_id')
    .optional()
    .custom((value) => {
      if (!value) return true; // null/undefined is okay
      // Accept UUID format (from nickname pool)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
      // Accept fallback format (generated client-side when pool empty)
      const isFallback = /^fallback-(male|female)-[a-f0-9]{16}$/.test(value);
      if (!isUUID && !isFallback) {
        throw new Error('Invalid nickname ID format');
      }
      return true;
    }),
  body('selected_avatar_emoji')
    .optional()
    .isString()
    .withMessage('Invalid avatar emoji'),
  body('real_name')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Real name must be less than 100 characters'),
  body('session_pin')
    .optional()
    .matches(/^\d{4,6}$/)
    .withMessage('Session PIN must be a 4-6 digit number'),
  validate
];

// Payment validation with custom logic for skip items
export const validatePayment = [
  param('session_id')
    .isString()
    .isLength({ min: 6, max: 12 })
    .withMessage('Invalid session ID format'),
  body('item_id')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Item ID is required'),
  body('skipped')
    .optional()
    .isBoolean()
    .withMessage('Skipped must be a boolean'),
  body('skip_reason')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Skip reason must be less than 200 characters'),
  // Custom validation for amount and method based on skipped flag
  body('amount')
    .optional()
    .custom((value, { req }) => {
      // If skipped, amount can be 0, null, or undefined
      if (req.body.skipped === true) {
        return true;
      }
      // If not skipped, amount must be a number >= 0.01
      if (typeof value !== 'number' || value < 0.01) {
        throw new Error('Amount must be greater than 0 for non-skipped items');
      }
      return true;
    }),
  body('method')
    .optional()
    .custom((value, { req }) => {
      // If skipped, method must be 'skip'
      if (req.body.skipped === true) {
        if (value !== 'skip') {
          throw new Error('Method must be "skip" for skipped items');
        }
        return true;
      }
      // If not skipped, method must be upi or cash
      if (!['upi', 'cash'].includes(value)) {
        throw new Error('Method must be "upi" or "cash" for non-skipped items');
      }
      return true;
    }),
  body('recorded_by')
    .optional()
    .isUUID()
    .withMessage('Invalid recorded_by participant ID'),
  body('vendor_name')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Vendor name must be less than 100 characters'),
  validate
];

// Update session status validation
export const validateSessionStatus = [
  param('session_id')
    .isString()
    .isLength({ min: 6, max: 12 })
    .withMessage('Invalid session ID format'),
  body('status')
    .isIn(['open', 'active', 'shopping', 'completed', 'expired', 'cancelled'])
    .withMessage('Invalid session status'),
  validate
];
