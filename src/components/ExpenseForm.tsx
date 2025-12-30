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
  IonTextarea,
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
} from '@ionic/react';
import { addOutline, removeOutline, searchOutline, closeOutline, alertCircleOutline, refreshOutline } from 'ionicons/icons';
import { getAllProducts } from '../api/productsApi';
import { ExpenseProduct } from '../api/expensesApi';
import { fetchProductsByCompany } from '../utils/apiUtils';

// Mock suppliers - in real app, this would come from an API
const SUPPLIERS = [
  { supplierId: 1, name: 'Proveedor A' },
  { supplierId: 2, name: 'Proveedor B' },
  { supplierId: 3, name: 'Proveedor C' },
  { supplierId: 4, name: 'Proveedor D' },
];

interface Product {
  productId: number;
  name: string;
  code: string;
  description: string;
  categoryId: number;
  options?: any[];
}

interface SelectedProduct {
  productId: number;
  name: string;
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
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [searchText, setSearchText] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [supplierId, setSupplierId] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(1); // Default company
  const [usingFallbackData, setUsingFallbackData] = useState(false);
  const [lastError, setLastError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadProducts();
    }
  }, [isOpen, selectedCompanyId]);

  useEffect(() => {
    // Calculate total whenever products change
    calculateTotal();
  }, [selectedProducts]);

  const loadProducts = async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      
      // Reset error state
      setLastError('');
      setUsingFallbackData(false);
      
      // Use the shared utility function for better error handling and consistency
      const productsData = await fetchProductsByCompany(selectedCompanyId);
      
      // Map to ensure all required Product interface properties are present
      const mappedProducts = productsData.map(prod => ({
        productId: prod.productId,
        name: prod.name,
        code: prod.code,
        description: prod.description,
        categoryId: prod.categoryId,
        options: prod.options || [],
      }));
      
      setProducts(mappedProducts);
      
      // Check if we're using fallback data
      if (productsData.some(prod => prod.name.includes('(Empresa'))) {
        setUsingFallbackData(true);
        setLastError('Usando datos de ejemplo - El servidor no está disponible');
      }
      
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
    // For now, set a simple total. In real app, this would be based on product prices
    const calculatedTotal = selectedProducts.length * 100; // Mock calculation
    setTotal(calculatedTotal);
  };

  const handleSubmit = async () => {
    if (selectedProducts.length === 0) {
      setToastMessage('Debe seleccionar al menos un producto');
      setShowToast(true);
      return;
    }

    if (supplierId === 0) {
      setToastMessage('Debe seleccionar un proveedor');
      setShowToast(true);
      return;
    }

    if (!paymentMethod) {
      setToastMessage('Debe seleccionar un método de pago');
      setShowToast(true);
      return;
    }

    const expenseData = {
      expenses: [{
        action: 1,
        total: total,
        paymentMethod: paymentMethod,
        paymentDate: new Date(paymentDate).toISOString(),
        userId: 1, // Mock user ID
        supplierId: supplierId,
        companyId: selectedCompanyId,
        products: selectedProducts.map(product => ({
          productId: product.productId,
          options: product.options
        }))
      }]
    };

    try {
      setLoading(true);
      await onSubmit(expenseData);
      // Reset form
      setSelectedProducts([]);
      setSupplierId(0);
      setPaymentMethod('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setTotal(0);
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
      <IonModal isOpen={isOpen} onDidDismiss={onClose}>
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
        <IonContent>
          <IonLoading isOpen={loading} message="Guardando..." />
          
          <div className="ion-padding">
            {/* Selected Products */}
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>Productos Seleccionados</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                {selectedProducts.length === 0 ? (
                  <p className="secondary-text">No hay productos seleccionados</p>
                ) : (
                  <IonList>
                    {selectedProducts.map((product, index) => (
                      <IonItem key={index}>
                        <IonLabel>
                          <h3>{product.name}</h3>
                          <p>ID: {product.productId}</p>
                        </IonLabel>
                        <IonButton 
                          fill="clear" 
                          color="danger" 
                          onClick={() => removeProduct(product.productId)}
                        >
                          <IonIcon icon={removeOutline} />
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

            {/* Company Selection */}
            <IonItem className="ion-margin-top">
              <IonLabel>Empresa</IonLabel>
              <IonSelect 
                value={selectedCompanyId} 
                placeholder="Seleccionar empresa"
                onIonChange={(e) => {
                  setSelectedCompanyId(e.detail.value);
                  // Reload products for the new company
                  setTimeout(() => loadProducts(true), 100);
                }}
              >
                <IonSelectOption value={1}>Empresa 1</IonSelectOption>
                <IonSelectOption value={2}>Empresa 2</IonSelectOption>
                <IonSelectOption value={3}>Empresa 3</IonSelectOption>
                <IonSelectOption value={4}>Empresa 4</IonSelectOption>
              </IonSelect>
            </IonItem>

            {/* Supplier Selection */}
            <IonItem className="ion-margin-top">
              <IonLabel>Proveedor</IonLabel>
              <IonSelect 
                value={supplierId} 
                placeholder="Seleccionar proveedor"
                onIonChange={(e) => setSupplierId(e.detail.value)}
              >
                <IonSelectOption value={0}>Seleccionar...</IonSelectOption>
                {SUPPLIERS.map(supplier => (
                  <IonSelectOption key={supplier.supplierId} value={supplier.supplierId}>
                    {supplier.name}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>

            {/* Payment Method */}
            <IonItem className="ion-margin-top">
              <IonLabel>Método de Pago</IonLabel>
              <IonSelect 
                value={paymentMethod} 
                placeholder="Seleccionar método"
                onIonChange={(e) => setPaymentMethod(e.detail.value)}
              >
                <IonSelectOption value="Efectivo">Efectivo</IonSelectOption>
                <IonSelectOption value="Tarjeta">Tarjeta</IonSelectOption>
                <IonSelectOption value="Transferencia">Transferencia</IonSelectOption>
              </IonSelect>
            </IonItem>

            {/* Payment Date */}
            <IonItem className="ion-margin-top">
              <IonLabel>Fecha de Pago</IonLabel>
              <IonInput 
                type="date" 
                value={paymentDate}
                onIonInput={(e) => setPaymentDate(e.detail.value!)}
              />
            </IonItem>

            {/* Description */}
            <IonItem className="ion-margin-top">
              <IonLabel>Descripción</IonLabel>
              <IonTextarea 
                value={description}
                placeholder="Descripción del egreso"
                onIonInput={(e) => setDescription(e.detail.value!)}
              />
            </IonItem>

            {/* Total */}
            <IonItem className="ion-margin-top">
              <IonLabel>Total</IonLabel>
              <IonInput 
                type="number" 
                value={total}
                placeholder="0.00"
                onIonInput={(e) => setTotal(parseFloat(e.detail.value!))}
              />
            </IonItem>

            {/* Submit Button */}
            <IonButton 
              expand="block" 
              className="ion-margin-top"
              onClick={handleSubmit}
              disabled={selectedProducts.length === 0 || supplierId === 0 || !paymentMethod}
            >
              Crear Egreso
            </IonButton>
          </div>
        </IonContent>
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
