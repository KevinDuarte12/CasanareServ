"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const conection_1 = __importDefault(require("../conection"));
const user_1 = __importDefault(require("./user"));
/**
 * Modelo de Carrito de Compras
 * Gestiona los carritos de cada usuario en la plataforma
 */
const Cart = conection_1.default.define('carts', {
    // Clave primaria
    id_cart: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true // Se incrementa automáticamente
    },
    // Referencia al usuario propietario
    id_user: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false, // Siempre debe tener un usuario
        references: {
            model: user_1.default, // Relaciona con la tabla users
            key: 'id'
        }
    },
    // Estado del carrito con valores predefinidos
    status: {
        type: sequelize_1.DataTypes.ENUM('activo', 'comprado', 'abandonado'),
        defaultValue: 'activo' // Nuevo carrito inicia como activo
    }
}, {
    tableName: 'carts', // Nombre explícito de la tabla
    timestamps: true, // Habilita timestamps automáticos
    updatedAt: false // Solo queremos createdAt, no updatedAt
});
exports.default = Cart;
