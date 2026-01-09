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
  clearCart: () => void;
  setTicketData: (data: any) => void;
}

/**
 * Repair ticket totals that may have incorrect calculations from the backend.
 * The backend sometimes returns total based on options sum instead of product subtotal.
 */
const repairTicketTotals = (ticketData: any): any => {
  if (!ticketData || !ticketData.products || !Array.isArray(ticketData.products)) {
    return ticketData;
  }

  // Calculate the correct subtotal from products
  // Each product.subtotal already includes quantity, so we sum them up
  const calculatedSubtotal = ticketData.products.reduce((sum: number, product: any) => {
    return sum + (product.subtotal || 0);
  }, 0);

  // Calculate IVA as 16% of subtotal
  const calculatedIva = calculatedSubtotal * 0.16;

  // Calculate total as subtotal + IVA
  const calculatedTotal = calculatedSubtotal + calculatedIva;

  // Get the received totals
  const receivedSubtotal = ticketData.totals?.subtotal || 0;
  const receivedIva = ticketData.totals?.iva || 0;
  const receivedTotal = ticketData.totals?.total || 0;

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
        iva: Number(calculatedIva.toFixed(2)),
        total: Number(calculatedTotal.toFixed(2)),
      },
      _totalsRepaired: true, // Flag to indicate totals were repaired
    };
  }

  // No significant discrepancy, return original
  return ticketData;
};

const ReceiptDisplay: React.FC<ReceiptDisplayProps> = ({
  ticketData,
  paymentMethod,
  cashPaid,
  clearCart,
  setTicketData,
}) => {
  const history = useHistory();
  const [closing, setClosing] = React.useState(false);

  // ✅ Guard: if parent already cleared ticketData, don't render (prevents crashes)
  if (!ticketData) return null;

  // 🔧 Repair totals before processing (fixes backend calculation bug)
  const repairedTicketData = React.useMemo(() => repairTicketTotals(ticketData), [ticketData]);

  const unifiedReceiptData = React.useMemo(() => {
    // Use repaired ticket data
    const td = repairedTicketData;
    const legacyCartData: LegacyCartData = {
      paymentDate: td.paymentDate,
      client: {
        name: td.client.name,
        cellphone: td.client.cellphone,
        email: td.client.email,
      },
      user: {
        name: td.user.name,
      },
      products: td.products.map((prod: any, index: number) => {
        // Handle both old format (options as array with optionName/choiceName) 
        // and new format (options with nested choices)
        let selectedOptions: any = {};
        
        if (prod.options && Array.isArray(prod.options)) {
          // New format: options with nested choices structure
          if (prod.options[0]?.choices) {
            prod.options.forEach((option: any) => {
              if (option.choices && Array.isArray(option.choices)) {
                const choiceNames = option.choices.map((c: any) => c.name).join(', ');
                selectedOptions[option.optionName || 'Opción'] = choiceNames;
              }
            });
          } else {
            // Old format: options as array of objects with optionName/choiceName
            prod.options.forEach((opt: any) => {
              selectedOptions[opt.optionName || 'Opción'] = opt.choiceName;
            });
          }
        }

        return {
          id: prod.id || index,
          name: prod.name,
          quantity: prod.quantity,
          price: prod.unitPrice,
          subtotal: prod.subtotal,
          selectedOptions: selectedOptions,
        };
      }),
      totals: {
        subtotal: td.totals.subtotal,
        iva: td.totals.iva,
        total: td.totals.total,
      },
      paymentMethod: td.paymentMethod,
    };

    return ReceiptService.transformCartData(legacyCartData);
  }, [repairedTicketData]);

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
