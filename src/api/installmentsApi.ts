// Cuotas (loanInstallments) — schedule reads + SPEI repayment.
// Rail primario STP/SPEI (decisión de producto): la cuota se paga debitando la
// billetera del borrower y abonando la del lender en el ledger. Sin tarjeta.

const BASE = import.meta.env.VITE_API_URL ?? 'https://smartloansbackend.azurewebsites.net';

export interface Installment {
  installmentId: number;
  loanId: number;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  principal: number;
  interest: number;
  remainingBalance: number;
  status: 'pending' | 'paid' | 'failed' | 'delinquent';
  paidAt?: string | null;
}

export async function fetchInstallmentSchedule(loanId: number, companyId: number): Promise<Installment[]> {
  try {
    const r = await fetch(`${BASE}/automated-payments/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loanId, companyId }),
    });
    const data = r.ok ? await r.json() : { installments: [] };
    const list: Installment[] = (data.installments ?? []).map((i: any) => ({ ...i, loanId }));
    console.log('[Cuotas] schedule ←', JSON.stringify({ loanId, total: list.length, pending: list.filter(i => i.status === 'pending').length }));
    return list;
  } catch (e) {
    console.log('[Cuotas] schedule ❌', String(e));
    return [];
  }
}

export async function payInstallmentSpei(p: {
  companyId: number; loanId: number; installmentId: number; clientId: number;
}): Promise<{ paid?: boolean; amount?: number; borrowerBalanceAfter?: number; error?: string }> {
  console.log('[Cuotas] paySpei →', JSON.stringify({ installmentId: p.installmentId, loanId: p.loanId }));
  try {
    const r = await fetch(`${BASE}/automated-payments/pay-spei`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p),
    });
    const data = await r.json().catch(() => ({}));
    console.log('[Cuotas] paySpei ←', JSON.stringify({
      http: r.status, paid: data.paid, amount: data.amount,
      borrowerBalanceAfter: data.borrowerBalanceAfter, error: data.error,
    }));
    return data;
  } catch (e) {
    console.log('[Cuotas] paySpei ❌ NETWORK', String(e));
    return { error: 'Sin conexión. Intenta de nuevo.' };
  }
}
