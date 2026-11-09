import React from 'react';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonModal, IonSelect, IonSelectOption,
  IonSpinner, IonText, IonTitle, IonToolbar,
} from '@ionic/react';
import { arrowBackOutline } from 'ionicons/icons';
import { ClientDashboardPOSVM } from '../ClientDashboardPOSLogic';

/** Abono cobrado en la terminal física: terminal, monto y número de operación del ticket. */
const PosTerminalSheet: React.FC<{ vm: ClientDashboardPOSVM }> = ({ vm }) => (
  <IonModal isOpen={vm.terminalSheetOpen} onDidDismiss={vm.closeTerminalTopUp} canDismiss={!vm.terminalSaving}>
    <IonHeader>
      <IonToolbar>
        <IonButtons slot="start">
          <IonButton onClick={vm.closeTerminalTopUp} disabled={vm.terminalSaving}>
            <IonIcon icon={arrowBackOutline} slot="start" /> Regresar
          </IonButton>
        </IonButtons>
        <IonTitle>Abonar con terminal</IonTitle>
      </IonToolbar>
    </IonHeader>
    <IonContent className="ion-padding">
      <div className="cpos-transfer">
        <p className="cpos-terminal-help">
          Cobra primero en la terminal. Cuando salga aprobado, captura el monto y el número de operación del ticket.
        </p>
        {vm.cardTerminalsLoading ? (
          <div className="cpos-transfer-center"><IonSpinner name="dots" /><span>Cargando terminales…</span></div>
        ) : vm.cardTerminalsError ? (
          <IonText color="danger">
            <p>No se pudieron cargar las terminales.</p>
            <IonButton fill="outline" size="small" onClick={vm.loadCardTerminals}>Reintentar</IonButton>
          </IonText>
        ) : vm.cardTerminals.length === 0 ? (
          <IonText color="warning"><p>No hay terminales de tarjeta activas. Avisa a un administrador.</p></IonText>
        ) : (
          <IonSelect label="Terminal" labelPlacement="stacked" fill="outline" value={vm.cardTerminalId}
            disabled={vm.terminalSaving} onIonChange={(e) => vm.setCardTerminalId(e.detail.value)}>
            {vm.cardTerminals.map((t) => (
              <IonSelectOption key={t.commissionTerminalId} value={t.commissionTerminalId}>{t.terminalName}</IonSelectOption>
            ))}
          </IonSelect>
        )}
        <IonInput label="Monto cobrado (MXN)" labelPlacement="stacked" type="number" inputmode="decimal" fill="outline"
          value={vm.terminalAmount} disabled={vm.terminalSaving}
          onIonInput={(e) => vm.setTerminalAmount(e.detail.value ?? '')} />
        <IonInput label="Número de operación" labelPlacement="stacked" fill="outline" maxlength={30}
          helperText="Viene en el ticket de la terminal." value={vm.operationNumber} disabled={vm.terminalSaving}
          onIonInput={(e) => vm.setOperationNumber(e.detail.value ?? '')} />
        <IonButton expand="block" color="success" onClick={vm.confirmTerminalTopUp}
          disabled={!vm.terminalFormValid || vm.terminalSaving}>
          {vm.terminalSaving ? <IonSpinner name="dots" /> : 'Abonar'}
        </IonButton>
      </div>
    </IonContent>
  </IonModal>
);

export default PosTerminalSheet;
