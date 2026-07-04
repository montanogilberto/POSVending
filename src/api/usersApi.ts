export const API_BASE_URL = 'https://smartloansbackend.azurewebsites.net';

/** Azure blob container for user profile photos (filename in `image`, full URL in `imageUrl`). */
export const PROFILE_IMAGE_BASE_URL =
  'https://imageprofile.blob.core.windows.net/profile/';

/** Row shape returned by POST /one_users (matches dbo.users). */
export interface ApiUser {
  userId: number;
  name: string;
  email?: string | null;
  password?: string;
  created_at?: string;
  active?: string | number;
  image?: string | null;
  imageUrl?: string | null;
  qrCode?: string;
  qrImageUrl?: string;
}

export interface LoginResult {
  userId?: string | number;
  companyId?: string | number;
  branchId?: string | number;
  clientId?: string | number;
  roleCode?: string;
  roleName?: string;
  msg?: string;
  error?: string;
}

export interface LoginResponse {
  result?: LoginResult[];
}

export interface GetOneUserRequest {
  users: Array<{ userId: number | string }>;
}

export interface GetOneUserResponse {
  users: ApiUser[];
}

export interface UserProfileSummary {
  userId: number;
  name: string;
  avatarUrl: string | null;
}

export const parseUserId = (raw: string | number | undefined | null): number => {
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : 0;
};

/** Prefer imageUrl; build blob URL from filename in image; ignore qrImageUrl (QR, not avatar). */
export const pickProfileImageUrl = (user: Partial<ApiUser> | null | undefined): string | null => {
  if (!user) return null;

  const imageUrl = user.imageUrl?.trim();
  if (imageUrl) {
    return imageUrl;
  }

  const image = user.image?.trim();
  if (!image) return null;

  if (
    image.startsWith('http://') ||
    image.startsWith('https://') ||
    image.startsWith('data:') ||
    image.startsWith('blob:')
  ) {
    return image;
  }

  const filename = image.replace(/^\//, '');
  return `${PROFILE_IMAGE_BASE_URL}${filename}`;
};

export interface CreateUserPayload {
  email?: string;
  cellphone?: string; // stored in dbo.users.cellphone — used to link to clients table
  name: string;       // SP column is `name` (display name / username)
  password: string;
  appProfile?: string;
  enabledModules?: string[];
  roleCode?: string;
  companyId?: number;
  branchId?: number;
}

export interface UserSaveResponse {
  userId?: number | string;
  id?: number | string;
  message?: string;
  msg?: string;
  error?: string;
  [key: string]: unknown;
}

/** POST /users  action=1 → create user, returns { userId } */
export const createUser = async (payload: CreateUserPayload): Promise<UserSaveResponse> => {
  const body = { users: [{ user_id: 0, action: 1, ...payload }] };
  console.log('[createUser] REQUEST →', body);
  const res = await fetch(`${API_BASE_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  console.log('[createUser] RESPONSE status=%d', res.status, data);
  if (!res.ok) throw new Error(data.msg || data.error || `Error ${res.status}`);
  return data;
};

/** POST /users  action=2 → update existing user fields */
export const updateUser = async (userId: number, payload: Partial<CreateUserPayload>): Promise<UserSaveResponse> => {
  const body = { users: [{ user_id: userId, action: 2, ...payload }] };
  console.log('[updateUser] REQUEST userId=%d →', userId, body);
  const res = await fetch(`${API_BASE_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  console.log('[updateUser] RESPONSE status=%d', res.status, data);
  if (!res.ok) throw new Error(data.msg || data.error || `Error ${res.status}`);
  return data;
};

export interface ContactCheckResult {
  found: boolean;
  clientId?: number;
  firstName?: string;
  lastName?: string;
  cellphone?: string;
  email?: string;
  companyId?: number;
  userId?: number;
  userName?: string;
  hasAccount?: number;        // 1 or 0 (integer from SQL — check with === 1)
  completionPct?: number;     // 0–100
  stepsCompleted?: number;    // 0–6
  stepGeneralInfo?: number;
  stepQr?: number;
  stepBiometric?: number;
  stepContract?: number;
  stepPagare?: number;
}

/** POST /check_contact — looks up a phone or email in clients + users tables */
export const checkContact = async (contact: string): Promise<ContactCheckResult> => {
  console.log('[checkContact] contact=', contact);
  const res = await fetch(`${API_BASE_URL}/check_contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contact }),
  });
  const data = await res.json();
  console.log('[checkContact] RESPONSE status=%d', res.status, data);
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
};

/** POST /send_verification_code — sends 6-digit OTP via email, sms, or whatsapp */
export const sendVerificationCode = async (
  target: string,
  method: 'email' | 'sms' | 'whatsapp' = 'email',
): Promise<void> => {
  console.log('[sendVerificationCode] method=%s target=%s', method, target);
  const res = await fetch(`${API_BASE_URL}/send_verification_code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target, method }),
  });
  const data = await res.json();
  console.log('[sendVerificationCode] RESPONSE status=%d', res.status, data);
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
};

/** POST /verify_code — validates OTP, returns { valid: boolean } */
export const verifyCode = async (target: string, code: string): Promise<boolean> => {
  console.log('[verifyCode] target=%s code=%s', target, code);
  const res = await fetch(`${API_BASE_URL}/verify_code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target, code }),
  });
  const data = await res.json();
  console.log('[verifyCode] RESPONSE status=%d', res.status, data);
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data.valid === true;
};

/**
 * POST /login — returns userId on success (msg e.g. "User Valid").
 * Note: backend route is lowercase `/login` (not `/Login`).
 */
export const postLogin = async (
  username: string,
  password: string,
): Promise<LoginResult | null> => {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ logins: [{ username, password }] }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`login failed (${response.status}): ${text}`);
  }

  const data: LoginResponse = await response.json();
  return data.result?.[0] ?? null;
};

/**
 * Fetch one user by id — POST /one_users
 * @example curl -X POST .../one_users -d '{"users":[{"userId":2}]}'
 */
export const getOneUser = async (userId: number | string): Promise<ApiUser | null> => {
  const id = parseUserId(userId);
  if (!id) {
    return null;
  }

  const response = await fetch(`${API_BASE_URL}/one_users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ users: [{ userId: id }] } as GetOneUserRequest),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`one_users failed (${response.status}): ${text}`);
  }

  const data: GetOneUserResponse = await response.json();
  return data.users?.[0] ?? null;
};

/** Load display name and profile photo after login using userId from /login. */
export const fetchUserProfile = async (
  userId: number | string,
): Promise<UserProfileSummary | null> => {
  const profile = await getOneUser(userId);
  if (!profile) return null;

  return {
    userId: profile.userId,
    name: profile.name,
    avatarUrl: pickProfileImageUrl(profile),
  };
};
