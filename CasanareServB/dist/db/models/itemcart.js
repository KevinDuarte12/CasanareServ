"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const conection_1 = __importDefault(require("../conection"));
/**
 * Modelo de Items del Carrito
 * Gestiona los productos individuales dentro de cada carrito de usuario
 */
const ItemCart = conection_1.default.define('itemcart', {
    // Clave primaria
    id_item: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true // Se incrementa automáticamente
    },
    // Referencia al carrito contenedor
    id_cart: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false, // Siempre debe pertenecer a un carrito
        references: {
            model: 'carts', // Relaciona con tabla carts
            key: 'id_cart'
        }
    },
    // Referencia al producto
    id_product: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false, // Siempre debe tener un producto
        references: {
            model: 'products', // Relaciona con tabla products
            key: 'id_product'
        }
    },
    // Cantidad del producto en el carrito
    quantity: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false, // Campo obligatorio
        defaultValue: 1 // Por defecto 1 unidad
    },
    // Precio del producto al agregarlo
    price: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2), // Hasta 99,999,999.99
        allowNull: false // Campo obligatorio para cálculos
    }
}, {
    tableName: 'itemcart', // Nombre explícito de la tabla
    timestamps: true, // Habilita createdAt y updatedAt automáticos
    // Índices para optimización
    indexes: [
        {
            name: 'idx_itemcart_cart', // Búsquedas por carrito
            fields: ['id_cart']
        },
        {
            name: 'idx_itemcart_product', // Búsquedas por producto
            fields: ['id_product']
        },
        {
            name: 'idx_itemcart_cart_product', // Evitar duplicados carrito-producto
            fields: ['id_cart', 'id_product'],
            unique: true // Un producto solo puede estar una vez por carrito
        }
    ]
});
exports.default = ItemCart;
