import React, { useState, useEffect } from 'react';
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
  IonLoading,
} from '@ionic/react';
import { add, trash, pencil } from 'ionicons/icons';
import Header from '../../components/Header';
import AlertPopover from '../../components/PopOver/AlertPopover';
import MailPopover from '../../components/PopOver/MailPopover';
import ProductForm from '../../components/ProductForm';
import { useProduct } from '../../context/ProductContext';
import { Product } from '../../data/type_products';

const ProductsManagementPage: React.FC = () => {
  const { productsList, loading, error, fetchProducts, removeProduct } = useProduct();
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [popoverState, setPopoverState] = useState<{ showAlertPopover: boolean; showMailPopover: boolean; event?: Event }>({
    showAlertPopover: false,
    showMailPopover: false,
  });

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

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

  const confirmDelete = async () => {
    if (selectedProduct) {
      await removeProduct(selectedProduct.productId);
      setSelectedProduct(null);
    }
    setShowDeleteAlert(false);
  };

  const handleCreate = () => {
    setEditingProduct(null);
    setShowForm(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingProduct(null);
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
        {loading && <IonLoading isOpen={loading} message="Cargando productos..." />}
        {error && <IonItem color="danger"><IonLabel>{error}</IonLabel></IonItem>}
        <IonList>
          {productsList.map((product) => (
            <IonCard key={product.productId}>
              <IonCardHeader>
                <IonCardTitle>{product.name}</IonCardTitle>
                <IonCardSubtitle>Código: {product.code}</IonCardSubtitle>
              </IonCardHeader>
              <IonCardContent>
                <p>{product.description}</p>
                <p><strong>Código de barras:</strong> {product.barCode}</p>
                <p><strong>Categoría ID:</strong> {product.categoryId}</p>
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

        <ProductForm
          isOpen={showForm}
          onClose={handleFormClose}
          product={editingProduct}
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
