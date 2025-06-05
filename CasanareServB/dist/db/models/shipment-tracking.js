"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const conection_1 = __importDefault(require("../conection"));
class Shipment extends sequelize_1.Model {
    constructor() {
        super(...arguments);
        this.carrier = 'servientrega';
        this.status = 'pendiente';
    }
}
Shipment.init({
    id_shipment: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_transaction: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'transactions',
            key: 'id_transaction'
        }
    },
    id_barter: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'barters',
            key: 'id_barter'
        }
    },
    tracking_number: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: true,
        unique: true
    },
    carrier: {
        type: sequelize_1.DataTypes.STRING(50),
        defaultValue: 'servientrega'
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('pendiente', 'en_transito', 'entregado', 'devuelto'),
        defaultValue: 'pendiente'
    },
    sender_address: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    },
    receiver_address: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    },
    estimated_delivery: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true
    },
    actual_delivery: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true
    },
    tracking_events: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
        comment: 'JSON string with tracking events history'
    },
    created_at: {
        type: sequelize_1.DataTypes.DATE,
        defaultValue: sequelize_1.DataTypes.NOW
    },
    updated_at: {
        type: sequelize_1.DataTypes.DATE,
        defaultValue: sequelize_1.DataTypes.NOW
    }
}, {
    sequelize: conection_1.default,
    tableName: 'shipments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});
exports.default = Shipment;
