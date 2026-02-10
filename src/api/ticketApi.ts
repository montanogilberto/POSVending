export interface Ticket {
  incomeId: number;
  companyId: number;
  paymentDate: string;
  paymentMethod: string;
  cashPaid: number;
  cashReturn: number;
  amountReceived: number;
  change: number;
  client: {
    clientId: number;
    name: string;
    cellphone: string;
    email: string;
  };
  user: {
    userId: number;
    name: string;
    email: string;
  };
  products: {
    incomeDetailId: number;
    productId: number;
    name: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    pieces?: {
      pantalones: number;
      prendas: number;
      otros: number;
    };
    options: {
      productOptionId: number;
      optionName: string;
      productOptionChoiceId: number;
      choiceName: string;
      price: number;
    }[];
  }[];
  totals: {
    subtotal: number;
    iva: number;
    total: number;
    amountReceived: number;
    change: number;
  };
  ticketMeta: object;
}

export const fetchTicket = async (incomeId: string, signal?: AbortSignal): Promise<Ticket | null> => {
  try {
    const controller = new AbortController();
    const abortSignal = signal || controller.signal;

    // Set timeout to prevent hanging requests
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      console.log('fetchTicket - Request to /one_tickets with incomeId:', incomeId);
      const requestBody = { tickets: [{ income: incomeId }] };
      console.log('fetchTicket - Request body:', JSON.stringify(requestBody));
      
      const response = await fetch('https://smartloansbackend.azurewebsites.net/one_tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: abortSignal
      });

      clearTimeout(timeoutId);
      console.log('fetchTicket - Response status:', response.status);

      if (!response.ok) throw new Error(`Error fetching ticket: ${response.status}`);
      const data = await response.json();
      console.log('fetchTicket - Response data:', JSON.stringify(data, null, 2));
      
      // Handle different response structures
      if (!data) {
        console.warn('fetchTicket - No data in response');
        return null;
      }
      
      // Check for tickets array
      if (data.tickets && Array.isArray(data.tickets) && data.tickets.length > 0) {
        return data.tickets[0];
      }
      
      // Check for single ticket object
      if (data.ticket && typeof data.ticket === 'object') {
        return data.ticket;
      }
      
      // Check for direct array response
      if (Array.isArray(data) && data.length > 0) {
        return data[0];
      }
      
      // Check for incomeId at root level
      if (data.incomeId) {
        return data;
      }
      
      console.warn('fetchTicket - No valid ticket found in response');
      return null;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      console.error('fetchTicket - Fetch error:', fetchError);
      
      // Handle abort errors gracefully
      if (fetchError.name === 'AbortError') {
        console.log('Ticket fetch aborted');
        return null;
      }
      
      throw fetchError;
    }
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return null;
  }
};
