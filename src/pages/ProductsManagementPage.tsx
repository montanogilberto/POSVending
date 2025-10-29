import React, { useState } from 'react';
import {
  IonPage,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonFab,
  IonFabButton,
  IonAlert,
} from '@ionic/react';
import { add, create, trash, pencil } from 'ionicons/icons';
import Header from '../components/Header';
import AlertPopover from '../components/PopOver/AlertPopover';
import MailPopover from '../components/PopOver/MailPopover';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  categoryId: number;
  categoryName: string;
}

const ProductsManagementPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([
    { id: 1, name: 'Producto A', description: 'Descripción del producto A', price: 50, categoryId: 1, categoryName: 'Categoría 1' },
    { id: 2, name: 'Producto B', description: 'Descripción del producto B', price: 75, categoryId: 2, categoryName: 'Categoría 2' },
  ]);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
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

  const handleDelete = (product: Product) => {
    setSelectedProduct(product);
    setShowDeleteAlert(true);
  };

  const confirmDelete = () => {
    if (selectedProduct) {
      setProducts(products.filter(p => p.id !== selectedProduct.id));
      setSelectedProduct(null);
    }
    setShowDeleteAlert(false);
  };

  const handleCreate = () => {
    // TODO: Implement create product modal/form
    console.log('Create new product');
  };

  const handleEdit = (product: Product) => {
    // TODO: Implement edit product modal/form
    console.log('Edit product:', product);
  };

  return (
    <IonPage>
      <Header
        presentAlertPopover={presentAlertPopover}
        presentMailPopover={presentMailPopover}
        screenTitle="Productos"
        showBackButton={true}
        backButtonText="Menú"
        backButtonHref="/Laundry"
      />

      <IonContent>
        <IonList>
          {products.map((product) => (
            <IonCard key={product.id}>
              <IonCardHeader>
                <IonCardTitle>{product.name}</IonCardTitle>
                <IonCardSubtitle>
                  {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(product.price)}
                </IonCardSubtitle>
              </IonCardHeader>
              <IonCardContent>
                <p>{product.description}</p>
                <p><strong>Categoría:</strong> {product.categoryName}</p>
                <IonButtons slot="end">
                  <IonButton fill="clear" color="primary" onClick={() => handleEdit(product)}>
                    <IonIcon icon={pencil} />
                  </IonButton>
                  <IonButton fill="clear" color="danger" onClick={() => handleDelete(product)}>
                    <IonIcon icon={trash} />
                  </IonButton>
                </IonButtons>
              </IonCardContent>
            </IonCard>
          ))}
        </IonList>

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={handleCreate}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header="Confirmar eliminación"
          message={`¿Estás seguro de que quieres eliminar el producto ${selectedProduct?.name}?`}
          buttons={[
            {
              text: 'Cancelar',
              role: 'cancel',
              handler: () => setShowDeleteAlert(false),
            },
            {
              text: 'Eliminar',
              role: 'destructive',
              handler: confirmDelete,
            },
          ]}
        />
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

export default ProductsManagementPage;
