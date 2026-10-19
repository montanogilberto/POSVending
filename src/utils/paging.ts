/** Client-side paging for list screens (see components/ui/Pager.tsx). */
export interface Page<T> {
  items: T[];
  page: number;
  pageCount: number;
  /** 1-based positions of the first/last item shown; 0 when empty. */
  from: number;
  to: number;
  total: number;
}

/** One page of `items`; an out-of-range page is clamped. */
export const paginate = <T>(items: T[], page: number, size: number): Page<T> => {
  const pageCount = Math.max(Math.ceil(items.length / size), 1);
  const current = Math.min(Math.max(page, 1), pageCount);
  const start = (current - 1) * size;
  const slice = items.slice(start, start + size);
  return {
    items: slice, page: current, pageCount, total: items.length,
    from: slice.length ? start + 1 : 0, to: start + slice.length,
  };
};

/** Page buttons to draw: first, last, current ±1, with '…' for the gaps. */
export const pageWindow = (page: number, pageCount: number): (number | '…')[] => {
  const wanted = [...new Set([1, page - 1, page, page + 1, pageCount])]
    .filter(p => p >= 1 && p <= pageCount).sort((a, b) => a - b);
  return wanted.flatMap((p, i) => (i > 0 && p - wanted[i - 1] > 1 ? ['…' as const, p] : [p]));
};
