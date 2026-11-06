import { STORAGE_KEY } from '../../contexts/UserContext';

/** companies has only `name`: these three still belong to one company. */
export const COMPANY_INFO = {
  rfc: 'XXX123456XXX',
  address: 'Codorniz 1B Gavilan, Musaro, Nuevo Hermosillo, CP. 83296',
  website: 'https://www.gmolavanderia.com'
} as const;

/** The logged-in company's companies.name, with the fixed details above. */
export const getReceiptCompany = () => {
  let name = '';
  try {
    name = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}').companyName || '';
  } catch {
    // No readable session (public receipt link): use the fallback name.
  }
  return { ...COMPANY_INFO, name: name || 'GMO' };
};
