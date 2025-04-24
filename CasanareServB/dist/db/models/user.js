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
const User = conection_1.default.define('users', {
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false
    },
    rol: {
        type: sequelize_1.DataTypes.ENUM('usuario', 'admin', 'vendedor'),
        allowNull: false,
        defaultValue: 'usuario'
    },
    estado: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false // Cambiar a false por defecto
    },
    // Nuevos campos para verificación
    isVerified: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    verificationToken: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    verificationTokenExpires: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true
    },
    // Opcional: para recuperación de contraseña
    passwordResetToken: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    passwordResetExpires: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true
    }
}, {
    hooks: {
        beforeCreate: (user) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                // Verificar si existe un usuario con el mismo correo (verificado o no)
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
                // Asegurarse de que isVerified siempre sea false inicialmente
                user.setDataValue('isVerified', false);
                user.setDataValue('estado', false);
                // Asegurarse de que el token de verificación esté establecido
                if (!user.getDataValue('verificationToken')) {
                    const crypto = require('crypto');
                    user.setDataValue('verificationToken', crypto.randomBytes(20).toString('hex'));
                }
                // Asegurarse de que la fecha de expiración esté establecida
                if (!user.getDataValue('verificationTokenExpires')) {
                    user.setDataValue('verificationTokenExpires', new Date(Date.now() + 24 * 60 * 60 * 1000));
                }
            }
            catch (error) {
                throw error;
            }
        })
    },
    indexes: [
        {
            unique: false,
            fields: ['verificationToken']
        }
    ]
});
exports.default = User;
