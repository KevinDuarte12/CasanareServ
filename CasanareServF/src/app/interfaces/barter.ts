export interface Barter {
  id_barter?: number;
  id_prod_offer: number;
  id_prod_request: number;
  id_user_offer: number;
  id_user_receiving: number;
  value?: number;
  status?: "pendiente" | "aceptado" | "rechazado" | "completado" | "disponible" | "aprobado_admin" | string;
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
  id_prod_offer: number;
  id_prod_request: number;
  id_user_offer: number;
  id_user_receiving: number;
  status: "pendiente" | "aceptado" | "rechazado" | "completado" | "disponible" | "aprobado_admin";
  notes?: string;
  value?: number;
}

// Agrega esta interfaz adicional para el otro caso de uso
export interface BarterProposalRequest {
  id_user_offer: number;
  id_user_receiving?: number;
  id_prod_request?: number;
  id_prod_offer?: number;
  notes?: string;
  value?: number;
  useExistingProduct?: boolean;
  status?: 'pendiente' | 'aceptado' | 'rechazado' | 'completado' | 'disponible' | 'aprobado_admin';
  productOffer?: {
    name: string;
    description: string;
    value: number;
    type?: string;
    images?: string[];
  };
}