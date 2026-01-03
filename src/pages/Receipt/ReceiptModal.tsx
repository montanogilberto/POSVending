import React, { RefObject } from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { printOutline, closeOutline } from 'ionicons/icons';
import UnifiedReceipt from '../../components/UnifiedReceipt';
import { ReceiptService } from '../../services/ReceiptService';
import { LegacyCartData } from '../../types/receipt';

interface ReceiptModalProps {
  showReceipt: boolean;
  ticketData: any;
  receiptRef: RefObject<HTMLDivElement | null>;
  paymentMethod: 'efectivo' | 'tarjeta' | 'transferencia' | '';
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
  clearCart,
  loadIncomes,
  setShowReceipt,
  setTicketData,
  history,
}) => {
  if (!showReceipt || !ticketData) return null;

  const handlePrint = () => {
    const unifiedReceiptData =
      ReceiptService.transformCartData(ticketData as LegacyCartData);

    ReceiptService.printReceipt(unifiedReceiptData, {
      width: '46mm',
      thermal: true,
      autoPrint: true,
    });
  };

  const handleClose = async () => {
    setShowReceipt(false);
    setTicketData(null);
    clearCart();
    await loadIncomes();
    history.push('/Laundry');
  };

  return (
    <div
      className="print-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        zIndex: 99999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      {/* TOP RIGHT CLOSE BUTTON */}
      <IonButton
        onClick={(e) => {
          e.stopPropagation();
          handleClose();
        }}
        color="danger"
        fill="solid"
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          width: '44px',
          height: '44px',
          '--border-radius': '50%',
          zIndex: 100001,
        }}
      >
        <IonIcon icon={closeOutline} />
      </IonButton>

      {/* RECEIPT PREVIEW (RESPONSIVE) */}
      <div
        ref={receiptRef}
        id="receipt-content"
        style={{
          backgroundColor: '#fff',
          padding: '12px',
          width: 'min(520px, 92vw)',
          maxHeight: '78vh',
          overflow: 'auto',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          marginTop: '64px',
          marginBottom: '96px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <UnifiedReceipt
          data={ReceiptService.transformCartData(ticketData as LegacyCartData)}
          options={{ width: '46mm', thermal: true }}
        />
      </div>

      {/* BOTTOM ACTION BAR */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          right: '16px',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          paddingBottom: 'env(safe-area-inset-bottom)',
          zIndex: 100001,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <IonButton
          size="large"
          onClick={handlePrint}
          style={{ flex: '1 1 180px', maxWidth: '260px' }}
        >
          <IonIcon icon={printOutline} slot="start" />
          Imprimir
        </IonButton>

        <IonButton
          size="large"
          fill="outline"
          onClick={handleClose}
          style={{ flex: '1 1 180px', maxWidth: '260px' }}
        >
          <IonIcon icon={closeOutline} slot="start" />
          Cerrar
        </IonButton>
      </div>
    </div>
  );
};

export default ReceiptModal;
