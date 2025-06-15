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
 * Modelo de Usuarios
 * Gestiona autenticación, perfiles y información personal de usuarios
 */
const User = conection_1.default.define('users', {
    // Clave primaria
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true, // Se incrementa automáticamente
        primaryKey: true
    },
    // Nombre completo del usuario
    name: {
        type: sequelize_1.DataTypes.STRING, // Texto variable
        allowNull: false // Campo obligatorio
    },
    // Email único para autenticación
    email: {
        type: sequelize_1.DataTypes.STRING, // Texto variable
        allowNull: false, // Campo obligatorio
        unique: true, // No puede haber duplicados
        validate: {
            isEmail: true // Validación de formato de email
        }
    },
    // Contraseña del usuario (se debe hashear antes de guardar)
    password: {
        type: sequelize_1.DataTypes.STRING, // Texto variable
        allowNull: false // Campo obligatorio
    },
    // Rol del usuario con valores predefinidos
    rol: {
        type: sequelize_1.DataTypes.ENUM('usuario', 'admin', 'vendedor'),
        allowNull: false, // Campo obligatorio
        defaultValue: 'usuario' // Por defecto usuario regular
    },
    // Estado activo/inactivo del usuario
    estado: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false, // Campo obligatorio
        defaultValue: false // Por defecto inactivo hasta verificación
    },
    // Control de verificación de email
    isVerified: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false, // Campo obligatorio
        defaultValue: false // Por defecto no verificado
    },
    // Token para verificación de email
    verificationToken: {
        type: sequelize_1.DataTypes.STRING, // Hash de verificación
        allowNull: true // Se genera automáticamente
    },
    // Fecha de expiración del token de verificación
    verificationTokenExpires: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true // Se asigna automáticamente (24 horas)
    },
    // Token para recuperación de contraseña
    passwordResetToken: {
        type: sequelize_1.DataTypes.STRING, // Hash de recuperación
        allowNull: true // Solo cuando se solicita reset
    },
    // Fecha de expiración del token de recuperación
    passwordResetExpires: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true // Solo cuando se solicita reset
    },
    // Tipo de documento de identificación
    document_type: {
        type: sequelize_1.DataTypes.ENUM('CC', 'CE', 'TI', 'PP', 'NIT', 'Otro'),
        allowNull: true // Campo opcional del perfil
    },
    // Número de documento de identificación
    document_number: {
        type: sequelize_1.DataTypes.STRING(30), // Máximo 30 caracteres
        allowNull: true // Campo opcional del perfil
    },
    // Departamento de residencia
    department: {
        type: sequelize_1.DataTypes.STRING(100), // Máximo 100 caracteres
        allowNull: true // Campo opcional del perfil
    },
    // Ciudad de residencia
    city: {
        type: sequelize_1.DataTypes.STRING(100), // Máximo 100 caracteres
        allowNull: true // Campo opcional del perfil
    },
    // Número de teléfono
    phone: {
        type: sequelize_1.DataTypes.STRING(20), // Máximo 20 caracteres
        allowNull: true // Campo opcional del perfil
    }
}, {
    // Hook de validación antes de crear usuario
    hooks: {
        beforeCreate: (user) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                // Verificar si existe un usuario con el mismo correo
                const existingUser = yield User.findOne({
                    where: {
                        email: user.getDataValue('email')
                    }
                });
                if (existingUser) {
                    // Si existe y está verificado, no permitir el registro
                    if (existingUser.getDataValue('isVerified')) {
                        throw new Error('El email ya está registrado y verificado');
                    }
                    // Si existe pero no está verificado, no permitir otro registro
                    else {
                        throw new Error('Ya existe una cuenta con este email pendiente de verificación');
                    }
                }
                // Asegurar estado inicial correcto
                user.setDataValue('isVerified', false); // No verificado inicialmente
                user.setDataValue('estado', false); // Inactivo hasta verificación
                // Generar token de verificación si no existe
                if (!user.getDataValue('verificationToken')) {
                    const crypto = require('crypto');
                    user.setDataValue('verificationToken', crypto.randomBytes(20).toString('hex'));
                }
                // Establecer fecha de expiración del token (24 horas)
                if (!user.getDataValue('verificationTokenExpires')) {
                    user.setDataValue('verificationTokenExpires', new Date(Date.now() + 24 * 60 * 60 * 1000));
                }
            }
            catch (error) {
                throw error; // Propagar el error para manejo en controlador
            }
        })
    },
    // Índices para optimización
    indexes: [
        {
            unique: false, // Índice no único
            fields: ['verificationToken'] // Búsquedas por token de verificación
        },
        {
            unique: false, // Índice no único
            fields: ['document_type', 'document_number'] // Búsquedas por documento
        }
    ]
});
exports.default = User;
