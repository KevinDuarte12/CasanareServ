import { Model, DataTypes } from 'sequelize';
import sequelize from '../conection'; 
import User from './user';
import Product from './product';
import Category from './category';
// Importar Barter si existe

export interface ImageAttributes {
  id?: number;
  url: string;
  public_id?: string;
  entity_type: 'user' | 'product' | 'category' | 'barter';
  entity_id?: number;
  is_main: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

class Image extends Model<ImageAttributes> {
  declare id: number;
  declare url: string;
  declare public_id: string | null;
  declare entity_type: 'user' | 'product' | 'category' | 'barter';
  declare entity_id: number;
  declare is_main: boolean;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Image.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  url: {
    type: DataTypes.STRING,
    allowNull: false
  },
  public_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  entity_type: {
    type: DataTypes.ENUM('user', 'product', 'category', 'barter'),
    allowNull: false
  },
  entity_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  is_main: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  sequelize,
  modelName: 'images',
  tableName: 'images',
  timestamps: true
});

// Definir relaciones polimórficas



// Relación con Product


// Relación con Category

// Relación con Barter si existe
// Image.belongsTo(Barter, {
//   foreignKey: 'entity_id',
//   constraints: false,
//   as: 'barter',
//   scope: {
//     entity_type: 'barter'
//   }
// });

// Índices para mejorar rendimiento en consultas comunes
// sequelize.getQueryInterface().addIndex('images', ['entity_type', 'entity_id']);
// sequelize.getQueryInterface().addIndex('images', ['is_main', 'entity_type', 'entity_id']);

export default Image;