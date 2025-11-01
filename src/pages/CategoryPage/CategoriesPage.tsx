import React, { useState, useRef, useEffect } from 'react';
import {
  IonPage,
  IonContent,
  IonCard,
  IonCardTitle,
  IonImg,
  IonGrid,
  IonRow,
  IonCol,
  IonLoading,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButton,
  IonIcon,
  IonAlert,
  IonFab,
  IonFabButton,
  IonModal,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonButtons,
} from '@ionic/react';
import { pencil, trash, add, camera } from 'ionicons/icons';
import { fetchCategories, Category, createCategory, updateCategory, deleteCategory } from '../../api/categoriesApi';
import { saveImage } from '../../api/saveImageApi';

interface LocalCategory {
  id: number;
  name: string;
  description: string;
  image: string;
}

const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<LocalCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<LocalCategory | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<LocalCategory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const fetchedCategories = await fetchCategories('1'); // Assuming companyId is '1'
        setCategories(fetchedCategories.map((cat: Category) => ({
          id: cat.categoryId,
          name: cat.name,
          description: '', // API doesn't provide description, so leave empty
          image: cat.image,
        })));
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  const handleDelete = (category: LocalCategory) => {
    setSelectedCategory(category);
    setShowDeleteAlert(true);
  };

  const confirmDelete = async () => {
    if (selectedCategory) {
      try {
        await deleteCategory(selectedCategory.id);
        setCategories(categories.filter(c => c.id !== selectedCategory.id));
        setSelectedCategory(null);
      } catch (error) {
        console.error('Error deleting category:', error);
      }
    }
    setShowDeleteAlert(false);
  };

  const handleCreate = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '', image: '' });
    setShowModal(true);
  };

  const handleEdit = (category: LocalCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description,
      image: category.image,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      let imagePath = formData.image;
      if (formData.image.startsWith('data:image')) {
        // Extract base64 data
        const base64Data = formData.image.split(',')[1];
        const filename = `category_${Date.now()}.png`;
        imagePath = await saveImage(filename, base64Data);
      }

      if (editingCategory) {
        // Update existing
        await updateCategory(editingCategory.id, formData.name, imagePath, 1);
        setCategories(categories.map(cat =>
          cat.id === editingCategory.id
            ? { ...cat, name: formData.name, image: imagePath }
            : cat
        ));
      } else {
        // Create new
        await createCategory(formData.name, imagePath, 1);
        // Reload categories after create
        const fetchedCategories = await fetchCategories('1');
        setCategories(fetchedCategories.map((cat: Category) => ({
          id: cat.categoryId,
          name: cat.name,
          description: '', // API doesn't provide description, so leave empty
          image: cat.image,
        })));
      }
      setShowModal(false);
    } catch (error) {
      console.error('Error saving category:', error);
      // Handle error (e.g., show toast)
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData({ ...formData, image: e.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <IonPage style={{ backgroundColor: '#f9fafb' }}>
      <IonHeader>
        <IonToolbar style={{ '--background': '#f9fafb' }}>
          <IonTitle style={{ fontSize: '22px', fontWeight: '500', color: '#333', textAlign: 'center' }}>
            Categorías Disponibles
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{ '--background': '#f9fafb' }}>
        <IonLoading isOpen={loading} message="Cargando categorías..." />
        <IonGrid style={{ padding: '16px' }}>
          <IonRow>
            {categories.map((category) => (
              <IonCol size="6" sizeMd="4" sizeLg="3" key={category.id} style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                <IonCard
                  style={{
                    width: '180px',
                    minHeight: '200px',
                    borderRadius: '16px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '20px 16px',
                    transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                  }}
                >
                  <IonImg
                    src={category.image}
                    style={{
                      width: '64px',
                      height: '64px',
                      objectFit: 'contain',
                      marginBottom: '16px',
                    }}
                  />
                  <IonCardTitle
                    style={{
                      fontSize: '16px',
                      fontWeight: '500',
                      color: '#374151',
                      textAlign: 'center',
                      margin: '0 0 20px 0',
                      lineHeight: '1.2',
                    }}
                  >
                    {category.name}
                  </IonCardTitle>
                  <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'center' }}>
                    <IonButton
                      fill="outline"
                      color="primary"
                      size="small"
                      style={{
                        '--border-radius': '8px',
                        '--padding-start': '12px',
                        '--padding-end': '12px',
                        '--padding-top': '8px',
                        '--padding-bottom': '8px',
                        '--border-color': '#3b82f6',
                        '--color': '#3b82f6',
                        flex: 1,
                        maxWidth: '60px',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(category);
                      }}
                    >
                      <IonIcon icon={pencil} style={{ fontSize: '16px' }} />
                    </IonButton>
                    <IonButton
                      fill="outline"
                      color="danger"
                      size="small"
                      style={{
                        '--border-radius': '8px',
                        '--padding-start': '12px',
                        '--padding-end': '12px',
                        '--padding-top': '8px',
                        '--padding-bottom': '8px',
                        '--border-color': '#ef4444',
                        '--color': '#ef4444',
                        flex: 1,
                        maxWidth: '60px',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(category);
                      }}
                    >
                      <IonIcon icon={trash} style={{ fontSize: '16px' }} />
                    </IonButton>
                  </div>
                </IonCard>
              </IonCol>
            ))}
          </IonRow>
        </IonGrid>

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={handleCreate}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>{editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowModal(false)}>Cancelar</IonButton>
                <IonButton onClick={handleSave}>Guardar</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <IonList>
              <IonItem>
                <IonLabel position="stacked">Nombre</IonLabel>
                <IonInput
                  value={formData.name}
                  onIonChange={(e) => setFormData({ ...formData, name: e.detail.value! })}
                  placeholder="Nombre de la categoría"
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Descripción</IonLabel>
                <IonTextarea
                  value={formData.description}
                  onIonChange={(e) => setFormData({ ...formData, description: e.detail.value! })}
                  placeholder="Descripción de la categoría"
                  rows={3}
                />
              </IonItem>
              <IonItem>
                <IonLabel>Imagen</IonLabel>
                <IonButton fill="clear" onClick={triggerFileInput}>
                  <IonIcon icon={camera} slot="start" />
                  {formData.image ? 'Cambiar imagen' : 'Seleccionar imagen'}
                </IonButton>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
              </IonItem>
              {formData.image && (
                <IonItem>
                  <IonImg src={formData.image} style={{ maxHeight: '200px', width: '100%', objectFit: 'contain' }} />
                </IonItem>
              )}
            </IonList>
          </IonContent>
        </IonModal>

        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header="Confirmar eliminación"
          message={`¿Estás seguro de que quieres eliminar la categoría ${selectedCategory?.name}?`}
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
    </IonPage>
  );
};

export default CategoriesPage;
