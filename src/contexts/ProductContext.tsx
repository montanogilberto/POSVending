
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Product } from '../data/type_products';
import { getProductsByCompany, getOneProduct, createOrUpdateProduct, setProductActive as setProductActiveApi, CreateProductRequest, GetOneProductRequest, ProductListOptions } from '../api/productsApi';
import { useUser } from './UserContext';

type CreateProductInput = Omit<Product, 'productId' | 'createdAt' | 'updatedAt'> & {
  productForm?: any;
  productDetails?: any;
  productDescriptions?: any[];
  productOptions?: any[];
};

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
  /** options are remembered: the refresh after a create/update/deactivate reuses them. */
  fetchProducts: (options?: ProductListOptions) => Promise<void>;
  fetchProductById: (productId: number) => Promise<void>;
  createProduct: (productData: CreateProductInput) => Promise<number | null>;
  updateProduct: (productId: number, productData: Partial<Product>) => Promise<void>;
  /** false = soft delete (isActive = 0), true = reactivate. */
  setProductActive: (productId: number, active: boolean) => Promise<void>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { companyId } = useUser();
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [productsDetail, setProductsDetail] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listOptionsRef = useRef<ProductListOptions>({});

  const clearProductsList = () => setProductsList([]);
  const clearProductsDetail = () => setProductsDetail(null);
  const clearAllProducts = () => {
    clearProductsList();
    clearProductsDetail();
  };

  const fetchProducts = useCallback(async (options?: ProductListOptions) => {
    if (options) listOptionsRef.current = options;
    const normalizedCompanyId = Number(companyId);

    if (!Number.isFinite(normalizedCompanyId) || normalizedCompanyId <= 0) {
      setProductsList([]);
      setError('No valid company selected');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const products = await getProductsByCompany(normalizedCompanyId, listOptionsRef.current);
      const normalizedProducts = (products ?? []).map((p: any) => {
        const resolvedProductId = Number(p?.productId ?? p?.id ?? 0);
        return {
          ...p,
          productId: Number.isFinite(resolvedProductId) && resolvedProductId > 0 ? resolvedProductId : p?.productId,
        } as Product;
      });
      setProductsList(normalizedProducts);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch products';
      setError(message);
      console.error('[ProductContext.fetchProducts] Failed to fetch products', {
        companyId,
        normalizedCompanyId,
        error: err,
      });
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const fetchProductById = async (productId: number) => {
    const normalizedProductId = Number(productId);

    if (!Number.isFinite(normalizedProductId) || normalizedProductId <= 0) {
      setError('Invalid product identifier');
      console.warn('[ProductContext.fetchProductById] Invalid productId', { productId });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const request: GetOneProductRequest = { products: [{ productId: normalizedProductId }] };
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

  const createProduct = async (productData: CreateProductInput) => {
    setLoading(true);
    setError(null);
    try {
      const request: CreateProductRequest = {
        products: [{
          action: 1,
          productId: null,
          companyId: Number(productData.companyId || companyId),
          categoryId: Number(productData.categoryId || 0),
          name: productData.name,
          barCode: productData.barCode || '',
          code: productData.code,
          dateOfExpire: productData.dateOfExpire || null,
          noExpire: Boolean((productData as any).noExpire),
          netContent: (productData as any).netContent ?? null,
          unitOfMeasure: (productData as any).unitOfMeasure ?? null,
          referencePrice: (productData as any).referencePrice ?? null,
          imageUrl: (productData as any).imageUrl ?? null,
          manufactureId: productData.manufactureId ?? null,
          description: productData.description || '',
          productFormId: productData.productFormId || 0,
          productForm: (productData as any).productForm ?? undefined,
          productDetails: (productData as any).productDetails ?? undefined,
          productDescriptions: (productData as any).productDescriptions ?? [],
          productOptions: (productData as any).productOptions ?? [],
        }]
      };
      const response = await createOrUpdateProduct(request);
      await fetchProducts(); // Refresh list
      const newProductId = Number(response?.result?.[0]?.value);
      return Number.isFinite(newProductId) && newProductId > 0 ? newProductId : null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create product';
      setError(message);
      console.error('[ProductContext.createProduct] Failed to create product', {
        requestCompanyId: Number(productData.companyId || companyId),
        requestCategoryId: Number(productData.categoryId || 0),
        error: err,
      });
      throw err;
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
          action: '2',
          productId,
          companyId: Number(productData.companyId || companyId),
          categoryId: Number(productData.categoryId || 0),
          name: productData.name || '',
          barCode: productData.barCode || '',
          code: productData.code || '',
          dateOfExpire: productData.dateOfExpire || null,
          noExpire: Boolean((productData as any).noExpire),
          netContent: (productData as any).netContent ?? null,
          unitOfMeasure: (productData as any).unitOfMeasure ?? null,
          referencePrice: (productData as any).referencePrice ?? null,
          imageUrl: (productData as any).imageUrl ?? null,
          manufactureId: productData.manufactureId ?? null,
          description: productData.description || '',
          productFormId: productData.productFormId || 0,
          productForm: (productData as any).productForm ?? undefined,
          productDetails: (productData as any).productDetails ?? undefined,
          productDescriptions: (productData as any).productDescriptions ?? [],
          productOptions: (productData as any).productOptions ?? [],
        }]
      };

      await createOrUpdateProduct(request);
      await fetchProducts();
      if (productsDetail && productsDetail.productId === productId) {
        await fetchProductById(productId);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update product';
      setError(message);
      console.error('[ProductContext.updateProduct] Failed to update product', {
        productId,
        requestCompanyId: Number(productData.companyId || companyId),
        requestCategoryId: Number(productData.categoryId || 0),
        error: err,
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const setProductActive = async (productId: number, active: boolean) => {
    setLoading(true);
    setError(null);
    try {
      await setProductActiveApi({ productId, companyId: Number(companyId), active });
      await fetchProducts();
      if (productsDetail && productsDetail.productId === productId) {
        setProductsDetail(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to change product status';
      setError(message);
      console.error('[ProductContext.setProductActive] Failed', { productId, active, error: err });
      throw err;
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
      setProductActive
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
