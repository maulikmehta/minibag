/**
 * Validation middleware and helpers for Zod schema validation
 * Provides clean error handling and ApiResponse integration
 */

import { z } from 'zod';
import type { ApiResponse } from '../sessions/types';

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate input against a Zod schema
 * Throws ValidationError with formatted messages if validation fails
 *
 * @param schema - Zod schema to validate against
 * @param input - Unknown input to validate
 * @returns Validated and typed data
 * @throws ValidationError if validation fails
 *
 * @example
 * ```typescript
 * const validated = validate(CreateSessionSchema, req.body);
 * // validated is now typed as CreateSessionInput
 * ```
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  input: unknown
): T {
  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`);
      throw new ValidationError(messages.join(', '));
    }
    throw error;
  }
}

/**
 * Async validation wrapper
 * Use when schema has async refinements
 *
 * @param schema - Zod schema to validate against
 * @param input - Unknown input to validate
 * @returns Promise of validated and typed data
 * @throws ValidationError if validation fails
 */
export async function validateAsync<T>(
  schema: z.ZodSchema<T>,
  input: unknown
): Promise<T> {
  try {
    return await schema.parseAsync(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`);
      throw new ValidationError(messages.join(', '));
    }
    throw error;
  }
}

/**
 * Safe validate - returns ApiResponse instead of throwing
 * Useful for functions that already return ApiResponse pattern
 *
 * @param schema - Zod schema to validate against
 * @param input - Unknown input to validate
 * @returns ApiResponse with validated data or error
 *
 * @example
 * ```typescript
 * const result = safeValidate(CreateSessionSchema, req.body);
 * if (result.error) {
 *   return { data: null, error: result.error };
 * }
 * // result.data is typed as CreateSessionInput
 * ```
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  input: unknown
): ApiResponse<T> {
  try {
    const data = schema.parse(input);
    return { data, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`);
      return { data: null, error: new ValidationError(messages.join(', ')) };
    }
    return { data: null, error: error as Error };
  }
}

/**
 * Safe async validate
 * Combines safeValidate with async support
 *
 * @param schema - Zod schema to validate against
 * @param input - Unknown input to validate
 * @returns Promise of ApiResponse with validated data or error
 */
export async function safeValidateAsync<T>(
  schema: z.ZodSchema<T>,
  input: unknown
): Promise<ApiResponse<T>> {
  try {
    const data = await schema.parseAsync(input);
    return { data, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`);
      return { data: null, error: new ValidationError(messages.join(', ')) };
    }
    return { data: null, error: error as Error };
  }
}

/**
 * Format Zod error into human-readable message
 *
 * @param error - Zod error to format
 * @returns Formatted error message
 */
export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((e: z.ZodIssue) => {
      const path = e.path.length > 0 ? `${e.path.join('.')}: ` : '';
      return `${path}${e.message}`;
    })
    .join(', ');
}

/**
 * Check if error is a ValidationError
 *
 * @param error - Error to check
 * @returns True if error is ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}
