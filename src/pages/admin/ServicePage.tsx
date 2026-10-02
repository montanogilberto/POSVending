import React, { useState, useEffect } from 'react';
// Reuses SupplierPage's CSS wholesale -- structurally identical admin CRUD
// page, purely presentational class names (.supplier-page/.supplier-list/...).
import './SupplierPage.css';
import '../shared-card-list.css';
import {
  IonPage, IonContent, IonList, IonCard, IonCardContent, IonFab, IonFabButton, IonIcon, IonModal,
  IonInput, IonButton, IonLoading, IonToast, IonSearchbar,
  IonInfiniteScroll, IonInfiniteScrollContent, IonTextarea, IonToggle,
  IonHeader, IonToolbar, IonButtons, IonTitle, IonText
} from '@ionic/react';
import { add, pencil, trash, receiptOutline, arrowBack, save } from 'ionicons/icons';
import Header from '../../components/layout/Header';
import AlertPopover from '../../components/popovers/AlertPopover';
import MailPopover from '../../components/popovers/MailPopover';
import { usePopovers } from '../../hooks/usePopovers';
import { useUser } from '../../contexts/UserContext';
import {
  getAllServices,
  createService,
  updateService,
  deleteService,
  Service
} from '../../api/serviceApi';
import { SearchbarInputEventDetail, InputInputEventDetail, ToggleChangeEventDetail } from '@ionic/core';

const toHermosillo = (utc: string | undefined): string => {
  if (!utc) return '';
  const d = new Date(utc.includes('Z') ? utc : utc + 'Z');
  return new Date(d.getTime() - 7 * 60 * 60 * 1000).toLocaleString();
};

const ITEMS_PER_PAGE = 20;

const ServicePage: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [displayedServices, setDisplayedServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [page, setPage] = useState(0);

  const { companyId } = useUser();

  const pops = usePopovers();

  const loadServices = async () => {
    if (!companyId) return;
    setLoading(true);
    setError('');
    try {
      const fetched = await getAllServices(companyId);
      setServices(fetched);
      setFilteredServices(fetched);
      setDisplayedServices(fetched.slice(0, ITEMS_PER_PAGE));
      setPage(1);
    } catch (err) {
      setError((err as Error).message ?? 'Error al cargar servicios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      loadServices();
    }
  }, [companyId]);

  useEffect(() => {
    const lowercasedSearchText = searchText.toLowerCase();
    const filtered = services.filter(service =>
      service.serviceName.toLowerCase().includes(lowercasedSearchText) ||
      service.description?.toLowerCase().includes(lowercasedSearchText)
    );
    setFilteredServices(filtered);
    setDisplayedServices(filtered.slice(0, ITEMS_PER_PAGE));
    setPage(1); // Reset page when filters change
  }, [searchText, services]);

  const loadMoreItems = (ev: CustomEvent<void>) => {
    const newPage = page + 1;
    const newItems = filteredServices.slice(0, newPage * ITEMS_PER_PAGE);
    setDisplayedServices(newItems);
    setPage(newPage);
    (ev.target as HTMLIonInfiniteScrollElement).complete();
  };

  const handleSearch = (e: CustomEvent<SearchbarInputEventDetail>) => {
    const query = e.detail.value ?? '';
    setSearchText(query);
  };

  const handleChange = (e: CustomEvent<InputInputEventDetail | ToggleChangeEventDetail>) => {
    const { name, value, checked } = e.target as HTMLIonInputElement & HTMLIonToggleElement;
    setEditingService(prev => ({
      ...prev,
      [name!]: name === 'active' ? (checked ? '1' : '0') : value
    }));
  };

  const handleSave = async () => {
    if (!companyId || !editingService?.serviceName) {
      setError('El nombre del servicio y la compañía son obligatorios.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (editingService.serviceId) {
        await updateService(editingService.serviceId, editingService as Partial<Omit<Service, 'created_At' | 'updated_at'>>);
      } else {
        await createService({ ...editingService, companyId, active: editingService.active ?? '1' } as Omit<Service, 'serviceId' | 'created_At' | 'updated_at'>);
      }
      setShowCreateModal(false);
      setShowEditModal(false);
      setEditingService(null);
      await loadServices();
    } catch (err) {
      setError((err as Error).message ?? 'Error al guardar servicio.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (service: Service) => {
    if (!service.serviceId) return;
    setLoading(true);
    setError('');
    try {
      await deleteService(service.serviceId);
      setSuccessMessage(`Servicio "${service.serviceName}" eliminado.`);
      await loadServices();
    } catch (err) {
      setError((err as Error).message ?? 'Error al eliminar servicio.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <Header {...pops.headerProps} screenTitle="Servicios — POS GMO" />
      <AlertPopover {...pops.alertPopoverProps} />
      <MailPopover {...pops.mailPopoverProps} />
      <IonLoading isOpen={loading} message={'Cargando...'} />
      <IonToast
        isOpen={!!error}
        message={error}
        onDidDismiss={() => setError('')}
        duration={5000}
        color="danger"
      />
      <IonToast
        isOpen={!!successMessage}
        message={successMessage}
        onDidDismiss={() => setSuccessMessage('')}
        duration={3000}
        color="success"
      />

      <IonContent fullscreen className="supplier-page">
        <div className="search-container">
          <IonSearchbar
            className="supplier-searchbar"
            value={searchText}
            onIonInput={handleSearch}
            placeholder="Buscar servicios"
            debounce={300}
          />
        </div>

        <IonList className="supplier-list">
          {displayedServices.length === 0 && !loading && !error ? (
            <div className="empty-state">
              <IonIcon icon={receiptOutline} className="empty-icon" />
              <IonText color="medium">
                <p>{searchText ? 'No se encontraron servicios' : 'No hay servicios registrados'}</p>
              </IonText>
            </div>
          ) : (
            displayedServices.map(service => (
              <IonCard key={service.serviceId} className="client-card">
                <IonCardContent className="client-card-content">
                  <div className="client-card-row">
                    <div className="client-left">
                      <div className="supplier-avatar-icon">
                        <IonIcon icon={receiptOutline} />
                      </div>
                    </div>
                    <div className="client-main">
                      <div className="client-header">
                        <span className="client-name">{service.serviceName}</span>
                        <span className={`supplier-status-badge ${service.active === '1' ? 'sup-active' : 'sup-inactive'}`}>
                          {service.active === '1' ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      <p className="client-subtitle">{service.description || 'Sin descripción'}</p>
                      <div className="client-meta-row">
                        <span className="client-meta-badge">
                          <span className="meta-label">Creado</span>
                          <span className="meta-value">{toHermosillo(service.created_At)}</span>
                        </span>
                      </div>
                    </div>
                    <div className="client-actions">
                      <IonButton fill="outline" size="small" color="primary" className="action-button edit-button"
                        onClick={() => { setEditingService(service); setShowEditModal(true); }}>
                        <IonIcon icon={pencil} slot="start" /> Editar
                      </IonButton>
                      <IonButton fill="outline" size="small" color="danger" className="action-button delete-button"
                        onClick={() => handleDelete(service)}>
                        <IonIcon icon={trash} slot="start" /> Eliminar
                      </IonButton>
                    </div>
                  </div>
                </IonCardContent>
              </IonCard>
            ))
          )}
          <IonInfiniteScroll
            onIonInfinite={loadMoreItems}
            threshold="100px"
            disabled={displayedServices.length === filteredServices.length}
          >
            <IonInfiniteScrollContent loadingSpinner="bubbles" loadingText="Cargando más servicios..."></IonInfiniteScrollContent>
          </IonInfiniteScroll>
        </IonList>

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => { setEditingService(null); setShowCreateModal(true); }}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        {/* Create Service Modal */}
        <IonModal isOpen={showCreateModal} onDidDismiss={() => setShowCreateModal(false)} className="supplier-modal">
          <IonHeader className="ion-no-border">
            <IonToolbar className="modal-toolbar">
              <IonButtons slot="start">
                <IonButton fill="clear" onClick={() => setShowCreateModal(false)}>
                  <IonIcon icon={arrowBack} />
                </IonButton>
              </IonButtons>
              <IonTitle className="modal-title">Agregar Servicio</IonTitle>
            </IonToolbar>
            <div className="modal-subtitle">
              <IonText color="medium">Registra un nuevo servicio recurrente (CFE, agua, internet, renta...)</IonText>
            </div>
          </IonHeader>
          <IonContent className="modal-content">
            <div className="form-container supplier-form-fields">
              <IonInput fill="outline" label="Nombre del Servicio *" labelPlacement="floating"
                name="serviceName" value={editingService?.serviceName} onIonChange={handleChange} required type="text" />
              <IonTextarea fill="outline" label="Descripción" labelPlacement="floating"
                name="description" value={editingService?.description} onIonChange={handleChange} autoGrow />
              <div className="supplier-toggle-row">
                <span className="supplier-toggle-label">Activo</span>
                <IonToggle name="active" checked={editingService?.active === '1'} onIonChange={handleChange} />
              </div>
              <div className="button-container">
                <IonButton expand="block" size="large" className="primary-button" onClick={handleSave}>
                  <IonIcon icon={save} slot="start" />
                  GUARDAR SERVICIO
                </IonButton>
                <IonButton expand="block" fill="clear" onClick={() => setShowCreateModal(false)}>
                  Cancelar
                </IonButton>
              </div>
            </div>
          </IonContent>
        </IonModal>

        {/* Edit Service Modal */}
        <IonModal isOpen={showEditModal} onDidDismiss={() => setShowEditModal(false)} className="supplier-modal">
          <IonHeader className="ion-no-border">
            <IonToolbar className="modal-toolbar">
              <IonButtons slot="start">
                <IonButton fill="clear" onClick={() => setShowEditModal(false)}>
                  <IonIcon icon={arrowBack} />
                </IonButton>
              </IonButtons>
              <IonTitle className="modal-title">Editar Servicio</IonTitle>
            </IonToolbar>
            <div className="modal-subtitle">
              <IonText color="medium">Actualiza la información del servicio</IonText>
            </div>
          </IonHeader>
          <IonContent className="modal-content">
            <div className="form-container supplier-form-fields">
              <IonInput fill="outline" label="Nombre del Servicio *" labelPlacement="floating"
                name="serviceName" value={editingService?.serviceName} onIonChange={handleChange} required type="text" />
              <IonTextarea fill="outline" label="Descripción" labelPlacement="floating"
                name="description" value={editingService?.description} onIonChange={handleChange} autoGrow />
              <div className="supplier-toggle-row">
                <span className="supplier-toggle-label">Activo</span>
                <IonToggle name="active" checked={editingService?.active === '1'} onIonChange={handleChange} />
              </div>
              <div className="button-container">
                <IonButton expand="block" size="large" className="primary-button" onClick={handleSave}>
                  <IonIcon icon={save} slot="start" />
                  ACTUALIZAR SERVICIO
                </IonButton>
                <IonButton expand="block" fill="clear" onClick={() => setShowEditModal(false)}>
                  Cancelar
                </IonButton>
              </div>
            </div>
          </IonContent>
        </IonModal>

      </IonContent>
    </IonPage>
  );
};

export default ServicePage;
