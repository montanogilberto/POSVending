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

  const unifiedReceiptData = React.useMemo(() => {
    const legacyCartData: LegacyCartData = {
      paymentDate: ticketData.paymentDate,
      client: {
        name: ticketData.client.name,
        cellphone: ticketData.client.cellphone,
        email: ticketData.client.email,
      },
      user: {
        name: ticketData.user.name,
      },
      products: ticketData.products.map((prod: any, index: number) => {
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
        subtotal: ticketData.totals.subtotal,
        iva: ticketData.totals.iva,
        total: ticketData.totals.total,
      },
      paymentMethod: ticketData.paymentMethod,
    };

    return ReceiptService.transformCartData(legacyCartData);
  }, [ticketData]);

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
