import { IonPage, IonContent, IonGrid, IonRow, IonCol, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonButtons, IonButton, IonIcon, IonImg, IonCardTitle } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { fetchCategories, Categories } from '../../data/categories';
import { useLocation } from 'react-router-dom';
import { IonLoading } from '@ionic/react';
import Header from '../../components/Header';
import AlertPopover from '../../components/PopOver/AlertPopover';
import MailPopover from '../../components/PopOver/MailPopover';
import '../../styles/dashboard.css';

const CategoryPage: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const [categories, setCategories] = useState<Categories[]>([]);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);
  const [popoverState, setPopoverState] = useState<{ showAlertPopover: boolean; showMailPopover: boolean; event?: Event }>({
    showAlertPopover: false,
    showMailPopover: false,
  });

  // Check if we're in expense mode based on the route
  const isExpenseMode = location.pathname.startsWith('/expense-');

  const presentAlertPopover = (e: React.MouseEvent) => {
    setPopoverState({ ...popoverState, showAlertPopover: true, event: e.nativeEvent });
  };

  const dismissAlertPopover = () => setPopoverState({ ...popoverState, showAlertPopover: false });

  const presentMailPopover = (e: React.MouseEvent) => {
    setPopoverState({ ...popoverState, showMailPopover: true, event: e.nativeEvent });
  };

  const dismissMailPopover = () => setPopoverState({ ...popoverState, showMailPopover: false });

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const loadCategories = async () => {
      try {
        setLoading(true);
        const fetchedCategories = await fetchCategories();
        setCategories(fetchedCategories);
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  if (loading) {
    return (
      <IonPage>
        <IonContent className="ion-padding">
          <IonLoading isOpen={loading} message="Cargando categorías...." />
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <Header
        presentAlertPopover={presentAlertPopover}
        presentMailPopover={presentMailPopover}
        screenTitle="Categorías"
      />
      <IonContent fullscreen className="dashboard-content">
        <div className="dashboard-container">
          {/* Header */}
          <div className="dashboard-header-section">
            <h1 className="dashboard-title">{isExpenseMode ? 'Categorías de Egresos' : 'Categorías'}</h1>
          </div>

          {/* Categories Grid */}
          <div className="dashboard-card">
            <IonCardHeader>
              <IonCardSubtitle>{isExpenseMode ? 'Categorías de Egresos Disponibles' : 'Categorías Disponibles'}</IonCardSubtitle>
            </IonCardHeader>
            <IonCardContent>
              <IonGrid style={{ padding: '16px' }}>
                <IonRow className="ion-justify-content-center">
                  {categories.map((category, index) => (
                    <IonCol size="6" sizeLg="4" key={category.categoryId || index} style={{ display: 'flex', justifyContent: 'center' }}>
                      <IonCard onClick={() => {
                        const route = isExpenseMode 
                          ? `/expense-products/${category.categoryId}` 
                          : `/product/${category.categoryId}`;
                        history.push(route);
                      }} style={{ background: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', padding: '16px', margin: '8px', width: '100%', maxWidth: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                        <IonImg src={category.image} style={{ width: '128px', height: '128px', objectFit: 'contain', marginBottom: '12px' }} />
                        <IonCardTitle style={{ color: '#444', fontSize: '18px', fontWeight: '500', textAlign: 'center', margin: 0 }}>{category.name}</IonCardTitle>
                      </IonCard>
                    </IonCol>
                  ))}
                </IonRow>
              </IonGrid>
            </IonCardContent>
          </div>
        </div>
      </IonContent>

      <AlertPopover
        isOpen={popoverState.showAlertPopover}
        event={popoverState.event}
        onDidDismiss={dismissAlertPopover}
      />
      <MailPopover
        isOpen={popoverState.showMailPopover}
        event={popoverState.event}
        onDidDismiss={dismissMailPopover}
      />
    </IonPage>
  );
};

export default CategoryPage;