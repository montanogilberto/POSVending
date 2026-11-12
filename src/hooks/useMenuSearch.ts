import { useCallback, useEffect, useRef, useState } from 'react';

const HIDDEN = 'menu-search-hidden';

/** Lowercase, accent-free: "categorias" finds "Categorías". */
const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/**
 * Azure-Portal-style filter for the side menu: hides every menu entry whose
 * `title` doesn't match the query, and every section divider left without a
 * visible entry. Works on the rendered list so the ~35 hand-written,
 * role-gated menu items don't each need their own filter condition.
 *
 * Attach `listRef` to the menu's <IonList>; its direct children must be
 * <IonItemDivider> (sections) and <IonMenuToggle> wrapping an <IonItem title>.
 */
export const useMenuSearch = () => {
  const listRef = useRef<HTMLIonListElement>(null);
  const [query, setQuery] = useState('');
  const [matchCount, setMatchCount] = useState(0);

  const apply = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const q = normalize(query);
    let matches = 0;
    let divider: Element | null = null;
    let dividerHasMatch = false;

    const closeSection = () => {
      if (divider) divider.classList.toggle(HIDDEN, !!q && !dividerHasMatch);
    };

    for (const el of Array.from(list.children)) {
      const tag = el.tagName.toLowerCase();
      if (tag === 'ion-item-divider') {
        closeSection();
        divider = el;
        dividerHasMatch = false;
        continue;
      }
      const item = el.querySelector('ion-item');
      if (!item) continue; // role-gated toggle that rendered nothing
      const visible = !q || normalize(item.getAttribute('title') ?? item.textContent ?? '').includes(q);
      el.classList.toggle(HIDDEN, !visible);
      if (visible) {
        matches += 1;
        dividerHasMatch = true;
      }
    }
    closeSection();
    setMatchCount(matches);
  }, [query]);

  useEffect(() => {
    apply();
    const list = listRef.current;
    if (!list) return;
    // Items appear/disappear as the role catalog or active product changes.
    const observer = new MutationObserver(apply);
    observer.observe(list, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [apply]);

  /** Enter: open the first visible result, like the Azure Portal menu search. */
  const openFirstMatch = useCallback(() => {
    const first = listRef.current?.querySelector<HTMLIonItemElement>(
      `ion-menu-toggle:not(.${HIDDEN}) ion-item`,
    );
    first?.click();
  }, []);

  const clear = useCallback(() => setQuery(''), []);

  return { listRef, query, setQuery, clear, matchCount, openFirstMatch, searching: query.trim() !== '' };
};
