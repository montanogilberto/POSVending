import React, { useEffect, useRef, useState } from 'react';
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
  IonItem,
  IonLabel,
  IonRadioGroup,
  IonRadio,
  IonInput,
  IonLoading,
  IonToast,
  IonIcon,
  IonCheckbox,
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
  type: 'radio' | 'checkbox';
  choices: Choice[];
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  categoryId: number;
  options?: Option[];
}

interface SelectedItem {
  productId: number;
  name: string;
  description: string;
  basePrice: number;
  quantity: number;
  selectedOptions: { [optionId: number]: number | number[] };
  totalPrice: number;
}

const ProductSelection: React.FC = () => {
  const history = useHistory();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const [selectedChoices, setSelectedChoices] = useState<{
    [productId: number]: { [optionId: number]: number | number[] };
  }>({});

  const [quantities, setQuantities] = useState<{ [productId: number]: number }>({});
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setFetchError(null);
  
      const res = await fetch('https://smartloansbackend.azurewebsites.net/by_company_products', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ products: [{ companyId: '1' }] }),
      });
  
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('Backend error body:', text);
        throw new Error(`Error fetching products: ${res.status} ${res.statusText}`);
      }
  
      const data = await res.json();
  
      // 🔧 normalize option.type and choice ids to numbers
      const list: Product[] = (Array.isArray(data) ? data : data?.products ?? []).map((p: Product) => ({
        ...p,
        options: (p.options ?? []).map((o) => ({
          ...o,
          type: o.name === 'Ciclo' ? 'radio' : (String(o.type || 'radio').toLowerCase() === 'checkbox' ? 'checkbox' : 'radio'),
          choices: (o.choices ?? []).map((c) => ({
            ...c,
            id: Number(c.id), // just in case API sends strings
            price: Number(c.price) || 0,
          })),
        })),
        price: Number(p.price) || 0,
      }));
  
      setProducts(list);
      console.log('Fetched products:', list);
    } catch (error) {
      console.error('Error fetching products:', error);
      setFetchError('No se pudieron cargar los productos.');
      setToastMessage('Error al cargar productos.');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers ---
  const handleRadioChange = (productId: number, optionId: number, choiceId: number) => {
    setSelectedChoices((prev) => ({
      ...prev,
      [productId]: { ...(prev[productId] || {}), [optionId]: choiceId },
    }));
  };

  const handleCheckboxToggle = (
    productId: number,
    optionId: number,
    choiceId: number,
    checked: boolean
  ) => {
    setSelectedChoices((prev) => {
      const productSel = { ...(prev[productId] || {}) };
      const current = productSel[optionId];
      const arr = Array.isArray(current) ? [...current] : [];
      const next = checked
        ? Array.from(new Set([...arr, choiceId]))
        : arr.filter((id) => id !== choiceId);
      return { ...prev, [productId]: { ...productSel, [optionId]: next } };
    });
  };

  const handleQuantityChange = (productId: number, quantity: number) => {
    if (Number.isFinite(quantity) && quantity > 0) {
      setQuantities((prev) => ({ ...prev, [productId]: quantity }));
    }
  };

  const calculateTotalPrice = (product: Product) => {
    let total = Number(product.price) || 0;
    const productSel = selectedChoices[product.id] || {};
    (product.options ?? []).forEach((option) => {
      const sel = productSel[option.id];
      if (Array.isArray(sel)) {
        sel.forEach((id) => {
          const c = option.choices.find((ch) => ch.id === id);
          if (c) total += Number(c.price) || 0;
        });
      } else if (typeof sel === 'number' && sel) {
        const c = option.choices.find((ch) => ch.id === sel);
        if (c) total += Number(c.price) || 0;
      }
    });
    return total;
  };

  const addToCart = (product: Product) => {
    const quantity = quantities[product.id] || 1;
    if (quantity < 1) {
      setToastMessage('Seleccione una cantidad válida.');
      setShowToast(true);
      return;
    }

    const selectedOptions = selectedChoices[product.id] || {};
    const totalPrice = calculateTotalPrice(product) * quantity;

    const item: SelectedItem = {
      productId: product.id,
      name: product.name,
      description: product.description,
      basePrice: product.price,
      quantity,
      selectedOptions,
      totalPrice,
    };

    history.push('/laundry', { from: 'product-selection', item });

    setToastMessage(`Producto "${product.name}" agregado al carrito.`);
    setShowToast(true);
  };

  // --- UI ---
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

                        {(product.options ?? []).map((option) => (
                          <div key={option.id}>
                            <h3>{option.name}</h3>

                            {option.type === 'radio' ? (
                              <IonRadioGroup
                              value={
                                typeof selectedChoices[product.id]?.[option.id] === 'number'
                                  ? (selectedChoices[product.id]?.[option.id] as number)
                                  : undefined
                              }
                              onIonChange={(e) => handleRadioChange(product.id, option.id, Number(e.detail.value))}
                            >
                              {option.choices.map((choice) => (
                                <IonItem key={choice.id}>
                                  <IonLabel>
                                    {choice.name} (+${choice.price.toFixed(2)})
                                  </IonLabel>
                                  <IonRadio slot="start" value={choice.id} />
                                </IonItem>
                              ))}
                            </IonRadioGroup>
                            ) : (
                              option.choices.map((choice) => {
                                const current = selectedChoices[product.id]?.[option.id];
                                const checked = Array.isArray(current)
                                  ? current.includes(choice.id)
                                  : false;
                                return (
                                  <IonItem key={choice.id}>
                                    <IonLabel>
                                      {choice.name} (+${choice.price.toFixed(2)})
                                    </IonLabel>
                                    <IonCheckbox
                                      slot="start"
                                      checked={checked}
                                      onIonChange={(e) =>
                                        handleCheckboxToggle(
                                          product.id,
                                          option.id,
                                          choice.id,
                                          e.detail.checked
                                        )
                                      }
                                    />
                                  </IonItem>
                                );
                              })
                            )}
                          </div>
                        ))}

                        <IonItem>
                          <IonLabel>Cantidad</IonLabel>
                          <IonInput
                            type="number"
                            min="1"
                            value={quantities[product.id] ?? 1}
                            onIonChange={(e) =>
                              handleQuantityChange(product.id, Number(e.detail.value) || 1)
                            }
                            slot="end"
                          />
                        </IonItem>

                        <IonButton expand="block" onClick={() => addToCart(product)}>
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
