export interface Barter {
  id_barter?: number;
  id_prod_offer: number;
  id_prod_request: number;
  id_user_offer: number;
  id_user_receiving: number;
  value?: number;
  status: 'pendiente' | 'aceptado' | 'rechazado' | 'completado';
  request_date: string | Date;
  resolution_date?: string | Date;
  notes?: string;
  
  // Relaciones que vienen incluidas desde el backend
  offered_product?: {
    id_product: number;
    name: string;
    price: number;
    description: string;
    id_category?: number;  // Añadir categoría
  };
  
  requested_product?: {
    id_product: number;
    name: string;
    price: number;
    description: string;
    id_category?: number;  // Añadir categoría
  };
  
  offering_user?: {
    id: number;
    name: string;
    email: string;
  };
  
  receiving_user?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface BarterRequest {
  productOffer: {
    name: string;
    description: string;
    value: number;
    type?: string;    // Añadir esta propiedad
    images?: string[]; // Añadir esta propiedad
  };
  id_prod_request: number;
  id_user_offer: number;
  id_user_receiving: number;
  notes?: string;
  useExistingProduct?: boolean;
  id_prod_offer?: number;
  mode?: string;      // Añadir esta propiedad
}