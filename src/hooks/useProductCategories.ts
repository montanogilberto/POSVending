import { useCallback, useEffect, useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { fetchCategoriesByCompany } from '../utils/apiUtils';

/** A product category of the logged-in company. parentCategoryId null = top level. */
export interface ProductCategoryItem {
  categoryId: number;
  name: string;
  image?: string;
  parentCategoryId: number | null;
}

interface RawCategory {
  categoryId?: number;
  productCategoryId?: number;
  name?: string;
  image?: string;
  parentCategoryId?: number | null;
}

/**
 * Categories of the logged-in company, shared by the POS product list and
 * Gestión de productos so both filter the same way. `reload` after creating or
 * renaming a category.
 */
export function useProductCategories() {
  const { companyId } = useUser();
  const [categories, setCategories] = useState<ProductCategoryItem[]>([]);

  const reload = useCallback(async () => {
    if (!Number(companyId)) return;
    try {
      const list: RawCategory[] = await fetchCategoriesByCompany(companyId);
      setCategories(list.map((c) => ({
        categoryId: Number(c.categoryId ?? c.productCategoryId ?? 0),
        name: c.name ?? '',
        image: c.image,
        parentCategoryId: c.parentCategoryId ?? null,
      })));
    } catch (err) {
      console.error('[useProductCategories] load failed', err);
    }
  }, [companyId]);

  useEffect(() => { reload(); }, [reload]);

  return { categories, reload };
}

/**
 * Category ids a product may have to match `selectedId`: the category itself plus
 * its subcategories. null = no category filter.
 */
export function categoryIdsFor(selectedId: number | null, categories: ProductCategoryItem[]): Set<number> | null {
  if (selectedId === null) return null;
  return new Set<number>([
    selectedId,
    ...categories.filter((c) => c.parentCategoryId === selectedId).map((c) => c.categoryId),
  ]);
}
