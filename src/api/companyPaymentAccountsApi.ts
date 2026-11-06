import { API_BASE_URL } from '../utils/appEnv';

/** Cuentas que reciben dinero de la compañía. Sólo admin o gerente de esa compañía. */
export interface CompanyPaymentAccount {
  companyPaymentAccountId: number;
  accountType: string;
  accountStatus: string;
  holderName: string;
  stripeConnectedAccountId?: string;
  clabe?: string;
  bankName?: string;
  commissionTerminalId?: number;
  chargesEnabled: boolean;
  createdByUserId: number;
  verifiedByUserId?: number;
}

const post = async (path: string, row: Record<string, unknown>) => {
  const res = await fetch(`${API_BASE_URL}/companyPaymentAccounts${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyPaymentAccounts: [row] }),
  });
  const data = await res.json().catch(() => ({}));
  console.log('[companyPaymentAccounts]', path, res.status, data.error ?? 'ok');
  if (!res.ok || data.error) throw new Error(data.error ?? data.detail ?? 'error');
  return data;
};

export const listCompanyPaymentAccounts = async (companyId: number): Promise<CompanyPaymentAccount[]> =>
  (await post('/list', { action: 5, companyId })).companyPaymentAccounts ?? [];

export const getCompanyStripeLink = async (
  companyId: number, userId: number, returnUrl: string, replaceActive = false,
): Promise<string> =>
  (await post('/stripe/onboarding-link', { action: 1, companyId, createdByUserId: userId, returnUrl, replaceActive })).url;

export const addCompanyTransferAccount = async (
  companyId: number, userId: number, holderName: string, clabe: string, commissionTerminalId: number,
): Promise<void> => {
  await post('/transfer-account', {
    action: 6, companyId, createdByUserId: userId, holderName, clabe, commissionTerminalId,
  });
};

export const confirmCompanyPaymentAccount = async (
  companyId: number, companyPaymentAccountId: number, userId: number,
): Promise<void> => {
  await post('/confirm', { action: 3, companyId, companyPaymentAccountId, verifiedByUserId: userId });
};
