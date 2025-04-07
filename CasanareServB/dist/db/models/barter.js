"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const conection_1 = __importDefault(require("../conection"));
const product_1 = __importDefault(require("./product"));
const user_1 = __importDefault(require("./user"));
const barter = conection_1.default.define('barters', {
    id_barter: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_prod_offer: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id_product'
        }
    },
    id_prod_request: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id_product'
        }
    },
    id_user_offer: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    id_user_receiving: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('pendiente', 'aceptado', 'rechazado', 'completado'),
        defaultValue: 'pendiente'
    },
    value: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    request_date: {
        type: sequelize_1.DataTypes.DATE,
        defaultValue: sequelize_1.DataTypes.NOW
    },
    resolution_date: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'barters',
    timestamps: true
});
// Associations con alias diferentes - ESTO ES LO QUE CAMBIA
barter.belongsTo(product_1.default, {
    foreignKey: 'id_prod_offer',
    as: 'offered_product' // Cambiado de 'id_prod_offer' a 'offered_product'
});
barter.belongsTo(product_1.default, {
    foreignKey: 'id_prod_request',
    as: 'requested_product' // Cambiado de 'pid_prod_request' a 'requested_product'
});
barter.belongsTo(user_1.default, {
    foreignKey: 'id_user_offer',
    as: 'offering_user' // Cambiado de 'id_user_offer' a 'offering_user'
});
barter.belongsTo(user_1.default, {
    foreignKey: 'id_user_receiving',
    as: 'receiving_user' // Cambiado de 'id_user_receiving' a 'receiving_user'
});
exports.default = barter;
