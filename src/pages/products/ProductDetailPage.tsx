import {
  IonPage,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonRadioGroup,
  IonRadio,
  IonCheckbox,
  IonList,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonAlert,
  IonGrid,
  IonRow,
  IonCol,
  IonCardSubtitle,
} from '@ionic/react';

import { useParams, useHistory, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useCart } from '../../context/CartContext';
import { Product, CartItem } from '../../data/type_products';
import Header from '../../components/Header';
import AlertPopover from '../../components/PopOver/AlertPopover';
import MailPopover from '../../components/PopOver/MailPopover';
import { fetchCategories } from '../../data/categories';

interface RouteParams {
  productId: string;
}

const ProductDetailPage: React.FC = () => {
  const { productId } = useParams<RouteParams>();
  const history = useHistory();
  const location = useLocation();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | undefined>(undefined);
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: any }>({});
  const [showAlert, setShowAlert] = useState(false);
  const [missingMessage, setMissingMessage] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [popoverState, setPopoverState] = useState<{ showAlertPopover: boolean; showMailPopover: boolean; event?: Event }>({
    showAlertPopover: false,
    showMailPopover: false,
  });

  const presentAlertPopover = (e: React.MouseEvent) => {
    setPopoverState({ ...popoverState, showAlertPopover: true, event: e.nativeEvent });
  };

  const dismissAlertPopover = () => setPopoverState({ ...popoverState, showAlertPopover: false });

  const presentMailPopover = (e: React.MouseEvent) => {
    setPopoverState({ ...popoverState, showMailPopover: true, event: e.nativeEvent });
  };

  const dismissMailPopover = () => setPopoverState({ ...popoverState, showMailPopover: false });

  useEffect(() => {
    // Check if product is passed in location state
    const stateProduct = (location.state as any)?.product;
    if (stateProduct) {
      console.log("Product from state:", stateProduct);
      setProduct(stateProduct);
    } else {
      // Fallback: fetch all products (though this should not happen if navigation is correct)
      console.warn("Product not found in state, this should not happen");
      // Try to fetch products from the category to find the product
      const fetchProduct = async () => {
        try {
          const categories = await fetchCategories();
          const category = categories.find(cat => cat.categoryId === parseInt(productId));
          if (category) {
            // If we have a category, we could fetch products for that category
            // For now, just set product to undefined
            setProduct(undefined);
          } else {
            setProduct(undefined);
          }
        } catch (error) {
          console.error("Error fetching categories:", error);
          setProduct(undefined);
        }
      };
      fetchProduct();
    }
  }, [productId, location.state]);

  if (!product) return <IonPage><IonContent><p>Producto no encontrado.</p></IonContent></IonPage>;

  const handleRadioChange = (optionId: string, value: string) => {
    console.log(`Selected radio for ${optionId}:`, value);
    setSelectedOptions((prev) => ({ ...prev, [optionId]: value }));
  };

  const handleCheckboxChange = (optionId: string, value: string) => {
    console.log(`Toggled checkbox for ${optionId} value:`, value);
    const currentValues = selectedOptions[optionId] || [];
    const updatedValues = currentValues.includes(value)
      ? currentValues.filter((v: string) => v !== value)
      : [...currentValues, value];

    setSelectedOptions((prev) => ({ ...prev, [optionId]: updatedValues }));
  };

  const handleSelectAll = (optionId: string, allIds: string[]) => {
    console.log(`Select All clicked for ${optionId}`);
    const current = selectedOptions[optionId] || [];
    const isAllSelected = current.length === allIds.length;
    setSelectedOptions((prev) => ({
      ...prev,
      [optionId]: isAllSelected ? [] : [...allIds],
    }));
  };

  const calculateOptionPrice = () => {
    let extra = 0;
    product.options?.forEach(option => {
      const value = selectedOptions[option.id];
      if (option.type === 'radio' && value) {
        const selected = option.choices.find(c => c.id === value);
        console.log(`Radio selected: ${selected?.name}, price: ${selected?.price}`);
        extra += selected?.price || 0;
      }
      if (option.type === 'checkbox' && Array.isArray(value)) {
        value.forEach((id: string) => {
          const selected = option.choices.find(c => c.id === id);
          console.log(`Checkbox selected: ${selected?.name}, price: ${selected?.price}`);
          extra += selected?.price || 0;
        });
      }
    });
    console.log("Total extra option price:", extra);
    return extra;
  };

  const handleAddToCart = () => {
    console.log("Trying to add to cart with options:", selectedOptions);

    const requiredOptions = product.options || [];
    const missingGroups: string[] = [];

    const selectedOptionLabels: { [key: string]: string[] | string } = {};

    product.options?.forEach(option => {
      const value = selectedOptions[option.id];

      if (option.type === 'radio' && value) {
        const choice = option.choices.find(c => c.id === value);
        if (choice) {
          selectedOptionLabels[option.name] = choice.name;
        }
      }

      if (option.type === 'checkbox' && Array.isArray(value)) {
        const selectedLabels = value.map((id: string) => {
          const choice = option.choices.find(c => c.id === id);
          return choice?.name || id;
        });
        selectedOptionLabels[option.name] = selectedLabels;
      }

    });

    if (missingGroups.length > 0) {
      console.warn("Missing required options:", missingGroups);
      setMissingMessage(
        `Falta seleccionar ${missingGroups.length === 1 ? 'la opción' : 'las opciones'}: ` +
        `${missingGroups.map(name => `"${name}"`).join(', ')}.`
      );
      setShowAlert(true);
      return;
    }

    const basePrice = product.price;
    const optionPrice = calculateOptionPrice();
    const finalPrice = basePrice + optionPrice;

    console.log("Final price to add:", finalPrice);
    console.log("Product added to cart:", {
      name: product.name,
      quantity,
      selectedOptions,
    });

    addToCart({
      id: String(product.id),
      productId: String(product.id),
      name: product.name,
      quantity,
      price: finalPrice,
      selectedOptions,
      selectedOptionLabels,
    });

    history.push('/cart');
  };

  return (
    <IonPage>
      <Header
        presentAlertPopover={presentAlertPopover}
        presentMailPopover={presentMailPopover}
        screenTitle={product.name}
        showBackButton={true}
        backButtonText="Productos"
        backButtonHref="/Products"
      />

      <IonContent>
        <IonGrid className="ion-padding">
          <IonRow className="ion-justify-content-center">
            <IonCol sizeMd="6" sizeLg="4" sizeXs="12">
              <IonCard className="dashboard-card">
                <IonCardHeader>
                  <IonCardTitle>{product.name}</IonCardTitle>
                  <IonCardSubtitle>
                    {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(product.price)}
                  </IonCardSubtitle>
                </IonCardHeader>
                <IonCardContent>
                  <p>{product.description}</p>

                  {product.options?.map((option) => (
                    <IonList key={option.id}>
                      <IonItem>
                        <IonLabel>{option.name}</IonLabel>
                      </IonItem>

                      {option.type === 'checkbox' && (
                        <>
                          <IonItem>
                            <IonLabel>Seleccionar todos</IonLabel>
                            <IonCheckbox
                              slot="start"
                              checked={
                                selectedOptions[option.id]?.length === option.choices.length
                              }
                              onIonChange={() =>
                                handleSelectAll(option.id, option.choices.map((c) => c.id))
                              }
                            />
                          </IonItem>
                          {option.choices.map((choice) => (
                            <IonItem key={choice.id}>
                              <IonLabel>{choice.name} (+${choice.price})</IonLabel>
                              <IonCheckbox
                                slot="start"
                                checked={selectedOptions[option.id]?.includes(choice.id)}
                                onIonChange={() => handleCheckboxChange(option.id, choice.id)}
                              />
                            </IonItem>
                          ))}
                        </>
                      )}

                      {option.type === 'radio' && (
                        <IonRadioGroup
                          value={selectedOptions[option.id] || ''}
                          onIonChange={(e) =>
                            handleRadioChange(option.id, e.detail.value)
                          }
                        >
                          {option.choices.map((choice) => (
                            <IonItem key={choice.id}>
                              <IonLabel>{choice.name} (+${choice.price})</IonLabel>
                              <IonRadio slot="start" value={choice.id} />
                            </IonItem>
                          ))}
                        </IonRadioGroup>
                      )}
                    </IonList>
                  ))}

                  <IonItem>
                    <IonLabel position="stacked">Cantidad</IonLabel>
                    <IonSelect
                      value={quantity}
                      onIonChange={(e) => setQuantity(Number(e.detail.value))}
                      interface="popover"
                    >
                      {[...Array(10)].map((_, i) => (
                        <IonSelectOption key={i + 1} value={i + 1}>
                          {i + 1}
                        </IonSelectOption>
                      ))}
                    </IonSelect>
                  </IonItem>

                  <IonButton expand="block" onClick={handleAddToCart}>
                    Agregar al carrito
                  </IonButton>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
        </IonGrid>

        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header="Opciones requeridas"
          message={missingMessage}
          buttons={['OK']}
          translucent={true}
        />
      </IonContent>

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
    </IonPage>
  );
};

export default ProductDetailPage;
