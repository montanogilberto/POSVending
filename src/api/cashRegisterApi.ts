const API_BASE_URL = 'https://smartloansbackend.azurewebsites.net';

export async function postCashRegister(payload: any) {
  const res = await fetch(`${API_BASE_URL}/cashRegister`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || "cashRegister request failed");
  }

  return res.json();
}

// Check if cash register is open for a company
export async function isCashRegisterOpen(companyId: number): Promise<boolean> {
  try {
    const data = await postCashRegister({
      register: [{ action: 4, companyId }],
    });

    const result = data?.result || [];
    const rows = Array.isArray(result) ? result : [];
    const session = rows.length > 0 ? rows[0] : null;
    const sessionData = session?.output_json || null;
    
    // Caja is open if sessionId exists
    return !!sessionData?.sessionId;
  } catch (error) {
    console.error('[CashRegister] Error checking session:', error);
    return false;
  }
}

