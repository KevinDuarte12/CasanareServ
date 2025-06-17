import sequelize from "../conection";
import { DataTypes, Model, Op } from "sequelize";
import User from './user';
/**
 * Estructura de datos para direcciones de entrega
 * Define los campos necesarios para gestionar direcciones de envío de usuarios
 */
interface DeliveryAddressAttributes {
    id?: number; // ID único de la dirección
    user_id: number; // Usuario propietario de la dirección
    address_name?: string; // Nombre identificativo (Casa, Oficina, etc.)
    recipient_name: string; // Nombre de quien recibe el envío
    recipient_phone: string; // Teléfono de contacto para entregas
    address_line1: string; // Dirección principal (calle, carrera)
    address_line2?: string; // Información adicional (apto, interior)
    neighborhood?: string; // Barrio o localidad
    city: string; // Ciudad/Municipio
    department: string; // Departamento/Estado
    postal_code?: string; // Código postal
    is_default?: boolean; // Si es la dirección predeterminada
    additional_instructions?: string; // Instrucciones especiales para entrega
}
/**
 * Modelo de Direcciones de Entrega
 * Gestiona las direcciones de envío de productos para cada usuario
 */
const DeliveryAddress = sequelize.define<Model<DeliveryAddressAttributes>>('delivery_addresses', {
    // Clave primaria
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true, // Se incrementa automáticamente
        primaryKey: true
    },
    // Referencia al usuario propietario
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false, // Siempre debe tener un usuario
        references: {
            model: 'users', // Relaciona con tabla users
            key: 'id'
        },
        onDelete: 'CASCADE' // Si se elimina usuario, elimina sus direcciones
    },
    // Nombre identificativo de la dirección
    address_name: {
        type: DataTypes.STRING(50), // Máximo 50 caracteres
        allowNull: true, // Campo opcional
        comment: 'Nombre identificativo de la dirección (ej: "Casa", "Oficina")'
    }, 
    // Información del destinatario
    recipient_name: {
        type: DataTypes.STRING(100), // Máximo 100 caracteres
        allowNull: false, // Campo obligatorio
        comment: 'Nombre de la persona que recibe el envío'
    },
    recipient_phone: {
        type: DataTypes.STRING(20), // Máximo 20 caracteres para número
        allowNull: false, // Campo obligatorio
        comment: 'Teléfono de contacto para entregas'
    },
    // Dirección física
    address_line1: {
        type: DataTypes.STRING(150), // Máximo 150 caracteres
        allowNull: false, // Campo obligatorio
        comment: 'Dirección principal (calle, carrera, etc.)'
    },
    address_line2: {
        type: DataTypes.STRING(150), // Máximo 150 caracteres
        allowNull: true, // Campo opcional
        comment: 'Información adicional (apto, interior, etc.)'
    },
    neighborhood: {
        type: DataTypes.STRING(100), // Máximo 100 caracteres
        allowNull: true, // Campo opcional
        comment: 'Barrio'
    },
    // Ubicación geográfica
    city: {
        type: DataTypes.STRING(100), // Máximo 100 caracteres
        allowNull: false, // Campo obligatorio
        comment: 'Ciudad/Municipio'
    },
    department: {
        type: DataTypes.STRING(100), // Máximo 100 caracteres
        allowNull: false, // Campo obligatorio
        comment: 'Departamento'
    },
    postal_code: {
        type: DataTypes.STRING(10), // Máximo 10 caracteres
        allowNull: true, // Campo opcional
        comment: 'Código postal'
    },
    // Control de dirección predeterminada
    is_default: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false, // Por defecto no es la principal
        comment: 'Indica si es la dirección predeterminada'
    },
    // Instrucciones adicionales
    additional_instructions: {
        type: DataTypes.TEXT, // Texto largo para instrucciones detalladas
        allowNull: true, // Campo opcional
        comment: 'Instrucciones adicionales para el envío'
    }
}, {
    // Hooks para lógica automática
    hooks: {
        // Antes de actualizar una dirección
        beforeUpdate: async (address: any) => {
            // Si se está marcando como predeterminada
            if (address.changed('is_default') && address.getDataValue('is_default')) {
                // Desmarcar todas las otras direcciones del usuario como predeterminadas
                await DeliveryAddress.update(
                    { is_default: false }, // Cambiar a false
                    { 
                        where: { 
                            user_id: address.getDataValue('user_id'), // Del mismo usuario
                            is_default: true, // Que actualmente sean predeterminadas
                            id: { [Op.ne]: address.getDataValue('id') } // Excepto la actual
                        } 
                    }
                );
            }
        }
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
export default DeliveryAddress;