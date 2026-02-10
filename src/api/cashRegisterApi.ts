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

