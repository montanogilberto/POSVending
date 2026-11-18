import React from 'react';
import {
  IonAccordion, IonAccordionGroup, IonActionSheet, IonBadge, IonButton, IonCard, IonChip, IonContent, IonFab,
  IonFabButton, IonIcon, IonItem, IonLabel, IonPage, IonSearchbar, IonSegment, IonSegmentButton, IonSelect,
  IonSelectOption, IonToast,
} from '@ionic/react';
import {
  addOutline, alertCircleOutline, chevronCollapseOutline, chevronExpandOutline, ellipsisVertical,
  hardwareChipOutline, linkOutline, lockClosedOutline, optionsOutline, peopleOutline, sparklesOutline, star,
  starOutline,
} from 'ionicons/icons';
import Header from '../../../components/layout/Header';
import AlertPopover from '../../../components/popovers/AlertPopover';
import MailPopover from '../../../components/popovers/MailPopover';
import EmptyState from '../../../components/ui/EmptyState';
import PageLoading from '../../../components/ui/PageLoading';
import StatusBadge from '../../../components/ui/StatusBadge';
import { AGENT_STATUS } from '../../../components/ui/statusMaps';
import { usePopovers } from '../../../hooks/usePopovers';
import { IS_DEV_BUILD, APP_ENV } from '../../../utils/appEnv';
import type { Agent } from '../../../api/agentApi';
import { AREA_META, AREAS, STATUS_FILTERS, agentIcon, type StatusFilter } from './AgentConstants';
import { useAgent, type AgentVM } from './AgentLogic';
import AgentDetailModal from './components/AgentDetailModal';

const AgentCard: React.FC<{ agent: Agent; vm: AgentVM }> = ({ agent, vm }) => {
  const tone = AREA_META[agent.area]?.tone ?? 'other';
  const customized = vm.isCustomized(agent);
  return (
    <IonCard button onClick={() => vm.openDetail(agent)}
      className={`agent-card${agent.status === 'retirado' ? ' agent-card-retired' : ''}`}>
      <div className="agent-card-body">
        <div className={`agent-icon-tile agent-tone-${tone}`}>
          <IonIcon icon={agentIcon(agent)} />
        </div>
        <div className="agent-card-main">
          <div className="agent-card-top">
            <h3 className="agent-card-title">{agent.name}</h3>
            <StatusBadge status={agent.status} map={AGENT_STATUS} className="agent-status" />
          </div>
          {agent.description && <p className="agent-card-description">{agent.description}</p>}
          <div className="agent-card-chips">
            {agent.customerFacing ? (
              <IonChip className="agent-chip agent-chip-primary">
                <IonIcon icon={peopleOutline} /><IonLabel>Atiende clientes</IonLabel>
              </IonChip>
            ) : (
              <IonChip className="agent-chip agent-chip-primary">
                <IonIcon icon={lockClosedOutline} /><IonLabel>Interno</IonLabel>
              </IonChip>
            )}
            <IonChip className="agent-chip">
              <IonIcon icon={customized ? star : starOutline} />
              <IonLabel>{customized ? 'Personalizado' : 'Predeterminado'}</IonLabel>
            </IonChip>
          </div>
        </div>
      </div>
      <div className="agent-card-footer">
        {agent.model && (
          <span className="agent-meta">
            <IonIcon icon={hardwareChipOutline} />{agent.model}
          </span>
        )}
        {agent.model && <span className="agent-meta-divider" />}
        <span className="agent-meta agent-meta-endpoint">
          <IonIcon icon={linkOutline} />{agent.endpoint}
        </span>
        <IonButton fill="outline" shape="round" size="small" className="agent-more" aria-label="Opciones"
          onClick={e => { e.stopPropagation(); vm.setActionsFor(agent); }}>
          <IonIcon slot="icon-only" icon={ellipsisVertical} />
        </IonButton>
      </div>
    </IonCard>
  );
};

const AgentView: React.FC = () => {
  const vm = useAgent();
  const pops = usePopovers();

  let body: React.ReactNode;
  if (vm.loading) {
    body = <PageLoading text="Cargando agentes…" />;
  } else if (vm.loadError) {
    body = (
      <EmptyState icon={alertCircleOutline} text="No se pudo cargar el catálogo de agentes."
        action={<IonButton fill="outline" onClick={vm.load}>Reintentar</IonButton>} />
    );
  } else if (vm.groups.length === 0) {
    body = <EmptyState icon={sparklesOutline} text="No hay agentes con estos filtros." />;
  } else {
    body = (
      <>
        {!vm.autoExpand && (
          <div className="agent-groups-toolbar">
            <IonButton fill="clear" size="small" onClick={vm.toggleAllGroups}>
              <IonIcon icon={vm.allExpanded ? chevronCollapseOutline : chevronExpandOutline} slot="start" />
              {vm.allExpanded ? 'Contraer todo' : 'Expandir todo'}
            </IonButton>
          </div>
        )}
        <IonAccordionGroup multiple value={vm.expandedGroups} className="agent-accordions"
          onIonChange={e => { if (e.target === e.currentTarget) vm.setExpandedGroups(e.detail.value); }}>
          {vm.groups.map(group => (
            <IonAccordion key={group.value} value={group.value} className="agent-group">
              <IonItem slot="header" lines="none" className="agent-group-header">
                <IonIcon icon={group.icon} slot="start" className={`agent-group-icon agent-tone-${group.tone}`} />
                <IonLabel className="agent-group-title">
                  {group.label}
                  <span className="agent-group-count">
                    ({group.agents.length} {group.agents.length === 1 ? 'agente' : 'agentes'})
                  </span>
                </IonLabel>
              </IonItem>
              <div slot="content" className="agent-grid">
                {group.agents.map(agent => <AgentCard key={agent.agentId} agent={agent} vm={vm} />)}
              </div>
            </IonAccordion>
          ))}
        </IonAccordionGroup>
      </>
    );
  }

  return (
    <IonPage>
      <Header {...pops.headerProps} screenTitle="Agentes IA" />
      <AlertPopover {...pops.alertPopoverProps} />
      <MailPopover {...pops.mailPopoverProps} />
      <IonContent fullscreen className="agent-page">
        <div className="agent-container">
          <div className="agent-hero">
            <div className="agent-hero-icon"><IonIcon icon={sparklesOutline} /></div>
            <div className="agent-hero-text">
              <h1 className="agent-hero-title">
                Agentes IA
                {IS_DEV_BUILD && <IonBadge className="agent-env-badge">{APP_ENV.toUpperCase()}</IonBadge>}
              </h1>
              <p className="agent-hero-subtitle">Administración de agentes inteligentes del ecosistema GMO</p>
            </div>
            <IonButton fill="outline" routerLink="/ai-agents/settings" className="agent-settings-link">
              <IonIcon icon={optionsOutline} slot="start" /> Ajustes para mi empresa
            </IonButton>
          </div>

          <div className="agent-toolbar">
            <div className="agent-summary">
              <span className="agent-summary-total">
                <IonIcon icon={sparklesOutline} />
                {vm.totals.all} {vm.totals.all === 1 ? 'agente registrado' : 'agentes registrados'}
              </span>
              <span className="agent-summary-divider" />
              <span className="agent-summary-status">
                <span className="agent-dot" />
                {vm.totals.active} {vm.totals.active === 1 ? 'activo' : 'activos'}
                {' · '}
                {vm.totals.retired} {vm.totals.retired === 1 ? 'retirado' : 'retirados'}
              </span>
            </div>
            <IonSearchbar value={vm.search} debounce={200} placeholder="Buscar agentes…" className="agent-search"
              onIonInput={e => vm.setSearch(String(e.detail.value ?? ''))} />
            <IonSelect value={vm.area} interface="popover" aria-label="Área" className="agent-select"
              onIonChange={e => vm.setArea(e.detail.value)}>
              <IonSelectOption value="all">Todas las áreas</IonSelectOption>
              {AREAS.map(a => <IonSelectOption key={a.value} value={a.value}>{a.label}</IonSelectOption>)}
            </IonSelect>
            <IonSelect value={vm.status} interface="popover" aria-label="Estado" className="agent-select"
              onIonChange={e => vm.setStatus(e.detail.value as StatusFilter)}>
              {STATUS_FILTERS.map(s => <IonSelectOption key={s.value} value={s.value}>{s.label}</IonSelectOption>)}
            </IonSelect>
          </div>

          <IonSegment scrollable value={vm.area} className="agent-tabs"
            onIonChange={e => vm.setArea(e.detail.value as typeof vm.area)}>
            <IonSegmentButton value="all" layout="icon-start">
              <IonLabel>Todas ({vm.areaCounts.all ?? 0})</IonLabel>
            </IonSegmentButton>
            {AREAS.map(a => (
              <IonSegmentButton key={a.value} value={a.value} layout="icon-start">
                <IonIcon icon={a.icon} className={`agent-tone-${a.tone}`} />
                <IonLabel>{a.label} ({vm.areaCounts[a.value] ?? 0})</IonLabel>
              </IonSegmentButton>
            ))}
          </IonSegment>

          {body}
        </div>

        {vm.canEditCatalog && (
          <IonFab vertical="bottom" horizontal="end" slot="fixed">
            <IonFabButton onClick={vm.openCreate} aria-label="Nuevo agente">
              <IonIcon icon={addOutline} />
            </IonFabButton>
          </IonFab>
        )}

        <IonActionSheet isOpen={!!vm.actionsFor} header={vm.actionsFor?.name} buttons={vm.actionButtons}
          onDidDismiss={() => vm.setActionsFor(null)} />
        <AgentDetailModal vm={vm} />
        <IonToast {...vm.toastProps} />
      </IonContent>
    </IonPage>
  );
};

export default AgentView;
