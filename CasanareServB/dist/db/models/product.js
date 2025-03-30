"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const conection_1 = __importDefault(require("../conection"));
const user_1 = __importDefault(require("./user"));
const category_1 = __importDefault(require("./category"));
const Product = conection_1.default.define('products', {
    id_product: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_user: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: user_1.default,
            key: 'id'
        }
    },
    id_category: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: category_1.default,
            key: 'id_category'
        }
    },
    name: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false
    },
    description: {
        type: sequelize_1.DataTypes.TEXT
    },
    price: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('disponible', 'vendido', 'en_trueque'),
        defaultValue: 'disponible'
    },
    allows_barter: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'products',
    timestamps: true
});
Product.belongsTo(user_1.default, { foreignKey: 'id_user', as: 'user' });
Product.belongsTo(category_1.default, { foreignKey: 'id_category', as: 'category' });
exports.default = Product;
