export const fetchOrders = async () => {
  try {
    const response = await fetch('https://smartloansbackend.azurewebsites.net/list_orders');
    const data = await response.json();
    return data.orders || [];
  } catch (error) {
    throw new Error('Failed to fetch orders');
  }
};

export const fetchCommands = async () => {
  try {
    const response = await fetch('https://smartloansbackend.azurewebsites.net/all_commands');
    if (!response.ok) {
      throw new Error('Failed to fetch commands');
    }
    const data = await response.json();
    return data.commands || [];
  } catch (error) {
    throw new Error('Failed to fetch commands');
  }
};

export const fetchOrderProductDetails = async (orderId: number) => {
  try {
    const response = await fetch('https://smartloansbackend.azurewebsites.net/one_products_orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders: [{ orderId }] }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${errorText}`);
    }
    const data = await response.json();
    return data.orderedProducts[0] || null;
  } catch (error) {
    throw new Error('Failed to fetch product details');
  }
};

export const updateOrderStatus = async (orderId: number, currentStatusName: string) => {
  const statusProgression: { [key: string]: number } = {
    pending: 2,
    preparing: 3,
    done: 3,
    cancel: 4,
  };

  const nextStatusId = statusProgression[currentStatusName.toLowerCase()] || 1;

  try {
    const response = await fetch('https://smartloansbackend.azurewebsites.net/tracking_status_orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ordersTraking: [
          {
            orderId,
            userId: 1,
            statusTrakingId: nextStatusId,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update order status');
    }
  } catch (error) {
    throw new Error('Failed to update order status');
  }
};
