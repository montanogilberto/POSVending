import React, { useEffect, useState } from 'react';
import { IonContent, IonPage, IonSpinner } from '@ionic/react';
import QRCode from 'qrcode';
import Header from '../../components/layout/Header';
import { usePopovers } from '../../hooks/usePopovers';
import { useUser } from '../../contexts/UserContext';
import { buildClientQrValue } from '../../utils/clientQrPdf';
import './MyQrPage.css';

/**
 * Self-service client's own QR, shown on screen for a cashier to scan at
 * checkout. Encodes the exact `CLIENT:<id>:<name>` string
 * src/components/pos/ClientQrScannerModal.tsx already parses (built via the
 * cashier-facing clientQrPdf.ts) — no new format, no backend change.
 * Scanning it sets CartPage's selectedClient, and every sale recorded
 * against a clientId already earns reward points automatically
 * (modules/rewards.py::earn_points_for_income, wired into income_sp).
 */
const MyQrPage: React.FC = () => {
  const pops = usePopovers();
  const { clientId, username } = useUser();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;
    const value = buildClientQrValue(clientId, username || 'Cliente', '');
    QRCode.toDataURL(value, { width: 512, margin: 2, errorCorrectionLevel: 'H' })
      .then(setQrDataUrl)
      .catch(err => console.log('[MyQrPage] QR generation failed:', err));
  }, [clientId, username]);

  return (
    <IonPage>
      <Header screenTitle="Mi Código QR" {...pops.headerProps} />
      <IonContent className="ion-padding my-qr-content">
        <div className="my-qr-card">
          {qrDataUrl ? (
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
