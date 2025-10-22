import {
  IonPage,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonButton,
  IonButtons,
  IonBackButton,
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/react';
import { useParams, useHistory } from 'react-router-dom';
import { getProducts } from '../../data/products';
import { Product } from '../../data/type_products';
import { useEffect, useState } from 'react';

interface RouteParams {
  categoryId: string;
}

const ProductListPage: React.FC = () => {
  const { categoryId } = useParams<RouteParams>();
  const history = useHistory();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      console.log('Fetching products...');
      try {
        const data = await getProducts();
        console.log('Fetched products:', data);
        setProducts(data);
      } catch (error) {
        console.error('Error fetching products:', error);
        setError('No se pudieron cargar los productos.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const categoryIdNumber = +categoryId;
  console.log('Category ID from URL:', categoryIdNumber);

  const filteredProducts = products.filter(p => p.categoryId === categoryIdNumber);
  console.log('Filtered products by category:', filteredProducts);

  if (loading) {
    console.log('Loading is true, showing loading message.');
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/" />
            </IonButtons>
            <IonTitle>Productos</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <p>Cargando productos...</p>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/" />
          </IonButtons>
          <IonTitle>Productos</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {error && <p className="ion-padding">{error}</p>}

        {filteredProducts.length > 0 ? (
          <IonGrid>
            <IonRow>
              {filteredProducts.map((product) => {
                console.log('Rendering product:', product);
                return (
                  <IonCol size="12" sizeMd="6" sizeLg="4" key={product.id}>
                    <IonCard>

                      <IonCardHeader>
                        <IonCardTitle>{product.name}</IonCardTitle>
                        <IonCardSubtitle>${product.price}</IonCardSubtitle>
                      </IonCardHeader>
                      <IonCardContent>
                        <p>{product.description}</p>
                        <IonButton
                          expand="block"
                          onClick={() => {
                            console.log(`Navigating to product details for ID: ${product.id}`);
                            history.push(`/productS/${product.id}`);
                          }}
                        >
                          Ver detalles
                        </IonButton>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>
                );
              })}
            </IonRow>
          </IonGrid>
        ) : (
          <p className="ion-padding">No hay productos en esta categoría.</p>
        )}
      </IonContent>
    </IonPage>
  );
};

export default ProductListPage;
