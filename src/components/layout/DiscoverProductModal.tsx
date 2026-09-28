import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
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
      'Actívalo ahora; antes de tu primer préstamo verificamos tu identificación y firmas pagaré y contrato.',
    ],
    followUpTitle: 'Interesado en SmartLoans',
  },
  factory: {
    title: 'Factory AI Software',
    icon: sparklesOutline,
    lines: [
      'Software a la medida para tu negocio, construido con IA.',
      'Actívalo y envía tu primera solicitud; un asesor la revisa contigo.',
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
 * Promotion is not membership: this modal never grants a capability.
 * "Activar" opens the self-service enrollment (/enroll/:product), which does;
 * "Hablar con un asesor" only records a pending follow-up for staff.
 */
const DiscoverProductModal: React.FC<Props> = ({ product, companyId, clientId, userId, onClose }) => {
  const history = useHistory();
  const [sending, setSending] = useState(false);
  const { showToast, toastProps } = useToast();
  const copy = product ? COPY[product] : null;

  const handleActivate = () => {
    if (!product) return;
    onClose();
    history.push(`/enroll/${product}`);
  };

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
              <IonButton expand="block" onClick={handleActivate} disabled={sending} className="discover-cta">
                Activar
              </IonButton>
              <IonButton expand="block" fill="clear" onClick={handleInterested} disabled={sending} className="discover-cta">
                {sending ? <IonSpinner name="dots" /> : 'Hablar con un asesor'}
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
