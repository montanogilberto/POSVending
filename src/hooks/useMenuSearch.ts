import { useCallback, useEffect, useRef, useState } from 'react';

const HIDDEN = 'menu-search-hidden';
const COLLAPSED = 'menu-section-collapsed';
const COLLAPSED_KEY = 'menuCollapsedSections';

const readCollapsed = (): string[] => {
  try {
    const raw = localStorage.getItem(COLLAPSED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

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
 * section headers (MenuSectionDivider, data-section) and <IonMenuToggle>
 * wrapping an <IonItem title>.
 *
 * Sections are also collapsible (MenuSectionDivider → toggleSection): a divider
 * carries data-section="<title>", and the entries after it get
 * `menu-section-collapsed` while that title is collapsed. The choice is
 * remembered per browser. While searching, collapsing is ignored so a match is
 * never hidden. A section left with no entry (role-gated) hides its divider.
 */
export const useMenuSearch = () => {
  const listRef = useRef<HTMLIonListElement>(null);
  const [query, setQuery] = useState('');
  const [matchCount, setMatchCount] = useState(0);
  const [collapsed, setCollapsed] = useState<string[]>(readCollapsed);

  const toggleSection = useCallback((section: string) => {
    setCollapsed(prev => {
      const next = prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section];
      try { localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next)); } catch { /* private mode: not remembered */ }
      return next;
    });
  }, []);
  const isCollapsed = useCallback((section: string) => collapsed.includes(section), [collapsed]);

  const apply = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const q = normalize(query);
    let matches = 0;
    let divider: Element | null = null;
    let dividerHasItems = false;
    let dividerHasMatch = false;
    let sectionCollapsed = false;

    const closeSection = () => {
      if (divider) divider.classList.toggle(HIDDEN, !dividerHasItems || (!!q && !dividerHasMatch));
    };

    for (const el of Array.from(list.children)) {
      // Section header (MenuSectionDivider) — or a plain IonItemDivider.
      if (el.hasAttribute('data-section') || el.tagName.toLowerCase() === 'ion-item-divider') {
        closeSection();
        divider = el;
        dividerHasItems = false;
        dividerHasMatch = false;
        const section = el.getAttribute('data-section');
        sectionCollapsed = !q && !!section && collapsed.includes(section);
        continue;
      }
      const item = el.querySelector('ion-item');
      if (!item) continue; // role-gated toggle that rendered nothing
      dividerHasItems = true;
      const visible = !q || normalize(item.getAttribute('title') ?? item.textContent ?? '').includes(q);
      el.classList.toggle(HIDDEN, !visible);
      el.classList.toggle(COLLAPSED, visible && sectionCollapsed);
      if (visible) {
        matches += 1;
        dividerHasMatch = true;
      }
    }
    closeSection();
    setMatchCount(matches);
  }, [query, collapsed]);

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

  return {
    listRef, query, setQuery, clear, matchCount, openFirstMatch, searching: query.trim() !== '',
    isCollapsed, toggleSection,
  };
};
