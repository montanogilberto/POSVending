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
import '../../styles/dashboard.css';

interface RouteParams {
  productId: string;
}

// ---- Type guard to ensure option.choices exists ----
type Option = NonNullable<Product['options']>[number];
type Choice = NonNullable<Option['choices']>[number];

function hasChoices(o: Option): o is Option & { choices: Choice[] } {
  return Array.isArray(o.choices);
}

const ProductDetailPage: React.FC = () => {
  const { productId } = useParams<RouteParams>();
  const history = useHistory();
  const location = useLocation();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | undefined>(undefined);
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, string | string[]>>({});
  const [showAlert, setShowAlert] = useState(false);
  const [missingMessage, setMissingMessage] = useState('');
  const [popoverState, setPopoverState] = useState<{ showAlertPopover: boolean; showMailPopover: boolean; event?: Event }>({
    showAlertPopover: false,
    showMailPopover: false,
  });

  const presentAlertPopover = (e: React.MouseEvent) =>
    setPopoverState({ ...popoverState, showAlertPopover: true, event: e.nativeEvent });
  const dismissAlertPopover = () => setPopoverState({ ...popoverState, showAlertPopover: false });
  const presentMailPopover = (e: React.MouseEvent) =>
    setPopoverState({ ...popoverState, showMailPopover: true, event: e.nativeEvent });
  const dismissMailPopover = () => setPopoverState({ ...popoverState, showMailPopover: false });

  useEffect(() => {
    const stateProduct = (location.state as any)?.product;
    if (stateProduct) {
      console.log('Product from state:', stateProduct);
      setProduct(stateProduct);
    } else {
      console.warn('Product not found in state, this should not happen');
      const fetchProduct = async () => {
        try {
          const categories = await fetchCategories();
          const category = categories.find(cat => cat.categoryId === parseInt(productId));
          if (category) setProduct(undefined);
          else setProduct(undefined);
        } catch (error) {
          console.error('Error fetching categories:', error);
          setProduct(undefined);
        }
      };
      fetchProduct();
    }
  }, [productId, location.state]);

  if (!product)
    return (
      <IonPage>
        <IonContent>
          <p>Producto no encontrado.</p>
        </IonContent>
      </IonPage>
    );

  // ---- Handlers ----
  const handleRadioChange = (optionId: number, value: string) =>
    setSelectedOptions(prev => ({ ...prev, [optionId]: value }));

  const handleCheckboxChange = (optionId: number, value: string) => {
    const currentValues = selectedOptions[optionId] || [];
    const updatedValues = Array.isArray(currentValues)
      ? currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value]
      : [value];
    setSelectedOptions(prev => ({ ...prev, [optionId]: updatedValues }));
  };

  const handleSelectAll = (optionId: number, allIds: string[]) => {
    const current = selectedOptions[optionId] || [];
    const isAllSelected = Array.isArray(current) && current.length === allIds.length;
    setSelectedOptions(prev => ({
      ...prev,
      [optionId]: isAllSelected ? [] : [...allIds],
    }));
  };

  // ---- Option price calculation ----
  const calculateOptionPrice = () => {
    let extra = 0;
    (product.options ?? []).forEach(option => {
      if (!hasChoices(option)) return;
      const value = selectedOptions[option.productOptionId];
      if (option.type === 'radio' && value && hasChoices(option)) {
        const selected = option.choices.find(c => c.productOptionChoiceId.toString() === value);
        extra += selected?.price ?? 0;
      }
      if (option.type === 'checkbox' && Array.isArray(value) && hasChoices(option)) {
        value.forEach(id => {
          const selected = option.choices.find(c => c.productOptionChoiceId.toString() === id);
          extra += selected?.price ?? 0;
        });
      }
    });
    return extra;
  };

  // ---- Add to cart ----
  const handleAddToCart = () => {
    const requiredOptions = product.options ?? [];
    const missingGroups: string[] = [];

    requiredOptions.forEach(option => {
      const value = selectedOptions[option.productOptionId];
      if (option.type === 'radio' && hasChoices(option) && (!value || (Array.isArray(value) && value.length === 0))) {
        missingGroups.push(option.name);
      }
    });

    const selectedOptionLabels: { [key: string]: string[] | string } = {};

    (product.options ?? []).forEach(option => {
      if (!hasChoices(option)) return;
      const value = selectedOptions[option.productOptionId];

      if (option.type === 'radio' && value && hasChoices(option)) {
        const choice = option.choices.find(c => c.productOptionChoiceId.toString() === value);
        if (choice) selectedOptionLabels[option.name] = choice.name;
      }

      if (option.type === 'checkbox' && Array.isArray(value) && hasChoices(option)) {
        const selectedLabels = value.map(id => {
          const choice = option.choices.find(c => c.productOptionChoiceId.toString() === id);
          return choice?.name ?? id;
        });
        selectedOptionLabels[option.name] = selectedLabels;
      }
    });

    if (missingGroups.length > 0) {
      setMissingMessage(
        `Falta seleccionar ${missingGroups.length === 1 ? 'la opción' : 'las opciones'}: ${missingGroups
          .map(name => `"${name}"`)
          .join(', ')}.`
      );
      setShowAlert(true);
      return;
    }

    const basePrice = product.price;
    const optionPrice = calculateOptionPrice();
    const finalPrice = basePrice + optionPrice;

    const selectedChoices: { [key: number]: { id: number; name: string; price: number }[] } = {};

    (product.options ?? []).forEach(option => {
      if (!hasChoices(option)) return;
      const value = selectedOptions[option.productOptionId];
      if (option.type === 'radio' && value && hasChoices(option)) {
        const choice = option.choices.find(c => c.productOptionChoiceId.toString() === value);
        if (choice) {
          selectedChoices[option.productOptionId] = [
            { id: choice.productOptionChoiceId, name: choice.name, price: choice.price },
          ];
        }
      } else if (option.type === 'checkbox' && Array.isArray(value) && hasChoices(option)) {
        selectedChoices[option.productOptionId] = value.map(id => {
          const c = option.choices.find(ch => ch.productOptionChoiceId.toString() === id);
          return { id: c?.productOptionChoiceId ?? 0, name: c?.name ?? '', price: c?.price ?? 0 };
        });
      }
    });

    addToCart({
      id: String(product.id),
      productId: String(product.id),
      name: product.name,
      quantity,
      price: finalPrice,
      selectedOptions,
      selectedOptionLabels,
      selectedChoices,
    });

    history.push('/cart');
  };

  // ---- UI ----
  return (
    <IonPage>
      <Header
        presentAlertPopover={presentAlertPopover}
        presentMailPopover={presentMailPopover}
        screenTitle="Detalle del Producto"
      />

      <IonContent fullscreen className="dashboard-content">
        <div className="dashboard-container">
          {/* Header */}
          <div className="dashboard-header-section">
            <h1 className="dashboard-title">Detalle del Producto</h1>
          </div>

          {/* Product Details */}
          <div className="dashboard-card">
            <IonCardHeader>
              <IonCardTitle>{product.name}</IonCardTitle>
              <IonCardSubtitle>
                {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(product.price)}
              </IonCardSubtitle>
            </IonCardHeader>
            <IonCardContent>
              <p>{product.description}</p>

              {(product.options ?? []).map(option => (
                <IonList key={option.productOptionId}>
                  <IonItem key={`label-${option.productOptionId}`}>
                    <IonLabel>{option.name}</IonLabel>
                  </IonItem>

                  {option.type === 'checkbox' && hasChoices(option) && (
                    <>
                      <IonItem key={`select-all-${option.productOptionId}`}>
                        <IonLabel>Seleccionar todos</IonLabel>
                        <IonCheckbox
                          slot="start"
                          checked={
                            (selectedOptions[option.productOptionId]?.length ?? 0) === option.choices.length
                          }
                          onIonChange={() =>
                            handleSelectAll(
                              option.productOptionId,
                              option.choices.map(c => c.productOptionChoiceId.toString())
                            )
                          }
                        />
                      </IonItem>

                      {option.choices.map(choice => (
                        <IonItem key={`checkbox-${option.productOptionId}-${choice.productOptionChoiceId}`}>
                          <IonLabel>
                            {choice.name} (+$
                            {choice.price})
                          </IonLabel>
                          <IonCheckbox
                            slot="start"
                            checked={(selectedOptions[option.productOptionId] ?? []).includes(
                              choice.productOptionChoiceId.toString()
                            )}
                            onIonChange={() =>
                              handleCheckboxChange(option.productOptionId, choice.productOptionChoiceId.toString())
                            }
                          />
                        </IonItem>
                      ))}
                    </>
                  )}

                  {option.type === 'radio' && hasChoices(option) && (
                    <IonRadioGroup
                      value={selectedOptions[option.productOptionId] ?? ''}
                      onIonChange={e => handleRadioChange(option.productOptionId, e.detail.value)}
                    >
                      {option.choices.map(choice => (
                        <IonItem key={`radio-${option.productOptionId}-${choice.productOptionChoiceId}`}>
                          <IonLabel>
                            {choice.name} (+$
                            {choice.price})
                          </IonLabel>
                          <IonRadio slot="start" value={choice.productOptionChoiceId.toString()} />
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
                  onIonChange={e => setQuantity(Number(e.detail.value))}
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
          </div>
        </div>

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
