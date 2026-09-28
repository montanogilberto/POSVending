import React, { useState } from 'react';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonModal, IonSpinner, IonTitle, IonToast, IonToolbar,
} from '@ionic/react';
import { close, walletOutline, sparklesOutline } from 'ionicons/icons';
import './DiscoverProductModal.css';
import { createClientFollowUp } from '../../api/clientFollowUpApi';
import { useToast } from '../../hooks/useToast';
import { DiscoverProduct } from '../../utils/productContext';

const COPY: Record<DiscoverProduct, { title: string; icon: string; lines: string[]; followUpTitle: string }> = {
  smartloans: {
    title: 'SmartLoans',
    icon: walletOutline,
    lines: [
      'Pide un préstamo o invierte prestando a otros clientes.',
      'Tu cuenta, tus compras y tus recompensas se quedan igual.',
      'Para activarlo necesitas identificación, verificación facial y firma de contrato.',
    ],
    followUpTitle: 'Interesado en SmartLoans',
  },
  factory: {
    title: 'Factory AI Software',
    icon: sparklesOutline,
    lines: [
      'Software a la medida para tu negocio, construido con IA.',
      'Un asesor te contacta para entender lo que necesitas.',
    ],
    followUpTitle: 'Interesado en Factory AI Software',
  },
};

interface Props {
  product: DiscoverProduct | null;
  companyId: number;
  clientId: number;
  userId: number;
  onClose: () => void;
}

/**
 * "Descubrir" — cross-sell for a product the client does not hold yet.
 * Promotion is not membership: this never grants a capability. It records a
 * pending follow-up so staff contact the client and run the real enrollment.
 */
const DiscoverProductModal: React.FC<Props> = ({ product, companyId, clientId, userId, onClose }) => {
  const [sending, setSending] = useState(false);
  const { showToast, toastProps } = useToast();
  const copy = product ? COPY[product] : null;

  const handleInterested = async () => {
    if (!product || !copy || sending) return;
    setSending(true);
    try {
      await createClientFollowUp({
        companyId,
        clientId,
        followUpType: 'call',
        status: 'pending',
        riskStatus: 'on_track',
        title: copy.followUpTitle,
        notes: `El cliente pidió información de ${copy.title} desde la app (Descubrir).`,
        createdBy: userId,
      });
      console.log('[DiscoverProductModal] follow-up created for', product, 'clientId=', clientId);
      showToast('Listo — te contactaremos pronto.');
      onClose();
    } catch (err) {
      console.error('[DiscoverProductModal] follow-up failed:', err);
      showToast('No se pudo enviar tu solicitud. Intenta de nuevo.', 'danger');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <IonModal isOpen={!!product} onDidDismiss={onClose} className="discover-modal">
        <IonHeader>
          <IonToolbar>
            <IonTitle>Descubrir</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={onClose} aria-label="Cerrar">
                <IonIcon icon={close} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="discover-modal-content">
          {copy && (
            <div className="discover-body">
              <IonIcon icon={copy.icon} className="discover-icon" />
              <h2 className="discover-title">{copy.title}</h2>
              <ul className="discover-lines">
                {copy.lines.map(line => <li key={line}>{line}</li>)}
              </ul>
              <IonButton expand="block" onClick={handleInterested} disabled={sending} className="discover-cta">
                {sending ? <IonSpinner name="dots" /> : 'Me interesa'}
              </IonButton>
            </div>
          )}
        </IonContent>
      </IonModal>
      <IonToast {...toastProps} />
    </>
  );
};

export default DiscoverProductModal;
