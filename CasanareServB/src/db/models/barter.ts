import { DataTypes, Model } from 'sequelize';
import sequelize from '../conection';
import Product from './product';
import User from './user';

class Barter extends Model {
  // Propiedades del modelo
}

Barter.init({
  id_barter: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  id_prod_offer: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'products',
      key: 'id_product'
    }
  },
  id_prod_request: {
    type: DataTypes.INTEGER,
    allowNull: true, // Cambiar a true para permitir null
    references: {
      model: 'products',
      key: 'id_product'
    }
  },
  id_user_offer: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  id_user_receiving: {
    type: DataTypes.INTEGER,
    allowNull: true, // Cambiar a true para permitir null
    references: {
      model: 'users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('pendiente', 'aceptado', 'rechazado', 'completado', 'disponible'), // Agregar 'disponible'
    defaultValue: 'pendiente'
  },
  value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  request_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  resolution_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'barter',
  tableName: 'barters'
});

// IMPORTANTE: Definir las asociaciones SOLO UNA VEZ aquí
Barter.belongsTo(Product, { foreignKey: 'id_prod_offer', as: 'offered_product' });
Barter.belongsTo(Product, { foreignKey: 'id_prod_request', as: 'requested_product' });
Barter.belongsTo(User, { foreignKey: 'id_user_offer', as: 'offering_user' });
Barter.belongsTo(User, { foreignKey: 'id_user_receiving', as: 'receiving_user' });

export default Barter;