import React, { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { IonPage, IonContent, IonLoading, IonToast, IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonList, IonItem, IonLabel, IonText } from '@ionic/react';
import { useExitConfirm } from '../../contexts/ExitConfirmContext';
import { closeOutline } from 'ionicons/icons';
import { ReceiptService } from '../../services/ReceiptService';
import { fetchTicket } from '../../api/ticketApi';
import ReceiptHeader from './components/ReceiptHeader';
import ReceiptBody from './components/ReceiptBody';
import ReceiptActions from './components/ReceiptActions';
import { ReceiptPrintSummary, TicketPrintStatus, useReceiptPrint } from './useReceiptPrint';
import { toHermosillo } from '../../utils/format';
import './ReceiptPage.css';

interface LocationState {
  ticketData?: any;
}

const ReceiptPage: React.FC = () => {
  const { confirmBack } = useExitConfirm();
  const location = useLocation<LocationState>();
  const [receiptData, setReceiptData] = useState<any>(null);
  const [loading, setLoading] = useState(() => !location.state?.ticketData);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [savedReceiptUrl, setSavedReceiptUrl] = useState<string>('');
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [printSummary, setPrintSummary] = useState<ReceiptPrintSummary | null>(null);
  const [printStatus, setPrintStatus] = useState<TicketPrintStatus>({ printed: false, printedDate: null });
  const [printing, setPrinting] = useState(false);

  const { incomeId } = useParams<{ incomeId?: string }>();
  // Screens that already fetched the ticket pass it in the navigation state;
  // /receipt/:incomeId opened directly (client dashboard, reload, shared link)
  // has none, so it is fetched here.
  const [ticketData, setTicketData] = useState<any>(location.state?.ticketData);

  useEffect(() => {
    if (location.state?.ticketData) setTicketData(location.state.ticketData);
  }, [location.state]);

  useEffect(() => {
    console.log('ReceiptPage - ticketData:', ticketData, 'incomeId:', incomeId);

    const controller = new AbortController();
    let fetchedTicket = false; // the re-run with the ticket ends the spinner
    const loadReceipt = async () => {
      try {
        if (!ticketData) {
          if (!incomeId) {
            setError('No hay datos de recibo');
            return;
          }
          setLoading(true);
          const fetched = await fetchTicket(incomeId, controller.signal);
          if (controller.signal.aborted) return;
          if (!fetched) {
            setError('No se encontró el recibo');
            return;
          }
          fetchedTicket = true;
          setTicketData(fetched); // re-runs this effect with the ticket
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
        if (!fetchedTicket && !controller.signal.aborted) setLoading(false);
      }
    };

    loadReceipt();
    return () => controller.abort();
  }, [ticketData, incomeId]);

  const isReprint = printStatus.printed;

  const { handlePrint, fetchPrintStatus } = useReceiptPrint({
    receiptData,
    ticketData,
    isReprint,
    onSavedUrl: (url) => setSavedReceiptUrl(url),
    onToast: (message) => {
      setToastMessage(message);
      setShowToast(true);
    },
    onSummary: (summary) => {
      setPrintSummary(summary);
      setShowSummaryModal(true);
      // First print done: any further press on this screen is a reprint.
      if (summary.print.ok && !isReprint) {
        setPrintStatus({ printed: true, printedDate: new Date().toISOString() });
      }
    }
  });

  // Already printed (e.g. reopened from Ingresos/Movimientos) → REIMPRIMIR.
  useEffect(() => {
    if (!ticketData) return;
    fetchPrintStatus().then(setPrintStatus);
  }, [ticketData, fetchPrintStatus]);

  const onPrint = async () => {
    if (printing) return;
    setPrinting(true);
    try {
      await handlePrint();
    } finally {
      setPrinting(false);
    }
  };

  const handleClose = () => confirmBack('/dashboard');

  const statusColor = (ok: boolean) => (ok ? 'success' : 'danger');

  return (
    <IonPage>
      <IonLoading isOpen={loading} message="Cargando recibo..." backdropDismiss={false} />

      <ReceiptHeader onClose={handleClose} onPrint={onPrint} printing={printing} />

      <IonContent className="receipt-page-content">
        <ReceiptBody receiptData={receiptData} savedReceiptUrl={savedReceiptUrl} error={error} />
        <ReceiptActions
          loading={loading}
          hasReceiptData={!!receiptData}
          onPrint={onPrint}
          printing={printing}
          isReprint={isReprint}
          printedAtLabel={printStatus.printedDate ? toHermosillo(printStatus.printedDate) : ''}
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
                      <strong>{printSummary.whatsapp.ok ? 'OK' : 'N/A'}</strong>
                    </IonText>
                  </IonItem>

                  <IonItem>
                    <IonLabel>
                      <h2>SMS</h2>
                      <p>{printSummary.sms.message}</p>
                      {!!printSummary.sms.error && <IonText color="medium"><p>{printSummary.sms.error}</p></IonText>}
                    </IonLabel>
                    <IonText color={statusColor(printSummary.sms.ok)}>
                      <strong>{printSummary.sms.ok ? 'OK' : 'N/A'}</strong>
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
