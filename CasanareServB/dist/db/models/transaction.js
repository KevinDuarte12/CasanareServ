"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const conection_1 = __importDefault(require("../conection"));
const cart_1 = __importDefault(require("./cart"));
const user_1 = __importDefault(require("./user"));
const Transaction = conection_1.default.define('transaction', {
    id_transaction: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_cart: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: cart_1.default,
            key: 'id_cart'
        }
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
    }
}, {
    tableName: 'transactions',
    timestamps: false
});
// Associations
Transaction.belongsTo(cart_1.default, {
    foreignKey: 'id_cart',
    as: 'id_cart'
});
Transaction.belongsTo(user_1.default, {
    foreignKey: 'id',
    as: 'id'
});
// Add these to their respective models
// cart.hasOne(transaction, {
//     foreignKey: 'id_cart',
//     as: 'transaccion'
// });
// user.hasMany(transaction, {
//     foreignKey: 'id_user',
//     as: 'transacciones'
// });
exports.default = Transaction;
