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
            key: 'id_product' // Changed to match products table
        }
    },
    id_prod_request: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id_product' // Changed to match products table
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
    estado: {
        type: sequelize_1.DataTypes.ENUM('pendiente', 'aceptado', 'rechazado', 'completado'),
        defaultValue: 'pendiente'
    },
    valor: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    fecha_solicitud: {
        type: sequelize_1.DataTypes.DATE,
        defaultValue: sequelize_1.DataTypes.NOW
    },
    fecha_resolucion: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'barters', // Changed to plural to match migration
    timestamps: true
});
// Associations
barter.belongsTo(product_1.default, {
    foreignKey: 'id_prod_offer',
    as: 'id_prod_offer'
});
barter.belongsTo(product_1.default, {
    foreignKey: 'id_prod_request',
    as: 'pid_prod_request'
});
barter.belongsTo(user_1.default, {
    foreignKey: 'id_user_offer',
    as: 'id_user_offer'
});
barter.belongsTo(user_1.default, {
    foreignKey: 'id_user_receiving',
    as: 'id_user_receiving'
});
exports.default = barter;
