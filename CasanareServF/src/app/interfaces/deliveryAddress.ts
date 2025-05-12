// Interfaz para direcciones de entrega que coincida con tu modelo backend
// Asegurarse de que la interfaz tenga todos los campos requeridos

export interface DeliveryAddress {
  id?: number;
  user_id?: number;
  name: string; // Tipo de dirección (casa, apartamento, etc.)
  recipient_name: string;
  recipient_phone: string;
  address_line1: string; // Cambiado de address a address_line1
  address_line2?: string;
  neighborhood?: string;
  city: string;
  department: string; // Usar department en vez de state
  postal_code?: string;
  additional_instructions?: string;
  is_default?: boolean;
}
