import React, { useEffect, useState } from 'react';
import { IonButton, IonContent, IonPage, IonSpinner, IonText } from '@ionic/react';
import QRCode from 'qrcode';
import Header from '../../components/layout/Header';
import { usePopovers } from '../../hooks/usePopovers';
import { useUser } from '../../contexts/UserContext';
import { useClientQr } from '../../hooks/useClientQr';
import './MyQrPage.css';

/**
 * Self-service client's own QR, shown on screen for a cashier to scan at
 * checkout or at a laundry machine. Encodes the signed
 * `GMO1.<companyId>.<clientId>.<firma>` value from the backend
 * (/laundryDevices/clientQr) — the ESP32 washers only accept that format, and
 * src/components/pos/ClientQrScannerModal.tsx parses it too.
 * Scanning it sets CartPage's selectedClient, and every sale recorded
 * against a clientId already earns reward points automatically
 * (modules/rewards.py::earn_points_for_income, wired into income_sp).
 */
const MyQrPage: React.FC = () => {
  const pops = usePopovers();
  const { clientId, companyId, username } = useUser();
  const { qrValue, error, reload } = useClientQr(companyId, clientId);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    setQrDataUrl(null);
    if (!qrValue) return;
    QRCode.toDataURL(qrValue, { width: 512, margin: 2, errorCorrectionLevel: 'H' })
      .then(setQrDataUrl)
      .catch(err => console.log('[MyQrPage] QR generation failed:', err));
  }, [qrValue]);

  return (
    <IonPage>
      <Header screenTitle="Mi Código QR" {...pops.headerProps} />
      <IonContent className="ion-padding my-qr-content">
        <div className="my-qr-card">
          {error ? (
            <div className="my-qr-loading my-qr-error">
              <IonText color="danger"><p>{error}</p></IonText>
              <IonButton fill="outline" size="small" onClick={reload}>Reintentar</IonButton>
            </div>
          ) : qrDataUrl ? (
            <img src={qrDataUrl} alt="Tu código QR" className="my-qr-image" />
          ) : (
            <div className="my-qr-loading"><IonSpinner name="dots" /></div>
          )}
          <p className="my-qr-name">{username || 'Cliente'}</p>
          <p className="my-qr-hint">Muestra este código en caja para identificarte y ganar puntos.</p>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default MyQrPage;
