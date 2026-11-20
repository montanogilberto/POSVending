import { Decimal } from 'decimal.js'; // For TIER_2_FINANCIAL exact precision

const BASE_URL = import.meta.env.VITE_API_URL ?? "https://smartloansbackend.azurewebsites.net";

export interface LoanPayment {
  loanPaymentId: number;
  companyId: number;
  loanId: number;
  intentId: number;
  installmentId?: number | null;
  paymentType: string;
  payerClientId: number;
  payeeClientId: number;
  amountMXN: number;
  paymentDate: string;
  status: string;
  declaredAt: string;
  confirmedAt?: string | null;
  confirmedByClientId?: number | null;
  rejectReason?: string | null;
  escalatedAt?: string | null;
  claveRastreo: string;
  bankFrom?: string | null;
  evidenceFileUrl?: string | null;
  evidenceHash?: string | null;
  created_At: string;
  updated_at?: string | null;
}

export interface LoanPaymentListResponse {
  loanPayments: LoanPayment[];
}

// Specific interfaces for actions if needed, e.g., for 'declare'
export interface DeclareLoanPaymentPayload {
  loanId: number;
  intentId: number;
  payerClientId: number;
  amountMXN: number;
  paymentDate: string;
  claveRastreo: string;
  bankFrom?: string;
  evidenceFileUrl?: string;
  evidenceHash?: string;
  actorUserId: number;
}

export interface ConfirmRejectLoanPaymentPayload {
  loanPaymentId: number;
  confirmedByClientId?: number; // for confirm
  rejectedByClientId?: number;  // for reject
  rejectReason?: string;
  actorUserId: number;
}

export interface ResolveEscalationLoanPaymentPayload {
  loanPaymentId: number;
  resolution: 'CONFIRMED' | 'REJECTED';
  resolutionNote: string;
  resolverUserId: number;
}

export interface EscalateDueLoanPaymentPayload {
  days?: number;
  companyId: number;
}

// ACTION_ROUTER helper — every operation uses this shape
async function callLoanPaymentsApi(action: string, fields: Record<string, unknown>) {
  const res = await fetch(BASE_URL + "/loanPayments", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "loanPayments": [{ "action": action, ...fields }] }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Named exports per operation
export const loanPaymentApi = {
  list: async (companyId: number, loanId?: number, payeeClientId?: number, status?: string): Promise<LoanPayment[]> => {
    const response = await callLoanPaymentsApi("list", { companyId, loanId, payeeClientId, status });
    return response.loanPayments ?? [];
  },

  one: async (loanPaymentId: number, companyId: number): Promise<LoanPayment> => {
    const response = await callLoanPaymentsApi("one", { loanPaymentId, companyId });
    return response.loanPayments?.[0]; // Assuming 'one' also wraps in 'loanPayments' array
  },

  declare: async (payload: DeclareLoanPaymentPayload): Promise<LoanPayment> => {
    const response = await callLoanPaymentsApi("declare", payload);
    return response;
  },

  confirm: async (payload: ConfirmRejectLoanPaymentPayload): Promise<any> => {
    const response = await callLoanPaymentsApi("confirm", payload);
    return response;
  },

  reject: async (payload: ConfirmRejectLoanPaymentPayload): Promise<any> => {
    const response = await callLoanPaymentsApi("reject", payload);
    return response;
  },

  cancel: async (loanPaymentId: number, payerClientId: number, actorUserId: number, companyId: number): Promise<any> => {
    const response = await callLoanPaymentsApi("cancel", { loanPaymentId, payerClientId, actorUserId, companyId });
    return response;
  },

  escalateDue: async (payload: EscalateDueLoanPaymentPayload): Promise<LoanPayment[]> => {
    const response = await callLoanPaymentsApi("escalate_due", payload);
    return response.loanPayments ?? []; // Assuming it returns an array of escalated payments
  },

  resolveEscalation: async (payload: ResolveEscalationLoanPaymentPayload): Promise<any> => {
    const response = await callLoanPaymentsApi("resolve_escalation", payload);
    return response;
  },

  statement: async (loanId: number, requesterClientId: number, companyId: number): Promise<any> => {
    const response = await callLoanPaymentsApi("statement", { loanId, requesterClientId, companyId });
    return response;
  },
};
