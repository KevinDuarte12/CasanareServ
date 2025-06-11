import sequelize from "../conection";
import { DataTypes, Model } from "sequelize";
import Image from './image'; // Importar el modelo de imagen

/**
 * Estructura de datos para usuarios del sistema
 * Define los campos necesarios para gestionar usuarios, autenticación y perfil
 */
interface UserAttributes {
    id?: number; // ID único del usuario
    name: string; // Nombre completo del usuario
    email: string; // Email único para autenticación
    password: string; // Contraseña hasheada
    rol?: 'usuario' | 'admin' | 'vendedor'; // Rol del usuario en el sistema
    estado?: boolean; // Estado activo/inactivo del usuario
    isVerified?: boolean; // Si el email fue verificado
    verificationToken?: string; // Token para verificación de email
    verificationTokenExpires?: Date; // Expiración del token de verificación
    passwordResetToken?: string; // Token para recuperación de contraseña
    passwordResetExpires?: Date; // Expiración del token de recuperación
    // Información personal adicional
    document_type?: 'CC' | 'CE' | 'TI' | 'PP' | 'NIT' | 'Otro'; // Tipo de documento
    document_number?: string; // Número de documento
    department?: string; // Departamento de residencia
    city?: string; // Ciudad de residencia
    phone?: string; // Número de teléfono
}

/**
 * Modelo de Usuarios
 * Gestiona autenticación, perfiles y información personal de usuarios
 */
const User = sequelize.define<Model<UserAttributes>>('users', {
    // Clave primaria
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true, // Se incrementa automáticamente
        primaryKey: true
    },
    
    // Nombre completo del usuario
    name: {
        type: DataTypes.STRING, // Texto variable
        allowNull: false // Campo obligatorio
    },
    
    // Email único para autenticación
    email: {
        type: DataTypes.STRING, // Texto variable
        allowNull: false, // Campo obligatorio
        unique: true, // No puede haber duplicados
        validate: {
            isEmail: true // Validación de formato de email
        }
    },
    
    // Contraseña del usuario (se debe hashear antes de guardar)
    password: {
        type: DataTypes.STRING, // Texto variable
        allowNull: false // Campo obligatorio
    },
    
    // Rol del usuario con valores predefinidos
    rol: {
        type: DataTypes.ENUM('usuario', 'admin', 'vendedor'),
        allowNull: false, // Campo obligatorio
        defaultValue: 'usuario' // Por defecto usuario regular
    },
    
    // Estado activo/inactivo del usuario
    estado: {
        type: DataTypes.BOOLEAN,
        allowNull: false, // Campo obligatorio
        defaultValue: false // Por defecto inactivo hasta verificación
    },
    
    // Control de verificación de email
    isVerified: {
        type: DataTypes.BOOLEAN,
        allowNull: false, // Campo obligatorio
        defaultValue: false // Por defecto no verificado
    },
    
    // Token para verificación de email
    verificationToken: {
        type: DataTypes.STRING, // Hash de verificación
        allowNull: true // Se genera automáticamente
    },
    
    // Fecha de expiración del token de verificación
    verificationTokenExpires: {
        type: DataTypes.DATE,
        allowNull: true // Se asigna automáticamente (24 horas)
    },
    
    // Token para recuperación de contraseña
    passwordResetToken: {
        type: DataTypes.STRING, // Hash de recuperación
        allowNull: true // Solo cuando se solicita reset
    },
    
    // Fecha de expiración del token de recuperación
    passwordResetExpires: {
        type: DataTypes.DATE,
        allowNull: true // Solo cuando se solicita reset
    },
    
    // Tipo de documento de identificación
    document_type: {
        type: DataTypes.ENUM('CC', 'CE', 'TI', 'PP', 'NIT', 'Otro'),
        allowNull: true // Campo opcional del perfil
    },
    
    // Número de documento de identificación
    document_number: {
        type: DataTypes.STRING(30), // Máximo 30 caracteres
        allowNull: true // Campo opcional del perfil
    },
    
    // Departamento de residencia
    department: {
        type: DataTypes.STRING(100), // Máximo 100 caracteres
        allowNull: true // Campo opcional del perfil
    },
    
    // Ciudad de residencia
    city: {
        type: DataTypes.STRING(100), // Máximo 100 caracteres
        allowNull: true // Campo opcional del perfil
    },
    
    // Número de teléfono
    phone: {
        type: DataTypes.STRING(20), // Máximo 20 caracteres
        allowNull: true // Campo opcional del perfil
    }
},
{
    // Hook de validación antes de crear usuario
    hooks: {
        beforeCreate: async (user: any) => {
            try {
                // Verificar si existe un usuario con el mismo correo
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
            } catch (error) {
                throw error; // Propagar el error para manejo en controlador
            }
        }
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

export default User;