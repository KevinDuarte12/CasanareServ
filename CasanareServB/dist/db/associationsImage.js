"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Raiting = exports.Shipment = exports.Transaction = exports.ItemCart = exports.Cart = exports.ChatMessage = exports.DeliveryAddress = exports.Barter = exports.Image = exports.Category = exports.Product = exports.User = void 0;
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
exports.Cart = cart_1.default;
const itemcart_1 = __importDefault(require("./models/itemcart"));
exports.ItemCart = itemcart_1.default;
const transaction_1 = __importDefault(require("./models/transaction"));
exports.Transaction = transaction_1.default;
const shipment_tracking_1 = __importDefault(require("./models/shipment-tracking"));
exports.Shipment = shipment_tracking_1.default;
const rating_1 = __importDefault(require("./models/rating"));
exports.Raiting = rating_1.default;
// 🔧 ASOCIACIONES PARA USER CON CASCADE
user_1.default.hasMany(image_1.default, {
    foreignKey: 'entity_id',
    constraints: false,
    scope: { entity_type: 'user' },
    as: 'userImages',
    onDelete: 'CASCADE'
});
user_1.default.hasMany(notifications_1.default, {
    foreignKey: 'id_user',
    as: 'notifications',
    onDelete: 'CASCADE'
});
user_1.default.hasMany(deliveryAddress_1.default, {
    foreignKey: 'user_id',
    as: 'deliveryAddresses',
    onDelete: 'CASCADE'
});
user_1.default.hasMany(transaction_1.default, {
    foreignKey: 'id_user',
    as: 'userTransactions',
    onDelete: 'CASCADE'
});
transaction_1.default.belongsTo(user_1.default, {
    foreignKey: 'id_user',
    as: 'transactionUser',
    onDelete: 'CASCADE'
});
cart_1.default.hasOne(transaction_1.default, {
    foreignKey: 'id_cart',
    as: 'cartTransaction',
    onDelete: 'CASCADE'
});
transaction_1.default.belongsTo(cart_1.default, {
    foreignKey: 'id_cart',
    as: 'cartInfo',
    onDelete: 'CASCADE'
});
deliveryAddress_1.default.belongsTo(user_1.default, {
    foreignKey: 'user_id',
    as: 'deliveryUser',
    onDelete: 'CASCADE'
});
user_1.default.hasMany(product_1.default, {
    foreignKey: 'id_user',
    as: 'products',
    onDelete: 'CASCADE'
});
product_1.default.belongsTo(user_1.default, {
    foreignKey: 'id_user',
    as: 'user',
    onDelete: 'CASCADE'
});
barter_1.default.belongsTo(product_1.default, {
    foreignKey: 'id_prod_offer',
    as: 'offered_product',
    onDelete: 'CASCADE'
});
barter_1.default.belongsTo(product_1.default, {
    foreignKey: 'id_prod_request',
    as: 'requested_product',
    onDelete: 'CASCADE'
});
barter_1.default.belongsTo(user_1.default, {
    foreignKey: 'id_user_offer',
    as: 'offering_user',
    onDelete: 'CASCADE'
});
barter_1.default.belongsTo(user_1.default, {
    foreignKey: 'id_user_receiving',
    as: 'receiving_user',
    onDelete: 'CASCADE'
});
product_1.default.hasMany(barter_1.default, {
    foreignKey: 'id_prod_offer',
    as: 'offered_barters',
    onDelete: 'CASCADE'
});
product_1.default.hasMany(barter_1.default, {
    foreignKey: 'id_prod_request',
    as: 'requested_barters',
    onDelete: 'CASCADE'
});
user_1.default.hasMany(barter_1.default, {
    foreignKey: 'id_user_offer',
    as: 'offered_barters',
    onDelete: 'CASCADE'
});
user_1.default.hasMany(barter_1.default, {
    foreignKey: 'id_user_receiving',
    as: 'received_barters',
    onDelete: 'CASCADE'
});
product_1.default.hasMany(image_1.default, {
    foreignKey: 'entity_id',
    constraints: false,
    scope: { entity_type: 'product' },
    as: 'productImages',
    onDelete: 'CASCADE'
});
category_1.default.hasMany(image_1.default, {
    foreignKey: 'entity_id',
    constraints: false,
    scope: { entity_type: 'category' },
    as: 'categoryImages',
    onDelete: 'CASCADE'
});
barter_1.default.hasMany(image_1.default, {
    foreignKey: 'entity_id',
    constraints: false,
    scope: { entity_type: 'barter' },
    as: 'barterImages',
    onDelete: 'CASCADE'
});
barter_1.default.belongsTo(deliveryAddress_1.default, {
    foreignKey: 'offer_pickup_address_id',
    as: 'offer_pickup_address',
    onDelete: 'SET NULL'
});
barter_1.default.belongsTo(deliveryAddress_1.default, {
    foreignKey: 'offer_delivery_address_id',
    as: 'offer_delivery_address',
    onDelete: 'SET NULL'
});
barter_1.default.belongsTo(deliveryAddress_1.default, {
    foreignKey: 'request_pickup_address_id',
    as: 'request_pickup_address',
    onDelete: 'SET NULL'
});
barter_1.default.belongsTo(deliveryAddress_1.default, {
    foreignKey: 'request_delivery_address_id',
    as: 'request_delivery_address',
    onDelete: 'SET NULL'
});
deliveryAddress_1.default.hasMany(barter_1.default, {
    foreignKey: 'offer_pickup_address_id',
    as: 'barters_offer_pickup',
    onDelete: 'SET NULL'
});
deliveryAddress_1.default.hasMany(barter_1.default, {
    foreignKey: 'offer_delivery_address_id',
    as: 'barters_offer_delivery',
    onDelete: 'SET NULL'
});
deliveryAddress_1.default.hasMany(barter_1.default, {
    foreignKey: 'request_pickup_address_id',
    as: 'barters_request_pickup',
    onDelete: 'SET NULL'
});
deliveryAddress_1.default.hasMany(barter_1.default, {
    foreignKey: 'request_delivery_address_id',
    as: 'barters_request_delivery',
    onDelete: 'SET NULL'
});
image_1.default.belongsTo(user_1.default, {
    foreignKey: 'entity_id',
    constraints: false,
    as: 'userImage',
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
notifications_1.default.belongsTo(user_1.default, {
    foreignKey: 'id_user',
    as: 'notificationUser',
    onDelete: 'CASCADE'
});
barter_1.default.hasMany(chatMessage_1.default, {
    foreignKey: 'id_barter',
    as: 'barterMessages',
    onDelete: 'CASCADE'
});
chatMessage_1.default.belongsTo(barter_1.default, {
    foreignKey: 'id_barter',
    as: 'barter',
    onDelete: 'CASCADE'
});
product_1.default.hasMany(chatMessage_1.default, {
    foreignKey: 'id_product',
    as: 'productMessages',
    onDelete: 'CASCADE'
});
chatMessage_1.default.belongsTo(product_1.default, {
    foreignKey: 'id_product',
    as: 'product',
    onDelete: 'CASCADE'
});
user_1.default.hasMany(chatMessage_1.default, {
    foreignKey: 'id_user',
    as: 'userMessages',
    onDelete: 'CASCADE'
});
chatMessage_1.default.belongsTo(user_1.default, {
    foreignKey: 'id_user',
    as: 'chatUser',
    onDelete: 'CASCADE'
});
product_1.default.belongsTo(category_1.default, {
    foreignKey: 'id_category',
    as: 'category',
    onDelete: 'SET NULL'
});
product_1.default.hasMany(itemcart_1.default, {
    foreignKey: 'id_product',
    as: 'items_en_carritos',
    onDelete: 'CASCADE'
});
cart_1.default.belongsTo(user_1.default, {
    foreignKey: 'id_user',
    as: 'cartUser',
    onDelete: 'CASCADE'
});
cart_1.default.hasMany(itemcart_1.default, {
    foreignKey: 'id_cart',
    as: 'items',
    onDelete: 'CASCADE'
});
itemcart_1.default.belongsTo(product_1.default, {
    foreignKey: 'id_product',
    as: 'product',
    onDelete: 'CASCADE'
});
itemcart_1.default.belongsTo(cart_1.default, {
    foreignKey: 'id_cart',
    as: 'cart',
    onDelete: 'CASCADE'
});
barter_1.default.hasMany(transaction_1.default, {
    foreignKey: 'id_barter',
    as: 'barterTransactions',
    onDelete: 'CASCADE'
});
transaction_1.default.belongsTo(barter_1.default, {
    foreignKey: 'id_barter',
    as: 'barterInfo',
    onDelete: 'CASCADE'
});
transaction_1.default.hasOne(shipment_tracking_1.default, {
    foreignKey: 'id_transaction',
    as: 'shipment',
    onDelete: 'CASCADE'
});
shipment_tracking_1.default.belongsTo(transaction_1.default, {
    foreignKey: 'id_transaction',
    as: 'transaction',
    onDelete: 'CASCADE'
});
barter_1.default.hasMany(shipment_tracking_1.default, {
    foreignKey: 'id_barter',
    as: 'shipments',
    onDelete: 'CASCADE'
});
shipment_tracking_1.default.belongsTo(barter_1.default, {
    foreignKey: 'id_barter',
    as: 'barter',
    onDelete: 'CASCADE'
});
rating_1.default.hasMany(image_1.default, {
    foreignKey: 'entity_id',
    constraints: false,
    scope: { entity_type: 'rating' },
    as: 'ratingImages',
    onDelete: 'CASCADE'
});
image_1.default.belongsTo(rating_1.default, {
    foreignKey: 'entity_id',
    constraints: false,
    as: 'rating',
    scope: { entity_type: 'rating' }
});
console.log('✅ Asociaciones con CASCADE inicializadas correctamente');
