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
  IonCardSubtitle,
} from '@ionic/react';

import { useParams, useHistory, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useCart } from '../../context/CartContext';
import { Product } from '../../data/type_products';
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

// Value stored per option:
// - radio  -> string (choiceId)
// - checkbox -> string[] (choiceIds) OR Record<string, number> (choiceId -> quantity)
type SelectedOptionValue = string | string[] | Record<string, number>;

const ProductDetailPage: React.FC = () => {
  const { productId } = useParams<RouteParams>();
  const history = useHistory();
  const location = useLocation();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | undefined>(undefined);
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, SelectedOptionValue>>({});
  const [showAlert, setShowAlert] = useState(false);
  const [missingMessage, setMissingMessage] = useState('');
  const [popoverState, setPopoverState] = useState<{
    showAlertPopover: boolean;
    showMailPopover: boolean;
    event?: Event;
  }>({
    showAlertPopover: false,
    showMailPopover: false,
  });

  const presentAlertPopover = (e: React.MouseEvent) =>
    setPopoverState(prev => ({ ...prev, showAlertPopover: true, event: e.nativeEvent }));
  const dismissAlertPopover = () =>
    setPopoverState(prev => ({ ...prev, showAlertPopover: false }));
  const presentMailPopover = (e: React.MouseEvent) =>
    setPopoverState(prev => ({ ...prev, showMailPopover: true, event: e.nativeEvent }));
  const dismissMailPopover = () =>
    setPopoverState(prev => ({ ...prev, showMailPopover: false }));

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

  // ---- Helpers for narrowing ----
  const getArrayValue = (value: SelectedOptionValue | undefined): string[] => {
    if (Array.isArray(value)) return value;
    return [];
  };

  const getMapValue = (value: SelectedOptionValue | undefined): Record<string, number> => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, number>;
    }
    return {};
  };

  const isAllSelected = (optionId: number, totalChoices: number) => {
    const value = selectedOptions[optionId];
    if (Array.isArray(value)) return value.length === totalChoices;
    if (value && typeof value === 'object') {
      return Object.keys(value as Record<string, number>).length === totalChoices;
    }
    return false;
  };

  const isChoiceSelected = (optionId: number, choiceId: string) => {
    const value = selectedOptions[optionId];
    if (Array.isArray(value)) {
      return value.includes(choiceId);
    }
    if (value && typeof value === 'object') {
      return Boolean((value as Record<string, number>)[choiceId]);
    }
    return false;
  };

  // ---- Handlers ----
  const handleRadioChange = (optionId: number, value: string) =>
    setSelectedOptions(prev => ({ ...prev, [optionId]: value }));

  const handleCheckboxChange = (optionId: number, value: string, checked: boolean) => {
    const prevValue = selectedOptions[optionId];

    // If we are using simple checkbox (array of ids)
    if (!prevValue || Array.isArray(prevValue)) {
      const currentArray = getArrayValue(prevValue);
      let newArray: string[];
      if (checked) {
        newArray = currentArray.includes(value)
          ? currentArray
          : [...currentArray, value];
      } else {
        newArray = currentArray.filter(v => v !== value);
      }
      setSelectedOptions(prev => ({ ...prev, [optionId]: newArray }));
      return;
    }

    // If we are using quantity map (Record<string, number>)
    const currentMap = getMapValue(prevValue);
    const updatedMap = { ...currentMap };
    if (checked) {
      updatedMap[value] = updatedMap[value] ?? 1;
    } else {
      delete updatedMap[value];
    }
    setSelectedOptions(prev => ({ ...prev, [optionId]: updatedMap }));
  };

  const handleCheckboxQuantityChange = (optionId: number, choiceId: string, qty: number) => {
    const prevValue = selectedOptions[optionId];
    const currentMap = getMapValue(prevValue);
    const updatedValues = { ...currentMap };

    if (qty > 0) {
      updatedValues[choiceId] = qty;
    } else {
      delete updatedValues[choiceId];
    }

    setSelectedOptions(prev => ({ ...prev, [optionId]: updatedValues }));
  };

  const handleSelectAll = (optionId: number, allIds: string[]) => {
    const prevValue = selectedOptions[optionId];
    const currentArray = getArrayValue(prevValue);
    const isAll = currentArray.length === allIds.length;

    setSelectedOptions(prev => ({
      ...prev,
      [optionId]: isAll ? [] : [...allIds],
    }));
  };

  // ---- Option price calculation ----
  const calculateOptionPrice = () => {
    let extra = 0;

    (product.options ?? []).forEach(option => {
      if (!hasChoices(option)) return;

      const value = selectedOptions[option.productOptionId];

      if (option.type === 'radio' && typeof value === 'string') {
        const selected = option.choices.find(
          c => c.productOptionChoiceId.toString() === value
        );
        extra += selected?.price ?? 0;
      }

      if (option.type === 'checkbox') {
        if (Array.isArray(value)) {
          value.forEach(id => {
            const selected = option.choices.find(
              c => c.productOptionChoiceId.toString() === id
            );
            extra += selected?.price ?? 0;
          });
        } else if (value && typeof value === 'object') {
          const map = value as Record<string, number>;
          Object.entries(map).forEach(([id, qty]) => {
            const selected = option.choices.find(
              c => c.productOptionChoiceId.toString() === id
            );
            if (selected) extra += selected.price * qty;
          });
        }
      }
    });

    return extra;
  };

  // ---- Add to cart ----
  const handleAddToCart = () => {
    const requiredOptions = product.options ?? [];
    const missingGroups: string[] = [];

    requiredOptions.forEach(option => {
      if (!hasChoices(option)) return;
      const value = selectedOptions[option.productOptionId];

      if (option.type === 'radio') {
        const isEmpty =
          !value ||
          (Array.isArray(value) && value.length === 0) ||
          (value && typeof value === 'object' && Object.keys(value as Record<string, number>).length === 0);

        if (isEmpty) {
          missingGroups.push(option.name);
        }
      }
    });

    const selectedOptionLabels: { [key: string]: string[] | string } = {};

    (product.options ?? []).forEach(option => {
      if (!hasChoices(option)) return;
      const value = selectedOptions[option.productOptionId];

      if (option.type === 'radio' && typeof value === 'string') {
        const choice = option.choices.find(
          c => c.productOptionChoiceId.toString() === value
        );
        if (choice) selectedOptionLabels[option.name] = choice.name;
      }

      if (option.type === 'checkbox') {
        if (Array.isArray(value)) {
          const selectedLabels = value.map(id => {
            const choice = option.choices.find(
              c => c.productOptionChoiceId.toString() === id
            );
            return choice?.name ?? id;
          });
          selectedOptionLabels[option.name] = selectedLabels;
        } else if (value && typeof value === 'object') {
          const map = value as Record<string, number>;
          const selectedLabels = Object.keys(map).map(id => {
            const choice = option.choices.find(
              c => c.productOptionChoiceId.toString() === id
            );
            return choice ? `${choice.name} (x${map[id]})` : id;
          });
          selectedOptionLabels[option.name] = selectedLabels;
        }
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

    const selectedChoices: {
      [key: number]: { id: number; name: string; price: number }[];
    } = {};

    (product.options ?? []).forEach(option => {
      if (!hasChoices(option)) return;
      const value = selectedOptions[option.productOptionId];

      if (option.type === 'radio' && typeof value === 'string') {
        const choice = option.choices.find(
          c => c.productOptionChoiceId.toString() === value
        );
        if (choice) {
          selectedChoices[option.productOptionId] = [
            {
              id: choice.productOptionChoiceId,
              name: choice.name,
              price: choice.price,
            },
          ];
        }
      } else if (option.type === 'checkbox') {
        if (Array.isArray(value)) {
          selectedChoices[option.productOptionId] = value.map(id => {
            const c = option.choices.find(
              ch => ch.productOptionChoiceId.toString() === id
            );
            return {
              id: c?.productOptionChoiceId ?? 0,
              name: c?.name ?? '',
              price: c?.price ?? 0,
            };
          });
        } else if (value && typeof value === 'object') {
          const map = value as Record<string, number>;
          selectedChoices[option.productOptionId] = Object.keys(map).map(id => {
            const c = option.choices.find(
              ch => ch.productOptionChoiceId.toString() === id
            );
            return {
              id: c?.productOptionChoiceId ?? 0,
              name: c?.name ?? '',
              price: c?.price ?? 0,
            };
          });
        }
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
                {new Intl.NumberFormat('es-MX', {
                  style: 'currency',
                  currency: 'MXN',
                }).format(product.price)}
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
                          checked={isAllSelected(
                            option.productOptionId,
                            option.choices.length
                          )}
                          onIonChange={() =>
                            handleSelectAll(
                              option.productOptionId,
                              option.choices.map(c =>
                                c.productOptionChoiceId.toString()
                              )
                            )
                          }
                        />
                      </IonItem>

                      {option.choices.map(choice => {
                        const choiceId = choice.productOptionChoiceId.toString();
                        const map = getMapValue(
                          selectedOptions[option.productOptionId]
                        );
                        const qty = map[choiceId] ?? 1;
                        const checked = isChoiceSelected(
                          option.productOptionId,
                          choiceId
                        );

                        return (
                          <IonItem
                            key={`checkbox-${option.productOptionId}-${choice.productOptionChoiceId}`}
                          >
                            <IonCheckbox
                              slot="start"
                              checked={checked}
                              onIonChange={e =>
                                handleCheckboxChange(
                                  option.productOptionId,
                                  choiceId,
                                  e.detail.checked
                                )
                              }
                            />

                            <IonLabel>
                              {choice.name} (+${choice.price})
                            </IonLabel>

                            {/* ✅ Quantity select for this checkbox option */}
                            <IonSelect
                              value={qty}
                              disabled={!checked}
                              interface="popover"
                              style={{ maxWidth: '80px' }}
                              onIonChange={e =>
                                handleCheckboxQuantityChange(
                                  option.productOptionId,
                                  choiceId,
                                  Number(e.detail.value)
                                )
                              }
                            >
                              {[...Array(10)].map((_, i) => (
                                <IonSelectOption key={i + 1} value={i + 1}>
                                  {i + 1}
                                </IonSelectOption>
                              ))}
                            </IonSelect>
                          </IonItem>
                        );
                      })}
                    </>
                  )}

                  {option.type === 'radio' && hasChoices(option) && (
                    <IonRadioGroup
                      value={
                        typeof selectedOptions[option.productOptionId] ===
                        'string'
                          ? (selectedOptions[
                              option.productOptionId
                            ] as string)
                          : ''
                      }
                      onIonChange={e =>
                        handleRadioChange(
                          option.productOptionId,
                          e.detail.value
                        )
                      }
                    >
                      {option.choices.map(choice => (
                        <IonItem
                          key={`radio-${option.productOptionId}-${choice.productOptionChoiceId}`}
                        >
                          <IonLabel>
                            {choice.name} (+${choice.price})
                          </IonLabel>
                          <IonRadio
                            slot="start"
                            value={choice.productOptionChoiceId.toString()}
                          />
                        </IonItem>
                      ))}
                    </IonRadioGroup>
                  )}
                </IonList>
              ))}

              {/* Global product quantity (unchanged) */}
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
