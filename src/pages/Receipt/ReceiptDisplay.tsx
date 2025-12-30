import React from 'react';
import { IonButton } from '@ionic/react';
import { useHistory } from 'react-router-dom';
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

  // Transform ticket data to unified format
  const unifiedReceiptData = React.useMemo(() => {
    // Adapt ticket data to LegacyCartData format
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
      products: ticketData.products.map((prod: any, index: number) => ({
        id: prod.id || index,
        name: prod.name,
        quantity: prod.quantity,
        price: prod.unitPrice,
        subtotal: prod.subtotal,
        selectedOptions: prod.options?.reduce(
          (acc: any, opt: any) => {
            acc[opt.optionName || 'Opción'] = opt.choiceName;
            return acc;
          },
          {}
        ),
      })),
      totals: {
        subtotal: ticketData.totals.subtotal,
        iva: ticketData.totals.iva,
        total: ticketData.totals.total,
      },
      paymentMethod: ticketData.paymentMethod,
    };

    return ReceiptService.transformCartData(legacyCartData);
  }, [ticketData]);

  const handleClose = () => {
    setTicketData(null);
    clearCart();
    history.push('/Laundry');
  };

  // Calculate amount received and change for cash payments
  const cashAmount = parseFloat(cashPaid) || ticketData.totals.total;
  const showCashDetails = paymentMethod === 'efectivo';

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
      <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
        <IonButton
          expand="block"
          fill="clear"
          onClick={handleClose}
        >
          Cerrar
        </IonButton>
      </div>
    </div>
  );
};

export default ReceiptDisplay;
