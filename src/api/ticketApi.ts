interface Ticket {
  incomeId: number;
  companyId: number;
  paymentDate: string;
  paymentMethod: string;
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
  };
  ticketMeta: object;
}

export const fetchTicket = async (incomeId: string): Promise<Ticket | null> => {
  try {
    const response = await fetch('https://smartloansbackend.azurewebsites.net/one_tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tickets: [{ income: incomeId }]
      })
    });
    console.log(response)
    if (!response.ok) throw new Error(`Error fetching ticket: ${response.status}`);
    const data = await response.json();
    return data.tickets && data.tickets.length > 0 ? data.tickets[0] : null;
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return null;
  }
};
