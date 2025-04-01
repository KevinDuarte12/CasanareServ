import { Model, DataTypes } from 'sequelize';
import sequelize from '../conection';

interface CategoryAttributes {
  id_category?: number;
  name: string;
  description?: string;
  image?: string;
  status?: boolean;
}

const Category = sequelize.define<Model<CategoryAttributes>>('categories', {
  id_category: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  image: {
    type: DataTypes.STRING(255)
  },
  status: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'categories',
  timestamps: true
});

export default Category;