/**
 * UNIFIED CATALOG - Single source for all LocalLoops products
 */

export const unifiedCatalogSchema = {
  item_id: "string",
  name: "string",
  category_id: "string",
  
  // Visual (images prioritized)
  thumbnail_url: "string",
  thumbnail_small: "string",
  thumbnail_large: "string",
  emoji: "string",
  alt_text: "string",
  
  // Pricing
  unit: "string",
  base_price: "number",
  bulk_price: "number",
  
  // Applicability - KEY FIELD
  applicable_types: ["string"],
  
  // Metadata
  tags: ["string"],
  popular: "boolean",
  seasonal: "boolean",
  
  bulk_threshold: "number",
  max_quantity: "number",
  
  image_credits: "string",
  last_image_update: "timestamp",
  
  created_at: "timestamp",
  is_active: "boolean",
  sort_order: "number"
};
