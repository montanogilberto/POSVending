import React, { useState, useEffect } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonButton,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonList,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonIcon,
  IonChip,
  IonModal,
  IonSearchbar,
  IonToast,
  IonLoading,
  IonImg,
  IonSpinner,
  IonFooter,
  IonSegment,
  IonSegmentButton,
  IonTextarea,
} from '@ionic/react';
import { addOutline, removeOutline, searchOutline, closeOutline, arrowBack, alertCircleOutline, refreshOutline, cameraOutline, receiptOutline, cardOutline, sparklesOutline, warningOutline, cubeOutline, documentTextOutline, peopleOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { getProductsByCompany } from '../../api/productsApi';
import { ExpenseProduct, ExpenseType, createExpense, uploadExpenseReceiptImage } from '../../api/expensesApi';
import { getAllSuppliers, Supplier } from '../../api/supplierApi';
import { getAllServices, Service } from '../../api/serviceApi';
import { getAllEmployees, Employee } from '../../api/employeesApi';
import { categorizeExpense, ExpenseCategorization } from '../../api/expenseAgentApi';
import { pickExpenseReceiptPhoto } from '../../utils/pickAvatarPhoto';
import { useUser } from '../../contexts/UserContext';
import { useToast } from '../../hooks/useToast';
import { notifyDataChanged } from '../../utils/refreshBus';
import NewSupplierModal from './NewSupplierModal';
import NewServiceModal from './NewServiceModal';
import { fmtMXN, toHermosilloDate } from '../../utils/format';

// The picker gives a Hermosillo calendar day ('YYYY-MM-DD'). Today must be
// Hermosillo's today (UTC rolls over at 17:00 local), and the stored timestamp
// is that day's noon in Hermosillo (UTC-7 → 19:00Z): `new Date('2026-09-29')`
// is UTC midnight = Sept 28 17:00 local, which showed every expense a day
// early and put the 1st of a month into the previous month.
const hermosilloToday = () => toHermosilloDate(new Date().toISOString()).toISOString().split('T')[0];
const hermosilloNoonUtc = (day: string) => `${day}T19:00:00.000Z`;
import './ExpenseForm.css';

interface Product {
  productId: number;
  name: string;
  code: string;
  description: string;
  categoryId: number;
  salePrice: number;
  options?: any[];
}

interface SelectedProduct {
  productId: number;
  name: string;
  salePrice: number;
  options: {
    productOptionId: number;
    choices: Array<{
      productOptionChoiceId: number;
    }>;
  };
}

const ExpenseForm: React.FC = () => {
  const { companyId, userId } = useUser();
  const history = useHistory();
  const goToExpenses = () => history.push('/egresos');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [searchText, setSearchText] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
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
  const [usingFallbackData, setUsingFallbackData] = useState(false);
  const [lastError, setLastError] = useState<string>('');
  const [receiptPhoto, setReceiptPhoto] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [agentReview, setAgentReview] = useState<ExpenseCategorization | null>(null);
  const [agentReviewing, setAgentReviewing] = useState(false);
  const [expenseType, setExpenseType] = useState<ExpenseType>('inventory');
  const [notes, setNotes] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState<number>(0);

  const handlePickReceipt = async () => {
    const dataUrl = await pickExpenseReceiptPhoto();
    if (dataUrl) setReceiptPhoto(dataUrl);
  };

  const handleAgentReview = async () => {
    setAgentReviewing(true);
    setAgentReview(null);
    try {
      const description = selectedProducts.map(p => p.name).join(', ');
      const result = await categorizeExpense({ companyId, description, total, paymentMethod });
      setAgentReview(result);
      if (!result) {
        showToast('No se pudo revisar el egreso con el agente');
      }
    } finally {
      setAgentReviewing(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      loadProducts();
      loadSuppliers();
      loadServices();
      loadEmployees();
    }
  }, [companyId]);

  useEffect(() => {
    // Calculate total whenever products change
    calculateTotal();
  }, [selectedProducts]);

  useEffect(() => {
    // Switching type starts each mode from a clean slate — avoids e.g. a
    // leftover supplierId silently riding along into a payroll payload.
    setSelectedProducts([]);
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

  const loadProducts = async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }

      // Reset error state
      setLastError('');
      setUsingFallbackData(false);

      // Real, typed endpoint (includes product pricing via details[])
      const productsData = await getProductsByCompany(companyId);

      // Map to ensure all required Product interface properties are present
      const mappedProducts = productsData.map(prod => ({
        productId: prod.productId,
        name: prod.name,
        code: prod.code,
        description: prod.description,
        categoryId: prod.categoryId,
        salePrice: prod.details?.[0]?.salePrice ?? prod.details?.[0]?.unitPrice ?? 0,
        options: prod.options || [],
      }));

      setProducts(mappedProducts);

    } catch (error: any) {
      console.error('Error loading products:', error);
      const errorMsg = error.message || 'Error al cargar productos';

      setLastError(errorMsg);
      setProducts([]); // Clear products on error

      // Only show toast if not using fallback data
      if (!usingFallbackData) {
        showToast(errorMsg);
      }

    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchText.toLowerCase()) ||
    product.code.toLowerCase().includes(searchText.toLowerCase())
  );

  const addProduct = (product: Product) => {
    // Check if product is already selected
    const isAlreadySelected = selectedProducts.some(p => p.productId === product.productId);
    if (isAlreadySelected) {
      showToast('El producto ya está seleccionado');
      return;
    }

    const newSelectedProduct: SelectedProduct = {
      productId: product.productId,
      name: product.name,
      salePrice: product.salePrice,
      options: {
        productOptionId: 1, // Default option
        choices: [
          { productOptionChoiceId: 1 } // Default choice
        ]
      }
    };

    setSelectedProducts([...selectedProducts, newSelectedProduct]);
    setShowProductModal(false);
    setSearchText('');
  };

  const removeProduct = (productId: number) => {
    setSelectedProducts(selectedProducts.filter(p => p.productId !== productId));
  };

  const calculateTotal = () => {
    const calculatedTotal = selectedProducts.reduce((sum, p) => sum + (p.salePrice || 0), 0);
    setTotal(calculatedTotal);
  };

  const handleSubmit = async () => {
    if (expenseType === 'inventory' && selectedProducts.length === 0) {
      showToast('Debe seleccionar al menos un producto');
      return;
    }

    if (expenseType === 'payroll') {
      if (employeeId === 0) {
        showToast('Debe seleccionar un empleado');
        return;
      }
    } else if (expenseType === 'general') {
      if (serviceId === 0) {
        showToast('Debe seleccionar un servicio');
        return;
      }
    } else if (supplierId === 0) {
      showToast('Debe seleccionar un proveedor');
      return;
    }

    if (!paymentMethod) {
      showToast('Debe seleccionar un método de pago');
      return;
    }

    if (expenseType !== 'inventory' && total <= 0) {
      showToast('Debe ingresar un total mayor a cero');
      return;
    }

    try {
      setLoading(true);

      // Receipt photo is optional — upload failure shouldn't block creating the expense.
      let receiptUrl: string | undefined;
      if (receiptPhoto) {
        try {
          setUploadingReceipt(true);
          const upload = await uploadExpenseReceiptImage({
            companyId,
            imageBase64: receiptPhoto,
          });
          receiptUrl = upload?.blobUrl;
        } catch (uploadError) {
          console.error('Error uploading receipt photo:', uploadError);
        } finally {
          setUploadingReceipt(false);
        }
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
                products: selectedProducts.map(product => ({
                  productId: product.productId,
                  options: product.options
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
      setSelectedProducts([]);
      setSupplierId(0);
      setServiceId(0);
      setEmployeeId(0);
      setPaymentMethod('');
      setPaymentDate(hermosilloToday());
      setTotal(0);
      setNotes('');
      setExpenseType('inventory');
      setReceiptPhoto(null);
      setAgentReview(null);
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

            {/* Selected Products — only for inventory (restocking the sales catalog) */}
            {expenseType === 'inventory' && (
            <IonCard className="expense-form-card">
              <IonCardHeader>
                <IonCardTitle className="expense-form-card-title">Productos</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                {selectedProducts.length === 0 ? (
                  <div className="expense-form-empty">
                    <IonIcon icon={receiptOutline} />
                    <p>No hay productos seleccionados</p>
                  </div>
                ) : (
                  <IonList className="expense-form-product-list" lines="none">
                    {selectedProducts.map((product, index) => (
                      <IonItem key={index} className="expense-form-product-item">
                        <IonIcon icon={cardOutline} slot="start" className="expense-form-product-icon" />
                        <IonLabel>
                          <h3>{product.name}</h3>
                          <p>{fmtMXN(product.salePrice)}</p>
                        </IonLabel>
                        <IonButton
                          fill="clear"
                          color="danger"
                          slot="end"
                          onClick={() => removeProduct(product.productId)}
                        >
                          <IonIcon icon={removeOutline} slot="icon-only" />
                        </IonButton>
                      </IonItem>
                    ))}
                  </IonList>
                )}
                <IonButton
                  expand="block"
                  fill="outline"
                  onClick={() => setShowProductModal(true)}
                  className="ion-margin-top"
                  disabled={loading}
                >
                  <IonIcon icon={addOutline} slot="start" />
                  Agregar Producto
                </IonButton>

                {/* Retry and Error handling */}
                {usingFallbackData && (
                  <IonChip color="warning" className="ion-margin-top">
                    <IonIcon icon={alertCircleOutline} />
                    <IonLabel>Datos de ejemplo activos</IonLabel>
                  </IonChip>
                )}
                
                {lastError && !usingFallbackData && (
                  <div className="ion-margin-top">
                    <IonChip color="danger">
                      <IonIcon icon={alertCircleOutline} />
                      <IonLabel>{lastError}</IonLabel>
                    </IonChip>
                    <IonButton 
                      fill="clear" 
                      size="small" 
                      onClick={() => loadProducts(true)}
                      className="ion-margin-top"
                      disabled={loading}
                    >
                      <IonIcon icon={refreshOutline} slot="start" />
                      Reintentar
                    </IonButton>
                  </div>
                )}

                {products.length === 0 && !loading && !usingFallbackData && (
                  <IonButton 
                    fill="outline" 
                    color="medium"
                    onClick={() => loadProducts(true)}
                    className="ion-margin-top"
                    disabled={loading}
                  >
                    <IonIcon icon={refreshOutline} slot="start" />
                    Recargar Productos
                  </IonButton>
                )}
              </IonCardContent>
            </IonCard>
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
                    className="expense-form-item"
                    fill="outline"
                    label="Empleado"
                    labelPlacement="floating"
                    placeholder="Seleccionar empleado"
                    interface="popover"
                    value={employeeId || undefined}
                    onIonChange={(e) => setEmployeeId(Number(e.detail.value) || 0)}
                  >
                    {employees.map(employee => (
                      <IonSelectOption key={employee.employeeId} value={employee.employeeId}>
                        {employee.firstName} {employee.lastName}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                ) : expenseType === 'general' ? (
                  <IonSelect
                    key="service-select"
                    className="expense-form-item"
                    fill="outline"
                    label="Servicio"
                    labelPlacement="floating"
                    placeholder="Seleccionar servicio"
                    interface="popover"
                    value={serviceId || undefined}
                    onIonChange={(e) => setServiceId(Number(e.detail.value) || 0)}
                  >
                    {services.map(service => (
                      <IonSelectOption key={service.serviceId} value={service.serviceId}>
                        {service.serviceName}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                ) : (
                  <IonSelect
                    key="supplier-select"
                    className="expense-form-item"
                    fill="outline"
                    label="Proveedor"
                    labelPlacement="floating"
                    placeholder="Seleccionar proveedor"
                    interface="popover"
                    value={supplierId || undefined}
                    onIonChange={(e) => setSupplierId(Number(e.detail.value) || 0)}
                  >
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
                    onClick={() => setShowNewSupplier(true)}>
                    <IonIcon slot="start" icon={addOutline} />
                    Nuevo proveedor
                  </IonButton>
                )}

                <IonSelect
                  className="expense-form-item"
                  fill="outline"
                  label="Método de Pago"
                  labelPlacement="floating"
                  placeholder="Seleccionar método"
                  interface="popover"
                  value={paymentMethod || undefined}
                  onIonChange={(e) => setPaymentMethod(e.detail.value)}
                >
                  <IonSelectOption value="Efectivo">Efectivo</IonSelectOption>
                  <IonSelectOption value="Tarjeta">Tarjeta</IonSelectOption>
                  <IonSelectOption value="Transferencia">Transferencia</IonSelectOption>
                </IonSelect>

                <IonInput
                  className="expense-form-item"
                  fill="outline"
                  label="Fecha de Pago"
                  labelPlacement="floating"
                  type="date"
                  value={paymentDate}
                  onIonInput={(e) => setPaymentDate(e.detail.value!)}
                />

                {expenseType !== 'inventory' && (
                  <IonInput
                    className="expense-form-item"
                    fill="outline"
                    label="Total"
                    labelPlacement="floating"
                    type="number"
                    value={total || ''}
                    placeholder="0.00"
                    onIonInput={(e) => setTotal(parseFloat(e.detail.value || '0') || 0)}
                  />
                )}

                {expenseType !== 'inventory' && (
                  <IonTextarea
                    className="expense-form-item"
                    fill="outline"
                    label="Notas"
                    labelPlacement="floating"
                    placeholder={expenseType === 'payroll' ? 'Ej. Quincena 16-31 agosto' : 'Ej. Recibo CFE — sep 2026'}
                    value={notes}
                    onIonInput={(e) => setNotes(e.detail.value ?? '')}
                    autoGrow
                  />
                )}
              </IonCardContent>
            </IonCard>

            {/* Agent-assisted category suggestion + anomaly flag — only meaningful for inventory (inspects selected products) */}
            {expenseType === 'inventory' && (
            <IonCard className="expense-form-card">
              <IonCardHeader>
                <IonCardTitle className="expense-form-card-title">Revisión del Agente</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonButton
                  expand="block"
                  fill="outline"
                  onClick={handleAgentReview}
                  disabled={agentReviewing || selectedProducts.length === 0}
                >
                  {agentReviewing ? (
                    <IonSpinner name="dots" />
                  ) : (
                    <>
                      <IonIcon slot="start" icon={sparklesOutline} />
                      Sugerir categoría
                    </>
                  )}
                </IonButton>
                {agentReview && (
                  <div className="expense-agent-result ion-margin-top">
                    <IonChip color="primary">
                      <IonIcon icon={sparklesOutline} />
                      <IonLabel>{agentReview.suggestedCategory}</IonLabel>
                    </IonChip>
                    {agentReview.isAnomaly && (
                      <IonChip color="warning">
                        <IonIcon icon={warningOutline} />
                        <IonLabel>{agentReview.anomalyReason || 'Posible anomalía'}</IonLabel>
                      </IonChip>
                    )}
                  </div>
                )}
              </IonCardContent>
            </IonCard>
            )}

            {/* Receipt / ticket photo (evidence, optional) */}
            <IonCard className="expense-form-card">
              <IonCardHeader>
                <IonCardTitle className="expense-form-card-title">Comprobante</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonButton
                  expand="block"
                  fill="outline"
                  onClick={handlePickReceipt}
                  disabled={uploadingReceipt || loading}
                >
                  <IonIcon slot="start" icon={cameraOutline} />
                  {receiptPhoto ? 'Cambiar foto del ticket' : 'Adjuntar foto del ticket (opcional)'}
                </IonButton>
                {receiptPhoto && <IonImg src={receiptPhoto} className="expense-receipt-preview" />}
              </IonCardContent>
            </IonCard>
          </div>
        </IonContent>

        <IonFooter className="expense-form-footer">
          <div className="expense-form-total-row">
            <span className="expense-form-total-label">Total</span>
            <span className="expense-form-total-amount">{fmtMXN(total)}</span>
          </div>
          <IonButton
            expand="block"
            className="expense-form-submit"
            onClick={handleSubmit}
            disabled={
              loading ||
              !paymentMethod ||
              (expenseType === 'inventory' && (selectedProducts.length === 0 || supplierId === 0)) ||
              (expenseType === 'general' && (serviceId === 0 || total <= 0)) ||
              (expenseType === 'payroll' && (employeeId === 0 || total <= 0))
            }
          >
            {loading ? <IonSpinner name="dots" /> : 'Crear Egreso'}
          </IonButton>
        </IonFooter>

      {/* Product Selection Modal */}
      <IonModal isOpen={showProductModal} onDidDismiss={() => setShowProductModal(false)}>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonButton onClick={() => setShowProductModal(false)}>
                <IonIcon icon={closeOutline} />
              </IonButton>
            </IonButtons>
            <IonTitle>Seleccionar Productos</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <IonSearchbar
            value={searchText}
            onIonInput={(e) => setSearchText(e.detail.value!)}
            placeholder="Buscar productos..."
          />
          <IonList>
            {filteredProducts.map((product) => (
              <IonItem key={product.productId} onClick={() => addProduct(product)}>
                <IonLabel>
                  <h3>{product.name}</h3>
                  <p>Código: {product.code}</p>
                  <p className="secondary-text">{product.description}</p>
                </IonLabel>
              </IonItem>
            ))}
          </IonList>
        </IonContent>
      </IonModal>

      <NewSupplierModal
        isOpen={showNewSupplier}
        companyId={companyId}
        onClose={() => setShowNewSupplier(false)}
        onCreated={(supplier, list) => {
          setSuppliers(list);
          setSupplierId(supplier.supplierId);
          setShowNewSupplier(false);
          showToast(`Proveedor "${supplier.supplierName}" creado y seleccionado`, 'success');
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
