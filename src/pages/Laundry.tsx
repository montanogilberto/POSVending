import {
  IonContent,
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
  IonPage,
} from '@ionic/react';
import { useEffect, useState } from 'react';
import './Laundry.css';

interface Transaction {
  date: string;
  amount: number;
}

interface LaundryData {
  ingreso: number;
}

const Laundry: React.FC = () => {
  const [cash, setCash] = useState<number | undefined>();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allLaundry, setAllLaundry] = useState<LaundryData[]>([]);

  // 🔄 POST al backend para guardar un ingreso de lavandería
  const sendToBackend = async (amount: number): Promise<boolean> => {
    try {
      const response = await fetch('https://smartloansbackend.azurewebsites.net/laundry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          laundry: [
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
      console.log('Respuesta del backend (Laundry):', data);
      return true;
    } catch (error) {
      console.error(error);
      setToastMessage('Error al enviar datos al backend.');
      setShowToast(true);
      return false;
    }
  };

  // 🔄 GET para obtener ingresos de lavandería
  const fetchAllLaundry = async () => {
    try {
      const response = await fetch('https://smartloansbackend.azurewebsites.net/all_vending');
      if (!response.ok) {
        throw new Error(`Error al obtener datos del backend: ${response.status}`);
      }

      const data = await response.json();
      console.log('Datos desde /all_laundry:', data);

      let laundryData = data.laundry;

      // Si el backend devuelve string, intentar parsear
      if (typeof laundryData === 'string') {
        try {
          laundryData = JSON.parse(laundryData);
        } catch (error) {
          laundryData = [];
        }
      }

      // Validar que sea arreglo
      if (Array.isArray(laundryData)) {
        setAllLaundry(laundryData);
      } else {
        setAllLaundry([]);
      }
    } catch (error) {
      console.error(error);
      setToastMessage('Error al obtener ingresos del backend.');
      setShowToast(true);
    }
  };

  // 📦 Cargar ingresos al iniciar
  useEffect(() => {
    fetchAllLaundry();
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

    setTransactions((prev) => [newTransaction, ...prev].slice(0, 5));
    setToastMessage(`Pago aceptado: $${cash.toFixed(2)}`);
    setShowToast(true);
    setCash(undefined);
    fetchAllLaundry(); // 🔄 Recargar lista
  };

  // 🔢 Calcular total
  const calculateTotal = (): number => {
    return allLaundry.reduce((sum, item) => sum + item.ingreso, 0);
  };

  return (
    <><IonPage>
      <IonContent fullscreen>
       

        <IonGrid className="ion-padding">
          <IonCard>
            <IonCardHeader>
              
            </IonCardHeader>
          </IonCard>
          <IonCard>
            <IonCardHeader>
              <IonCardSubtitle>Laundry</IonCardSubtitle>
            </IonCardHeader>
          </IonCard>
          {/* 🔢 Total de ingresos lavandería */}
          <IonRow className="ion-justify-content-center">
            <IonCol sizeMd="6" sizeLg="4" sizeXs="12">
              <IonCard>
                <IonCardHeader>
                  <IonCardSubtitle>💧 Total de Ingresos</IonCardSubtitle>
                </IonCardHeader>
                <IonCardContent>
                  ${calculateTotal().toFixed(2)}
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          {/* Formulario */}
          <IonRow className="ion-justify-content-center">
            <IonCol sizeMd="6" sizeLg="4" sizeXs="12">
              <IonItem className="cash-item" lines="none">
                <IonLabel position="floating" className="cash-label">
                  Ingrese el pago
                </IonLabel>
                <br />
                <IonInput
                  type="number"
                  value={cash}
                  onIonChange={(e) => setCash(parseFloat(e.detail.value!))}
                  placeholder="Ej. 50.00"
                  className="cash-input"
                />
              </IonItem>
              <IonButton expand="block" onClick={handleAccept}>
                Aceptar Pago
              </IonButton>
            </IonCol>
          </IonRow>

          {/* Transacciones recientes */}
          <IonRow className="ion-justify-content-center ion-margin-top">
            <IonCol sizeMd="6" sizeLg="4" sizeXs="12">
              <IonList className="transaction-list">
                <IonCard>
                  <IonCardHeader>
                    <IonCardSubtitle>🧾 Últimos pagos (local)</IonCardSubtitle>
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

          {/* Lista desde backend */}
          <IonRow className="ion-justify-content-center ion-margin-top">
            <IonCol sizeMd="6" sizeLg="4" sizeXs="12">
              <IonList className="backend-list">
                <IonCard>
                  <IonCardHeader>
                    <IonCardSubtitle>💾 Actividad</IonCardSubtitle>
                  </IonCardHeader>
                </IonCard>
                {allLaundry.length === 0 ? (
                  <IonCard>
                    <IonCardContent className="ion-text-center">
                      🚫 Sin actividad
                    </IonCardContent>
                  </IonCard>
                ) : (
                  allLaundry.map((item, index) => (
                    <IonCard key={index}>
                      <IonCardContent>
                        Pago registrado: ${item.ingreso.toFixed(2)}
                      </IonCardContent>
                    </IonCard>
                  ))
                )}
              </IonList>
            </IonCol>
          </IonRow>
        </IonGrid>

        {/* Toast */}
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={2000}
          color={toastMessage.includes('Error') ? 'danger' : 'success'}
        />
      </IonContent>
      </IonPage>
    </>
  );
};

export default Laundry;
