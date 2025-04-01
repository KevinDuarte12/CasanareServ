// Define una interfaz llamada "product"
export interface product {
    id?: number; // Propiedad que representa el identificador único del producto (número)
    name: string; // Propiedad que representa el nombre del producto (cadena de texto)
    description: string; // Propiedad que representa la descripción del producto (cadena de texto)
    price: number; // Propiedad que representa el precio del producto (número)
    stock: number; // Propiedad que representa la cantidad en stock del producto (número)
  }