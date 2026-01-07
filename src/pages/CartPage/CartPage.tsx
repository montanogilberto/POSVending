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
} from '@ionic/react';
import { addCircle, card, wallet, business, receipt, cart, person, checkmarkCircle } from 'ionicons/icons';
import { useCart } from '../../context/CartContext';
import { useProduct } from '../../context/ProductContext';
import { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { submitOrder } from '../../api/cartApi';
import useInactivityTimer from '../../hooks/useInactivityTimer';
import { fetchTicket } from '../../api/ticketApi';
import { postIncome } from '../../api/incomeApi';
import { useIncome } from '../../context/IncomeContext';
import { Client } from '../../api/clientsApi';

import '../../styles/dashboard.css';
import './CartPage.css';

import CartItemCard from '../../components/CartItemCard';
import ClientSelector from '../../components/ClientSelector';
import ReceiptDisplay from '../Receipt/ReceiptDisplay';

const CartPage: React.FC = () => {
  const { cart: cartItems, removeFromCart, clearCart } = useCart();
  const { clearAllProducts } = useProduct();
  const { loadIncomes } = useIncome();
  const history = useHistory();

  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'tarjeta' | 'transferencia' | ''>('');
  const [cashPaid, setCashPaid] = useState<string>('');
  const [showAlert, setShowAlert] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [changeAmount, setChangeAmount] = useState(0);
  const [ticketData, setTicketData] = useState<any>(null);
  const [lastIncomeId, setLastIncomeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientSelector, setShowClientSelector] = useState(false);

  // Calculate total - item.price already includes option prices with quantity factored in
  const total = cartItems.reduce((acc, item) => acc + item.price, 0);
  const cashNumber = parseFloat(cashPaid);

  const isCheckoutEnabled =
    !!paymentMethod &&
    (paymentMethod !== 'efectivo' ||
      (!isNaN(cashNumber) && cashNumber >= total));

  useInactivityTimer(300000, () => window.location.reload());

  useEffect(() => {
    const cash = parseFloat(cashPaid);
    if (paymentMethod === 'efectivo' && !isNaN(cash) && cash > total) {
      setChangeAmount(cash - total);
    } else {
      setChangeAmount(0);
    }
  }, [cashPaid, paymentMethod, total]);

  const showErrorToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(price);
  };

  const handleCheckout = async () => {
    if (!paymentMethod) {
      setShowAlert(true);
      return;
    }

    if (paymentMethod === 'efectivo') {
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

          const payload = {
            income: [
              {
                action: 1,
                total: total,
                paymentMethod: paymentMethod,
                paymentDate: new Date().toISOString(),
                userId: 1,
                clientId: selectedClient?.clientId ?? 1,
                companyId: 1,
                products: products,
              },
            ],
          };

          const incomeData = await postIncome(payload);
          const rec = Array.isArray(incomeData.result)
            ? incomeData.result[0]
            : null;

          if (rec && rec.msg === 'Inserted Successfully' && rec.value != null) {
            const newId = String(rec.value);
            setLastIncomeId(newId);
            await loadIncomes();
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

  const handlePaymentMethodSelect = (method: 'efectivo' | 'tarjeta' | 'transferencia') => {
    setPaymentMethod(method);
    if (method !== 'efectivo') {
      setCashPaid('');
    }
  };

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
                  <div className="cart-items-scroll">
                    {cartItems.map((item) => (
                      <CartItemCard
                        key={item.id}
                        id={item.id}
                        name={item.name}
                        quantity={item.quantity}
                        unitPrice={item.price / item.quantity}
                        totalPrice={item.price}
                        selectedChoices={item.selectedChoices}
                        onRemove={removeFromCart}
                      />
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="cart-footer">
                  {/* Total */}
                  <div className="cart-total-section">
                    <span className="cart-total-label">Total</span>
                    <span className="cart-total-amount">{formatPrice(total)}</span>
                  </div>

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
                        className={`payment-method-btn ${paymentMethod === 'efectivo' ? 'selected' : ''}`}
                        onClick={() => handlePaymentMethodSelect('efectivo')}
                      >
                        <IonIcon icon={wallet} className="icon" />
                        Efectivo
                      </button>
                      <button
                        className={`payment-method-btn ${paymentMethod === 'tarjeta' ? 'selected' : ''}`}
                        onClick={() => handlePaymentMethodSelect('tarjeta')}
                      >
                        <IonIcon icon={card} className="icon" />
                        Tarjeta
                      </button>
                      <button
                        className={`payment-method-btn ${paymentMethod === 'transferencia' ? 'selected' : ''}`}
                        onClick={() => handlePaymentMethodSelect('transferencia')}
                      >
                        <IonIcon icon={business} className="icon" />
                        Transferir
                      </button>
                    </div>
                  </div>

                  {/* Cash Input */}
                  {paymentMethod === 'efectivo' && (
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

                  {/* Action Buttons */}
                  <div className="cart-actions">
                    <IonButton
                      fill="outline"
                      onClick={handleAddMoreProducts}
                      className="cart-button-secondary"
                    >
                      <IonIcon slot="start" icon={addCircle} className="add-icon" />
                      Agregar más
                    </IonButton>

                    <IonButton
                      expand="block"
                      onClick={handleCheckout}
                      disabled={!isCheckoutEnabled}
                      className="cart-button-primary"
                    >
                      <IonIcon slot="start" icon={receipt} className="pay-icon" />
                      PAGAR {formatPrice(total)}
                    </IonButton>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Toasts */}
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          color="danger"
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
          onDidDismiss={async () => {
            setShowSuccessToast(false);
            if (lastIncomeId) {
              const ticket = await fetchTicket(lastIncomeId);
              setTicketData(ticket);

              setTimeout(() => {
                const receiptEl = document.getElementById('receipt-container');
                if (receiptEl) receiptEl.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }
          }}
          message={`¡Pedido realizado! ${paymentMethod}${
            paymentMethod === 'efectivo' && !isNaN(parseFloat(cashPaid)) && parseFloat(cashPaid) > total
              ? ` | Cambio: ${formatPrice(parseFloat(cashPaid) - total)}`
              : ''
          }`}
          color="success"
          position="bottom"
          buttons={[{ text: 'OK', role: 'cancel' }]}
        />

        {ticketData && (
          <ReceiptDisplay
            ticketData={ticketData}
            paymentMethod={paymentMethod}
            cashPaid={cashPaid}
            clearCart={clearCart}
            setTicketData={setTicketData}
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

