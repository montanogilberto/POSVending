import React from 'react';
import { ProductCategoryItem } from '../../hooks/useProductCategories';
import './CategoryChips.css';

interface CategoryChipsProps {
  categories: ProductCategoryItem[];
  /** Selected category or subcategory id; null = "Todas". */
  selectedId: number | null;
  onSelect: (categoryId: number | null) => void;
  /** Show the "Todas" chip (filters). The product wizard hides it: a category is required. */
  showAll?: boolean;
  /** Label of the chip that selects the open category itself in the subcategory row. */
  subAllLabel?: (categoryName: string) => string;
}

/**
 * Category filter used by the POS product list and Gestión de productos.
 * Row 1: Todas + top-level categories. Row 2 (only when the selected category
 * has subcategories): Todas <categoría> + its subcategories.
 */
const CategoryChips: React.FC<CategoryChipsProps> = ({
  categories, selectedId, onSelect, showAll = true, subAllLabel = (name) => `Todo ${name}`,
}) => {
  const top = categories.filter((c) => !c.parentCategoryId);
  if (top.length === 0) return null;

  const selected = categories.find((c) => c.categoryId === selectedId);
  // The top-level category that is "open": the selection itself or its parent.
  const openTopId = selected ? (selected.parentCategoryId ?? selected.categoryId) : null;
  const subs = openTopId === null ? [] : categories.filter((c) => c.parentCategoryId === openTopId);
  const openTop = top.find((c) => c.categoryId === openTopId);

  const chip = (id: number | null, label: string, active: boolean) => (
    <button
      key={id ?? 'all'}
      type="button"
      role="tab"
      aria-selected={active}
      className={`category-chip${active ? ' active' : ''}`}
      onClick={() => onSelect(id)}
    >
      {label}
    </button>
  );

  return (
    <div className="category-chips">
      <div className="category-chips-row" role="tablist" aria-label="Filtrar por categoría">
        {showAll && chip(null, 'Todas', selectedId === null)}
        {top.map((c) => chip(c.categoryId, c.name, c.categoryId === openTopId))}
      </div>
      {subs.length > 0 && openTop && (
        <div className="category-chips-row sub" role="tablist" aria-label={`Subcategorías de ${openTop.name}`}>
          {chip(openTop.categoryId, subAllLabel(openTop.name), selectedId === openTop.categoryId)}
          {subs.map((c) => chip(c.categoryId, c.name, c.categoryId === selectedId))}
        </div>
      )}
    </div>
  );
};

export default CategoryChips;
