import React, { useState, useEffect, useMemo } from 'react';
import {
  IonPage,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonModal,
  IonToast,
  IonLoading,
  IonFab,
  IonFabButton,
  IonIcon,
  IonAlert,
  IonSearchbar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonText,
  IonSelect,
  IonSelectOption
} from '@ionic/react';
import { InputInputEventDetail, SearchbarInputEventDetail, SelectChangeEventDetail } from '@ionic/core';
import { addOutline, trashOutline, createOutline, personCircleOutline } from 'ionicons/icons';
import Header from '../components/Header';
import AlertPopover from '../components/PopOver/AlertPopover';
import MailPopover from '../components/PopOver/MailPopover';
import { Loan, getAllLoans, createLoan, updateLoan, deleteLoan } from '../api/loanApi';
import ClientSelector from '../components/ClientSelector';

const toHermosillo = (utc: string | undefined): string => {
  if (!utc) return '';
  const d = new Date(utc.includes('Z') ? utc : utc + 'Z');
  return new Date(d.getTime() - 7 * 60 * 60 * 1000).toLocaleString();
};

const LoanPage: React.FC = () => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingLoan, setEditingLoan] = useState<Partial<Loan> | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState<boolean>(false);
  const [selectedLoanToDelete, setSelectedLoanToDelete] = useState<Loan | null>(null);
  const [popoverState, setPopoverState] = useState<{
    showAlertPopover: boolean;
    showMailPopover: boolean;
    event?: Event;
  }>({ showAlertPopover: false, showMailPopover: false });
  const [selectedClient, setSelectedClient] = useState<{ clientId: number; first_name: string; last_name: string } | null>(null);
  const [showClientSelector, setShowClientSelector] = useState(false);

  const ITEMS_PER_LOAD = 20;
  const [displayedLoans, setDisplayedLoans] = useState<Loan[]>([]);
  const [page, setPage] = useState(1);

  const companyId = 1; // Assuming a default companyId for now. In a real app, this would come from context/auth.

  const filteredLoans = useMemo(() => {
    return loans.filter((loan) =>
      loan.loanNumber.toLowerCase().includes(searchText.toLowerCase()) ||
      loan.loanStatus.toLowerCase().includes(searchText.toLowerCase()) ||
      (loan.notes && loan.notes.toLowerCase().includes(searchText.toLowerCase()))
    );
  }, [loans, searchText]);

  useEffect(() => {
    fetchLoans();
  }, [companyId]);

  useEffect(() => {
    setDisplayedLoans(filteredLoans.slice(0, ITEMS_PER_LOAD));
    setPage(1);
  }, [filteredLoans]);

  const fetchLoans = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAllLoans(companyId, searchText);
      setLoans(data);
    } catch (err) {
      setError((err as Error).message ?? 'Error al cargar préstamos');
    } finally {
      setLoading(false);
    }
  };

  const loadMoreItems = (event: CustomEvent<void>) => {
    const newPage = page + 1;
    const startIndex = (newPage - 1) * ITEMS_PER_LOAD;
    const endIndex = startIndex + ITEMS_PER_LOAD;
    const newItems = filteredLoans.slice(startIndex, endIndex);
    setDisplayedLoans((prev) => [...prev, ...newItems]);
    setPage(newPage);
    (event.target as HTMLIonInfiniteScrollElement).complete();
  };

  const handleCreateOrUpdateLoan = async () => {
    // Basic validation for required fields
    if (!editingLoan || !editingLoan.loanNumber || editingLoan.clientId === undefined || editingLoan.principalAmount === undefined || editingLoan.interestRate === undefined || editingLoan.termMonths === undefined || !editingLoan.paymentFrequency || !editingLoan.loanStatus) {
      setError('Por favor, complete todos los campos obligatorios.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // Ensure companyId is always set for new loans
      const loanDataToSend = { ...editingLoan, companyId: editingLoan.companyId || companyId };

      if (editingLoan.loanId) {
        // Update existing loan
        await updateLoan(editingLoan.loanId, loanDataToSend as Partial<Omit<Loan, 'loanId' | 'created_At' | 'updated_at'>>);
      } else {
        // Create new loan
        await createLoan(loanDataToSend as Omit<Loan, 'loanId' | 'created_At' | 'updated_at'>);
      }
      setShowModal(false);
      await fetchLoans(); // Refresh the list
    } catch (err) {
      setError((err as Error).message ?? 'Error al guardar préstamo');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLoan = async () => {
    if (!selectedLoanToDelete) return;

    setLoading(true);
    setError('');
    try {
      await deleteLoan(selectedLoanToDelete.loanId, companyId);
      setShowDeleteAlert(false);
      await fetchLoans(); // Refresh the list
    } catch (err) {
      setError((err as Error).message ?? 'Error al eliminar préstamo');
    }
    finally {
      setLoading(false);
    }
  };

  const presentCreateModal = () => {
    setEditingLoan({ companyId: companyId, principalAmount: 0, interestRate: 0, termMonths: 0 }); // Initialize with companyId and default numbers
    setSelectedClient(null);
    setShowModal(true);
  };

  const presentEditModal = (loan: Loan) => {
    setEditingLoan(loan);
    // Placeholder for client name, ideally fetch client details
    setSelectedClient({ clientId: loan.clientId, first_name: 'Cliente', last_name: `(${loan.clientId})` });
    setShowModal(true);
  };

  const dismissModal = () => {
    setShowModal(false);
    setEditingLoan(null);
    setSelectedClient(null);
  };

  const presentDeleteAlert = (loan: Loan) => {
    setSelectedLoanToDelete(loan);
    setShowDeleteAlert(true);
  };

  const dismissDeleteAlert = () => {
    setShowDeleteAlert(false);
    setSelectedLoanToDelete(null);
  };

  const handleSearchChange = (e: CustomEvent<SearchbarInputEventDetail>) => {
    setSearchText(e.detail.value || '');
  };

  const presentAlertPopover = (e: React.MouseEvent) =>
    setPopoverState({ ...popoverState, showAlertPopover: true, event: e.nativeEvent });
  const dismissAlertPopover = () =>
    setPopoverState({ ...popoverState, showAlertPopover: false });
  const presentMailPopover = (e: React.MouseEvent) =>
    setPopoverState({ ...popoverState, showMailPopover: true, event: e.nativeEvent });
  const dismissMailPopover = () =>
    setPopoverState({ ...popoverState, showMailPopover: false });

  const handleClientSelection = (client: { clientId: number; first_name: string; last_name: string }) => {
    setSelectedClient(client);
    setEditingLoan((prev) => ({ ...prev, clientId: client.clientId }));
    setShowClientSelector(false);
  };


  return (
    <IonPage>
      <Header
        presentAlertPopover={presentAlertPopover}
        presentMailPopover={presentMailPopover}
        screenTitle="Préstamos — POS GMO"
      />
      <AlertPopover
        isOpen={popoverState.showAlertPopover}
        event={popoverState.event}
        onDidDismiss={dismissAlertPopover}
      />
      <MailPopover
        isOpen={popoverState.showMailPopover}
        event={popoverState.event}
        onDidDismiss={dismissMailPopover}
      />

      <IonContent fullscreen className="ion-padding loans-page">
        <IonLoading isOpen={loading} message="Cargando préstamos..." />
        <IonToast
          isOpen={!!error}
          message={error}
          duration={3000}
          onDidDismiss={() => setError('')}
          color="danger"
        />

        <IonSearchbar
          placeholder="Buscar por número de préstamo, estado o notas"
          onIonInput={handleSearchChange}
          value={searchText}
          debounce={300}
          className="loans-searchbar"
        />

        <IonList className="loans-list">
          {displayedLoans.map((loan) => (
            <IonCard key={loan.loanId} className="loan-card">
              <IonCardHeader>
                <IonCardTitle className="loan-number">
                  Préstamo: {loan.loanNumber}
                </IonCardTitle>
                <IonText color="medium" className="loan-status">
                  Estado: {loan.loanStatus}
                </IonText>
              </IonCardHeader>
              <IonCardContent className="loan-card-content">
                <div className="loan-card-row">
                  <IonLabel>
                    <IonText className="meta-label">Cliente:</IonText>
                    <p className="meta-value">{loan.clientId}</p>
                  </IonLabel>
                  <IonLabel>
                    <IonText className="meta-label">Monto Principal:</IonText>
                    <p className="meta-value">${loan.principalAmount?.toFixed(2)}</p>
                  </IonLabel>
                </div>
                <div className="loan-card-row">
                  <IonLabel>
                    <IonText className="meta-label">Tasa de Interés:</IonText>
                    <p className="meta-value">{(loan.interestRate * 100).toFixed(2)}%</p>
                  </IonLabel>
                  <IonLabel>
                    <IonText className="meta-label">Duración (meses):</IonText>
                    <p className="meta-value">{loan.termMonths}</p>
                  </IonLabel>
                </div>
                <div className="loan-card-row">
                  <IonLabel>
                    <IonText className="meta-label">Frecuencia de Pago:</IonText>
                    <p className="meta-value">{loan.paymentFrequency}</p>
                  </IonLabel>
                  {loan.approvedAmount !== undefined && (
                    <IonLabel>
                      <IonText className="meta-label">Monto Aprobado:</IonText>
                      <p className="meta-value">${loan.approvedAmount.toFixed(2)}</p>
                    </IonLabel>
                  )}
                </div>
                {loan.totalRepaymentAmount !== undefined && (
                  <div className="loan-card-row">
                    <IonLabel>
                      <IonText className="meta-label">Monto Total a Pagar:</IonText>
                      <p className="meta-value">${loan.totalRepaymentAmount.toFixed(2)}</p>
                    </IonLabel>
                  </div>
                )}
                <div className="loan-card-row">
                  {loan.disbursementDate && (
                    <IonLabel>
                      <IonText className="meta-label">Fecha Desembolso:</IonText>
                      <p className="meta-value">{toHermosillo(loan.disbursementDate)}</p>
                    </IonLabel>
                  )}
                  {loan.maturityDate && (
                    <IonLabel>
                      <IonText className="meta-label">Fecha Vencimiento:</IonText>
                      <p className="meta-value">{toHermosillo(loan.maturityDate)}</p>
                    </IonLabel>
                  )}
                </div>
                {loan.notes && (
                  <div className="loan-card-row">
                    <IonLabel>
                      <IonText className="meta-label">Notas:</IonText>
                      <p className="meta-value">{loan.notes}</p>
                    </IonLabel>
                  </div>
                )}
                <div className="loan-actions">
                  <IonButton
                    fill="outline"
                    color="primary"
                    onClick={() => presentEditModal(loan)}
                    className="action-button edit-button"
                  >
                    <IonIcon icon={createOutline} slot="start" />
                    Editar
                  </IonButton>
                  <IonButton
                    fill="outline"
                    color="danger"
                    onClick={() => presentDeleteAlert(loan)}
                    className="action-button delete-button"
                  >
                    <IonIcon icon={trashOutline} slot="start" />
                    Eliminar
                  </IonButton>
                </div>
              </IonCardContent>
            </IonCard>
          ))}

          {displayedLoans.length < filteredLoans.length && (
            <IonInfiniteScroll
              onIonInfinite={(ev: CustomEvent<void>) => {
                loadMoreItems(ev);
              }}
              threshold="100px"
            >
              <IonInfiniteScrollContent loadingText="Cargando más préstamos..." />
            </IonInfiniteScroll>
          )}
        </IonList>

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={presentCreateModal}>
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>

        <IonModal isOpen={showModal} onDidDismiss={dismissModal} className="loan-modal">
          <IonContent className="ion-padding">
            <h2>{editingLoan?.loanId ? 'Editar Préstamo' : 'Registrar Nuevo Préstamo'}</h2>
            <IonInput
              label="Número de Préstamo"
              labelPlacement="floating"
              value={editingLoan?.loanNumber}
              onIonChange={(e: CustomEvent<InputInputEventDetail>) =>
                setEditingLoan({ ...editingLoan, loanNumber: e.detail.value || '' })
              }
              required
              fill="outline"
              className="ion-margin-bottom"
            />
            <IonItem lines="none" onClick={() => setShowClientSelector(true)} className="ion-margin-bottom client-selector-item">
              <IonIcon icon={personCircleOutline} slot="start" />
              <IonLabel className="ion-text-wrap">
                {selectedClient ? `Cliente: ${selectedClient.first_name} ${selectedClient.last_name}` : 'Seleccionar Cliente *'}
              </IonLabel>
              {editingLoan?.clientId && <IonText slot="end">{editingLoan.clientId}</IonText>}
            </IonItem>
            <ClientSelector
              isOpen={showClientSelector}
              onClose={() => setShowClientSelector(false)}
              onChange={handleClientSelection}
              selectedClient={selectedClient}
            />
            <IonInput
              label="Monto Principal *"
              labelPlacement="floating"
              type="number"
              value={editingLoan?.principalAmount}
              onIonChange={(e: CustomEvent<InputInputEventDetail>) =>
                setEditingLoan({ ...editingLoan, principalAmount: parseFloat(e.detail.value || '0') })
              }
              required
              fill="outline"
              className="ion-margin-bottom"
            />
            <IonInput
              label="Tasa de Interés (%) *"
              labelPlacement="floating"
              type="number"
              value={editingLoan?.interestRate !== undefined ? (editingLoan.interestRate * 100) : undefined}
              onIonChange={(e: CustomEvent<InputInputEventDetail>) =>
                setEditingLoan({ ...editingLoan, interestRate: parseFloat(e.detail.value || '0') / 100 })
              }
              required
              fill="outline"
              className="ion-margin-bottom"
            />
            <IonInput
              label="Duración (meses) *"
              labelPlacement="floating"
              type="number"
              value={editingLoan?.termMonths}
              onIonChange={(e: CustomEvent<InputInputEventDetail>) =>
                setEditingLoan({ ...editingLoan, termMonths: parseInt(e.detail.value || '0', 10) })
              }
              required
              fill="outline"
              className="ion-margin-bottom"
            />
            <IonSelect
              label="Frecuencia de Pago *"
              labelPlacement="floating"
              value={editingLoan?.paymentFrequency}
              onIonChange={(e: CustomEvent<SelectChangeEventDetail>) =>
                setEditingLoan({ ...editingLoan, paymentFrequency: e.detail.value })
              }
              required
              fill="outline"
              className="ion-margin-bottom"
            >
              <IonSelectOption value="Weekly">Semanal</IonSelectOption>
              <IonSelectOption value="Biweekly">Quincenal</IonSelectOption>
              <IonSelectOption value="Monthly">Mensual</IonSelectOption>
            </IonSelect>
            <IonInput
              label="Monto Aprobado"
              labelPlacement="floating"
              type="number"
              value={editingLoan?.approvedAmount}
              onIonChange={(e: CustomEvent<InputInputEventDetail>) =>
                setEditingLoan({ ...editingLoan, approvedAmount: parseFloat(e.detail.value || '0') })
              }
              fill="outline"
              className="ion-margin-bottom"
            />
            <IonInput
              label="Monto Total a Pagar"
              labelPlacement="floating"
              type="number"
              value={editingLoan?.totalRepaymentAmount}
              onIonChange={(e: CustomEvent<InputInputEventDetail>) =>
                setEditingLoan({ ...editingLoan, totalRepaymentAmount: parseFloat(e.detail.value || '0') })
              }
              fill="outline"
              className="ion-margin-bottom"
            />
            <IonInput
              label="Fecha de Desembolso"
              labelPlacement="floating"
              type="date"
              value={editingLoan?.disbursementDate ? editingLoan.disbursementDate.split('T')[0] : ''}
              onIonChange={(e: CustomEvent<InputInputEventDetail>) =>
                setEditingLoan({ ...editingLoan, disbursementDate: e.detail.value || undefined })
              }
              fill="outline"
              className="ion-margin-bottom"
            />
            <IonInput
              label="Fecha de Vencimiento"
              labelPlacement="floating"
              type="date"
              value={editingLoan?.maturityDate ? editingLoan.maturityDate.split('T')[0] : ''}
              onIonChange={(e: CustomEvent<InputInputEventDetail>) =>
                setEditingLoan({ ...editingLoan, maturityDate: e.detail.value || undefined })
              }
              fill="outline"
              className="ion-margin-bottom"
            />
            <IonSelect
              label="Estado del Préstamo *"
              labelPlacement="floating"
              value={editingLoan?.loanStatus}
              onIonChange={(e: CustomEvent<SelectChangeEventDetail>) =>
                setEditingLoan({ ...editingLoan, loanStatus: e.detail.value })
              }
              required
              fill="outline"
              className="ion-margin-bottom"
            >
              <IonSelectOption value="Draft">Borrador</IonSelectOption>
              <IonSelectOption value="PendingVerification">Pendiente Verificación</IonSelectOption>
              <IonSelectOption value="PendingApproval">Pendiente Aprobación</IonSelectOption>
              <IonSelectOption value="Approved">Aprobado</IonSelectOption>
              <IonSelectOption value="Rejected">Rechazado</IonSelectOption>
              <IonSelectOption value="Disbursed">Desembolsado</IonSelectOption>
              <IonSelectOption value="Active">Activo</IonSelectOption>
              <IonSelectOption value="Completed">Completado</IonSelectOption>
              <IonSelectOption value="Defaulted">Incumplido</IonSelectOption>
            </IonSelect>
            <IonInput
              label="Notas"
              labelPlacement="floating"
              value={editingLoan?.notes}
              onIonChange={(e: CustomEvent<InputInputEventDetail>) =>
                setEditingLoan({ ...editingLoan, notes: e.detail.value || undefined })
              }
              fill="outline"
              className="ion-margin-bottom"
            />
            <IonButton expand="block" onClick={handleCreateOrUpdateLoan} className="ion-margin-top">
              Guardar Préstamo
            </IonButton>
            <IonButton expand="block" fill="clear" onClick={dismissModal}>
              Cancelar
            </IonButton>
          </IonContent>
        </IonModal>

        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={dismissDeleteAlert}
          header="Confirmar Eliminación"
          message={`¿Está seguro de que desea eliminar el préstamo ${selectedLoanToDelete?.loanNumber}?`}
          buttons={[
            {
              text: 'Cancelar',
              role: 'cancel',
              handler: dismissDeleteAlert,
            },
            {
              text: 'Eliminar',
              handler: handleDeleteLoan,
              cssClass: 'delete-button',
            },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default LoanPage;
