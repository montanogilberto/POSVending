import React, { useState, useEffect } from 'react';
import './ProductForm.css';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
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
import { useUser } from './UserContext';

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
}

const ProductForm: React.FC<ProductFormProps> = ({ isOpen, onClose, product }) => {
  const { createProduct, updateProduct, loading } = useProduct();
  const { companyId: sessionCompanyId } = useUser();
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
        companyId: product.companyId || sessionCompanyId,
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
        companyId: sessionCompanyId,
      });
    }
  }, [product, sessionCompanyId]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        ...formData,
        companyId: sessionCompanyId,
      };

      if (product) {
        await updateProduct(product.productId, payload);
      } else {
        await createProduct(payload);
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
          <div className="product-form-fields">
            <IonInput fill="outline" label="Nombre *" labelPlacement="floating"
              value={formData.name} onIonChange={(e) => handleInputChange('name', e.detail.value!)} required />

            <IonInput fill="outline" label="Código *" labelPlacement="floating"
              value={formData.code} onIonChange={(e) => handleInputChange('code', e.detail.value!)} required />

            <div className="product-field-group">
              <p className="product-field-label">Fecha de Expiración</p>
              <IonDatetime
                value={formData.dateOfExpire}
                onIonChange={(e) => handleInputChange('dateOfExpire', Array.isArray(e.detail.value) ? e.detail.value[0] : e.detail.value || '')}
                presentation="date"
              />
            </div>

            <IonInput fill="outline" label="ID Forma del Producto" labelPlacement="floating"
              type="number" value={formData.productFormId}
              onIonChange={(e) => handleInputChange('productFormId', parseInt(e.detail.value!))} />

            <IonInput fill="outline" label="ID Fabricante" labelPlacement="floating"
              type="number" value={formData.manufactureId}
              onIonChange={(e) => handleInputChange('manufactureId', parseInt(e.detail.value!))} />

            <IonTextarea fill="outline" label="Descripción" labelPlacement="floating"
              value={formData.description} onIonChange={(e) => handleInputChange('description', e.detail.value!)} autoGrow />

            <IonInput fill="outline" label="Código de Barras" labelPlacement="floating"
              value={formData.barCode} onIonChange={(e) => handleInputChange('barCode', e.detail.value!)} />

            <IonInput fill="outline" label="ID Categoría" labelPlacement="floating"
              type="number" value={formData.categoryId}
              onIonChange={(e) => handleInputChange('categoryId', parseInt(e.detail.value!))} />

            <IonInput fill="outline" label="ID Compañía" labelPlacement="floating"
              type="number" value={sessionCompanyId} readonly />

            <IonButton expand="block" type="submit" disabled={loading}>
              {product ? 'Actualizar Producto' : 'Crear Producto'}
            </IonButton>
          </div>
        </form>
      </IonContent>
    </IonModal>
  );
};

export default ProductForm;
