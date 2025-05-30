import sequelize from "../conection";
import { DataTypes, Model, Op } from "sequelize";
import User from './user';

interface DeliveryAddressAttributes {
    id?: number;
    user_id: number;
    address_name?: string;
    recipient_name: string;
    recipient_phone: string;
    address_line1: string;
    address_line2?: string;
    neighborhood?: string;
    city: string;
    department: string;
    postal_code?: string;
    is_default?: boolean;
    additional_instructions?: string;
}

const DeliveryAddress = sequelize.define<Model<DeliveryAddressAttributes>>('delivery_addresses', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    address_name: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Nombre identificativo de la dirección (ej: "Casa", "Oficina")'
    },
    recipient_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Nombre de la persona que recibe el envío'
    },
    recipient_phone: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: 'Teléfono de contacto para entregas'
    },
    address_line1: {
        type: DataTypes.STRING(150),
        allowNull: false,
        comment: 'Dirección principal (calle, carrera, etc.)'
    },
    address_line2: {
        type: DataTypes.STRING(150),
        allowNull: true,
        comment: 'Información adicional (apto, interior, etc.)'
    },
    neighborhood: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Barrio'
    },
    city: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Ciudad/Municipio'
    },
    department: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Departamento'
    },
    postal_code: {
        type: DataTypes.STRING(10),
        allowNull: true,
        comment: 'Código postal'
    },
    is_default: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indica si es la dirección predeterminada'
    },
    additional_instructions: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Instrucciones adicionales para el envío'
    }
}, {
    hooks: {
        beforeUpdate: async (address: any) => {
            // Si se está cambiando a predeterminada, actualizar las otras direcciones
            if (address.changed('is_default') && address.getDataValue('is_default')) {
                await DeliveryAddress.update(
                    { is_default: false },
                    { 
                        where: { 
                            user_id: address.getDataValue('user_id'),
                            is_default: true,
                            id: { [Op.ne]: address.getDataValue('id') }
                        } 
                    }
                );
            }
        }
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

export default DeliveryAddress;