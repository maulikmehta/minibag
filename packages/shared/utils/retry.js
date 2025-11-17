/**
 * Retry Utilities
 *
 * Provides exponential backoff retry logic for network requests
 * and other async operations that may fail temporarily.
 */

/**
 * Calculate exponential backoff delay
 * @param {number} attempt - Current attempt number (0-indexed)
 * @param {number} baseDelay - Base delay in milliseconds (default: 1000)
 * @param {number} maxDelay - Maximum delay in milliseconds (default: 30000)
 * @returns {number} Delay in milliseconds
 */
export function calculateBackoff(attempt, baseDelay = 1000, maxDelay = 30000) {
  // 2^attempt * baseDelay with jitter
  const exponentialDelay = Math.pow(2, attempt) * baseDelay;

  // Add random jitter (±25%) to avoid thundering herd problem
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
  const delayWithJitter = exponentialDelay + jitter;

  // Cap at maxDelay
  return Math.min(delayWithJitter, maxDelay);
}

/**
 * Sleep for a specified duration
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry an async operation with exponential backoff
 *
 * @param {Function} operation - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxAttempts - Maximum number of attempts (default: 3)
 * @param {number} options.baseDelay - Base delay in ms (default: 1000)
 * @param {number} options.maxDelay - Max delay in ms (default: 30000)
 * @param {Function} options.shouldRetry - Function to determine if error is retryable (default: always retry)
 * @param {Function} options.onRetry - Callback called before each retry (attempt, error, delay)
 * @returns {Promise<any>} Result of the operation
 * @throws {Error} Last error if all attempts fail
 *
 * @example
 * const result = await retryWithBackoff(
 *   () => fetch('/api/data'),
 *   {
 *     maxAttempts: 5,
 *     shouldRetry: (error) => error.status >= 500,
 *     onRetry: (attempt, error) => console.log(`Retry ${attempt}: ${error}`)
 *   }
 * );
 */
export async function retryWithBackoff(operation, options = {}) {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    shouldRetry = () => true,
    onRetry = null,
  } = options;

  let lastError;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      // Try the operation
      return await operation();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      const isLastAttempt = attempt === maxAttempts - 1;
      if (isLastAttempt || !shouldRetry(error)) {
        throw error;
      }

      // Calculate backoff delay
      const delay = calculateBackoff(attempt, baseDelay, maxDelay);

      // Log retry attempt
      console.warn(
        `[RETRY] Attempt ${attempt + 1}/${maxAttempts} failed: ${error.message}. Retrying after ${delay}ms`
      );

      // Call onRetry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, error, delay);
      }

      // Wait before retrying
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}

/**
 * Determines if an HTTP error is retryable
 * @param {Error|Response} error - Error or Response object
 * @returns {boolean} True if retryable
 */
export function isRetryableError(error) {
  // Network errors (fetch failures)
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  // Timeout errors
  if (error.name === 'AbortError' || error.message.includes('timeout')) {
    return true;
  }

  // HTTP status codes that are retryable
  if (error.status || error.statusCode) {
    const status = error.status || error.statusCode;

    // 408 Request Timeout
    // 429 Too Many Requests
    // 500+ Server Errors
    return status === 408 || status === 429 || status >= 500;
  }

  // Connection errors
  if (error.code) {
    const retryableCodes = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'EAI_AGAIN',
    ];
    return retryableCodes.includes(error.code);
  }

  return false;
}

/**
 * Retry wrapper specifically for fetch requests
 *
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options + retry options
 * @returns {Promise<Response>} Fetch response
 *
 * @example
 * const response = await retryFetch('/api/sessions', {
 *   method: 'POST',
 *   body: JSON.stringify(data),
 *   maxAttempts: 5,
 * });
 */
export async function retryFetch(url, options = {}) {
  const {
    maxAttempts,
    baseDelay,
    maxDelay,
    onRetry,
    ...fetchOptions
  } = options;

  return retryWithBackoff(
    async () => {
      const response = await fetch(url, fetchOptions);

      // Throw on HTTP errors to trigger retry
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.status = response.status;
        error.response = response;
        throw error;
      }

      return response;
    },
    {
      maxAttempts,
      baseDelay,
      maxDelay,
      shouldRetry: (error) => isRetryableError(error),
      onRetry,
    }
  );
}

export default {
  calculateBackoff,
  sleep,
  retryWithBackoff,
  retryFetch,
  isRetryableError,
};
