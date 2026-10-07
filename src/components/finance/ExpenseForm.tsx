import React, { useState, useEffect } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonButton,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonIcon,
  IonToast,
  IonLoading,
  IonImg,
  IonSpinner,
  IonFooter,
  IonSegment,
  IonSegmentButton,
  IonTextarea,
} from '@ionic/react';
import { addOutline, arrowBack, cameraOutline, cubeOutline, documentTextOutline, peopleOutline, sparklesOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { ExpenseType, createExpense, uploadExpenseReceiptImage } from '../../api/expensesApi';
import { getAllSuppliers, Supplier } from '../../api/supplierApi';
import { getAllServices, Service } from '../../api/serviceApi';
import { getAllEmployees, Employee } from '../../api/employeesApi';
import { pickExpenseReceiptPhoto } from '../../utils/pickAvatarPhoto';
import { setOperationPhoto } from '../../pages/finance/ExpenseOperation/operationDraftStore';
import { useUser } from '../../contexts/UserContext';
import { useToast } from '../../hooks/useToast';
import { notifyDataChanged } from '../../utils/refreshBus';
import NewSupplierModal from './NewSupplierModal';
import NewServiceModal from './NewServiceModal';
import ExpenseItemsEditor from './ExpenseItemsEditor';
import NewSupplyProductModal from './NewSupplyProductModal';
import TicketReadingCard from './TicketReadingCard';
import { useTicketReading } from './useTicketReading';
import { useExpenseReview } from './useExpenseReview';
import { buildTicketDraft, lineToItem, mergeItems } from './ticketDraft';
import { ExpenseItem, itemsTotal } from './expenseItems';
import type { TicketExtraction } from '../../api/expenseAgentApi';
import { fmtMXN, toHermosilloDate } from '../../utils/format';

// The picker gives a Hermosillo calendar day ('YYYY-MM-DD'). Today must be
// Hermosillo's today (UTC rolls over at 17:00 local), and the stored timestamp
// is that day's noon in Hermosillo (UTC-7 → 19:00Z): `new Date('2026-09-29')`
// is UTC midnight = Sept 28 17:00 local, which showed every expense a day
// early and put the 1st of a month into the previous month.
const hermosilloToday = () => toHermosilloDate(new Date().toISOString()).toISOString().split('T')[0];
const hermosilloNoonUtc = (day: string) => `${day}T19:00:00.000Z`;
import './ExpenseForm.css';

const ExpenseForm: React.FC = () => {
  const { companyId, userId } = useUser();
  const history = useHistory();
  const goToExpenses = () => history.push('/egresos');
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState<number>(0);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState<number>(0);
  const [showNewService, setShowNewService] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDate, setPaymentDate] = useState(hermosilloToday);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const { showToast, toastProps } = useToast({ defaultColor: 'danger' });
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [receiptPhoto, setReceiptPhoto] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [expenseType, setExpenseType] = useState<ExpenseType>('inventory');
  const [notes, setNotes] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState<number>(0);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const ticketReading = useTicketReading(companyId);
  const expenseReview = useExpenseReview();
  const [ticketApplied, setTicketApplied] = useState(false);
  const [resolvedLines, setResolvedLines] = useState<number[]>([]);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newProductLine, setNewProductLine] = useState<number | null>(null);

  // Entry to the agent flow: pick the ticket, then /egresos/resumen reads it and
  // shows everything that will be registered before anything is saved.
  const startAgentOperation = async () => {
    const photo = await pickExpenseReceiptPhoto();
    if (!photo) return;
    setOperationPhoto(photo);
    history.push('/egresos/resumen');
  };

  const handlePickReceipt = async () => {
    const dataUrl = await pickExpenseReceiptPhoto();
    if (!dataUrl) return;
    setReceiptPhoto(dataUrl);
    // A new photo clears the previous reading; the agent only runs when the user asks.
    setTicketApplied(false);
    setResolvedLines([]);
    expenseReview.reset();
    ticketReading.reset();
  };

  const analyzeTicket = () => {
    if (!receiptPhoto) return;
    setTicketApplied(false);
    setResolvedLines([]);
    expenseReview.reset();
    ticketReading.read(receiptPhoto); // suggestions only; nothing is filled until "Aplicar"
  };

  const applyTicketData = (reading: TicketExtraction) => {
    const draft = buildTicketDraft(reading, expenseType);
    if (draft.supplierId) setSupplierId(draft.supplierId);
    if (draft.paymentMethod) setPaymentMethod(draft.paymentMethod);
    if (draft.paymentDate) setPaymentDate(draft.paymentDate);
    if (draft.total !== undefined) setTotal(draft.total);
    if (draft.items.length > 0) setItems(prev => mergeItems(prev, draft.items));
    setTicketApplied(true);
    showToast('Datos del ticket aplicados. Revísalos antes de crear el egreso.', 'success');
  };

  const applyTicket = () => {
    if (ticketReading.ticket) applyTicketData(ticketReading.ticket);
  };

  const addTicketLine = (lineIndex: number, productId: number, name: string) => {
    const line = ticketReading.ticket?.lineItems[lineIndex];
    if (!line) return;
    setItems(prev => mergeItems(prev, [lineToItem(line, productId, name)]));
    setResolvedLines(prev => [...prev, lineIndex]);
  };

  // Category + anomaly check runs by itself once the agent has read the ticket
  // (its lines and total are what the category agent needs). The card's manual
  // button covers the case where the ticket could not be read.
  useEffect(() => {
    const read = ticketReading.ticket;
    if (ticketReading.state !== 'done' || !read?.isPurchaseTicket) return;
    const description = read.lineItems.map(l => l.name).join(', ') || read.merchantName;
    if (!description) return;
    expenseReview.run({ companyId, description, total: read.total, paymentMethod: read.paymentMethod });
  }, [ticketReading.state, ticketReading.ticket, companyId, expenseReview.run]);

  const handleManualReview = () =>
    expenseReview.run({ companyId, description: items.map(p => p.name).join(', '), total, paymentMethod });

  useEffect(() => {
    if (companyId) {
      loadSuppliers();
      loadServices();
      loadEmployees();
    }
  }, [companyId]);

  useEffect(() => {
    // Inventory total = sum of quantity × unit cost of every line.
    if (expenseType === 'inventory') setTotal(itemsTotal(items));
  }, [items, expenseType]);

  useEffect(() => {
    // Switching type starts each mode from a clean slate — avoids e.g. a
    // leftover supplierId silently riding along into a payroll payload.
    setItems([]);
    setSupplierId(0);
    setServiceId(0);
    setEmployeeId(0);
    setTotal(0);
    setNotes('');
  }, [expenseType]);

  const loadSuppliers = async () => {
    try {
      const supplierList = await getAllSuppliers(companyId);
      setSuppliers(supplierList);
    } catch (error) {
      console.error('Error loading suppliers:', error);
      setSuppliers([]);
    }
  };

  const loadServices = async () => {
    try {
      const serviceList = await getAllServices(companyId);
      setServices(serviceList);
    } catch (error) {
      console.error('Error loading services:', error);
      setServices([]);
    }
  };

  const loadEmployees = async () => {
    try {
      const employeeList = await getAllEmployees(companyId);
      setEmployees(employeeList);
    } catch (error) {
      console.error('Error loading employees:', error);
      setEmployees([]);
    }
  };

  // Single source of truth for "what's still missing": drives the footer
  // hint, the red highlight on each field, and the toast on tap — so the
  // button never has to be a silent, disabled dead end.
  const missingFields: { key: string; label: string; message: string }[] = [];
  if (expenseType === 'inventory' && items.length === 0) {
    missingFields.push({ key: 'products', label: 'productos', message: 'Debe seleccionar al menos un producto' });
  } else if (expenseType === 'inventory' && items.some(i => !(i.quantity > 0) || !(i.unitCost > 0))) {
    missingFields.push({ key: 'products', label: 'cantidad y costo de cada producto', message: 'Cada producto necesita cantidad y costo unitario mayores a cero' });
  }
  if (expenseType === 'payroll') {
    if (employeeId === 0) missingFields.push({ key: 'employee', label: 'empleado', message: 'Debe seleccionar un empleado' });
  } else if (expenseType === 'general') {
    if (serviceId === 0) missingFields.push({ key: 'service', label: 'servicio', message: 'Debe seleccionar un servicio' });
  } else if (supplierId === 0) {
    missingFields.push({ key: 'supplier', label: 'proveedor', message: 'Debe seleccionar un proveedor' });
  }
  if (!paymentMethod) {
    missingFields.push({ key: 'paymentMethod', label: 'método de pago', message: 'Debe seleccionar un método de pago' });
  }
  if (expenseType !== 'inventory' && total <= 0) {
    missingFields.push({ key: 'total', label: 'total', message: 'Debe ingresar un total mayor a cero' });
  }
  if (!receiptPhoto) {
    missingFields.push({ key: 'receipt', label: 'foto del ticket', message: 'Debe adjuntar la foto del ticket' });
  }

  const fieldInvalid = (key: string) => submitAttempted && missingFields.some(f => f.key === key);
  const invalidClass = (key: string) => (fieldInvalid(key) ? 'ion-invalid ion-touched' : '');

  const handleSubmit = async () => {
    if (missingFields.length > 0) {
      setSubmitAttempted(true);
      showToast(missingFields[0].message);
      document.getElementById(`expense-field-${missingFields[0].key}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    try {
      setLoading(true);

      // The ticket photo is mandatory evidence — if it can't be uploaded, stop
      // here instead of saving an egreso with no proof attached.
      const upload = await (async () => {
        try {
          setUploadingReceipt(true);
          return await uploadExpenseReceiptImage({ companyId, imageBase64: receiptPhoto! });
        } catch (uploadError) {
          console.error('Error uploading receipt photo:', uploadError);
          return null;
        } finally {
          setUploadingReceipt(false);
        }
      })();
      const receiptUrl = upload?.blobUrl;
      if (!receiptUrl) {
        showToast('No se pudo subir la foto del ticket. Intenta de nuevo.');
        return;
      }

      const expenseData = {
        expenses: [{
          action: 1,
          total: total,
          paymentMethod: paymentMethod,
          paymentDate: hermosilloNoonUtc(paymentDate),
          userId,
          companyId,
          expenseType,
          ...(expenseType === 'payroll' ? { employeeId } : expenseType === 'general' ? { serviceId } : { supplierId }),
          ...(expenseType === 'inventory'
            ? {
                products: items.map(item => ({
                  productId: item.productId,
                  quantity: item.quantity,
                  unitCost: item.unitCost,
                })),
              }
            : { notes }),
          receiptUrl,
        }]
      };

      await createExpense(expenseData);
      notifyDataChanged('expense-created'); // reloads the Egresos list + /dashboard KPIs
      showToast('Egreso creado exitosamente', 'success');
      // Reset form
      setItems([]);
      setSupplierId(0);
      setServiceId(0);
      setEmployeeId(0);
      setPaymentMethod('');
      setPaymentDate(hermosilloToday());
      setTotal(0);
      setNotes('');
      setExpenseType('inventory');
      setReceiptPhoto(null);
      ticketReading.reset();
      setTicketApplied(false);
      setResolvedLines([]);
      expenseReview.reset();
      setSubmitAttempted(false);
      setTimeout(goToExpenses, 600);
    } catch (error) {
      console.error('Error creating expense:', error);
      showToast('Error al crear el egreso');
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={goToExpenses}>
              <IonIcon icon={arrowBack} slot="icon-only" />
            </IonButton>
          </IonButtons>
          <IonTitle>Nuevo Egreso</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="expense-form-content">
          <IonLoading isOpen={loading} message="Guardando..." />

          <div className="expense-form-body">
            {/* Expense type */}
            <IonCard className="expense-form-card">
              <IonCardHeader>
                <IonCardTitle className="expense-form-card-title">Tipo de Egreso</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonSegment
                  value={expenseType}
                  onIonChange={(e) => setExpenseType(e.detail.value as ExpenseType)}
                >
                  <IonSegmentButton value="inventory">
                    <IonIcon icon={cubeOutline} />
                    <IonLabel>Inventario</IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton value="general">
                    <IonIcon icon={documentTextOutline} />
                    <IonLabel>Servicios</IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton value="payroll">
                    <IonIcon icon={peopleOutline} />
                    <IonLabel>Nómina</IonLabel>
                  </IonSegmentButton>
                </IonSegment>
              </IonCardContent>
            </IonCard>

            {/* Agent: read a ticket and review the whole operation before saving (inventory only) */}
            {expenseType === 'inventory' && (
              <IonCard className="expense-form-card expense-agent-card">
                <IonCardContent>
                  <div className="expense-agent-copy">
                    <IonIcon icon={sparklesOutline} />
                    <div>
                      <strong>Registrar con el agente</strong>
                      <p>Sube el ticket y el agente arma el desglose: proveedor, productos y totales. Tú revisas todo antes de guardar.</p>
                    </div>
                  </div>
                  <IonButton expand="block" onClick={startAgentOperation} disabled={loading}>
                    <IonIcon slot="start" icon={cameraOutline} />
                    Subir ticket
                  </IonButton>
                </IonCardContent>
              </IonCard>
            )}

            {/* Products — several at once, each with quantity + unit cost (inventory only) */}
            {expenseType === 'inventory' && (
              <ExpenseItemsEditor
                companyId={companyId}
                items={items}
                onChange={setItems}
                disabled={loading}
                invalid={fieldInvalid('products')}
              />
            )}

            {/* Payment details */}
            <IonCard className="expense-form-card">
              <IonCardHeader>
                <IonCardTitle className="expense-form-card-title">Detalles del Pago</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                {expenseType === 'payroll' ? (
                  <IonSelect
                    key="employee-select"
                    id="expense-field-employee"
                    className={`expense-form-item ${invalidClass('employee')}`}
                    errorText="Selecciona un empleado"
                    fill="outline"
                    labelPlacement="stacked"
                    placeholder="Seleccionar empleado"
                    interface="popover"
                    value={employeeId || undefined}
                    onIonChange={(e) => setEmployeeId(Number(e.detail.value) || 0)}
                  >
                  <div slot="label">Empleado <span className="expense-required">*</span></div>
                    {employees.map(employee => (
                      <IonSelectOption key={employee.employeeId} value={employee.employeeId}>
                        {employee.firstName} {employee.lastName}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                ) : expenseType === 'general' ? (
                  <IonSelect
                    key="service-select"
                    id="expense-field-service"
                    className={`expense-form-item ${invalidClass('service')}`}
                    errorText="Selecciona un servicio"
                    fill="outline"
                    labelPlacement="stacked"
                    placeholder="Seleccionar servicio"
                    interface="popover"
                    value={serviceId || undefined}
                    onIonChange={(e) => setServiceId(Number(e.detail.value) || 0)}
                  >
                  <div slot="label">Servicio <span className="expense-required">*</span></div>
                    {services.map(service => (
                      <IonSelectOption key={service.serviceId} value={service.serviceId}>
                        {service.serviceName}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                ) : (
                  <IonSelect
                    key="supplier-select"
                    id="expense-field-supplier"
                    className={`expense-form-item ${invalidClass('supplier')}`}
                    errorText="Selecciona un proveedor"
                    fill="outline"
                    labelPlacement="stacked"
                    placeholder="Seleccionar proveedor"
                    interface="popover"
                    value={supplierId || undefined}
                    onIonChange={(e) => setSupplierId(Number(e.detail.value) || 0)}
                  >
                  <div slot="label">Proveedor <span className="expense-required">*</span></div>
                    {suppliers.map(supplier => (
                      <IonSelectOption key={supplier.supplierId} value={supplier.supplierId}>
                        {supplier.supplierName}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                )}

                {expenseType === 'general' && (
                  <IonButton fill="clear" size="small" className="expense-form-new-supplier"
                    onClick={() => setShowNewService(true)}>
                    <IonIcon slot="start" icon={addOutline} />
                    Nuevo servicio
                  </IonButton>
                )}

                {expenseType === 'inventory' && (
                  <IonButton fill="clear" size="small" className="expense-form-new-supplier"
                    onClick={() => { setNewSupplierName(''); setShowNewSupplier(true); }}>
                    <IonIcon slot="start" icon={addOutline} />
                    Nuevo proveedor
                  </IonButton>
                )}

                <IonSelect
                  id="expense-field-paymentMethod"
                  className={`expense-form-item ${invalidClass('paymentMethod')}`}
                  errorText="Selecciona cómo se pagó"
                  fill="outline"
                  labelPlacement="stacked"
                  placeholder="Seleccionar método"
                  interface="popover"
                  value={paymentMethod || undefined}
                  onIonChange={(e) => setPaymentMethod(e.detail.value)}
                >
                  <div slot="label">Método de Pago <span className="expense-required">*</span></div>
                  <IonSelectOption value="Efectivo">Efectivo</IonSelectOption>
                  <IonSelectOption value="Tarjeta">Tarjeta</IonSelectOption>
                  <IonSelectOption value="Transferencia">Transferencia</IonSelectOption>
                </IonSelect>

                <IonInput
                  className="expense-form-item"
                  fill="outline"
                  label="Fecha de Pago"
                  labelPlacement="stacked"
                  type="date"
                  value={paymentDate}
                  onIonInput={(e) => setPaymentDate(e.detail.value!)}
                />

                {expenseType !== 'inventory' && (
                  <IonInput
                    id="expense-field-total"
                    className={`expense-form-item ${invalidClass('total')}`}
                    errorText="Ingresa un total mayor a cero"
                    fill="outline"
                    labelPlacement="stacked"
                    type="number"
                    value={total || ''}
                    placeholder="0.00"
                    onIonInput={(e) => setTotal(parseFloat(e.detail.value || '0') || 0)}
                  >
                    <div slot="label">Total <span className="expense-required">*</span></div>
                  </IonInput>
                )}

                {expenseType !== 'inventory' && (
                  <IonTextarea
                    className="expense-form-item"
                    fill="outline"
                    label="Notas"
                    labelPlacement="stacked"
                    placeholder={expenseType === 'payroll' ? 'Ej. Quincena 16-31 agosto' : 'Ej. Recibo CFE — sep 2026'}
                    value={notes}
                    onIonInput={(e) => setNotes(e.detail.value ?? '')}
                    autoGrow
                  />
                )}
              </IonCardContent>
            </IonCard>

            {/* Receipt / ticket photo (evidence, required) */}
            <IonCard id="expense-field-receipt" className={`expense-form-card ${fieldInvalid('receipt') ? 'expense-form-card--invalid' : ''}`}>
              <IonCardHeader>
                <IonCardTitle className="expense-form-card-title">Comprobante <span className="expense-required">*</span></IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonButton
                  expand="block"
                  fill="outline"
                  onClick={handlePickReceipt}
                  disabled={uploadingReceipt || loading}
                >
                  <IonIcon slot="start" icon={cameraOutline} />
                  {receiptPhoto ? 'Cambiar foto del ticket' : 'Adjuntar foto del ticket'}
                </IonButton>
                {receiptPhoto && <IonImg src={receiptPhoto} className="expense-receipt-preview" />}
              </IonCardContent>
            </IonCard>

            {/* What the agent read off the ticket — suggestions the user applies explicitly */}
            {receiptPhoto && (
              <TicketReadingCard
                state={ticketReading.state}
                ticket={ticketReading.ticket}
                expenseType={expenseType}
                applied={ticketApplied}
                resolvedLines={resolvedLines}
                disabled={loading}
                review={{ state: expenseReview.state, result: expenseReview.review }}
                canReviewManually={items.length > 0}
                onReview={handleManualReview}
                onApply={applyTicket}
                onAnalyze={analyzeTicket}
                onPickSupplier={(id) => setSupplierId(id)}
                onCreateSupplier={(name) => { setNewSupplierName(name); setShowNewSupplier(true); }}
                onPickLineProduct={addTicketLine}
                onCreateLineProduct={(lineIndex) => setNewProductLine(lineIndex)}
              />
            )}
          </div>
        </IonContent>

        <IonFooter className="expense-form-footer">
          <div className="expense-form-total-row">
            <span className="expense-form-total-label">Total</span>
            <span className="expense-form-total-amount">{fmtMXN(total)}</span>
          </div>
          {missingFields.length > 0 && (
            <p className="expense-form-missing-hint">
              Falta: {missingFields.map(f => f.label).join(', ')}
            </p>
          )}
          <IonButton
            expand="block"
            className="expense-form-submit"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? <IonSpinner name="dots" /> : 'Crear Egreso'}
          </IonButton>
        </IonFooter>

      <NewSupplierModal
        isOpen={showNewSupplier}
        companyId={companyId}
        initialName={newSupplierName}
        onClose={() => setShowNewSupplier(false)}
        onCreated={(supplier, list) => {
          setSuppliers(list);
          setSupplierId(supplier.supplierId);
          setShowNewSupplier(false);
          showToast(`Proveedor "${supplier.supplierName}" creado y seleccionado`, 'success');
        }}
      />

      <NewSupplyProductModal
        isOpen={newProductLine !== null}
        companyId={companyId}
        initialName={newProductLine !== null ? ticketReading.ticket?.lineItems[newProductLine]?.name ?? '' : ''}
        onClose={() => setNewProductLine(null)}
        onCreated={(product) => {
          if (newProductLine !== null) addTicketLine(newProductLine, product.productId, product.name);
          setNewProductLine(null);
          showToast(`Producto "${product.name}" creado y agregado`, 'success');
        }}
      />

      <NewServiceModal
        isOpen={showNewService}
        companyId={companyId}
        onClose={() => setShowNewService(false)}
        onCreated={(service, list) => {
          setServices(list);
          setServiceId(service.serviceId);
          setShowNewService(false);
          showToast(`Servicio "${service.serviceName}" creado y seleccionado`, 'success');
        }}
      />

      <IonToast {...toastProps} />
    </IonPage>
  );
};

export default ExpenseForm;
