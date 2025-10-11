import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonButton,
  IonButtons,
  IonBackButton,
  IonGrid,
  IonRow,
  IonCol,
  IonList,
  IonItem,
  IonLabel,
  IonRadioGroup,
  IonRadio,
  IonInput,
  IonLoading,
  IonToast,
  IonIcon,
} from '@ionic/react';
import { close } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';

interface Choice {
  id: number;
  name: string;
  price: number;
}

interface Option {
  id: number;
  name: string;
  type: 'radio';
  choices: Choice[];
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  categoryId: number;
  options: Option[];
}

interface SelectedItem {
  productId: number;
  name: string;
  description: string;
  basePrice: number;
  quantity: number;
  selectedOptions: { [optionId: number]: number }; // choiceId
  totalPrice: number;
}

const ProductSelection: React.FC = () => {
  const history = useHistory();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // State for selected options and quantity per product (use index or id for simplicity)
  const [selectedChoices, setSelectedChoices] = useState<{ [productId: number]: { [optionId: number]: number } }>({});
  const [quantities, setQuantities] = useState<{ [productId: number]: number }>({});

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const response = await fetch('https://smartloansbackend.azurewebsites.net/by_company_products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: [{ companyId: '1' }]
        }),
      });

      if (!response.ok) {
        throw new Error(`Error fetching products: ${response.status}`);
      }

      const data = await response.json();
      console.log('Fetched products:', data);
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setFetchError('No se pudieron cargar los productos.');
      setToastMessage('Error al cargar productos.');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionChange = (productId: number, optionId: number, choiceId: number) => {
    setSelectedChoices(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [optionId]: choiceId
      }
    }));
  };

  const handleQuantityChange = (productId: number, quantity: number) => {
    if (quantity > 0) {
      setQuantities(prev => ({ ...prev, [productId]: quantity }));
    }
  };

  const calculateTotalPrice = (product: Product) => {
    let total = product.price;
    const productId = product.id;
    const productChoices = selectedChoices[productId] || {};
    product.options.forEach(option => {
      const choiceId = productChoices[option.id];
      if (choiceId) {
        const choice = option.choices.find(c => c.id === choiceId);
        if (choice) total += choice.price;
      }
    });
    return total;
  };

  const addToCart = (product: Product) => {
    const productId = product.id;
    const quantity = quantities[productId] || 1;
    if (quantity < 1) {
      setToastMessage('Seleccione una cantidad válida.');
      setShowToast(true);
      return;
    }

    const selectedOptions = selectedChoices[productId] || {};
    const totalPrice = calculateTotalPrice(product) * quantity;

    const item: SelectedItem = {
      productId,
      name: product.name,
      description: product.description,
      basePrice: product.price,
      quantity,
      selectedOptions,
      totalPrice
    };

    // Navigate back to /laundry with item in state
    history.push('/laundry', { from: 'product-selection', item });

    setToastMessage(`Producto "${product.name}" agregado al carrito.`);
    setShowToast(true);
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/laundry" />
            </IonButtons>
            <IonButtons slot="end">
              <IonButton onClick={() => history.push('/laundry')}>
                <IonIcon icon={close} />
              </IonButton>
            </IonButtons>
            <IonTitle>Seleccionar Productos</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <IonLoading isOpen={loading} message="Cargando productos..." />
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/laundry" />
          </IonButtons>
          <IonButtons slot="end">
            <IonButton onClick={() => history.push('/laundry')}>
              <IonIcon icon={close} />
            </IonButton>
          </IonButtons>
          <IonTitle>Seleccionar Productos</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {fetchError && <p className="ion-text-center">{fetchError}</p>}
        {products.length > 0 ? (
          <IonGrid>
            <IonRow>
              {products.map((product) => {
                const totalPrice = calculateTotalPrice(product);
                return (
                  <IonCol size="12" sizeMd="6" sizeLg="4" key={product.id}>
                    <IonCard>
                      <IonCardHeader>
                        <IonCardTitle>{product.name}</IonCardTitle>
                        <IonCardSubtitle>${totalPrice.toFixed(2)}</IonCardSubtitle>
                      </IonCardHeader>
                      <IonCardContent>
                        <p>{product.description}</p>
                        
                        {/* Options */}
                        {product.options.map((option) => (
                          <IonItem key={option.id}>
                            <IonLabel>{option.name}</IonLabel>
                            <IonRadioGroup
                              value={selectedChoices[product.id]?.[option.id] || ''}
                              onIonChange={(e) => handleOptionChange(product.id, option.id, parseInt(e.detail.value))}
                            >
                              {option.choices.map((choice) => (
                                <IonItem key={choice.id}>
                                  <IonLabel>{choice.name} (+${choice.price.toFixed(2)})</IonLabel>
                                  <IonRadio slot="start" value={choice.id.toString()} />
                                </IonItem>
                              ))}
                            </IonRadioGroup>
                          </IonItem>
                        ))}

                        {/* Quantity */}
                        <IonItem>
                          <IonLabel>Cantidad</IonLabel>
                          <IonInput
                            type="number"
                            min="1"
                            value={quantities[product.id] || 1}
                            onIonChange={(e) => handleQuantityChange(product.id, parseInt(e.detail.value!) || 1)}
                            slot="end"
                          />
                        </IonItem>

                        <IonButton
                          expand="block"
                          onClick={() => addToCart(product)}
                          className="add-to-cart-button"
                        >
                          Agregar al Carrito
                        </IonButton>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>
                );
              })}
            </IonRow>
          </IonGrid>
        ) : (
          !loading && <p className="ion-padding ion-text-center">No hay productos disponibles.</p>
        )}

        {/* Toast */}
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={2000}
          color={toastMessage.includes('Error') ? 'danger' : 'success'}
        />
      </IonContent>
    </IonPage>
  );
};

export default ProductSelection;
