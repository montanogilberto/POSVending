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
