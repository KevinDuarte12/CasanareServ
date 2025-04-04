import sequelize from "../conection";
import { DataTypes, Model } from "sequelize";

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
        defaultValue: true
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
    }
    // Opcional: para recuperación de contraseña
    // passwordResetToken: {
    //     type: DataTypes.STRING,
    //     allowNull: true
    // },
    // passwordResetExpires: {
    //     type: DataTypes.DATE,
    //     allowNull: true
    // }
}, 
{
    hooks: {
        beforeCreate: async (user: any) => {
            try {
                const existingUser = await User.findOne({
                    where: { 
                        email: user.getDataValue('email'),
                        isVerified: true
                    }
                });
                if (existingUser) {
                    throw new Error('El email ya está registrado y verificado');
                }
            } catch (error) {
                throw error;
            }
        }
    },
    // Opcional: índice para el token de verificación
    indexes: [
        {
            unique: false,
            fields: ['verificationToken']
        }
    ]
    
});

export default User;