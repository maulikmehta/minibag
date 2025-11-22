/**
 * Input Sanitization Utilities
 * Prevents XSS attacks and other injection vulnerabilities
 * SECURITY: Sanitize all user-provided text inputs before storing in database
 */

/**
 * HTML entity encoding map for XSS prevention
 */
const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;'
};

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} - Escaped string
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') {
    return str;
  }
  return str.replace(/[&<>"'\/]/g, (char) => HTML_ENTITIES[char]);
}

/**
 * Sanitize vendor name input
 * - Trims whitespace
 * - Escapes HTML entities
 * - Limits length
 * - Removes control characters
 * @param {string|null} vendorName - Vendor name to sanitize
 * @param {number} maxLength - Maximum allowed length (default: 100)
 * @returns {string|null} - Sanitized vendor name or null
 */
export function sanitizeVendorName(vendorName, maxLength = 100) {
  // Return null for null/undefined inputs
  if (vendorName === null || vendorName === undefined) {
    return null;
  }

  // Convert to string and trim
  let sanitized = String(vendorName).trim();

  // Return null for empty strings
  if (sanitized.length === 0) {
    return null;
  }

  // Remove control characters (ASCII 0-31 and 127)
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

  // Escape HTML entities to prevent XSS
  sanitized = escapeHtml(sanitized);

  // Enforce maximum length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Sanitize general text input
 * - Trims whitespace
 * - Escapes HTML entities
 * - Removes control characters
 * @param {string|null} text - Text to sanitize
 * @param {number} maxLength - Maximum allowed length (optional)
 * @returns {string|null} - Sanitized text or null
 */
export function sanitizeText(text, maxLength = null) {
  if (text === null || text === undefined) {
    return null;
  }

  let sanitized = String(text).trim();

  if (sanitized.length === 0) {
    return null;
  }

  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

  // Escape HTML entities
  sanitized = escapeHtml(sanitized);

  // Enforce maximum length if specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Validate and sanitize email address
 * @param {string} email - Email address to validate
 * @returns {string|null} - Sanitized email or null if invalid
 */
export function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') {
    return null;
  }

  const sanitized = email.trim().toLowerCase();

  // Basic email validation regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(sanitized) || sanitized.length > 254) {
    return null;
  }

  return sanitized;
}

/**
 * Validate and sanitize phone number
 * Accepts formats: +1234567890, 1234567890, (123) 456-7890
 * @param {string} phone - Phone number to sanitize
 * @returns {string|null} - Sanitized phone (digits only) or null if invalid
 */
export function sanitizePhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return null;
  }

  // Remove all non-digit characters except +
  const digitsOnly = phone.replace(/[^\d+]/g, '');

  // Validate length (10-15 digits is typical)
  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    return null;
  }

  return digitsOnly;
}

/**
 * Sanitize numeric input
 * @param {any} value - Value to sanitize
 * @param {Object} options - Validation options {min, max, integer}
 * @returns {number|null} - Sanitized number or null if invalid
 */
export function sanitizeNumber(value, options = {}) {
  const num = parseFloat(value);

  if (isNaN(num) || !isFinite(num)) {
    return null;
  }

  if (options.integer && !Number.isInteger(num)) {
    return null;
  }

  if (options.min !== undefined && num < options.min) {
    return null;
  }

  if (options.max !== undefined && num > options.max) {
    return null;
  }

  return num;
}
