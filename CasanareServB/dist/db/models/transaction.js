"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const conection_1 = __importDefault(require("../conection"));
const cart_1 = __importDefault(require("./cart"));
const user_1 = __importDefault(require("./user"));
const deliveryAddress_1 = __importDefault(require("./deliveryAddress"));
/**
 * Modelo de Transacciones
 * Gestiona pagos, ventas y transacciones monetarias del sistema
 */
const Transaction = conection_1.default.define('transaction', {
    // Clave primaria
    id_transaction: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true // Se incrementa automáticamente
    },
    // Carrito asociado (opcional para trueques)
    id_cart: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true, // Null cuando es transacción de trueque
        references: {
            model: cart_1.default, // Relaciona con modelo cart
            key: 'id_cart'
        }
    },
    // Trueque asociado (opcional para ventas)
    id_barter: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true, // Null cuando es transacción de venta
        references: {
            model: 'barters', // Relaciona con tabla barters
            key: 'id_barter'
        },
        onUpdate: 'CASCADE', // Actualiza en cascada
        onDelete: 'SET NULL' // Establece null al eliminar
    },
    // Usuario que realiza la transacción
    id_user: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false, // Campo obligatorio
        references: {
            model: user_1.default, // Relaciona con modelo users
            key: 'id'
        }
    },
    // Monto total con precisión decimal
    total_amount: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2), // Hasta 99,999,999.99
        allowNull: false // Campo obligatorio
    },
    // Estado de la transacción con valores predefinidos
    status: {
        type: sequelize_1.DataTypes.ENUM('pendiente', 'completada', 'fallida', 'reembolsada'),
        defaultValue: 'pendiente' // Inicia como pendiente
    },
    // Referencia única de PayU
    reference_payu: {
        type: sequelize_1.DataTypes.STRING(255), // Máximo 255 caracteres
        allowNull: true // Campo opcional
    },
    // Método de pago utilizado
    payment_method: {
        type: sequelize_1.DataTypes.STRING(50), // Máximo 50 caracteres
        allowNull: true // Campo opcional
    },
    // Fecha de la transacción
    transaction_date: {
        type: sequelize_1.DataTypes.DATE,
        defaultValue: sequelize_1.DataTypes.NOW // Se asigna automáticamente
    },
    // Moneda de la transacción (Colombia por defecto)
    currency: {
        type: sequelize_1.DataTypes.STRING(3), // Código ISO de 3 caracteres
        allowNull: true,
        defaultValue: 'COP' // Peso colombiano por defecto
    },
    // ID de transacción en PayU
    payu_transaction_id: {
        type: sequelize_1.DataTypes.STRING(255), // Máximo 255 caracteres
        allowNull: true // Se llena con respuesta de PayU
    },
    // ID de orden en PayU
    payu_order_id: {
        type: sequelize_1.DataTypes.STRING(255), // Máximo 255 caracteres
        allowNull: true // Se llena con respuesta de PayU
    },
    // Estado de la transacción en PayU
    payu_state: {
        type: sequelize_1.DataTypes.STRING(50), // Máximo 50 caracteres
        allowNull: true // Estado devuelto por PayU
    },
    // Código de respuesta de PayU
    payu_response_code: {
        type: sequelize_1.DataTypes.STRING(50), // Máximo 50 caracteres
        allowNull: true // Código de resultado
    },
    // Mensaje de respuesta de PayU
    payu_response_message: {
        type: sequelize_1.DataTypes.TEXT, // Texto largo para mensajes detallados
        allowNull: true // Mensaje explicativo de PayU
    },
    // Dirección de entrega seleccionada
    delivery_address_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true, // Opcional para algunos tipos de transacción
        references: {
            model: 'delivery_addresses', // Relaciona con tabla delivery_addresses
            key: 'id'
        }
    },
    // Email del comprador
    buyer_email: {
        type: sequelize_1.DataTypes.STRING(255), // Máximo 255 caracteres
        allowNull: true // Puede diferir del usuario registrado
    },
    // Nombre del comprador
    buyer_name: {
        type: sequelize_1.DataTypes.STRING(255), // Máximo 255 caracteres
        allowNull: true // Puede diferir del usuario registrado
    },
    // Teléfono del comprador
    buyer_phone: {
        type: sequelize_1.DataTypes.STRING(50), // Máximo 50 caracteres
        allowNull: true // Información de contacto adicional
    },
    // Control de confirmación recibida
    confirmation_received: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false // Por defecto no confirmada
    },
    // URL de respuesta personalizada
    response_url: {
        type: sequelize_1.DataTypes.TEXT, // URL puede ser larga
        allowNull: true // Opcional para redirección
    },
    // Firma de seguridad para validación
    signature: {
        type: sequelize_1.DataTypes.STRING(255), // Máximo 255 caracteres
        allowNull: true // Hash de validación
    }
}, {
    tableName: 'transactions', // Nombre explícito de la tabla
    timestamps: false, // No usar timestamps automáticos
    // Índices para optimización
    indexes: [
        {
            name: 'idx_transactions_user', // Búsquedas por usuario
            fields: ['id_user']
        },
        {
            name: 'idx_transactions_cart', // Búsquedas por carrito
            fields: ['id_cart']
        },
        {
            name: 'idx_transactions_barter', // Búsquedas por trueque
            fields: ['id_barter']
        },
        {
            name: 'idx_transactions_status', // Filtros por estado
            fields: ['status']
        },
        {
            name: 'idx_transactions_payu_ref', // Búsquedas por referencia PayU
            fields: ['reference_payu']
        },
        {
            name: 'idx_transactions_date', // Ordenamiento por fecha
            fields: ['transaction_date']
        }
    ]
});
// Asociación con dirección de entrega
Transaction.belongsTo(deliveryAddress_1.default, {
    foreignKey: 'delivery_address_id', // Clave foránea
    as: 'deliveryAddress' // Alias para la relación
});
exports.default = Transaction;
