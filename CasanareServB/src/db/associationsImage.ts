import User from './models/user';
import Product from './models/product';
import Category from './models/category';
import Image from './models/image';
import Barter from './models/barter';
import Notification from './models/notifications';
import DeliveryAddress from './models/deliveryAddress'; // Importar el nuevo modelo

// Definir asociaciones para User
User.hasMany(Image, {
  foreignKey: 'entity_id',
  constraints: false,
  scope: {
    entity_type: 'user'
  },
  as: 'userImages'
});

User.hasMany(Notification, { 
  foreignKey: 'id_user',
  as: 'notifications'
});

// Nueva asociación para direcciones de entrega
User.hasMany(DeliveryAddress, {
  foreignKey: 'user_id',
  as: 'deliveryAddresses'
});

// Asociación inversa para direcciones de entrega
DeliveryAddress.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// Definir asociaciones para Product
Product.hasMany(Image, {
  foreignKey: 'entity_id',
  constraints: false,
  scope: {
    entity_type: 'product'
  },
  as: 'productImages'
});

// Definir asociaciones para Category
Category.hasMany(Image, {
  foreignKey: 'entity_id',
  constraints: false,
  scope: {
    entity_type: 'category'
  },
  as: 'categoryImages'
});

// Asociaciones para imágenes de Barter (mantener solo esta)
Barter.hasMany(Image, {
    foreignKey: 'entity_id',
    constraints: false,
    scope: {
        entity_type: 'barter'
    },
    as: 'barterImages'
});

// Definir asociaciones inversas para Image
Image.belongsTo(User, {
  foreignKey: 'entity_id',
  constraints: false,
  as: 'user',
  scope: {
    entity_type: 'user'
  }
});

Image.belongsTo(Product, {
  foreignKey: 'entity_id',
  constraints: false,
  as: 'product',
  scope: {
    entity_type: 'product'
  }
});

Image.belongsTo(Category, {
  foreignKey: 'entity_id',
  constraints: false,
  as: 'category',
  scope: {
    entity_type: 'category'
  }
});

// Add inverse relationship
Image.belongsTo(Barter, {
    foreignKey: 'entity_id',
    constraints: false,
    as: 'barter',
    scope: {
        entity_type: 'barter'
    }
});

Notification.belongsTo(User, { 
  foreignKey: 'id_user',
  as: 'user'
});

console.log('✅ Asociaciones inicializadas correctamente');

// Exportar modelos con asociaciones establecidas
export {
    User,
    Product,
    Category,
    Image,
    Barter,
    DeliveryAddress  // Añadir a las exportaciones
};