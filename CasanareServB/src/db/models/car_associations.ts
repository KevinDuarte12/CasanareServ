import User from './user';
import Product from './product';
import Category from './category';
import Cart from './cart';
import ItemCart from './itemcart';

const setupAssociations = () => {
  // Asociaciones de Product
  Product.belongsTo(User, { foreignKey: 'id_user', as: 'user' });
  Product.belongsTo(Category, { foreignKey: 'id_category', as: 'category' });
  Product.hasMany(ItemCart, {
    foreignKey: 'id_product',
    as: 'items_en_carritos'
  });

  // Asociaciones de Cart
  Cart.belongsTo(User, {
    foreignKey: 'id_user',
    as: 'user'
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
};

export default setupAssociations;