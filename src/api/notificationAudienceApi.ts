import { API_BASE_URL } from '../utils/appEnv';

export type NotificationAudienceCode = 'borrower' | 'lender' | 'juridical' | 'staff';

export interface NotificationAudience {
  notificationAudienceId?: number; 
  companyId: number;
  pushNotificationId: number;
  audience: NotificationAudienceCode;
  excludeUserId?: number | null;
  created_At?: string;
  updated_at?: string;
}

export interface NotificationAudienceUpsertRequest {
  companyId: number;
  pushNotificationId: number;
  audience: NotificationAudienceCode;
  excludeUserId?: number | null;
}

// ACTION_ROUTER helper — every operation uses this shape
async function callNotificationAudienceApi(action: string, fields: object) {
  const res = await fetch(API_BASE_URL + "/notificationAudiences", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "notificationAudiences": [{ "action": action, ...fields }] }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const notificationAudienceApi = {
  upsert: (payload: NotificationAudienceUpsertRequest) =>
    callNotificationAudienceApi("upsert", payload)
};
