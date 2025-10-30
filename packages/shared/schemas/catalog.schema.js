/**
 * Catalog Schema - Shared across all session types
 */

export const itemSchema = {
  item_id: "string",
  name: "string",
  category_id: "string",
  
  // Display
  thumbnail_url: "string",
  emoji: "string",
  
  // Attributes
  unit: "string",
  base_price: "number",
  bulk_price: "number",
  
  // Metadata
  tags: ["string"],
  popular: "boolean",
  seasonal: "boolean",
  
  // Session type relevance
  applicable_types: ["string"],
  
  // Extensibility
  custom_fields: "object",
  
  created_at: "timestamp",
  is_active: "boolean"
};

export const categorySchema = {
  category_id: "string",
  name: "string",
  parent_id: "string",
  icon: "string",
  sort_order: "number",
  
  applicable_types: ["string"],
  
  color: "string",
  is_active: "boolean"
};
