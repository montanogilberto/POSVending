/**
 * MyLoansView — sólo presentación (MVVM). Todo viene de useMyLoans().
 */
import React from 'react';
import {
  IonPage, IonContent, IonToast, IonSegment, IonSegmentButton, IonLabel,
  IonSearchbar, IonSpinner, IonButton, IonIcon,
} from '@ionic/react';
import { refreshOutline, walletOutline } from 'ionicons/icons';
import Header from '../../../components/layout/Header';
import AlertPopover from '../../../components/popovers/AlertPopover';
import MailPopover from '../../../components/popovers/MailPopover';
import { usePopovers } from '../../../hooks/usePopovers';
import { useToast } from '../../../hooks/useToast';
import EmptyState from '../../../components/ui/EmptyState';
import { LOAN_FILTERS, LoanFilter } from './MyLoansConstants';
import { useMyLoans } from './MyLoansLogic';
import PortfolioSummary from './components/PortfolioSummary';
import LoanCard from './components/LoanCard';

const MyLoansView: React.FC = () => {
  const vm = useMyLoans();
  const pops = usePopovers();
  const { toastProps } = useToast();

  return (
    <IonPage>
      <Header {...pops.headerProps} screenTitle="Mis préstamos" />
      <AlertPopover {...pops.alertPopoverProps} />
      <MailPopover {...pops.mailPopoverProps} />

      <IonContent className="ml-content">
        <IonToast {...toastProps} />

        <div className="ml-toolbar">
          <span className="ml-count">
            {vm.loans.length} {vm.loans.length === 1 ? 'préstamo' : 'préstamos'}
            {vm.totals.closedCount > 0 && ` · ${vm.totals.closedCount} cerrado${vm.totals.closedCount === 1 ? '' : 's'}`}
          </span>
          <IonButton fill="clear" size="small" disabled={vm.loading} onClick={() => vm.load()}>
            {vm.loading ? <IonSpinner name="dots" /> : <><IonIcon icon={refreshOutline} slot="start" /> Actualizar</>}
          </IonButton>
        </div>

        <PortfolioSummary vm={vm} />

        <IonSegment
          className="ml-filters"
          value={vm.filter}
          onIonChange={e => vm.setFilter(e.detail.value as LoanFilter)}
        >
          {LOAN_FILTERS.map(f => (
            <IonSegmentButton key={f.key} value={f.key}>
              <IonLabel>{f.label}</IonLabel>
            </IonSegmentButton>
          ))}
        </IonSegment>

        <IonSearchbar
          className="ml-search"
          value={vm.search}
          debounce={200}
          placeholder="Buscar por folio, contraparte o estado"
          onIonInput={e => vm.setSearch(e.detail.value ?? '')}
        />

        {vm.loading && vm.loans.length === 0 && (
          <div className="ml-loading"><IonSpinner name="crescent" /></div>
        )}

        {!vm.loading && vm.visibleLoans.length === 0 && (
          <EmptyState
            className="ml-empty"
            icon={walletOutline}
            text={vm.loans.length === 0
              ? (vm.isLender
                  ? 'Aún no has fondeado ningún préstamo.'
                  : 'Aún no tienes préstamos.')
              : 'Ningún préstamo coincide con este filtro.'}
          />
        )}

        {vm.visibleLoans.map(loan => (
          <LoanCard key={loan.loanId} loan={loan} vm={vm} />
        ))}
      </IonContent>
    </IonPage>
  );
};

export default MyLoansView;
