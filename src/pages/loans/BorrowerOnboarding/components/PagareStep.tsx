import React from 'react';
import { IonButton, IonCard, IonCheckbox, IonIcon, IonNote } from '@ionic/react';
import { arrowBackOutline, arrowForwardOutline, documentTextOutline } from 'ionicons/icons';
import SignaturePad from '../../../../components/kyc/SignaturePad';
import { PAGARE_TEXT } from '../documents/pagare';
import { BorrowerOnboardingVM } from '../BorrowerOnboardingLogic';
import DoneCard from './DoneCard';

/** Paso 1 — Pagaré: lectura, firma digital y aceptación. */
const PagareStep: React.FC<{ vm: BorrowerOnboardingVM }> = ({ vm }) => (
  <IonCard className="bop-panel">
    <div className="bop-section-title">
      <IonIcon icon={documentTextOutline} />
      Pagaré — Título de Crédito
    </div>
    <p className="bop-desc">
      Lee detenidamente el pagaré. Este documento tiene fuerza ejecutiva ante cualquier juez en México conforme a la LGTOC y es el único instrumento que se presentará en caso de incumplimiento.
    </p>

    {vm.pagareDone ? (
      <DoneCard
        title="Pagaré firmado y aceptado"
        subtitle={`Firmado digitalmente el ${vm.record?.pagareAcceptedAt ? new Date(vm.record.pagareAcceptedAt).toLocaleDateString('es-MX') : '—'}`}
      />
    ) : (
      <>
        <div className="bop-legal-doc">
          <pre>{PAGARE_TEXT}</pre>
        </div>

        <div className="bop-sig-label">Firma digital del Suscriptor</div>
        <SignaturePad
          height={180}
          label="Dibuja tu firma aquí"
          onSave={vm.setSignatureDataUrl}
          onClear={() => vm.setSignatureDataUrl(null)}
        />
        {vm.signatureDataUrl && (
          <IonNote className="bop-sig-ok">✓ Firma capturada</IonNote>
        )}

        <div className="bop-check-row">
          <IonCheckbox
            labelPlacement="end"
            justify="start"
            alignment="start"
            checked={vm.pagareAccepted}
            onIonChange={e => vm.setPagareAccepted(e.detail.checked)}
          >
            He leído, entendido y acepto el presente Pagaré, reconociendo su carácter ejecutivo conforme a la Ley General de Títulos y Operaciones de Crédito.
          </IonCheckbox>
        </div>
      </>
    )}

    <div className="bop-row-btns">
      <IonButton fill="outline" onClick={() => vm.setStep(0)}>
        <IonIcon icon={arrowBackOutline} slot="start" /> Anterior
      </IonButton>
      <IonButton
        onClick={vm.pagareDone ? () => vm.setStep(2) : vm.savePagare}
        disabled={!vm.pagareDone && (!vm.pagareAccepted || !vm.signatureDataUrl)}
      >
        {vm.pagareDone ? 'Continuar' : 'Firmar y continuar'}
        <IonIcon icon={arrowForwardOutline} slot="end" />
      </IonButton>
    </div>
  </IonCard>
);

export default PagareStep;
