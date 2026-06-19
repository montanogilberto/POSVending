const BASE_URL = import.meta.env.VITE_API_URL ?? "https://smartloansbackend.azurewebsites.net";

export interface PushNotification {
  pushNotificationId: number;
  companyId: number;
  title: string;
  message: string;
  notificationType: 'Info' | 'Success' | 'Warning' | 'Error' | 'System';
  priority: 'Low' | 'Normal' | 'High' | 'Critical';
  targetType: 'User' | 'Role' | 'Company' | 'All';
  targetUserId?: number;
  targetRoleId?: number;
  targetCompanyId?: number;
  navigationRoute?: string;
  isRead: boolean;
  isSent: boolean;
  sentAt?: string;
  scheduledAt?: string;
  payloadJson?: string;
  created_At: string;
  updated_at?: string;
}

export interface PushNotificationListResponse {
  pushNotifications: PushNotification[];
}

// GET ALL -- POST /all_pushNotifications
// Body: { "pushNotifications": [{ "companyId": companyId }] }
// Response: { "pushNotifications": PushNotification[] }
export async function getAllPushNotifications(companyId: number): Promise<PushNotification[]> {
  const res = await fetch(BASE_URL + "/all_pushNotifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "pushNotifications": [{ "companyId": companyId }] }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data: PushNotificationListResponse = await res.json();
  return data.pushNotifications ?? [];
}

// CREATE -- POST /pushNotifications
// Body: { "pushNotifications": [{ "action": 1, "companyId": ..., ...fields }] }
export async function createPushNotification(payload: Omit<PushNotification, "pushNotificationId" | "created_At" | "updated_at" | "isRead" | "isSent" | "sentAt">): Promise<PushNotification> {
  const res = await fetch(BASE_URL + "/pushNotifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "pushNotifications": [{ "action": 1, ...payload }] }),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

// UPDATE -- POST /pushNotifications
// Body: { "pushNotifications": [{ "action": 2, "pushNotificationId": id, ...fields }] }
export async function updatePushNotification(id: number, payload: Partial<Omit<PushNotification, "created_At" | "updated_at" | "isSent" | "sentAt">): Promise<PushNotification> {
  const res = await fetch(BASE_URL + "/pushNotifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "pushNotifications": [{ "action": 2, "pushNotificationId": id, ...payload }] }),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

// DELETE -- POST /pushNotifications
// Body: { "pushNotifications": [{ "action": 3, "pushNotificationId": id, "companyId": companyId }] }
export async function deletePushNotification(id: number, companyId: number): Promise<void> {
  const res = await fetch(BASE_URL + "/pushNotifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "pushNotifications": [{ "action": 3, "pushNotificationId": id, "companyId": companyId }] }),
  });
  if (!res.ok) throw new Error(await res.text());
}