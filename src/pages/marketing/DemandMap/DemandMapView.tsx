import React from 'react';
import {
  IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent, IonHeader,
  IonLabel, IonMenuButton, IonPage, IonRefresher, IonRefresherContent, IonSegment,
  IonSegmentButton, IonSelect, IonSelectOption, IonSpinner, IonTitle, IonToast, IonToolbar,
} from '@ionic/react';
import { alertCircleOutline, mapOutline } from 'ionicons/icons';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import EmptyState from '../../../components/ui/EmptyState';
import type { DemandMapVM } from './DemandMapLogic';
import type { HostStatus } from '../../../api/locationHostsApi';
import {
  BUSINESS_TYPE_LABEL, CONCEPT_LABEL, type ConceptFilter, HERMOSILLO_CENTER, HERMOSILLO_ZOOM, HOST_STATUSES,
  HOST_STATUS_LABEL, PERIOD_OPTIONS, SPACE_LABEL, TIME_LABEL, VISITORS_LABEL,
} from './DemandMapConstants';

const radiusFor = (people: number, max: number) => 8 + 22 * Math.sqrt(people / max);

const DemandMapView: React.FC<{ vm: DemandMapVM }> = ({ vm }) => (
  <IonPage>
    <IonHeader>
      <IonToolbar>
        <IonButtons slot="start"><IonMenuButton /></IonButtons>
        <IonTitle>Mapa de demanda</IonTitle>
      </IonToolbar>
    </IonHeader>
    <IonContent className="dmap-content">
      <IonRefresher slot="fixed" onIonRefresh={e => { vm.reload().finally(() => e.detail.complete()); }}>
        <IonRefresherContent />
      </IonRefresher>

      <div className="dmap-filters">
        <IonSegment value={vm.concept} onIonChange={e => vm.setConcept(e.detail.value as ConceptFilter)}
                    disabled={vm.loading}>
          <IonSegmentButton value="todos"><IonLabel>Todos</IonLabel></IonSegmentButton>
          {(Object.keys(CONCEPT_LABEL) as (keyof typeof CONCEPT_LABEL)[]).map(c => (
            <IonSegmentButton key={c} value={c}><IonLabel>{CONCEPT_LABEL[c]}</IonLabel></IonSegmentButton>
          ))}
        </IonSegment>
        <IonSegment value={String(vm.periodDays)} onIonChange={e => vm.setPeriodDays(Number(e.detail.value))}
                    disabled={vm.loading}>
          {PERIOD_OPTIONS.map(p => (
            <IonSegmentButton key={p.days} value={String(p.days)}><IonLabel>{p.label}</IonLabel></IonSegmentButton>
          ))}
        </IonSegment>
      </div>

      {vm.loading && (
        <div className="dmap-loading">
          <IonSpinner name="crescent" />
          <span>Cargando demanda…</span>
        </div>
      )}

      {!vm.loading && vm.error && <EmptyState icon={alertCircleOutline} text={vm.error} />}

      {!vm.loading && !vm.error && vm.zones.length === 0 && vm.hosts.length === 0 && (
        <EmptyState icon={mapOutline}
                    text="Todavía no hay señales de demanda ni negocios en este periodo. Se registran cuando el agente de WhatsApp conversa con alguien interesado." />
      )}

      {!vm.loading && !vm.error && (vm.zones.length > 0 || vm.hosts.length > 0) && (
        <>
          <IonCard className="dmap-card">
            <IonCardHeader><IonCardTitle>Calidad de la demanda</IonCardTitle></IonCardHeader>
            <IonCardContent>
              <div className="dmap-funnel">
                <div className="dmap-kpi"><strong>{vm.funnel.signals}</strong><span>Necesidades identificadas</span></div>
                <div className="dmap-kpi"><strong>{vm.funnel.optIns}</strong><span>Aceptaron aviso</span></div>
                <div className="dmap-kpi"><strong>{vm.funnel.registered}</strong><span>Ya son clientes</span></div>
                <div className="dmap-kpi dmap-kpi--high"><strong>{vm.funnel.highIntent}</strong><span>Intención alta</span></div>
              </div>
              {vm.truncated && <p className="dmap-note">Se muestran las 500 señales más recientes; acorta el periodo para ver todas.</p>}
            </IonCardContent>
          </IonCard>

          <div className="dmap-map">
            <MapContainer center={HERMOSILLO_CENTER} zoom={HERMOSILLO_ZOOM} scrollWheelZoom>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {vm.mappedZones.map(z => (
                <CircleMarker key={`${z.concept}-${z.zoneName}`} center={[z.lat as number, z.lng as number]}
                              radius={radiusFor(z.people, vm.maxPeople)}
                              pathOptions={{ className: `dmap-circle dmap-circle--${z.concept}` }}>
                  <Popup>
                    <strong>{z.zoneName}</strong> · {CONCEPT_LABEL[z.concept]}
                    <div>{z.people} persona(s) · {z.alta} con intención alta</div>
                    {z.topPreferredTime && <div>Horario: {TIME_LABEL[z.topPreferredTime] ?? z.topPreferredTime}</div>}
                  </Popup>
                </CircleMarker>
              ))}
              {vm.mappedHosts.map(h => (
                <CircleMarker key={`host-${h.locationHostId}`} center={[h.zoneLat as number, h.zoneLng as number]}
                              radius={7} pathOptions={{ className: `dmap-host dmap-host--${h.status}` }}>
                  <Popup>
                    <strong>{h.businessName}</strong> · {HOST_STATUS_LABEL[h.status]}
                    <div>{h.zoneName ?? h.zoneText}{h.businessType ? ` · ${BUSINESS_TYPE_LABEL[h.businessType] ?? h.businessType}` : ''}</div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
          <p className="dmap-note">Círculos grandes: demanda por zona (solo zonas con 3 personas o más; las demás se agrupan en "otras zonas"). Puntos oscuros: negocios que ofrecen espacio.</p>

          <IonCard className="dmap-card">
            <IonCardHeader><IonCardTitle>Demanda por zona</IonCardTitle></IonCardHeader>
            <IonCardContent>
              <div className="dmap-table">
                <div className="dmap-row dmap-row--head">
                  <span>Zona</span><span>Servicio</span><span>Personas</span><span>Alta</span>
                  <span>Recurrente</span><span>Horario</span><span>Nuevos</span><span>Aviso</span>
                </div>
                {vm.zones.map(z => (
                  <div key={`${z.concept}-${z.zoneName}`} className="dmap-row">
                    <span>{z.zoneName}</span>
                    <span>{CONCEPT_LABEL[z.concept]}</span>
                    <span>{z.people}</span>
                    <span>{z.alta}</span>
                    <span>{z.pctRecurring != null ? `${z.pctRecurring}%` : '—'}</span>
                    <span>{z.topPreferredTime ? (TIME_LABEL[z.topPreferredTime] ?? z.topPreferredTime) : '—'}</span>
                    <span>{z.newProspects}</span>
                    <span>{z.optIns}</span>
                  </div>
                ))}
              </div>
            </IonCardContent>
          </IonCard>

          <IonCard className="dmap-card">
            <IonCardHeader><IonCardTitle>Negocios que ofrecen espacio ({vm.hosts.length})</IonCardTitle></IonCardHeader>
            <IonCardContent>
              {vm.hosts.length === 0 && <p className="dmap-note">Aún no hay negocios interesados en poner un locker.</p>}
              {vm.hosts.map(h => (
                <div key={h.locationHostId} className="dmap-host-row">
                  <div className="dmap-host-info">
                    <strong>{h.businessName}</strong>
                    <span>
                      {[h.businessType && (BUSINESS_TYPE_LABEL[h.businessType] ?? h.businessType),
                        h.zoneName ?? h.zoneText,
                        h.opensWeekends != null && (h.opensWeekends ? 'abre fines de semana' : 'no abre fines de semana'),
                        h.spaceType && SPACE_LABEL[h.spaceType],
                        h.dailyVisitors && VISITORS_LABEL[h.dailyVisitors]].filter(Boolean).join(' · ')}
                    </span>
                    <span>
                      {h.contactName ?? 'Sin nombre'}{h.contactRole ? ` (${h.contactRole})` : ''} · {h.contactPhone}
                      {h.contactOptIn ? ' · acepta contacto' : ' · sin permiso de contacto'}
                    </span>
                  </div>
                  <div className="dmap-host-status">
                    {vm.savingHostId === h.locationHostId ? <IonSpinner name="dots" /> : (
                      <IonSelect value={h.status} interface="popover" aria-label="Estado"
                                 disabled={vm.savingHostId !== null}
                                 onIonChange={e => vm.changeHostStatus(h, e.detail.value as HostStatus)}>
                        {HOST_STATUSES.map(st => (
                          <IonSelectOption key={st} value={st}>{HOST_STATUS_LABEL[st]}</IonSelectOption>
                        ))}
                      </IonSelect>
                    )}
                  </div>
                </div>
              ))}
            </IonCardContent>
          </IonCard>
        </>
      )}
      <IonToast {...vm.toastProps} />
    </IonContent>
  </IonPage>
);

export default DemandMapView;
