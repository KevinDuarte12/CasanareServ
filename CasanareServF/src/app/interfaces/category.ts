// Interfaz para las imágenes de categoría
export interface CategoryImage {
    id: number;
    url: string;
    public_id?: string;
    entity_type: string;
    entity_id: number;
    is_main: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface Category {
    id_category?: number; // Identificador único de la categoría
    name: string; // Nombre de la categoría
    description?: string; // Descripción de la categoría, opcional
    image?: string; // Ruta de imagen directa, opcional
    status?: boolean; // Estado de la categoría, opcional
    createdAt?: Date; // Fecha de creación, opcional
    updatedAt?: Date; // Fecha de actualización, opcional
    images?: CategoryImage[]; // Array de imágenes, opcional (del backend)
    categoryImages?: CategoryImage[]; // Alias alternativo (por compatibilidad)
    productCount?: number; // Conteo de productos, opcional
}