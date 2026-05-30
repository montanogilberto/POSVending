import React, { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { IonPage, IonContent, IonLoading, IonToast } from '@ionic/react';
import { ReceiptService } from '../../services/ReceiptService';
import ReceiptHeader from './components/ReceiptHeader';
import ReceiptBody from './components/ReceiptBody';
import ReceiptActions from './components/ReceiptActions';
import { useReceiptPrint } from './useReceiptPrint';
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
    }
  });

  const handleClose = () => {
    history.goBack();
  };

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
      </IonContent>
    </IonPage>
  );
};

export default ReceiptPage;
