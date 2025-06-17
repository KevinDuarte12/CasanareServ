"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const conection_1 = __importDefault(require("../conection"));
const user_1 = __importDefault(require("./user"));
/**
 * Modelo de Notificaciones del Sistema
 * Gestiona todas las notificaciones enviadas a usuarios
 */
class Notification extends sequelize_1.Model {
}
Notification.init({
    // Clave primaria
    id_notification: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true // Se incrementa automáticamente
    },
    // Usuario destinatario
    id_user: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false, // Siempre debe tener un destinatario
        references: {
            model: 'users', // Relaciona con tabla users
            key: 'id'
        }
    },
    // Tipo de notificación para categorización
    type: {
        type: sequelize_1.DataTypes.STRING(50), // Máximo 50 caracteres
        allowNull: false // Campo obligatorio
    },
    // Título breve de la notificación
    title: {
        type: sequelize_1.DataTypes.STRING(100), // Máximo 100 caracteres
        allowNull: false // Campo obligatorio
    },
    // Mensaje detallado
    message: {
        type: sequelize_1.DataTypes.TEXT, // Texto largo para contenido extenso
        allowNull: false // Campo obligatorio
    },
    // Tipo de entidad relacionada (sistema polimórfico)
    entity_type: {
        type: sequelize_1.DataTypes.STRING(50), // Máximo 50 caracteres
        allowNull: false // Campo obligatorio
    },
    // ID de la entidad relacionada (sistema polimórfico)
    entity_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false // Campo obligatorio
    },
    // Estado de lectura
    is_read: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false // Por defecto no leída
    },
    // URL opcional para acciones
    action_url: {
        type: sequelize_1.DataTypes.STRING(255), // Máximo 255 caracteres para URL
        allowNull: true // Campo opcional
    },
    // Timestamp de creación personalizado
    created_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW // Se asigna automáticamente
    },
    // Timestamp de actualización personalizado
    updated_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW // Se actualiza automáticamente
    }
}, {
    sequelize: conection_1.default,
    tableName: 'notifications', // Nombre explícito de la tabla
    modelName: 'Notification', // Nombre del modelo
    timestamps: true, // Habilita manejo automático de timestamps
    underscored: true, // Usa snake_case para nombres de campos
    createdAt: 'created_at', // Campo personalizado para fecha de creación
    updatedAt: 'updated_at' // Campo personalizado para fecha de actualización
});
// Relación con el modelo User
Notification.belongsTo(user_1.default, {
    foreignKey: 'id_user', // Clave foránea que conecta con users
    as: 'notification_user' // Alias único para evitar conflictos de nombres
});
exports.default = Notification;
