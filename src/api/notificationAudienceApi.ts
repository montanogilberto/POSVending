const BASE_URL = import.meta.env.VITE_API_URL ?? "https://smartloansbackend.azurewebsites.net";

export interface NotificationAudience {
  notificationAudienceId?: number; 
  companyId: number;
  pushNotificationId: number;
  audience: 'borrower' | 'lender' | 'juridical';
  excludeUserId?: number | null;
  created_At?: string;
  updated_at?: string;
}

export interface NotificationAudienceUpsertRequest {
  companyId: number;
  pushNotificationId: number;
  audience: 'borrower' | 'lender' | 'juridical';
  excludeUserId?: number | null;
}

// ACTION_ROUTER helper — every operation uses this shape
async function callNotificationAudienceApi(action: string, fields: Record<string, unknown>) {
  const res = await fetch(BASE_URL + "/notificationAudiences", {
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
