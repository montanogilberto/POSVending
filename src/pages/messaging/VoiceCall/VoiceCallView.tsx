import React from 'react';
import {
  IonPage, IonContent, IonLoading, IonToast, IonList, IonItem, IonLabel,
  IonBadge, IonSegment, IonSegmentButton, IonModal, IonButton, IonIcon,
  IonInfiniteScroll, IonInfiniteScrollContent, IonItemDivider
} from '@ionic/react';
import Header from '../../../components/layout/Header';
import { useVoiceCall, VoiceCallVM } from './VoiceCallLogic';
import { checkmark, callOutline, calendarOutline, personOutline, chevronForward } from 'ionicons/icons';
import StatusBadge from '../../../components/ui/StatusBadge';
import EmptyState from '../../../components/ui/EmptyState';
import { toHermosillo } from '../../../utils/format';

const VoiceCallDetailModal: React.FC<{ vm: VoiceCallVM }> = ({ vm }) => {
  if (!vm.selectedCall) return null;

  const call = vm.selectedCall;

  // Prepare timeline data
  const timelineEvents = [
    { label: 'Llamada iniciada', date: call.created_At, icon: callOutline },
  ];

  if (call.callStatus && call.callStatus !== 'queued') {
    timelineEvents.push({ label: `Estado: ${vm.callStatusMap[call.callStatus]?.label || call.callStatus}`, date: call.updated_at || call.created_At, icon: callOutline });
  }
  if (call.identityConfirmed) {
    timelineEvents.push({ label: 'Identidad confirmada', date: call.updated_at || call.created_At, icon: personOutline });
  }
  if (call.agreementStatus && call.agreementStatus !== 'none') {
    timelineEvents.push({ label: `Acuerdo: ${vm.agreementStatusMap[call.agreementStatus]?.label || call.agreementStatus}`, date: call.confirmedAt || call.updated_at || call.created_At, icon: checkmark });
  }
  if (call.confirmedAt) {
    timelineEvents.push({ label: 'Confirmado por WhatsApp', date: call.confirmedAt, icon: checkmark });
  }

  return (
    <IonModal
      isOpen={vm.showDetailModal}
      onDidDismiss={vm.closeDetailModal}
      className="voice-calls-detail-modal"
    >
      <Header screenTitle="Detalle de Llamada" showBackButton={true} backButtonHref="/voice-calls" {...vm.pops.headerProps} />
      <IonContent fullscreen className="voice-calls-detail-content">
        <IonList className="voice-calls-detail-list">
          <IonItem lines="full">
            <IonLabel>
              <h2>{call.clientFirstName} {call.clientLastName}</h2>
              <p>Orden ID: {call.orderId}</p>
            </IonLabel>
          </IonItem>
          <IonItem>
            <IonLabel>
              <h3>Estado de Llamada</h3>
              <StatusBadge status={call.callStatus} map={vm.callStatusMap} className="voice-calls-badge" />
            </IonLabel>
          </IonItem>
          <IonItem>
            <IonLabel>
              <h3>Estado de Acuerdo</h3>
              <StatusBadge status={call.agreementStatus} map={vm.agreementStatusMap} className="voice-calls-badge" />
            </IonLabel>
          </IonItem>
          {call.durationSeconds !== null && (
            <IonItem>
              <IonLabel>Duración:</IonLabel>
              <IonBadge slot="end" color="medium">{call.durationSeconds} seg.</IonBadge>
            </IonItem>
          )}
          {call.endedBy && (
            <IonItem>
              <IonLabel>Finalizada por:</IonLabel>
              <IonLabel slot="end" className="ion-text-right">{call.endedBy}</IonLabel>
            </IonItem>
          )}
          <IonItem>
            <IonLabel>Identidad Confirmada:</IonLabel>
            <IonIcon slot="end" icon={call.identityConfirmed ? checkmark : undefined} color={call.identityConfirmed ? "success" : "danger"} />
          </IonItem>
          {call.promptVersion && (
            <IonItem>
              <IonLabel>Versión del Prompt:</IonLabel>
              <IonLabel slot="end" className="ion-text-right">{call.promptVersion}</IonLabel>
            </IonItem>
          )}
          {call.agreementRevision !== null && (
            <IonItem>
              <IonLabel>Revisión de Acuerdo:</IonLabel>
              <IonLabel slot="end" className="ion-text-right">{call.agreementRevision}</IonLabel>
            </IonItem>
          )}
          {call.agreementJson && vm.formatAgreementSentence(call.agreementJson) && (
            <IonItem>
              <IonLabel className="ion-text-wrap">
                <h3>Acuerdo</h3>
                <p>{vm.formatAgreementSentence(call.agreementJson)}</p>
              </IonLabel>
            </IonItem>
          )}
          {call.staffReason && (
            <IonItem>
              <IonLabel className="ion-text-wrap">
                <h3>Razón para Staff</h3>
                <p>{call.staffReason}</p>
              </IonLabel>
            </IonItem>
          )}

          <IonItemDivider className="ion-margin-top">Historial de Llamada</IonItemDivider>
          {timelineEvents
            .sort((a, b) => new Date(a.date || '').getTime() - new Date(b.date || '').getTime())
            .map((event, index) => {
              return (
                <IonItem key={index}>
                  <IonIcon icon={event.icon} slot="start" color="medium" />
                  <IonLabel>
                    <h3>{event.label}</h3>
                    <p>{toHermosillo(event.date || undefined)}</p>
                  </IonLabel>
                </IonItem>
              );
            })}
        </IonList>
      </IonContent>
    </IonModal>
  );
};

const VoiceCallView: React.FC = () => {
  const vm = useVoiceCall();

  return (
    <IonPage>
      <Header screenTitle="Llamadas de voz" showBackButton={true} backButtonHref="/dashboard" {...vm.pops.headerProps} />
      <IonContent fullscreen className="voice-calls-content">
        <IonLoading isOpen={(vm.loading && vm.items.length === 0) || vm.detailLoading} message={vm.detailLoading ? 'Cargando detalle...' : 'Cargando llamadas...'} />
        <IonToast {...vm.toastProps} />

        <IonSegment value={vm.filter} onIonChange={(e: CustomEvent) => vm.handleFilterChange(e.detail.value as VoiceCallVM['filter'])} className="voice-calls-segment">
          <IonSegmentButton value="all">
            <IonLabel>Todas</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="pending">
            <IonLabel>Por confirmar</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="confirmed">
            <IonLabel>Confirmadas</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="needsStaff">
            <IonLabel>Requieren atención</IonLabel>
          </IonSegmentButton>
        </IonSegment>

        {vm.items.length === 0 && !vm.loading ? (
          <EmptyState icon={callOutline} text="No hay llamadas de voz para mostrar con el filtro actual." />
        ) : (
          <IonList className="voice-calls-list">
            {vm.items.map((call) => {
              return (
                <IonItem key={call.voiceCallId} button onClick={() => vm.openDetailModal(call.voiceCallId)} detail={false} className="voice-calls-item">
                  <IonIcon icon={callOutline} slot="start" color="medium" />
                  <IonLabel className="voice-calls-item-label">
                    <h3>{call.clientFirstName} {call.clientLastName}</h3>
                    <p>Orden ID: {call.orderId}</p>
                    <div className="voice-calls-status-badges">
                      <StatusBadge status={call.callStatus} map={vm.callStatusMap} className="voice-calls-item-badge" />
                      <StatusBadge status={call.agreementStatus} map={vm.agreementStatusMap} className="voice-calls-item-badge" />
                    </div>
                    {call.confirmedAt && (
                      <p><IonIcon icon={calendarOutline} /> {toHermosillo(call.confirmedAt)}</p>
                    )}
                  </IonLabel>
                  <IonIcon icon={chevronForward} slot="end" color="medium" />
                </IonItem>
              );
            })}
          </IonList>
        )}

        <IonInfiniteScroll
          onIonInfinite={(ev: CustomEvent<void>) => {
            vm.loadMoreItems();
            (ev.target as HTMLIonInfiniteScrollElement).complete();
          }}
          threshold="100px"
          disabled={!vm.hasMore}
        >
          <IonInfiniteScrollContent loadingSpinner="dots" loadingText="Cargando más llamadas..." />
        </IonInfiniteScroll>
      </IonContent>

      <VoiceCallDetailModal vm={vm} />
    </IonPage>
  );
};

export default VoiceCallView;
