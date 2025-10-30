import {
    IonPage,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton
  } from '@ionic/react';
import { useHistory } from 'react-router-dom';
  import { useOrder } from '../context/OrderContext';
  
const ConfirmationPage: React.FC = () => {
  const history = useHistory();
  const { clearOrder } = useOrder();
  
  const handleReturn = () => {
    clearOrder();
    history.push('/Laundry');
  };
  
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>¡Pedido Realizado!</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <h2>Gracias por tu compra</h2>
          <IonButton expand="block" onClick={handleReturn}>
            Volver al inicio
          </IonButton>
        </IonContent>
      </IonPage>
    );
  };
  
  export default ConfirmationPage;
  