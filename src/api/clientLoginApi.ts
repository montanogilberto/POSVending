import { API_BASE_URL } from './usersApi';

export interface SendClientLoginCodeResult {
  found: boolean;
  message?: string;
  error?: string;
  // true once this client finished password onboarding on a previous
  // login -- no SMS was sent this time, show the password field instead.
  firstLoginCompleted?: boolean;
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
  firstLoginCompleted?: boolean;
}

export interface SetClientPasswordResult {
  success: boolean;
  error?: string;
}

export interface VerifyClientPasswordResult {
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

/** POST /set_client_password — first-login onboarding: client sets a password. */
export const setClientPassword = async (
  userId: number | string,
  password: string,
): Promise<SetClientPasswordResult> => {
  console.log('[setClientPassword] userId=', userId);
  const res = await fetch(`${API_BASE_URL}/set_client_password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ setClientPassword: [{ userId, password }] }),
  });
  const data = await res.json();
  console.log('[setClientPassword] RESPONSE status=%d', res.status, data);
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
};

/** POST /verify_client_password — returning-client login: phone+password, no OTP. */
export const verifyClientPassword = async (
  phone: string,
  password: string,
): Promise<VerifyClientPasswordResult> => {
  console.log('[verifyClientPassword] phone=', phone);
  const res = await fetch(`${API_BASE_URL}/verify_client_password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientPasswordLogin: [{ phone, password }] }),
  });
  const data = await res.json();
  console.log('[verifyClientPassword] RESPONSE status=%d', res.status, data);
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
};
