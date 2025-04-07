// Ajusta esto según la estructura de datos que devuelve tu API
export interface user {
  id?: number;
  name?: string;
  email?: string;
  rol?: string;
  isVerified?: boolean;
  estado?: boolean;
  password?: string;
}