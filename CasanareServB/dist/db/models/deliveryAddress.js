"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const conection_1 = __importDefault(require("../conection"));
const sequelize_1 = require("sequelize");
const DeliveryAddress = conection_1.default.define('delivery_addresses', {
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    user_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    address_name: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: true,
        comment: 'Nombre identificativo de la dirección (ej: "Casa", "Oficina")'
    },
    recipient_name: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
        comment: 'Nombre de la persona que recibe el envío'
    },
    recipient_phone: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: false,
        comment: 'Teléfono de contacto para entregas'
    },
    address_line1: {
        type: sequelize_1.DataTypes.STRING(150),
        allowNull: false,
        comment: 'Dirección principal (calle, carrera, etc.)'
    },
    address_line2: {
        type: sequelize_1.DataTypes.STRING(150),
        allowNull: true,
        comment: 'Información adicional (apto, interior, etc.)'
    },
    neighborhood: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: true,
        comment: 'Barrio'
    },
    city: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
        comment: 'Ciudad/Municipio'
    },
    department: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
        comment: 'Departamento'
    },
    postal_code: {
        type: sequelize_1.DataTypes.STRING(10),
        allowNull: true,
        comment: 'Código postal'
    },
    is_default: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indica si es la dirección predeterminada'
    },
    additional_instructions: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
        comment: 'Instrucciones adicionales para el envío'
    }
}, {
    hooks: {
        beforeCreate: (address) => __awaiter(void 0, void 0, void 0, function* () {
            // Si esta dirección se marca como predeterminada, quitar ese estado de otras direcciones
            if (address.getDataValue('is_default')) {
                yield DeliveryAddress.update({ is_default: false }, {
                    where: {
                        user_id: address.getDataValue('user_id'),
                        is_default: true
                    }
                });
            }
        }),
        beforeUpdate: (address) => __awaiter(void 0, void 0, void 0, function* () {
            // Si se está cambiando a predeterminada, actualizar las otras direcciones
            if (address.changed('is_default') && address.getDataValue('is_default')) {
                yield DeliveryAddress.update({ is_default: false }, {
                    where: {
                        user_id: address.getDataValue('user_id'),
                        is_default: true,
                        id: { [sequelize_1.Op.ne]: address.getDataValue('id') }
                    }
                });
            }
        })
    },
    indexes: [
        {
            name: 'idx_delivery_addresses_user',
            fields: ['user_id']
        },
        {
            name: 'idx_delivery_addresses_default',
            fields: ['user_id', 'is_default']
        }
    ]
});
exports.default = DeliveryAddress;
