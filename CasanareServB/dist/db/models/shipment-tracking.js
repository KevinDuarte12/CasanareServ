"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const conection_1 = __importDefault(require("../conection"));
/**
 * Modelo de Seguimiento de Envíos
 * Gestiona el tracking de paquetes para transacciones y trueques
 */
class Shipment extends sequelize_1.Model {
    constructor() {
        super(...arguments);
        this.carrier = 'servientrega'; // Transportadora por defecto
        this.status = 'pendiente'; // Estado actual
    }
}
// Configuración del modelo en la base de datos
Shipment.init({
    // Clave primaria
    id_shipment: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true // Se incrementa automáticamente
    },
    // Referencia a transacción (opcional)
    id_transaction: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true, // Puede ser envío de trueque en lugar de venta
        references: {
            model: 'transactions', // Relaciona con tabla transactions
            key: 'id_transaction'
        }
    },
    // Referencia a trueque (opcional)
    id_barter: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true, // Puede ser envío de venta en lugar de trueque
        references: {
            model: 'barters', // Relaciona con tabla barters
            key: 'id_barter'
        }
    },
    // Número de guía único
    tracking_number: {
        type: sequelize_1.DataTypes.STRING(50), // Máximo 50 caracteres
        allowNull: true, // Se asigna después de crear envío
        unique: true // No puede haber duplicados
    },
    // Empresa transportadora
    carrier: {
        type: sequelize_1.DataTypes.STRING(50), // Máximo 50 caracteres
        defaultValue: 'servientrega' // Transportadora por defecto en Colombia
    },
    // Estado del envío con valores predefinidos
    status: {
        type: sequelize_1.DataTypes.ENUM('pendiente', 'en_transito', 'entregado', 'devuelto'),
        defaultValue: 'pendiente' // Inicia como pendiente
    },
    // Dirección de origen del envío
    sender_address: {
        type: sequelize_1.DataTypes.TEXT, // Texto largo para dirección completa
        allowNull: true // Puede llenarse después
    },
    // Dirección de destino del envío
    receiver_address: {
        type: sequelize_1.DataTypes.TEXT, // Texto largo para dirección completa
        allowNull: true // Puede llenarse después
    },
    // Fecha estimada de entrega
    estimated_delivery: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true // Se calcula después de crear envío
    },
    // Fecha real de entrega
    actual_delivery: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true // Solo se llena cuando se entrega
    },
    // Historial de eventos de tracking en formato JSON
    tracking_events: {
        type: sequelize_1.DataTypes.TEXT, // JSON almacenado como texto
        allowNull: true, // Inicia vacío
        comment: 'JSON string with tracking events history' // Descripción del campo
    },
    // Timestamp de creación personalizado
    created_at: {
        type: sequelize_1.DataTypes.DATE,
        defaultValue: sequelize_1.DataTypes.NOW // Se asigna automáticamente
    },
    // Timestamp de actualización personalizado
    updated_at: {
        type: sequelize_1.DataTypes.DATE,
        defaultValue: sequelize_1.DataTypes.NOW // Se actualiza automáticamente
    }
}, {
    sequelize: conection_1.default,
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
exports.default = Shipment;
