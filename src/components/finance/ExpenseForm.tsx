import React, { useState, useEffect } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonButton,
  IonBackButton,
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
import { addOutline, removeOutline, searchOutline, closeOutline, alertCircleOutline, refreshOutline, cameraOutline, receiptOutline, cardOutline, sparklesOutline, warningOutline, cubeOutline, documentTextOutline, peopleOutline } from 'ionicons/icons';
import { getProductsByCompany } from '../../api/productsApi';
import { ExpenseProduct, ExpenseType, uploadExpenseReceiptImage } from '../../api/expensesApi';
import { getAllSuppliers, Supplier } from '../../api/supplierApi';
import { getAllEmployees, Employee } from '../../api/employeesApi';
import { categorizeExpense, ExpenseCategorization } from '../../api/expenseAgentApi';
import { pickExpenseReceiptPhoto } from '../../utils/pickAvatarPhoto';
import { useUser } from '../../contexts/UserContext';
import { fmtMXN } from '../../utils/format';
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

interface ExpenseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (expenseData: any) => Promise<void>;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ isOpen, onClose, onSubmit }) => {
  const { companyId, userId } = useUser();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [searchText, setSearchText] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
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
        setToastMessage('No se pudo revisar el egreso con el agente');
        setShowToast(true);
      }
    } finally {
      setAgentReviewing(false);
    }
  };

  useEffect(() => {
    if (isOpen && companyId) {
      loadProducts();
      loadSuppliers();
    }
  }, [isOpen, companyId]);

  useEffect(() => {
    // Employees aren't company-scoped on the backend today (no companyId on
    // dbo.employees) — loaded once per open, independent of companyId.
    if (isOpen) {
      loadEmployees();
    }
  }, [isOpen]);

  useEffect(() => {
    // Calculate total whenever products change
    calculateTotal();
  }, [selectedProducts]);

  useEffect(() => {
    // Switching type starts each mode from a clean slate — avoids e.g. a
    // leftover supplierId silently riding along into a payroll payload.
    setSelectedProducts([]);
    setSupplierId(0);
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

  const loadEmployees = async () => {
    try {
      const employeeList = await getAllEmployees();
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
        setToastMessage(errorMsg);
        setShowToast(true);
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
      setToastMessage('El producto ya está seleccionado');
      setShowToast(true);
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
      setToastMessage('Debe seleccionar al menos un producto');
      setShowToast(true);
      return;
    }

    if (expenseType === 'payroll') {
      if (employeeId === 0) {
        setToastMessage('Debe seleccionar un empleado');
        setShowToast(true);
        return;
      }
    } else if (supplierId === 0) {
      setToastMessage('Debe seleccionar un proveedor');
      setShowToast(true);
      return;
    }

    if (!paymentMethod) {
      setToastMessage('Debe seleccionar un método de pago');
      setShowToast(true);
      return;
    }

    if (expenseType !== 'inventory' && total <= 0) {
      setToastMessage('Debe ingresar un total mayor a cero');
      setShowToast(true);
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
          paymentDate: new Date(paymentDate).toISOString(),
          userId,
          companyId,
          expenseType,
          ...(expenseType === 'payroll' ? { employeeId } : { supplierId }),
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

      await onSubmit(expenseData);
      // Reset form
      setSelectedProducts([]);
      setSupplierId(0);
      setEmployeeId(0);
      setPaymentMethod('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setTotal(0);
      setNotes('');
      setExpenseType('inventory');
      setReceiptPhoto(null);
      setAgentReview(null);
      onClose();
    } catch (error) {
      console.error('Error creating expense:', error);
      setToastMessage('Error al crear el egreso');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <IonModal isOpen={isOpen} onDidDismiss={onClose} className="expense-form-modal">
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonButton onClick={onClose}>
                <IonIcon icon={closeOutline} slot="icon-only" />
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
                <IonItem className="expense-form-item" lines="none">
                  <IonSelect
                    fill="outline"
                    label="Empleado"
                    labelPlacement="floating"
                    placeholder="Seleccionar empleado"
                    value={employeeId}
                    onIonChange={(e) => setEmployeeId(e.detail.value)}
                  >
                    <IonSelectOption value={0}>Seleccionar...</IonSelectOption>
                    {employees.map(employee => (
                      <IonSelectOption key={employee.employeeId} value={employee.employeeId}>
                        {employee.firstName} {employee.lastName}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </IonItem>
                ) : (
                <IonItem className="expense-form-item" lines="none">
                  <IonSelect
                    fill="outline"
                    label="Proveedor"
                    labelPlacement="floating"
                    placeholder="Seleccionar proveedor"
                    value={supplierId}
                    onIonChange={(e) => setSupplierId(e.detail.value)}
                  >
                    <IonSelectOption value={0}>Seleccionar...</IonSelectOption>
                    {suppliers.map(supplier => (
                      <IonSelectOption key={supplier.supplierId} value={supplier.supplierId}>
                        {supplier.supplierName}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </IonItem>
                )}

                <IonItem className="expense-form-item" lines="none">
                  <IonSelect
                    fill="outline"
                    label="Método de Pago"
                    labelPlacement="floating"
                    placeholder="Seleccionar método"
                    value={paymentMethod}
                    onIonChange={(e) => setPaymentMethod(e.detail.value)}
                  >
                    <IonSelectOption value="Efectivo">Efectivo</IonSelectOption>
                    <IonSelectOption value="Tarjeta">Tarjeta</IonSelectOption>
                    <IonSelectOption value="Transferencia">Transferencia</IonSelectOption>
                  </IonSelect>
                </IonItem>

                <IonItem className="expense-form-item" lines="none">
                  <IonInput
                    fill="outline"
                    label="Fecha de Pago"
                    labelPlacement="floating"
                    type="date"
                    value={paymentDate}
                    onIonInput={(e) => setPaymentDate(e.detail.value!)}
                  />
                </IonItem>

                {expenseType !== 'inventory' && (
                <IonItem className="expense-form-item" lines="none">
                  <IonInput
                    fill="outline"
                    label="Total"
                    labelPlacement="floating"
                    type="number"
                    value={total || ''}
                    placeholder="0.00"
                    onIonInput={(e) => setTotal(parseFloat(e.detail.value || '0') || 0)}
                  />
                </IonItem>
                )}

                {expenseType !== 'inventory' && (
                <IonItem className="expense-form-item" lines="none">
                  <IonTextarea
                    fill="outline"
                    label="Notas"
                    labelPlacement="floating"
                    placeholder={expenseType === 'payroll' ? 'Ej. Quincena 16-31 agosto' : 'Ej. Recibo CFE — sep 2026'}
                    value={notes}
                    onIonInput={(e) => setNotes(e.detail.value ?? '')}
                    autoGrow
                  />
                </IonItem>
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
              (expenseType === 'general' && (supplierId === 0 || total <= 0)) ||
              (expenseType === 'payroll' && (employeeId === 0 || total <= 0))
            }
          >
            {loading ? <IonSpinner name="dots" /> : 'Crear Egreso'}
          </IonButton>
        </IonFooter>
      </IonModal>

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

      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={toastMessage}
        duration={3000}
      />
    </>
  );
};

export default ExpenseForm;
