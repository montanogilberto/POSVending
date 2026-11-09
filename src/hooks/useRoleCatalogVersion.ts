import { useEffect, useState } from 'react';
import { ROLE_CATALOG_CHANGED_EVENT } from '../config/rolePermissions';

/** Re-renders the caller whenever ROLE_UI changes, so canAccess() checks in an
 * already-mounted menu pick up the fetched catalog or a role saved in /setting. */
export function useRoleCatalogVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion(v => v + 1);
    window.addEventListener(ROLE_CATALOG_CHANGED_EVENT, bump);
    return () => window.removeEventListener(ROLE_CATALOG_CHANGED_EVENT, bump);
  }, []);
  return version;
}
