import { IonPage, IonContent, IonHeader, IonTitle, IonToolbar, IonGrid, IonRow, IonCol, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonButtons, IonButton, IonIcon, IonBadge } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { fetchCategories, Categories } from '../../data/categories';
import { cartOutline } from 'ionicons/icons';
import { useCart } from '../../context/CartContext';
import { IonLoading } from '@ionic/react';

const CategoryPage: React.FC = () => {
  const history = useHistory();
  const { cart } = useCart();
  const [categories, setCategories] = useState<Categories[]>([]);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);

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
      <IonHeader>
        <IonToolbar>
          <IonTitle>Menu</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => history.push('/cart')} aria-label="Go to Cart" style={{ position: 'relative' }}>
              <IonIcon icon={cartOutline} size="large"/>
              {totalQuantity > 0 && (
                <IonBadge color="danger" >
                  {totalQuantity}
                </IonBadge>
              )}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
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
      </IonContent>
    </IonPage>
  );
};

export default CategoryPage;