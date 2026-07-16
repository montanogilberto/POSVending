import { useState, useEffect } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardContent,
  IonButton,
  IonText,
  IonToast
} from '@ionic/react';
import { Scanner } from '@yudiel/react-qr-scanner';
import './ScannerQR.css';

const ScannerQR: React.FC = () => {
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  // Verificar compatibilidad de la cámara
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Tu navegador no soporta acceso a la cámara.');
      setShowToast(true);
    }
  }, []);

  const handleScan = (result: string) => {
    if (result) {
      setScannedData(result);
      setError(null);
      setShowToast(true);
    }
  };

  const handleError = (err: any) => {
    console.error(err);
    setError('Error al acceder a la cámara. Revisa permisos o usa HTTPS/localhost.');
    setShowToast(true);
  };

  const resetScanner = () => {
    setScannedData(null);
    setError(null);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Escáner QR</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding">
        {!scannedData ? (
          <IonCard>
            <IonCardContent>
              <Scanner
                onScan={(detectedCodes) => {
                  const result = detectedCodes[0]?.rawValue;
                  if (result) handleScan(result);
                }}
                onError={handleError}
                constraints={{ facingMode: 'environment' }}
                
                formats={['qr_code']}
                scanDelay={500}
                allowMultiple={false}
              />
              {error && <IonText color="danger">{error}</IonText>}
            </IonCardContent>
          </IonCard>
        ) : (
          <IonCard>
            <IonCardContent>
              <h2>✅ Código Escaneado:</h2>
              <p>{scannedData}</p>
              <IonButton expand="block" onClick={resetScanner}>
                Escanear otro
              </IonButton>
            </IonCardContent>
          </IonCard>
        )}

        <IonToast
          isOpen={showToast}
          message={error || `QR detectado: ${scannedData}`}
          duration={3000}
          color={error ? 'danger' : 'success'}
          onDidDismiss={() => setShowToast(false)}
        />
      </IonContent>
    </IonPage>
  );
};

export default ScannerQR;
