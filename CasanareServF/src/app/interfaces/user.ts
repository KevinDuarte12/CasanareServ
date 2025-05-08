import { Image } from './image';

// Ajusta esto según la estructura de datos que devuelve tu API
export interface user {
  id?: number;
  name?: string;
  email?: string;
  rol?: string;
  isVerified?: boolean;
  estado?: boolean;
  password?: string;
  profileImage?: string | null;
  userImages?: Image[]; // Usa la interfaz Image actualizada
  // Nuevos campos
  document_type?: string;
  document_number?: string;
  department?: string;
  city?: string;
  phone?: string;
}

// Asegurar que la interfaz Image esté disponible para las imágenes de perfil
