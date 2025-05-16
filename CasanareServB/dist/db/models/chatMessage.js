"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const conection_1 = __importDefault(require("../conection"));
// Define la clase del modelo con los tipos correctos
class ChatMessage extends sequelize_1.Model {
}
ChatMessage.init({
    id_message: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_product: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true
    },
    id_barter: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true
    },
    id_user: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false
    },
    message: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    },
    image_url: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    sent_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW
    },
    is_read: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
}, {
    sequelize: conection_1.default,
    modelName: 'ChatMessage',
    tableName: 'chat_messages',
    timestamps: false
});
exports.default = ChatMessage;
