"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const conection_1 = __importDefault(require("../conection"));
const user_1 = __importDefault(require("./user"));
class Notification extends sequelize_1.Model {
}
Notification.init({
    id_notification: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_user: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    type: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false
    },
    title: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false
    },
    message: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false
    },
    entity_type: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false
    },
    entity_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false
    },
    is_read: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    action_url: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true
    },
    created_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW
    },
    updated_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW
    }
}, {
    sequelize: conection_1.default,
    tableName: 'notifications',
    modelName: 'Notification',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});
// Definir asociación con User
Notification.belongsTo(user_1.default, {
    foreignKey: 'id_user',
    as: 'notification_user' // Cambiamos el alias para que sea único
});
exports.default = Notification;
