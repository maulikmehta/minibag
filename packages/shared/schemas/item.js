/**
 * Item Validation Schemas
 * Zod schemas for validating item and catalog data at API boundaries
 */

import { z } from 'zod';

/**
 * Catalog item schema (from database)
 */
export const CatalogItemSchema = z.object({
  id: z.string().uuid(),
  item_id: z.string(), // Human-readable ID like 'v001'
  name_en: z.string().min(1),
  name_hi: z.string().optional().nullable(),
  category: z.string(),
  icon: z.string().optional().nullable(),
  unit: z.string().default('kg'),
  typical_quantity: z.number().positive().optional().nullable(),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true)
});

/**
 * Participant item schema (items selected by participant)
 */
export const ParticipantItemSchema = z.object({
  id: z.string().uuid(),
  participant_id: z.string().uuid(),
  item_id: z.string().uuid(), // References catalog_items.id
  quantity: z.number().positive(),
  unit: z.string().optional().nullable(),
  created_at: z.string().datetime(),
  // Joined catalog item data
  catalog_item: CatalogItemSchema.optional().nullable()
});

/**
 * Schema for adding/updating items
 */
export const ItemInputSchema = z.object({
  item_id: z.string(),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().optional()
});

/**
 * Schema for item list (array of items)
 */
export const ItemListSchema = z.array(ItemInputSchema);

/**
 * Frontend item format (transformed map)
 */
export const FrontendItemMapSchema = z.record(
  z.string(), // item_id
  z.number().positive() // quantity
);

/**
 * Payment item schema
 */
export const PaymentItemSchema = z.object({
  item_id: z.string(),
  quantity: z.number().positive(),
  price_per_unit: z.number().nonnegative(),
  total_price: z.number().nonnegative()
});

/**
 * Payment schema
 */
export const PaymentSchema = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  item_id: z.string(), // Human-readable ID
  quantity: z.number().positive(),
  price_per_unit: z.number().nonnegative(),
  total_price: z.number().nonnegative(),
  paid_by: z.string().uuid(), // Participant ID
  created_at: z.string().datetime()
});

/**
 * Schema for recording a payment
 */
export const RecordPaymentSchema = z.object({
  item_id: z.string().min(1, 'Item ID is required'),
  quantity: z.number().positive('Quantity must be positive'),
  price_per_unit: z.number().nonnegative('Price must be non-negative'),
  total_price: z.number().nonnegative('Total price must be non-negative')
});

export default CatalogItemSchema;
