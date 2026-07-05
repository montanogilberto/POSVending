export interface Loan {
  loanId: number;
  companyId: number;
  loanNumber: string;
  clientId: number;
  principalAmount: number;
  interestRate: number;
  termMonths: number;
  paymentFrequency: string;
  approvedAmount?: number;
  totalRepaymentAmount?: number;
  disbursementDate?: string;
  maturityDate?: string;
  loanStatus: string;
  notes?: string;
  created_At?: string;
  updated_at?: string;
}

export interface LoanApiResponse {
  loans: Loan[];
}

const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://smartloansbackend.azurewebsites.net';

export async function getAllLoans(companyId: number, searchTerm: string = ''): Promise<Loan[]> {
  const body = { loans: [{ companyId, ...(searchTerm && { loanNumber: searchTerm }) }] };
  console.log('[loanApi] getAllLoans →', `${BASE_URL}/all_loans`, body);
  try {
    const res = await fetch(`${BASE_URL}/all_loans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('[loanApi] getAllLoans ❌', res.status, text);
      return [];
    }
    const data: LoanApiResponse = await res.json();
    console.log('[loanApi] getAllLoans ✅', data);
    return data.loans ?? [];
  } catch (err) {
    console.error('[loanApi] getAllLoans ❌ fetch error:', err);
    return [];
  }
}

export async function getOneLoan(loanId: number, companyId: number): Promise<Loan> {
  const url = `${BASE_URL}/one_loans`;
  const body = {
    companyId: companyId,
    loanId: loanId,
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }
  const data: LoanApiResponse = await res.json();
  return data.loans[0];
}

export async function createLoan(data: Omit<Loan, 'loanId' | 'created_At' | 'updated_at'>): Promise<Loan> {
  const url = `${BASE_URL}/loans`;
  const body = {
    loans: [{ ...data, action: 1 }]
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }
  const result = await res.json();
  return { ...data, loanId: result.loanId || Math.floor(Math.random() * 1000000), created_At: new Date().toISOString() } as Loan;
}

export async function updateLoan(loanId: number, data: Partial<Omit<Loan, 'loanId' | 'created_At' | 'updated_at'>>): Promise<Loan> {
  const url = `${BASE_URL}/loans`;
  const body = {
    loans: [{ ...data, loanId: loanId, action: 2 }]
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }
  const result = await res.json();
  return { ...data, loanId: loanId, updated_at: new Date().toISOString() } as Loan;
}

export async function deleteLoan(loanId: number, companyId: number): Promise<void> {
  const url = `${BASE_URL}/loans`;
  const body = {
    loans: [{ loanId: loanId, companyId: companyId, action: 3 }]
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }
}
