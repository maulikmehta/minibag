/**
 * useCatalog Hook
 * Fetches and manages catalog data (categories and items)
 * Uses emoji-only display for performance (no image loading)
 */

import { useState, useEffect } from 'react';
import { getCategories, getItems } from '../services/api.js';
import { getItemEmoji, getCategoryEmoji } from '../utils/emojiMap';

/**
 * Hook to fetch catalog categories
 */
export function useCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function fetchCategories() {
      try {
        console.log('[useCatalog] Fetching categories...');
        setLoading(true);
        setError(null);
        const data = await getCategories();

        if (mounted) {
          setCategories(data);
          console.log('[useCatalog] Categories loaded:', data.length);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message);
          console.error('[useCatalog] Failed to fetch categories:', err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchCategories();

    return () => {
      console.log('[useCatalog] Cleaning up categories hook');
      mounted = false;
    };
  }, []);

  return { categories, loading, error };
}

/**
 * Hook to fetch catalog items
 * @param {string} categoryId - Optional category filter
 */
export function useItems(categoryId = null) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function fetchItems() {
      try {
        console.log('[useCatalog] Fetching items for category:', categoryId);
        setLoading(true);
        setError(null);
        const data = await getItems(categoryId);

        if (mounted) {
          setItems(data);
          console.log('[useCatalog] Items loaded:', data.length);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message);
          console.error('[useCatalog] Failed to fetch items:', err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchItems();

    return () => {
      console.log('[useCatalog] Cleaning up items hook for category:', categoryId);
      mounted = false;
    };
  }, [categoryId]);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getItems(categoryId);
      setItems(data);
    } catch (err) {
      setError(err.message);
      console.error('Failed to refetch items:', err);
    } finally {
      setLoading(false);
    }
  };

  return { items, loading, error, refetch };
}

/**
 * Combined hook for full catalog (categories + items)
 */
export function useCatalog() {
  const { categories: rawCategories, loading: categoriesLoading, error: categoriesError } = useCategories();
  const { items: rawItems, loading: itemsLoading, error: itemsError, refetch } = useItems();

  const loading = categoriesLoading || itemsLoading;
  const error = categoriesError || itemsError;

  // Create a mapping of UUID -> category_id string
  const categoryIdMap = {};
  rawCategories.forEach(cat => {
    categoryIdMap[cat.id] = cat.category_id || cat.id;
  });

  // Format data for UI compatibility
  const formattedCategories = rawCategories.map(cat => ({
    id: cat.id, // Use UUID as id for filtering
    category_id: cat.category_id, // Keep string id
    name: cat.name,
    emoji: cat.icon || cat.emoji || '📦',
    color: getCategoryColor(cat.color || cat.name)
  }));

  // Map items to use category_id string instead of UUID
  // Use emoji-only display for performance (no image loading)
  const formattedItems = rawItems.map(item => {
    const categoryString = categoryIdMap[item.category_id] || item.category_id;
    return {
      id: item.item_id || item.id,
      name: item.name,
      name_gu: item.name_gu || item.name,
      name_hi: item.name_hi || item.name,
      emoji: getItemEmoji(item.name, categoryString, item.emoji),
      category: categoryString, // Map UUID to string
      category_id: item.category_id, // Keep original UUID for filtering
      price_per_kg: item.price_per_kg || 0
    };
  });

  return {
    categories: formattedCategories,
    items: formattedItems,
    loading,
    error,
    refetch
  };
}

/**
 * Format catalog data to match the existing UI structure
 * This transforms API data to the format expected by the prototype
 * Uses emoji-only display for performance
 */
export function formatCatalogForUI(categories, items) {
  // Transform categories to match UI format
  const formattedCategories = categories.map(cat => ({
    id: cat.id,
    name: cat.name,
    emoji: cat.icon || getCategoryEmoji(cat.name),
    color: getCategoryColor(cat.color || cat.name)
  }));

  // Transform items to match UI format with emoji only
  const formattedItems = items.map(item => {
    const categoryId = item.category_id || item.category?.id;
    return {
      id: item.id || item.item_id,
      name: item.name,
      name_gu: item.name_gu || item.name,
      name_hi: item.name_hi || item.name,
      emoji: getItemEmoji(item.name, categoryId, item.emoji),
      category: categoryId,
      price_per_kg: item.price_per_kg || 0
    };
  });

  return { categories: formattedCategories, items: formattedItems };
}

/**
 * Get category color based on name
 */
function getCategoryColor(colorOrName) {
  const colorMap = {
    'veggies': 'bg-green-100',
    'vegetables': 'bg-green-100',
    'staples': 'bg-yellow-100',
    'grains': 'bg-yellow-100',
    'dairy': 'bg-blue-100',
    'milk': 'bg-blue-100',
    'green': 'bg-green-100',
    'yellow': 'bg-yellow-100',
    'blue': 'bg-blue-100',
  };

  return colorMap[colorOrName?.toLowerCase()] || 'bg-gray-100';
}

export default useCatalog;
