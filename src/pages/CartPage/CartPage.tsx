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
} from '@ionic/react';
import { useCart } from '../../context/CartContext';
import { useState, useEffect, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import { submitOrder } from '../../api/cartApi';
import useInactivityTimer from '../../hooks/useInactivityTimer';
import { fetchTicket } from '../../api/ticketApi';
import { useIncome } from '../../context/IncomeContext';
import '../../styles/dashboard.css';

import CartSummary from './CartSummary';
import CartItemsList from './CartItemsList';
import CheckoutActions from './CheckoutActions';
import ReceiptModal from './ReceiptModal';

const CartPage: React.FC = () => {
  const { cart, removeFromCart, clearCart } = useCart();
  const { loadIncomes } = useIncome();
  const history = useHistory();
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'tarjeta' | ''>('');
  const [cashPaid, setCashPaid] = useState<string>('');
  const [showAlert, setShowAlert] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [changeAmount, setChangeAmount] = useState(0);
  const [showReceipt, setShowReceipt] = useState(false);
  const [ticketData, setTicketData] = useState<any>(null);
  const [lastIncomeId, setLastIncomeId] = useState<string | null>(null);

  const receiptRef = useRef<HTMLDivElement | null>(null);

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  // ✅ FIX — versión corregida del isCheckoutEnabled
  const cashNumber = parseFloat(cashPaid);

  const isCheckoutEnabled: boolean =
    !!paymentMethod &&
    (
      paymentMethod !== 'efectivo' ||
      (
        !isNaN(cashNumber) &&
        cashNumber >= total
      )
    );

  useInactivityTimer(300000, () => window.location.reload());

  useEffect(() => {
    const cash = parseFloat(cashPaid);
    if (paymentMethod === 'efectivo' && !isNaN(cash) && cash > total) {
      setChangeAmount(cash - total);
    } else {
      setShowToast(false);
    }
  }, [cashPaid, paymentMethod, total]);

  const showErrorToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
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

    const orderData = {
      orders: cart.map((item) => {
        const selections = Object.entries(item.selectedOptions || {})
          .map(([optionType, optionValues]) => {
            return (Array.isArray(optionValues) ? optionValues : [optionValues]).map((value: string) => ({
              productOptionId: optionType,
              productOptionChoiceId: value,
            }));
          })
          .flat();

        return {
          productId: item.productId,
          quantity: item.quantity,
          paymentMethod: paymentMethod,
          orderNumber: Math.floor(Math.random() * 10000),
          tableNumber: 5,
          userId: 1,
          total: item.price * item.quantity,
          clientId: 1,
          comments: '',
          selections: selections,
        };
      }),
    };

    try {
      const response = await submitOrder(orderData);
      if (response.ok) {
        try {
          const payload = {
            income: [
              {
                action: 1,
                total: total,
                paymentMethod: paymentMethod,
                paymentDate: new Date().toISOString(),
                userId: 1,
                clientId: 1,
                companyId: 1,
                products: cart.map((item) => ({
                  productId: parseInt(item.productId),
                  options: Object.entries(item.selectedChoices).map(([optionId, choices]) => ({
                    productOptionId: parseInt(optionId),
                    choices: choices.map((c) => ({
                      productOptionChoiceId: c.id,
                      name: c.name,
                      price: c.price,
                    })),
                  }))[0],
                })),
              },
            ],
          };
          const incomeResponse = await fetch('https://smartloansbackend.azurewebsites.net/income', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (incomeResponse.ok) {
            const incomeData = await incomeResponse.json();
            const rec = Array.isArray(incomeData.result) ? incomeData.result[0] : null;

            if (rec && rec.msg === 'Inserted Successfully' && rec.value != null) {
              const newId = String(rec.value);
              setLastIncomeId(newId);
              try {
                await loadIncomes();
              } catch (reloadError) {}
            }
          }
        } catch (incomeError) {}
        setShowSuccessToast(true);
      } else {
        const errorData = await response.json();
        showErrorToast('Ocurrió un error al procesar el pedido.');
      }
    } catch (error) {
      showErrorToast('No se pudo conectar con el servidor.');
    }
  };

  const handleAddMoreProducts = () => {
    history.push('/category');
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/Laundry" />
          </IonButtons>
          <IonTitle>Carrito</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="dashboard-content">
        <div className="dashboard-container">
          <div className="dashboard-header-section">
            <h1 className="dashboard-title">Carrito de Compras</h1>
          </div>

          <div className="dashboard-card">
            <CartItemsList cart={cart} removeFromCart={removeFromCart} />

            <CartSummary
              total={total}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              cashPaid={cashPaid}
              setCashPaid={setCashPaid}
              isCheckoutEnabled={isCheckoutEnabled}
            />

            <CheckoutActions
              isCheckoutEnabled={isCheckoutEnabled}
              handleCheckout={handleCheckout}
              clearCart={clearCart}
              handleAddMoreProducts={handleAddMoreProducts}
            />
          </div>
        </div>

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          color="danger"
          position="bottom"
          buttons={[
            {
              text: 'Cerrar',
              role: 'cancel',
              handler: () => {
                setShowToast(false);
              },
            },
          ]}
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
              setShowReceipt(true);
            }
          }}
          message={`¡Pedido realizado! Método de pago: ${paymentMethod}${
            paymentMethod === 'efectivo' && !isNaN(parseFloat(cashPaid)) && parseFloat(cashPaid) > total
              ? ` : Cambio a devolver: $${(parseFloat(cashPaid) - total).toFixed(2)}`
              : ''
          }`}
          color="success"
          position="bottom"
          buttons={[
            {
              text: 'OK',
              role: 'cancel',
              handler: () => {
                setShowSuccessToast(false);
              },
            },
          ]}
        />

        <ReceiptModal
          showReceipt={showReceipt}
          ticketData={ticketData}
          receiptRef={receiptRef}
          paymentMethod={paymentMethod}
          cashPaid={cashPaid}
          clearCart={clearCart}
          loadIncomes={loadIncomes}
          setShowReceipt={setShowReceipt}
          setTicketData={setTicketData}
          history={history}
        />
      </IonContent>
    </IonPage>
  );
};

export default CartPage;
