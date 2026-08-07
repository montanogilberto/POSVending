import React from 'react';
import { IonCard } from '@ionic/react';

/** Tarjeta ámbar de aviso (bop-alert-card). */
const AlertCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <IonCard className="bop-alert-card">{children}</IonCard>
);

export default AlertCard;
