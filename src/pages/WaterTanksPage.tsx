import React, { useEffect, useState } from 'react';
import {
  IonContent,
  IonPage,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonProgressBar,
  IonText,
  IonIcon,
  IonToast,
  IonButton,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/react';
import { waterOutline, barChart, refresh } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import Header from '../components/Header';
import { fetchWaterTanks, WaterTank, startPeriodicWaterTanksUpdate } from '../api/waterTanksApi';

const WaterTanksPage: React.FC = () => {
  const history = useHistory();
  const [waterTanks, setWaterTanks] = useState<WaterTank[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [popoverState, setPopoverState] = useState<{ showAlertPopover: boolean; showMailPopover: boolean; event?: Event }>({
    showAlertPopover: false,
    showMailPopover: false,
  });

  const presentAlertPopover = (e: React.MouseEvent) => {
    setPopoverState({ ...popoverState, showAlertPopover: true, event: e.nativeEvent });
  };

  const dismissAlertPopover = () => setPopoverState({ ...popoverState, showAlertPopover: false });

  const presentMailPopover = (e: React.MouseEvent) => {
    setPopoverState({ ...popoverState, showMailPopover: true, event: e.nativeEvent });
  };

  const dismissMailPopover = () => setPopoverState({ ...popoverState, showMailPopover: false });

  useEffect(() => {
    const stopPeriodicUpdate = startPeriodicWaterTanksUpdate((data) => {
      setWaterTanks(data.waterTanks);
      setLoading(false); // Set loading to false after first fetch
    });

    return () => {
      stopPeriodicUpdate();
    };
  }, []);

<<<<<<< HEAD
  const loadWaterTanks = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const response = await fetchWaterTanks();
      setWaterTanks(response.waterTanks);
      if (isRefresh) {
        setToastMessage('Datos actualizados');
        setShowToast(true);
      }
    } catch (error) {
      console.error('Error loading water tanks:', error);
      setToastMessage('Error al cargar los tanques de agua');
      setShowToast(true);
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };
=======

>>>>>>> d78ff98a0f154efe4124c7cbb768de72ccf56f53

  const getLevelColor = (percent: number): string => {
    if (percent >= 80) return 'success';
    if (percent >= 50) return 'warning';
    return 'danger';
  };

  const getLevelText = (percent: number): string => {
    if (percent >= 80) return 'Alto';
    if (percent >= 50) return 'Medio';
    return 'Bajo';
  };

  const handleRefresh = (event: CustomEvent) => {
    loadWaterTanks(true);
    event.detail.complete();
  };

  if (loading) {
    return (
      <IonPage>
        <Header
          presentAlertPopover={presentAlertPopover}
          presentMailPopover={presentMailPopover}
          screenTitle="Tanques de Agua"
        />
        <IonContent>
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <IonText>Cargando tanques...</IonText>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <Header
        presentAlertPopover={presentAlertPopover}
        presentMailPopover={presentMailPopover}
        screenTitle="Tanques de Agua"
      />
      <div style={{ padding: '16px', textAlign: 'right' }}>
        <IonButton
          fill="outline"
          onClick={() => loadWaterTanks(true)}
          disabled={refreshing}
        >
          <IonIcon icon={refresh} slot="start" />
          Actualizar
        </IonButton>
      </div>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent></IonRefresherContent>
        </IonRefresher>
        <div style={{ padding: '16px' }}>
          <IonGrid>
            <IonRow>
              {waterTanks.map((tank) => (
                <IonCol size="12" sizeMd="6" sizeLg="4" key={tank.tankWaterId}>
                  <IonCard style={{ margin: '8px 0' }}>
                    <IonCardHeader>
                      <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <IonIcon icon={waterOutline} />
                        {tank.name}
                      </IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <IonText color="medium">
                            {tank.current.quantityLiters}L / {tank.capacityLiters}L
                          </IonText>
                          <IonText color={getLevelColor(tank.current.percent)}>
                            {tank.current.percent.toFixed(1)}% - {getLevelText(tank.current.percent)}
                          </IonText>
                        </div>
                        {/* Premium Water Tank Gauge */}
                        <div style={{
                          position: 'relative',
                          width: '100%',
                          height: '160px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {/* Tank Container */}
                          <div style={{
                            position: 'relative',
                            width: '120px',
                            height: '140px'
                          }}>
                            {/* Tank Neck */}
                            <div style={{
                              position: 'absolute',
                              top: '0',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              width: '30px',
                              height: '12px',
                              backgroundColor: 'white',
                              border: '2px solid #D1D5DB',
                              borderTopLeftRadius: '6px',
                              borderTopRightRadius: '6px',
                              borderBottom: 'none',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                            }}></div>

                            {/* Tank Body */}
                            <div style={{
                              position: 'absolute',
                              top: '10px',
                              left: '0',
                              width: '120px',
                              height: '130px',
                              backgroundColor: 'white',
                              border: '2px solid #D1D5DB',
                              borderRadius: '12px',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                              overflow: 'hidden'
                            }}>
                              {/* Water Level */}
                              <div style={{
                                position: 'absolute',
                                bottom: '0',
                                left: '2px',
                                right: '2px',
                                height: `${tank.current.percent}%`,
                                backgroundColor: tank.current.percent < 50 ? '#EF4444' :
                                               tank.current.percent <= 80 ? '#F59E0B' : '#10B981',
                                transition: 'height 0.5s ease-in-out',
                                borderRadius: '0 0 10px 10px',
                                clipPath: 'inset(0 0 0 0 round 0 0 10px 10px)'
                              }}>
                                {/* Water Surface Wave */}
                                <div style={{
                                  position: 'absolute',
                                  top: '0',
                                  left: '0',
                                  right: '0',
                                  height: '3px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                  borderRadius: '2px 2px 0 0',
                                  animation: 'wave 8s ease-in-out infinite'
                                }}></div>

                                {/* Floating Bubbles */}
                                <div style={{
                                  position: 'absolute',
                                  bottom: '20%',
                                  left: '20%',
                                  width: '4px',
                                  height: '4px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                  borderRadius: '50%',
                                  animation: 'bubble1 12s ease-in-out infinite'
                                }}></div>
                                <div style={{
                                  position: 'absolute',
                                  bottom: '40%',
                                  right: '25%',
                                  width: '3px',
                                  height: '3px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                  borderRadius: '50%',
                                  animation: 'bubble2 15s ease-in-out infinite'
                                }}></div>
                              </div>

                              {/* Scale Ticks */}
                              {[0, 20, 40, 60, 80, 100].map(percent => (
                                <div key={percent} style={{
                                  position: 'absolute',
                                  left: '0',
                                  top: `${10 + (100 - percent) * 1.2}px`,
                                  width: '12px',
                                  height: '1px',
                                  backgroundColor: '#D1D5DB'
                                }}></div>
                              ))}
                            </div>

                            {/* Scale Labels */}
                            <div style={{
                              position: 'absolute',
                              left: '-20px',
                              top: '10px',
                              fontSize: '0.7em',
                              color: '#9CA3AF',
                              lineHeight: '1.2'
                            }}>
                              <div>100</div>
                              <div style={{ marginTop: '22px' }}>80</div>
                              <div style={{ marginTop: '22px' }}>60</div>
                              <div style={{ marginTop: '22px' }}>40</div>
                              <div style={{ marginTop: '22px' }}>20</div>
                              <div style={{ marginTop: '22px' }}>0</div>
                            </div>
                          </div>

                          {/* Status Display */}
                          <div style={{
                            marginLeft: '20px',
                            textAlign: 'center'
                          }}>
                            <div style={{
                              fontSize: '1.2em',
                              fontWeight: 'bold',
                              color: tank.current.percent < 50 ? '#EF4444' :
                                    tank.current.percent <= 80 ? '#F59E0B' : '#10B981'
                            }}>
                              {tank.current.percent.toFixed(1)}% — {getLevelText(tank.current.percent)}
                            </div>
                            <div style={{
                              fontSize: '0.9em',
                              color: '#6B7280',
                              marginTop: '4px'
                            }}>
                              {tank.current.quantityLiters}L / {tank.capacityLiters}L
                            </div>
                          </div>
                        </div>

                        {/* CSS Animations */}
                        <style>{`
                          @keyframes wave {
                            0%, 100% { transform: translateX(0); }
                            50% { transform: translateX(2px); }
                          }
                          @keyframes bubble1 {
                            0%, 100% { opacity: 0.1; transform: translateY(0); }
                            50% { opacity: 0.3; transform: translateY(-10px); }
                          }
                          @keyframes bubble2 {
                            0%, 100% { opacity: 0.1; transform: translateY(0); }
                            50% { opacity: 0.2; transform: translateY(-8px); }
                          }
                        `}</style>
                      </div>
                      <div style={{ fontSize: '0.9em', color: 'var(--ion-color-medium)' }}>
                        <div>Dispositivo: {tank.device}</div>
                        <div>
                          Última actualización: {
                            (() => {
                              // Parse date as UTC since database stores in UTC, then convert to Hermosillo timezone (UTC-7)
                              const utcDate = new Date(tank.current.sampledAt + (tank.current.sampledAt.includes('Z') ? '' : 'Z'));
                              const hermosilloDate = new Date(utcDate.getTime() - (7 * 60 * 60 * 1000));
                              return hermosilloDate.toLocaleString('es-ES');
                            })()
                          }
                        </div>
                        <IonButton
                          fill="clear"
                          size="small"
                          onClick={() => history.push(`/water-tanks-history/${tank.tankWaterId}`)}
                          style={{ marginTop: '8px' }}
                        >
                          <IonIcon icon={barChart} slot="start" />
                          Ver Historial
                        </IonButton>
                      </div>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              ))}
            </IonRow>
          </IonGrid>
        </div>

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={3000}
          color={toastMessage === 'Datos actualizados' ? 'success' : 'danger'}
        />
      </IonContent>
    </IonPage>
  );
};

export default WaterTanksPage;
