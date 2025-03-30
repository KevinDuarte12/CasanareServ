import { Model, DataTypes } from 'sequelize';
import sequelize from '../conection';
import users from './user';

interface CartAttributes {
    id_cart?: number;
    id_user: number;
    status?: 'activo' | 'comprado' | 'abandonado';
    createdAt?: Date;
}

const Cart = sequelize.define<Model<CartAttributes>>('carts', {
    id_cart: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_user: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: users,
            key: 'id'
        }
    },
    status: {
        type: DataTypes.ENUM('activo', 'comprado', 'abandonado'),
        defaultValue: 'activo'
    }
}, {
    tableName: 'carts',
    timestamps: true,
    updatedAt: false // Solo queremos createdAt
});

// Associations
Cart.belongsTo(users, {
    foreignKey: 'id_user',
    as: 'id'
});

// Add reverse association in user model
// user.hasMany(cart, {
//     foreignKey: 'id_user',
//     as: 'carritos'
// });

export default Cart;