import { DataTypes, Model, Optional, Op } from 'sequelize';
import sequelize from '../conection';
import Product from './product';
import User from './user';
import DeliveryAddress from './deliveryAddress';
/**
 * Estructura de datos para el sistema de trueques
 * Define todos los campos necesarios para gestionar intercambios entre usuarios
 */
interface BarterAttributes {
  id_barter?: number; // ID único del trueque
  id_prod_offer: number; // Producto que se ofrece
  id_prod_request?: number | null; // Producto que se solicita (opcional)
  id_user_offer: number; // Usuario que ofrece el producto
  id_user_receiving?: number | null; // Usuario que recibe la oferta
  // Estados del trueque
  status: 'pendiente' | 'aceptado' | 'rechazado' | 'completado' | 'disponible' | 'aprobado_admin' | 'en_proceso';
  value?: number | null; // Valor monetario adicional si aplica
  // Control de fechas
  request_date: Date; // Cuándo se creó el trueque
  resolution_date?: Date | null; // Cuándo se resolvió
  notes?: string | null; // Notas adicionales del trueque
  // Tipo de intercambio
  exchange_type?: 'product_for_product' | 'product_with_money' | 'money_only';
  // Direcciones para recolección y entrega del usuario oferente
  offer_pickup_address_id?: number | null; // Dónde recoger producto ofrecido
  offer_delivery_address_id?: number | null; // Dónde entregar producto ofrecido
  // Direcciones para recolección y entrega del usuario receptor
  request_pickup_address_id?: number | null; // Dónde recoger producto solicitado
  request_delivery_address_id?: number | null; // Dónde entregar producto solicitado
  // Control de proceso de checkout
  offer_checkout_completed?: boolean; // Usuario oferente completó checkout
  request_checkout_completed?: boolean; // Usuario receptor completó checkout
  checkout_date?: Date | null; // Cuándo se completó el checkout
  // Control de pagos
  offer_payment_completed?: boolean; // Usuario oferente pagó comisión/envío
  request_payment_completed?: boolean; // Usuario receptor pagó comisión/envío
  offer_payment_date?: Date | null; // Fecha de pago del oferente
  request_payment_date?: Date | null; // Fecha de pago del receptor
}
// Campos opcionales durante la creación del modelo
interface BarterCreationAttributes extends Optional<BarterAttributes, 'id_barter' | 'request_date'> { }
/**
 * Tipo extendido que incluye las relaciones con otros modelos
 * Permite acceso a productos, usuarios y direcciones relacionadas
 */
type BarterInstance = Model<BarterAttributes, BarterCreationAttributes> & BarterAttributes & {
  // Relaciones con productos
  readonly offered_product?: ReturnType<typeof Product.build>; // Producto ofrecido
  readonly requested_product?: ReturnType<typeof Product.build>; // Producto solicitado
  // Relaciones con usuarios
  readonly offering_user?: ReturnType<typeof User.build>; // Usuario que ofrece
  readonly receiving_user?: ReturnType<typeof User.build>; // Usuario que recibe
  // Relaciones con direcciones
  readonly offer_pickup_address?: ReturnType<typeof DeliveryAddress.build>; // Dirección recolección oferente
  readonly offer_delivery_address?: ReturnType<typeof DeliveryAddress.build>; // Dirección entrega oferente
  readonly request_pickup_address?: ReturnType<typeof DeliveryAddress.build>; // Dirección recolección receptor
  readonly request_delivery_address?: ReturnType<typeof DeliveryAddress.build>; // Dirección entrega receptor
}
/**
 * Modelo principal de Barter
 * Gestiona todo el ciclo de vida de los trueques en la plataforma
 */
class Barter extends Model<BarterAttributes, BarterCreationAttributes> implements BarterAttributes {
  // Identificadores principales
  public id_barter!: number;
  public id_prod_offer!: number;
  public id_prod_request?: number | null;
  public id_user_offer!: number;
  public id_user_receiving?: number | null;
  // Estados y control
  public status!: 'pendiente' | 'aceptado' | 'rechazado' | 'completado' | 'disponible' | 'aprobado_admin' | 'en_proceso';
  public value?: number | null;
  public request_date!: Date;
  public resolution_date?: Date | null;
  public notes?: string | null;
  public exchange_type?: 'product_for_product' | 'product_with_money' | 'money_only';
  // Sistema de direcciones
  public offer_pickup_address_id?: number | null;
  public offer_delivery_address_id?: number | null;
  public request_pickup_address_id?: number | null;
  public request_delivery_address_id?: number | null;
  // Control de checkout
  public offer_checkout_completed!: boolean;
  public request_checkout_completed!: boolean;
  public checkout_date?: Date | null;
  // Control de pagos
  public offer_payment_completed!: boolean;
  public request_payment_completed!: boolean;
  public offer_payment_date?: Date | null;
  public request_payment_date?: Date | null;
  // Timestamps automáticos de Sequelize
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}
// Configuración del modelo en la base de datos
Barter.init({
  // Clave primaria
  id_barter: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // Referencias a productos
  id_prod_offer: {
    type: DataTypes.INTEGER,
    allowNull: true, // Puede ser null si es solo dinero
    references: {
      model: 'products',
      key: 'id_product'
    }
  },
  id_prod_request: {
    type: DataTypes.INTEGER,
    allowNull: true, // Opcional en ofertas abiertas
    references: {
      model: 'products',
      key: 'id_product'
    }
  },
  // Referencias a usuarios
  id_user_offer: {
    type: DataTypes.INTEGER,
    allowNull: false, // Siempre debe haber un oferente
    references: {
      model: 'users',
      key: 'id'
    }
  },
  id_user_receiving: {
    type: DataTypes.INTEGER,
    allowNull: true, // Null hasta que alguien acepte
    references: {
      model: 'users',
      key: 'id'
    }
  },
  // Estado del trueque con valores predefinidos
  status: {
    type: DataTypes.ENUM('pendiente', 'aceptado', 'rechazado', 'completado', 'disponible', 'aprobado_admin', 'en_proceso'),
    defaultValue: 'pendiente'
  },
  // Valor monetario adicional
  value: {
    type: DataTypes.DECIMAL(10, 2), // Hasta 99,999,999.99
    allowNull: true
  },
  // Fechas de control
  request_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW // Se asigna automáticamente
  },
  resolution_date: {
    type: DataTypes.DATE,
    allowNull: true // Solo cuando se resuelve
  },
  // Información adicional
  notes: {
    type: DataTypes.TEXT, // Texto largo para detalles
    allowNull: true
  },
  // Tipo de intercambio
  exchange_type: {
    type: DataTypes.ENUM('product_for_product', 'product_with_money', 'money_only'),
    defaultValue: 'product_for_product'
  },

  // Direcciones del usuario oferente
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

  // Direcciones del usuario receptor
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
  // Seguimiento de checkout
  offer_checkout_completed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false // Inicia como no completado
  },
  request_checkout_completed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false // Inicia como no completado
  },
  checkout_date: {
    type: DataTypes.DATE,
    allowNull: true // Solo cuando ambos completen
  },
  // Seguimiento de pagos
  offer_payment_completed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false // Inicia como no pagado
  },
  request_payment_completed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false // Inicia como no pagado
  },
  offer_payment_date: {
    type: DataTypes.DATE,
    allowNull: true // Solo cuando pague
  },
  request_payment_date: {
    type: DataTypes.DATE,
    allowNull: true // Solo cuando pague
  }
}, {
  sequelize,
  modelName: 'barter',
  tableName: 'barters',
  // Índices para optimización
  indexes: [
    {
      name: 'unique_product_offer_idx',
      unique: true, // Un producto solo puede tener una oferta activa
      fields: ['id_prod_offer'],
      where: {
        status: {
          [Op.in]: ['disponible', 'pendiente'] // Solo para estados activos
        }
      }
    }
  ]
});
// Exportar con tipos extendidos para mejor TypeScript intellisense
export default Barter as typeof Barter & {
  new(): BarterInstance;
  findOne: (...args: any[]) => Promise<BarterInstance | null>;
  findAll: (...args: any[]) => Promise<BarterInstance[]>;
};