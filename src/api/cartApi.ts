import { API_BASE_URL } from '../utils/appEnv';
export async function submitOrder(orderData: any): Promise<Response> {
  return fetch(`${API_BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderData),
  });
}
