export interface Category {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  order: number;
  children?: Category[];
  products?: any[];
}

export interface Badge {
  id: number;
  label: string;
  textColor: string;
  bgColor: string;
  order: number;
}

export interface ProductImage {
  id: number;
  productId: number;
  url: string;
  order: number;
  isMain: boolean;
}

export interface ProductBadge {
  productId: number;
  badgeId: number;
  badge?: Badge;
}

export interface CompositeChild {
  id: number;
  parentId: number;
  childId: number;
  quantity: number;
  child?: Product;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  basePrice: number;
  discountPercent: number;
  type: 'simple' | 'composite';
  status: 'draft' | 'active' | 'archived';
  categoryId: number | null;
  category?: Category;
  images: ProductImage[];
  badges: ProductBadge[];
  compositeItems: CompositeChild[];
  stockQuantity: number;
  recommendedAge: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListItem {
  id: number;
  name: string;
  slug: string;
  shortDescription: string | null;
  basePrice: number;
  discountPercent: number;
  type: 'simple' | 'composite';
  mainImage: { id: number; url: string } | null;
  badges: Badge[];
  category?: { id: number; name: string; slug: string };
  stockQuantity: number;
  recommendedAge: string | null;
  createdAt?: string;
}

export interface CartItemType {
  id: number;
  productId: number;
  product: ProductListItem;
  quantity: number;
}

export interface CatalogOrderType {
  id: number;
  totalAmount: number;
  discount: number | null;
  promoCodeId: number | null;
  status: string;
  contactName: string;
  contactPhone: string | null;
  contactEmail: string | null;
  contactTelegram: string | null;
  deliveryMethod: string | null;
  deliveryCity: string | null;
  deliveryAddress: string | null;
  deliveryIndex: string | null;
  comment: string | null;
  items: OrderItemType[];
  createdAt: string;
}

export interface OrderItemType {
  id: number;
  productId: number;
  productName: string;
  productPrice: number;
  quantity: number;
  compositeItems: any[] | null;
}

export interface ProductsQueryParams {
  category?: string;
  search?: string;
  badges?: string;
  age?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: 'newest' | 'price-asc' | 'price-desc';
  page?: string;
  limit?: string;
}
