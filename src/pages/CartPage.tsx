import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonList,
  IonButton,
  IonText,
  IonButtons,
  IonBackButton,
  IonSelect,
  IonSelectOption,
  IonAlert,
  IonIcon,
  IonFab,
  IonFabButton,
  IonInput,
  IonToast,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardContent,
} from '@ionic/react';
import { useCart } from '../context/CartContext';
import { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import CartItem from '../components/CartItem';
import { submitOrder } from '../api/cartApi';
import { addCircle, addCircleOutline } from 'ionicons/icons';

const CartPage: React.FC = () => {
  const { cart, removeFromCart, clearCart } = useCart();
  const history = useHistory();
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'tarjeta' | ''>('');
  const [cashPaid, setCashPaid] = useState<string>('');
  const [showAlert, setShowAlert] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [changeAmount, setChangeAmount] = useState(0);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  useEffect(() => {
    const cash = parseFloat(cashPaid);
    if (paymentMethod === 'efectivo' && !isNaN(cash) && cash > total) {
      setChangeAmount(cash - total);
      //setToastMessage(`Cambio a devolver: $${(cash - total).toFixed(2)}`);
      //setShowToast(true);
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
        console.log("cash:" + cash)
        console.log("total:" + total)
        showErrorToast('El efectivo pagado debe ser igual o mayor al total.');
        return;
      }
    }

    const orderData = {
      orders: cart.map((item) => {
        const selections = Object.entries(item.selectedOptions || {}).map(([optionType, optionValues]) => {
          return (Array.isArray(optionValues) ? optionValues : [optionValues]).map((value: string) => ({
            productOptionId: optionType,
            productOptionChoiceId: value,
          }));
        }).flat();

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
          // Call income endpoint
          try {
            const incomeResponse = await fetch('https://smartloansbackend.azurewebsites.net/income', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                income: orderData.orders.map(order => ({
                  action: 1,
                  orderId: order.orderNumber,
                  total: order.total,
                  paymentMethod: order.paymentMethod,
                  paymentDate: new Date().toISOString(),
                  userId: order.userId,
                  clientId: order.clientId,
                  companyId: 1
                }))
              })
            });
            if (incomeResponse.ok) {
              const incomeData = await incomeResponse.json();
              console.log('Income response:', incomeData);
            } else {
              console.error('Income call failed:', incomeResponse.status);
            }
          } catch (incomeError) {
            console.error('Income call error:', incomeError);
          }
          setShowSuccessToast(true);
        } else {
          const errorData = await response.json();
          console.error('Order error:', errorData.detail);
          showErrorToast('Ocurrió un error al procesar el pedido.');
        }
      } catch (error) {
        console.error('Checkout error:', error);
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
            <IonBackButton defaultHref="/tabs/home" />
          </IonButtons>
          <IonTitle>Carrito</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonGrid className="ion-padding">
          <IonRow className="ion-justify-content-center">
            <IonCol sizeMd="6" sizeLg="4" sizeXs="12">
              <IonCard className="dashboard-card">
                <IonCardHeader>
                  <IonCardSubtitle>Carrito de Compras</IonCardSubtitle>
                </IonCardHeader>
                <IonCardContent>
                  {cart.length === 0 ? (
                    <IonText>El carrito está vacío.</IonText>
                  ) : (
                    <>
                      <IonList>
                        {cart.map((item) => (
                          <CartItem
                            key={item.id}
                            id={item.id}
                            name={item.name}
                            quantity={item.quantity}
                            price={item.price}
                            selectedOptionLabels={item.selectedOptionLabels}
                            onRemove={removeFromCart}
                          />
                        ))}
                      </IonList>

                      <IonItem lines="none">
                        <IonLabel>
                          <h2>Total: ${total.toFixed(2)}</h2>
                        </IonLabel>
                      </IonItem>

                      <IonItem>
                        <IonLabel position="stacked">Método de pago</IonLabel>
                        <IonSelect
                          value={paymentMethod}
                          onIonChange={(e) => {
                            setPaymentMethod(e.detail.value);
                            setCashPaid('');
                          }}
                          interface="popover"
                        >
                          <IonSelectOption value="efectivo">Efectivo</IonSelectOption>
                          <IonSelectOption value="tarjeta">Tarjeta</IonSelectOption>
                        </IonSelect>
                      </IonItem>

                      {paymentMethod === 'efectivo' && (
                        <IonItem>
                          <IonLabel position="stacked">Efectivo recibido</IonLabel>
                          <IonInput
                            type="number"
                            value={cashPaid}
                            onIonChange={e => setCashPaid(e.detail.value!)}
                            placeholder="Ingrese el efectivo recibido"
                            min={total}
                          />
                        </IonItem>
                      )}

                      <IonButton expand="block" color="primary" onClick={handleCheckout}>
                        Proceder al pago
                      </IonButton>

                      <IonButton expand="block" color="medium" onClick={clearCart}>
                        Vaciar carrito
                      </IonButton>
                    </>
                  )}
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
        </IonGrid>
        <IonFab slot="fixed" horizontal="end" >
          <IonFabButton onClick={handleAddMoreProducts} aria-label="agregar mas productos">
            <IonIcon icon={addCircle} />
          </IonFabButton>
        </IonFab>



      </IonContent>

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
            handler: () => setShowToast(false),
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
        onDidDismiss={() => {
          clearCart();
          setShowSuccessToast(false);
          history.push('/Laundry');
          window.location.reload();
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
            handler: () => setShowSuccessToast(false),
          },
        ]}
      />
    </IonPage>
  );
};

export default CartPage;