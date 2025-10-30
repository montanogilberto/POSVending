import { IonPage, IonContent, IonGrid, IonRow, IonCol, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonButtons, IonButton, IonIcon, IonBadge } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { fetchCategories, Categories } from '../../data/categories';
import { cartOutline } from 'ionicons/icons';
import { useCart } from '../../context/CartContext';
import { IonLoading } from '@ionic/react';
import Header from '../../components/Header';
import AlertPopover from '../../components/PopOver/AlertPopover';
import MailPopover from '../../components/PopOver/MailPopover';

const CategoryPage: React.FC = () => {
  const history = useHistory();
  const { cart } = useCart();
  const [categories, setCategories] = useState<Categories[]>([]);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);
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

  // Calculate total quantity of products in cart
  const totalQuantity = cart.reduce((acc, item) => acc + item.quantity, 0);

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
          <IonLoading isOpen={loading} message="Cargando categorías..." />
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <Header
        presentAlertPopover={presentAlertPopover}
        presentMailPopover={presentMailPopover}
        screenTitle=""
        showBackButton={true}
        backButtonText="Dashboard"
        backButtonHref="/Laundry"
      />
      <IonContent fullscreen>
        <IonGrid className="ion-padding">
          <IonRow className="ion-justify-content-center">
            <IonCol sizeMd="6" sizeLg="4" sizeXs="12">
              <IonCard className="dashboard-card">
                <IonCardHeader>
                  <IonCardSubtitle>Categorías Disponibles</IonCardSubtitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonGrid>
                    <IonRow>
                      {categories.map((category, index) => (
                        <IonCol size="6" key={category.categoryId || index}>
                          <IonCard onClick={() => history.push(`/product/${category.categoryId}`)}>
                            <img src={category.image} alt={category.name} className="category-image" />
                            <IonCardContent className="ion-text-center">
                              <h2>{category.name}</h2>
                            </IonCardContent>
                          </IonCard>
                        </IonCol>
                      ))}
                    </IonRow>
                  </IonGrid>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
        </IonGrid>
        <IonButtons slot="end" style={{ position: 'absolute', top: '10px', right: '10px' }}>
          <IonButton onClick={() => history.push('/cart')} aria-label="Go to Cart" style={{ position: 'relative' }}>
            <IonIcon icon={cartOutline} size="large"/>
            {totalQuantity > 0 && (
              <IonBadge color="danger" >
                {totalQuantity}
              </IonBadge>
            )}
          </IonButton>
        </IonButtons>
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