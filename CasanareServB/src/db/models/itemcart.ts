import { Model, DataTypes } from 'sequelize';
import sequelize from '../conection';
import cart from './cart';
import products from './product';

interface ItemCartAttributes {
    id_item?: number;
    id_cart: number;
    id_product: number;
    quantity: number;
    unit_price: number;
}

const ItemCart = sequelize.define<Model<ItemCartAttributes>>('itemcart', {
    id_item: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_cart: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: cart,
            key: 'id_cart'
        }
    },
    id_product: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: products,
            key: 'id_product'
        }
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },
    unit_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    }
}, {
    tableName: 'itemscart',
    timestamps: false
});

// Associations
ItemCart.belongsTo(cart, {
    foreignKey: 'id_cart',
    as: 'id_cart'
});

ItemCart.belongsTo(products, {
    foreignKey: 'id_product',
    as: 'id_product'
});

// Add these to their respective models
// cart.hasMany(itemcart, {
//     foreignKey: 'id_cart',
//     as: 'items'
// });

// product.hasMany(itemcart, {
//     foreignKey: 'id_product',
//     as: 'items_en_carritos'
// });

export default ItemCart;