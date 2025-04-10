import { Category } from './category';
import { user } from '../interfaces/user';

export interface Product {
  id_product?: number;
  id_user: number;
  id_category: number;
  name: string;
  stock: number;
  description?: string;
  price: number;
  status?: 'disponible' | 'vendido' | 'en_trueque';
  permite_trueque?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  category?: Category;
  user?: user;
}