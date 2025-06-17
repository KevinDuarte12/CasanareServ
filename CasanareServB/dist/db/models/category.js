"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const conection_1 = __importDefault(require("../conection"));
/**
 * Modelo de Categorías
 * Gestiona la clasificación y organización de productos
 */
const Category = conection_1.default.define('categories', {
    // Clave primaria
    id_category: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true // Se incrementa automáticamente
    },
    // Nombre de la categoría
    name: {
        type: sequelize_1.DataTypes.STRING(50), // Máximo 50 caracteres
        allowNull: false // Campo obligatorio
    },
    // Descripción detallada de la categoría
    description: {
        type: sequelize_1.DataTypes.TEXT, // Texto largo para descripciones extensas
        allowNull: true // Campo opcional
    },
    // Imagen principal de la categoría
    image: {
        type: sequelize_1.DataTypes.STRING(255), // URL o path de imagen (máximo 255 chars)
        allowNull: true // Campo opcional
    },
    // Estado de la categoría
    status: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: true // Por defecto las categorías están activas
    }
}, {
    tableName: 'categories', // Nombre explícito de la tabla
    timestamps: true // Habilita createdAt y updatedAt automáticos
});
exports.default = Category;
