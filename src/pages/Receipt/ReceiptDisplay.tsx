import React from 'react';
import { IonButton, IonIcon, IonLoading } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { printOutline, closeOutline } from 'ionicons/icons';
import UnifiedReceipt from '../../components/UnifiedReceipt';
import { ReceiptService } from '../../services/ReceiptService';
import { LegacyCartData } from '../../types/receipt';

interface ReceiptDisplayProps {
  ticketData: any;
  paymentMethod: string;
  cashPaid: string;
  changeAmount?: number;
  clearCart: () => void;
  setTicketData: (data: any) => void;
  promotionCode?: string;
  discountAmount?: number;
}

/**
 * Repair ticket totals that may have incorrect calculations from the backend.
 * The backend sometimes returns total based on options sum instead of product subtotal.
 * 
 * IMPORTANT: Only repair if backend totals are inconsistent. If backend already has
 * correct totals (e.g., iva: 0, total === subtotal), don't apply IVA 16%!
 */
const repairTicketTotals = (ticketData: any): any => {
  if (!ticketData || !ticketData.products || !Array.isArray(ticketData.products)) {
    return ticketData;
  }

  // Get the received totals from backend
  const receivedSubtotal = ticketData.totals?.subtotal || 0;
  const receivedIva = ticketData.totals?.iva || 0;
  const receivedTotal = ticketData.totals?.total || 0;
  const receivedAmountReceived = ticketData.totals?.amountReceived || 0;
  const receivedChange = ticketData.totals?.change || 0;

  // ✅ NEW: If backend has iva: 0 and total === subtotal, backend already has correct totals
  // Don't apply IVA 16% - just return original data as-is
  if (receivedIva === 0 && receivedTotal === receivedSubtotal) {
    console.log('✅ Ticket totals from backend are correct (iva=0, total=subtotal) - no repair needed');
    return ticketData;
  }

  // Calculate the correct subtotal from products
  // Each product.subtotal already includes quantity, so we sum them up
  const calculatedSubtotal = ticketData.products.reduce((sum: number, product: any) => {
    return sum + (product.subtotal || 0);
  }, 0);

  // Calculate expected IVA based on backend's IVA rate (usually 16%)
  // Only apply if backend has a non-zero IVA value
  const ivaRate = receivedIva > 0 ? (receivedIva / receivedSubtotal) : 0.16;
  const calculatedIva = receivedIva > 0 ? calculatedSubtotal * ivaRate : 0;

  // Calculate total - only add IVA if backend had non-zero IVA
  const calculatedTotal = receivedIva > 0 ? calculatedSubtotal + calculatedIva : calculatedSubtotal;

  // Check if there's a significant discrepancy (more than 0.01)
  const subtotalDiscrepancy = Math.abs(calculatedSubtotal - receivedSubtotal);
  const totalDiscrepancy = Math.abs(calculatedTotal - receivedTotal);

  // Log the discrepancy for debugging
  if (subtotalDiscrepancy > 0.01 || totalDiscrepancy > 0.01) {
    console.warn('⚠️ Ticket totals discrepancy detected - repairing:', {
      received: { subtotal: receivedSubtotal, iva: receivedIva, total: receivedTotal },
      calculated: { subtotal: calculatedSubtotal, iva: calculatedIva, total: calculatedTotal },
      discrepancy: { subtotal: subtotalDiscrepancy, total: totalDiscrepancy }
    });
  }

  // Return repaired totals if there's a significant discrepancy
  if (subtotalDiscrepancy > 0.01 || totalDiscrepancy > 0.01) {
    return {
      ...ticketData,
      totals: {
        subtotal: Number(calculatedSubtotal.toFixed(2)),
        iva: receivedIva > 0 ? Number(calculatedIva.toFixed(2)) : 0,
        total: Number(calculatedTotal.toFixed(2)),
        amountReceived: receivedAmountReceived,
        change: receivedChange,
      },
      _totalsRepaired: true, // Flag to indicate totals were repaired
    };
  }

  // No significant discrepancy, return original (preserve payment info)
  return {
    ...ticketData,
    totals: {
      ...ticketData.totals,
      subtotal: receivedSubtotal,
      iva: receivedIva,
      total: receivedTotal,
      amountReceived: receivedAmountReceived,
      change: receivedChange,
    },
  };
};

const ReceiptDisplay: React.FC<ReceiptDisplayProps> = ({
  ticketData,
  paymentMethod,
  cashPaid,
  changeAmount = 0,
  clearCart,
  setTicketData,
  promotionCode,
  discountAmount,
}) => {
  const history = useHistory();
  const [closing, setClosing] = React.useState(false);

  // ✅ Guard: if parent already cleared ticketData, don't render (prevents crashes)
  if (!ticketData) return null;

  // 🔧 Repair totals before processing (fixes backend calculation bug)
  const repairedTicketData = React.useMemo(() => repairTicketTotals(ticketData), [ticketData]);

  // Calculate cash values from props
  const cashPaidNumber = parseFloat(cashPaid) || 0;
  const isCashPayment = paymentMethod.toLowerCase() === 'efectivo';
  const calculatedChange = isCashPayment ? changeAmount : 0;

const unifiedReceiptData = React.useMemo(() => {
    // Use repaired ticket data
    const td = repairedTicketData;
    
    // Parse pieces JSON string for each product
    const productsWithPieces = (td.products || []).map((prod: any) => {
      let parsedPieces = undefined;
      if (prod.pieces) {
        try {
          parsedPieces = typeof prod.pieces === 'string' 
            ? JSON.parse(prod.pieces) 
            : prod.pieces;
        } catch (e) {
          console.warn('Failed to parse pieces:', prod.pieces);
        }
      }
      return { ...prod, pieces: parsedPieces };
    });
    
    // Build modified ticket data with parsed pieces
    const ticketWithParsedPieces = {
      ...td,
      products: productsWithPieces
    };
    
    // Use adaptTicketToUnifiedReceipt to transform ticket data properly
    // This handles pieces parsing and correct payment values from backend
    const adaptedData = ReceiptService.adaptTicketToUnifiedReceipt(ticketWithParsedPieces);
    
    // Override with values from props if they are more accurate (for cash payments)
    const isCashPayment = paymentMethod.toLowerCase() === 'efectivo';
    const calculatedChange = isCashPayment ? (parseFloat(cashPaid) || 0) - (td.totals?.total || 0) : 0;
    
    // Only override if props have valid values (cash payment with valid cashPaid)
    const shouldOverridePayment = isCashPayment && cashPaidNumber > 0;
    
    const result = {
      ...adaptedData,
      // Include promotion info if available
      promotion: promotionCode ? {
        code: promotionCode,
        discount: discountAmount || 0,
        type: 'B2G1', // 2x1 promotion
      } : undefined,
      payment: {
        ...adaptedData.payment,
        // Use backend values unless we have better values from props
        amountReceived: shouldOverridePayment ? cashPaidNumber : adaptedData.payment.amountReceived,
        change: shouldOverridePayment ? Math.max(0, calculatedChange) : adaptedData.payment.change,
        cashPaid: shouldOverridePayment ? cashPaidNumber : adaptedData.payment.cashPaid,
        cashReturn: shouldOverridePayment ? Math.max(0, calculatedChange) : adaptedData.payment.cashReturn,
      },
      totals: {
        ...adaptedData.totals,
        amountReceived: shouldOverridePayment ? cashPaidNumber : adaptedData.totals.amountReceived,
        change: shouldOverridePayment ? Math.max(0, calculatedChange) : adaptedData.totals.change,
        // Include discount in totals if promo applied
        discount: discountAmount || 0,
        originalTotal: discountAmount ? (adaptedData.totals.total + discountAmount) : undefined,
      },
    };
    
    // DEBUG: Log what we're sending to the receipt
    console.log('🧾 [ReceiptDisplay] Final unifiedReceiptData:', JSON.stringify(result, null, 2));
    console.log('🧾 [ReceiptDisplay] Products with pieces:', result.products.map((p: any) => ({ 
      name: p.name, 
      pieces: p.pieces,
      subtotal: p.subtotal 
    })));
    console.log('🧾 [ReceiptDisplay] Payment values:', {
      amountReceived: result.payment.amountReceived,
      change: result.payment.change,
      cashPaid: result.payment.cashPaid,
      cashReturn: result.payment.cashReturn
    });
    if (promotionCode) {
      console.log('🧾 [ReceiptDisplay] Promotion applied:', {
        code: promotionCode,
        discount: discountAmount
      });
    }
    
    return result;
  }, [repairedTicketData, paymentMethod, cashPaid, changeAmount, promotionCode, discountAmount]);

  const handlePrint = () => {
    ReceiptService.printReceipt(unifiedReceiptData, {
      width: '46mm',
      thermal: true,
      autoPrint: true,
    });
  };

  const handleClose = async () => {
    if (closing) return; // ✅ prevent double click
    setClosing(true);

    // Small delay to allow the loader to show, then navigate and cleanup
    setTimeout(() => {
      // Clear cart first
      clearCart();
      
      // Clear ticket data
      setTicketData(null);
      
      // Navigate away
      history.replace('/Laundry');
      
      // Dismiss loader after navigation
      setClosing(false);
    }, 300);
  };

  return (
    <div
      id="receipt-container"
      style={{
        marginTop: '24px',
        padding: '16px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      <UnifiedReceipt
        data={unifiedReceiptData}
        options={{ width: '46mm', thermal: true }}
      />

      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginTop: '16px',
          justifyContent: 'center',
          flexWrap: 'wrap', // ✅ wrap on mobile
        }}
      >
        <IonButton
          expand="block"
          fill="outline"
          onClick={handlePrint}
          style={{ flex: '1 1 180px', minWidth: '160px' }}
        >
          <IonIcon icon={printOutline} slot="start" />
          Imprimir
        </IonButton>

        <IonButton
          expand="block"
          fill="clear"
          onClick={handleClose}
          disabled={closing}
          style={{ flex: '1 1 180px', minWidth: '160px' }}
        >
          <IonIcon icon={closeOutline} slot="start" />
          Cerrar
        </IonButton>
      </div>

      {/* ✅ Loader that ALWAYS ends */}
      <IonLoading isOpen={closing} message="Cerrando..." />
    </div>
  );
};

export default ReceiptDisplay;

