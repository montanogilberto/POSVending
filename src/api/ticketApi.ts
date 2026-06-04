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

export interface SendTicketSmsRequest {
  phone: string;
  message: string;
  receiptUrl: string;
}

export interface SendTicketWhatsappRequest {
  phone: string;
  message: string;
  receiptUrl: string;
}

export interface SendTicketSmsResponse {
  channel: string;
  ticketId: string;
  to: string;
  provider: string;
  messageSid: string;
  status: string;
}

export interface SendTicketWhatsappResponse {
  channel?: string;
  ticketId?: string;
  to?: string;
  provider?: string;
  messageSid?: string;
  status?: string;
  [key: string]: any;
}

export interface SaveTicketHtmlRequest {
  incomeId: number;
  companyId: number;
  branchId: number;
  clientPhone: string;
  html: string;
  fileName: string;
}

export interface SaveTicketHtmlResponse {
  success?: boolean;
  receiptUrl?: string;
  url?: string;
  message?: string;
  [key: string]: any;
}

export type TicketTrackingAction = 'validate' | 'save' | 'whatsapp' | 'sms' | 'print';

export interface OneTicketTrackingItem {
  action: TicketTrackingAction;
  incomeId: number;
  companyId: number;
  fileName: string;
  containerName: string;
  receiptUrl: string;
  phone: string;
  channelResponse?: Record<string, any> | null;
}

export interface OneTicketTrackingRequest {
  ticket: OneTicketTrackingItem[];
}

export interface OneTicketTrackingRecord {
  ticketId?: number;
  incomeId?: number;
  fileName?: string;
  receiptUrl?: string;
  uploadAzure?: boolean;
  whatsappSent?: boolean;
  smsSent?: boolean;
  printed?: boolean;
  [key: string]: any;
}

export interface OneTicketTrackingResponse {
  tickets?: OneTicketTrackingRecord[];
  [key: string]: any;
}

function stringifyErrorBody(errorBody: any): string {
  if (!errorBody) return '';
  if (typeof errorBody === 'string') return errorBody;
  try {
    return JSON.stringify(errorBody);
  } catch {
    return String(errorBody);
  }
}

async function readErrorBody(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch {
    try {
      return await response.text();
    } catch {
      return null;
    }
  }
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

export const sendTicketSms = async (
  ticketId: string,
  payload: SendTicketSmsRequest,
  signal?: AbortSignal
): Promise<SendTicketSmsResponse | null> => {
  try {
    const controller = new AbortController();
    const abortSignal = signal || controller.signal;
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const encodedTicketId = encodeURIComponent(ticketId);
      const smsUrl = `https://smartloansbackend.azurewebsites.net/api/tickets/${encodedTicketId}/send-sms`;
      console.log('[TicketAPI][SMS] Request', {
        url: smsUrl,
        ticketId,
        payload
      });

      const response = await fetch(
        smsUrl,
        {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: abortSignal
        }
      );

      clearTimeout(timeoutId);
      console.log('[TicketAPI][SMS] Response status', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        let errorBody: any = null;
        try {
          errorBody = await response.json();
        } catch {
          try {
            errorBody = await response.text();
          } catch {
            errorBody = null;
          }
        }
        console.error('sendTicketSms - Non-OK response', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          requestPayload: payload,
          responseBody: errorBody
        });
        throw new Error(
          `Error sending ticket sms: ${response.status}${
            errorBody ? ` - ${typeof errorBody === 'string' ? errorBody : JSON.stringify(errorBody)}` : ''
          }`
        );
      }

      const data = await response.json();
      console.log('[TicketAPI][SMS] Response body', data);
      if (!data || typeof data !== 'object') {
        return null;
      }

      return data as SendTicketSmsResponse;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        console.log('Ticket SMS request aborted');
        return null;
      }

      throw fetchError;
    }
  } catch (error) {
    console.error('Error sending ticket SMS:', error);
    return null;
  }
};

export const saveTicketHtml = async (
  payload: SaveTicketHtmlRequest,
  signal?: AbortSignal
): Promise<SaveTicketHtmlResponse | null> => {
  try {
    const controller = new AbortController();
    const abortSignal = signal || controller.signal;
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const saveHtmlUrl = 'https://smartloansbackend.azurewebsites.net/api/tickets/receipt-html';
      console.log('[TicketAPI][UPLOAD_AZURE] Request', {
        url: saveHtmlUrl,
        incomeId: payload.incomeId,
        companyId: payload.companyId,
        branchId: payload.branchId,
        clientPhone: payload.clientPhone,
        fileName: payload.fileName,
        htmlLength: payload.html?.length || 0
      });

      const response = await fetch(
        saveHtmlUrl,
        {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: abortSignal
        }
      );

      clearTimeout(timeoutId);
      console.log('[TicketAPI][UPLOAD_AZURE] Response status', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorBody = await readErrorBody(response);
        const errorBodyText = stringifyErrorBody(errorBody);
        throw new Error(
          `Error saving ticket html: ${response.status}${errorBodyText ? ` - ${errorBodyText}` : ''}`
        );
      }

      const data = await response.json();
      console.log('[TicketAPI][UPLOAD_AZURE] Response body', data);
      if (!data || typeof data !== 'object') {
        return null;
      }

      return data as SaveTicketHtmlResponse;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        console.log('Save ticket HTML request aborted');
        return null;
      }

      throw fetchError;
    }
  } catch (error) {
    console.error('Error saving ticket HTML:', error);
    return null;
  }
};

export const sendTicketWhatsapp = async (
  phoneOrTicketId: string,
  payload: SendTicketWhatsappRequest,
  signal?: AbortSignal
): Promise<SendTicketWhatsappResponse | null> => {
  try {
    const controller = new AbortController();
    const abortSignal = signal || controller.signal;
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const encodedPathParam = encodeURIComponent(phoneOrTicketId);
      const whatsappUrl = `https://smartloansbackend.azurewebsites.net/api/tickets/${encodedPathParam}/send-whatsapp`;
      console.log('[TicketAPI][WHATSAPP] Request', {
        url: whatsappUrl,
        pathParam: phoneOrTicketId,
        payload
      });

      const response = await fetch(
        whatsappUrl,
        {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: abortSignal
        }
      );

      clearTimeout(timeoutId);
      console.log('[TicketAPI][WHATSAPP] Response status', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorBody = await readErrorBody(response);
        console.error('sendTicketWhatsapp - Non-OK response', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          requestPayload: payload,
          responseBody: errorBody
        });
        const errorBodyText = stringifyErrorBody(errorBody);
        throw new Error(
          `Error sending ticket whatsapp: ${response.status}${errorBodyText ? ` - ${errorBodyText}` : ''}`
        );
      }

      const data = await response.json();
      console.log('[TicketAPI][WHATSAPP] Response body', data);
      if (!data || typeof data !== 'object') {
        return null;
      }

      return data as SendTicketWhatsappResponse;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        console.log('Ticket WhatsApp request aborted');
        return null;
      }

      throw fetchError;
    }
  } catch (error) {
    console.error('Error sending ticket WhatsApp:', error);
    return null;
  }
};

export const postOneTicketTracking = async (
  payload: OneTicketTrackingRequest,
  signal?: AbortSignal
): Promise<OneTicketTrackingResponse | null> => {
  try {
    const controller = new AbortController();
    const abortSignal = signal || controller.signal;
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const trackingUrl = 'https://smartloansbackend.azurewebsites.net/one_ticket_tracking';
      console.log('[TicketAPI][TRACKING] Calling /one_ticket_tracking', {
        url: trackingUrl
      });
      console.log('[TicketAPI][TRACKING] Request payload for /one_ticket_tracking:', payload);

      const response = await fetch(
        trackingUrl,
        {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: abortSignal
        }
      );

      clearTimeout(timeoutId);
      console.log('[TicketAPI][TRACKING] Response status from /one_ticket_tracking', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorBody = await readErrorBody(response);
        console.error('postOneTicketTracking - Non-OK response', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          requestPayload: payload,
          responseBody: errorBody
        });
        const errorBodyText = stringifyErrorBody(errorBody);
        throw new Error(
          `Error posting one_ticket_tracking: ${response.status}${errorBodyText ? ` - ${errorBodyText}` : ''}`
        );
      }

      const data = await response.json();
      console.log('[TicketAPI][TRACKING] Response from sp_ticket_tracking:', data);
      if (!data || typeof data !== 'object') {
        return null;
      }

      return data as OneTicketTrackingResponse;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        console.log('one_ticket_tracking request aborted');
        return null;
      }

      throw fetchError;
    }
  } catch (error) {
    console.error('Error posting one_ticket_tracking:', error);
    return null;
  }
};
