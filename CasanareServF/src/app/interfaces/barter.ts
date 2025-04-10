import { Product } from '../interfaces/product';
import { user } from '../interfaces/user';

export interface Barter {
  id_barter?: number;
  id_prod_offer: number;
  id_prod_request: number;
  id_user_offer: number;
  id_user_receiving: number;
  status?: 'pendiente' | 'aceptado' | 'rechazado' | 'completado'; // usar status, no estado
  value?: number; // usar value, no valor
  request_date?: Date; // usar request_date, no fecha_solicitud
  resolution_date?: Date; // usar resolution_date, no fecha_resolucion
  offered_product?: Product;  
  requested_product?: Product; 
  offering_user?: user;      
  receiving_user?: user;  
  createdAt?: Date;
  updatedAt?: Date;
}