import React, { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonIcon, IonLoading, IonToast } from '@ionic/react';
import { printOutline, closeOutline } from 'ionicons/icons';
import UnifiedReceipt from '../../components/UnifiedReceipt';
import { ReceiptService } from '../../services/ReceiptService';
import { fetchTicket } from '../../api/ticketApi';

interface LocationState {
  incomeId?: number;
  ticketData?: any;
}

const ReceiptPage: React.FC = () => {
  const history = useHistory();
  const location = useLocation<LocationState>();
  const [receiptData, setReceiptData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Get incomeId from state or params
  const incomeId = location.state?.incomeId;
  const ticketData = location.state?.ticketData;

  useEffect(() => {
    console.log('ReceiptPage - incomeId:', incomeId);
    console.log('ReceiptPage - ticketData:', ticketData);
    
    const loadReceipt = async () => {
      try {
        let unifiedData;
        let sourceTicketData = ticketData;
        
        if (ticketData) {
          // Direct ticket data provided
          console.log('Using direct ticketData');
          const legacyIncomeData = ReceiptService.adaptTicketToLegacyIncome(ticketData);
          unifiedData = ReceiptService.transformIncomeData(legacyIncomeData);
          setLoading(false);
          return;
        } else if (incomeId) {
          // Fetch from API
          console.log('Fetching ticket from API for incomeId:', incomeId);
          setLoading(true);
          const ticket = await fetchTicket(incomeId.toString());
          console.log('API returned ticket:', ticket);
          
          if (!ticket) {
            setError('No se encontró el ticket');
            setToastMessage('No se encontró el ticket para este ingreso');
            setShowToast(true);
            setLoading(false);
            return;
          }
          sourceTicketData = ticket;
          const legacyIncomeData = ReceiptService.adaptTicketToLegacyIncome(ticket);
          unifiedData = ReceiptService.transformIncomeData(legacyIncomeData);
        } else {
          setError('No hay datos de recibo');
          setToastMessage('No hay datos disponibles para mostrar el recibo');
          setShowToast(true);
          setLoading(false);
          return;
        }

        console.log('Final unified receipt data:', unifiedData);
        setReceiptData(unifiedData);
      } catch (err: any) {
        console.error('Error loading receipt:', err);
        setError('Error al cargar el recibo: ' + err.message);
        setToastMessage('Error al cargar el recibo');
        setShowToast(true);
      } finally {
        setLoading(false);
      }
    };

    loadReceipt();
  }, [incomeId, ticketData]);

  const handlePrint = () => {
    if (receiptData) {
      ReceiptService.printReceipt(receiptData, {
        width: '46mm',
        thermal: true,
        autoPrint: true
      });
    }
  };

  const handleClose = () => {
    // Go back to previous page
    history.goBack();
  };

  if (loading) {
    return (
      <IonPage>
        <IonContent>
          <IonLoading isOpen={loading} message="Cargando recibo..." />
        </IonContent>
      </IonPage>
    );
  }

  if (error || !receiptData) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/laundry" />
            </IonButtons>
            <IonTitle>Recibo</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p style={{ color: 'var(--ion-color-danger)' }}>{error || 'Error al cargar el recibo'}</p>
            <IonButton onClick={handleClose}>Volver</IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      {/* Header with Close Button */}
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={handleClose}>
              <IonIcon icon={closeOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
          <IonTitle>Recibo</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handlePrint}>
              <IonIcon icon={printOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="receipt-page-content">
        {/* Receipt Container - Responsive width */}
        <div 
          className="receipt-container"
          style={{
            backgroundColor: '#fff',
            padding: '12px',
            width: 'min(520px, 92vw)',
            margin: '16px auto',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            fontFamily: 'monospace',
            fontSize: '11px',
          }}
        >
          <UnifiedReceipt
            data={receiptData}
            options={{ width: '46mm', thermal: true }}
          />
        </div>

        {/* Action Buttons - Bottom Fixed */}
        <div 
          className="action-buttons"
          style={{
            position: 'fixed',
            bottom: '0',
            left: '0',
            right: '0',
            backgroundColor: '#fff',
            padding: '16px 24px',
            paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '12px',
            boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
          }}
        >
          <IonButton
            size="large"
            fill="solid"
            color="primary"
            onClick={handlePrint}
            style={{
              minWidth: '140px',
              flex: '1 1 140px',
              maxWidth: '200px',
              height: '52px',
              fontSize: '16px',
            }}
          >
            <IonIcon icon={printOutline} slot="start" style={{ fontSize: '24px' }} />
            Imprimir
          </IonButton>
          <IonButton
            size="large"
            fill="outline"
            color="medium"
            onClick={handleClose}
            style={{
              minWidth: '140px',
              flex: '1 1 140px',
              maxWidth: '200px',
              height: '52px',
              fontSize: '16px',
            }}
          >
            <IonIcon icon={closeOutline} slot="start" style={{ fontSize: '24px' }} />
            Cerrar
          </IonButton>
        </div>

        {/* Toast for messages */}
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={3000}
          color={error ? 'danger' : 'success'}
        />
      </IonContent>
    </IonPage>
  );
};

export default ReceiptPage;

