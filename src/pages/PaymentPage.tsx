import {
    IonPage,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonRadioGroup,
    IonItem,
    IonLabel,
    IonRadio,
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardContent,
    IonCardTitle,
    IonCardSubtitle,
    IonList,
    IonToast,
  } from '@ionic/react';
  
  import { useOrder } from '../context/OrderContext';
  import { useState } from 'react';
  import { useHistory } from 'react-router-dom';
  //import { products } from '../data/products';
  
  const PaymentPage: React.FC = () => {
    const { order, setOrder } = useOrder();
    const [paymentMethod, setPaymentMethod] = useState<string>('');
    const [showToast, setShowToast] = useState(false);
    const history = useHistory();
  
    if (!order) return <IonPage><IonContent><p>No hay datos de orden.</p></IonContent></IonPage>;
  
    //const product = products.find(p => p.id === order.productId);
    //const optionSummary = Object.entries(order.selectedOptions || {}).map(([optionId, value]) => {
      //const option = product?.options?.find(o => o.id === optionId);
      //if (!option) return null;
  
      //const values = Array.isArray(value) ? value : [value];
      //const labels = values.map(v => {
        //const choice = option.choices.find(c => c.id === v);
        //return choice ? choice.name : v;
      //});
  
      //return `${option.name}: ${labels.join(', ')}`;
    //});
  
    const handleSubmit = () => {
      if (!paymentMethod) {
        setShowToast(true);
        return;
      }
  
      setOrder({
        ...order,
        paymentMethod,
      });
  
      // Send to backend here if needed
  
      history.push('/confirmation');
    };
  
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Pago</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <IonCard>
            <IonCardHeader>
              <IonCardTitle></IonCardTitle>
              <IonCardSubtitle></IonCardSubtitle>
            </IonCardHeader>
            <IonCardContent>
       
            </IonCardContent>
          </IonCard>
  
          <IonList>
            <IonRadioGroup value={paymentMethod} onIonChange={e => setPaymentMethod(e.detail.value)}>
              <IonItem>
                <IonLabel>Efectivo</IonLabel>
                <IonRadio slot="start" value="Efectivo" />
              </IonItem>
              <IonItem>
                <IonLabel>Tarjeta</IonLabel>
                <IonRadio slot="start" value="Tarjeta" />
              </IonItem>
            </IonRadioGroup>
          </IonList>
  
          <IonButton expand="block" onClick={handleSubmit}>
            Confirmar Pedido
          </IonButton>
  
          <IonToast
            isOpen={showToast}
            message="Selecciona un método de pago"
            duration={2000}
            onDidDismiss={() => setShowToast(false)}
          />
        </IonContent>
      </IonPage>
    );
  };
  
  export default PaymentPage;
  