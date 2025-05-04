import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../conection';
import Product from './product';
import User from './user';

// Define una interfaz para los atributos de Barter
interface BarterAttributes {
  id_barter?: number;
  id_prod_offer: number;
  id_prod_request?: number | null;
  id_user_offer: number;
  id_user_receiving?: number | null;
  status: 'pendiente' | 'aceptado' | 'rechazado' | 'completado' | 'disponible' | 'aprobado_admin';
  value?: number | null;
  request_date: Date;
  resolution_date?: Date | null;
  notes?: string | null;
}

// Interfaz para la creación (algunos campos son opcionales en creación)
interface BarterCreationAttributes extends Optional<BarterAttributes, 'id_barter' | 'request_date'> {}

// Aquí usamos una solución con intersección de tipos para las asociaciones
type BarterInstance = Model<BarterAttributes, BarterCreationAttributes> & BarterAttributes & {
  readonly offered_product?: ReturnType<typeof Product.build>;
  readonly requested_product?: ReturnType<typeof Product.build>;
  readonly offering_user?: ReturnType<typeof User.build>;
  readonly receiving_user?: ReturnType<typeof User.build>;
}

// Extender la clase Model con la interfaz de atributos
class Barter extends Model<BarterAttributes, BarterCreationAttributes> implements BarterAttributes {
  // Declarar explícitamente las propiedades para que TypeScript las reconozca
  public id_barter!: number;
  public id_prod_offer!: number;
  public id_prod_request?: number | null;
  public id_user_offer!: number;
  public id_user_receiving?: number | null;
  public status!: 'pendiente' | 'aceptado' | 'rechazado' | 'completado' | 'disponible' | 'aprobado_admin';
  public value?: number | null;
  public request_date!: Date;
  public resolution_date?: Date | null;
  public notes?: string | null;
  
  // Timestamps que Sequelize agrega automáticamente
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Las propiedades de asociación están definidas en el tipo BarterInstance
  // No las declaramos directamente en la clase para evitar errores de tipo
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
    allowNull: true,
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
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('pendiente', 'aceptado', 'rechazado', 'completado', 'disponible', 'aprobado_admin'),
    defaultValue: 'pendiente'
  },
  value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  request_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
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

// Definir las asociaciones
Barter.belongsTo(Product, { foreignKey: 'id_prod_offer', as: 'offered_product' });
Barter.belongsTo(Product, { foreignKey: 'id_prod_request', as: 'requested_product' });
Barter.belongsTo(User, { foreignKey: 'id_user_offer', as: 'offering_user' });
Barter.belongsTo(User, { foreignKey: 'id_user_receiving', as: 'receiving_user' });

export default Barter as typeof Barter & {
  new(): BarterInstance;
  findOne: (...args: any[]) => Promise<BarterInstance | null>;
  findAll: (...args: any[]) => Promise<BarterInstance[]>;
};