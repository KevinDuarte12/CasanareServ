import sequelize from "../conection";
import { DataTypes, Model } from "sequelize";
import Image from './image'; // Importar el modelo de imagen

interface UserAttributes {
    id?: number;
    name: string;
    email: string;
    password: string;
    rol?: 'usuario' | 'admin' | 'vendedor';
    estado?: boolean;
    isVerified?: boolean;          // Nuevo campo
    verificationToken?: string;   // Nuevo campo
    verificationTokenExpires?: Date; // Nuevo campo
    passwordResetToken?: string;   // Opcional para futuro
    passwordResetExpires?: Date;   // Opcional para futuro
}

const User = sequelize.define<Model<UserAttributes>>('users', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    rol: {
        type: DataTypes.ENUM('usuario', 'admin', 'vendedor'),
        allowNull: false,
        defaultValue: 'usuario'
    },
    estado: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false // Cambiar a false por defecto
    },
    // Nuevos campos para verificación
    isVerified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    verificationToken: {
        type: DataTypes.STRING,
        allowNull: true
    },
    verificationTokenExpires: {
        type: DataTypes.DATE,
        allowNull: true
    },
    // Opcional: para recuperación de contraseña
    passwordResetToken: {
        type: DataTypes.STRING,
        allowNull: true
    },
    passwordResetExpires: {
        type: DataTypes.DATE,
        allowNull: true
    }
},
{
    hooks: {
        beforeCreate: async (user: any) => {
            try {
                // Verificar si existe un usuario con el mismo correo (verificado o no)
                const existingUser = await User.findOne({
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
            } catch (error) {
                throw error;
            }
        }
    },
    indexes: [
        {
            unique: false,
            fields: ['verificationToken']
        }
    ]
});

export default User;