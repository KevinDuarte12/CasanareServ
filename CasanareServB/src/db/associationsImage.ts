import User from './models/user';
import Product from './models/product';
import Category from './models/category';
import Image from './models/image';
import Barter from './models/barter';
import Notification from './models/notifications';
import DeliveryAddress from './models/deliveryAddress';
import ChatMessage from './models/chatMessage';
import Cart from './models/cart';
import ItemCart from './models/itemcart';
import Transaction from './models/transaction';
import Shipment from './models/shipment-tracking';
import Raiting from './models/rating';

/**
 * 📋 ARCHIVO DE ASOCIACIONES SEQUELIZE
 * Define todas las relaciones entre modelos del sistema
 * Incluye configuraciones CASCADE y SET NULL según la lógica de negocio
 */

// 👤 ASOCIACIONES DEL MODELO USER
// Usuario puede tener múltiples imágenes de perfil
User.hasMany(Image, {
  foreignKey: 'entity_id', // Llave foránea polimórfica
  constraints: false, // Sin restricciones de FK
  scope: { entity_type: 'user' }, // Filtro por tipo
  as: 'userImages', // Alias para consultas
  onDelete: 'CASCADE' // Elimina imágenes al eliminar usuario
});

// Usuario recibe múltiples notificaciones
User.hasMany(Notification, { 
  foreignKey: 'id_user', // Usuario destinatario
  as: 'notifications',
  onDelete: 'CASCADE' // Elimina notificaciones al eliminar usuario
});

// Usuario puede tener múltiples direcciones de entrega
User.hasMany(DeliveryAddress, { 
  foreignKey: 'user_id', // Propietario de la dirección
  as: 'deliveryAddresses',
  onDelete: 'CASCADE' // Elimina direcciones al eliminar usuario
});

// 💳 ASOCIACIONES DE TRANSACCIONES
// Usuario realiza múltiples transacciones
User.hasMany(Transaction, { 
  foreignKey: 'id_user', // Usuario que paga
  as: 'userTransactions',
  onDelete: 'CASCADE' // Elimina transacciones al eliminar usuario
});
// Transacción pertenece a un usuario
Transaction.belongsTo(User, { 
  foreignKey: 'id_user', // Usuario que realiza la transacción
  as: 'transactionUser',
  onDelete: 'CASCADE' // Elimina transacción si se elimina usuario
});

// 🛒 ASOCIACIONES DE CARRITO Y TRANSACCIONES
// Carrito puede generar una transacción
Cart.hasOne(Transaction, { 
  foreignKey: 'id_cart', // Carrito que se procesó
  as: 'cartTransaction',
  onDelete: 'CASCADE' // Elimina transacción si se elimina carrito
});
// Transacción puede originarse de un carrito
Transaction.belongsTo(Cart, { 
  foreignKey: 'id_cart', // Carrito origen (null si es trueque)
  as: 'cartInfo',
  onDelete: 'CASCADE' // Elimina transacción si se elimina carrito
}); 

// 📍 ASOCIACIONES DE DIRECCIONES
// Dirección pertenece a un usuario
DeliveryAddress.belongsTo(User, { 
  foreignKey: 'user_id', // Propietario de la dirección
  as: 'deliveryUser',
  onDelete: 'CASCADE' // Elimina dirección si se elimina usuario
});

// 📦 ASOCIACIONES DE PRODUCTOS
// Usuario puede vender múltiples productos
User.hasMany(Product, { 
  foreignKey: 'id_user', // Vendedor del producto
  as: 'products',
  onDelete: 'CASCADE' // Elimina productos al eliminar usuario
});
// Producto pertenece a un vendedor
Product.belongsTo(User, { 
  foreignKey: 'id_user', // Usuario vendedor
  as: 'user',
  onDelete: 'CASCADE' // Elimina producto si se elimina usuario
});

// 🔄 ASOCIACIONES DE TRUEQUES
// Trueque involucra producto ofrecido
Barter.belongsTo(Product, { 
  foreignKey: 'id_prod_offer', // Producto que se ofrece
  as: 'offered_product',
  onDelete: 'CASCADE' // Elimina trueque si se elimina producto ofrecido
});
// Trueque involucra producto solicitado
Barter.belongsTo(Product, { 
  foreignKey: 'id_prod_request', // Producto que se solicita
  as: 'requested_product',
  onDelete: 'CASCADE' // Elimina trueque si se elimina producto solicitado
});
// Trueque tiene usuario que ofrece
Barter.belongsTo(User, { 
  foreignKey: 'id_user_offer', // Usuario que hace la oferta
  as: 'offering_user',
  onDelete: 'CASCADE' // Elimina trueque si se elimina usuario oferente
});
// Trueque tiene usuario que recibe
Barter.belongsTo(User, { 
  foreignKey: 'id_user_receiving', // Usuario que recibe la oferta
  as: 'receiving_user',
  onDelete: 'CASCADE' // Elimina trueque si se elimina usuario receptor
});

// ASOCIACIONES INVERSAS DE TRUEQUES
// Producto puede ser ofrecido en múltiples trueques
Product.hasMany(Barter, { 
  foreignKey: 'id_prod_offer', // Producto como oferta
  as: 'offered_barters',
  onDelete: 'CASCADE' // Elimina trueques si se elimina producto
});
// Producto puede ser solicitado en múltiples trueques
Product.hasMany(Barter, { 
  foreignKey: 'id_prod_request', // Producto como solicitud
  as: 'requested_barters',
  onDelete: 'CASCADE' // Elimina trueques si se elimina producto
});
// Usuario puede hacer múltiples ofertas de trueque
User.hasMany(Barter, { 
  foreignKey: 'id_user_offer', // Usuario oferente
  as: 'offered_barters',
  onDelete: 'CASCADE' // Elimina trueques si se elimina usuario
});
// Usuario puede recibir múltiples ofertas de trueque
User.hasMany(Barter, { 
  foreignKey: 'id_user_receiving', // Usuario receptor
  as: 'received_barters',
  onDelete: 'CASCADE' // Elimina trueques si se elimina usuario
});

// 🖼️ ASOCIACIONES POLIMÓRFICAS DE IMÁGENES
// Producto puede tener múltiples imágenes
Product.hasMany(Image, {
  foreignKey: 'entity_id', // ID de la entidad relacionada
  constraints: false, // Sin restricciones FK por ser polimórfico
  scope: { entity_type: 'product' }, // Filtro por tipo producto
  as: 'productImages',
  onDelete: 'CASCADE' // Elimina imágenes al eliminar producto
});

// Categoría puede tener múltiples imágenes
Category.hasMany(Image, {
  foreignKey: 'entity_id', // ID de la entidad relacionada
  constraints: false, // Sin restricciones FK por ser polimórfico
  scope: { entity_type: 'category' }, // Filtro por tipo categoría
  as: 'categoryImages',
  onDelete: 'CASCADE' // Elimina imágenes al eliminar categoría
});

// Trueque puede tener múltiples imágenes
Barter.hasMany(Image, {
  foreignKey: 'entity_id', // ID de la entidad relacionada
  constraints: false, // Sin restricciones FK por ser polimórfico
  scope: { entity_type: 'barter' }, // Filtro por tipo trueque
  as: 'barterImages',
  onDelete: 'CASCADE' // Elimina imágenes al eliminar trueque
});

// 📍 ASOCIACIONES DE TRUEQUES CON DIRECCIONES
// Dirección de recogida para producto ofrecido
Barter.belongsTo(DeliveryAddress, { 
  foreignKey: 'offer_pickup_address_id', // Dirección de recogida de oferta
  as: 'offer_pickup_address',
  onDelete: 'SET NULL' // Mantiene trueque si se elimina dirección
});
// Dirección de entrega para producto ofrecido
Barter.belongsTo(DeliveryAddress, { 
  foreignKey: 'offer_delivery_address_id', // Dirección de entrega de oferta
  as: 'offer_delivery_address',
  onDelete: 'SET NULL' // Mantiene trueque si se elimina dirección
});
// Dirección de recogida para producto solicitado
Barter.belongsTo(DeliveryAddress, { 
  foreignKey: 'request_pickup_address_id', // Dirección de recogida de solicitud
  as: 'request_pickup_address',
  onDelete: 'SET NULL' // Mantiene trueque si se elimina dirección
});
// Dirección de entrega para producto solicitado
Barter.belongsTo(DeliveryAddress, { 
  foreignKey: 'request_delivery_address_id', // Dirección de entrega de solicitud
  as: 'request_delivery_address',
  onDelete: 'SET NULL' // Mantiene trueque si se elimina dirección
});

// ASOCIACIONES INVERSAS DE DIRECCIONES CON TRUEQUES
// Dirección usada como recogida de ofertas
DeliveryAddress.hasMany(Barter, { 
  foreignKey: 'offer_pickup_address_id', // Trueques que usan esta dirección
  as: 'barters_offer_pickup',
  onDelete: 'SET NULL' // Mantiene dirección si se elimina trueque
});
// Dirección usada como entrega de ofertas
DeliveryAddress.hasMany(Barter, { 
  foreignKey: 'offer_delivery_address_id', // Trueques que usan esta dirección
  as: 'barters_offer_delivery',
  onDelete: 'SET NULL' // Mantiene dirección si se elimina trueque
});
// Dirección usada como recogida de solicitudes
DeliveryAddress.hasMany(Barter, { 
  foreignKey: 'request_pickup_address_id', // Trueques que usan esta dirección
  as: 'barters_request_pickup',
  onDelete: 'SET NULL' // Mantiene dirección si se elimina trueque
});
// Dirección usada como entrega de solicitudes
DeliveryAddress.hasMany(Barter, { 
  foreignKey: 'request_delivery_address_id', // Trueques que usan esta dirección
  as: 'barters_request_delivery',
  onDelete: 'SET NULL' // Mantiene dirección si se elimina trueque
});

// 🖼️ ASOCIACIONES INVERSAS DE IMÁGENES (POLIMÓRFICAS)
// Imagen puede pertenecer a un usuario
Image.belongsTo(User, {
  foreignKey: 'entity_id', // ID del usuario
  constraints: false, // Sin restricciones por ser polimórfico
  as: 'userImage',
  scope: { entity_type: 'user' } // Solo imágenes de usuarios
});
// Imagen puede pertenecer a un producto
Image.belongsTo(Product, {
  foreignKey: 'entity_id', // ID del producto
  constraints: false, // Sin restricciones por ser polimórfico
  as: 'product',
  scope: { entity_type: 'product' } // Solo imágenes de productos
});
// Imagen puede pertenecer a una categoría
Image.belongsTo(Category, {
  foreignKey: 'entity_id', // ID de la categoría
  constraints: false, // Sin restricciones por ser polimórfico
  as: 'category',
  scope: { entity_type: 'category' } // Solo imágenes de categorías
});
// Imagen puede pertenecer a un trueque
Image.belongsTo(Barter, {
  foreignKey: 'entity_id', // ID del trueque
  constraints: false, // Sin restricciones por ser polimórfico
  as: 'barter',
  scope: { entity_type: 'barter' } // Solo imágenes de trueques
});

// 🔔 ASOCIACIONES DE NOTIFICACIONES
// Notificación pertenece a un usuario
Notification.belongsTo(User, { 
  foreignKey: 'id_user', // Usuario que recibe la notificación
  as: 'notificationUser',
  onDelete: 'CASCADE' // Elimina notificación si se elimina usuario
});

// 💬 ASOCIACIONES DE MENSAJES DE CHAT
// Trueque puede tener múltiples mensajes de chat
Barter.hasMany(ChatMessage, { 
  foreignKey: 'id_barter', // Chat relacionado con trueque
  as: 'barterMessages',
  onDelete: 'CASCADE' // Elimina mensajes si se elimina trueque
});
// Mensaje de chat pertenece a un trueque
ChatMessage.belongsTo(Barter, { 
  foreignKey: 'id_barter', // Trueque del cual es el chat
  as: 'barter',
  onDelete: 'CASCADE' // Elimina mensaje si se elimina trueque
});

// Producto puede tener múltiples mensajes de chat
Product.hasMany(ChatMessage, { 
  foreignKey: 'id_product', // Chat relacionado con producto
  as: 'productMessages',
  onDelete: 'CASCADE' // Elimina mensajes si se elimina producto
});
// Mensaje de chat pertenece a un producto
ChatMessage.belongsTo(Product, { 
  foreignKey: 'id_product', // Producto del cual es el chat
  as: 'product',
  onDelete: 'CASCADE' // Elimina mensaje si se elimina producto
});

// Usuario puede enviar múltiples mensajes de chat
User.hasMany(ChatMessage, { 
  foreignKey: 'id_user', // Usuario que envía el mensaje
  as: 'userMessages',
  onDelete: 'CASCADE' // Elimina mensajes si se elimina usuario
});
// Mensaje de chat pertenece a un usuario
ChatMessage.belongsTo(User, { 
  foreignKey: 'id_user', // Usuario que escribió el mensaje
  as: 'chatUser',
  onDelete: 'CASCADE' // Elimina mensaje si se elimina usuario
});

// 🏷️ ASOCIACIONES DE PRODUCTOS Y CATEGORÍAS
// Producto pertenece a una categoría
Product.belongsTo(Category, { 
  foreignKey: 'id_category', // Categoría del producto
  as: 'category',
  onDelete: 'SET NULL' // Mantiene producto si se elimina categoría
});
// Producto puede estar en múltiples carritos
Product.hasMany(ItemCart, {
  foreignKey: 'id_product', // Producto en el carrito
  as: 'items_en_carritos',
  onDelete: 'CASCADE' // Elimina items del carrito si se elimina producto
});

// 🛒 ASOCIACIONES DE CARRITO
// Carrito pertenece a un usuario
Cart.belongsTo(User, {
  foreignKey: 'id_user', // Propietario del carrito
  as: 'cartUser',
  onDelete: 'CASCADE' // Elimina carrito si se elimina usuario
});
// Carrito contiene múltiples items
Cart.hasMany(ItemCart, {
  foreignKey: 'id_cart', // Items del carrito
  as: 'items',
  onDelete: 'CASCADE' // Elimina items si se elimina carrito
});

// 📋 ASOCIACIONES DE ITEMS DEL CARRITO
// Item del carrito referencia un producto
ItemCart.belongsTo(Product, { 
  foreignKey: 'id_product', // Producto en el carrito
  as: 'product',
  onDelete: 'CASCADE' // Elimina item si se elimina producto
});
// Item del carrito pertenece a un carrito
ItemCart.belongsTo(Cart, {
  foreignKey: 'id_cart', // Carrito que contiene el item
  as: 'cart',
  onDelete: 'CASCADE' // Elimina item si se elimina carrito
});

// 💰 ASOCIACIONES DE TRUEQUES Y TRANSACCIONES
// Trueque puede generar múltiples transacciones
Barter.hasMany(Transaction, { 
  foreignKey: 'id_barter', // Transacciones relacionadas con trueque
  as: 'barterTransactions',
  onDelete: 'CASCADE' // Elimina transacciones si se elimina trueque
});
// Transacción puede originarse de un trueque
Transaction.belongsTo(Barter, { 
  foreignKey: 'id_barter', // Trueque origen (null si es venta)
  as: 'barterInfo',
  onDelete: 'CASCADE' // Elimina transacción si se elimina trueque
});

// 📦 ASOCIACIONES DE ENVÍOS
// Transacción puede tener un envío
Transaction.hasOne(Shipment, { 
  foreignKey: 'id_transaction', // Envío de la transacción
  as: 'shipment',
  onDelete: 'CASCADE' // Elimina envío si se elimina transacción
});
// Envío pertenece a una transacción
Shipment.belongsTo(Transaction, { 
  foreignKey: 'id_transaction', // Transacción del envío
  as: 'transaction',
  onDelete: 'CASCADE' // Elimina envío si se elimina transacción
});

// Trueque puede tener múltiples envíos
Barter.hasMany(Shipment, { 
  foreignKey: 'id_barter', // Envíos del trueque
  as: 'shipments',
  onDelete: 'CASCADE' // Elimina envíos si se elimina trueque
});
// Envío puede originarse de un trueque
Shipment.belongsTo(Barter, { 
  foreignKey: 'id_barter', // Trueque del envío
  as: 'barter',
  onDelete: 'CASCADE' // Elimina envío si se elimina trueque
});

// ⭐ ASOCIACIONES DE CALIFICACIONES E IMÁGENES
// Calificación puede tener múltiples imágenes
Raiting.hasMany(Image, {
  foreignKey: 'entity_id', // ID de la calificación
  constraints: false, // Sin restricciones por ser polimórfico
  scope: { entity_type: 'rating' }, // Solo imágenes de calificaciones
  as: 'ratingImages',
  onDelete: 'CASCADE' // Elimina imágenes si se elimina calificación
});

// Imagen puede pertenecer a una calificación
Image.belongsTo(Raiting, {
  foreignKey: 'entity_id', // ID de la calificación
  constraints: false, // Sin restricciones por ser polimórfico
  as: 'rating',
  scope: { entity_type: 'rating' } // Solo imágenes de calificaciones
});

console.log('✅ Asociaciones con CASCADE inicializadas correctamente');

export {
  User,
  Product,
  Category,
  Image,
  Barter,
  DeliveryAddress,
  ChatMessage,
  Cart,
  ItemCart,
  Transaction,
  Shipment,
  Raiting
};