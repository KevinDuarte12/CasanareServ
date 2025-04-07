import { Model, DataTypes } from 'sequelize';
import sequelize from '../conection';
import products from './product';
import users from './user';

interface BarterAttributes {
    id_barter?: number;
    id_prod_offer: number;
    id_prod_request: number;
    id_user_offer: number;
    id_user_receiving: number;
    status?: 'pendiente' | 'aceptado' | 'rechazado' | 'completado';
    value?: number;
    request_date?: Date;
    resolution_date?: Date;
}

const barter = sequelize.define<Model<BarterAttributes>>('barters', {
    id_barter: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_prod_offer: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id_product'
        }
    },
    id_prod_request: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id_product'
        }
    },
    id_user_offer: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    id_user_receiving: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    status: {
        type: DataTypes.ENUM('pendiente', 'aceptado', 'rechazado', 'completado'),
        defaultValue: 'pendiente'
    },
    value: {
        type: DataTypes.DECIMAL(10,2),
        allowNull: true
    },
    request_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    resolution_date: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'barters',
    timestamps: true
});

// Associations con alias diferentes - ESTO ES LO QUE CAMBIA
barter.belongsTo(products, {
    foreignKey: 'id_prod_offer',
    as: 'offered_product'  // Cambiado de 'id_prod_offer' a 'offered_product'
});

barter.belongsTo(products, {
    foreignKey: 'id_prod_request',
    as: 'requested_product'  // Cambiado de 'pid_prod_request' a 'requested_product'
});

barter.belongsTo(users, {
    foreignKey: 'id_user_offer',
    as: 'offering_user'  // Cambiado de 'id_user_offer' a 'offering_user'
});

barter.belongsTo(users, {
    foreignKey: 'id_user_receiving',
    as: 'receiving_user'  // Cambiado de 'id_user_receiving' a 'receiving_user'
});

export default barter;