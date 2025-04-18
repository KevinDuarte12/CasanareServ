import User from './models/user';
import Product from './models/product';
import Category from './models/category';
import Image from './models/image';
// import Barter from './models/barter'; // Si existe

// Definir asociaciones para User
User.hasMany(Image, {
  foreignKey: 'entity_id',
  constraints: false,
  scope: {
    entity_type: 'user'
  },
  as: 'userImages' // ¡Cambiado de 'images' a 'userImages'!
});

// Definir asociaciones para Product
Product.hasMany(Image, {
  foreignKey: 'entity_id',
  constraints: false,
  scope: {
    entity_type: 'product'
  },
  as: 'productImages' // ¡Cambiado de 'images' a 'productImages'!
});

// Definir asociaciones para Category
Category.hasMany(Image, {
  foreignKey: 'entity_id',
  constraints: false,
  scope: {
    entity_type: 'category'
  },
  as: 'categoryImages' // ¡Cambiado de 'images' a 'categoryImages'!
});

// Barter.hasMany(Image, {
//   foreignKey: 'entity_id',
//   constraints: false,
//   scope: {
//     entity_type: 'barter'
//   },
//   as: 'barterImages' // ¡Alias único!
// });

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

// Image.belongsTo(Barter, {
//   foreignKey: 'entity_id',
//   constraints: false,
//   as: 'barter',
//   scope: {
//     entity_type: 'barter'
//   }
// });

console.log('✅ Asociaciones de imágenes inicializadas correctamente');

// Exportar modelos con asociaciones establecidas
export {
  User,
  Product,
  Category,
  Image
  // Barter // Si existe
};