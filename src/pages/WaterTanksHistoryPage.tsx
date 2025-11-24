import React, { useEffect, useState } from 'react';
import {
  IonContent,
  IonPage,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonText,
  IonIcon,
  IonToast,
  IonBackButton,
  IonButtons,
  IonToolbar,
  IonTitle,
  IonHeader,
} from '@ionic/react';
import { waterOutline, timeOutline, barChartOutline } from 'ionicons/icons';
import { useParams, useHistory } from 'react-router-dom';
import { fetchWaterTanks, WaterTank, TankWaterDetail } from '../api/waterTanksApi';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const WaterTanksHistoryPage: React.FC = () => {
  const { tankId } = useParams<{ tankId: string }>();
  const history = useHistory();
  const [tank, setTank] = useState<WaterTank | null>(null);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    loadTankHistory();
  }, [tankId]);

  const loadTankHistory = async () => {
    try {
      const response = await fetchWaterTanks();
      const foundTank = response.waterTanks.find(t => t.tankWaterId === parseInt(tankId));
      if (foundTank) {
        setTank(foundTank);
      } else {
        setToastMessage('Tanque no encontrado');
        setShowToast(true);
      }
    } catch (error) {
      console.error('Error loading tank history:', error);
      setToastMessage('Error al cargar el historial del tanque');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/water-tanks" />
            </IonButtons>
            <IonTitle>Historial del Tanque</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <IonText>Cargando historial...</IonText>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!tank) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/water-tanks" />
            </IonButtons>
            <IonTitle>Historial del Tanque</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <IonText>Tanque no encontrado</IonText>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/water-tanks" />
          </IonButtons>
          <IonTitle>Historial - {tank.name}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div style={{ padding: '16px' }}>
          {/* Current Status Card */}
          <IonCard style={{ marginBottom: '16px' }}>
            <IonCardHeader>
              <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IonIcon icon={waterOutline} />
                Estado Actual
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <IonText style={{ fontSize: '1.2em', fontWeight: 'bold' }}>
                    {tank.current.quantityLiters}L / {tank.capacityLiters}L
                  </IonText>
                  <br />
                  <IonText color="medium">
                    {tank.current.percent.toFixed(1)}% lleno
                  </IonText>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <IonText color="medium" style={{ fontSize: '0.9em' }}>
                    Última actualización
                  </IonText>
                  <br />
                  <IonText style={{ fontSize: '0.9em' }}>
                    {(() => {
                      // Parse date as UTC since database stores in UTC, then convert to Hermosillo timezone (UTC-7)
                      const utcDate = new Date(tank.current.sampledAt + (tank.current.sampledAt.includes('Z') ? '' : 'Z'));
                      const hermosilloDate = new Date(utcDate.getTime() - (7 * 60 * 60 * 1000));
                      return hermosilloDate.toLocaleString('es-ES');
                    })()}
                  </IonText>
                </div>
              </div>
            </IonCardContent>
          </IonCard>

          {/* Water Level Chart */}
          <IonCard style={{ marginBottom: '16px' }}>
            <IonCardHeader>
              <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IonIcon icon={barChartOutline} />
                Gráfico de Niveles de Agua
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div style={{ height: '300px' }}>
                <Line
                  data={{
                    labels: tank.history
                      .slice()
                      .reverse()
                      .map((record) => {
                        const utcDate = new Date(record.createdAt + (record.createdAt.includes('Z') ? '' : 'Z'));
                        const hermosilloDate = new Date(utcDate.getTime() - (7 * 60 * 60 * 1000));
                        return hermosilloDate.toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: '2-digit',
                          month: '2-digit'
                        });
                      }),
                    datasets: [
                      {
                        label: 'Litros',
                        data: tank.history
                          .slice()
                          .reverse()
                          .map((record) => {
                            const liters = record.quantityLiters || (record.quantityLiter ? parseFloat(record.quantityLiter) : 0);
                            return liters;
                          }),
                        borderColor: '#007BFF',
                        backgroundColor: 'rgba(0, 123, 255, 0.1)',
                        tension: 0.4,
                        fill: true,
                      },
                      {
                        label: 'Porcentaje (%)',
                        data: tank.history
                          .slice()
                          .reverse()
                          .map((record) => {
                            const liters = record.quantityLiters || (record.quantityLiter ? parseFloat(record.quantityLiter) : 0);
                            if (liters > 0) {
                              return parseFloat(((liters / tank.capacityLiters) * 100).toFixed(1));
                            }
                            return 0;
                          }),
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        tension: 0.4,
                        yAxisID: 'y1',
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                      mode: 'index',
                      intersect: false,
                    },
                    plugins: {
                      legend: {
                        display: true,
                        position: 'top',
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                              label += ': ';
                            }
                            if (context.datasetIndex === 0) {
                              label += context.parsed.y + ' L';
                            } else {
                              label += context.parsed.y + ' %';
                            }
                            return label;
                          }
                        }
                      },
                    },
                    scales: {
                      x: {
                        display: true,
                        title: {
                          display: true,
                          text: 'Tiempo',
                        },
                      },
                      y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                          display: true,
                          text: 'Litros',
                        },
                        min: 0,
                        max: tank.capacityLiters,
                      },
                      y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                          display: true,
                          text: 'Porcentaje (%)',
                        },
                        min: 0,
                        max: 100,
                        grid: {
                          drawOnChartArea: false,
                        },
                      },
                    },
                  }}
                />
              </div>
            </IonCardContent>
          </IonCard>

          {/* History List */}
          <IonCard>
            <IonCardHeader>
              <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IonIcon icon={timeOutline} />
                Historial de Niveles
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList>
                {tank.history.map((record: TankWaterDetail) => (
                  <IonItem key={record.tankWatersDetailId}>
                    <IonIcon icon={waterOutline} slot="start" />
                    <IonLabel>
                      <h2>
                        {record.quantityLiters || record.quantityLiter
                          ? `${record.quantityLiters || (record.quantityLiter ? parseFloat(record.quantityLiter) : 0)} Litros`
                          : 'Lectura automática'
                        }
                      </h2>
                      <p>
                        {(() => {
                          // Parse date as UTC since database stores in UTC, then convert to Hermosillo timezone (UTC-7)
                          const utcDate = new Date(record.createdAt + (record.createdAt.includes('Z') ? '' : 'Z'));
                          const hermosilloDate = new Date(utcDate.getTime() - (7 * 60 * 60 * 1000));
                          return hermosilloDate.toLocaleString('es-ES');
                        })()}
                      </p>
                    </IonLabel>
                  </IonItem>
                ))}
              </IonList>
            </IonCardContent>
          </IonCard>
        </div>

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={3000}
          color="danger"
        />
      </IonContent>
    </IonPage>
  );
};

export default WaterTanksHistoryPage;
