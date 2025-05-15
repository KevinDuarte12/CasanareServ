"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const conection_1 = __importDefault(require("../conection"));
const ChatMessage = conection_1.default.define('chat_message', {
    id_message: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    id_barter: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'barters', key: 'id_barter' }
    },
    id_product: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'products', key: 'id_product' }
    },
    id_user: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' }
    },
    message: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    image_url: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    sent_at: {
        type: sequelize_1.DataTypes.DATE,
        defaultValue: sequelize_1.DataTypes.NOW,
    }
}, {
    tableName: 'chat_messages',
    timestamps: false,
});
exports.default = ChatMessage;
