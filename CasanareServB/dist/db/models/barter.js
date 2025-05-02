"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const conection_1 = __importDefault(require("../conection"));
const product_1 = __importDefault(require("./product"));
const user_1 = __importDefault(require("./user"));
// Extender la clase Model con la interfaz de atributos
class Barter extends sequelize_1.Model {
}
Barter.init({
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
        allowNull: true,
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
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('pendiente', 'aceptado', 'rechazado', 'completado', 'disponible'),
        defaultValue: 'pendiente'
    },
    value: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    request_date: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW
    },
    resolution_date: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true
    },
    notes: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    }
}, {
    sequelize: conection_1.default,
    modelName: 'barter',
    tableName: 'barters'
});
// Definir las asociaciones
Barter.belongsTo(product_1.default, { foreignKey: 'id_prod_offer', as: 'offered_product' });
Barter.belongsTo(product_1.default, { foreignKey: 'id_prod_request', as: 'requested_product' });
Barter.belongsTo(user_1.default, { foreignKey: 'id_user_offer', as: 'offering_user' });
Barter.belongsTo(user_1.default, { foreignKey: 'id_user_receiving', as: 'receiving_user' });
exports.default = Barter;
