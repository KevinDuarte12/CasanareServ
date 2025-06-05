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

// 🔧 ASOCIACIONES PARA USER CON CASCADE
User.hasMany(Image, {
  foreignKey: 'entity_id',
  constraints: false,
  scope: { entity_type: 'user' },
  as: 'userImages',
  onDelete: 'CASCADE' 
});

User.hasMany(Notification, { 
  foreignKey: 'id_user', 
  as: 'notifications',
  onDelete: 'CASCADE'
});

User.hasMany(DeliveryAddress, { 
  foreignKey: 'user_id', 
  as: 'deliveryAddresses',
  onDelete: 'CASCADE' 
});


User.hasMany(Transaction, { 
  foreignKey: 'id_user', 
  as: 'userTransactions',
  onDelete: 'CASCADE'
});
Transaction.belongsTo(User, { 
  foreignKey: 'id_user', 
  as: 'transactionUser',
  onDelete: 'CASCADE' 
});

Cart.hasOne(Transaction, { 
  foreignKey: 'id_cart', 
  as: 'cartTransaction',
  onDelete: 'CASCADE' 
});
Transaction.belongsTo(Cart, { 
  foreignKey: 'id_cart', 
  as: 'cartInfo',
  onDelete: 'CASCADE' 
}); 


DeliveryAddress.belongsTo(User, { 
  foreignKey: 'user_id', 
  as: 'deliveryUser',
  onDelete: 'CASCADE' 
});


User.hasMany(Product, { 
  foreignKey: 'id_user', 
  as: 'products',
  onDelete: 'CASCADE'
});
Product.belongsTo(User, { 
  foreignKey: 'id_user', 
  as: 'user',
  onDelete: 'CASCADE' 
});


Barter.belongsTo(Product, { 
  foreignKey: 'id_prod_offer', 
  as: 'offered_product',
  onDelete: 'CASCADE' 
});
Barter.belongsTo(Product, { 
  foreignKey: 'id_prod_request', 
  as: 'requested_product',
  onDelete: 'CASCADE' 
});
Barter.belongsTo(User, { 
  foreignKey: 'id_user_offer', 
  as: 'offering_user',
  onDelete: 'CASCADE' 
});
Barter.belongsTo(User, { 
  foreignKey: 'id_user_receiving', 
  as: 'receiving_user',
  onDelete: 'CASCADE' 
});


Product.hasMany(Barter, { 
  foreignKey: 'id_prod_offer', 
  as: 'offered_barters',
  onDelete: 'CASCADE' 
});
Product.hasMany(Barter, { 
  foreignKey: 'id_prod_request', 
  as: 'requested_barters',
  onDelete: 'CASCADE' 
});
User.hasMany(Barter, { 
  foreignKey: 'id_user_offer', 
  as: 'offered_barters',
  onDelete: 'CASCADE' 
});
User.hasMany(Barter, { 
  foreignKey: 'id_user_receiving', 
  as: 'received_barters',
  onDelete: 'CASCADE' 
});


Product.hasMany(Image, {
  foreignKey: 'entity_id',
  constraints: false,
  scope: { entity_type: 'product' },
  as: 'productImages',
  onDelete: 'CASCADE' 
});


Category.hasMany(Image, {
  foreignKey: 'entity_id',
  constraints: false,
  scope: { entity_type: 'category' },
  as: 'categoryImages',
  onDelete: 'CASCADE' 
});


Barter.hasMany(Image, {
  foreignKey: 'entity_id',
  constraints: false,
  scope: { entity_type: 'barter' },
  as: 'barterImages',
  onDelete: 'CASCADE' 
});


Barter.belongsTo(DeliveryAddress, { 
  foreignKey: 'offer_pickup_address_id', 
  as: 'offer_pickup_address',
  onDelete: 'SET NULL' 
});
Barter.belongsTo(DeliveryAddress, { 
  foreignKey: 'offer_delivery_address_id', 
  as: 'offer_delivery_address',
  onDelete: 'SET NULL' 
});
Barter.belongsTo(DeliveryAddress, { 
  foreignKey: 'request_pickup_address_id', 
  as: 'request_pickup_address',
  onDelete: 'SET NULL' 
});
Barter.belongsTo(DeliveryAddress, { 
  foreignKey: 'request_delivery_address_id', 
  as: 'request_delivery_address',
  onDelete: 'SET NULL' 
});


DeliveryAddress.hasMany(Barter, { 
  foreignKey: 'offer_pickup_address_id', 
  as: 'barters_offer_pickup',
  onDelete: 'SET NULL' 
});
DeliveryAddress.hasMany(Barter, { 
  foreignKey: 'offer_delivery_address_id', 
  as: 'barters_offer_delivery',
  onDelete: 'SET NULL' 
});
DeliveryAddress.hasMany(Barter, { 
  foreignKey: 'request_pickup_address_id', 
  as: 'barters_request_pickup',
  onDelete: 'SET NULL' 
});
DeliveryAddress.hasMany(Barter, { 
  foreignKey: 'request_delivery_address_id', 
  as: 'barters_request_delivery',
  onDelete: 'SET NULL' 
});


Image.belongsTo(User, {
  foreignKey: 'entity_id',
  constraints: false,
  as: 'userImage',
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


Notification.belongsTo(User, { 
  foreignKey: 'id_user', 
  as: 'notificationUser',
  onDelete: 'CASCADE' 
});


Barter.hasMany(ChatMessage, { 
  foreignKey: 'id_barter', 
  as: 'barterMessages',
  onDelete: 'CASCADE' 
});
ChatMessage.belongsTo(Barter, { 
  foreignKey: 'id_barter', 
  as: 'barter',
  onDelete: 'CASCADE'
});


Product.hasMany(ChatMessage, { 
  foreignKey: 'id_product', 
  as: 'productMessages',
  onDelete: 'CASCADE' 
});
ChatMessage.belongsTo(Product, { 
  foreignKey: 'id_product', 
  as: 'product',
  onDelete: 'CASCADE' 
});


User.hasMany(ChatMessage, { 
  foreignKey: 'id_user', 
  as: 'userMessages',
  onDelete: 'CASCADE' 
});
ChatMessage.belongsTo(User, { 
  foreignKey: 'id_user', 
  as: 'chatUser',
  onDelete: 'CASCADE' 
});


Product.belongsTo(Category, { 
  foreignKey: 'id_category', 
  as: 'category',
  onDelete: 'SET NULL' 
});
Product.hasMany(ItemCart, {
  foreignKey: 'id_product',
  as: 'items_en_carritos',
  onDelete: 'CASCADE' 
});


Cart.belongsTo(User, {
  foreignKey: 'id_user',
  as: 'cartUser',
  onDelete: 'CASCADE'
});
Cart.hasMany(ItemCart, {
  foreignKey: 'id_cart',
  as: 'items',
  onDelete: 'CASCADE' 
});


ItemCart.belongsTo(Product, { 
  foreignKey: 'id_product',
  as: 'product',
  onDelete: 'CASCADE' 
});
ItemCart.belongsTo(Cart, {
  foreignKey: 'id_cart',
  as: 'cart',
  onDelete: 'CASCADE' 
});


Barter.hasMany(Transaction, { 
  foreignKey: 'id_barter', 
  as: 'barterTransactions',
  onDelete: 'CASCADE' 
});

Transaction.belongsTo(Barter, { 
  foreignKey: 'id_barter', 
  as: 'barterInfo',
  onDelete: 'CASCADE' 
});

Transaction.hasOne(Shipment, { 
  foreignKey: 'id_transaction', 
  as: 'shipment',
  onDelete: 'CASCADE' 
});
Shipment.belongsTo(Transaction, { 
  foreignKey: 'id_transaction', 
  as: 'transaction',
  onDelete: 'CASCADE' 
});

Barter.hasMany(Shipment, { 
  foreignKey: 'id_barter', 
  as: 'shipments',
  onDelete: 'CASCADE' 
});
Shipment.belongsTo(Barter, { 
  foreignKey: 'id_barter', 
  as: 'barter',
  onDelete: 'CASCADE'
});


Raiting.hasMany(Image, {
  foreignKey: 'entity_id',
  constraints: false,
  scope: { entity_type: 'rating' },
  as: 'ratingImages',
  onDelete: 'CASCADE'
});

Image.belongsTo(Raiting, {
  foreignKey: 'entity_id',
  constraints: false,
  as: 'rating',
  scope: { entity_type: 'rating' }

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