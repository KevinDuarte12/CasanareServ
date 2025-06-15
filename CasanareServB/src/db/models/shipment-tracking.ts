import { DataTypes, Model } from 'sequelize';
import sequelize from '../conection';
/**
 * Estructura de datos para seguimiento de envíos
 * Define los campos necesarios para gestionar envíos de transacciones y trueques
 */
interface ShipmentAttributes {
  id_shipment?: number; // ID único del envío
  id_transaction?: number; // Transacción asociada (opcional)
  id_barter?: number; // Trueque asociado (opcional)
  tracking_number?: string; // Número de guía de seguimiento
  carrier: string; // Empresa transportadora
  status: 'pendiente' | 'en_transito' | 'entregado' | 'devuelto'; // Estado del envío
  sender_address?: string; // Dirección de origen
  receiver_address?: string; // Dirección de destino
  estimated_delivery?: Date; // Fecha estimada de entrega
  actual_delivery?: Date; // Fecha real de entrega
  tracking_events?: string; // Historial de eventos en JSON
  created_at?: Date; // Fecha de creación
  updated_at?: Date; // Fecha de actualización
}
/**
 * Modelo de Seguimiento de Envíos
 * Gestiona el tracking de paquetes para transacciones y trueques
 */
class Shipment extends Model<ShipmentAttributes> {
  // Identificadores principales
  public id_shipment!: number;
  public id_transaction?: number; // Referencia a transacción (opcional)
  public id_barter?: number; // Referencia a trueque (opcional)
  // Información de seguimiento
  public tracking_number?: string; // Guía de la transportadora
  public carrier: string = 'servientrega'; // Transportadora por defecto
  public status: 'pendiente' | 'en_transito' | 'entregado' | 'devuelto' = 'pendiente'; // Estado actual
  // Direcciones de envío
  public sender_address?: string; // Dirección del remitente
  public receiver_address?: string; // Dirección del destinatario
  // Control de tiempos
  public estimated_delivery?: Date; // Entrega estimada
  public actual_delivery?: Date; // Entrega real
  // Historial de tracking
  public tracking_events?: string; // JSON con eventos de seguimiento
  // Timestamps
  public created_at!: Date;
  public updated_at!: Date;
}
// Configuración del modelo en la base de datos
Shipment.init({
  // Clave primaria
  id_shipment: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true // Se incrementa automáticamente
  },
  // Referencia a transacción (opcional)
  id_transaction: {
    type: DataTypes.INTEGER,
    allowNull: true, // Puede ser envío de trueque en lugar de venta
    references: {
      model: 'transactions', // Relaciona con tabla transactions
      key: 'id_transaction'
    }
  }, 
  // Referencia a trueque (opcional)
  id_barter: {
    type: DataTypes.INTEGER,
    allowNull: true, // Puede ser envío de venta en lugar de trueque
    references: {
      model: 'barters', // Relaciona con tabla barters
      key: 'id_barter'
    }
  }, 
  // Número de guía único
  tracking_number: {
    type: DataTypes.STRING(50), // Máximo 50 caracteres
    allowNull: true, // Se asigna después de crear envío
    unique: true // No puede haber duplicados
  },
  // Empresa transportadora
  carrier: {
    type: DataTypes.STRING(50), // Máximo 50 caracteres
    defaultValue: 'servientrega' // Transportadora por defecto en Colombia
  },
  // Estado del envío con valores predefinidos
  status: {
    type: DataTypes.ENUM('pendiente', 'en_transito', 'entregado', 'devuelto'),
    defaultValue: 'pendiente' // Inicia como pendiente
  }, 
  // Dirección de origen del envío
  sender_address: {
    type: DataTypes.TEXT, // Texto largo para dirección completa
    allowNull: true // Puede llenarse después
  },
  // Dirección de destino del envío
  receiver_address: {
    type: DataTypes.TEXT, // Texto largo para dirección completa
    allowNull: true // Puede llenarse después
  },
  // Fecha estimada de entrega
  estimated_delivery: {
    type: DataTypes.DATE,
    allowNull: true // Se calcula después de crear envío
  },
  // Fecha real de entrega
  actual_delivery: {
    type: DataTypes.DATE,
    allowNull: true // Solo se llena cuando se entrega
  },
  // Historial de eventos de tracking en formato JSON
  tracking_events: {
    type: DataTypes.TEXT, // JSON almacenado como texto
    allowNull: true, // Inicia vacío
    comment: 'JSON string with tracking events history' // Descripción del campo
  },
  // Timestamp de creación personalizado
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW // Se asigna automáticamente
  },
  // Timestamp de actualización personalizado
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW // Se actualiza automáticamente
  }
}, {
  sequelize,
  tableName: 'shipments', // Nombre explícito de la tabla
  timestamps: true, // Habilita manejo automático de timestamps
  createdAt: 'created_at', // Campo personalizado para fecha de creación
  updatedAt: 'updated_at', // Campo personalizado para fecha de actualización
  // Índices para optimización
  indexes: [
    {
      name: 'idx_shipments_transaction', // Búsquedas por transacción
      fields: ['id_transaction']
    },
    {
      name: 'idx_shipments_barter', // Búsquedas por trueque
      fields: ['id_barter']
    },
    {
      name: 'idx_shipments_tracking', // Búsquedas por número de guía
      fields: ['tracking_number']
    },
    {
      name: 'idx_shipments_status', // Filtros por estado
      fields: ['status']
    },
    {
      name: 'idx_shipments_carrier', // Filtros por transportadora
      fields: ['carrier']
    }
  ]
});
export default Shipment;