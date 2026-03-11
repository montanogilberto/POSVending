const API_BASE_URL = 'https://smartloansbackend.azurewebsites.net';

export interface Company {
  companyId: number;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CompanyBranch {
  branchId: number;
  name: string;
  active?: string;
  companyId: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserCompany {
  userId: number;
  companyId: number;
  companyName?: string;
}

// ── Internal helper ────────────────────────────────────────────────────────

const apiPost = async (path: string, body: any): Promise<any> => {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status} on ${path}`);
  return res.json();
};

// ── Companies ──────────────────────────────────────────────────────────────

/** Fetch all companies */
export const getAllCompanies = async (): Promise<Company[]> => {
  const res = await fetch(`${API_BASE_URL}/all_companies`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to fetch companies');
  const data = await res.json();
  if (data.result?.[0]?.companies) return data.result[0].companies;
  if (Array.isArray(data.companies)) return data.companies;
  if (Array.isArray(data)) return data;
  return [];
};

/** Get one company by ID */
export const getOneCompany = async (companyId: number): Promise<Company | null> => {
  const data = await apiPost('/one_companies', { companies: [{ companyId }] });
  if (data.result?.[0]?.companies?.[0]) return data.result[0].companies[0];
  if (data.companies?.[0]) return data.companies[0];
  return null;
};

/** Create a new company (action "1") */
export const createCompany = async (name: string): Promise<Company> => {
  const data = await apiPost('/companies', {
    companies: [{ action: '1', name }],
  });
  // Try to extract the created company from the response
  const created = data.result?.[0];
  return {
    companyId: created?.companyId ?? created?.value ?? 0,
    name,
  };
};

/** Update an existing company (action "2") */
export const updateCompany = async (companyId: number, name: string): Promise<void> => {
  await apiPost('/companies', {
    companies: [{ action: '2', companyId, name }],
  });
};

// ── Branches ───────────────────────────────────────────────────────────────

/** Fetch branches for a given company */
export const getBranchesByCompany = async (companyId: number): Promise<CompanyBranch[]> => {
  try {
    const data = await apiPost('/companiesBranches_by_company', {
      companiesBranch: [{ companyId }],
    });
    if (data.result?.[0]?.branches) return data.result[0].branches;
    if (data.result?.[0]?.companiesBranch) return data.result[0].companiesBranch;
    if (Array.isArray(data.branches)) return data.branches;
    if (Array.isArray(data.companiesBranch)) return data.companiesBranch;
    return [];
  } catch {
    return [];
  }
};

/** Create a new branch (action "1") */
export const createBranch = async (name: string, companyId: number): Promise<CompanyBranch> => {
  const payload = {
    companiesBranch: [{ action: '1', name, companyId }],
  };
  console.log('[createBranch] POST /companiesBranches — payload:', JSON.stringify(payload, null, 2));

  const data = await apiPost('/companiesBranches', payload);

  console.log('[createBranch] POST /companiesBranches — response:', JSON.stringify(data, null, 2));

  const created = data.result?.[0];
  return {
    branchId: created?.branchId ?? created?.value ?? 0,
    name,
    companyId,
  };
};

/** Fetch only companies linked to a user (N:N relation). */
export const getCompaniesByUser = async (userId: number): Promise<Company[]> => {
  // Expected backend contract (common pattern used in project):
  // POST /users_companies_by_user  { usersCompanies: [{ userId }] }
  // Fallback parsing is intentionally permissive to handle response shape variations.
  const data = await apiPost('/users_companies_by_user', {
    usersCompanies: [{ userId }],
  });

  const linked =
    data.result?.[0]?.companies ??
    data.result?.[0]?.usersCompanies ??
    data.companies ??
    data.usersCompanies ??
    [];

  if (!Array.isArray(linked)) return [];

  return linked.map((row: any) => ({
    companyId: Number(row.companyId ?? row.id ?? 0),
    name: row.name ?? row.companyName ?? '',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  })).filter((c: Company) => c.companyId > 0);
};

/** Save user-company links (N:N relation). */
export const linkUserCompanies = async (userId: number, companyIds: number[]): Promise<void> => {
  if (!companyIds.length) return;

  await apiPost('/users_companies', {
    usersCompanies: companyIds.map((companyId) => ({
      action: '1',
      userId,
      companyId,
    })),
  });
};
