import React from 'react';
import { IonCard, IonIcon } from '@ionic/react';
import { checkmarkCircle } from 'ionicons/icons';

interface DoneCardProps {
  title: string;
  subtitle?: string;
}

/** Tarjeta verde de paso completado (bop-done-card). */
const DoneCard: React.FC<DoneCardProps> = ({ title, subtitle }) => (
  <IonCard className="bop-done-card">
    <IonIcon icon={checkmarkCircle} color="success" />
    <div>
      <strong>{title}</strong>
      {subtitle && <p>{subtitle}</p>}
    </div>
  </IonCard>
);

export default DoneCard;
