import {
  UnifiedReceiptData,
  LegacyIncomeData,
  LegacyCartData,
  PrintOptions
} from '../types/receipt';
import { Ticket } from '../api/ticketApi';
import {
  adaptTicketToLegacyIncome,
  adaptTicketToUnifiedReceipt,
  extractCiclo,
  parseSelectedOptions,
  transformCartData,
  transformIncomeData
} from './receipt/adapters';
import { formatClientName, getPaymentMethodText, normalizePaymentMethod } from './receipt/normalizers';
import { generatePrintHTML } from './receipt/printTemplate';
import { generateReceiptBlob, printReceipt } from './receipt/printRuntime';
import { COMPANY_INFO } from './receipt/companyInfo';

export class ReceiptService {
  // Keep public API and method names for backward compatibility
  static adaptTicketToUnifiedReceipt(ticket: Ticket): UnifiedReceiptData {
    return adaptTicketToUnifiedReceipt(ticket);
  }

  static adaptTicketToLegacyIncome(ticket: Ticket): LegacyIncomeData {
    return adaptTicketToLegacyIncome(ticket);
  }

  static transformIncomeData(apiData: LegacyIncomeData): UnifiedReceiptData {
    return transformIncomeData(apiData);
  }

  static transformCartData(cartData: LegacyCartData): UnifiedReceiptData {
    return transformCartData(cartData);
  }

  static transformExpenseData(expenseData: any): UnifiedReceiptData {
    throw new Error('Expense data transformation not yet implemented');
  }

  static generatePrintHTML(data: UnifiedReceiptData, options: PrintOptions = {}): string {
    return generatePrintHTML(data, options);
  }

  static printReceipt(data: UnifiedReceiptData, options: PrintOptions = {}): void {
    return printReceipt(data, options);
  }

  static generateReceiptBlob(data: UnifiedReceiptData, options: PrintOptions = {}): string {
    return generateReceiptBlob(data, options);
  }

  // Keep internal helpers reachable if any legacy callsites used them via bracket access/tests.
  // These wrappers preserve behavior while moving logic to dedicated modules.
  private static readonly COMPANY_INFO = COMPANY_INFO;
  private static formatClientName(name: string): string {
    return formatClientName(name);
  }
  private static extractCiclo(options: any[]): string | null {
    return extractCiclo(options);
  }
  private static normalizePaymentMethod(
    method: string
  ): 'efectivo' | 'tarjeta' | 'transferencia' {
    return normalizePaymentMethod(method);
  }
  private static parseSelectedOptions(selectedOptions: Record<string, any>): any {
    return parseSelectedOptions(selectedOptions);
  }
  private static getPaymentMethodText(method: string): string {
    return getPaymentMethodText(method);
  }
}
