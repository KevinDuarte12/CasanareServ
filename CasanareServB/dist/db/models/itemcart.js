"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const conection_1 = __importDefault(require("../conection"));
const cart_1 = __importDefault(require("./cart"));
const product_1 = __importDefault(require("./product"));
const ItemCart = conection_1.default.define('itemcart', {
    id_item: {
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
    id_product: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: product_1.default,
            key: 'id_product'
        }
    },
    quantity: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },
    unit_price: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false
    }
}, {
    tableName: 'itemscart',
    timestamps: false
});
// Associations
ItemCart.belongsTo(cart_1.default, {
    foreignKey: 'id_cart',
    as: 'id_cart'
});
ItemCart.belongsTo(product_1.default, {
    foreignKey: 'id_product',
    as: 'id_product'
});
// Add these to their respective models
// cart.hasMany(itemcart, {
//     foreignKey: 'id_cart',
//     as: 'items'
// });
// product.hasMany(itemcart, {
//     foreignKey: 'id_product',
//     as: 'items_en_carritos'
// });
exports.default = ItemCart;
