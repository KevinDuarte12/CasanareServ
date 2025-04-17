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
}

// Asegurar que la interfaz Image esté disponible para las imágenes de perfil
