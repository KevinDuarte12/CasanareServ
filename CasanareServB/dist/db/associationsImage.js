"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatMessage = exports.DeliveryAddress = exports.Barter = exports.Image = exports.Category = exports.Product = exports.User = void 0;
const user_1 = __importDefault(require("./models/user"));
exports.User = user_1.default;
const product_1 = __importDefault(require("./models/product"));
exports.Product = product_1.default;
const category_1 = __importDefault(require("./models/category"));
exports.Category = category_1.default;
const image_1 = __importDefault(require("./models/image"));
exports.Image = image_1.default;
const barter_1 = __importDefault(require("./models/barter"));
exports.Barter = barter_1.default;
const notifications_1 = __importDefault(require("./models/notifications"));
const deliveryAddress_1 = __importDefault(require("./models/deliveryAddress"));
exports.DeliveryAddress = deliveryAddress_1.default;
const chatMessage_1 = __importDefault(require("./models/chatMessage"));
exports.ChatMessage = chatMessage_1.default;
const cart_1 = __importDefault(require("./models/cart"));
const itemcart_1 = __importDefault(require("./models/itemcart"));
// Asociaciones para User
user_1.default.hasMany(image_1.default, {
    foreignKey: 'entity_id',
    constraints: false,
    scope: { entity_type: 'user' },
    as: 'userImages'
});
user_1.default.hasMany(notifications_1.default, { foreignKey: 'id_user', as: 'notifications' });
user_1.default.hasMany(deliveryAddress_1.default, { foreignKey: 'user_id', as: 'deliveryAddresses' });
// Asociación inversa para direcciones de entrega (alias único)
deliveryAddress_1.default.belongsTo(user_1.default, { foreignKey: 'user_id', as: 'deliveryUser' }); // alias único
// Asociación User <-> Product
user_1.default.hasMany(product_1.default, { foreignKey: 'id_user', as: 'products' });
product_1.default.belongsTo(user_1.default, { foreignKey: 'id_user', as: 'user' }); // SOLO aquí 'user'
// Asociaciones para Product
product_1.default.hasMany(image_1.default, {
    foreignKey: 'entity_id',
    constraints: false,
    scope: { entity_type: 'product' },
    as: 'productImages'
});
// Asociaciones para Category
category_1.default.hasMany(image_1.default, {
    foreignKey: 'entity_id',
    constraints: false,
    scope: { entity_type: 'category' },
    as: 'categoryImages'
});
// Asociaciones para imágenes de Barter
barter_1.default.hasMany(image_1.default, {
    foreignKey: 'entity_id',
    constraints: false,
    scope: { entity_type: 'barter' },
    as: 'barterImages'
});
// Asociaciones inversas para Image (alias únicos)
image_1.default.belongsTo(user_1.default, {
    foreignKey: 'entity_id',
    constraints: false,
    as: 'userImage', // alias único
    scope: { entity_type: 'user' }
});
image_1.default.belongsTo(product_1.default, {
    foreignKey: 'entity_id',
    constraints: false,
    as: 'product',
    scope: { entity_type: 'product' }
});
image_1.default.belongsTo(category_1.default, {
    foreignKey: 'entity_id',
    constraints: false,
    as: 'category',
    scope: { entity_type: 'category' }
});
image_1.default.belongsTo(barter_1.default, {
    foreignKey: 'entity_id',
    constraints: false,
    as: 'barter',
    scope: { entity_type: 'barter' }
});
// Notification inversa (alias único)
notifications_1.default.belongsTo(user_1.default, { foreignKey: 'id_user', as: 'notificationUser' }); // alias único
// Chat para trueques
barter_1.default.hasMany(chatMessage_1.default, { foreignKey: 'id_barter', as: 'barterMessages' });
chatMessage_1.default.belongsTo(barter_1.default, { foreignKey: 'id_barter', as: 'barter' });
// Chat para productos
product_1.default.hasMany(chatMessage_1.default, { foreignKey: 'id_product', as: 'productMessages' });
chatMessage_1.default.belongsTo(product_1.default, { foreignKey: 'id_product', as: 'product' });
// Relación con usuario en ChatMessage (usa alias único)
user_1.default.hasMany(chatMessage_1.default, { foreignKey: 'id_user', as: 'userMessages' });
chatMessage_1.default.belongsTo(user_1.default, { foreignKey: 'id_user', as: 'chatUser' }); // <-- alias único
// Asociaciones de Product con ItemCart y Category
product_1.default.belongsTo(category_1.default, { foreignKey: 'id_category', as: 'category' });
product_1.default.hasMany(itemcart_1.default, {
    foreignKey: 'id_product',
    as: 'items_en_carritos'
});
// Asociaciones de Cart
cart_1.default.belongsTo(user_1.default, {
    foreignKey: 'id_user',
    as: 'cartUser' // alias único, NO 'user'
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
console.log('✅ Asociaciones inicializadas correctamente');
