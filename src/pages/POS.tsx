import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonInput,
  IonButton,
  IonItem,
  IonLabel,
  IonToast,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardContent,
  IonList,
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/react';
import { useEffect, useState } from 'react';
import './POS.css';

interface Transaction {
  date: string;
  amount: number;
}

interface VendingData {
  ingreso: number;
}

const POS: React.FC = () => {
  const [cash, setCash] = useState<number | undefined>();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allVending, setAllVending] = useState<VendingData[]>([]);

  // 🔄 POST al backend para guardar un ingreso
  const sendToBackend = async (amount: number): Promise<boolean> => {
    try {
      const response = await fetch('https://smartloansbackend.azurewebsites.net/vending', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vending: [
            {
              ingreso: amount,
              action: 1,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Error al enviar al backend: ${response.status}`);
      }

      const data = await response.json();
      console.log('Respuesta del backend:', data);
      return true;
    } catch (error) {
      console.error(error);
      setToastMessage('Error al enviar datos al backend.');
      setShowToast(true);
      return false;
    }
  };
const fetchAllVending = async () => {
  try {
    const response = await fetch('https://smartloansbackend.azurewebsites.net/all_vending');
    if (!response.ok) {
      throw new Error(`Error al obtener datos del backend: ${response.status}`);
    }

    const data = await response.json();
    console.log('Datos desde /all_vending:', data);

    let vendingData = data.vending;

    // Si el backend devuelve una cadena, intentar convertirla a arreglo
    if (typeof vendingData === 'string') {
      try {
        vendingData = JSON.parse(vendingData);
      } catch (error) {
        vendingData = [];
      }
    }

    // Validar que sea un arreglo antes de asignar
    if (Array.isArray(vendingData)) {
      setAllVending(vendingData);
    } else {
      setAllVending([]); 
    }

  } catch (error) {
    console.error(error);
    setToastMessage('Error al obtener ingresos del backend.');
    setShowToast(true);
  }
};


  // 📦 Cargar ingresos al iniciar
  useEffect(() => {
    fetchAllVending();
  }, []);

  const handleAccept = async () => {
    if (!cash || cash <= 0) {
      setToastMessage('Ingrese una cantidad válida mayor a 0.');
      setShowToast(true);
      return;
    }

    const enviado = await sendToBackend(cash);
    if (!enviado) return;

    const now = new Date();
    const newTransaction: Transaction = {
      date: now.toLocaleString(),
      amount: cash,
    };

    setTransactions(prev => [newTransaction, ...prev].slice(0, 5));
    setToastMessage(`Efectivo aceptado: $${cash.toFixed(2)}`);
    setShowToast(true);
    setCash(undefined);
    fetchAllVending(); // 🔄 Recargar ingresos del backend
  };

  // 🔢 Calcular total de ingresos
  const calculateTotal = (): number => {
    return allVending.reduce((sum, item) => sum + item.ingreso, 0);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle className="ion-text-center">Punto de Venta</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <IonGrid className="ion-padding">

          {/* 🔢 Total de Ventas */}
          <IonRow className="ion-justify-content-center">
            <IonCol sizeMd="6" sizeLg="4" sizeXs="12">
              <IonCard>
                <IonCardHeader>
                  <IonCardSubtitle>💰 Total de Ventas</IonCardSubtitle>
                </IonCardHeader>
                <IonCardContent>
                  ${calculateTotal().toFixed(2)}
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          {/* Formulario de ingreso */}
          <IonRow className="ion-justify-content-center">
            <IonCol sizeMd="6" sizeLg="4" sizeXs="12">
              <IonItem className="cash-item" lines="none">
                <IonLabel position="floating" className="cash-label">Ingrese el efectivo</IonLabel>
                  <br></br>

                <IonInput
                  type="number"
                  value={cash}
                  onIonChange={(e) => setCash(parseFloat(e.detail.value!))}
                  placeholder="Ej. 100.00"
                  className="cash-input"
                />
              </IonItem>
              <IonButton expand="block" onClick={handleAccept}>
                Aceptar Dinero
              </IonButton>
            </IonCol>
          </IonRow>

          {/* Transacciones recientes (local) */}
          <IonRow className="ion-justify-content-center ion-margin-top">
            <IonCol sizeMd="6" sizeLg="4" sizeXs="12">
              <IonList className="transaction-list">
                <IonCard>
                  <IonCardHeader>
                    <IonCardSubtitle>🧾 Últimos ingresos (local)</IonCardSubtitle>
                  </IonCardHeader>
                </IonCard>
                {transactions.map((txn, index) => (
                  <IonCard key={index}>
                    <IonCardHeader>
                      <IonCardSubtitle>Fecha: {txn.date}</IonCardSubtitle>
                    </IonCardHeader>
                    <IonCardContent>
                      Monto: ${txn.amount.toFixed(2)}
                    </IonCardContent>
                  </IonCard>
                ))}
              </IonList>
            </IonCol>
          </IonRow>

         {/* Lista desde el backend */}
<IonRow className="ion-justify-content-center ion-margin-top">
  <IonCol sizeMd="6" sizeLg="4" sizeXs="12">
    <IonList className="backend-list">
      <IonCard>
        <IonCardHeader>
          <IonCardSubtitle>💾 Actividad</IonCardSubtitle>
        </IonCardHeader>
      </IonCard>
      {allVending.length === 0 ? (
        <IonCard>
          <IonCardContent className="ion-text-center">
            🚫 Sin actividad
          </IonCardContent>
        </IonCard>
      ) : (
        allVending.map((item, index) => (
          <IonCard key={index}>
            <IonCardContent>
              Ingreso registrado: ${item.ingreso.toFixed(2)}
            </IonCardContent>
          </IonCard>
        ))
      )}
    </IonList>
  </IonCol>
</IonRow>

        </IonGrid>

        {/* Toast de mensajes */}
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={2000}
          color={toastMessage.includes('Error') ? 'danger' : 'success'}
        />
      </IonContent>
    </IonPage>
  );
};

export default POS;
