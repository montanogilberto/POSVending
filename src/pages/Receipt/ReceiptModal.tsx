import React, { RefObject } from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { printOutline } from 'ionicons/icons';
import UnifiedReceipt from '../../components/UnifiedReceipt';
import { ReceiptService } from '../../services/ReceiptService';
import { LegacyCartData } from '../../types/receipt';

interface ReceiptModalProps {
  showReceipt: boolean;
  ticketData: any;
  receiptRef: RefObject<HTMLDivElement | null>;
  paymentMethod: 'efectivo' | 'tarjeta' | '';
  cashPaid: string;
  clearCart: () => void;
  loadIncomes: () => Promise<void>;
  setShowReceipt: (show: boolean) => void;
  setTicketData: (data: any) => void;
  history: any;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({
  showReceipt,
  ticketData,
  receiptRef,
  paymentMethod,
  cashPaid,
  clearCart,
  loadIncomes,
  setShowReceipt,
  setTicketData,
  history,
}) => {
  if (!showReceipt || !ticketData) return null;

  const handlePrint = () => {
    // Transform ticket data to unified format
    const unifiedReceiptData = ReceiptService.transformCartData(ticketData as LegacyCartData);
    
    // Use the new unified print system
    ReceiptService.printReceipt(unifiedReceiptData, {
      width: '58mm',
      thermal: true,
      autoPrint: true
    });
  };

  const transactionDate = (() => {
    const utcDate = new Date(ticketData.paymentDate + (ticketData.paymentDate.includes('Z') ? '' : 'Z'));
    const hermosilloDate = new Date(utcDate.getTime() - 7 * 60 * 60 * 1000);
    return hermosilloDate.toLocaleDateString('es-ES');
  })();

  const transactionTime = (() => {
    const utcDate = new Date(ticketData.paymentDate + (ticketData.paymentDate.includes('Z') ? '' : 'Z'));
    const hermosilloDate = new Date(utcDate.getTime() - 7 * 60 * 60 * 1000);
    return hermosilloDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  })();

  return (
    <div
      className="print-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        ref={receiptRef}
        id="receipt-content"
        style={{
          backgroundColor: '#fff',
          padding: '8px',
          width: '58mm',
          fontFamily: 'monospace',
          fontSize: '11px',
        }}
      >
        {(() => {
          // Transform ticket data to unified format
          const unifiedReceiptData = ReceiptService.transformCartData(ticketData as LegacyCartData);
          
          return (
            <UnifiedReceipt
              data={unifiedReceiptData}
              options={{ width: '58mm', thermal: true }}
            />
          );
        })()}
      </div>

      <IonButton
        style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 10000 }}
        onClick={async () => {
          setShowReceipt(false);
          setTicketData(null);
          clearCart();
          await loadIncomes();
          history.push('/Laundry');
        }}
      >
        Cerrar
      </IonButton>
      <IonButton
        style={{ position: 'absolute', top: '20px', right: '120px', zIndex: 10000 }}
        onClick={handlePrint}
      >
        <IonIcon icon={printOutline} slot="start" />
        Imprimir
      </IonButton>
    </div>
  );
};

export default ReceiptModal;
