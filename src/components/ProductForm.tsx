import React, { useState, useEffect } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonDatetime,
  IonLoading,
} from '@ionic/react';
import { close } from 'ionicons/icons';
import { useProduct } from '../context/ProductContext';
import { Product } from '../data/type_products';

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
}

const ProductForm: React.FC<ProductFormProps> = ({ isOpen, onClose, product }) => {
  const { createProduct, updateProduct, loading } = useProduct();
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    dateOfExpire: '',
    productFormId: 0,
    manufactureId: 0,
    description: '',
    barCode: '',
    categoryId: 0,
    companyId: 0,
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        code: product.code,
        dateOfExpire: product.dateOfExpire,
        productFormId: product.productFormId,
        manufactureId: product.manufactureId,
        description: product.description,
        barCode: product.barCode,
        categoryId: product.categoryId,
        companyId: product.companyId,
      });
    } else {
      setFormData({
        name: '',
        code: '',
        dateOfExpire: '',
        productFormId: 0,
        manufactureId: 0,
        description: '',
        barCode: '',
        categoryId: 0,
        companyId: 0,
      });
    }
  }, [product]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      if (product) {
        await updateProduct(product.productId, formData);
      } else {
        await createProduct(formData);
      }
      onClose();
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{product ? 'Editar Producto' : 'Crear Producto'}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>
              <IonIcon icon={close} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonLoading isOpen={loading} message="Guardando producto..." />
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          <IonItem>
            <IonLabel position="stacked">Nombre *</IonLabel>
            <IonInput
              value={formData.name}
              onIonChange={(e) => handleInputChange('name', e.detail.value!)}
              required
            />
          </IonItem>

          <IonItem>
            <IonLabel position="stacked">Código *</IonLabel>
            <IonInput
              value={formData.code}
              onIonChange={(e) => handleInputChange('code', e.detail.value!)}
              required
            />
          </IonItem>

          <IonItem>
            <IonLabel position="stacked">Fecha de Expiración</IonLabel>
            <IonDatetime
              value={formData.dateOfExpire}
              onIonChange={(e) => handleInputChange('dateOfExpire', Array.isArray(e.detail.value) ? e.detail.value[0] : e.detail.value || '')}
              presentation="date"
            />
          </IonItem>

          <IonItem>
            <IonLabel position="stacked">ID Forma del Producto</IonLabel>
            <IonInput
              type="number"
              value={formData.productFormId}
              onIonChange={(e) => handleInputChange('productFormId', parseInt(e.detail.value!))}
            />
          </IonItem>

          <IonItem>
            <IonLabel position="stacked">ID Fabricante</IonLabel>
            <IonInput
              type="number"
              value={formData.manufactureId}
              onIonChange={(e) => handleInputChange('manufactureId', parseInt(e.detail.value!))}
            />
          </IonItem>

          <IonItem>
            <IonLabel position="stacked">Descripción</IonLabel>
            <IonTextarea
              value={formData.description}
              onIonChange={(e) => handleInputChange('description', e.detail.value!)}
            />
          </IonItem>

          <IonItem>
            <IonLabel position="stacked">Código de Barras</IonLabel>
            <IonInput
              value={formData.barCode}
              onIonChange={(e) => handleInputChange('barCode', e.detail.value!)}
            />
          </IonItem>

          <IonItem>
            <IonLabel position="stacked">ID Categoría</IonLabel>
            <IonInput
              type="number"
              value={formData.categoryId}
              onIonChange={(e) => handleInputChange('categoryId', parseInt(e.detail.value!))}
            />
          </IonItem>

          <IonItem>
            <IonLabel position="stacked">ID Compañía</IonLabel>
            <IonInput
              type="number"
              value={formData.companyId}
              onIonChange={(e) => handleInputChange('companyId', parseInt(e.detail.value!))}
            />
          </IonItem>

          <IonButton expand="block" type="submit" disabled={loading}>
            {product ? 'Actualizar Producto' : 'Crear Producto'}
          </IonButton>
        </form>
      </IonContent>
    </IonModal>
  );
};

export default ProductForm;
