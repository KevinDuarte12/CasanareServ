import { DataTypes, Model, Optional, Op } from 'sequelize';
import sequelize from '../conection';
import Product from './product';
import User from './user';
import DeliveryAddress from './deliveryAddress';

// Define una interfaz para los atributos de Barter
interface BarterAttributes {
  id_barter?: number;
  id_prod_offer: number;
  id_prod_request?: number | null;
  id_user_offer: number;
  id_user_receiving?: number | null;
  status: 'pendiente' | 'aceptado' | 'rechazado' | 'completado' | 'disponible' | 'aprobado_admin' | 'en_proceso';
  value?: number | null;
  request_date: Date;
  resolution_date?: Date | null;
  notes?: string | null;
  exchange_type?: 'product_for_product' | 'product_with_money' | 'money_only';
  
  // Direcciones para el usuario que ofrece (Usuario A - offering_user)
  offer_pickup_address_id?: number | null;
  offer_delivery_address_id?: number | null;
  
  // Direcciones para el usuario que recibe (Usuario B - receiving_user)
  request_pickup_address_id?: number | null;
  request_delivery_address_id?: number | null;
  
  // Campos para seguimiento de checkout
  offer_checkout_completed?: boolean;
  request_checkout_completed?: boolean;
  checkout_date?: Date | null;
  
  // Campos para seguimiento de pago
  offer_payment_completed?: boolean;    // Usuario A completó pago
  request_payment_completed?: boolean;  // Usuario B completó pago
  offer_payment_date?: Date | null;     // Cuándo pagó Usuario A
  request_payment_date?: Date | null;   // Cuándo pagó Usuario B
}

// Interfaz para la creación (algunos campos son opcionales en creación)
interface BarterCreationAttributes extends Optional<BarterAttributes, 'id_barter' | 'request_date'> {}

// Aquí usamos una solución con intersección de tipos para las asociaciones
type BarterInstance = Model<BarterAttributes, BarterCreationAttributes> & BarterAttributes & {
  readonly offered_product?: ReturnType<typeof Product.build>;
  readonly requested_product?: ReturnType<typeof Product.build>;
  readonly offering_user?: ReturnType<typeof User.build>;
  readonly receiving_user?: ReturnType<typeof User.build>;
  readonly offer_pickup_address?: ReturnType<typeof DeliveryAddress.build>;
  readonly offer_delivery_address?: ReturnType<typeof DeliveryAddress.build>;
  readonly request_pickup_address?: ReturnType<typeof DeliveryAddress.build>;
  readonly request_delivery_address?: ReturnType<typeof DeliveryAddress.build>;
}

// Extender la clase Model con la interfaz de atributos
class Barter extends Model<BarterAttributes, BarterCreationAttributes> implements BarterAttributes {
  // Declarar explícitamente las propiedades para que TypeScript las reconozca
  public id_barter!: number;
  public id_prod_offer!: number;
  public id_prod_request?: number | null;
  public id_user_offer!: number;
  public id_user_receiving?: number | null;
  public status!: 'pendiente' | 'aceptado' | 'rechazado' | 'completado' | 'disponible' | 'aprobado_admin' | 'en_proceso';
  public value?: number | null;
  public request_date!: Date;
  public resolution_date?: Date | null;
  public notes?: string | null;
  public exchange_type?: 'product_for_product' | 'product_with_money' | 'money_only';
  
  // Campos para direcciones y checkout
  public offer_pickup_address_id?: number | null;
  public offer_delivery_address_id?: number | null;
  public request_pickup_address_id?: number | null;
  public request_delivery_address_id?: number | null;
  public offer_checkout_completed!: boolean;
  public request_checkout_completed!: boolean;
  public checkout_date?: Date | null;
  
  // Campos para seguimiento de pago
  public offer_payment_completed!: boolean;
  public request_payment_completed!: boolean;
  public offer_payment_date?: Date | null;
  public request_payment_date?: Date | null;
  
  // Timestamps que Sequelize agrega automáticamente
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Barter.init({
  id_barter: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  id_prod_offer: {
    type: DataTypes.INTEGER,
    allowNull: true,
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
    type: DataTypes.ENUM('pendiente', 'aceptado', 'rechazado', 'completado', 'disponible', 'aprobado_admin', 'en_proceso'),
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
  },
  exchange_type: {
    type: DataTypes.ENUM('product_for_product', 'product_with_money', 'money_only'),
    defaultValue: 'product_for_product'
  },
  
  // Campos para direcciones del Usuario A (offering_user)
  offer_pickup_address_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'delivery_addresses',
      key: 'id'
    }
  },
  offer_delivery_address_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'delivery_addresses',
      key: 'id'
    }
  },
  
  // Campos para direcciones del Usuario B (receiving_user)
  request_pickup_address_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'delivery_addresses',
      key: 'id'
    }
  },
  request_delivery_address_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'delivery_addresses',
      key: 'id'
    }
  },
  
  // Campos para seguimiento de checkout
  offer_checkout_completed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  request_checkout_completed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  checkout_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Campos para seguimiento de pago
  offer_payment_completed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  request_payment_completed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  offer_payment_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  request_payment_date: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'barter',
  tableName: 'barters',
  indexes: [
    {
      name: 'unique_product_offer_idx',
      unique: true,
      fields: ['id_prod_offer'],
      where: {
        status: {
          [Op.in]: ['disponible', 'pendiente']
        }
      }
    }
  ]
});



export default Barter as typeof Barter & {
  new(): BarterInstance;
  findOne: (...args: any[]) => Promise<BarterInstance | null>;
  findAll: (...args: any[]) => Promise<BarterInstance[]>;
};