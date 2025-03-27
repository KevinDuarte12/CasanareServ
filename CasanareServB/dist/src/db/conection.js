"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const sequelize_1 = require("sequelize");
// Cargar variables de entorno desde el archivo .env
dotenv_1.default.config();
const sequelize = new sequelize_1.Sequelize(process.env.DB_NAME, // Nombre de la base de datos
process.env.DB_USER, // Usuario
process.env.DB_PASSWORD, // Contraseña
{
    host: process.env.DB_HOST, // Host
    port: parseInt(process.env.DB_PORT), // Puerto (convertir a número)
    dialect: 'mysql', // Dialecto (MySQL, PostgreSQL, etc.)
});
// Exportamos la instancia de conexión para usarla en otros archivos
exports.default = sequelize;
