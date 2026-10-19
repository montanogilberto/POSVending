import React, { useState } from 'react';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent,
  IonCard, IonCardContent, IonText, IonToast,
} from '@ionic/react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { getOneClient, Client } from '../../api/clientsApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onClientFound: (client: Client) => void;
}

/** Parses the `CLIENT:<id>:<name>` string encoded by src/utils/clientQrPdf.ts's buildClientQrValue. */
function parseClientQrValue(raw: string): number | null {
  const parts = raw.split(':');
  if (parts[0] !== 'CLIENT') return null;
  const clientId = parseInt(parts[1], 10);
  return Number.isFinite(clientId) ? clientId : null;
}

const ClientQrScannerModal: React.FC<Props> = ({ isOpen, onClose, onClientFound }) => {
  const [error, setError] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);

  const handleScan = async (raw: string) => {
    if (looking) return;
    const clientId = parseClientQrValue(raw);
    if (!clientId) {
      setError('Este código QR no corresponde a un cliente.');
      return;
    }
    setLooking(true);
    setError(null);
    try {
      const clients = await getOneClient({ clients: [{ clientId }] });
      const client = clients?.[0];
      if (!client) {
        setError('No se encontró ese cliente.');
        return;
      }
      onClientFound(client);
      onClose();
    } catch (err) {
      console.error('[ClientQrScannerModal] lookup failed:', err);
      setError('No se pudo buscar el cliente. Intenta de nuevo.');
    } finally {
      setLooking(false);
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Escanear QR del cliente</IonTitle>
          <IonButtons slot="end"><IonButton onClick={onClose}>Cerrar</IonButton></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonCard>
          <IonCardContent>
            {isOpen && (
              <Scanner
                onScan={(detectedCodes) => {
                  const result = detectedCodes[0]?.rawValue;
                  if (result) handleScan(result);
                }}
                onError={(err) => {
                  console.error('[ClientQrScannerModal] camera error:', err);
                  setError('Error al acceder a la cámara. Revisa los permisos.');
                }}
                constraints={{ facingMode: 'environment' }}
                formats={['qr_code']}
                scanDelay={500}
                allowMultiple={false}
              />
            )}
            {error && <IonText color="danger"><p>{error}</p></IonText>}
          </IonCardContent>
        </IonCard>
        <IonToast
          isOpen={!!error}
          message={error ?? ''}
          duration={3000}
          color="danger"
          onDidDismiss={() => setError(null)}
        />
      </IonContent>
    </IonModal>
  );
};

export default ClientQrScannerModal;
