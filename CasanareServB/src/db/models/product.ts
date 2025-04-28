import { Model, DataTypes } from 'sequelize';
import sequelize from '../conection';
import User from './user';
import Category from './category';
import ItemCart from './itemcart';
import Image from './image';

interface ProductAttributes {
  id_product?: number;
  id_user: number;
  id_category: number;
  name: string;
  stock: number;
  description?: string;
  price: number;
  status?: 'disponible' | 'vendido' | 'en_trueque' | 'inactivo';
  active?: boolean;
  image?: string;
  type?: 'regular' | 'barter';
  // Añadir esta línea para las imágenes
  productImages?: any[];
}

const Product = sequelize.define<Model<ProductAttributes>>('products', {
  id_product: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  id_user: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  id_category: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Category,
      key: 'id_category'
    }
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  stock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  description: {
    type: DataTypes.TEXT
  },
  price: {
    type: DataTypes.DECIMAL(10,2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('disponible', 'vendido', 'en_trueque', 'inactivo'),
    defaultValue: 'disponible'
  },
  type: {
    type: DataTypes.ENUM('regular', 'barter'),
    defaultValue: 'regular'
  }
}, {
  tableName: 'products',
  timestamps: true
});

// Mantener todas las relaciones existentes
//  Product.hasMany(Image, {
//    foreignKey: 'entity_id',
//    constraints: false,
//    scope: {
//      entity_type: 'product'
//    }
//  });

export default Product;