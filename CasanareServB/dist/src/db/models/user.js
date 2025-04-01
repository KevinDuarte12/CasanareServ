"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Importamos la instancia de sequelize que contiene la conexión a la base de datos
const conection_1 = __importDefault(require("../conection"));
// Importamos DataTypes de sequelize para definir los tipos de datos de las columnas
const sequelize_1 = require("sequelize");
// Definimos el modelo Product con sus campos y tipos de datos
const User = conection_1.default.define('users', {
    id: {
        type: sequelize_1.DataTypes.INTEGER, // Tipo de dato INTEGER
        autoIncrement: true, // Autoincremental
        primaryKey: true // Clave primaria
    },
    username: {
        type: sequelize_1.DataTypes.STRING, // Tipo de dato STRING
        allowNull: false, // No puede ser nulo
        unique: true // Debe ser único
    },
    password: {
        type: sequelize_1.DataTypes.STRING, // Tipo de dato STRING
        allowNull: false, // No puede ser nulo
        unique: true // debe ser unico
    }, email: {
        type: sequelize_1.DataTypes.STRING, // Tipo de dato STRING
        allowNull: false, // No puede ser nulo
        unique: true,
        validate: {
            isEmail: true
        } // Debe ser único
    }
});
exports.default = User;
