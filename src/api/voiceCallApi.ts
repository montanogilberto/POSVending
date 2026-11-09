import { API_BASE_URL } from "../utils/appEnv";

const BASE_URL = API_BASE_URL;

export interface VoiceCall {
  voiceCallId: number;
  companyId: number;
  clientId: number;
  orderId: number;
  callSid: string | null;
  callStatus: string;
  skipReason: string | null;
  endedBy: string | null;
  durationSeconds: number | null;
  promptVersion: string | null;
  identityConfirmed: boolean;
  agreementRevision: number | null;
  agreementJson: string | null; // This is a JSON string
  agreementStatus: string;
  confirmationMessageId: string | null;
  confirmedAt: string | null; // datetime
  needsStaff: boolean;
  staffReason: string | null;
  created_At: string; // datetime
  updated_at: string | null; // datetime
  clientFirstName?: string; // from backend join
  clientLastName?: string; // from backend join
  clientCellphone?: string; // from backend join
}

export interface VoiceCallListResponse {
  voiceCalls: VoiceCall[];
}

// GET ALL — POST /all_voiceCalls
export async function getAllVoiceCalls(companyId: number, filter: string, limit: number): Promise<VoiceCall[]> {
  const res = await fetch(BASE_URL + "/all_voiceCalls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "voiceCalls": [{ "companyId": companyId, "filter": filter, "limit": limit }] }),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  const data: VoiceCallListResponse = await res.json();
  return data.voiceCalls ?? [];
}

// GET ONE — POST /one_voiceCalls
export async function getOneVoiceCall(voiceCallId: number, companyId: number): Promise<VoiceCall | null> {
  const res = await fetch(BASE_URL + "/one_voiceCalls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "voiceCallId": voiceCallId, "companyId": companyId }),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  const data: VoiceCallListResponse = await res.json(); // Backend returns an array under voiceCalls key
  return data.voiceCalls?.[0] ?? null;
}

// CREATE — action: 1
export async function createVoiceCall(payload: Omit<VoiceCall, "voiceCallId">): Promise<VoiceCall> {
  const res = await fetch(BASE_URL + "/voiceCalls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "voiceCalls": [{ "action": 1, ...payload }] }),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return await res.json();
}

// UPDATE — action: 2
export async function updateVoiceCall(id: number, payload: Partial<VoiceCall>): Promise<VoiceCall> {
  const res = await fetch(BASE_URL + "/voiceCalls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "voiceCalls": [{ "action": 2, "voiceCallId": id, ...payload }] }),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return await res.json();
}

// DELETE — action: 3
export async function deleteVoiceCall(id: number, companyId: number): Promise<void> {
  const res = await fetch(BASE_URL + "/voiceCalls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "voiceCalls": [{ "action": 3, "voiceCallId": id, "companyId": companyId }] }),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
}
