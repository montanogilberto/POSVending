import React from 'react';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonItem, IonLabel, IonList, IonNote } from '@ionic/react';
import { fmtInt, percent } from '../../../../utils/format';
import type { WhatsAppAgentDashboard } from '../../../../api/whatsappAgentApi';

interface Props { d: WhatsAppAgentDashboard }

/** ¿Dónde? — per business number / branch the customer wrote to. */
const BranchesCard: React.FC<Props> = ({ d }) => {
  if (d.branches.length === 0) return null;
  const total = d.branches.reduce((s, b) => s + b.messages, 0);

  return (
    <IonCard className="wa-agent-card">
      <IonCardHeader><IonCardTitle>¿Dónde?</IonCardTitle></IonCardHeader>
      <IonCardContent>
        <IonList lines="full">
          {d.branches.map(b => (
            <IonItem key={b.branchId ?? 'none'}>
              <IonLabel>
                <h3>{b.branchName || (b.branchId ? `Sucursal ${b.branchId}` : 'Número general del negocio')}</h3>
                <p>
                  {fmtInt(b.customers)} clientes · {fmtInt(b.messages)} mensajes
                  {b.failures > 0 ? ` · ${fmtInt(b.failures)} sin responder` : ''}
                </p>
              </IonLabel>
              <IonNote slot="end">{percent(b.messages, total)}%</IonNote>
            </IonItem>
          ))}
        </IonList>
      </IonCardContent>
    </IonCard>
  );
};

export default BranchesCard;
