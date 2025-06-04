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

// Asociaciones para User
User.hasMany(Image, {
  foreignKey: 'entity_id',
  constraints: false,
  scope: { entity_type: 'user' },
  as: 'userImages'
});
User.hasMany(Notification, { foreignKey: 'id_user', as: 'notifications' });
User.hasMany(DeliveryAddress, { foreignKey: 'user_id', as: 'deliveryAddresses' });

// Asociaciones para Transaction con User y Cart
User.hasMany(Transaction, { foreignKey: 'id_user', as: 'userTransactions' });
Transaction.belongsTo(User, { foreignKey: 'id_user', as: 'transactionUser' });
Cart.hasOne(Transaction, { foreignKey: 'id_cart', as: 'cartTransaction' });
Transaction.belongsTo(Cart, { foreignKey: 'id_cart', as: 'cartInfo' }); 

// Nota: Las asociaciones internas de Transaction se mantienen en su propio archivo
// Solo asegúrate de corregir las que tienen el error

// Asociación inversa para direcciones de entrega (alias único)
DeliveryAddress.belongsTo(User, { foreignKey: 'user_id', as: 'deliveryUser' }); // alias único

// Asociación User <-> Product
User.hasMany(Product, { foreignKey: 'id_user', as: 'products' });
Product.belongsTo(User, { foreignKey: 'id_user', as: 'user' }); // SOLO aquí 'user'

// AÑADIR ESTAS ASOCIACIONES DE BARTER CON PRODUCT Y USER
// Estas son las asociaciones críticas que estaban faltando
Barter.belongsTo(Product, { foreignKey: 'id_prod_offer', as: 'offered_product' });
Barter.belongsTo(Product, { foreignKey: 'id_prod_request', as: 'requested_product' });
Barter.belongsTo(User, { foreignKey: 'id_user_offer', as: 'offering_user' });
Barter.belongsTo(User, { foreignKey: 'id_user_receiving', as: 'receiving_user' });

// Asociaciones inversas de Product y User a Barter
Product.hasMany(Barter, { foreignKey: 'id_prod_offer', as: 'offered_barters' });
Product.hasMany(Barter, { foreignKey: 'id_prod_request', as: 'requested_barters' });
User.hasMany(Barter, { foreignKey: 'id_user_offer', as: 'offered_barters' });
User.hasMany(Barter, { foreignKey: 'id_user_receiving', as: 'received_barters' });

// Asociaciones para Product
Product.hasMany(Image, {
  foreignKey: 'entity_id',
  constraints: false,
  scope: { entity_type: 'product' },
  as: 'productImages'
});

// Asociaciones para Category
Category.hasMany(Image, {
  foreignKey: 'entity_id',
  constraints: false,
  scope: { entity_type: 'category' },
  as: 'categoryImages'
});

// Asociaciones para imágenes de Barter
Barter.hasMany(Image, {
  foreignKey: 'entity_id',
  constraints: false,
  scope: { entity_type: 'barter' },
  as: 'barterImages'
});

// Asociaciones de Barter con DeliveryAddress
Barter.belongsTo(DeliveryAddress, { foreignKey: 'offer_pickup_address_id', as: 'offer_pickup_address' });
Barter.belongsTo(DeliveryAddress, { foreignKey: 'offer_delivery_address_id', as: 'offer_delivery_address' });
Barter.belongsTo(DeliveryAddress, { foreignKey: 'request_pickup_address_id', as: 'request_pickup_address' });
Barter.belongsTo(DeliveryAddress, { foreignKey: 'request_delivery_address_id', as: 'request_delivery_address' });

// Asociaciones inversas (opcionales pero recomendadas para consistencia)
DeliveryAddress.hasMany(Barter, { foreignKey: 'offer_pickup_address_id', as: 'barters_offer_pickup' });
DeliveryAddress.hasMany(Barter, { foreignKey: 'offer_delivery_address_id', as: 'barters_offer_delivery' });
DeliveryAddress.hasMany(Barter, { foreignKey: 'request_pickup_address_id', as: 'barters_request_pickup' });
DeliveryAddress.hasMany(Barter, { foreignKey: 'request_delivery_address_id', as: 'barters_request_delivery' });

// Asociaciones inversas para Image (alias únicos)
Image.belongsTo(User, {
  foreignKey: 'entity_id',
  constraints: false,
  as: 'userImage', // alias único
  scope: { entity_type: 'user' }
});
Image.belongsTo(Product, {
  foreignKey: 'entity_id',
  constraints: false,
  as: 'product',
  scope: { entity_type: 'product' }
});
Image.belongsTo(Category, {
  foreignKey: 'entity_id',
  constraints: false,
  as: 'category',
  scope: { entity_type: 'category' }
});
Image.belongsTo(Barter, {
  foreignKey: 'entity_id',
  constraints: false,
  as: 'barter',
  scope: { entity_type: 'barter' }
});

// Notification inversa (alias único)
Notification.belongsTo(User, { foreignKey: 'id_user', as: 'notificationUser' }); // alias único

// Chat para trueques
Barter.hasMany(ChatMessage, { foreignKey: 'id_barter', as: 'barterMessages' });
ChatMessage.belongsTo(Barter, { foreignKey: 'id_barter', as: 'barter' });

// Chat para productos
Product.hasMany(ChatMessage, { foreignKey: 'id_product', as: 'productMessages' });
ChatMessage.belongsTo(Product, { foreignKey: 'id_product', as: 'product' });

// Relación con usuario en ChatMessage (usa alias único)
User.hasMany(ChatMessage, { foreignKey: 'id_user', as: 'userMessages' });
ChatMessage.belongsTo(User, { foreignKey: 'id_user', as: 'chatUser' }); // <-- alias único

// Asociaciones de Product con ItemCart y Category
Product.belongsTo(Category, { foreignKey: 'id_category', as: 'category' });
Product.hasMany(ItemCart, {
  foreignKey: 'id_product',
  as: 'items_en_carritos'
});

// Asociaciones de Cart
Cart.belongsTo(User, {
  foreignKey: 'id_user',
  as: 'cartUser' // alias único, NO 'user'
});
Cart.hasMany(ItemCart, {
  foreignKey: 'id_cart',
  as: 'items'
});

// Asociaciones de ItemCart
ItemCart.belongsTo(Product, { 
  foreignKey: 'id_product',
  as: 'product'
});
ItemCart.belongsTo(Cart, {
  foreignKey: 'id_cart',
  as: 'cart'
});

// === ASOCIACIONES TRANSACTION-BARTER ===
// Un barter puede tener múltiples transacciones (ambos usuarios pagan)
Barter.hasMany(Transaction, { 
  foreignKey: 'id_barter', 
  as: 'barterTransactions' 
});

// Una transacción pertenece a un barter específico
Transaction.belongsTo(Barter, { 
  foreignKey: 'id_barter', 
  as: 'barterInfo' 
});

// Asociaciones para Shipments
Transaction.hasOne(Shipment, { foreignKey: 'id_transaction', as: 'shipment' });
Shipment.belongsTo(Transaction, { foreignKey: 'id_transaction', as: 'transaction' });

Barter.hasMany(Shipment, { foreignKey: 'id_barter', as: 'shipments' });
Shipment.belongsTo(Barter, { foreignKey: 'id_barter', as: 'barter' });

// Agregar estas asociaciones para Rating:

// Asociaciones para imágenes de Rating/Reseñas
Raiting.hasMany(Image, {
  foreignKey: 'entity_id',
  constraints: false,
  scope: { entity_type: 'rating' },
  as: 'ratingImages'
});

// Asociación inversa
Image.belongsTo(Raiting, {
  foreignKey: 'entity_id',
  constraints: false,
  as: 'rating',
  scope: { entity_type: 'rating' }
});

console.log('✅ Asociaciones inicializadas correctamente');

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
  Shipment
};