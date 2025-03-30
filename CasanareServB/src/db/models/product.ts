import { Model, DataTypes } from 'sequelize';
import sequelize from '../conection';
import User from './user';
import Category from './category';

interface ProductAttributes {
  id_product?: number;
  id_user: number;
  id_category: number;
  name: string;
  description?: string;
  price: number;
  status?: 'disponible' | 'vendido' | 'en_trueque';
  allows_barter?: boolean;
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
  description: {
    type: DataTypes.TEXT
  },
  price: {
    type: DataTypes.DECIMAL(10,2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('disponible', 'vendido', 'en_trueque'),
    defaultValue: 'disponible'
  },
  allows_barter: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'products',
  timestamps: true
});

Product.belongsTo(User, { foreignKey: 'id_user', as: 'user' });
Product.belongsTo(Category, { foreignKey: 'id_category', as: 'category' });

export default Product;