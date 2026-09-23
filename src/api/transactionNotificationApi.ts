const BASE_URL = import.meta.env.VITE_API_URL ?? "https://smartloansbackend.azurewebsites.net";

export interface TransactionNotification {
  transactionNotificationId: number;
  companyId: number;
  clientId: number;
  transactionId: number;
  movementType: string;
  channel: string;
  status: string;
  recipientEmail?: string;
  subject?: string;
  messageBody?: string;
  amount: number;
  currency: string;
  stripeReference?: string;
  bankName?: string;
  bankLast4?: string;
  sentAt?: string;
  confirmedAt?: string;
  failureReason?: string;
  created_At: string;
  updated_at?: string;
}

export interface TransactionNotificationListResponse {
  transactionNotifications: TransactionNotification[];
}

// GET ALL — POST /all_transactionNotifications
export async function getAllTransactionNotifications(companyId: number): Promise<TransactionNotification[]> {
  const res = await fetch(BASE_URL + "/all_transactionNotifications", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transactionNotifications: [{ companyId: companyId }] }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data: TransactionNotificationListResponse = await res.json();
  return data.transactionNotifications ?? [];
}

// CREATE — action: 1
export async function createTransactionNotification(payload: Omit<TransactionNotification, "transactionNotificationId" | "created_At" | "updated_at">): Promise<TransactionNotification> {
  const res = await fetch(BASE_URL + "/transactionNotifications", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transactionNotifications: [{ action: 1, ...payload }] }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  // Assuming the backend returns the created object directly or inside a plural key
  return data.transactionNotifications ? data.transactionNotifications[0] : data;
}

// UPDATE — action: 2
export async function updateTransactionNotification(id: number, payload: Partial<Omit<TransactionNotification, "created_At">>): Promise<TransactionNotification> {
  const res = await fetch(BASE_URL + "/transactionNotifications", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transactionNotifications: [{ action: 2, transactionNotificationId: id, ...payload }] }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.transactionNotifications ? data.transactionNotifications[0] : data;
}

// DELETE — action: 3
export async function deleteTransactionNotification(id: number, companyId: number): Promise<void> {
  const res = await fetch(BASE_URL + "/transactionNotifications", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transactionNotifications: [{ action: 3, transactionNotificationId: id, companyId: companyId }] }),
  });
  if (!res.ok) throw new Error(await res.text());
}

// CONNECTOR: dispatchTransactionNotification
export async function dispatchTransactionNotification(payload: {
  companyId: number;
  clientId: number;
  transactionId: number;
  movementType: string;
  recipientEmail?: string;
  subject?: string;
  messageBody?: string;
  amount: number;
  currency: string;
  stripeReference?: string;
  bankName?: string;
  bankLast4?: string;
}): Promise<TransactionNotification[]> {
  const res = await fetch(BASE_URL + "/transactionNotifications/dispatch", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload), // Flat body as per connector spec
  });
  if (!res.ok) throw new Error(await res.text());
  const data: TransactionNotificationListResponse = await res.json();
  return data.transactionNotifications ?? [];
}

// CONNECTOR: confirmTransactionNotification
export async function confirmTransactionNotification(payload: {
  companyId: number;
  transactionId: number;
  stripeReference: string;
  movementType?: string;
  isSuccess: boolean;
  failureReason?: string;
}): Promise<TransactionNotification[]> {
  const res = await fetch(BASE_URL + "/transactionNotifications/confirm", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload), // Flat body as per connector spec
  });
  if (!res.ok) throw new Error(await res.text());
  const data: TransactionNotificationListResponse = await res.json();
  return data.transactionNotifications ?? [];
}
