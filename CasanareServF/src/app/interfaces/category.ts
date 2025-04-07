export interface Category {
    id_category?: number; // Propiedad que representa el identificador único de la categoría (número)
    name: string; // Propiedad que representa el nombre de la categoría (cadena de texto)
    description?: string; // Propiedad que representa la descripción de la categoría (cadena de texto, opcional)
    image?: string; // Propiedad que representa la imagen de la categoría (cadena de texto, opcional)
    status?: boolean; // Propiedad que indica si la categoría está activa o no (booleano, opcional)
    createdAt?: Date; // Propiedad que representa la fecha de creación de la categoría (fecha, opcional)
    updatedAt?: Date; // Propiedad que representa la fecha de actualización de la categoría (fecha, opcional)
}