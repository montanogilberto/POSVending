export async function submitOrder(orderData: any): Promise<Response> {
  return fetch('https://smartloansbackend.azurewebsites.net/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderData),
  });
}
