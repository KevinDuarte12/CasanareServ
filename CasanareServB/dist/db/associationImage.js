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
/**
 * 📋 ARCHIVO DE ASOCIACIONES SEQUELIZE
 * Define todas las relaciones entre modelos del sistema
 * Incluye configuraciones CASCADE y SET NULL según la lógica de negocio
 */
// 👤 ASOCIACIONES DEL MODELO USER
// Usuario puede tener múltiples imágenes de perfil
user_1.default.hasMany(image_1.default, {
    foreignKey: 'entity_id', // Llave foránea polimórfica
    constraints: false, // Sin restricciones de FK
    scope: { entity_type: 'user' }, // Filtro por tipo
    as: 'userImages', // Alias para consultas
    onDelete: 'CASCADE' // Elimina imágenes al eliminar usuario
});
// Usuario recibe múltiples notificaciones
user_1.default.hasMany(notifications_1.default, {
    foreignKey: 'id_user', // Usuario destinatario
    as: 'notifications',
    onDelete: 'CASCADE' // Elimina notificaciones al eliminar usuario
});
// Usuario puede tener múltiples direcciones de entrega
user_1.default.hasMany(deliveryAddress_1.default, {
    foreignKey: 'user_id', // Propietario de la dirección
    as: 'deliveryAddresses',
    onDelete: 'CASCADE' // Elimina direcciones al eliminar usuario
});
// 💳 ASOCIACIONES DE TRANSACCIONES
// Usuario realiza múltiples transacciones
user_1.default.hasMany(transaction_1.default, {
    foreignKey: 'id_user', // Usuario que paga
    as: 'userTransactions',
    onDelete: 'CASCADE' // Elimina transacciones al eliminar usuario
});
// Transacción pertenece a un usuario
transaction_1.default.belongsTo(user_1.default, {
    foreignKey: 'id_user', // Usuario que realiza la transacción
    as: 'transactionUser',
    onDelete: 'CASCADE' // Elimina transacción si se elimina usuario
});
// 🛒 ASOCIACIONES DE CARRITO Y TRANSACCIONES
// Carrito puede generar una transacción
cart_1.default.hasOne(transaction_1.default, {
    foreignKey: 'id_cart', // Carrito que se procesó
    as: 'cartTransaction',
    onDelete: 'CASCADE' // Elimina transacción si se elimina carrito
});
// Transacción puede originarse de un carrito
transaction_1.default.belongsTo(cart_1.default, {
    foreignKey: 'id_cart', // Carrito origen (null si es trueque)
    as: 'cartInfo',
    onDelete: 'CASCADE' // Elimina transacción si se elimina carrito
});
// 📍 ASOCIACIONES DE DIRECCIONES
// Dirección pertenece a un usuario
deliveryAddress_1.default.belongsTo(user_1.default, {
    foreignKey: 'user_id', // Propietario de la dirección
    as: 'deliveryUser',
    onDelete: 'CASCADE' // Elimina dirección si se elimina usuario
});
// 📦 ASOCIACIONES DE PRODUCTOS
// Usuario puede vender múltiples productos
user_1.default.hasMany(product_1.default, {
    foreignKey: 'id_user', // Vendedor del producto
    as: 'products',
    onDelete: 'CASCADE' // Elimina productos al eliminar usuario
});
// Producto pertenece a un vendedor
product_1.default.belongsTo(user_1.default, {
    foreignKey: 'id_user', // Usuario vendedor
    as: 'user',
    onDelete: 'CASCADE' // Elimina producto si se elimina usuario
});
// 🔄 ASOCIACIONES DE TRUEQUES
// Trueque involucra producto ofrecido
barter_1.default.belongsTo(product_1.default, {
    foreignKey: 'id_prod_offer', // Producto que se ofrece
    as: 'offered_product',
    onDelete: 'CASCADE' // Elimina trueque si se elimina producto ofrecido
});
// Trueque involucra producto solicitado
barter_1.default.belongsTo(product_1.default, {
    foreignKey: 'id_prod_request', // Producto que se solicita
    as: 'requested_product',
    onDelete: 'CASCADE' // Elimina trueque si se elimina producto solicitado
});
// Trueque tiene usuario que ofrece
barter_1.default.belongsTo(user_1.default, {
    foreignKey: 'id_user_offer', // Usuario que hace la oferta
    as: 'offering_user',
    onDelete: 'CASCADE' // Elimina trueque si se elimina usuario oferente
});
// Trueque tiene usuario que recibe
barter_1.default.belongsTo(user_1.default, {
    foreignKey: 'id_user_receiving', // Usuario que recibe la oferta
    as: 'receiving_user',
    onDelete: 'CASCADE' // Elimina trueque si se elimina usuario receptor
});
// ASOCIACIONES INVERSAS DE TRUEQUES
// Producto puede ser ofrecido en múltiples trueques
product_1.default.hasMany(barter_1.default, {
    foreignKey: 'id_prod_offer', // Producto como oferta
    as: 'offered_barters',
    onDelete: 'CASCADE' // Elimina trueques si se elimina producto
});
// Producto puede ser solicitado en múltiples trueques
product_1.default.hasMany(barter_1.default, {
    foreignKey: 'id_prod_request', // Producto como solicitud
    as: 'requested_barters',
    onDelete: 'CASCADE' // Elimina trueques si se elimina producto
});
// Usuario puede hacer múltiples ofertas de trueque
user_1.default.hasMany(barter_1.default, {
    foreignKey: 'id_user_offer', // Usuario oferente
    as: 'offered_barters',
    onDelete: 'CASCADE' // Elimina trueques si se elimina usuario
});
// Usuario puede recibir múltiples ofertas de trueque
user_1.default.hasMany(barter_1.default, {
    foreignKey: 'id_user_receiving', // Usuario receptor
    as: 'received_barters',
    onDelete: 'CASCADE' // Elimina trueques si se elimina usuario
});
// 🖼️ ASOCIACIONES POLIMÓRFICAS DE IMÁGENES
// Producto puede tener múltiples imágenes
product_1.default.hasMany(image_1.default, {
    foreignKey: 'entity_id', // ID de la entidad relacionada
    constraints: false, // Sin restricciones FK por ser polimórfico
    scope: { entity_type: 'product' }, // Filtro por tipo producto
    as: 'productImages',
    onDelete: 'CASCADE' // Elimina imágenes al eliminar producto
});
// Categoría puede tener múltiples imágenes
category_1.default.hasMany(image_1.default, {
    foreignKey: 'entity_id', // ID de la entidad relacionada
    constraints: false, // Sin restricciones FK por ser polimórfico
    scope: { entity_type: 'category' }, // Filtro por tipo categoría
    as: 'categoryImages',
    onDelete: 'CASCADE' // Elimina imágenes al eliminar categoría
});
// Trueque puede tener múltiples imágenes
barter_1.default.hasMany(image_1.default, {
    foreignKey: 'entity_id', // ID de la entidad relacionada
    constraints: false, // Sin restricciones FK por ser polimórfico
    scope: { entity_type: 'barter' }, // Filtro por tipo trueque
    as: 'barterImages',
    onDelete: 'CASCADE' // Elimina imágenes al eliminar trueque
});
// 📍 ASOCIACIONES DE TRUEQUES CON DIRECCIONES
// Dirección de recogida para producto ofrecido
barter_1.default.belongsTo(deliveryAddress_1.default, {
    foreignKey: 'offer_pickup_address_id', // Dirección de recogida de oferta
    as: 'offer_pickup_address',
    onDelete: 'SET NULL' // Mantiene trueque si se elimina dirección
});
// Dirección de entrega para producto ofrecido
barter_1.default.belongsTo(deliveryAddress_1.default, {
    foreignKey: 'offer_delivery_address_id', // Dirección de entrega de oferta
    as: 'offer_delivery_address',
    onDelete: 'SET NULL' // Mantiene trueque si se elimina dirección
});
// Dirección de recogida para producto solicitado
barter_1.default.belongsTo(deliveryAddress_1.default, {
    foreignKey: 'request_pickup_address_id', // Dirección de recogida de solicitud
    as: 'request_pickup_address',
    onDelete: 'SET NULL' // Mantiene trueque si se elimina dirección
});
// Dirección de entrega para producto solicitado
barter_1.default.belongsTo(deliveryAddress_1.default, {
    foreignKey: 'request_delivery_address_id', // Dirección de entrega de solicitud
    as: 'request_delivery_address',
    onDelete: 'SET NULL' // Mantiene trueque si se elimina dirección
});
// ASOCIACIONES INVERSAS DE DIRECCIONES CON TRUEQUES
// Dirección usada como recogida de ofertas
deliveryAddress_1.default.hasMany(barter_1.default, {
    foreignKey: 'offer_pickup_address_id', // Trueques que usan esta dirección
    as: 'barters_offer_pickup',
    onDelete: 'SET NULL' // Mantiene dirección si se elimina trueque
});
// Dirección usada como entrega de ofertas
deliveryAddress_1.default.hasMany(barter_1.default, {
    foreignKey: 'offer_delivery_address_id', // Trueques que usan esta dirección
    as: 'barters_offer_delivery',
    onDelete: 'SET NULL' // Mantiene dirección si se elimina trueque
});
// Dirección usada como recogida de solicitudes
deliveryAddress_1.default.hasMany(barter_1.default, {
    foreignKey: 'request_pickup_address_id', // Trueques que usan esta dirección
    as: 'barters_request_pickup',
    onDelete: 'SET NULL' // Mantiene dirección si se elimina trueque
});
// Dirección usada como entrega de solicitudes
deliveryAddress_1.default.hasMany(barter_1.default, {
    foreignKey: 'request_delivery_address_id', // Trueques que usan esta dirección
    as: 'barters_request_delivery',
    onDelete: 'SET NULL' // Mantiene dirección si se elimina trueque
});
// 🖼️ ASOCIACIONES INVERSAS DE IMÁGENES (POLIMÓRFICAS)
// Imagen puede pertenecer a un usuario
image_1.default.belongsTo(user_1.default, {
    foreignKey: 'entity_id', // ID del usuario
    constraints: false, // Sin restricciones por ser polimórfico
    as: 'userImage',
    scope: { entity_type: 'user' } // Solo imágenes de usuarios
});
// Imagen puede pertenecer a un producto
image_1.default.belongsTo(product_1.default, {
    foreignKey: 'entity_id', // ID del producto
    constraints: false, // Sin restricciones por ser polimórfico
    as: 'product',
    scope: { entity_type: 'product' } // Solo imágenes de productos
});
// Imagen puede pertenecer a una categoría
image_1.default.belongsTo(category_1.default, {
    foreignKey: 'entity_id', // ID de la categoría
    constraints: false, // Sin restricciones por ser polimórfico
    as: 'category',
    scope: { entity_type: 'category' } // Solo imágenes de categorías
});
// Imagen puede pertenecer a un trueque
image_1.default.belongsTo(barter_1.default, {
    foreignKey: 'entity_id', // ID del trueque
    constraints: false, // Sin restricciones por ser polimórfico
    as: 'barter',
    scope: { entity_type: 'barter' } // Solo imágenes de trueques
});
// 🔔 ASOCIACIONES DE NOTIFICACIONES
// Notificación pertenece a un usuario
notifications_1.default.belongsTo(user_1.default, {
    foreignKey: 'id_user', // Usuario que recibe la notificación
    as: 'notificationUser',
    onDelete: 'CASCADE' // Elimina notificación si se elimina usuario
});
// 💬 ASOCIACIONES DE MENSAJES DE CHAT
// Trueque puede tener múltiples mensajes de chat
barter_1.default.hasMany(chatMessage_1.default, {
    foreignKey: 'id_barter', // Chat relacionado con trueque
    as: 'barterMessages',
    onDelete: 'CASCADE' // Elimina mensajes si se elimina trueque
});
// Mensaje de chat pertenece a un trueque
chatMessage_1.default.belongsTo(barter_1.default, {
    foreignKey: 'id_barter', // Trueque del cual es el chat
    as: 'barter',
    onDelete: 'CASCADE' // Elimina mensaje si se elimina trueque
});
// Producto puede tener múltiples mensajes de chat
product_1.default.hasMany(chatMessage_1.default, {
    foreignKey: 'id_product', // Chat relacionado con producto
    as: 'productMessages',
    onDelete: 'CASCADE' // Elimina mensajes si se elimina producto
});
// Mensaje de chat pertenece a un producto
chatMessage_1.default.belongsTo(product_1.default, {
    foreignKey: 'id_product', // Producto del cual es el chat
    as: 'product',
    onDelete: 'CASCADE' // Elimina mensaje si se elimina producto
});
// Usuario puede enviar múltiples mensajes de chat
user_1.default.hasMany(chatMessage_1.default, {
    foreignKey: 'id_user', // Usuario que envía el mensaje
    as: 'userMessages',
    onDelete: 'CASCADE' // Elimina mensajes si se elimina usuario
});
// Mensaje de chat pertenece a un usuario
chatMessage_1.default.belongsTo(user_1.default, {
    foreignKey: 'id_user', // Usuario que escribió el mensaje
    as: 'chatUser',
    onDelete: 'CASCADE' // Elimina mensaje si se elimina usuario
});
// 🏷️ ASOCIACIONES DE PRODUCTOS Y CATEGORÍAS
// Producto pertenece a una categoría
product_1.default.belongsTo(category_1.default, {
    foreignKey: 'id_category', // Categoría del producto
    as: 'category',
    onDelete: 'SET NULL' // Mantiene producto si se elimina categoría
});
// Producto puede estar en múltiples carritos
product_1.default.hasMany(itemcart_1.default, {
    foreignKey: 'id_product', // Producto en el carrito
    as: 'items_en_carritos',
    onDelete: 'CASCADE' // Elimina items del carrito si se elimina producto
});
// 🛒 ASOCIACIONES DE CARRITO
// Carrito pertenece a un usuario
cart_1.default.belongsTo(user_1.default, {
    foreignKey: 'id_user', // Propietario del carrito
    as: 'cartUser',
    onDelete: 'CASCADE' // Elimina carrito si se elimina usuario
});
// Carrito contiene múltiples items
cart_1.default.hasMany(itemcart_1.default, {
    foreignKey: 'id_cart', // Items del carrito
    as: 'items',
    onDelete: 'CASCADE' // Elimina items si se elimina carrito
});
// 📋 ASOCIACIONES DE ITEMS DEL CARRITO
// Item del carrito referencia un producto
itemcart_1.default.belongsTo(product_1.default, {
    foreignKey: 'id_product', // Producto en el carrito
    as: 'product',
    onDelete: 'CASCADE' // Elimina item si se elimina producto
});
// Item del carrito pertenece a un carrito
itemcart_1.default.belongsTo(cart_1.default, {
    foreignKey: 'id_cart', // Carrito que contiene el item
    as: 'cart',
    onDelete: 'CASCADE' // Elimina item si se elimina carrito
});
// 💰 ASOCIACIONES DE TRUEQUES Y TRANSACCIONES
// Trueque puede generar múltiples transacciones
barter_1.default.hasMany(transaction_1.default, {
    foreignKey: 'id_barter', // Transacciones relacionadas con trueque
    as: 'barterTransactions',
    onDelete: 'CASCADE' // Elimina transacciones si se elimina trueque
});
// Transacción puede originarse de un trueque
transaction_1.default.belongsTo(barter_1.default, {
    foreignKey: 'id_barter', // Trueque origen (null si es venta)
    as: 'barterInfo',
    onDelete: 'CASCADE' // Elimina transacción si se elimina trueque
});
// 📦 ASOCIACIONES DE ENVÍOS
// Transacción puede tener un envío
transaction_1.default.hasOne(shipment_tracking_1.default, {
    foreignKey: 'id_transaction', // Envío de la transacción
    as: 'shipment',
    onDelete: 'CASCADE' // Elimina envío si se elimina transacción
});
// Envío pertenece a una transacción
shipment_tracking_1.default.belongsTo(transaction_1.default, {
    foreignKey: 'id_transaction', // Transacción del envío
    as: 'transaction',
    onDelete: 'CASCADE' // Elimina envío si se elimina transacción
});
// Trueque puede tener múltiples envíos
barter_1.default.hasMany(shipment_tracking_1.default, {
    foreignKey: 'id_barter', // Envíos del trueque
    as: 'shipments',
    onDelete: 'CASCADE' // Elimina envíos si se elimina trueque
});
// Envío puede originarse de un trueque
shipment_tracking_1.default.belongsTo(barter_1.default, {
    foreignKey: 'id_barter', // Trueque del envío
    as: 'barter',
    onDelete: 'CASCADE' // Elimina envío si se elimina trueque
});
// ⭐ ASOCIACIONES DE CALIFICACIONES E IMÁGENES
// Calificación puede tener múltiples imágenes
rating_1.default.hasMany(image_1.default, {
    foreignKey: 'entity_id', // ID de la calificación
    constraints: false, // Sin restricciones por ser polimórfico
    scope: { entity_type: 'rating' }, // Solo imágenes de calificaciones
    as: 'ratingImages',
    onDelete: 'CASCADE' // Elimina imágenes si se elimina calificación
});
// Imagen puede pertenecer a una calificación
image_1.default.belongsTo(rating_1.default, {
    foreignKey: 'entity_id', // ID de la calificación
    constraints: false, // Sin restricciones por ser polimórfico
    as: 'rating',
    scope: { entity_type: 'rating' } // Solo imágenes de calificaciones
});
console.log('✅ Asociaciones con CASCADE inicializadas correctamente');
