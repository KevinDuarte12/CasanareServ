import { DataTypes, Model, Optional, Op } from 'sequelize';
import sequelize from '../conection';
import Product from './product';
import User from './user';
import DeliveryAddress from './deliveryAddress';
/**
 * Interfaz que define la estructura completa del modelo Barter
 */
interface BarterAttributes {
  id_barter?: number;
  id_prod_offer: number;
  id_prod_request?: number | null;
  id_user_offer: number;
  id_user_receiving?: number | null;

  // Estado del trueque con enum de valores válidos
  status: 'pendiente' | 'aceptado' | 'rechazado' | 'completado' | 'disponible' | 'aprobado_admin' | 'en_proceso';
  value?: number | null;

  // Control temporal del proceso
  request_date: Date;
  resolution_date?: Date | null;
  notes?: string | null;

  // Categorización del tipo de intercambio
  exchange_type?: 'product_for_product' | 'product_with_money' | 'money_only';

  // Sistema de direcciones para logística del trueque
  offer_pickup_address_id?: number | null;
  offer_delivery_address_id?: number | null;
  request_pickup_address_id?: number | null;
  request_delivery_address_id?: number | null;

  // Control de proceso de checkout bilateral
  offer_checkout_completed?: boolean;
  request_checkout_completed?: boolean;
  checkout_date?: Date | null;

  // Sistema de pagos para comisiones y envíos
  offer_payment_completed?: boolean;
  request_payment_completed?: boolean;
  offer_payment_date?: Date | null;
  request_payment_date?: Date | null;
}
// Campos opcionales durante creación del registro
interface BarterCreationAttributes extends Optional<BarterAttributes, 'id_barter' | 'request_date'> { }
/**
 * Extensión del tipo para incluir relaciones con otros modelos
 */
type BarterInstance = Model<BarterAttributes, BarterCreationAttributes> & BarterAttributes & {
  // Relaciones con productos involucrados
  readonly offered_product?: ReturnType<typeof Product.build>;
  readonly requested_product?: ReturnType<typeof Product.build>;

  // Relaciones con usuarios participantes
  readonly offering_user?: ReturnType<typeof User.build>;
  readonly receiving_user?: ReturnType<typeof User.build>;

  // Relaciones con direcciones de envío
  readonly offer_pickup_address?: ReturnType<typeof DeliveryAddress.build>;
  readonly offer_delivery_address?: ReturnType<typeof DeliveryAddress.build>;
  readonly request_pickup_address?: ReturnType<typeof DeliveryAddress.build>;
  readonly request_delivery_address?: ReturnType<typeof DeliveryAddress.build>;
}
/**
 * Modelo Sequelize para gestión completa de trueques
 */
class Barter extends Model<BarterAttributes, BarterCreationAttributes> implements BarterAttributes {
  // Identificadores únicos
  public id_barter!: number;
  public id_prod_offer!: number;
  public id_prod_request?: number | null;
  public id_user_offer!: number;
  public id_user_receiving?: number | null;

  // Control de estado del trueque
  public status!: 'pendiente' | 'aceptado' | 'rechazado' | 'completado' | 'disponible' | 'aprobado_admin' | 'en_proceso';
  public value?: number | null;
  public request_date!: Date;
  public resolution_date?: Date | null;
  public notes?: string | null;
  public exchange_type?: 'product_for_product' | 'product_with_money' | 'money_only';

  // Referencias a direcciones de envío
  public offer_pickup_address_id?: number | null;
  public offer_delivery_address_id?: number | null;
  public request_pickup_address_id?: number | null;
  public request_delivery_address_id?: number | null;

  // Control de proceso de finalización
  public offer_checkout_completed!: boolean;
  public request_checkout_completed!: boolean;
  public checkout_date?: Date | null;

  // Control de transacciones monetarias
  public offer_payment_completed!: boolean;
  public request_payment_completed!: boolean;
  public offer_payment_date?: Date | null;
  public request_payment_date?: Date | null;

  // Timestamps automáticos de Sequelize
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}
// Inicialización del modelo con configuración de base de datos
Barter.init({
  // Primary key con auto-incremento
  id_barter: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // Foreign keys a tabla de productos
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
  // Foreign keys a tabla de usuarios
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
  // Enum para control de estados del trueque
  status: {
    type: DataTypes.ENUM('pendiente', 'aceptado', 'rechazado', 'completado', 'disponible', 'aprobado_admin', 'en_proceso'),
    defaultValue: 'pendiente'
  },
  // Valor monetario con precisión decimal
  value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  // Timestamps para control temporal
  request_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  resolution_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Campo de texto para información adicional
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Enum para tipo de intercambio
  exchange_type: {
    type: DataTypes.ENUM('product_for_product', 'product_with_money', 'money_only'),
    defaultValue: 'product_for_product'
  },
  // Foreign keys a direcciones del oferente
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
  // Foreign keys a direcciones del receptor
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

  // Flags de control de checkout
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
  // Flags de control de pagos
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

  // Índice único para evitar ofertas duplicadas
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

// Export con tipado extendido para mejor IntelliSense
export default Barter as typeof Barter & {
  new(): BarterInstance;
  findOne: (...args: any[]) => Promise<BarterInstance | null>;
  findAll: (...args: any[]) => Promise<BarterInstance[]>;
};