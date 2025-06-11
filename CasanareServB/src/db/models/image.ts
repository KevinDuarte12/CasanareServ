import { Model, DataTypes } from 'sequelize';
import sequelize from '../conection';
import User from './user';
import Product from './product';
import Category from './category';
// TODO: Importar Barter cuando esté disponible
/**
 * Estructura de datos para imágenes del sistema
 * Define los campos necesarios para gestionar archivos multimedia
 */
export interface ImageAttributes {
  id?: number; // ID único de la imagen
  url: string; // URL completa de la imagen (requerido)
  public_id?: string; // ID público de Cloudinary (opcional)
  entity_type: 'user' | 'product' | 'category' | 'barter' | 'rating'; // Tipo de entidad relacionada
  entity_id?: number; // ID de la entidad relacionada
  is_main: boolean; // Si es la imagen principal de la entidad
  createdAt?: Date; // Fecha de creación automática
  updatedAt?: Date; // Fecha de actualización automática
  alt_text?: string; // Texto alternativo para accesibilidad
}
/**
 * Modelo de Imágenes
 * Sistema polimórfico para gestionar imágenes de cualquier entidad
 */
class Image extends Model<ImageAttributes> {
  // Identificador único
  declare id: number;
  // Información de la imagen
  declare url: string; // URL completa de la imagen
  declare public_id: string | null; // ID de Cloudinary para eliminación
  // Relación polimórfica
  declare entity_type: 'user' | 'product' | 'category' | 'barter' | 'rating'; // Tipo de entidad
  declare entity_id: number; // ID de la entidad relacionada
  // Control y metadatos
  declare is_main: boolean; // Si es imagen principal
  declare alt_text: string | null; // Texto alternativo para SEO/accesibilidad
  // Timestamps automáticos
  declare createdAt: Date;
  declare updatedAt: Date;
}
// Configuración del modelo en la base de datos
Image.init({
  // Clave primaria
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true // Se incrementa automáticamente
  },
  // URL de la imagen
  url: {
    type: DataTypes.STRING, // URL completa del archivo
    allowNull: false // Campo obligatorio
  },
  // ID de Cloudinary para gestión
  public_id: {
    type: DataTypes.STRING, // ID único en el servicio de imágenes
    allowNull: true // Opcional (para URLs externas)
  }, 
  // Sistema polimórfico: tipo de entidad
  entity_type: {
    type: DataTypes.ENUM('user', 'product', 'category', 'barter', 'rating'), // Tipos válidos
    allowNull: false // Siempre debe especificar el tipo
  },
  // Sistema polimórfico: ID de la entidad
  entity_id: {
    type: DataTypes.INTEGER, // ID de la entidad relacionada
    allowNull: false // Siempre debe tener una entidad asociada
  },
  // Control de imagen principal
  is_main: {
    type: DataTypes.BOOLEAN,
    defaultValue: false // Por defecto no es imagen principal
  },
  
  // Texto alternativo para accesibilidad
  alt_text: {
    type: DataTypes.STRING(255), // Máximo 255 caracteres
    allowNull: true // Campo opcional
  }
}, {
  sequelize,
  modelName: 'images', // Nombre del modelo
  tableName: 'images', // Nombre explícito de la tabla
  timestamps: true, // Habilita createdAt y updatedAt automáticos
  
  // Índices para optimización
  indexes: [
    {
      name: 'idx_images_entity', // Búsquedas por entidad
      fields: ['entity_type', 'entity_id']
    },
    {
      name: 'idx_images_main', // Búsquedas de imagen principal
      fields: ['entity_type', 'entity_id', 'is_main']
    },
    {
      name: 'idx_images_public_id', // Búsquedas por Cloudinary ID
      fields: ['public_id']
    }
  ]
});
export default Image;