"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const conection_1 = __importDefault(require("../conection"));
/**
 * Modelo de Imágenes
 * Sistema polimórfico para gestionar imágenes de cualquier entidad
 */
class Image extends sequelize_1.Model {
}
// Configuración del modelo en la base de datos
Image.init({
    // Clave primaria
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true // Se incrementa automáticamente
    },
    // URL de la imagen
    url: {
        type: sequelize_1.DataTypes.STRING, // URL completa del archivo
        allowNull: false // Campo obligatorio
    },
    // ID de Cloudinary para gestión
    public_id: {
        type: sequelize_1.DataTypes.STRING, // ID único en el servicio de imágenes
        allowNull: true // Opcional (para URLs externas)
    },
    // Sistema polimórfico: tipo de entidad
    entity_type: {
        type: sequelize_1.DataTypes.ENUM('user', 'product', 'category', 'barter', 'rating'), // Tipos válidos
        allowNull: false // Siempre debe especificar el tipo
    },
    // Sistema polimórfico: ID de la entidad
    entity_id: {
        type: sequelize_1.DataTypes.INTEGER, // ID de la entidad relacionada
        allowNull: false // Siempre debe tener una entidad asociada
    },
    // Control de imagen principal
    is_main: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false // Por defecto no es imagen principal
    },
    // Texto alternativo para accesibilidad
    alt_text: {
        type: sequelize_1.DataTypes.STRING(255), // Máximo 255 caracteres
        allowNull: true // Campo opcional
    }
}, {
    sequelize: conection_1.default,
    modelName: 'images', // Nombre del modelo
    tableName: 'images', // Nombre explícito de la tabla
    timestamps: true, // Habilita createdAt y updatedAt automáticos
    // Índices para optimización
    indexes: [
        {
            name: 'idx_images_entity', // Búsquedas por entidad
            fields: ['entity_type', 'entity_id']
        },
        {
            name: 'idx_images_main', // Búsquedas de imagen principal
            fields: ['entity_type', 'entity_id', 'is_main']
        },
        {
            name: 'idx_images_public_id', // Búsquedas por Cloudinary ID
            fields: ['public_id']
        }
    ]
});
exports.default = Image;
