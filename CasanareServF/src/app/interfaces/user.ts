// Define una interfaz llamada "user"
export interface user {
    id?: number; // Propiedad que representa el ID del usuario (número entero)
    name?: string;
    password: string; // Propiedad que representa la contraseña del usuario (cadena de texto)
    email?: string; // Propiedad que representa el correo electrónico del usuario (cadena de texto)
  }