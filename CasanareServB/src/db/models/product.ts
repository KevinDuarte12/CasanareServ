import { Model, DataTypes } from 'sequelize';
import sequelize from '../conection';
import User from './user';
import Category from './category';
import ItemCart from './itemcart';
import Image from './image';
/**
 * Estructura de datos para productos del sistema
 * Define los campos necesarios para gestionar productos en la plataforma
 */
interface ProductAttributes {
  id_product?: number; // ID único del producto
  id_user: number; // Usuario propietario del producto
  id_category: number; // Categoría del producto
  name: string; // Nombre del producto (requerido)
  stock: number; // Cantidad disponible en inventario
  description?: string; // Descripción detallada (opcional)
  price: number; // Precio del producto
  status?: 'disponible' | 'vendido' | 'en_trueque' | 'inactivo' | 'pendiente'; // Estado del producto
  active?: boolean; // Si el producto está activo
  image?: string; // URL de imagen principal (opcional)
  type?: 'regular' | 'barter'; // Tipo de producto (venta o trueque)
  productImages?: any[]; // Array de imágenes adicionales
  admin_approved?: boolean; // Si fue aprobado por administrador
  has_pending_barters?: boolean; // Si tiene trueques pendientes
}
/**
 * Modelo de Productos
 * Gestiona todos los productos disponibles en la plataforma para venta y trueques
 */
class Product extends Model<ProductAttributes> {
  // Identificadores principales
  public id_product!: number;
  public id_user!: number;
  public id_category!: number;
  
  // Información básica del producto
  public name!: string;
  public stock!: number;
  public description?: string;
  public price!: number;
  
  // Control de estado
  public status!: 'disponible' | 'vendido' | 'en_trueque' | 'inactivo' | 'pendiente';
  public active?: boolean;
  public type!: 'regular' | 'barter';
  
  // Control administrativo
  public admin_approved!: boolean;
  public has_pending_barters!: boolean;
  
  // Multimedia
  public image?: string;
  public productImages?: any[];
  
  // Timestamps automáticos
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// Configuración del modelo en la base de datos
Product.init({
  // Clave primaria
  id_product: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true // Se incrementa automáticamente
  },
  
  // Usuario propietario del producto
  id_user: {
    type: DataTypes.INTEGER,
    allowNull: false, // Siempre debe tener un propietario
    references: {
      model: User, // Relaciona con modelo User
      key: 'id'
    }
  },
  
  // Categoría del producto
  id_category: {
    type: DataTypes.INTEGER,
    allowNull: false, // Siempre debe tener una categoría
    references: {
      model: Category, // Relaciona con modelo Category
      key: 'id_category'
    }
  },
  
  // Nombre del producto
  name: {
    type: DataTypes.STRING(100), // Máximo 100 caracteres
    allowNull: false // Campo obligatorio
  },
  
  // Control de inventario
  stock: {
    type: DataTypes.INTEGER,
    allowNull: false, // Campo obligatorio
    defaultValue: 0, // Por defecto sin stock
    validate: {
      min: 0 // No puede ser negativo
    }
  },
  
  // Descripción detallada
  description: {
    type: DataTypes.TEXT // Texto largo para descripciones extensas
  },
  
  // Precio del producto
  price: {
    type: DataTypes.DECIMAL(10,2), // Hasta 99,999,999.99
    allowNull: false // Campo obligatorio
  },
  
  // Estado del producto con valores predefinidos
  status: {
    type: DataTypes.ENUM('disponible', 'vendido', 'en_trueque', 'inactivo', 'pendiente'),
    defaultValue: 'disponible' // Por defecto disponible
  },
  
  // Tipo de producto
  type: {
    type: DataTypes.ENUM('regular', 'barter'),
    defaultValue: 'regular' // Por defecto producto regular (venta)
  },
  
  // Control de aprobación administrativa
  admin_approved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false, // Por defecto no aprobado
    allowNull: false // Campo obligatorio
  },
  
  // Control de trueques pendientes
  has_pending_barters: {
    type: DataTypes.BOOLEAN,
    defaultValue: false, // Por defecto sin trueques pendientes
    allowNull: false // Campo obligatorio
  }
}, {
  sequelize,
  tableName: 'products', // Nombre explícito de la tabla
  modelName: 'product', // Nombre del modelo en Sequelize
  timestamps: true, // Habilita createdAt y updatedAt automáticos
  
  // Índices para optimización
  indexes: [
    {
      name: 'idx_products_user', // Búsquedas por usuario
      fields: ['id_user']
    },
    {
      name: 'idx_products_category', // Búsquedas por categoría
      fields: ['id_category']
    },
    {
      name: 'idx_products_status', // Filtros por estado
      fields: ['status']
    },
    {
      name: 'idx_products_type', // Filtros por tipo
      fields: ['type']
    },
    {
      name: 'idx_products_approved', // Productos aprobados
      fields: ['admin_approved', 'status']
    }
  ]
});

export default Product;