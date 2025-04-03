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
        defaultValue: true
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
                const existingUser = yield User.findOne({
                    where: {
                        email: user.getDataValue('email'),
                        isVerified: true
                    }
                });
                if (existingUser) {
                    throw new Error('El email ya está registrado y verificado');
                }
            }
            catch (error) {
                throw error;
            }
        })
    },
    // Opcional: índice para el token de verificación
    indexes: [
        {
            unique: false,
            fields: ['verificationToken']
        }
    ]
});
exports.default = User;
