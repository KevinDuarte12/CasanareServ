"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const conection_1 = __importDefault(require("../conection"));
class Image extends sequelize_1.Model {
}
Image.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    url: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false
    },
    public_id: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    entity_type: {
        type: sequelize_1.DataTypes.ENUM('user', 'product', 'category', 'barter'),
        allowNull: false
    },
    entity_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false
    },
    is_main: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    sequelize: conection_1.default,
    modelName: 'images',
    tableName: 'images',
    timestamps: true
});
// Definir relaciones polimórficas
// Relación con Product
// Relación con Category
// Relación con Barter si existe
// Image.belongsTo(Barter, {
//   foreignKey: 'entity_id',
//   constraints: false,
//   as: 'barter',
//   scope: {
//     entity_type: 'barter'
//   }
// });
// Índices para mejorar rendimiento en consultas comunes
// sequelize.getQueryInterface().addIndex('images', ['entity_type', 'entity_id']);
// sequelize.getQueryInterface().addIndex('images', ['is_main', 'entity_type', 'entity_id']);
exports.default = Image;
