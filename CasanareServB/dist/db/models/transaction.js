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
const Transaction = conection_1.default.define('transaction', {
    id_transaction: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_cart: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true, // Cambia a true para permitir null si es trueque
        references: {
            model: cart_1.default,
            key: 'id_cart'
        }
    },
    id_barter: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true
        // Puedes agregar references si tienes tabla de trueques
    },
    id_user: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: user_1.default,
            key: 'id'
        }
    },
    total_amount: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('pendiente', 'completada', 'fallida', 'reembolsada'),
        defaultValue: 'pendiente'
    },
    reference_payu: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true
    },
    payment_method: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: true
    },
    transaction_date: {
        type: sequelize_1.DataTypes.DATE,
        defaultValue: sequelize_1.DataTypes.NOW
    },
    // Nuevos campos para PayU WebCheckout
    currency: {
        type: sequelize_1.DataTypes.STRING(3),
        allowNull: true,
        defaultValue: 'COP'
    },
    payu_transaction_id: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true
    },
    payu_order_id: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true
    },
    payu_state: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: true
    },
    payu_response_code: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: true
    },
    payu_response_message: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    },
    delivery_address_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'delivery_addresses', // Nombre de la tabla
            key: 'id'
        }
    },
    buyer_email: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true
    },
    buyer_name: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true
    },
    buyer_phone: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: true
    },
    confirmation_received: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false
    },
    response_url: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    },
    signature: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true
    }
}, {
    tableName: 'transactions',
    timestamps: false
});
// Definir las asociaciones
Transaction.belongsTo(deliveryAddress_1.default, {
    foreignKey: 'delivery_address_id',
    as: 'deliveryAddress'
});
exports.default = Transaction;
