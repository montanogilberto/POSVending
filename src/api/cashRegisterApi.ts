const API_BASE_URL = 'https://smartloansbackend.azurewebsites.net';

type CashRegisterAction = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type CashRegisterSession = {
  sessionId?: number;
  companyId?: number;
  openedAt?: string;
  openingCash?: number;
  openingNotes?: string;
  systemBalance?: number;
  status?: 'open' | 'closed' | string;
  closedAt?: string;
  closedByUserId?: number;
  closingCash?: number;
  closingNotes?: string;
  autoClosed?: boolean | number;
  expectedCash?: number;
  cashDifference?: number;
};

export type CashRegisterMovement = {
  movementId?: number;
  sessionId?: number;
  companyId?: number;
  userId?: number;
  movementType?: string;
  amount?: number;
  incomeId?: number;
  notes?: string;
  createdAt?: string;
  cashPaid?: number;
  cashReturn?: number;
};

type CashRegisterRegisterItem = {
  action: CashRegisterAction;
  companyId: number;
  userId?: number;
  openingCash?: number;
  closingCash?: number;
  notes?: string;
  autoClosed?: boolean;
  movementType?: string;
  amount?: number;
  incomeId?: number;
  cashPaid?: number;
  cashReturn?: number;
  fromDate?: string;
  toDate?: string;
};

type CashRegisterResponse = {
  result?: Array<{ output_json?: any }>;
};

export async function postCashRegister(payload: any) {
  console.log('💰 [CashRegister][API] POST /cashRegister payload:', payload);

  const res = await fetch(`${API_BASE_URL}/cashRegister`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || 'cashRegister request failed');
  }

  return res.json();
}

const getOutputRows = (data: CashRegisterResponse): any[] => {
  const result = data?.result || [];
  return Array.isArray(result) ? result : [];
};

const firstOutputJson = <T = any>(data: CashRegisterResponse): T | null => {
  const rows = getOutputRows(data);
  const first = rows.length > 0 ? rows[0] : null;
  return (first?.output_json as T) || null;
};

const postRegisterAction = async (registerItem: CashRegisterRegisterItem) =>
  postCashRegister({ register: [registerItem] });

// Check if cash register is open for a company
export async function isCashRegisterOpen(companyId: number): Promise<boolean> {
  try {
    const data = await postRegisterAction({ action: 4, companyId });
    const sessionData = firstOutputJson<CashRegisterSession>(data);

    // Caja is open if sessionId exists
    return !!sessionData?.sessionId;
  } catch (error) {
    console.error('💰 [CashRegister][API] Error checking session:', error);
    return false;
  }
}

export async function getOpenCashRegisterSession(companyId: number): Promise<CashRegisterSession | null> {
  const data = await postRegisterAction({ action: 4, companyId });
  return firstOutputJson<CashRegisterSession>(data);
}

export async function openCashRegister(
  companyId: number,
  userId: number,
  openingCash = 0,
  notes = 'Apertura automática al iniciar sesión'
) {
  return postRegisterAction({
    action: 1,
    companyId,
    userId,
    openingCash,
    notes,
  });
}

export async function closeCashRegister(
  companyId: number,
  userId: number,
  closingCash = 0,
  notes = 'Cierre automático al cerrar sesión',
  autoClosed = true
) {
  return postRegisterAction({
    action: 2,
    companyId,
    userId,
    closingCash,
    notes,
    autoClosed,
  });
}

export async function addCashRegisterMovement(params: {
  companyId: number;
  userId: number;
  movementType: string;
  amount: number;
  notes?: string;
  incomeId?: number;
  cashPaid?: number;
  cashReturn?: number;
}) {
  return postRegisterAction({
    action: 3,
    companyId: params.companyId,
    userId: params.userId,
    movementType: params.movementType,
    amount: params.amount,
    notes: params.notes,
    incomeId: params.incomeId,
    cashPaid: params.cashPaid,
    cashReturn: params.cashReturn,
  });
}

export async function listCashRegisterMovements(companyId: number) {
  const data = await postRegisterAction({ action: 5, companyId });
  const output = firstOutputJson<any>(data);
  if (Array.isArray(output)) return output as CashRegisterMovement[];
  return [];
}

export async function getCashRegisterHistory(companyId: number) {
  const data = await postRegisterAction({ action: 6, companyId });
  const output = firstOutputJson<any>(data);
  if (Array.isArray(output)) return output as CashRegisterSession[];
  return [];
}

export async function getCashRegisterDailySummary(companyId: number) {
  const data = await postRegisterAction({ action: 7, companyId });
  return firstOutputJson<{
    openingCash?: number;
    sales?: number;
    deposits?: number;
    withdrawals?: number;
    expectedCash?: number;
    physicalCash?: number;
    difference?: number;
  }>(data);
}

