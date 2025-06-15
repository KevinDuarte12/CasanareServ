import { Model, DataTypes } from 'sequelize';
import sequelize from '../conection';
import Image from './image'; // Para relación con imágenes
/**
 * Estructura de datos para categorías de productos
 * Define los campos necesarios para clasificar productos en la plataforma
 */
interface CategoryAttributes {
  id_category?: number; // ID único de la categoría
  name: string; // Nombre de la categoría (requerido)
  description?: string; // Descripción detallada (opcional)
  image?: string; // URL o path de imagen principal (opcional)
  status?: boolean; // Estado activo/inactivo de la categoría
}
/**
 * Modelo de Categorías
 * Gestiona la clasificación y organización de productos
 */
const Category = sequelize.define<Model<CategoryAttributes>>('categories', {
  // Clave primaria
  id_category: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true // Se incrementa automáticamente
  },
  // Nombre de la categoría
  name: {
    type: DataTypes.STRING(50), // Máximo 50 caracteres
    allowNull: false // Campo obligatorio
  },
  // Descripción detallada de la categoría
  description: {
    type: DataTypes.TEXT, // Texto largo para descripciones extensas
    allowNull: true // Campo opcional
  },
  // Imagen principal de la categoría
  image: {
    type: DataTypes.STRING(255), // URL o path de imagen (máximo 255 chars)
    allowNull: true // Campo opcional
  },
  // Estado de la categoría
  status: {
    type: DataTypes.BOOLEAN,
    defaultValue: true // Por defecto las categorías están activas
  }
}, {
  tableName: 'categories', // Nombre explícito de la tabla
  timestamps: true // Habilita createdAt y updatedAt automáticos
});
export default Category;