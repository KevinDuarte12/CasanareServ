"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const conection_1 = __importDefault(require("../conection"));
const user_1 = __importDefault(require("./user"));
const Cart = conection_1.default.define('carts', {
    id_cart: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_user: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: user_1.default,
            key: 'id'
        }
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('activo', 'comprado', 'abandonado'),
        defaultValue: 'activo'
    }
}, {
    tableName: 'carts',
    timestamps: true,
    updatedAt: false // Solo queremos createdAt
});
// Cart.belongsTo(users, {
//     foreignKey: 'id_user',
//     as: 'user' 
// });
// ELIMINAR cualquier otra asociación de este archivo
exports.default = Cart;
