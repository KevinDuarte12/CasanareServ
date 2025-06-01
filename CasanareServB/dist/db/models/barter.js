"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const conection_1 = __importDefault(require("../conection"));
// Extender la clase Model con la interfaz de atributos
class Barter extends sequelize_1.Model {
}
Barter.init({
    id_barter: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
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
    status: {
        type: sequelize_1.DataTypes.ENUM('pendiente', 'aceptado', 'rechazado', 'completado', 'disponible', 'aprobado_admin', 'en_proceso'),
        defaultValue: 'pendiente'
    },
    value: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    request_date: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW
    },
    resolution_date: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true
    },
    notes: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    },
    exchange_type: {
        type: sequelize_1.DataTypes.ENUM('product_for_product', 'product_with_money', 'money_only'),
        defaultValue: 'product_for_product'
    },
    // Campos para direcciones del Usuario A (offering_user)
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
    // Campos para direcciones del Usuario B (receiving_user)
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
    // Campos para seguimiento de checkout
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
    // Campos para seguimiento de pago
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
exports.default = Barter;
