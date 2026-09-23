import React, { useState, useEffect } from 'react';
import {
  IonPage,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonFab,
  IonFabButton,
  IonIcon,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonInput,
  IonLoading,
  IonToast,
  IonAlert,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonSpinner,
  IonDatetime,
  IonDatetimeButton,
  DatetimeChangeEventDetail,
  InputInputEventDetail
} from '@ionic/react';
import { add, create, trash, close, chevronBack, chevronForward, checkmarkCircle } from 'ionicons/icons';
import { useUser } from '../contexts/UserContext';
import {
  FactoryRunUsage,
  getAllFactoryRunUsages,
  createFactoryRunUsage,
  updateFactoryRunUsage,
  deleteFactoryRunUsage,
} from '../api/factoryRunUsageApi';
import Header from '../components/Header';
import AlertPopover from '../components/PopOver/AlertPopover';
import MailPopover from '../components/PopOver/MailPopover';
import { useIonViewWillEnter } from '@ionic/react';
import './FactoryRunUsagePage.css';

const toHermosillo = (utc: string | undefined): string => {
  if (!utc) return '';
  // Ensure the date string is interpreted as UTC, then convert to Hermosillo time (UTC-7)
  const d = new Date(utc.includes('Z') ? utc : utc + 'Z');
  return new Date(d.getTime() - 7 * 60 * 60 * 1000).toLocaleString();
};

interface FactoryRunUsageFormState {
  factoryRunRef: string;
  promptTokens: number | '';
  completionTokens: number | '';
  totalTokens: number | '';
  costUSD: number | '';
  modelName: string;
  timestamp: string;
}

const FactoryRunUsagePage: React.FC = () => {
  const { userId, roleCode } = useUser(); // companyId is not applicable per tenant_model
  const [factoryRunUsages, setFactoryRunUsages] = useState<FactoryRunUsage[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUsage, setSelectedUsage] = useState<FactoryRunUsage | null>(null);
  const [formState, setFormState] = useState<FactoryRunUsageFormState>({
    factoryRunRef: '',
    promptTokens: '',
    completionTokens: '',
    totalTokens: '',
    costUSD: '',
    modelName: '',
    timestamp: '',
  });
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [usageToDelete, setUsageToDelete] = useState<number | null>(null);

  const [popoverState, setPopoverState] = useState<{
    showAlertPopover: boolean;
    showMailPopover: boolean;
    event?: Event;
  }>({ showAlertPopover: false, showMailPopover: false });

  const presentAlertPopover = (e: React.MouseEvent) =>
    setPopoverState({ ...popoverState, showAlertPopover: true, event: e.nativeEvent });
  const dismissAlertPopover = () =>
    setPopoverState({ ...popoverState, showAlertPopover: false });
  const presentMailPopover = (e: React.MouseEvent) =>
    setPopoverState({ ...popoverState, showMailPopover: true, event: e.nativeEvent });
  const dismissMailPopover = () =>
    setPopoverState({ ...popoverState, showMailPopover: false });

  // Pagination states for infinite scroll
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const itemsPerPage = 20; // Number of items to load per scroll

  const loadFactoryRunUsages = async (page: number, append: boolean = false) => {
    if (loading || !hasMore && append) return;
    setLoading(true);
    setError('');
    try {
      // The API call for getAllFactoryRunUsages does not require companyId as per tenant_model: TENANT_INDEPENDENT
      const data = await getAllFactoryRunUsages();
      const startIndex = page * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const newItems = data.slice(startIndex, endIndex);

      if (append) {
        setFactoryRunUsages((prev) => [...prev, ...newItems]);
      } else {
        setFactoryRunUsages(newItems);
      }

      setHasMore(newItems.length === itemsPerPage);
      setCurrentPage(page);
    } catch (err) {
      setError((err as Error).message ?? 'Error al cargar los usos de ejecución de fábrica');
    } finally {
      setLoading(false);
    }
  };

  useIonViewWillEnter(() => {
    setFactoryRunUsages([]); // Clear list before loading fresh data
    setCurrentPage(0);
    setHasMore(true);
    loadFactoryRunUsages(0, false);
  });

  const loadMoreItems = async (event: CustomEvent<void>) => {
    await loadFactoryRunUsages(currentPage + 1, true);
    (event.target as HTMLIonInfiniteScrollElement).complete();
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setSelectedUsage(null);
    setFormState({
      factoryRunRef: '',
      promptTokens: '',
      completionTokens: '',
      totalTokens: '',
      costUSD: '',
      modelName: '',
      timestamp: new Date().toISOString(), // Default to current time
    });
    setShowModal(true);
  };

  const openEditModal = (usage: FactoryRunUsage) => {
    setIsEditing(true);
    setSelectedUsage(usage);
    setFormState({
      factoryRunRef: usage.factoryRunRef,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      costUSD: usage.costUSD,
      modelName: usage.modelName,
      timestamp: usage.timestamp,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    const parsedPromptTokens = Number(formState.promptTokens);
    const parsedCompletionTokens = Number(formState.completionTokens);
    const parsedTotalTokens = Number(formState.totalTokens);
    const parsedCostUSD = Number(formState.costUSD);

    if (
      !formState.factoryRunRef ||
      isNaN(parsedPromptTokens) || parsedPromptTokens < 0 ||
      isNaN(parsedCompletionTokens) || parsedCompletionTokens < 0 ||
      isNaN(parsedTotalTokens) || parsedTotalTokens < 0 ||
      isNaN(parsedCostUSD) || parsedCostUSD < 0 ||
      !formState.modelName ||
      !formState.timestamp
    ) {
      setError('Por favor, complete todos los campos requeridos y asegúrese de que los números sean válidos.');
      setSaving(false);
      return;
    }

    const payload = {
      factoryRunRef: formState.factoryRunRef,
      promptTokens: parsedPromptTokens,
      completionTokens: parsedCompletionTokens,
      totalTokens: parsedTotalTokens,
      costUSD: parsedCostUSD,
      modelName: formState.modelName,
      timestamp: formState.timestamp,
    };

    try {
      if (isEditing && selectedUsage) {
        await updateFactoryRunUsage(selectedUsage.factoryRunUsageId, payload);
        setError('Uso de ejecución de fábrica actualizado con éxito!');
      } else {
        await createFactoryRunUsage(payload);
        setError('Uso de ejecución de fábrica creado con éxito!');
      }
      setShowModal(false);
      // Reset pagination and reload data to reflect changes
      setFactoryRunUsages([]);
      setCurrentPage(0);
      setHasMore(true);
      await loadFactoryRunUsages(0, false);
    } catch (err) {
      setError((err as Error).message ?? 'Error al guardar el uso de ejecución de fábrica.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirmation = (id: number) => {
    setUsageToDelete(id);
    setShowDeleteAlert(true);
  };

  const handleDelete = async () => {
    if (usageToDelete === null) return;
    setLoading(true);
    setError('');
    try {
      await deleteFactoryRunUsage(usageToDelete);
      setError('Uso de ejecución de fábrica eliminado con éxito!');
      // Reset pagination and reload data to reflect changes
      setFactoryRunUsages([]);
      setCurrentPage(0);
      setHasMore(true);
      await loadFactoryRunUsages(0, false);
    } catch (err) {
      setError((err as Error).message ?? 'Error al eliminar el uso de ejecución de fábrica.');
    } finally {
      setLoading(false);
      setShowDeleteAlert(false);
      setUsageToDelete(null);
    }
  };

  return (
    <IonPage className="factoryrunusage-page">
      <Header
        presentAlertPopover={presentAlertPopover}
        presentMailPopover={presentMailPopover}
        screenTitle="Uso de Ejecución de Fábrica — POS GMO"
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

      <IonContent fullscreen className="ion-padding">
        <IonLoading isOpen={loading} message={'Cargando Usos de Ejecución...'} />

        <IonList className="factoryrunusage-list">
          {factoryRunUsages.length === 0 && !loading && (
            <IonItem>
              <IonLabel>No hay usos de ejecución de fábrica registrados.</IonLabel>
            </IonItem>
          )}
          {factoryRunUsages.map((usage) => (
            <IonItemSliding key={usage.factoryRunUsageId}>
              <IonItem routerLink={`/factoryRunUsages/${usage.factoryRunUsageId}`}>
                <IonLabel>
                  <h2>{usage.factoryRunRef} - {usage.modelName}</h2>
                  <p>Tokens: {usage.totalTokens} (Prompt: {usage.promptTokens}, Completion: {usage.completionTokens})</p>
                  <p>Costo: ${usage.costUSD.toFixed(2)} USD</p>
                  <p>Timestamp: {toHermosillo(usage.timestamp)}</p>
                  <p>Creado: {toHermosillo(usage.created_At)}</p>
                  {usage.updated_at && <p>Actualizado: {toHermosillo(usage.updated_at)}</p>}
                </IonLabel>
              </IonItem>

              <IonItemOptions side="end">
                <IonItemOption onClick={() => openEditModal(usage)} color="primary">
                  <IonIcon slot="icon-only" icon={create} />
                </IonItemOption>
                <IonItemOption onClick={() => handleDeleteConfirmation(usage.factoryRunUsageId)} color="danger">
                  <IonIcon slot="icon-only" icon={trash} />
                </IonItemOption>
            </IonItemOptions>
            </IonItemSliding>
          ))}
        </IonList>

        <IonInfiniteScroll
          onIonInfinite={(ev: CustomEvent<void>) => {
            loadMoreItems(ev);
          }}
          threshold="100px"
          disabled={!hasMore}
        >
          <IonSpinner name="dots" slot="content" className="ion-text-center" />
        </IonInfiniteScroll>

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={openCreateModal} color="secondary">
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
          <IonHeader>
            <IonToolbar>
              <IonButtons slot="start">
                <IonButton onClick={() => setShowModal(false)}>
                  <IonIcon icon={close} />
                </IonButton>
              </IonButtons>
              <IonTitle>{isEditing ? 'Editar Uso de Ejecución' : 'Agregar Uso de Ejecución'}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={handleSave} disabled={saving}>
                  {saving ? <IonSpinner name="dots" /> : 'Guardar'}
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <form className="factoryrunusage-form">
              <div className="wizard-field-group">
                <IonInput
                  fill="outline"
                  label="Referencia de Ejecución de Fábrica *"
                  labelPlacement="floating"
                  value={formState.factoryRunRef}
                  onIonInput={(e: CustomEvent<InputInputEventDetail>) => setFormState(p => ({ ...p, factoryRunRef: e.detail.value! }))}
                  className={!formState.factoryRunRef ? 'ion-invalid ion-touched' : ''}
                  errorText={!formState.factoryRunRef ? 'La referencia es requerida' : ''}
                />
              </div>
              <div className="wizard-field-group">
                <IonInput
                  fill="outline"
                  label="Tokens de Prompt *"
                  labelPlacement="floating"
                  type="number"
                  value={formState.promptTokens}
                  onIonInput={(e: CustomEvent<InputInputEventDetail>) => setFormState(p => ({ ...p, promptTokens: Number(e.detail.value!) }))}
                  className={formState.promptTokens === '' || isNaN(Number(formState.promptTokens)) || Number(formState.promptTokens) < 0 ? 'ion-invalid ion-touched' : ''}
                  errorText={formState.promptTokens === '' || isNaN(Number(formState.promptTokens)) || Number(formState.promptTokens) < 0 ? 'Número de tokens válido requerido' : ''}
                />
              </div>
              <div className="wizard-field-group">
                <IonInput
                  fill="outline"
                  label="Tokens de Completado *"
                  labelPlacement="floating"
                  type="number"
                  value={formState.completionTokens}
                  onIonInput={(e: CustomEvent<InputInputEventDetail>) => setFormState(p => ({ ...p, completionTokens: Number(e.detail.value!) }))}
                  className={formState.completionTokens === '' || isNaN(Number(formState.completionTokens)) || Number(formState.completionTokens) < 0 ? 'ion-invalid ion-touched' : ''}
                  errorText={formState.completionTokens === '' || isNaN(Number(formState.completionTokens)) || Number(formState.completionTokens) < 0 ? 'Número de tokens válido requerido' : ''}
                />
              </div>
              <div className="wizard-field-group">
                <IonInput
                  fill="outline"
                  label="Total de Tokens *"
                  labelPlacement="floating"
                  type="number"
                  value={formState.totalTokens}
                  onIonInput={(e: CustomEvent<InputInputEventDetail>) => setFormState(p => ({ ...p, totalTokens: Number(e.detail.value!) }))}
                  className={formState.totalTokens === '' || isNaN(Number(formState.totalTokens)) || Number(formState.totalTokens) < 0 ? 'ion-invalid ion-touched' : ''}
                  errorText={formState.totalTokens === '' || isNaN(Number(formState.totalTokens)) || Number(formState.totalTokens) < 0 ? 'Número de tokens válido requerido' : ''}
                />
              </div>
              <div className="wizard-field-group">
                <IonInput
                  fill="outline"
                  label="Costo USD *"
                  labelPlacement="floating"
                  type="number"
                  value={formState.costUSD}
                  onIonInput={(e: CustomEvent<InputInputEventDetail>) => setFormState(p => ({ ...p, costUSD: Number(e.detail.value!).toFixed(2) }))}
                  className={formState.costUSD === '' || isNaN(Number(formState.costUSD)) || Number(formState.costUSD) < 0 ? 'ion-invalid ion-touched' : ''}
                  errorText={formState.costUSD === '' || isNaN(Number(formState.costUSD)) || Number(formState.costUSD) < 0 ? 'Costo válido requerido' : ''}
                />
              </div>
              <div className="wizard-field-group">
                <IonInput
                  fill="outline"
                  label="Nombre del Modelo *"
                  labelPlacement="floating"
                  value={formState.modelName}
                  onIonInput={(e: CustomEvent<InputInputEventDetail>) => setFormState(p => ({ ...p, modelName: e.detail.value! }))}
                  className={!formState.modelName ? 'ion-invalid ion-touched' : ''}
                  errorText={!formState.modelName ? 'El nombre del modelo es requerido' : ''}
                />
              </div>
              <div className="wizard-field-group">
                <IonDatetimeButton datetime="timestamp-datetime"></IonDatetimeButton>
                <IonModal keepContentsMounted={true}>
                  <IonDatetime
                    id="timestamp-datetime"
                    value={formState.timestamp}
                    onIonChange={(e: CustomEvent<DatetimeChangeEventDetail>) => setFormState(p => ({ ...p, timestamp: e.detail.value! as string }))}
                    presentation="date-time"
                  ></IonDatetime>
                </IonModal>
              </div>
            </form>
          </IonContent>
        </IonModal>

        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header={'Confirmar Eliminación'}
          message={'¿Estás seguro de que deseas eliminar este uso de ejecución de fábrica?'}
          buttons={[
            { text: 'Cancelar', role: 'cancel' },
            { text: 'Eliminar', handler: handleDelete, cssClass: 'danger-button' },
          ]}
        />

        <IonToast
          isOpen={!!error}
          message={error}
          duration={3000}
          onDidDismiss={() => setError('')}
          color={error.includes('Error') ? 'danger' : 'success'}
        />
      </IonContent>
    </IonPage>
  );
};

export default FactoryRunUsagePage;
