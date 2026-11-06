import React from 'react';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonModal, IonSpinner,
  IonText, IonTitle, IonToolbar,
} from '@ionic/react';
import { addCircleOutline, arrowBackOutline, cameraOutline } from 'ionicons/icons';
import TransferAccountCard from '../../../../components/payments/TransferAccountCard';
import { ClientDashboardPOSVM } from '../ClientDashboardPOSLogic';

/** Datos para transferir + comprobante + lo que leyó el agente. */
const PosTransferSheet: React.FC<{ vm: ClientDashboardPOSVM }> = ({ vm }) => (
  <IonModal isOpen={vm.showTransfer} onDidDismiss={vm.closeTransfer} canDismiss={!vm.transferSaving}>
    <IonHeader>
      <IonToolbar>
        <IonButtons slot="start">
          <IonButton onClick={vm.closeTransfer} disabled={vm.transferSaving}>
            <IonIcon icon={arrowBackOutline} slot="start" /> Regresar
          </IonButton>
        </IonButtons>
        <IonTitle>Abonar transferencia</IonTitle>
      </IonToolbar>
    </IonHeader>
    <IonContent className="ion-padding">
      <div className="cpos-transfer">
        <h2 className="cpos-section-title">Datos para transferir</h2>
        <TransferAccountCard account={vm.transferAccount} />
        {vm.canManageAccounts && (
          <IonButton expand="block" fill="outline" onClick={vm.openPaymentAccounts} disabled={vm.transferSaving}>
            <IonIcon icon={addCircleOutline} slot="start" /> {vm.transferAccount ? 'Cambiar cuenta' : 'Agregar cuenta'}
          </IonButton>
        )}
        <h2 className="cpos-section-title">Comprobante</h2>
        {vm.photo && <img src={vm.photo} alt="Comprobante de transferencia" className="cpos-transfer-photo" />}
        {!vm.reviewingEvidence && (
          <IonButton expand="block" fill="outline" onClick={vm.pickEvidence} disabled={vm.reading || vm.transferSaving}>
            <IonIcon icon={cameraOutline} slot="start" /> {vm.photo ? 'Cambiar imagen' : 'Subir imagen'}
          </IonButton>
        )}
        {vm.reading && (
          <div className="cpos-transfer-center"><IonSpinner name="dots" /><span>Leyendo comprobante…</span></div>
        )}
        {vm.readingIssues.map((issue) => <IonText key={issue} color="warning"><p>{issue}</p></IonText>)}

        <IonInput label="Total" labelPlacement="stacked" type="number" inputmode="decimal" fill="outline"
          value={vm.transferForm.amount} disabled={vm.reading}
          onIonInput={(e) => vm.setTransferField('amount', e.detail.value ?? '')} />
        <IonInput label="Clave de rastreo" labelPlacement="stacked" fill="outline"
          value={vm.transferForm.trackingKey} disabled={vm.reading}
          onIonInput={(e) => vm.setTransferField('trackingKey', e.detail.value ?? '')} />
        <IonInput label="Fecha" labelPlacement="stacked" type="date" fill="outline"
          value={vm.transferForm.transferDate} disabled={vm.reading}
          onIonInput={(e) => vm.setTransferField('transferDate', e.detail.value ?? '')} />
        <IonInput label="Banco" labelPlacement="stacked" fill="outline"
          value={vm.transferForm.bankFrom} disabled={vm.reading}
          onIonInput={(e) => vm.setTransferField('bankFrom', e.detail.value ?? '')} />

        <IonButton expand="block" color="success" onClick={vm.confirmTransfer}
          disabled={!vm.transferFormValid || vm.reading || vm.transferSaving}>
          {vm.transferSaving ? <IonSpinner name="dots" /> : 'Abonar'}
        </IonButton>
        {vm.reviewingEvidence && (
          <IonButton expand="block" fill="clear" color="danger" onClick={vm.rejectEvidence} disabled={vm.transferSaving}>
            Rechazar comprobante
          </IonButton>
        )}

      </div>
    </IonContent>
  </IonModal>
);

export default PosTransferSheet;
