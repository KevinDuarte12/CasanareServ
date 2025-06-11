"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const conection_1 = __importDefault(require("../conection"));
/**
 * Modelo Sequelize para gestión completa de trueques
 */
class Barter extends sequelize_1.Model {
}
// Inicialización del modelo con configuración de base de datos
Barter.init({
    // Primary key con auto-incremento
    id_barter: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    // Foreign keys a tabla de productos
    id_prod_offer: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'products',
            key: 'id_product'
        }
    },
    id_prod_request: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'products',
            key: 'id_product'
        }
    },
    // Foreign keys a tabla de usuarios
    id_user_offer: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    id_user_receiving: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    // Enum para control de estados del trueque
    status: {
        type: sequelize_1.DataTypes.ENUM('pendiente', 'aceptado', 'rechazado', 'completado', 'disponible', 'aprobado_admin', 'en_proceso'),
        defaultValue: 'pendiente'
    },
    // Valor monetario con precisión decimal
    value: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    // Timestamps para control temporal
    request_date: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW
    },
    resolution_date: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true
    },
    // Campo de texto para información adicional
    notes: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    },
    // Enum para tipo de intercambio
    exchange_type: {
        type: sequelize_1.DataTypes.ENUM('product_for_product', 'product_with_money', 'money_only'),
        defaultValue: 'product_for_product'
    },
    // Foreign keys a direcciones del oferente
    offer_pickup_address_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'delivery_addresses',
            key: 'id'
        }
    },
    offer_delivery_address_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'delivery_addresses',
            key: 'id'
        }
    },
    // Foreign keys a direcciones del receptor
    request_pickup_address_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'delivery_addresses',
            key: 'id'
        }
    },
    request_delivery_address_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'delivery_addresses',
            key: 'id'
        }
    },
    // Flags de control de checkout
    offer_checkout_completed: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    request_checkout_completed: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    checkout_date: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true
    },
    // Flags de control de pagos
    offer_payment_completed: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    request_payment_completed: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    offer_payment_date: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true
    },
    request_payment_date: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true
    }
}, {
    sequelize: conection_1.default,
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
                    [sequelize_1.Op.in]: ['disponible', 'pendiente']
                }
            }
        }
    ]
});
// Export con tipado extendido para mejor IntelliSense
exports.default = Barter;
