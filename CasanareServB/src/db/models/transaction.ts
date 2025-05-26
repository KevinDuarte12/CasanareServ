import { Model, DataTypes } from 'sequelize';
import sequelize from '../conection';
import cart from './cart';
import users from './user';
import DeliveryAddress from './deliveryAddress';

export interface TransactionAttributes {
    id_transaction?: number;
    id_cart?: number | null; // Cambia a true para permitir null si es trueque
    id_barter?: number | null; // <-- AGREGADO
    id_user: number;
    total_amount: number;
    status?: 'pendiente' | 'completada' | 'fallida' | 'reembolsada';
    reference_payu?: string;
    payment_method?: string;
    transaction_date?: Date;
    currency?: string;
    payu_transaction_id?: string;
    payu_order_id?: string;
    payu_state?: string;
    payu_response_code?: string;
    payu_response_message?: string;
    delivery_address_id?: number | null;
    buyer_email?: string;
    buyer_name?: string;
    buyer_phone?: string;
    confirmation_received?: boolean;
    response_url?: string;
    signature?: string;
}

const Transaction = sequelize.define<Model<TransactionAttributes>>('transaction', {
    id_transaction: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_cart: {
        type: DataTypes.INTEGER,
        allowNull: true, // Cambia a true para permitir null si es trueque
        references: {
            model: cart,
            key: 'id_cart'
        }
    },
    id_barter: { // <-- AGREGADO
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'barters', // Nombre de la tabla
            key: 'id_barter'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
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
    },
    // Nuevos campos para PayU WebCheckout
    currency: {
        type: DataTypes.STRING(3),
        allowNull: true,
        defaultValue: 'COP'
    },
    payu_transaction_id: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    payu_order_id: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    payu_state: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    payu_response_code: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    payu_response_message: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    delivery_address_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'delivery_addresses', // Nombre de la tabla
            key: 'id'
        }
    },
    buyer_email: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    buyer_name: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    buyer_phone: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    confirmation_received: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    response_url: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    signature: {
        type: DataTypes.STRING(255),
        allowNull: true
    }
}, {
    tableName: 'transactions',
    timestamps: false
});

// Definir las asociaciones
Transaction.belongsTo(DeliveryAddress, {
    foreignKey: 'delivery_address_id',
    as: 'deliveryAddress'
});

export default Transaction;