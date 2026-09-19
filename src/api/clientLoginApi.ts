import { API_BASE_URL } from './usersApi';

/**
 * Client self-service login (SMS OTP) — POST /send_client_login_code +
 * POST /verify_client_login_code. Backend: modules/client_login.py.
 * Separate trust model from postLogin (username/password, staff): this is
 * phone-is-the-identity and may auto-provision a dbo.users/userCompanies
 * row with roleCode='pos' on first verification.
 */

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
  error?: string;
  userId?: number | string;
  companyId?: number | string;
  clientId?: number | string;
  roleCode?: string;
  roleName?: string;
  firstName?: string;
  lastName?: string;
  firstLoginCompleted?: boolean;
}

export interface SetClientPasswordResult {
  success: boolean;
  error?: string;
}

export interface VerifyClientPasswordResult {
  valid: boolean;
  error?: string;
  userId?: number | string;
  companyId?: number | string;
  clientId?: number | string;
  roleCode?: string;
  roleName?: string;
  firstName?: string;
  lastName?: string;
}

export const sendClientLoginCode = async (phone: string): Promise<SendClientLoginCodeResult> => {
  const response = await fetch(`${API_BASE_URL}/send_client_login_code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ clientLoginCodes: [{ phone }] }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`send_client_login_code failed (${response.status}): ${text}`);
  }
  return response.json();
};

export const verifyClientLoginCode = async (
  phone: string,
  code: string,
): Promise<VerifyClientLoginCodeResult> => {
  const response = await fetch(`${API_BASE_URL}/verify_client_login_code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ clientLoginCodes: [{ phone, code }] }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`verify_client_login_code failed (${response.status}): ${text}`);
  }
  return response.json();
};

export const setClientPassword = async (
  userId: number,
  password: string,
): Promise<SetClientPasswordResult> => {
  const response = await fetch(`${API_BASE_URL}/set_client_password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ setClientPassword: [{ userId, password }] }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`set_client_password failed (${response.status}): ${text}`);
  }
  return response.json();
};

export const verifyClientPassword = async (
  phone: string,
  password: string,
): Promise<VerifyClientPasswordResult> => {
  const response = await fetch(`${API_BASE_URL}/verify_client_password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ clientPasswordLogin: [{ phone, password }] }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`verify_client_password failed (${response.status}): ${text}`);
  }
  return response.json();
};
