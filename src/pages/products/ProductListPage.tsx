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
  IonList,
  IonItem,
  IonLabel,
} from '@ionic/react';
import { useParams, useHistory } from 'react-router-dom';
import { getProducts } from '../../data/products';
import { Product } from '../../data/type_products';
import { useEffect, useState, useRef } from 'react';

interface RouteParams {
  categoryId: string;
}

const ProductListPage: React.FC = () => {
  const { categoryId } = useParams<RouteParams>();
  const history = useHistory();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const categoryIdNumber = +categoryId;

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchData = async () => {
      try {
        const data = await getProducts(categoryIdNumber);
        setProducts(data);
      } catch (error) {
        setError('No se pudieron cargar los productos.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [categoryIdNumber]);

  // Since we're now fetching products by category, no need to filter
  const filteredProducts = products;

  if (loading) {
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
        <IonGrid className="ion-padding">
          <IonRow className="ion-justify-content-center">
            <IonCol sizeMd="6" sizeLg="4" sizeXs="12">
              <IonCard className="dashboard-card">
                <IonCardHeader>
                  <IonCardSubtitle>Productos Disponibles</IonCardSubtitle>
                </IonCardHeader>
                <IonCardContent>
                  {error && <p className="ion-padding">{error}</p>}

                  {filteredProducts.length > 0 ? (
                    <IonList>
                      {filteredProducts.map((product) => (
                        <IonItem key={product.id}>
                          <IonLabel>
                            <h2>{product.name}</h2>
                            <p>{product.description}</p>
                            <p>
                              {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(product.price)}
                            </p>
                          </IonLabel>
                          <IonButton
                            fill="clear"
                            onClick={() => {
                              history.push(`/products/${product.id}`, { product });
                            }}
                          >
                            Ver detalles
                          </IonButton>
                        </IonItem>
                      ))}
                    </IonList>
                  ) : (
                    <p className="ion-padding">No hay productos en esta categoría.</p>
                  )}
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default ProductListPage;
