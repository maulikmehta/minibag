/**
 * Catalog API Routes
 * Endpoints for browsing vegetables, fruits, dairy, staples
 */

import { supabase } from '../db/supabase.js';

/**
 * GET /api/catalog/categories
 * Get all active categories for Minibag
 */
export async function getCategories(req, res) {
  try {
    const { data, error } = await supabase
      .from('catalog_categories')
      .select('*')
      .contains('applicable_types', ['minibag'])
      .eq('is_active', true)
      .order('sort_order');

    if (error) throw error;

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/catalog/items
 * Get all active items for Minibag
 * Query params: category_id (optional)
 */
export async function getItems(req, res) {
  try {
    const { category_id } = req.query;

    let query = supabase
      .from('catalog_items')
      .select(`
        *,
        category:catalog_categories(id, name, icon, color)
      `)
      .contains('applicable_types', ['minibag'])
      .eq('is_active', true)
      .order('sort_order');

    // Filter by category if provided
    if (category_id) {
      query = query.eq('category_id', category_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/catalog/items/:item_id
 * Get specific item details
 */
export async function getItem(req, res) {
  try {
    const { item_id } = req.params;

    const { data, error } = await supabase
      .from('catalog_items')
      .select(`
        *,
        category:catalog_categories(id, name, icon, color)
      `)
      .eq('item_id', item_id)
      .eq('is_active', true)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/catalog/popular
 * Get popular items (for quick add)
 */
export async function getPopularItems(req, res) {
  try {
    const { data, error } = await supabase
      .from('catalog_items')
      .select(`
        *,
        category:catalog_categories(id, name, icon, color)
      `)
      .contains('applicable_types', ['minibag'])
      .eq('is_active', true)
      .eq('popular', true)
      .order('sort_order')
      .limit(10);

    if (error) throw error;

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Error fetching popular items:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
