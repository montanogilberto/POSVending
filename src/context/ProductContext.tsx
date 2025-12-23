
import React, { createContext, useContext, useState, useCallback } from 'react';
import { Product } from '../data/type_products';
import { getAllProducts, getOneProduct, createOrUpdateProduct, deleteProduct, CreateProductRequest, GetOneProductRequest, DeleteProductRequest } from '../api/productsApi';

interface ProductContextType {
  productsList: Product[];
  productsDetail: Product | null;
  loading: boolean;
  error: string | null;
  setProductsList: (products: Product[]) => void;
  setProductsDetail: (product: Product | null) => void;
  clearProductsList: () => void;
  clearProductsDetail: () => void;
  clearAllProducts: () => void;
  fetchProducts: () => Promise<void>;
  fetchProductById: (productId: number) => Promise<void>;
  createProduct: (productData: Omit<Product, 'productId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProduct: (productId: number, productData: Partial<Product>) => Promise<void>;
  removeProduct: (productId: number) => Promise<void>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [productsDetail, setProductsDetail] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearProductsList = () => setProductsList([]);
  const clearProductsDetail = () => setProductsDetail(null);
  const clearAllProducts = () => {
    clearProductsList();
    clearProductsDetail();
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const products = await getAllProducts();
      setProductsList(products);
    } catch (err) {
      setError('Failed to fetch products');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProductById = async (productId: number) => {
    setLoading(true);
    setError(null);
    try {
      const request: GetOneProductRequest = { products: [{ productId }] };
      const products = await getOneProduct(request);
      if (products.length > 0) {
        setProductsDetail(products[0]);
      } else {
        setError('Product not found');
      }
    } catch (err) {
      setError('Failed to fetch product');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createProduct = async (productData: Omit<Product, 'productId' | 'createdAt' | 'updatedAt'>) => {
    setLoading(true);
    setError(null);
    try {
      const request: CreateProductRequest = {
        products: [{
          productId: 0, // Assuming 0 for new products
          name: productData.name,
          code: productData.code,
          dateOfExpire: productData.dateOfExpire,
          productFormId: productData.productFormId,
          manufactureId: productData.manufactureId,
          description: productData.description,
          barCode: productData.barCode,
          categoryId: productData.categoryId,
          companyId: productData.companyId,
          action: '1' // Create
        }]
      };
      await createOrUpdateProduct(request);
      await fetchProducts(); // Refresh list
    } catch (err) {
      setError('Failed to create product');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateProduct = async (productId: number, productData: Partial<Product>) => {
    setLoading(true);
    setError(null);
    try {
      const request: CreateProductRequest = {
        products: [{
          productId,
          name: productData.name || '',
          code: productData.code || '',
          dateOfExpire: productData.dateOfExpire || '',
          productFormId: productData.productFormId || 0,
          manufactureId: productData.manufactureId || 0,
          description: productData.description || '',
          barCode: productData.barCode || '',
          categoryId: productData.categoryId || 0,
          companyId: productData.companyId || 0,
          action: '2' // Update
        }]
      };
      await createOrUpdateProduct(request);
      await fetchProducts(); // Refresh list
      if (productsDetail && productsDetail.productId === productId) {
        await fetchProductById(productId); // Refresh detail if it's the current one
      }
    } catch (err) {
      setError('Failed to update product');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const removeProduct = async (productId: number) => {
    setLoading(true);
    setError(null);
    try {
      const request: DeleteProductRequest = { products: [{ productId }] };
      await deleteProduct(request);
      setProductsList(productsList.filter(p => p.productId !== productId));
      if (productsDetail && productsDetail.productId === productId) {
        setProductsDetail(null);
      }
    } catch (err) {
      setError('Failed to delete product');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProductContext.Provider value={{
      productsList,
      productsDetail,
      loading,
      error,
      setProductsList,
      setProductsDetail,
      clearProductsList,
      clearProductsDetail,
      clearAllProducts,
      fetchProducts,
      fetchProductById,
      createProduct,
      updateProduct,
      removeProduct
    }}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProduct = (): ProductContextType => {
  const context = useContext(ProductContext);
  if (!context) throw new Error('useProduct must be used within ProductProvider');
  return context;
};
