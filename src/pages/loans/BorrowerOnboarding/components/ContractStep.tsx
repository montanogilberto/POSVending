import React from 'react';
import { IonButton, IonCard, IonCheckbox, IonIcon } from '@ionic/react';
import { arrowBackOutline, checkmarkCircle, shieldCheckmarkOutline } from 'ionicons/icons';
import { CONTRACT_TEXT } from '../documents/contract';
import { BorrowerOnboardingVM } from '../BorrowerOnboardingLogic';
import DoneCard from './DoneCard';
import { p2pLendingRoute } from '../../../../utils/routes';

/** Paso 2 — Contrato de Crédito P2P: lectura y aceptación final. */
const ContractStep: React.FC<{ vm: BorrowerOnboardingVM }> = ({ vm }) => (
  <IonCard className="bop-panel">
    <div className="bop-section-title">
      <IonIcon icon={shieldCheckmarkOutline} />
      Contrato de Crédito P2P
    </div>
    <p className="bop-desc">
      Este contrato complementa el Pagaré y establece las obligaciones de ambas partes, incluyendo manejo de datos biométricos conforme a la LFPDPPP.
    </p>

    {vm.contractDone ? (
      <DoneCard
        title="Contrato aceptado"
        subtitle={`Aceptado el ${vm.record?.contractAcceptedAt ? new Date(vm.record.contractAcceptedAt).toLocaleDateString('es-MX') : '—'}`}
      />
    ) : (
      <>
        <div className="bop-legal-doc">
          <pre>{CONTRACT_TEXT}</pre>
        </div>

        <div className="bop-check-row">
          <IonCheckbox
            labelPlacement="end"
            justify="start"
            alignment="start"
            checked={vm.contractAccepted}
            onIonChange={e => vm.setContractAccepted(e.detail.checked)}
          >
            He leído, entendido y acepto íntegramente el Contrato de Crédito Personal P2P, incluyendo el tratamiento de mis datos personales y biométricos conforme al Aviso de Privacidad de POS GMO.
          </IonCheckbox>
        </div>
      </>
    )}

    <div className="bop-row-btns">
      <IonButton fill="outline" onClick={() => vm.setStep(1)}>
        <IonIcon icon={arrowBackOutline} slot="start" /> Anterior
      </IonButton>
      <IonButton
        color="success"
        onClick={vm.contractDone ? () => vm.history.replace(p2pLendingRoute(vm.clientId)) : vm.saveContract}
        disabled={!vm.contractDone && !vm.contractAccepted}
      >
        {vm.contractDone ? 'Ir a la plataforma' : 'Aceptar y activar cuenta'}
        <IonIcon icon={checkmarkCircle} slot="end" />
      </IonButton>
    </div>
  </IonCard>
);

export default ContractStep;
