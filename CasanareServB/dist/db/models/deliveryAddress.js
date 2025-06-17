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
/**
 * Modelo de Direcciones de Entrega
 * Gestiona las direcciones de envío de productos para cada usuario
 */
const DeliveryAddress = conection_1.default.define('delivery_addresses', {
    // Clave primaria
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true, // Se incrementa automáticamente
        primaryKey: true
    },
    // Referencia al usuario propietario
    user_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false, // Siempre debe tener un usuario
        references: {
            model: 'users', // Relaciona con tabla users
            key: 'id'
        },
        onDelete: 'CASCADE' // Si se elimina usuario, elimina sus direcciones
    },
    // Nombre identificativo de la dirección
    address_name: {
        type: sequelize_1.DataTypes.STRING(50), // Máximo 50 caracteres
        allowNull: true, // Campo opcional
        comment: 'Nombre identificativo de la dirección (ej: "Casa", "Oficina")'
    },
    // Información del destinatario
    recipient_name: {
        type: sequelize_1.DataTypes.STRING(100), // Máximo 100 caracteres
        allowNull: false, // Campo obligatorio
        comment: 'Nombre de la persona que recibe el envío'
    },
    recipient_phone: {
        type: sequelize_1.DataTypes.STRING(20), // Máximo 20 caracteres para número
        allowNull: false, // Campo obligatorio
        comment: 'Teléfono de contacto para entregas'
    },
    // Dirección física
    address_line1: {
        type: sequelize_1.DataTypes.STRING(150), // Máximo 150 caracteres
        allowNull: false, // Campo obligatorio
        comment: 'Dirección principal (calle, carrera, etc.)'
    },
    address_line2: {
        type: sequelize_1.DataTypes.STRING(150), // Máximo 150 caracteres
        allowNull: true, // Campo opcional
        comment: 'Información adicional (apto, interior, etc.)'
    },
    neighborhood: {
        type: sequelize_1.DataTypes.STRING(100), // Máximo 100 caracteres
        allowNull: true, // Campo opcional
        comment: 'Barrio'
    },
    // Ubicación geográfica
    city: {
        type: sequelize_1.DataTypes.STRING(100), // Máximo 100 caracteres
        allowNull: false, // Campo obligatorio
        comment: 'Ciudad/Municipio'
    },
    department: {
        type: sequelize_1.DataTypes.STRING(100), // Máximo 100 caracteres
        allowNull: false, // Campo obligatorio
        comment: 'Departamento'
    },
    postal_code: {
        type: sequelize_1.DataTypes.STRING(10), // Máximo 10 caracteres
        allowNull: true, // Campo opcional
        comment: 'Código postal'
    },
    // Control de dirección predeterminada
    is_default: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false, // Por defecto no es la principal
        comment: 'Indica si es la dirección predeterminada'
    },
    // Instrucciones adicionales
    additional_instructions: {
        type: sequelize_1.DataTypes.TEXT, // Texto largo para instrucciones detalladas
        allowNull: true, // Campo opcional
        comment: 'Instrucciones adicionales para el envío'
    }
}, {
    // Hooks para lógica automática
    hooks: {
        // Antes de actualizar una dirección
        beforeUpdate: (address) => __awaiter(void 0, void 0, void 0, function* () {
            // Si se está marcando como predeterminada
            if (address.changed('is_default') && address.getDataValue('is_default')) {
                // Desmarcar todas las otras direcciones del usuario como predeterminadas
                yield DeliveryAddress.update({ is_default: false }, // Cambiar a false
                {
                    where: {
                        user_id: address.getDataValue('user_id'), // Del mismo usuario
                        is_default: true, // Que actualmente sean predeterminadas
                        id: { [sequelize_1.Op.ne]: address.getDataValue('id') } // Excepto la actual
                    }
                });
            }
        })
    },
    // Índices para optimización de consultas
    indexes: [
        {
            name: 'idx_delivery_addresses_user', // Búsquedas por usuario
            fields: ['user_id']
        },
        {
            name: 'idx_delivery_addresses_default', // Búsquedas de dirección predeterminada
            fields: ['user_id', 'is_default']
        }
    ]
});
exports.default = DeliveryAddress;
