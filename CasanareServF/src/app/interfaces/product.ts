import { Category } from './category';
import { user } from './user';
import { Image } from './image';

export interface Product {
  id_product?: number;
  id_user: number;
  id_category: number;
  name: string;
  stock: number;
  description?: string;
  price: number;
  status?: 'disponible' | 'vendido' | 'inactivo' | 'en_trueque';
  type?: 'regular' | 'barter';  // Solo mantener type, eliminar permite_trueque
  createdAt?: Date;
  updatedAt?: Date;
  category?: Category;
  user?: user;
  images?: Image[];
  productImages?: Image[]; // Añadir esta propiedad para compatibilidad
  img_url?: string;
}