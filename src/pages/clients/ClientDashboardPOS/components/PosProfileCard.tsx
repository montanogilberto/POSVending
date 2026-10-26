import React from 'react';
import { IonAvatar, IonButton, IonCard, IonCardContent, IonCardTitle, IonChip, IonIcon, IonLabel } from '@ionic/react';
import { personCircle, callOutline, mailOutline, listOutline } from 'ionicons/icons';
import { mxDate } from '../../../../utils/format';
import { CAPABILITY_LABEL } from '../ClientDashboardPOSConstants';
import { ClientDashboardPOSVM } from '../ClientDashboardPOSLogic';

const PosProfileCard: React.FC<{ vm: ClientDashboardPOSVM }> = ({ vm }) => {
  const c = vm.client;
  return (
    <IonCard className={`cpos-card${c?.isActive === false ? ' cpos-card--inactive' : ''}`}>
      <IonCardContent className="cpos-card-content">
        <div className="cpos-profile-row">
          {vm.selfieUrl ? (
            <IonAvatar className="cpos-avatar-photo">
              <img src={vm.selfieUrl} alt={vm.fullName} />
            </IonAvatar>
          ) : (
            <IonIcon icon={personCircle} className="cpos-avatar" />
          )}
          <div className="cpos-profile-main">
            <IonCardTitle className="cpos-name">{vm.fullName}</IonCardTitle>
            <p className="cpos-subtitle">{c?.email || 'Sin correo registrado'}</p>
            <div className="cpos-meta-row">
              <span className="cpos-meta-badge">
                <span className="cpos-meta-label">ID</span>
                <span className="cpos-meta-value">#{vm.clientId}</span>
              </span>
              <span className="cpos-meta-badge">
                <span className="cpos-meta-label">Teléfono</span>
                <span className="cpos-meta-value">{c?.cellphone || '—'}</span>
              </span>
              <span className="cpos-meta-badge">
                <span className="cpos-meta-label">Tipo</span>
                <span className="cpos-meta-value">{vm.typeLabel}</span>
              </span>
              <span className="cpos-meta-badge">
                <span className="cpos-meta-label">Creado</span>
                <span className="cpos-meta-value">{mxDate(c?.created_At)}</span>
              </span>
              {c?.updated_at && (
                <span className="cpos-meta-badge">
                  <span className="cpos-meta-label">Actualizado</span>
                  <span className="cpos-meta-value">{mxDate(c.updated_at)}</span>
                </span>
              )}
              <span className={`cpos-meta-badge${c?.isActive === false ? ' cpos-meta-badge--inactive' : ' cpos-meta-badge--active'}`}>
                <span className="cpos-meta-value">{c?.isActive === false ? 'Inactivo' : 'Activo'}</span>
              </span>
            </div>
          </div>
        </div>

        {vm.capabilities.length > 0 && (
          <div className="cpos-caps">
            <span className="cpos-meta-label">Productos</span>
            <div className="cpos-caps-row">
              {vm.capabilities.map((cap) => (
                <IonChip key={cap.clientCapabilityId} className="cpos-cap-chip">
                  <IonLabel>{CAPABILITY_LABEL[cap.capability] ?? cap.capability}</IonLabel>
                </IonChip>
              ))}
            </div>
          </div>
        )}

        <div className="cpos-profile-actions">
          {c?.cellphone && (
            <IonButton fill="outline" size="small" color="success" href={`tel:${c.cellphone}`} className="cpos-action">
              <IonIcon icon={callOutline} slot="start" /> Llamar
            </IonButton>
          )}
          {c?.email && (
            <IonButton fill="outline" size="small" color="primary" href={`mailto:${c.email}`} className="cpos-action">
              <IonIcon icon={mailOutline} slot="start" /> Correo
            </IonButton>
          )}
          <IonButton fill="outline" size="small" color="medium" onClick={vm.openInClients} className="cpos-action">
            <IonIcon icon={listOutline} slot="start" /> Ver en lista
          </IonButton>
        </div>
      </IonCardContent>
    </IonCard>
  );
};

export default PosProfileCard;
