import { IonPage, IonContent, IonHeader, IonTitle, IonToolbar, IonGrid, IonRow, IonCol, IonCard, IonCardContent, IonButtons, IonButton, IonIcon, IonBadge } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { fetchCategories, Categories } from '../../../data/categories'
import { cartOutline } from 'ionicons/icons';
import { useCart } from '../../../context/cartContext';

const Category: React.FC = () => {
  const history = useHistory();
  const { cart } = useCart();
  const [categories, setCategories] = useState<Categories[]>([]);

  // Calculate total quantity of products in cart
  const totalQuantity = cart.reduce((acc, item) => acc + item.quantity, 0);

  useEffect(() => {
    const loadCategories = async () => {
      const fetchedCategories = await fetchCategories();
      setCategories(fetchedCategories);
    };

    loadCategories();
  }, []);

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
        <IonGrid>
          <IonRow>
            {categories.map((category, index) => (
              <IonCol size="6" key={category.productCategoryId || index}>
                <IonCard onClick={() => history.push(`/product/${category.productCategoryId}`)}>
                  <img src={category.image} alt={category.name} className="category-image" />
                  <IonCardContent className="ion-text-center">
                    <h2>{category.name}</h2>
                  </IonCardContent>
                </IonCard>
              </IonCol>
            ))}
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default Category;