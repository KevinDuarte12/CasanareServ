import { Model, DataTypes } from 'sequelize';
import sequelize from '../conection';
import products from './product';
import barters from './barter';
import users from './user';

interface RaitingAttributes {
    id_raiting?: number;
    id_product?: number;
    id_barter?: number;
    id_user_rated: number;
    id_user_qualifying: number;
    score: number;
    comment?: string;
    createdAt?: Date;
}

const Raiting = sequelize.define<Model<RaitingAttributes>>('raitings', {
    id_raiting: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_product: {
        type: DataTypes.INTEGER,
        references: {
            model: products,
            key: 'id_product'
        }
    },
    id_barter: {
        type: DataTypes.INTEGER,
        references: {
            model: barters,
            key: 'id_barter'
        }
    },
    id_user_rated: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: users,
            key: 'id'
        }
    },
    id_user_qualifying: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: users,
            key: 'id'
        }
    },
    score: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
            max: 5
        }
    },
    comment: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'raitings',
    timestamps: true,
    updatedAt: false // Solo queremos createdAt
});

// Associations
Raiting.belongsTo(products, {
    foreignKey: 'id_product',
    as: 'product'
});

Raiting.belongsTo(barters, {
    foreignKey: 'id_barter',
    as: 'barter'
});

Raiting.belongsTo(users, {
    foreignKey: 'id_user_rated',
    as: 'user_rated'
});

Raiting.belongsTo(users, {
    foreignKey: 'id_user_qualifying',
    as: 'user_qualifying'
});

// Añadir la restricción de que al menos uno de id_product o id_barter debe ser no nulo
Raiting.addHook('beforeValidate', (instance: any) => {
    if (!instance.id_product && !instance.id_barter) {
        throw new Error('At least one of id_product or id_barter must be provided');
    }
});

export default Raiting;