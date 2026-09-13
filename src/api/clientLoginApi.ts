import { API_BASE_URL } from './usersApi';

export interface SendClientLoginCodeResult {
  found: boolean;
  message?: string;
  error?: string;
}

export interface VerifyClientLoginCodeResult {
  valid: boolean;
  userId?: number | string;
  companyId?: number | string;
  clientId?: number | string;
  roleCode?: string;
  roleName?: string;
  firstName?: string;
  lastName?: string;
  error?: string;
}

/** POST /send_client_login_code — sends a 6-digit SMS OTP to a registered POS client. */
export const sendClientLoginCode = async (phone: string): Promise<SendClientLoginCodeResult> => {
  console.log('[sendClientLoginCode] phone=', phone);
  const res = await fetch(`${API_BASE_URL}/send_client_login_code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientLoginCodes: [{ phone }] }),
  });
  const data = await res.json();
  console.log('[sendClientLoginCode] RESPONSE status=%d', res.status, data);
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
};

/** POST /verify_client_login_code — validates the OTP and returns the login payload. */
export const verifyClientLoginCode = async (phone: string, code: string): Promise<VerifyClientLoginCodeResult> => {
  console.log('[verifyClientLoginCode] phone=%s code=%s', phone, code);
  const res = await fetch(`${API_BASE_URL}/verify_client_login_code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientLoginCodes: [{ phone, code }] }),
  });
  const data = await res.json();
  console.log('[verifyClientLoginCode] RESPONSE status=%d', res.status, data);
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
};
