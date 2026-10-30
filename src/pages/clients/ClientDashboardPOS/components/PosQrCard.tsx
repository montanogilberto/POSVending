import React from 'react';
import { IonButton, IonCard, IonCardContent, IonChip, IonIcon, IonLabel, IonSpinner, IonText } from '@ionic/react';
import { bicycleOutline, bagHandleOutline, cartOutline, downloadOutline } from 'ionicons/icons';
import { QRCodeSVG } from 'qrcode.react';
import { ClientDashboardPOSVM } from '../ClientDashboardPOSLogic';

const USES = [
  { icon: cartOutline, label: 'Nueva venta' },
  { icon: bagHandleOutline, label: 'Recolección' },
  { icon: bicycleOutline, label: 'Delivery' },
];

const PosQrCard: React.FC<{ vm: ClientDashboardPOSVM }> = ({ vm }) => {
  if (!vm.client) return null;
  return (
    <IonCard className="cpos-card">
      <IonCardContent className="cpos-card-content cpos-qr-content">
        <div className="cpos-qr-code">
          {vm.qrValue ? (
            <QRCodeSVG value={vm.qrValue} size={168} level="H" includeMargin />
          ) : (
            <div className="cpos-qr-placeholder">
              {vm.qrError ? (
                <>
                  <IonText color="danger"><p>{vm.qrError}</p></IonText>
                  <IonButton fill="clear" size="small" onClick={vm.reloadQr}>Reintentar</IonButton>
                </>
              ) : <IonSpinner name="crescent" />}
            </div>
          )}
        </div>
        <div className="cpos-qr-info">
          <h2 className="cpos-section-title">Código QR del cliente</h2>
          <p className="cpos-qr-hint">El cliente lo muestra en caja para identificarse en el POS.</p>
          <div className="cpos-qr-uses">
            {USES.map((u) => (
              <IonChip key={u.label} className="cpos-qr-use">
                <IonIcon icon={u.icon} />
                <IonLabel>{u.label}</IonLabel>
              </IonChip>
            ))}
          </div>
          <IonButton
            fill="outline"
            size="small"
            color="success"
            onClick={vm.downloadQr}
            disabled={vm.qrDownloading || !vm.qrValue}
            className="cpos-action cpos-qr-download"
          >
            {vm.qrDownloading
              ? <IonSpinner name="dots" />
              : <><IonIcon icon={downloadOutline} slot="start" /> Descargar PDF</>}
          </IonButton>
        </div>
      </IonCardContent>
    </IonCard>
  );
};

export default PosQrCard;
