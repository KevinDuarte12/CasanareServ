"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const user_1 = __importDefault(require("./user"));
const product_1 = __importDefault(require("./product"));
const category_1 = __importDefault(require("./category"));
const cart_1 = __importDefault(require("./cart"));
const itemcart_1 = __importDefault(require("./itemcart"));
const setupAssociations = () => {
    // Asociaciones de Product
    product_1.default.belongsTo(user_1.default, { foreignKey: 'id_user', as: 'user' });
    product_1.default.belongsTo(category_1.default, { foreignKey: 'id_category', as: 'category' });
    product_1.default.hasMany(itemcart_1.default, {
        foreignKey: 'id_product',
        as: 'items_en_carritos'
    });
    // Asociaciones de Cart
    cart_1.default.belongsTo(user_1.default, {
        foreignKey: 'id_user',
        as: 'cartUser' // Cambiado de 'user' a 'cartUser'
    });
    cart_1.default.hasMany(itemcart_1.default, {
        foreignKey: 'id_cart',
        as: 'items'
    });
    // Asociaciones de ItemCart
    itemcart_1.default.belongsTo(product_1.default, {
        foreignKey: 'id_product',
        as: 'product'
    });
    itemcart_1.default.belongsTo(cart_1.default, {
        foreignKey: 'id_cart',
        as: 'cart'
    });
};
exports.default = setupAssociations;
