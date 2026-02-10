import React, { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonLoading, IonToast } from '@ionic/react';
import { printOutline, closeOutline } from 'ionicons/icons';
import UnifiedReceipt from '../../components/UnifiedReceipt';
import { ReceiptService } from '../../services/ReceiptService';

interface LocationState {
  ticketData?: any;
}

const ReceiptPage: React.FC = () => {
  const history = useHistory();
  const location = useLocation<LocationState>();
  const [receiptData, setReceiptData] = useState<any>(null);
  // Initialize loading based on whether ticketData exists
  const [loading, setLoading] = useState(() => !location.state?.ticketData);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Get ticketData from route state only
  const ticketData = location.state?.ticketData;

  useEffect(() => {
    console.log('ReceiptPage - ticketData:', ticketData);
    
    const loadReceipt = async () => {
      try {
        if (!ticketData) {
          setError('No hay datos de recibo');
          return;
        }
        
        console.log('Processing ticketData');
        
        // Parse pieces JSON string for each product
        const ticketWithParsedPieces = {
          ...ticketData,
          products: (ticketData.products || []).map((prod: any) => {
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
          })
        };
        
        // Use adaptTicketToUnifiedReceipt for proper transformation with pieces
        const unifiedData = ReceiptService.adaptTicketToUnifiedReceipt(ticketWithParsedPieces);
        
        console.log('Final unified receipt data:', unifiedData);
        setReceiptData(unifiedData);
      } catch (err: any) {
        console.error('Error loading receipt:', err);
        setError('Error al cargar el recibo: ' + err.message);
        setToastMessage('Error al cargar el recibo');
      } finally {
        setLoading(false);
      }
    };

    loadReceipt();
  }, [ticketData]);

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

  return (
    <IonPage>
      {/* Global loader overlay */}
      <IonLoading isOpen={loading} message="Cargando recibo..." backdropDismiss={false} />
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
          {!!receiptData ? (
            <UnifiedReceipt
              data={receiptData}
              options={{ width: '46mm', thermal: true }}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: 16, color: 'var(--ion-color-danger)' }}>
              {error || 'No hay datos disponibles'}
            </div>
          )}
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
            disabled={loading || !receiptData}
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
            disabled={loading}
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

