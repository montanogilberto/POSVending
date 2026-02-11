import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonToast,
  IonAlert,
  IonButton,
  IonIcon,
  IonLoading,
  IonLabel,
  IonChip,
  IonInput,
} from '@ionic/react';
import { addCircle, card, wallet, business, receipt, cart, person, checkmarkCircle, lockClosed, pricetag } from 'ionicons/icons';
import { useCart } from '../../context/CartContext';
import { useProduct } from '../../context/ProductContext';
import { useState, useEffect, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { submitOrder } from '../../api/cartApi';
import useInactivityTimer from '../../hooks/useInactivityTimer';
import { fetchTicket } from '../../api/ticketApi';
import { postIncome, applyPromoToIncome } from '../../api/incomeApi';
import { useIncome } from '../../context/IncomeContext';
import { Client } from '../../api/clientsApi';

import '../../styles/dashboard.css';
import './CartPage.css';

import CartItemCard from '../../components/CartItemCard';
import ClientSelector from '../../components/ClientSelector';
import ReceiptDisplay from '../Receipt/ReceiptDisplay';
import CashRegisterCard from '../../components/CashRegisterCard';

/**
 * Helper function for 2x1 promotion: calculates how many items to pay for.
 * Buy 2, get 1 free means: for every 3 items, pay for 2.
 * Formula: qty - floor(qty / 2) = pay for 2 out of every 3
 */
const payQty2x1 = (qty: number): number => Math.max(0, qty - Math.floor(qty / 2));

const CartPage: React.FC = () => {
  const { cart: cartItems, removeFromCart, clearCart } = useCart();
  const { clearAllProducts } = useProduct();
  const { loadIncomes } = useIncome();
  const history = useHistory();

  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Tarjeta' | 'Transferir' | ''>('');
  const [cashPaid, setCashPaid] = useState<string>('');
  const [showAlert, setShowAlert] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState<'success' | 'danger' | 'warning'>('danger');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [changeAmount, setChangeAmount] = useState(0);
  const [ticketData, setTicketData] = useState<any>(null);
  const [lastIncomeId, setLastIncomeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [isCashRegisterOpen, setIsCashRegisterOpen] = useState(false);

  // Promotion code state
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);

  // Validate promo code (currently supports "2X1" for 2x1 on all services)
  const isPromoValid = useMemo(() => {
    const code = promoCode.trim().toUpperCase();
    if (!code) return false;
    // Supported promo codes
    const supportedCodes = ['2X1'];
    return supportedCodes.includes(code);
  }, [promoCode]);

  // Promotion is active if code is valid
  const promoActive = promoCode.trim().length > 0 && isPromoValid;

  // Clear promo error when code changes
  useEffect(() => {
    setPromoError('');
  }, [promoCode]);

  // Compute totals with promotion preview
  const totals = useMemo(() => {
    // Guard: if no cart items, return zeros
    if (!cartItems || cartItems.length === 0) {
      return { lines: [], subtotal: 0, total: 0, discount: 0 };
    }
    
    let subtotal = 0;
    let totalPromo = 0;
    const lines = cartItems.map((item) => {
      // item.price is already the line total (price * quantity)
      const lineTotal = Number(item.price) || 0;
      const qty = Number(item.quantity) || 1;
      
      subtotal += lineTotal;
      
      if (!promoActive) {
        return { ...item, payQty: qty, promoLineTotal: lineTotal, discount: 0 };
      }
      
      const payQty = payQty2x1(qty);
      const promoLineTotal = qty > 0 
        ? Math.round((lineTotal * (payQty / qty)) * 100) / 100 
        : lineTotal;
      const discount = Math.round((lineTotal - promoLineTotal) * 100) / 100;
      
      totalPromo += promoLineTotal;
      
      return { ...item, payQty, promoLineTotal, discount };
    });

    const discount = Math.round((subtotal - totalPromo) * 100) / 100;
    const finalTotal = promoActive ? totalPromo : subtotal;

    return { 
      lines, 
      subtotal: Math.round(subtotal * 100) / 100, 
      total: Math.round(finalTotal * 100) / 100, 
      discount: Math.round(discount * 100) / 100
    };
  }, [cartItems, promoActive]);

  // Calculate total (use promo-adjusted total)
  const total = totals.total;
  const cashNumber = parseFloat(cashPaid);

  const isCheckoutEnabled =
    !!paymentMethod &&
    isCashRegisterOpen &&
    (paymentMethod !== 'Efectivo' ||
      (!isNaN(cashNumber) && cashNumber >= total));

  const isCheckoutEnabledFinal = isCheckoutEnabled;

  useInactivityTimer(300000, () => window.location.reload());

  useEffect(() => {
    const cash = parseFloat(cashPaid);
    if (paymentMethod === 'Efectivo' && !isNaN(cash) && cash > total) {
      setChangeAmount(cash - total);
    } else {
      setChangeAmount(0);
    }
  }, [cashPaid, paymentMethod, total]);

  const showErrorToast = (message: string, color: 'success' | 'danger' | 'warning' = 'danger') => {
    setToastMessage(message);
    setToastColor(color);
    setShowToast(true);
  };

  const formatPrice = (price: number) => {
    const safePrice = isNaN(price) ? 0 : price;
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(safePrice);
  };

  const handleCheckout = async () => {
    if (!paymentMethod) {
      setShowAlert(true);
      return;
    }

    // Validate cash register is open
    if (!isCashRegisterOpen) {
      showErrorToast('La caja está cerrada. Abra la caja para realizar ventas.');
      return;
    }

    if (paymentMethod === 'Efectivo') {
      const cash = parseFloat(cashPaid);
      if (isNaN(cash) || cash < total) {
        showErrorToast('El efectivo pagado debe ser igual o mayor al total.');
        return;
      }
    }

    setLoading(true);

    const orderData = {
      orders: cartItems.map((item) => {
        const selections = Object.entries(item.selectedOptions || {})
          .map(([optionType, optionValues]) =>
            (Array.isArray(optionValues) ? optionValues : [optionValues]).map((value: string) => ({
              productOptionId: optionType,
              productOptionChoiceId: value,
            }))
          )
          .flat();

        return {
          productId: item.productId,
          quantity: item.quantity,
          paymentMethod: paymentMethod,
          orderNumber: Math.floor(Math.random() * 10000),
          tableNumber: 5,
          userId: 1,
          total: item.price, // item.price already includes quantity
          clientId: selectedClient?.clientId ?? 1,
          comments: '',
          selections: selections,
        };
      }),
    };

    try {
      const response = await submitOrder(orderData);

      if (response.ok) {
        try {
          const products = cartItems.map((item) => {
            // Group choices by productOptionId
            const optionsByOptionId: { [optionId: number]: Array<{
              productOptionChoiceId: number;
              name: string;
              price: number;
              quantity: number;
            }> } = {};

            Object.entries(item.selectedChoices).forEach(([optionId, choices]) => {
              const optId = parseInt(optionId);
              choices.forEach((choice) => {
                if (!optionsByOptionId[optId]) {
                  optionsByOptionId[optId] = [];
                }
                optionsByOptionId[optId].push({
                  productOptionChoiceId: choice.id,
                  name: choice.name,
                  price: choice.price,
                  quantity: choice.quantity,
                });
              });
            });

            // Build the new nested structure
            const productOptions = Object.entries(optionsByOptionId).map(([productOptionId, choices]) => ({
              productOptionId: parseInt(productOptionId),
              choices: choices,
            }));

            return {
              productId: parseInt(item.productId),
              name: item.name,
              unitPrice: item.price / item.quantity, // Derive unit price from total
              subtotal: item.price, // item.price already includes quantity
              quantity: item.quantity,
              options: productOptions,
            };
          });

          const promoCodeValue = promoActive ? promoCode.trim().toUpperCase() : null;

          const payload = {
            income: [
              {
                action: 1,
                total: total,
                paymentMethod: paymentMethod.toLowerCase(),
                cashPaid: paymentMethod === 'Efectivo' ? cashNumber : 0,
                cashReturn: paymentMethod === 'Efectivo' ? changeAmount : 0,
                paymentDate: new Date().toISOString(),
                userId: 1,
                clientId: selectedClient?.clientId ?? 2,
                companyId: 1,
                promotionCode: promoCodeValue,
                products: cartItems.map((item) => ({
                  productId: parseInt(item.productId),
                  quantity: item.quantity,
                  // Only include pieces for "Servicio Completo" products
                  ...(item.pieces && { pieces: item.pieces }),
                  options: Object.entries(item.selectedChoices).flatMap(([optionId, choices]) =>
                    choices.map((choice) => ({
                      productOptionId: parseInt(optionId),
                      productOptionChoiceId: choice.id,
                      quantity: choice.quantity,
                    }))
                  ),
                })),
              },
            ],
          };

          console.log('Income Payload:', JSON.stringify(payload, null, 2));

          const incomeData = await postIncome(payload);
          const rec = Array.isArray(incomeData.result)
            ? incomeData.result[0]
            : null;

          if (rec && rec.msg === 'Inserted Successfully' && rec.value != null) {
            const newId = String(rec.value);
            setLastIncomeId(newId);
            await loadIncomes();

            // Apply promo code to income via stored procedure (DB is source of truth)
            if (promoActive && promoCodeValue) {
              try {
                const promoPayload = {
                  promo: [{
                    action: 1,
                    incomeId: parseInt(newId),
                    companyId: 1,
                    code: promoCodeValue,
                    userId: 1
                  }]
                };
                console.log('Applying promo:', JSON.stringify(promoPayload, null, 2));
                const promoResult = await applyPromoToIncome(promoPayload);
                console.log('Promo applied result:', promoResult);
                setPromoApplied(true);
              } catch (promoError) {
                console.error('Error applying promo:', promoError);
                // Continue even if promo fails - income was still created
              }
            }
          }
        } catch (incomeError) {}

        clearCart();
        clearAllProducts();
        setShowSuccessToast(true);
      } else {
        showErrorToast('Ocurrió un error al procesar el pedido.');
      }
    } catch (error) {
      showErrorToast('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMoreProducts = () => {
    history.push('/category');
  };

  const handlePaymentMethodSelect = (method: 'Efectivo' | 'Tarjeta' | 'Transferir') => {
    setPaymentMethod(method);
    if (method !== 'Efectivo') {
      setCashPaid('');
    }
  };

  // Get original total for display
  const originalTotal = cartItems.reduce((acc, item) => acc + item.price, 0);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/Laundry" />
          </IonButtons>
          <IonTitle>Carrito</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleAddMoreProducts}>
              <IonIcon icon={cart} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="cart-content">
        <div className="cart-wrapper">
          <div className="cart-container">
            {/* Header */}
            <div className="cart-header">
              <h1 className="cart-title">Resumen</h1>
              <p className="cart-subtitle">
                {cartItems.length > 0 
                  ? `${cartItems.length} producto${cartItems.length !== 1 ? 's' : ''}`
                  : 'Tu carrito está vacío'
                }
              </p>
            </div>

            {cartItems.length === 0 ? (
              <div className="empty-cart">
                <div className="empty-cart-icon">🛒</div>
                <p className="empty-cart-text">Tu carrito está vacío</p>
                <IonButton
                  fill="outline"
                  onClick={handleAddMoreProducts}
                  className="cart-button-secondary"
                >
                  <IonIcon slot="start" icon={addCircle} />
                  Ver productos
                </IonButton>
              </div>
            ) : (
              <>
                {/* Cart Items List */}
                <div className="cart-items-list">
                  {cartItems.map((item) => (
                    <CartItemCard
                      key={item.id}
                      id={item.id}
                      name={item.name}
                      quantity={item.quantity}
                      unitPrice={item.price / item.quantity}
                      totalPrice={item.price}
                      selectedChoices={item.selectedChoices}
                      selectedOptionLabels={item.selectedOptionLabels}
                      pieces={item.pieces}
                      onRemove={removeFromCart}
                    />
                  ))}
                </div>

                {/* Detail Footer */}
                <div className="detail-footer">
                  <IonButton
                    fill="outline"
                    onClick={handleAddMoreProducts}
                    className="detail-add-more-btn"
                  >
                    <IonIcon slot="start" icon={addCircle} className="add-icon" />
                    Agregar más
                  </IonButton>
                  <div className="detail-total">
                    <span className="detail-total-label">Total:</span>
                    <span className="detail-total-amount">
                      {formatPrice(total)}
                    </span>
                  </div>
                </div>

                {/* Promotion Code Section */}
                <div className="promo-section">
                  <div className="promo-label">CÓDIGO DE PROMOCIÓN</div>
                  <div className="promo-input-wrapper">
                    <IonInput
                      value={promoCode}
                      placeholder="Ej: 2X1"
                      onIonInput={(e) => setPromoCode(e.detail.value ?? '')}
                      className={`promo-input ${promoActive ? 'promo-active' : ''} ${promoError ? 'promo-error' : ''}`}
                      fill="outline"
                      mode="md"
                    />
                    {promoActive && (
                      <div className="promo-badge">
                        <IonIcon icon={checkmarkCircle} />
                        <span>2x1 aplicado</span>
                      </div>
                    )}
                  </div>
                  {promoError && (
                    <div className="promo-error-message">
                      <IonIcon icon={lockClosed} />
                      {promoError}
                    </div>
                  )}
                  {promoActive && totals.discount > 0 && (
                    <div className="promo-discount-display">
                      <div className="discount-row">
                        <span className="discount-label">Subtotal:</span>
                        <span className="discount-original">{formatPrice(originalTotal)}</span>
                      </div>
                      <div className="discount-row discount-savings">
                        <span className="discount-label">Descuento 2x1:</span>
                        <span className="discount-amount">-{formatPrice(totals.discount)}</span>
                      </div>
                      <div className="discount-row discount-final">
                        <span className="discount-label">Total a pagar:</span>
                        <span className="discount-final-amount">{formatPrice(total)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Cash Register Card */}
                <CashRegisterCard
                  companyId={1}
                  userId={1}
                  onToast={(msg, color) => {
                    showErrorToast(msg, color || 'danger');
                  }}
                  onCashRegisterStatusChange={setIsCashRegisterOpen}
                />

                {/* Client Selector */}
                <div className="client-section">
                  <div className="client-label">CLIENTE</div>
                  <div className="client-row">
                    <div className="client-info">
                      {selectedClient ? (
                        <>
                          <div className="client-name">
                            {selectedClient.first_name} {selectedClient.last_name}
                          </div>
                          <div className="client-contact">
                            {selectedClient.cellphone}
                            {selectedClient.email && ` • ${selectedClient.email}`}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="client-name">Mostrador / Desconocido</div>
                          <div className="client-contact">Sin cliente seleccionado</div>
                        </>
                      )}
                    </div>
                  </div>
                  <IonButton
                    fill="outline"
                    onClick={() => setShowClientSelector(true)}
                    className="client-change-btn"
                  >
                    <IonIcon icon={person} slot="start" />
                    Cambiar cliente
                  </IonButton>
                </div>

                {/* Payment Method */}
                <div className="payment-section">
                  <label className="payment-label">Método de pago</label>
                  <div className="payment-method-selector">
                    <button
                      className={`payment-method-btn ${paymentMethod === 'Efectivo' ? 'selected' : ''}`}
                      onClick={() => handlePaymentMethodSelect('Efectivo')}
                    >
                      <IonIcon icon={wallet} className="icon" />
                      Efectivo
                    </button>
                    <button
                      className={`payment-method-btn ${paymentMethod === 'Tarjeta' ? 'selected' : ''}`}
                      onClick={() => handlePaymentMethodSelect('Tarjeta')}
                    >
                      <IonIcon icon={card} className="icon" />
                      Tarjeta
                    </button>
                    <button
                      className={`payment-method-btn ${paymentMethod === 'Transferir' ? 'selected' : ''}`}
                      onClick={() => handlePaymentMethodSelect('Transferir')}
                    >
                      <IonIcon icon={business} className="icon" />
                      Transferir
                    </button>
                  </div>
                </div>

                {/* Cash Input */}
                {paymentMethod === 'Efectivo' && (
                  <div className="cash-input-section">
                    <div className="cash-input-wrapper">
                      <span className="currency-symbol">$</span>
                      <input
                        type="number"
                        value={cashPaid}
                        onChange={(e) => setCashPaid(e.target.value)}
                        placeholder="0.00"
                        min={0}
                        step="0.01"
                        className="cash-input"
                      />
                    </div>
                    {changeAmount > 0 && (
                      <div className="change-display">
                        <span className="change-amount">
                          Cambio: {formatPrice(changeAmount)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Button */}
                <div className="payment-actions">
                  <IonButton
                    expand="block"
                    onClick={handleCheckout}
                    disabled={!isCheckoutEnabledFinal || !isCashRegisterOpen}
                    className="pay-button"
                    color={!isCashRegisterOpen ? 'medium' : 'primary'}
                  >
                    <IonIcon slot="start" icon={receipt} className="pay-icon" />
                    {!isCashRegisterOpen ? 'CAJA CERRADA' : `PAGAR ${formatPrice(total)}`}
                  </IonButton>
                </div>
                
                {!isCashRegisterOpen && (
                  <div className="caja-cerrada-warning">
                    <IonIcon icon={lockClosed} slot="start" />
                    La caja está cerrada. Abra la caja para realizar ventas.
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Toasts */}
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          color={toastColor}
          position="bottom"
          buttons={[{ text: 'OK', role: 'cancel' }]}
        />

        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header="Validación"
          message="Debe seleccionar un método de pago."
          buttons={['OK']}
        />

        <IonToast
          isOpen={showSuccessToast}
          message="¡Pedido realizado!"
          color="success"
          position="bottom"
          duration={3000}
          onDidDismiss={async () => {
            setShowSuccessToast(false);
            if (lastIncomeId) {
              console.log('Fetching ticket for incomeId:', lastIncomeId);
              const ticket = await fetchTicket(lastIncomeId);
              console.log('Ticket fetched:', ticket);
              setTicketData(ticket);

              setTimeout(() => {
                const receiptEl = document.getElementById('receipt-container');
                if (receiptEl) {
                  receiptEl.scrollIntoView({ behavior: 'smooth' });
                } else {
                  console.log('Receipt container not found, trying alternative selector');
                  // Fallback to find receipt in another way
                  const allReceipts = document.querySelectorAll('[id*="receipt"]');
                  if (allReceipts.length > 0) {
                    allReceipts[0].scrollIntoView({ behavior: 'smooth' });
                  }
                }
              }, 300);
            }
          }}
        />

        {ticketData && (
          <ReceiptDisplay
            ticketData={ticketData}
            paymentMethod={paymentMethod}
            cashPaid={cashPaid}
            changeAmount={changeAmount}
            clearCart={clearCart}
            setTicketData={setTicketData}
            promotionCode={promoActive ? promoCode.trim().toUpperCase() : undefined}
            discountAmount={promoActive ? totals.discount : undefined}
          />
        )}

        <IonLoading isOpen={loading} message="Procesando..." />

        {/* Client Selector Modal */}
        <ClientSelector
          isOpen={showClientSelector}
          onClose={() => setShowClientSelector(false)}
          onChange={setSelectedClient}
          selectedClient={selectedClient}
        />
      </IonContent>
    </IonPage>
  );
};

export default CartPage;

