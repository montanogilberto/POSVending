import React, { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { IonPage, IonContent, IonLoading, IonToast, IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonList, IonItem, IonLabel, IonText } from '@ionic/react';
import { closeOutline } from 'ionicons/icons';
import { ReceiptService } from '../../services/ReceiptService';
import ReceiptHeader from './components/ReceiptHeader';
import ReceiptBody from './components/ReceiptBody';
import ReceiptActions from './components/ReceiptActions';
import { ReceiptPrintSummary, useReceiptPrint } from './useReceiptPrint';
import './ReceiptPage.css';

interface LocationState {
  ticketData?: any;
}

const ReceiptPage: React.FC = () => {
  const history = useHistory();
  const location = useLocation<LocationState>();
  const [receiptData, setReceiptData] = useState<any>(null);
  const [loading, setLoading] = useState(() => !location.state?.ticketData);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [savedReceiptUrl, setSavedReceiptUrl] = useState<string>('');
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [printSummary, setPrintSummary] = useState<ReceiptPrintSummary | null>(null);

  const ticketData = location.state?.ticketData;

  useEffect(() => {
    console.log('ReceiptPage - ticketData:', ticketData);

    const loadReceipt = async () => {
      try {
        if (!ticketData) {
          setError('No hay datos de recibo');
          return;
        }

        const ticketWithParsedPieces = {
          ...ticketData,
          products: (ticketData.products || []).map((prod: any) => {
            let parsedPieces = undefined;
            if (prod.pieces) {
              try {
                parsedPieces = typeof prod.pieces === 'string' ? JSON.parse(prod.pieces) : prod.pieces;
              } catch (e) {
                console.warn('Failed to parse pieces:', prod.pieces);
              }
            }
            return { ...prod, pieces: parsedPieces };
          })
        };

        const unifiedData = ReceiptService.adaptTicketToUnifiedReceipt(ticketWithParsedPieces);
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
  }, [ticketData]);

  const { handlePrint } = useReceiptPrint({
    receiptData,
    ticketData,
    onSavedUrl: (url) => setSavedReceiptUrl(url),
    onToast: (message) => {
      setToastMessage(message);
      setShowToast(true);
    },
    onSummary: (summary) => {
      setPrintSummary(summary);
      setShowSummaryModal(true);
    }
  });

  const handleClose = () => {
    history.goBack();
  };

  const statusColor = (ok: boolean) => (ok ? 'success' : 'danger');

  return (
    <IonPage>
      <IonLoading isOpen={loading} message="Cargando recibo..." backdropDismiss={false} />

      <ReceiptHeader onClose={handleClose} onPrint={handlePrint} />

      <IonContent className="receipt-page-content">
        <ReceiptBody receiptData={receiptData} savedReceiptUrl={savedReceiptUrl} error={error} />
        <ReceiptActions
          loading={loading}
          hasReceiptData={!!receiptData}
          onPrint={handlePrint}
          onClose={handleClose}
        />

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={3000}
          color={error ? 'danger' : 'success'}
        />

        <IonModal isOpen={showSummaryModal} onDidDismiss={() => setShowSummaryModal(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Resultado de envío de ticket</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowSummaryModal(false)}>
                  <IonIcon icon={closeOutline} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>

          <IonContent className="ion-padding">
            {printSummary ? (
              <>
                <IonList inset>
                  <IonItem>
                    <IonLabel>
                      <h2>HTML en Azure</h2>
                      <p>{printSummary.azureHtml.message}</p>
                      {!!printSummary.azureHtml.error && <IonText color="medium"><p>{printSummary.azureHtml.error}</p></IonText>}
                    </IonLabel>
                    <IonText color={statusColor(printSummary.azureHtml.ok)}>
                      <strong>{printSummary.azureHtml.ok ? 'OK' : 'FALLÓ'}</strong>
                    </IonText>
                  </IonItem>

                  <IonItem>
                    <IonLabel>
                      <h2>WhatsApp</h2>
                      <p>{printSummary.whatsapp.message}</p>
                      {!!printSummary.whatsapp.error && <IonText color="medium"><p>{printSummary.whatsapp.error}</p></IonText>}
                    </IonLabel>
                    <IonText color={statusColor(printSummary.whatsapp.ok)}>
                      <strong>{printSummary.whatsapp.ok ? 'OK' : 'FALLÓ'}</strong>
                    </IonText>
                  </IonItem>

                  <IonItem>
                    <IonLabel>
                      <h2>SMS</h2>
                      <p>{printSummary.sms.message}</p>
                      {!!printSummary.sms.error && <IonText color="medium"><p>{printSummary.sms.error}</p></IonText>}
                    </IonLabel>
                    <IonText color={statusColor(printSummary.sms.ok)}>
                      <strong>{printSummary.sms.ok ? 'OK' : 'FALLÓ'}</strong>
                    </IonText>
                  </IonItem>

                  <IonItem>
                    <IonLabel>
                      <h2>Impresión</h2>
                      <p>{printSummary.print.message}</p>
                      {!!printSummary.print.error && <IonText color="medium"><p>{printSummary.print.error}</p></IonText>}
                    </IonLabel>
                    <IonText color={statusColor(printSummary.print.ok)}>
                      <strong>{printSummary.print.ok ? 'OK' : 'FALLÓ'}</strong>
                    </IonText>
                  </IonItem>
                </IonList>

                {!!printSummary.receiptUrl && (
                  <p><strong>URL del recibo:</strong> {printSummary.receiptUrl}</p>
                )}
                {!!printSummary.phone && (
                  <p><strong>Teléfono:</strong> {printSummary.phone}</p>
                )}

                <IonButton expand="block" onClick={() => setShowSummaryModal(false)}>
                  Cerrar
                </IonButton>
              </>
            ) : (
              <p>No hay resumen disponible.</p>
            )}
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default ReceiptPage;
