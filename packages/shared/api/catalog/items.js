/**
 * Catalog API - Filters unified catalog by session type
 */

export async function getCatalogItems(db, options = {}) {
  const {
    session_type,
    category_id,
    search_query,
    popular_only,
    limit = 50
  } = options;

  if (!session_type) {
    throw new Error('session_type is required');
  }

  // Build query
  let itemsQuery = db.collection('catalog_items')
    .where('applicable_types', 'array-contains', session_type)
    .where('is_active', '==', true);

  if (category_id) {
    itemsQuery = itemsQuery.where('category_id', '==', category_id);
  }

  if (popular_only) {
    itemsQuery = itemsQuery.where('popular', '==', true);
  }

  const itemsSnapshot = await itemsQuery
    .orderBy('sort_order', 'asc')
    .limit(limit)
    .get();

  let items = itemsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // Client-side search
  if (search_query) {
    const query = search_query.toLowerCase();
    items = items.filter(item => 
      item.name.toLowerCase().includes(query) ||
      item.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  }

  // Get categories
  const categoriesSnapshot = await db.collection('catalog_categories')
    .where('applicable_types', 'array-contains', session_type)
    .where('is_active', '==', true)
    .orderBy('sort_order', 'asc')
    .get();

  const categories = categoriesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  return {
    success: true,
    session_type,
    items,
    categories,
    total_items: items.length,
    filters_applied: { category_id, search_query, popular_only }
  };
}

export async function getFeaturedItems(db, session_type, limit = 8) {
  return getCatalogItems(db, {
    session_type,
    popular_only: true,
    limit
  });
}

export async function searchCatalog(db, session_type, query) {
  return getCatalogItems(db, {
    session_type,
    search_query: query,
    limit: 20
  });
}
