"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const conection_1 = __importDefault(require("../conection"));
const product_1 = __importDefault(require("./product"));
const barter_1 = __importDefault(require("./barter"));
const user_1 = __importDefault(require("./user"));
const Raiting = conection_1.default.define('raitings', {
    id_raiting: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_product: {
        type: sequelize_1.DataTypes.INTEGER,
        references: {
            model: product_1.default,
            key: 'id_product'
        }
    },
    id_barter: {
        type: sequelize_1.DataTypes.INTEGER,
        references: {
            model: barter_1.default,
            key: 'id_barter'
        }
    },
    id_user_rated: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: user_1.default,
            key: 'id'
        }
    },
    id_user_qualifying: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: user_1.default,
            key: 'id'
        }
    },
    score: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
            max: 5
        }
    },
    comment: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    },
    has_images: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false
    }
}, {
    tableName: 'raitings',
    timestamps: true,
    updatedAt: false // Solo queremos createdAt
});
// Associations
Raiting.belongsTo(product_1.default, {
    foreignKey: 'id_product',
    as: 'product'
});
Raiting.belongsTo(barter_1.default, {
    foreignKey: 'id_barter',
    as: 'barter'
});
Raiting.belongsTo(user_1.default, {
    foreignKey: 'id_user_rated',
    as: 'user_rated'
});
Raiting.belongsTo(user_1.default, {
    foreignKey: 'id_user_qualifying',
    as: 'user_qualifying'
});
// Añadir la restricción de que al menos uno de id_product o id_barter debe ser no nulo
Raiting.addHook('beforeValidate', (instance) => {
    if (!instance.id_product && !instance.id_barter) {
        throw new Error('At least one of id_product or id_barter must be provided');
    }
});
exports.default = Raiting;
