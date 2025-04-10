import { Product } from './product';

export interface CartItem {
  id_item?: number;
  id_cart: number;
  id_product: number;       // ID del producto (número)
  quantity: number;
  unit_price: number;
  product?: Product;        // Objeto producto relacionado (renombrado)
}

export interface Cart {
  id_cart?: number;
  id_user: number;
  status: 'activo' | 'comprado' | 'abandonado';
  createdAt?: Date;
  items?: CartItem[];
}