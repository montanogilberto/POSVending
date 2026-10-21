import {
  IonPage,
  IonContent,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonRadioGroup,
  IonRadio,
  IonCheckbox,
  IonList,
  IonButton,
  IonCardSubtitle,
  IonCard,
  IonGrid,
  IonRow,
  IonCol,
  IonInput,
  IonText,
  IonToast,
  IonIcon,
  useIonViewDidLeave,
} from '@ionic/react';
import { addOutline, removeOutline } from 'ionicons/icons';

import { useParams, useHistory, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useCart } from '../../contexts/CartContext';
import { Product, Piezas } from '../../data/type_products';
import Header from '../../components/layout/Header';
import AlertPopover from '../../components/popovers/AlertPopover';
import MailPopover from '../../components/popovers/MailPopover';
import { usePopovers } from '../../hooks/usePopovers';
import { getOneProduct } from '../../api/productsApi';
import '../../styles/dashboard.css';
import './ProductDetailPage.css';

const MAX_CHOICE_QTY = 999;

interface RouteParams {
  productId: string;
}

type Option = NonNullable<Product['options']>[number];
type Choice = NonNullable<Option['choices']>[number];

function hasChoices(o: Option): o is Option & { choices: Choice[] } {
  return Array.isArray(o.choices);
}

type SelectedOptionValue = string | string[] | Record<string, number>;

const ProductDetailPage: React.FC = () => {
  const { productId } = useParams<RouteParams>();
  const history = useHistory();
  const location = useLocation();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | undefined>(undefined);
  const [quantity, setQuantity] = useState(1);
  // A fast double-tap on "Agregar al carrito" fires twice before history.push
  // navigates away; CartContext merges identical lines, so the sale silently
  // became 2× (e.g. one $200 Colcha Grande charged $400). One add per visit.
  const addingRef = useRef(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, SelectedOptionValue>>({});
  // Radio rows get their own −/+ too (Garrafón · Tamaño 19 L x3): optionId → qty of the picked choice.
  const [radioQty, setRadioQty] = useState<Record<number, number>>({});
  const pops = usePopovers();

  // Pieces state for "Servicio Completo" product
  const [pieces, setPieces] = useState<Piezas>({
    pantalones: 0,
    prendas: 0,
    otros: 0,
  });

  // Shared validation toast (missing required options, pieces, etc.) —
  // was two separate near-dead mechanisms (an IonAlert for missing options,
  // an unused "pieces" toast) collapsed into one, matching this app's
  // shared useToast()-style pattern instead of a modal-blocking alert.
  const [showValidationToast, setShowValidationToast] = useState(false);
  const [validationToastMessage, setValidationToastMessage] = useState('');

  // Ionic keeps this page mounted after navigating away, so without this the
  // last checkboxes/quantities were still selected on the next visit.
  useIonViewDidLeave(() => {
    addingRef.current = false;
    setQuantity(1);
    setSelectedOptions({});
    setRadioQty({});
    setPieces({ pantalones: 0, prendas: 0, otros: 0 });
    setShowValidationToast(false);
  });

  // Helper to check if product is "Servicio Completo"
  const isServicioCompleto = product?.name?.toLowerCase().includes('servicio completo');

  // Keyed on productId only: Ionic keeps this page mounted, so leaving it
  // (e.g. to /cart) changed location.state to undefined and re-fetched the
  // same product for nothing on every exit.
  useEffect(() => {
    const stateProduct = (location.state as any)?.product;
    if (stateProduct && String(stateProduct.productId) === String(productId)) {
      console.log('[ProductDetail] product from navigation state', JSON.stringify({
        productId: stateProduct.productId,
        name: stateProduct.name,
        salePrice: stateProduct.details?.[0]?.salePrice ?? 0,
      }));
      setProduct(stateProduct);
    } else {
      console.log('[ProductDetail] no product in navigation state, fetching by id', productId);
      const fetchProduct = async () => {
        try {
          const products = await getOneProduct({ products: [{ productId: parseInt(productId) }] });
          console.log('[ProductDetail] product fetched', JSON.stringify({
            productId: products[0]?.productId,
            name: products[0]?.name,
            salePrice: products[0]?.details?.[0]?.salePrice ?? 0,
          }));
          setProduct(products[0]);
        } catch (error) {
          console.error('Error fetching product:', error);
          setProduct(undefined);
        }
      };
      fetchProduct();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

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
    // Ticked choices start as a plain id array; carry them into the map at
    // qty 1, or changing one quantity would silently untick the others.
    const currentMap = Array.isArray(prevValue)
      ? Object.fromEntries(prevValue.map(id => [id, 1]))
      : getMapValue(prevValue);
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

  // Handler for pieces input changes
  const handlePieceChange = (field: keyof Piezas, value: string) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0) {
      // Don't update if invalid or negative
      return;
    }
    setPieces(prev => ({ ...prev, [field]: numValue }));
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
        extra += (selected?.price ?? 0) * (radioQty[option.productOptionId] ?? 1);
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
    if (addingRef.current) return;
    const requiredOptions = product.options ?? [];
    const missingGroups: string[] = [];

    requiredOptions.forEach(option => {
      if (!hasChoices(option)) return;
      const value = selectedOptions[option.productOptionId];

      // Radio: always pick one. Checkbox: only when the option is marked "Obligatoria".
      if (option.type === 'radio' || option.isRequired) {
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
      setValidationToastMessage(
        `Falta seleccionar ${missingGroups.length === 1 ? 'la opción' : 'las opciones'}: ${missingGroups
          .map(name => `"${name}"`)
          .join(', ')}.`
      );
      setShowValidationToast(true);
      return;
    }

    const basePrice = product.details && product.details.length > 0 
      ? product.details[0].salePrice 
      : 0;
    const optionPrice = calculateOptionPrice();
    const finalPrice = basePrice + optionPrice;
    // Line price = product base price (added ONCE) + Σ(option price × option qty).
    console.log('[ProductDetail] add to cart — price breakdown', JSON.stringify({
      productId: product.productId,
      name: product.name,
      basePrice,
      optionPrice,
      finalPrice,
      selectedOptions,
    }));

    const selectedChoices: {
      [key: number]: { id: number; name: string; price: number; quantity: number }[];
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
              quantity: radioQty[option.productOptionId] ?? 1,
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
              quantity: 1,
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
              quantity: map[id] ?? 1,
            };
          });
        }
      }
    });

    // Add pieces label for "Servicio Completo" product
    if (isServicioCompleto) {
      const piecesLabel = `Piezas: Pantalones ${pieces.pantalones}, Prendas ${pieces.prendas}, Otros ${pieces.otros}`;
      selectedOptionLabels['Piezas'] = piecesLabel;
    }

    addingRef.current = true;
    addToCart({
      id: String(product.productId),
      productId: String(product.productId),
      name: product.name,
      quantity,
      price: finalPrice,
      selectedOptions,
      selectedOptionLabels,
      selectedChoices,
      pieces: isServicioCompleto ? pieces : undefined,
    });

    history.push('/cart');
  };

  // ---- UI ----
  return (
    <IonPage>
      <Header
        {...pops.headerProps}
        screenTitle=""
        showBackButton={true}
        backButtonText="Detalle Productos"
        backButtonHref="/"
      />

      <IonContent fullscreen className="dashboard-content">
        <div className="dashboard-container">

          {/* Product Details */}
          <div className="dashboard-card">
            <IonCardHeader>
              <IonCardTitle>{product.name}</IonCardTitle>
              <IonCardSubtitle>
                {new Intl.NumberFormat('es-MX', {
                  style: 'currency',
                  currency: 'MXN',
                }).format(
                  product.details && product.details.length > 0 
                    ? product.details[0].salePrice 
                    : 0
                )}
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

                            {/* Same text everywhere; on iOS only, the price drops to its own
                                line (iPhone 11 squeezed it to one word per line). */}
                            <IonLabel className="choice-label">
                              {choice.name} <span className="choice-price">(+${choice.price})</span>
                            </IonLabel>

                            {/* Quantity: −/+ or type any amount (was a fixed 1–10 select). */}
                            <div className="qty-stepper" slot="end">
                              <IonButton
                                fill="clear"
                                size="small"
                                aria-label="Disminuir cantidad"
                                disabled={!checked || qty <= 1}
                                onClick={() =>
                                  handleCheckboxQuantityChange(option.productOptionId, choiceId, qty - 1)
                                }
                              >
                                <IonIcon slot="icon-only" icon={removeOutline} />
                              </IonButton>
                              <IonInput
                                className="qty-input"
                                type="number"
                                inputmode="numeric"
                                min={1}
                                max={MAX_CHOICE_QTY}
                                aria-label={`Cantidad ${choice.name}`}
                                value={qty}
                                disabled={!checked}
                                onIonInput={e => {
                                  const n = parseInt(String(e.detail.value ?? ''), 10);
                                  if (!isNaN(n) && n >= 1) {
                                    handleCheckboxQuantityChange(
                                      option.productOptionId,
                                      choiceId,
                                      Math.min(n, MAX_CHOICE_QTY)
                                    );
                                  }
                                }}
                                onIonBlur={e => {
                                  // Empty/invalid typing never reaches state — show the real qty again.
                                  (e.target as HTMLIonInputElement).value = qty;
                                }}
                              />
                              <IonButton
                                fill="clear"
                                size="small"
                                aria-label="Aumentar cantidad"
                                disabled={!checked || qty >= MAX_CHOICE_QTY}
                                onClick={() =>
                                  handleCheckboxQuantityChange(option.productOptionId, choiceId, qty + 1)
                                }
                              >
                                <IonIcon slot="icon-only" icon={addOutline} />
                              </IonButton>
                            </div>
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
                          {(() => {
                            const optionId = option.productOptionId;
                            const picked =
                              selectedOptions[optionId] === choice.productOptionChoiceId.toString();
                            const qty = picked ? radioQty[optionId] ?? 1 : 1;
                            const setQty = (n: number) =>
                              setRadioQty(prev => ({ ...prev, [optionId]: n }));
                            return (
                              <div className="qty-stepper" slot="end">
                                <IonButton
                                  fill="clear"
                                  size="small"
                                  aria-label="Disminuir cantidad"
                                  disabled={!picked || qty <= 1}
                                  onClick={() => setQty(qty - 1)}
                                >
                                  <IonIcon slot="icon-only" icon={removeOutline} />
                                </IonButton>
                                <IonInput
                                  className="qty-input"
                                  type="number"
                                  inputmode="numeric"
                                  min={1}
                                  max={MAX_CHOICE_QTY}
                                  aria-label={`Cantidad ${choice.name}`}
                                  value={qty}
                                  disabled={!picked}
                                  onIonInput={e => {
                                    const n = parseInt(String(e.detail.value ?? ''), 10);
                                    if (!isNaN(n) && n >= 1) setQty(Math.min(n, MAX_CHOICE_QTY));
                                  }}
                                  onIonBlur={e => {
                                    // Empty/invalid typing never reaches state — show the real qty again.
                                    (e.target as HTMLIonInputElement).value = qty;
                                  }}
                                />
                                <IonButton
                                  fill="clear"
                                  size="small"
                                  aria-label="Aumentar cantidad"
                                  disabled={!picked || qty >= MAX_CHOICE_QTY}
                                  onClick={() => setQty(qty + 1)}
                                >
                                  <IonIcon slot="icon-only" icon={addOutline} />
                                </IonButton>
                              </div>
                            );
                          })()}
                        </IonItem>
                      ))}
                    </IonRadioGroup>
                  )}
                </IonList>
              ))}

              {/* Piezas section for "Servicio Completo" product */}
              {isServicioCompleto && (
                <IonCard className="piezas-card">
                  <IonCardHeader>
                    <IonCardTitle className="piezas-title">Piezas</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <IonGrid>
                      {/* Header row */}
                      <IonRow className="piezas-header-row">
                        <IonCol className="piezas-col-header">
                          <IonText className="piezas-header-text">Pantalones</IonText>
                        </IonCol>
                        <IonCol className="piezas-col-header">
                          <IonText className="piezas-header-text">Prendas</IonText>
                        </IonCol>
                        <IonCol className="piezas-col-header">
                          <IonText className="piezas-header-text">Otros</IonText>
                        </IonCol>
                      </IonRow>
                      {/* Values row */}
                      <IonRow className="piezas-values-row">
                        <IonCol className="piezas-col-input">
                          <IonInput
                            type="number"
                            inputmode="numeric"
                            value={String(pieces.pantalones)}
                            placeholder="0"
                            min="0"
                            step="1"
                            onIonChange={(e: any) => handlePieceChange('pantalones', e.detail.value || '0')}
                            className="piezas-input"
                          />
                        </IonCol>
                        <IonCol className="piezas-col-input">
                          <IonInput
                            type="number"
                            inputmode="numeric"
                            value={String(pieces.prendas)}
                            placeholder="0"
                            min="0"
                            step="1"
                            onIonChange={(e: any) => handlePieceChange('prendas', e.detail.value || '0')}
                            className="piezas-input"
                          />
                        </IonCol>
                        <IonCol className="piezas-col-input">
                          <IonInput
                            type="number"
                            inputmode="numeric"
                            value={String(pieces.otros)}
                            placeholder="0"
                            min="0"
                            step="1"
                            onIonChange={(e: any) => handlePieceChange('otros', e.detail.value || '0')}
                            className="piezas-input"
                          />
                        </IonCol>
                      </IonRow>
                    </IonGrid>
                    <IonText className="piezas-total">
                      Total piezas: {pieces.pantalones + pieces.prendas + pieces.otros}
                    </IonText>
                  </IonCardContent>
                </IonCard>
              )}

              <IonButton expand="block" onClick={handleAddToCart}>
                Agregar al carrito
              </IonButton>
            </IonCardContent>
          </div>
        </div>

        <IonToast
          isOpen={showValidationToast}
          onDidDismiss={() => setShowValidationToast(false)}
          message={validationToastMessage}
          color="warning"
          position="bottom"
          duration={3000}
          buttons={[{ text: 'OK', role: 'cancel' }]}
        />
      </IonContent>

      <AlertPopover {...pops.alertPopoverProps} />
      <MailPopover {...pops.mailPopoverProps} />
    </IonPage>
  );
};

export default ProductDetailPage;

