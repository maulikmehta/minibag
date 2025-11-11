import { VALIDATION_LIMITS } from '../../../shared/constants/limits.js';

/**
 * Sanitize name input - remove invalid characters and normalize spaces
 * Allows only letters and spaces, removes numbers and special characters
 *
 * @param {string} value - Raw input value
 * @returns {string} - Cleaned value
 */
export const sanitizeName = (value) => {
  return value
    .replace(/[^a-zA-Z\s]/g, '') // Remove non-letter, non-space characters
    .replace(/\s+/g, ' ')         // Normalize multiple spaces to single space
    .substring(0, VALIDATION_LIMITS.MAX_NAME_LENGTH); // Enforce max length
};

/**
 * Validate name input and return error message if invalid
 *
 * @param {string} value - Name value to validate
 * @returns {string|null} - Error message or null if valid
 */
export const getNameValidationError = (value) => {
  const trimmed = value.trim();

  if (!trimmed) {
    return 'Name is required';
  }

  if (trimmed.length < VALIDATION_LIMITS.MIN_NAME_LENGTH) {
    return `Name must be at least ${VALIDATION_LIMITS.MIN_NAME_LENGTH} character`;
  }

  if (trimmed.length > VALIDATION_LIMITS.MAX_NAME_LENGTH) {
    return `Name must be less than ${VALIDATION_LIMITS.MAX_NAME_LENGTH} characters`;
  }

  if (!/^[a-zA-Z\s]+$/.test(trimmed)) {
    return 'Name can only contain letters and spaces';
  }

  return null; // Valid - no error
};

/**
 * Check if name is valid (boolean check)
 *
 * @param {string} value - Name value to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const isNameValid = (value) => {
  return getNameValidationError(value) === null;
};
