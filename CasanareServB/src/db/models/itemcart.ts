import { Model, DataTypes } from 'sequelize';
import sequelize from '../conection';
import Product from './product'; // Importa el modelo Product

interface ItemCartAttributes {
    id_item?: number;
    id_cart: number;
    id_product: number;
    quantity: number;
    price: number;
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
            model: 'carts',
            key: 'id_cart'
        }
    },
    id_product: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id_product'
        }
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    }
}, {
    tableName: 'itemcart',
    timestamps: true
});


// ItemCart.belongsTo(Product, { 
//     foreignKey: 'id_product',
//     as: 'product' 
// });

export default ItemCart;