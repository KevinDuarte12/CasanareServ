import { Model, DataTypes } from 'sequelize';
import sequelize from '../conection';
import cart from './cart';
import users from './user';

interface TransactionAttributes {
    id_transaction?: number;
    id_cart: number;
    id_user: number;
    total_amount: number;
    status?: 'pendiente' | 'completada' | 'fallida' | 'reembolsada';
    reference_payu?: string;
    payment_method?: string;
    transaction_date?: Date;
}

const Transaction = sequelize.define<Model<TransactionAttributes>>('transaction', {
    id_transaction: {
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
    id_user: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: users,
            key: 'id'
        }
    },
    total_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('pendiente', 'completada', 'fallida', 'reembolsada'),
        defaultValue: 'pendiente'
    },
    reference_payu: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    payment_method: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    transaction_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'transactions',
    timestamps: false
});

// Associations
Transaction.belongsTo(cart, {
    foreignKey: 'id_cart',
    as: 'id_cart'
});

Transaction.belongsTo(users, {
    foreignKey: 'id',
    as: 'id'
});

// Add these to their respective models
// cart.hasOne(transaction, {
//     foreignKey: 'id_cart',
//     as: 'transaccion'
// });

// user.hasMany(transaction, {
//     foreignKey: 'id_user',
//     as: 'transacciones'
// });

export default Transaction;