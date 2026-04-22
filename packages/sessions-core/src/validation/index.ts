/**
 * Validation module - Zod schemas and validation helpers
 *
 * @example
 * ```typescript
 * import { validate, CreateSessionSchema } from '@sessions/core/validation';
 *
 * const validated = validate(CreateSessionSchema, req.body);
 * ```
 */

export * from './schemas';
export * from './middleware';
