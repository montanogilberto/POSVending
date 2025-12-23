// Export main components
export { default as ReceiptDisplay } from './ReceiptDisplay';
export { default as ReceiptModal } from './ReceiptModal';

// Export type-only exports (interfaces)
export type {
  ReceiptDisplayProps,
  TicketData,
  Product,
} from './receiptUtils';

// Export utility functions and values
export {
  formatDate,
  formatTime,
  getPaymentMethodText,
  generateProductsHTML,
  generateCashDetailsHTML,
  parseCashPaid,
} from './receiptUtils';

// Export template
export { RECEIPT_TEMPLATE } from './receiptTemplate';

// Export custom hooks
export { useReceiptPrint } from './useReceiptPrint';
